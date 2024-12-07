const db = require('../config/db');  
const PDFDocument = require('pdfkit');
// Function to calculate age from date of birth
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth();
  // Adjust age if birthday hasn't occurred yet this year
  if (month < birthDate.getMonth() || (month === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Function to get company by slug
const getCompanyBySlug = async (company_slug) => {
  const query = "SELECT * FROM companies WHERE url = ?";
  const [results] = await db.execute(query, [company_slug]);

  if (results.length === 0) {
    return null;  // Company not found
  }

  return results[0];  // Return the first matching company
};

const getUserHealthReport = async (req, res) => {
  const { company_slug } = req.params;
  const { assessment_id } = req.query;

  if (!assessment_id || isNaN(assessment_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid assessment_id",
    });
  }

  try {
    const company = await getCompanyBySlug(company_slug);  
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const query = `
      SELECT employee_info, health_assessment 
      FROM assessment_response 
      WHERE assessment_id = ? AND company_slug = ?;
    `;
    const [results] = await db.execute(query, [assessment_id, company_slug]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for the provided assessment_id",
      });
    }

    let employeeInfo;
    let healthAssessment;

    try {
      employeeInfo = JSON.parse(results[0].employee_info);
      healthAssessment = JSON.parse(results[0].health_assessment);
    } catch (jsonErr) {
      console.error("Error parsing data:", jsonErr.message);
      return res.status(500).json({
        success: false,
        message: "Error parsing data",
      });
    }

    const { dob, height, weight } = employeeInfo;
    const age = calculateAge(dob);
    const bmi = calculateBMI(weight, height);
    const bmiCategory = getBMICategory(bmi);

    const { bpValue, bpInterpretation } = getBloodPressureData(healthAssessment);

    const { glucose_level, diabetesRisk } = getDiabetesRisk(healthAssessment);

    const { cholesterol_level, cholesterolRisk } = getCholesterolRisk(healthAssessment);

    const { totalScore, sectionScores , riskMessage } = getSectionScoresWithDetails(healthAssessment);

    return res.json({
      success: true,
      data: {
        ...employeeInfo,
        age,
        bmi,
        bmiCategory,
        bpValue,
        bpInterpretation,
        glucose_level,
        diabetesRisk,
        cholesterol_level,
        cholesterolRisk,
        totalScore,
        sectionScores,
        riskMessage,
        // healthAssessment,
      },
    });

  } catch (err) {
    console.error("Error in getUserHealthReport:", err.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching user health report",
    });
  }
};



const calculateBMI = (weight, height) => {
  if (!height || !weight) return null;
  const heightInMeters = height / 100; 
  return (weight / (heightInMeters * heightInMeters)).toFixed(2);
};


const getBMICategory = (bmi) => {
  if (bmi < 18.5) return "Below Normal";
  else if (bmi < 25) return "Normal";
  else if (bmi < 30) return "Overweight";
  else return "Obesity";
};


const getBloodPressureData = (healthAssessment) => {
  const bpData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
    ?.questions?.find(q => q.questionId === "PMH14" && q.response);

  if (!bpData || !bpData.response) {
    return { bpValue: null, bpInterpretation: "Unknown" };
  }

  const response = bpData.response.trim().toLowerCase();

  const bpCategories = {
    "140 mmhg or higher / 90 mmhg or higher": {
      bpValue: "140+/90+",
      bpInterpretation: "High Blood Pressure (Hypertension Stage 2)"
    },
    "130-139 mm hg / 85-89 mmhg": {
      bpValue: "130-139 / 85-89",
      bpInterpretation: "High Blood Pressure (Hypertension Stage 1)"
    },
    "120-129 mmhg / 80-84 mmhg": {
      bpValue: "120-129 / 80-84",
      bpInterpretation: "Elevated Blood Pressure"
    },
    "80-119 mmhg / 60-79 mmhg": {
      bpValue: "Normal",
      bpInterpretation: "Normal Blood Pressure"
    },
    "less than 80 mmhg / less than 60 mmhg": {
      bpValue: "Low",
      bpInterpretation: "Low Blood Pressure"
    },
    "i don't know": {
      bpValue: "Unknown",
      bpInterpretation: "Blood Pressure Unknown"
    }
  };

  if (bpCategories[response]) {
    return bpCategories[response];
  }

  return { bpValue: null, bpInterpretation: "Unknown" };
};


const getDiabetesRisk = (healthAssessment) => {
  const glucoseData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
    ?.questions?.find(q => q.questionId === "PMH15" && q.response);  // Directly check questionId

  if (!glucoseData || !glucoseData.response) return { glucose_level: null, diabetesRisk: "Unknown" };

  let glucose_level;

  if (typeof glucoseData.response === 'string') {
    glucose_level = parseFloat(glucoseData.response.replace(/[^\d.-]/g, ''));
  } else if (typeof glucoseData.response === 'number') {
    glucose_level = glucoseData.response;
  } else {
    glucose_level = null;
  }

  if (glucose_level === null || isNaN(glucose_level)) {
    return { glucose_level: null, diabetesRisk: "Unknown" };
  }

  const risk = glucose_level >= 150 ? "High Risk" : "Normal";

  return { glucose_level, diabetesRisk: risk };
};


const getCholesterolRisk = (healthAssessment) => {
  const cholesterolData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
    ?.questions?.find(q => q.questionId === "PMH16" && q.response);

  if (!cholesterolData || !cholesterolData.response) return { cholesterol_level: null, cholesterolRisk: "Unknown" };

  const response = cholesterolData.response.trim().toLowerCase();

  if (response === "greater than 3") {
    return { cholesterol_level: 3.1, cholesterolRisk: "High Risk" };
  } 
  if (response === "2.5-3") {
    return { cholesterol_level: (2.5 + 3) / 2, cholesterolRisk: "High Risk" };
  }
  if (response === "2-2.5") {
    return { cholesterol_level: (2 + 2.5) / 2, cholesterolRisk: "Moderate Risk" };
  }
  if (response === "1.5-2") {
    return { cholesterol_level: (1.5 + 2) / 2, cholesterolRisk: "Low Risk" };
  }
  if (response === "less than 1.5") {
    return { cholesterol_level: 1.4, cholesterolRisk: "Low Risk" };
  }
  if (response === "i don't know") {
    return { cholesterol_level: null, cholesterolRisk: "Unknown" };
  }

  return { cholesterol_level: null, cholesterolRisk: "Unknown" };
};


// const getSectionScoresWithDetails = (healthAssessment) => {
//   let totalScore = 0;
//   let sectionScores = [];

//   // Loop over the health assessment data and calculate scores for each section
//   healthAssessment.forEach(item => {
//     const sectionName = item.subHeading;
//     let sectionScore = 0;

//     let sectionDetails = {
//       sectionName,
//       score: 0,
//     };

//     sectionScore = item.questions.reduce((acc, q) => acc + (q.score || 0), 0);
//     sectionDetails.score = sectionScore;
//     totalScore += sectionScore;

//     sectionScores.push(sectionDetails);
//   });

//   // Determine the risk message based on the total score
//   let riskMessage = "";
//   if (totalScore <= 80) {
//     riskMessage = "You're in good health! Keep up the great work with your current habits. Continue focusing on preventive care to maintain your well-being.";
//   } else if (totalScore <= 160) {
//     riskMessage = "There are areas you could improve. Small lifestyle changes, along with proactive healthcare, can greatly benefit your long-term health.";
//   } else if (totalScore <= 240) {
//     riskMessage = "Potential health risks detected. It's important to take action soon to address these areas and improve your overall health.";
//   } else if (totalScore <= 320) {
//     riskMessage = "Your health may be at serious risk. Immediate lifestyle changes and professional guidance are recommended to improve your situation.";
//   } else {
//     riskMessage = "Urgent attention is needed. Critical health issues require immediate intervention and support from healthcare professionals.";
//   }

//   // Return the data with risk message
//   return { totalScore, sectionScores, riskMessage };
// };
const getSectionScoresWithDetails = (healthAssessment) => {
  let totalScore = 0;
  let sectionScores = [];

  // Loop over the health assessment data and calculate scores for each section
  healthAssessment.forEach(item => {
    const sectionName = item.subHeading;
    let sectionScore = 0;

    let sectionDetails = {
      sectionName,
      score: 0,
    };

    sectionScore = item.questions.reduce((acc, q) => acc + (q.score || 0), 0);
    sectionDetails.score = sectionScore;
    totalScore += sectionScore;

    sectionScores.push(sectionDetails);
  });

  // Determine the risk message based on the total score
  let riskMessage = "";
  if (totalScore <= 80) {
    riskMessage = "You're in good health!";
  } else if (totalScore <= 160) {
    riskMessage = "There are some areas where you could improve. ";
  } else if (totalScore <= 240) {
    riskMessage = " This indicates potential health risks.";
  } else if (totalScore <= 320) {
    riskMessage = " Your health may be at serious risk.";
  } else {
    riskMessage = "Urgent attention is needed.";
  }

  // Return the data with risk message
  return { totalScore, sectionScores, riskMessage };
};

const generateHealthReportPDF = async (company_slug, assessment_id, res) => {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=yourhealth_report.pdf');
  
  doc.pipe(res);

  try {
    const company = await getCompanyBySlug(company_slug);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const query = `
      SELECT employee_info, health_assessment 
      FROM assessment_response 
      WHERE assessment_id = ? AND company_slug = ?;
    `;
    const [results] = await db.execute(query, [assessment_id, company_slug]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for the provided assessment_id" });
    }

    let employeeInfo, healthAssessment;
    try {
      employeeInfo = JSON.parse(results[0].employee_info);
      healthAssessment = JSON.parse(results[0].health_assessment);
    } catch (jsonErr) {
      console.error("Error parsing data:", jsonErr.message);
      return res.status(500).json({ success: false, message: "Error parsing data" });
    }

    const { dob, height, weight } = employeeInfo;
    const age = calculateAge(dob);
    const bmi = calculateBMI(weight, height);
    const bmiCategory = getBMICategory(bmi);

    const { bpValue, bpInterpretation } = getBloodPressureData(healthAssessment);
    const { glucose_level, diabetesRisk } = getDiabetesRisk(healthAssessment);
    const { cholesterol_level, cholesterolRisk } = getCholesterolRisk(healthAssessment);
    const { totalScore, sectionScores, riskMessage } = getSectionScoresWithDetails(healthAssessment);

    const data = {
      fullName: employeeInfo.fullName,
      age,
      height,
      weight,
      bmi,
      bmiCategory,
      bpValue,
      bpInterpretation,
      glucose_level,
      diabetesRisk,
      cholesterol_level,
      cholesterolRisk,
      totalScore,
      sectionScores,
      riskMessage
    };
    
    doc.fontSize(18).text('Health Assessment Report', { align: 'center', bold: true });
    doc.moveDown(2);
    
    doc.fontSize(14).text('Employee Information', { underline: true, bold: true });
    doc.moveDown(1);
    
    let fullName = data.firstNameName ? data.lastName : 'N/A';
    if (fullName !== 'N/A') {
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'N/A';
      const lastName = nameParts.length > 1 ? nameParts[1] : 'N/A';
      fullName = `${firstName} ${lastName}`;
    }
    
    doc.fontSize(12).text(`Name: ${fullName}`);
    doc.text(`Age: ${data.age || 'N/A'}`);
    doc.text(`Height: ${data.height} cm`);
    doc.text(`Weight: ${data.weight} kg`);
    doc.moveDown(1);
    
    doc.text(`BMI: ${data.bmi} (${data.bmiCategory})`);
    doc.text(`Blood Pressure: ${data.bpValue}`);
    doc.text(`Interpretation: ${data.bpInterpretation}`);
    doc.moveDown(1);
    
    doc.text(`Glucose Level: ${data.glucose_level} mg/dL`);
    doc.text(`Diabetes Risk: ${data.diabetesRisk}`);
    doc.moveDown(1);
    
    doc.text(`Cholesterol Level: ${data.cholesterol_level} mg/dL`);
    doc.text(`Cholesterol Risk: ${data.cholesterolRisk}`);
    doc.moveDown(1);
    
    doc.text(`Total Score: ${data.totalScore}`);
    doc.text(`Risk Level: ${data.riskMessage}`);
    doc.moveDown(1);
    
    doc.fontSize(14).text('Health Assessment Breakdown', { underline: true, bold: true });
    doc.moveDown(1);
    
    sectionScores.forEach(section => {
      doc.fontSize(12).text(`Section: ${section.sectionName } `,{bold: true});
      doc.text(`Score: ${section.score}`);
    });
    
    doc.moveDown(2);
    doc.text('Thank you for completing your health assessment!', { align: 'center', italics: true });
    doc.moveDown(1);
    doc.text('This document is for informational purposes only.', { align: 'center', fontSize: 10 });
    doc.text('For further details, please consult with your healthcare provider.', { align: 'center', fontSize: 10 });
    doc.moveDown(1);
    doc.text('Signature: ____________________________', { align: 'center' });
    doc.text('Date: ________________________________', { align: 'center' });
    
    doc.end();
    

  } catch (err) {
    console.error("Error in generateHealthReportPDF:", err.message);
    return res.status(500).json({ success: false, message: "An error occurred while generating the report" });
  }
};

module.exports = {
  getUserHealthReport,
  generateHealthReportPDF,
};

