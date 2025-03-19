const logger = require('../utils/logger');
const db = require('../config/db');

// View responses for the logged-in user
exports.viewResponses = async (req, res) => {
    try {
        const responses = await Answer.find({ user: req.user.id }).populate('question');
        res.status(200).json(responses);
    } catch (err) {
        logger.error('Error fetching responses:', err);
        res.status(500).json({ error: 'An error occurred while fetching responses' });
    }
};

// Submit health assessment form
exports.submitForm = async (req, res) => {
    const { answers } = req.body;

    // Validate answers input
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Answers are required' });
    }

    let totalScore = 0;
    const answerRecords = [];

    try {
        for (const answerData of answers) {
            const { questionId, response } = answerData;
            const question = await Question.findById(questionId);

            if (!question) {
                logger.error(`Question not found: ${questionId}`);
                return res.status(400).json({ error: 'Question not found' });
            }

            const answer = new Answer({ user: req.user.id, question: questionId, response });
            await answer.save();
            answerRecords.push(answer);
            totalScore += question.scoring; // Adjust based on your scoring logic
        }

        const healthRiskScore = calculateRisk(totalScore); // Calculate risk based on totalScore
        const report = new Report({ user: req.user.id, healthRiskScore, answers: answerRecords });
        await report.save();

       
        sendEmailToUser(req.user.email, report);

        res.status(200).json({ reportId: report.id, answers: answerRecords });
    } catch (err) {
        logger.error('Error processing form submission:', err);
        res.status(500).json({ error: 'An error occurred while processing the form' });
    }
};



//dashboard grapghs and logs
exports.getTotalUsers = (req, res) => {
    connection.query("SELECT employee_info FROM assessment_response", (err, results) => {
      if (err) throw err;
      const totalUsers = results.length;
      res.json({ totalUsers });
    });
  };
  
  exports.getTotalCompanies = (req, res) => {
    connection.query("SELECT COUNT(*) AS totalCompanies FROM companies", (err, results) => {
      if (err) throw err;
      res.json(results[0]);
    });
  };
  
  exports.getSessionByCompany = (req, res) => {
    connection.query(`
      SELECT company_slug, COUNT(*) AS sessions, AVG(health_assessment) AS averageScore
      FROM assessment_response
      GROUP BY company_slug
    `, (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  };
  
  exports.getUserLogs = (req, res) => {
    connection.query("SELECT name, role, status, created_at FROM user", (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  };
  
  exports.getPerformanceMetrics = (req, res) => {
    connection.query(`
      SELECT company_slug, COUNT(*) AS count
      FROM assessment_response
      GROUP BY company_slug
    `, (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  };
exports.getTotalUsers = async (req, res) => {
    try {
        const [results] = await db.query("SELECT employee_info FROM assessment_response");

        // Decode JSON strings and extract relevant information
        const totalUsers = results.length; // Count of records
        const users = results.map(row => {
            try {
                return JSON.parse(row.employee_info); // Decode JSON
            } catch (error) {
                console.error('Error parsing JSON:', error);
                return null; // Handle parsing error (e.g., return null or default value)
            }
        }).filter(user => user !== null); // Filter out any null values

        res.json({ totalUsers, users }); // Return total users count and decoded user data
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};

exports.getTotalCompanies = async (req, res) => {
    try {
        const [results] = await db.query("SELECT COUNT(*) AS totalCompanies FROM companies");
        res.json(results[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};


exports.getSessionByCompany = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT company_slug, COUNT(*) AS sessions, AVG(health_assessment) AS averageScore
            FROM assessment_response
            GROUP BY company_slug
            ORDER BY sessions DESC
            LIMIT 5
        `);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};

exports.getUserLogs = async (req, res) => {
    try {
        const [results] = await db.query("SELECT first_name, role, designation, gender, created_at FROM users ORDER BY created_at DESC");
        console.log("🚀 ~ exports.getUserLogs= ~ results:", results);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};


exports.getPerformanceMetrics = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT company_slug, COUNT(*) AS count
            FROM assessment_response
            GROUP BY company_slug
        `);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};
const processBloodPressure = (response) => {
    if (!response) return "Unknown";
    const cleanResponse = response.trim().toLowerCase();
    const bloodPressureScores = {
        "140 mmhg or higher / 90 mmhg or higher": 5,
        "130-139 mm hg / 85-89 mmhg": 4,
        "120-129 mmhg / 80-84 mmhg": 3,
        "80-119 mmhg / 60-79 mmhg": 2,
        "less than 80 mmhg / less than 60 mmhg": 1,
        "i don't know": 3
    };
    if (bloodPressureScores[cleanResponse]) {
        return mapScoreToHealthCategory(bloodPressureScores[cleanResponse]);
    }
    return "Unknown";
};

const processGlucose = (response) => {
    if (!response) return "Unknown";
    const cleanResponse = response.trim().toLowerCase();
    const glucoseScores = {
        "150 mg/dl or higher": 5,
        "126-149 mg/dl": 4,
        "100-125 mg/dl": 3,
        "70-99 mg/dl": 2,
        "less than 70 mg/dl": 1,
        "i don't know": 3
    };
    if (glucoseScores[cleanResponse]) {
        return mapScoreToHealthCategory(glucoseScores[cleanResponse]);
    }
    return "Unknown";
};

const processCholesterol = (response) => {
    if (!response) return "Unknown";
    const cleanResponse = response.trim().toLowerCase();
    const cholesterolScores = {
        "greater than 3.0": 5,
        "2.5 - 3.0": 4,
        "2.0 - 2.5": 3,
        "1.5 - 2.0": 2,
        "less than 1.5": 1,
        "i don't know": 3
    };
    if (cholesterolScores[cleanResponse]) {
        return mapScoreToHealthCategory(cholesterolScores[cleanResponse]);
    }
    return "Unknown";
};

const mapScoreToHealthCategory = (score) => {
    if (score === 4 || score === 5) return "Bad Health";
    if (score === 3) return "Average Health";
    return "Good Health";
};

const calculateFitnessHealthData = async (assessments) => {
    const conditions = {
        cholesterol: { "Good Health": 0, "Average Health": 0, "Bad Health": 0, "Unknown": 0 },
        bloodPressure: { "Good Health": 0, "Average Health": 0, "Bad Health": 0, "Unknown": 0 },
        glucose: { "Good Health": 0, "Average Health": 0, "Bad Health": 0, "Unknown": 0 }
    };

    for (const assessment of assessments) {
        let healthData = [];
        try {
            healthData = JSON.parse(assessment.health_assessment);
        } catch (e) {
            continue;
        }

        for (const section of healthData) {
            if (section.subHeading === "Personal Medical History") {
                for (const question of section.questions) {
                    if (question.questionId === "PMH16") {
                        const cholesterolValue = processCholesterol(question.response);
                        if (cholesterolValue) {
                            conditions.cholesterol[cholesterolValue]++;
                        }
                    }
                    if (question.questionId === "PMH14") {
                        const bpValue = processBloodPressure(question.response);
                        if (bpValue) {
                            conditions.bloodPressure[bpValue]++;
                        }
                    }
                    if (question.questionId === "PMH15") {
                        const glucoseValue = processGlucose(question.response);
                        if (glucoseValue) {
                            conditions.glucose[glucoseValue]++;
                        }
                    }
                }
            }
        }
    }

    const totalAssessments = assessments.length;

    const result = {
        cholesterol: calculateConditionPercentage(conditions.cholesterol, totalAssessments),
        bloodPressure: calculateConditionPercentage(conditions.bloodPressure, totalAssessments),
        glucose: calculateConditionPercentage(conditions.glucose, totalAssessments)
    };

    return result;
};

const calculateConditionPercentage = (conditionCounts, totalAssessments) => {
    const conditionPercentages = {};
    for (const condition in conditionCounts) {
        conditionPercentages[condition] = {
            percentage: ((conditionCounts[condition] / totalAssessments) * 100).toFixed(2),
            // interpretation: getInterpretation(condition)
        };
    }
    return conditionPercentages;
};

// const getInterpretation = (condition) => {
//     const interpretations = {
//         "Good Health": "Indicates good health, generally free from significant risk.",
//         "Average Health": "Indicates borderline or moderate health, with potential for improvement.",
//         "Bad Health": "Indicates poor health, may require medical intervention.",
//         "Unknown": "Health condition is unknown, data is unavailable."
//     };
//     return interpretations[condition] || "Condition unknown.";
// };


// Main controller function to get fitness and health data
exports.getFitnessHealthData = async (req, res) => {
    try {
        const [assessments] = await db.query(
            `SELECT assessment_id, employee_info, health_assessment FROM assessment_response WHERE health_assessment IS NOT NULL`
        );
        
        const result = await calculateFitnessHealthData(assessments);
        
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing health data" });
    }
};
