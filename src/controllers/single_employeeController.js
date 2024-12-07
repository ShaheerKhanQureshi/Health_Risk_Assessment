// const db = require('../config/db');

// // Utility for error response
// const errorResponse = (res, message = 'An error occurred', status = 500) => {
//   res.status(status).json({ success: false, message });
// };

// // Utility for validating user ID
// const validateUserId = (userId) => {
//   return Number.isInteger(parseInt(userId));
// };

// // Fetch user profile information
// const getUserProfile = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT name, company, phone, email, city FROM user_profile WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);
//     res.json({ success: true, data: results[0] });
//   });
// };

// // Fetch risk section data
// const getRiskSection = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT category, risk_score FROM risk_assessment WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);
//     res.json({ success: true, data: results });
//   });
// };

// // Calculate BMI and categorize
// const getBMIRange = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT height, weight FROM user_profile WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);

//     const { height, weight } = results[0];
//     const bmi = (weight / (height * height)) * 703;
//     const bmiCategory = bmi < 18.5 ? 'Below Normal' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obesity';

//     res.json({ success: true, data: { bmi, bmiCategory } });
//   });
// };

// // Fetch BP Interpretation
// const getBPInterpretation = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT bp_systolic, bp_diastolic FROM user_health WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);

//     const { bp_systolic, bp_diastolic } = results[0];
//     const interpretation = (bp_systolic > 120 || bp_diastolic > 80) ? 'Elevated Blood Pressure' : 'Normal';

//     res.json({ success: true, data: { bp_systolic, bp_diastolic, interpretation } });
//   });
// };

// // Fetch Diabetes Interpretation
// const getDiabetesInfo = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT glucose_level FROM user_health WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);

//     const { glucose_level } = results[0];
//     const diabetesRisk = glucose_level >= 150 ? 'High Risk' : 'Normal';

//     res.json({ success: true, data: { glucose_level, diabetesRisk } });
//   });
// };

// // Fetch Cholesterol Interpretation
// const getCholesterolInfo = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT cholesterol_level FROM user_health WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);

//     const { cholesterol_level } = results[0];
//     const interpretation = cholesterol_level > 3.0 ? 'High Risk' : 'Low Risk';

//     res.json({ success: true, data: { cholesterol_level, interpretation } });
//   });
// };

// // Fetch Scoring Interpretation
// const getScoringInterpretation = (req, res) => {
//   const { user_id } = req.query;
//   if (!validateUserId(user_id)) {
//     return errorResponse(res, 'Invalid user ID', 400);
//   }

//   const query = "SELECT score_category, percentage FROM scoring WHERE user_id = ?";
//   db.query(query, [user_id], (err, results) => {
//     if (err) return errorResponse(res, err.message);
//     res.json({ success: true, data: results });
//   });
// };

// // Export all controller functions
// module.exports = {
//   getUserProfile,
//   getRiskSection,
//   getBMIRange,
//   getBPInterpretation,
//   getDiabetesInfo,
//   getCholesterolInfo,
//   getScoringInterpretation
// };

const db = require("../config/db");

// Utility for error response
const errorResponse = (res, message = "An error occurred", status = 500) => {
  return res.status(status).json({ success: false, message });
};

// Utility for validating user ID
const validateUserId = (userId) => {
  return Number.isInteger(parseInt(userId));
};

// Fetch user profile information
const getUserProfile = async (req, res) => {
  const { assessment_id } = req.query;

  // Validate the user ID
  if (!validateUserId(assessment_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  try {
    // Connect to the database (ensure you have a `db` connection pool set up)
    const query = "SELECT employee_info FROM assessment_response WHERE id = ?";
    const [results] = await db.execute(query, [assessment_id]);

    // Check if results are empty
    if (results.length === 0) {
      console.log("No data found for the provided assessment_id");
      return errorResponse(res, "No data found", 404);
    }

    // Parse the employee_info field
    const employeeInfo = JSON.parse(results[0].employee_info);
    console.log("Results found:", employeeInfo);
    return res.json({ success: true, data: employeeInfo });
    
  } catch (err) {
    console.log("Error occurred:", err.message);
    return errorResponse(res, err.message, 500);
  }
};


// Fetch risk section data
const getRiskSection = (req, res) => {
  const { user_id } = req.query;
  if (!validateUserId(user_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  const query =
    "SELECT category, risk_score FROM risk_assessment WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return errorResponse(res, err.message);
    res.json({ success: true, data: results });
  });
};

// Calculate BMI and categorize
const getBMIRange = (req, res) => {
  const { user_id } = req.query;
  if (!validateUserId(user_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  const query = "SELECT height, weight FROM user_profile WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return errorResponse(res, err.message);

    const { height, weight } = results[0];
    const bmi = (weight / (height * height)) * 703;
    const bmiCategory =
      bmi < 18.5
        ? "Below Normal"
        : bmi < 25
        ? "Normal"
        : bmi < 30
        ? "Overweight"
        : "Obesity";

    res.json({ success: true, data: { bmi, bmiCategory } });
  });
};

// Fetch BP Interpretation
const getBPInterpretation = (req, res) => {
  const { user_id } = req.query;
  if (!validateUserId(user_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  const query =
    "SELECT bp_systolic, bp_diastolic FROM user_health WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return errorResponse(res, err.message);

    const { bp_systolic, bp_diastolic } = results[0];
    const interpretation =
      bp_systolic > 120 || bp_diastolic > 80
        ? "Elevated Blood Pressure"
        : "Normal";

    res.json({
      success: true,
      data: { bp_systolic, bp_diastolic, interpretation },
    });
  });
};

// Fetch Diabetes Interpretation
const getDiabetesInfo = (req, res) => {
  const { user_id } = req.query;
  if (!validateUserId(user_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  const query = "SELECT glucose_level FROM user_health WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return errorResponse(res, err.message);

    const { glucose_level } = results[0];
    const diabetesRisk = glucose_level >= 150 ? "High Risk" : "Normal";

    res.json({ success: true, data: { glucose_level, diabetesRisk } });
  });
};

// Fetch Cholesterol Interpretation
const getCholesterolInfo = (req, res) => {
  const { user_id } = req.query;
  if (!validateUserId(user_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  const query = "SELECT cholesterol_level FROM user_health WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return errorResponse(res, err.message);

    const { cholesterol_level } = results[0];
    const interpretation = cholesterol_level > 3.0 ? "High Risk" : "Low Risk";

    res.json({ success: true, data: { cholesterol_level, interpretation } });
  });
};

// Fetch Scoring Interpretation
const getScoringInterpretation = (req, res) => {
  const { user_id } = req.query;
  if (!validateUserId(user_id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  const query =
    "SELECT score_category, percentage FROM scoring WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return errorResponse(res, err.message);
    res.json({ success: true, data: results });
  });
};

// Fetch company details by slug
const getCompanyDetails = (req, res) => {
  const { slug } = req.query;

  const query = "SELECT * FROM companies WHERE slug = ?";
  db.query(query, [slug], (err, results) => {
    if (err) return errorResponse(res, err.message);

    if (results.length === 0) {
      return errorResponse(res, "Company not found", 404);
    }

    res.json({ success: true, data: results[0] });
  });
};

// Fetch and parse employee assessment responses
const getEmployeeAssessments = (req, res) => {
  const { slug } = req.query;

  const query =
    "SELECT employee_info, health_assessment FROM assessment_response WHERE company_slug = ?";
  db.query(query, [slug], (err, results) => {
    if (err) return errorResponse(res, err.message);

    const assessments = results.map((row) => {
      return {
        employeeInfo: JSON.parse(row.employee_info), // Parse JSON string
        healthAssessment: JSON.parse(row.health_assessment), // Parse JSON string
      };
    });

    res.json({ success: true, data: assessments });
  });
};

// Export all controller functions
module.exports = {
  getUserProfile,
  getRiskSection,
  getBMIRange,
  getBPInterpretation,
  getDiabetesInfo,
  getCholesterolInfo,
  getScoringInterpretation,
  getCompanyDetails,
  getEmployeeAssessments,
};
