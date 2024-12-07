const db = require('../config/db');
const nodemailer = require('nodemailer');

// Function to calculate age from date of birth
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth();
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

const getEmployeeHealthInfo = async (req, res) => {
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

    const { email, firstName, lastName, companyName, occupation, dob, gender, weight, height } = employeeInfo;
    const age = calculateAge(dob);
    const bmi = calculateBMI(weight, height);

    const bmiCategory = getBMICategory(bmi);

    const { bpValue, bpInterpretation } = getBloodPressureData(healthAssessment);
    const { glucose_level, diabetesRisk } = getDiabetesRisk(healthAssessment);
    const { cholesterol_level, cholesterolRisk } = getCholesterolRisk(healthAssessment);
    const { totalScore, sectionScores, riskMessage } = getSectionScoresWithDetails(healthAssessment);

    // Send email
    const emailSent = await sendEmail(email, firstName, lastName, companyName, occupation, age, bmi, bmiCategory, bpValue, bpInterpretation, glucose_level, diabetesRisk, cholesterol_level, cholesterolRisk, totalScore, sectionScores, riskMessage);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send email",
      });
    }

    return res.json({
      success: true,
      data: {
        email,
        firstName,
        lastName,
        companyName,
        occupation,
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
      },
    });

  } catch (err) {
    console.error("Error in getEmployeeHealthInfo:", err.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching employee health information",
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
    ?.questions?.find(q => q.questionId === "PMH15" && q.response);

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

const getSectionScoresWithDetails = (healthAssessment) => {
  let totalScore = 0;
  let sectionScores = [];

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

  let riskMessage = "";
  if (totalScore <= 80) {
    riskMessage = "You're in good health!";
  } else if (totalScore <= 160) {
    riskMessage = "There are some areas where you could improve.";
  } else if (totalScore <= 240) {
    riskMessage = "This indicates potential health risks.";
  } else if (totalScore <= 320) {
    riskMessage = "Your health may be at serious risk.";
  } else {
    riskMessage = "Urgent attention is needed.";
  }

  return { totalScore, sectionScores, riskMessage };
};

// Function to send email to the user
// const sendEmail = async (email, firstName, lastName, companyName, occupation, age, bmi, bmiCategory, bpValue, bpInterpretation, glucose_level, diabetesRisk, cholesterol_level, cholesterolRisk, totalScore, sectionScores, riskMessage) => {
//   const transporter = nodemailer.createTransport({
//     service: 'gmail', // Or another email service
//     auth: {
//       user: 'qshaheerkhan@gmail.com',  
//       pass: 'utbiglxxydbulnuw',  
     
//     },
//   });

//   const mailOptions = {
//     from: 'your-email@gmail.com',
//     to: email,
//     subject: 'Employee Health Report',
//     text: `
//       Hi ${firstName} ${lastName},

//       Here is your health report for the company ${companyName}.

//       Age: ${age}
//       BMI: ${bmi} (${bmiCategory})
//       Blood Pressure: ${bpValue} - ${bpInterpretation}
//       Glucose Level: ${glucose_level} - ${diabetesRisk}
//       Cholesterol Level: ${cholesterol_level} - ${cholesterolRisk}

//       Total Score: ${totalScore}
//       Risk Message: ${riskMessage}

//       Best Regards,
//       Your Health Team
//     `,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     return true;
//   } catch (error) {
//     console.error("Error sending email:", error);
//     return false;
//   }
// };

// Function to send email to the user with an interactive template
const sendEmail = async (email, firstName, lastName, companyName, occupation, age, bmi, bmiCategory, bpValue, bpInterpretation, glucose_level, diabetesRisk, cholesterol_level, cholesterolRisk, totalScore, sectionScores, riskMessage) => {
  // Create the transporter for sending the email
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Or another email service
    auth: {
        user: 'qshaheerkhan@gmail.com', 
        pass: 'utbiglxxydbulnuw',  
      
    },
  });

  // Create the HTML email template
  const htmlTemplate = `
  <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #e6f2ff; /* Light blue background */
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          border: 1px solid #cce0ff;
        }
        .header {
          background-color: #0066cc; /* Primary blue */
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h2 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 20px;
        }
        .image-section {
          text-align: center;
          margin-bottom: 20px;
        }
        .image-section img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .section {
          margin-bottom: 20px;
          border-left: 4px solid #0066cc; /* Blue left border */
          padding-left: 15px;
        }
        .section h3 {
          margin: 0 0 10px;
          font-size: 18px;
          color: #003366; /* Dark blue */
          border-bottom: 1px solid #cce0ff; /* Light blue underline */
          padding-bottom: 5px;
        }
        .section p {
          margin: 8px 0;
          color: #555;
        }
        .score-section {
          background-color: #f2f9ff; /* Light blue background */
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #cce0ff; /* Light blue border */
          margin-bottom: 20px;
        }
        .score-section h3 {
          margin: 0 0 10px;
          font-size: 18px;
          color: #003366;
        }
        .score-section p {
          margin: 8px 0;
          color: #333;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #0066cc; /* Primary blue */
          color: white;
          padding: 10px 25px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px auto;
          text-align: center;
        }
        .button:hover {
          background-color: #004d99; /* Darker blue for hover */
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: white; /* White text for clarity */
          background-color: #0066cc; /* Blue footer background */
          padding: 15px;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h2>Mentor Health Report</h2>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Image Section -->
          <div class="image-section">
            <img src="src/controllers/logo.png" alt="Health Overview Image">
          </div>
  
          <!-- Greeting -->
          <h3>Hello ${firstName || "Valued Employee"} ${lastName || ""},</h3>
          <p>
            At <strong>Mentor Health</strong>, we believe in empowering individuals to lead healthier lives. 
            Below is your personalized health assessment, prepared in collaboration with <strong>${companyName || "Your Company"}</strong>. 
            This detailed report provides insights into key health metrics and overall well-being.
          </p>
  
          <!-- Personal Information -->
          <div class="section">
            <h3>Personal Information</h3>
            <p><strong>Age:</strong> ${age || "N/A"}</p>
            <p><strong>Occupation:</strong> ${occupation || "N/A"}</p>
          </div>
  
          <!-- Health Metrics -->
          <div class="section">
            <h3>Key Health Metrics</h3>
            <p><strong>BMI:</strong> ${bmi || "N/A"} (${bmiCategory || "N/A"})</p>
            <p><strong>Blood Pressure:</strong> ${bpValue || "N/A"} - ${bpInterpretation || "N/A"}</p>
            <p><strong>Glucose Level:</strong> ${glucose_level || "N/A"} - ${diabetesRisk || "N/A"}</p>
            <p><strong>Cholesterol Level:</strong> ${cholesterol_level || "N/A"} - ${cholesterolRisk || "N/A"}</p>
          </div>
  
          <!-- Health Score -->
          <div class="score-section">
            <h3>Health Risk Overview</h3>
            <p><strong>Overall Score:</strong> ${totalScore || "N/A"}</p>
            <p><strong>Risk Assessment:</strong> ${riskMessage || "N/A"}</p>
            <p>This score reflects your overall health status. Please consult your healthcare provider for detailed guidance.</p>
          </div>
  
          <!-- Call-to-Action -->
          <a href="https://mentorhealth.com/contact" class="button">Contact Mentor Health</a>
        </div>
  
        <!-- Footer -->
        <div class="footer">
          <p>
            Mentor Health, in collaboration with ${companyName || "Your Company"}, is here to assist you on your health journey. 
            If you have questions or require further information, don't hesitate to reach out.
          </p>
        </div>
      </div>
    </body>
  </html>
  `;
  

  // Setup email options
  const mailOptions = {
    from: 'no-reply',
    to: email,
    subject: 'Your Health Report - Mentor Health',
    html: htmlTemplate,  // The HTML content goes here
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = {
  getEmployeeHealthInfo,
};
