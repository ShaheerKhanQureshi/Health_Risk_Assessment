const db = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path'); // For path resolution
const fs = require('fs');
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

    const { totalScore, sectionScores, riskMessage } = getSectionScoresWithDetails(healthAssessment);

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

// const calculateBMI = (weight, height) => {
//   if (!height || !weight) return null;
//   const heightInMeters = height / 100; 
//   return (weight / (heightInMeters * heightInMeters)).toFixed(2);
// };
const calculateBMI = (weight, height) => {
  if (!height || !weight) return null;
  const feet = Math.floor(height);
  const inches = (height - feet) * 10;
  const totalInches = (feet * 12) + inches;
  const heightInMeters = totalInches * 0.0254;
  return (weight / (heightInMeters * heightInMeters)).toFixed(2);
};

const getBMICategory = (bmi) => {
  if (bmi < 18.5) return "Below Normal";
  else if (bmi < 25) return "Normal";
  else if (bmi < 30) return "Overweight";
  else return "Obesity";
};

// const getBloodPressureData = (healthAssessment) => {
//   const bpData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
//     ?.questions?.find(q => q.questionId === "PMH14" && q.response);

//   if (!bpData || !bpData.response) {
//     return { bpValue: null, bpInterpretation: "Unknown" };
//   }

//   const response = bpData.response.trim().toLowerCase();

//   const bpCategories = {
//     "140 mmhg or higher / 90 mmhg or higher": {
//       bpValue: "140+/90+",
//       bpInterpretation: "High Blood Pressure (Hypertension Stage 2)"
//     },
//     "130-139 mm hg / 85-89 mmhg": {
//       bpValue: "130-139 / 85-89",
//       bpInterpretation: "High Blood Pressure (Hypertension Stage 1)"
//     },
//     "120-129 mmhg / 80-84 mmhg": {
//       bpValue: "120-129 / 80-84",
//       bpInterpretation: "Elevated Blood Pressure"
//     },
//     "80-119 mmhg / 60-79 mmhg": {
//       bpValue: "Normal",
//       bpInterpretation: "Normal Blood Pressure"
//     },
//     "less than 80 mmhg / less than 60 mmhg": {
//       bpValue: "Low",
//       bpInterpretation: "Low Blood Pressure"
//     },
//     "i don't know": {
//       bpValue: "Unknown",
//       bpInterpretation: "Blood Pressure Unknown"
//     }
//   };

//   if (bpCategories[response]) {
//     return bpCategories[response];
//   }

//   return { bpValue: null, bpInterpretation: "Unknown" };
// };


// const getDiabetesRisk = (healthAssessment) => {
//   const glucoseData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
//     ?.questions?.find(q => q.questionId === "PMH15" && q.response);  // Directly check questionId

//   if (!glucoseData || !glucoseData.response) return { glucose_level: null, diabetesRisk: "Unknown" };

//   let glucose_level;

//   if (typeof glucoseData.response === 'string') {
//     glucose_level = parseFloat(glucoseData.response.replace(/[^\d.-]/g, ''));
//   } else if (typeof glucoseData.response === 'number') {
//     glucose_level = glucoseData.response;
//   } else {
//     glucose_level = null;
//   }

//   if (glucose_level === null || isNaN(glucose_level)) {
//     return { glucose_level: null, diabetesRisk: "Unknown" };
//   }

//   const risk = glucose_level >= 150 ? "High Risk" : "Normal";

//   return { glucose_level, diabetesRisk: risk };
// };


// const getCholesterolRisk = (healthAssessment) => {
//   const cholesterolData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
//     ?.questions?.find(q => q.questionId === "PMH16" && q.response);

//   if (!cholesterolData || !cholesterolData.response) return { cholesterol_level: null, cholesterolRisk: "Unknown" };

//   const response = cholesterolData.response.trim().toLowerCase();

//   if (response === "greater than 3") {
//     return { cholesterol_level: 3.1, cholesterolRisk: "High Risk" };
//   }
//   if (response === "2.5-3") {
//     return { cholesterol_level: (2.5 + 3) / 2, cholesterolRisk: "High Risk" };
//   }
//   if (response === "2-2.5") {
//     return { cholesterol_level: (2 + 2.5) / 2, cholesterolRisk: "Moderate Risk" };
//   }
//   if (response === "1.5-2") {
//     return { cholesterol_level: (1.5 + 2) / 2, cholesterolRisk: "Low Risk" };
//   }
//   if (response === "less than 1.5") {
//     return { cholesterol_level: 1.4, cholesterolRisk: "Low Risk" };
//   }
//   if (response === "i don't know") {
//     return { cholesterol_level: null, cholesterolRisk: "Unknown" };
//   }

//   return { cholesterol_level: null, cholesterolRisk: "Unknown" };
// };


const getBloodPressureData = (healthAssessment) => {
  const bpData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
    ?.questions?.find(q => q.questionId === "PMH14" && q.response);

  if (!bpData || !bpData.response) {
    return { bpValue: "Unknown", bpInterpretation: "Blood Pressure Unknown" };
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

  return bpCategories[response] || { bpValue: "Unknown", bpInterpretation: "Blood Pressure Unknown" };
};

const getDiabetesRisk = (healthAssessment) => {
  const glucoseData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
    ?.questions?.find(q => q.questionId === "PMH15" && q.response);

  if (!glucoseData || !glucoseData.response) {
    return { glucose_level: "Unknown", glucoseInterpretation: "Glucose Unknown" };
  }

  const response = glucoseData.response.trim().toLowerCase();

  const glucoseCategories = {
    "150 mg/dl or higher": {
      glucose_level: "150+",
      glucoseInterpretation: "High Risk"
    },
    "126-149 mg/dl": {
      glucose_level: "126-149",
      glucoseInterpretation: "Pre-Diabetes"
    },
    "100-125 mg/dl": {
      glucose_level: "100-125",
      glucoseInterpretation: "Borderline High"
    },
    "70-99 mg/dl": {
      glucose_level: "70-99",
      glucoseInterpretation: "Normal"
    },
    "less than 70 mg/dl": {
      glucose_level: "Less than 70",
      glucoseInterpretation: "Low Risk"
    },
    "i don't know": {
      glucose_level: "Unknown",
      glucoseInterpretation: "Glucose Unknown"
    }
  };

  return glucoseCategories[response] || { glucose_level: "Unknown", glucoseInterpretation: "Glucose Unknown" };
};

const getCholesterolRisk = (healthAssessment) => {
  const cholesterolData = healthAssessment?.find(item => item.subHeading === "Personal Medical History")
    ?.questions?.find(q => q.questionId === "PMH16" && q.response);

  if (!cholesterolData || !cholesterolData.response) {
    return { cholesterol_level: "Unknown", cholesterolInterpretation: "Cholesterol Unknown" };
  }

  const response = cholesterolData.response.trim().toLowerCase();

  const cholesterolCategories = {
    "greater than 3": {
      cholesterol_level: "3.1+",
      cholesterolInterpretation: "Very High Risk"
    },
    "2.5-3": {
      cholesterol_level: (2.5 + 3) / 2,
      cholesterolInterpretation: "High Risk"
    },
    "2-2.5": {
      cholesterol_level: (2 + 2.5) / 2,
      cholesterolInterpretation: "Moderate Risk"
    },
    "1.5-2": {
      cholesterol_level: (1.5 + 2) / 2,
      cholesterolInterpretation: "Low Risk"
    },
    "less than 1.5": {
      cholesterol_level: 1.4,
      cholesterolInterpretation: "Very Low Risk"
    },
    "i don't know": {
      cholesterol_level: "Unknown",
      cholesterolInterpretation: "Cholesterol Unknown"
    }
  };

  return cholesterolCategories[response] || { cholesterol_level: "Unknown", cholesterolInterpretation: "Cholesterol Unknown" };
};


const getSectionScoresWithDetails = (healthAssessment) => {
  let totalScore = 0;
  let sectionScores = [];

  healthAssessment.forEach(item => {
    const sectionName = item.subHeading;

    if (sectionName === "Personal Information" || sectionName === "Health Benefits and Expenditure") {
      return;
    }

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
  let riskMessage = "";
  if (totalScore <= 80) {
    riskMessage = "Low Risk! You're in good health!";
  } else if (totalScore <= 160) {
    riskMessage = "Moderate Risk! There are some areas where you could improve.";
  } else if (totalScore <= 240) {
    riskMessage = "High Risk! This indicates potential health risks.";
  } else if (totalScore <= 320) {
    riskMessage = "Very High Risk! Your health may be at serious risk.";
  } else {
    riskMessage = "Urgent attention is needed.";
  }


  return { totalScore, sectionScores, riskMessage };
};

const generateHealthReportPDF = async (company_slug, assessment_id, res) => {
  const doc = new PDFDocument({ margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');

  try {
    const company = await getCompanyBySlug(company_slug);
    if (!company) throw new Error("Company not found");

    const query = "SELECT employee_info, health_assessment FROM assessment_response WHERE assessment_id = ? AND company_slug = ?";
    const [results] = await db.execute(query, [assessment_id, company_slug]);
    if (results.length === 0) throw new Error("Assessment not found");

    const employeeInfo = JSON.parse(results[0].employee_info);
    const healthAssessment = JSON.parse(results[0].health_assessment);

    const { firstName = 'N/A', lastName = 'N/A', dob, height, weight } = employeeInfo;
    const age = calculateAge(dob);
    const bmi = calculateBMI(weight, height);
    const bmiCategory = getBMICategory(bmi);

    const { bpValue, bpInterpretation } = getBloodPressureData(healthAssessment);
    const { glucose_level, diabetesRisk } = getDiabetesRisk(healthAssessment);
    const { cholesterol_level, cholesterolRisk } = getCholesterolRisk(healthAssessment);
    const { totalScore, sectionScores, riskMessage } = getSectionScoresWithDetails(healthAssessment);

    const fileName = `${firstName}_${lastName}_${company.name}_health_assessment_report.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    doc.rect(50, 50, doc.page.width - 100, 40).stroke();
    doc.fontSize(16).fillColor('black').text('Health Assessment Report', 50, 60, { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(10).fillColor('black').text(
      'This Health Assessment Report is designed to provide a detailed analysis of an individual’s health profile. It includes key metrics such as BMI, blood pressure, glucose levels, and other health indicators, assessed based on the latest standards. This report aims to help individuals and organizations identify potential health risks and promote well-being.',
      { width: doc.page.width - 100, align: 'justify' }
    );

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Employee Information', { underline: true });
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.moveDown(0.5)
    const employeeData = [
      { label: 'Name', value: `${firstName} ${lastName}` },
      { label: 'Age', value: `${age}` },
      { label: 'Height', value: height ? `${Math.floor(height)} feet ${Math.round((height % 1) * 12)} inches` : 'N/A' },
      { label: 'Weight', value: `${weight || 'N/A'} kg` },
      { label: 'BMI', value: `${bmi} (${bmiCategory})` },
    ];
    employeeData.forEach((data) => {
      doc.font('Helvetica-Bold').text(`${data.label}:`, { continued: true });
      doc.font('Helvetica').text(` ${data.value}`, { lineGap: 2 });
    });

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Health Data', { underline: true });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica-Bold').text('Glucose Level:', { continued: true });
    doc.font('Helvetica').fillColor('black').text(` ${glucose_level || 'N/A'} `);
    doc.font('Helvetica-Bold').text('Interpretation:', { continued: true });
    doc.font('Helvetica').text(` ${diabetesRisk || 'N/A'}`);

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Blood Pressure:', { continued: true });
    doc.font('Helvetica').text(` ${bpValue || 'N/A'}`);
    doc.font('Helvetica-Bold').text('Interpretation:', { continued: true });
    doc.font('Helvetica').text(` ${bpInterpretation || 'N/A'}`);

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text('Cholesterol Level:', { continued: true });
    doc.font('Helvetica').text(` ${cholesterol_level || 'N/A'} `);
    doc.font('Helvetica-Bold').text('Interpretation:', { continued: true });
    doc.font('Helvetica').text(` ${cholesterolRisk || 'N/A'}`);

    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Section Wise Scoring', { underline: true });
    doc.moveDown();

    const startX = 50;
    const startY = doc.y;
    const colWidths = [250, 100, 200];
    const rowHeight = 25;

    doc.fontSize(10).font('Helvetica-Bold');
    ['Sections', 'Total Score', 'Category'].forEach((header, i) => {
      doc.text(header, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), startY, {
        width: colWidths[i],
        align: 'center',
      });
    });

    doc.fontSize(10).font('Helvetica').fillColor('black');
    sectionScores.forEach((row, rowIndex) => {
      const y = startY + rowHeight * (rowIndex + 1);
      const category = getCategory(row.sectionName, row.score);

      doc.text(row.sectionName, startX, y, { width: colWidths[0], align: 'center' });
      doc.text(row.score, startX + colWidths[0], y, { width: colWidths[1], align: 'center' });
      doc.text(category, startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'center' });
    });

    const tableEndY = startY + rowHeight * (sectionScores.length + 1);
    const spaceBelowTable = 20;
    const leftMargin = 50;

    if (tableEndY + spaceBelowTable + 60 > doc.page.height - 50) {
      doc.addPage();
      doc.moveTo(leftMargin, 50);
    } else {
      doc.moveTo(leftMargin, tableEndY + spaceBelowTable);
    }

    doc.fontSize(12)
      .moveDown(1)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text('Total Score and Interpretation', leftMargin, doc.y, { underline: true });

    doc.fontSize(12)
      .moveDown(1)
      .font('Helvetica')
      .fillColor('black')
      .text(`Total Score: ${totalScore}`, leftMargin);
    doc.text(`Interpretation: ${riskMessage}`, leftMargin);

    doc.end();
  } catch (err) {
    console.error('Error during PDF generation:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'An error occurred while generating the report.' });
    }
  }
};
const getCategory = (sectionName, score) => {
  const categories = {
    'Personal Health Habits': [
      { range: [0, 10], category: 'Healthy Habits' },
      { range: [11, 20], category: 'Good Habits' },
      { range: [21, 30], category: 'Moderately Healthy Habits' },
      { range: [31, 40], category: 'Risky Habits (High Risk)' },
      { range: [41, 50], category: 'Unhealthy Habits' },
    ],
    'Personal Medical History': [
      { range: [0, 30], category: 'Healthy Records' },
      { range: [31, 60], category: 'Mild Risk' },
      { range: [61, 90], category: 'Moderate Risk' },
      { range: [91, 120], category: 'Elevated Risk' },
      { range: [121, 156], category: 'High Risk' },
    ],
    'Women Health': [
      { range: [0, 10], category: 'Optimal Health' },
      { range: [11, 20], category: 'Moderate Risk' },
      { range: [21, 23], category: 'High Risk' },
    ],
    'Lifestyle and Diet': [
      { range: [0, 10], category: 'Healthy Lifestyle and Diet' },
      { range: [11, 20], category: 'Balanced Lifestyle and Diet Risk' },
      { range: [21, 31], category: 'Unhealthy Lifestyle and Diet' },
    ],
    'Mental and Emotional Health Risk': [
      { range: [0, 8], category: 'Mental Fortitude' },
      { range: [9, 16], category: 'Stable but Sensitive' },
      { range: [17, 24], category: 'Vulnerable to Stress' },
      { range: [25, 32], category: 'Mental Health at Risk' },
      { range: [33, 40], category: 'Critical Mental Health Concern' },
    ],
    'Occupational Health Risk': [
      { range: [0, 20], category: 'Optimal Work Life Balance' },
      { range: [21, 40], category: 'Generally Good Health' },
      { range: [41, 60], category: 'Moderate Risk' },
      { range: [61, 80], category: 'High Risk of Occupational Strain' },
      { range: [81, 100], category: 'Critical Occupational Health Concern' },
    ],
    'Burnout at Work': [
      { range: [0, 20], category: 'Low Risk of Burnout' },
      { range: [21, 40], category: 'Moderate Risk of Burnout' },
      { range: [41, 60], category: 'Noticeable Risk of Burnout' },
      { range: [61, 80], category: 'High Risk of Burnout' },
      { range: [81, 100], category: 'Severe Burnout' },
    ],
  };

  const sectionRanges = categories[sectionName];
  if (!sectionRanges) return 'Unknown';

  for (let i = 0; i < sectionRanges.length; i++) {
    const { range, category } = sectionRanges[i];
    if (score >= range[0] && score <= range[1]) {
      return category;
    }
  }

  return 'Unknown';
};

// const generateHealthReportPDF = async (company_slug, assessment_id, res) => {
//   const doc = new PDFDocument({ margin: 30 });
//   res.setHeader('Content-Type', 'application/pdf');

//   try {
//     const company = await getCompanyBySlug(company_slug);
//     if (!company) throw new Error("Company not found");

//     const query = "SELECT employee_info, health_assessment FROM assessment_response WHERE assessment_id = ? AND company_slug = ?";
//     const [results] = await db.execute(query, [assessment_id, company_slug]);
//     if (results.length === 0) throw new Error("Assessment not found");

//     const employeeInfo = JSON.parse(results[0].employee_info);
//     const healthAssessment = JSON.parse(results[0].health_assessment);

//     const { firstName = 'N/A', lastName = 'N/A', dob, height, weight } = employeeInfo;
//     const age = calculateAge(dob);
//     const bmi = calculateBMI(weight, height);
//     const bmiCategory = getBMICategory(bmi);

//     const { bpValue, bpInterpretation } = getBloodPressureData(healthAssessment);
//     const { glucose_level, diabetesRisk } = getDiabetesRisk(healthAssessment);
//     const { cholesterol_level, cholesterolRisk } = getCholesterolRisk(healthAssessment);
//     const { totalScore, sectionScores, riskMessage } = getSectionScoresWithDetails(healthAssessment);

//     // Generate a custom file name with employee name and company name
//     const fileName = `${firstName}_${lastName}_${company.name}_health_assessment_report.pdf`;

//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
//     doc.pipe(res);

//     // Title with Center Alignment
//     doc.rect(50, 50, doc.page.width - 100, 40).stroke();
//     doc.fontSize(18).fillColor('black').text('Health Assessment Report', 50, 60, { align: 'center' });

//     // Introduction Paragraph
//     doc.moveDown(1);
//     doc.fontSize(10).fillColor('black').text(
//       'This Health Assessment Report is designed to provide a detailed analysis of an individual’s health profile. It includes key metrics such as BMI, blood pressure, glucose levels, and other health indicators, assessed based on the latest standards. This report aims to help individuals and organizations identify potential health risks and promote well-being.',
//       { width: doc.page.width - 100, align: 'justify' }
//     );

//     // Employee Info Section with Proper Alignment and Spacing
//     doc.moveDown(0.5);
//     doc.fontSize(12).font('Helvetica-Bold').text('Employee Information', { underline: true });
//     doc.fontSize(10).font('Helvetica').fillColor('black');
//     doc.moveDown(0.5)
//     const employeeData = [
//       { label: 'Name', value: `${firstName} ${lastName}` },
//       { label: 'Age', value: `${age}` },
//       { label: 'Height', value: height ? `${Math.floor(height)} feet ${Math.round((height % 1) * 12)} inches` : 'N/A' },
//       { label: 'Weight', value: `${weight || 'N/A'} kg` },
//       { label: 'BMI', value: `${bmi} (${bmiCategory})` },
//     ];
//     employeeData.forEach((data) => {
//       doc.font('Helvetica-Bold').text(`${data.label}:`, { continued: true });
//       doc.font('Helvetica').text(` ${data.value}`, { lineGap: 2 });
//     });

//     // Health Data Section
//     doc.moveDown(0.5);
//     doc.fontSize(12).font('Helvetica-Bold').text('Health Data', { underline: true });
//     doc.moveDown(1);

//     // Glucose Level
//     doc.fontSize(10).font('Helvetica-Bold').text('Glucose Level:', { continued: true });
//     doc.font('Helvetica').fillColor('black').text(` ${glucose_level || 'N/A'} mg/dL`);
//     doc.font('Helvetica-Bold').text('Interpretation:', { continued: true });
//     doc.font('Helvetica').text(` ${diabetesRisk || 'N/A'}`);

//     // Blood Pressure
//     doc.moveDown(0.5);
//     doc.fontSize(10).font('Helvetica-Bold').text('Blood Pressure:', { continued: true });
//     doc.font('Helvetica').text(` ${bpValue || 'N/A'}`);
//     doc.font('Helvetica-Bold').text('Interpretation:', { continued: true });
//     doc.font('Helvetica').text(` ${bpInterpretation || 'N/A'}`);

//     // Cholesterol Level
//     doc.moveDown(1);
//     doc.fontSize(10).font('Helvetica-Bold').text('Cholesterol Level:', { continued: true });
//     doc.font('Helvetica').text(` ${cholesterol_level || 'N/A'} mg/dL`);
//     doc.font('Helvetica-Bold').text('Interpretation:', { continued: true });
//     doc.font('Helvetica').text(` ${cholesterolRisk || 'N/A'}`);

//     // Section Wise Scoring Table
//     doc.moveDown(1);
//     doc.fontSize(12).font('Helvetica-Bold').text('Section Wise Scoring', { underline: true });
//     doc.moveDown();

//     // Table Headers and Rows
//     const startX = 50;
//     const startY = doc.y;
//     const colWidths = [250, 100, 200];
//     const rowHeight = 25;

//     // Headers
//     doc.fontSize(10).font('Helvetica-Bold');
//     ['Sections', 'Total Score', 'Category'].forEach((header, i) => {
//       doc.text(header, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), startY, {
//         width: colWidths[i],
//         align: 'center',
//       });
//     });

//     // Rows
//     doc.fontSize(12).font('Helvetica').fillColor('black');
//     sectionScores.forEach((row, rowIndex) => {
//       const y = startY + rowHeight * (rowIndex + 1);
//       const category = getCategory(row.sectionName, row.score);

//       doc.text(row.sectionName, startX, y, { width: colWidths[0], align: 'center' });
//       doc.text(row.score, startX + colWidths[0], y, { width: colWidths[1], align: 'center' });
//       doc.text(category, startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'center' });
//     });
//     // Adjust positioning for Total Score and Interpretation
//     const tableEndY = startY + rowHeight * (sectionScores.length + 1);
//     const spaceBelowTable = 20; // Space after the table
//     const leftMargin = 50; // Same margin as other headings

//     // Ensure enough space exists; otherwise, add a new page
//     if (tableEndY + spaceBelowTable + 60 > doc.page.height - 50) {
//       doc.addPage();
//       doc.moveTo(leftMargin, 50); // Move to top-left of the new page
//     } else {
//       doc.moveTo(leftMargin, tableEndY + spaceBelowTable); // Continue below the table
//     }

//     // Add "Total Score and Interpretation" heading
//     doc.fontSize(14)
//     doc.moveDown(2)
//       .font('Helvetica-Bold')
//       .fillColor('black')
//       .text('Total Score and Interpretation', leftMargin, doc.y, { underline: true });

//     // Add score and interpretation
//     doc.fontSize(12)
//     doc.moveDown(1)
//       .font('Helvetica')
//       .fillColor('black')
//       .text(`Total Score: ${totalScore}`, leftMargin);
//     doc.text(`Interpretation: ${riskMessage}`, leftMargin);

//     doc.end();
//   } catch (err) {
//     console.error('Error during PDF generation:', err.message);
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, message: 'An error occurred while generating the report.' });
//     }
//   }
// };

// Function to get the category for each section score


module.exports = {
  getUserHealthReport,
  generateHealthReportPDF,
};

