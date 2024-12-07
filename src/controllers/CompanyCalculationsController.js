// const express = require('express');
// const router = express.Router();
// const pdfkit = require('pdfkit');
// const fs = require('fs');
// const path = require('path');
// const db = require('../config/db');

// // Health condition keywords
// const healthKeywords = {
//     "Rheumatoid Arthritis": ["arthritis", "joint pain"],
//     "Diabetes": ["diabetes", "high blood sugar"],
//     "Hypertension (High BP)": ["hypertension", "high blood pressure"],
//     "High Cholesterol": ["cholesterol"],
//     "Gout": ["gout"],
//     "Anemia": ["anemia"],
//     "Fibromyalgia": ["fibromyalgia"],
//     "Chronic Obstructive Pulmonary Disease (COPD)": ["lung disease", "COPD"],
//     "Metabolic Disorder": ["metabolic disorder"],
//     "Thyroid Disease": ["thyroid"],
//     "Cardiovascular Disease": ["heart disease", "cardiovascular"],
//     "Asthma": ["asthma"],
//     "Osteoporosis": ["osteoporosis"],
//     "Chronic Kidney Disease": ["kidney disease"],
//     "Urogenital Disease": ["urogenital"]
// };


// // Helper function to calculate health condition prevalence
// function calculateHealthConditionPrevalence(employeeResponses) {
//     const conditionCounts = {};
//     for (const condition in healthKeywords) {
//         conditionCounts[condition] = 0;
//     }
//     employeeResponses.forEach(response => {
//         for (const [condition, keywords] of Object.entries(healthKeywords)) {
//             if (keywords.some(keyword => response.includes(keyword))) {
//                 conditionCounts[condition]++;
//             }
//         }
//     });
//     const totalResponses = employeeResponses.length;
//     const prevalencePercentages = {};
//     for (const [condition, count] of Object.entries(conditionCounts)) {
//         prevalencePercentages[condition] = ((count / totalResponses) * 100).toFixed(2) + "%";
//     }
//     return prevalencePercentages;
// }

// // Helper function to calculate BMI and category
// function calculateBMI(weight, height) {
//     return (weight / ((height / 100) ** 2)).toFixed(2);
// }

// function calculateBMICategory(bmi) {
//     if (bmi < 18.5) return 'Underweight';
//     else if (bmi >= 18.5 && bmi < 25) return 'Normal Weight';
//     else if (bmi >= 25 && bmi < 30) return 'Overweight';
//     else if (bmi >= 30 && bmi < 35) return 'Class I Obesity';
//     else if (bmi >= 35 && bmi < 40) return 'Class II Obesity';
//     else return 'Class III Obesity';
// }

// const getRiskSectionData = async (company_slug) => {
//     // Replace this with actual SQL query as per your database structure
//     const [results] = await db.query(`
//         SELECT health_assessment
//         FROM assessment_response
//         WHERE company_slug = ?
//     `, [company_slug]);

//     // Process the results to get risk section-wise data
//     // Example aggregation logic to calculate counts or percentages
//     return results.map(entry => JSON.parse(entry.health_assessment)); // Parse JSON data
// };

// router.get('/api/company/:companySlug/report', async (req, res) => {
//     const { companySlug } = req.params;

//     try {
//         const [companyResult] = await db.query('SELECT * FROM companies WHERE slug = ?', [companySlug]);
//         if (companyResult.length === 0) return res.status(404).json({ error: 'Company not found' });

//         const company = companyResult[0];
//         const [employeeResult] = await db.query(
//             `SELECT employees.*, assessment_response.response 
//              FROM employees 
//              LEFT JOIN assessment_response ON employees.id = assessment_response.employee_id 
//              WHERE employees.company_id = ?`, 
//             [company.id]
//         );

//         const totalEmployees = employeeResult.length;
//         const maleEmployees = employeeResult.filter(emp => emp.gender === 'male').length;
//         const femaleEmployees = employeeResult.filter(emp => emp.gender === 'female').length;

//         // Calculate prevalence of health conditions
//         const conditionCounts = {
//             'Rheumatoid Arthritis': 0,
//             'Diabetes': 0,
//             'Osteoarthritis': 0,
//             'Hypertension (High BP)': 0,
//             'Gout': 0,
//             'Anemia': 0,
//             'High Cholesterol': 0,
//             'Fibromyalgia': 0,
//             'Asthma': 0,
//             'Osteoporosis': 0
//         };

//         employeeResult.forEach(emp => {
//             const response = emp.response ? JSON.parse(emp.response) : {};
//             for (let condition in conditionCounts) {
//                 if (response[condition]) conditionCounts[condition]++;
//             }
//         });

//         const conditionPrevalence = Object.entries(conditionCounts).map(([condition, count]) => {
//             const percentage = ((count / totalEmployees) * 100).toFixed(2);
//             return `<tr><td>${condition}</td><td>${percentage}%</td></tr>`;
//         }).join('');

//         // Generate the HTML content for the report
//         const reportHtml = `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>Health Assessment Report</title>
//             <style>
//                 body {
//                     font-family: Arial, sans-serif;
//                     color: #333;
//                     margin: 20px;
//                 }
//                 .container {
//                     max-width: 800px;
//                     margin: auto;
//                     padding: 20px;
//                     border: 1px solid #ddd;
//                     box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
//                 }
//                 h1, h2 {
//                     text-align: center;
//                 }
//                 table {
//                     width: 100%;
//                     border-collapse: collapse;
//                     margin-bottom: 10px;
//                 }
//                 table, th, td {
//                     border: 1px solid #ddd;
//                     padding: 8px;
//                     text-align: center;
//                 }
//                 th {
//                     background-color: #f4f4f4;
//                 }
//             </style>
//         </head>
//         <body>
//             <div class="container">
//                 <h1>Health Report for ${company.name}</h1>
//                 <p><strong>Total Employees:</strong> ${totalEmployees}</p>
//                 <p><strong>Male:</strong> ${maleEmployees}</p>
//                 <p><strong>Female:</strong> ${femaleEmployees}</p>
//                 <h2>Prevalent Health Conditions:</h2>
//                 <table>
//                     <tr><th>Condition</th><th>Prevalence (%)</th></tr>
//                     ${conditionPrevalence}
//                 </table>
//             </div>
//         </body>
//         </html>
//         `;

//         // Generate the PDF using Puppeteer
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();
//         await page.setContent(reportHtml);
//         const reportsDir = path.join(__dirname, '..', 'public', 'reports');
//         if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
//         const pdfPath = path.join(reportsDir, `${companySlug}-report.pdf`);
        
//         await page.pdf({
//             path: pdfPath,
//             format: 'A4',
//             printBackground: true,
//         });
//         await browser.close();

//         res.json({ url: `/reports/${companySlug}-report.pdf` });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// module.exports = router;
 