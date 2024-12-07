const express = require("express");
const router = express.Router();
const db = require("../config/db");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const logger = require("../utils/logger");
const {
  calculateBMI,
  calculateHealthConditionsPrevalence,
  calculateAgeDistribution,
  calculateRisk,
  calculateSectionScores,
  calculateBenefitCoverageSatisfaction,
} = require("../utils/helpers");

// Health condition keywords for prevalence calculation
const healthKeywords = {
  "Rheumatoid Arthritis": ["arthritis", "joint pain"],
  Diabetes: ["diabetes", "high blood sugar"],
  "Hypertension (High BP)": ["hypertension", "high blood pressure"],
  "High Cholesterol": ["cholesterol"],
  Gout: ["gout"],
  Anemia: ["anemia"],
  Fibromyalgia: ["fibromyalgia"],
  COPD: ["lung disease", "COPD"],
  "Metabolic Disorder": ["metabolic disorder"],
  "Thyroid Disease": ["thyroid"],
  "Cardiovascular Disease": ["heart disease", "cardiovascular"],
  Asthma: ["asthma"],
  Osteoporosis: ["osteoporosis"],
  "Chronic Kidney Disease": ["kidney disease"],
  "Urogenital Disease": ["urogenital"],
};

// Route to generate a company report (including health condition prevalence, BMI, age distribution, etc.)
router.get("/companies/:slug/report-calculation", async (req, res) => {
  const { slug } = req.params;

  try {
    // Fetch the company by slug from the database
    const [companyResult] = await db.query(
      "SELECT * FROM companies WHERE url = ?",
      [slug]
    );
    if (companyResult.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }
    const company = companyResult[0];

    // Fetch employee data and their assessment responses
    const [employeeResult] = await db.query(
      `SELECT * FROM assessment_response WHERE company_slug = ?`,
      [company.url]
    );

    const totalEmployees = employeeResult.length;
    const maleEmployees = employeeResult.filter(
      (emp) => JSON.parse(emp.employee_info).gender === "Male"
    ).length;
    const femaleEmployees = employeeResult.filter(
      (emp) => JSON.parse(emp.employee_info).gender === "Female"
    ).length;

    // Age distribution calculation
    const ageDistribution = calculateAgeDistribution(employeeResult);

    // BMI categorization and count
    const bmiData = {
      "Below Normal Weight": 0,
      "Normal Weight": 0,
      Overweight: 0,
      "Class I Obesity": 0,
      "Class II Obesity": 0,
      "Class III Obesity": 0,
    };
    employeeResult.forEach((emp) => {
      const { category } = calculateBMI(emp.weight, emp.height);
      bmiData[category]++;
    });

    // Calculate risk levels
    const riskLevels = employeeResult.map((emp) => {
      const response = JSON.parse(emp.health_assessment)?.marks;
      return calculateRisk(response);
    });

    // Satisfaction with benefits
    const benefitCoverage =
      calculateBenefitCoverageSatisfaction(employeeResult);

    // Employee health metrics interpretation (Blood Pressure, Diabetes, Cholesterol)
    const healthMetrics = employeeResult.map((emp) => {
      const response = JSON.parse(emp.health_assessment);
      return {
        bloodPressure: response.bp,
        diabetes: response.diabetes,
        cholesterol: response.cholesterol,
      };
    });
 
    // Female employee health (gynecological conditions and pregnancy plans)
    const femaleHealthData = employeeResult
      .filter((emp) => JSON.parse(emp.employee_info).gender === "female")
      .map((emp) => {
        const response = JSON.parse(emp.health_assessment);
        return {
          gynecologicalCondition: response.gynecologicalCondition,
          pregnancyPlans: response.pregnancyPlans,
        };
      });

    // Return the calculated report data as JSON
    res.json({
      company: {
        name: company.name,
        totalEmployees,
        maleEmployees,
        femaleEmployees,
        // conditionPrevalence,
        ageDistribution,
        bmiData,
        riskLevels,
        healthMetrics,
        benefitCoverage,
        femaleHealthData,
      },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to generate a PDF report based on the company data
router.get("/companies/:slug/report-pdf", async (req, res) => {
  const { slug } = req.params;

  try {
    // Fetch report data by calling the 'report-calculation' route
    const reportDataResponse = await axios.get(
      `http://localhost:5000/api/companies/${slug}/report-calculation`
    );
    const reportData = reportDataResponse.data;

    if (!reportData) {
      return res.status(404).json({ error: "Report data not found" });
    }

    const company = reportData.company;

    // Generate HTML content for the PDF report
    const reportHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Health Assessment Report</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; margin: 20px; }
                .container { max-width: 1200px; margin: auto; padding: 20px; }
                h1, h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                table, th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Health Report for ${company.name}</h1>
                <p><strong>Total Employees:</strong> ${
                  company.totalEmployees
                } | <strong>Male:</strong> ${
      company.maleEmployees
    } | <strong>Female:</strong> ${company.femaleEmployees}</p>
                
                <h2>Prevalent Health Conditions</h2>
                <table>
                    <tr><th>Condition</th><th>Prevalence (%)</th></tr>
                    ${Object.entries(company.conditionPrevalence)
                      .map(
                        ([condition, percentage]) =>
                          `<tr><td>${condition}</td><td>${percentage}</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>BMI Range</h2>
                <table>
                    <tr><th>Category</th><th>Percentage</th></tr>
                    ${Object.entries(company.bmiData)
                      .map(
                        ([category, count]) =>
                          `<tr><td>${category}</td><td>${(
                            (count / company.totalEmployees) *
                            100
                          ).toFixed(2)}%</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>Age Distribution</h2>
                <table>
                    <tr><th>Age Group</th><th>Count</th></tr>
                    ${Object.entries(company.ageDistribution)
                      .map(
                        ([ageGroup, count]) =>
                          `<tr><td>${ageGroup}</td><td>${count}</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>Health Metrics (Blood Pressure, Diabetes, Cholesterol)</h2>
                <table>
                    <tr><th>Metric</th><th>Value</th></tr>
                    ${company.healthMetrics
                      .map(
                        ({ bloodPressure, diabetes, cholesterol }) => `
                        <tr><td>Blood Pressure</td><td>${bloodPressure}</td></tr>
                        <tr><td>Diabetes</td><td>${diabetes}</td></tr>
                        <tr><td>Cholesterol</td><td>${cholesterol}</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>Benefit Coverage</h2>
                <table>
                    <tr><th>Status</th><th>Percentage</th></tr>
                    <tr><td>Satisfied</td><td>${
                      company.benefitCoverage.satisfied
                    }</td></tr>
                    <tr><td>Unsatisfied</td><td>${
                      company.benefitCoverage.unsatisfied
                    }</td></tr>
                </table>
            </div>
        </body>
        </html>`;

    // Launch puppeteer to generate PDF from HTML
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(reportHtml);
    const pdfBuffer = await page.pdf();
    await browser.close();

    // Send the PDF as response
    res.contentType("application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

module.exports = router;

// // Endpoint to generate report
// router.get('/api/companies/:slug/report', async (req, res) => {
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

//         // Calculate health condition prevalence
//         const conditionPrevalence = calculateHealthConditionPrevalence(employeeResult.map(emp => emp.response || ""));

//         // Age distribution
//         const ageDistribution = {
//             "<18": 0,
//             "18-30": 0,
//             "30-50": 0,
//             "50+": 0
//         };
//         employeeResult.forEach(emp => {
//             const age = emp.age;
//             if (age < 18) ageDistribution["<18"]++;
//             else if (age <= 30) ageDistribution["18-30"]++;
//             else if (age <= 50) ageDistribution["30-50"]++;
//             else ageDistribution["50+"]++;
//         });

//         // BMI calculation and categorization
//         const bmiData = {
//             "Below Normal Weight": 0,
//             "Normal Weight": 0,
//             "Overweight": 0,
//             "Class I Obesity": 0,
//             "Class II Obesity": 0,
//             "Class III Obesity": 0
//         };
//         employeeResult.forEach(emp => {
//             const { category } = calculateBMI(emp.weight, emp.height);
//             bmiData[category]++;
//         });

//         // Benefit and expense coverage
//         const benefitCoverage = {
//             satisfied: 70,
//             unsatisfied: 30
//         };
//         const expensesData = {
//             "OPD": 25,
//             "IPD": 20,
//             "Lab": 15,
//             "Pharmacy": 40
//         };

//         // Generate report HTML
//         const reportHtml = `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>Health Assessment Report</title>
//             <style>
//                 body { font-family: Arial, sans-serif; color: #333; margin: 20px; }
//                 .container { max-width: 1200px; margin: auto; padding: 20px; }
//                 h1, h2 { text-align: center; }
//                 table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
//                 table, th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
//                 th { background-color: #f4f4f4; }
//                 .pie-chart { width: 150px; height: 150px; display: inline-block; }
//             </style>
//         </head>
//         <body>
//             <div class="container">
//                 <h1>Health Report for ${company.name}</h1>
//                 <p><strong>Address:</strong> ${company.address}</p>
//                 <p><strong>Total Employees:</strong> ${totalEmployees} | <strong>Male:</strong> ${maleEmployees} | <strong>Female:</strong> ${femaleEmployees}</p>

//                 <h2>Prevalent Health Conditions</h2>
//                 <table>
//                     <tr><th>Condition</th><th>Prevalence (%)</th></tr>
//                     ${Object.entries(conditionPrevalence).map(([condition, percentage]) => `<tr><td>${condition}</td><td>${percentage}</td></tr>`).join('')}
//                 </table>

//                 <h2>BMI Range</h2>
//                 <table>
//                     <tr><th>Category</th><th>Percentage</th></tr>
//                     ${Object.entries(bmiData).map(([category, count]) => `<tr><td>${category}</td><td>${((count / totalEmployees) * 100).toFixed(2)}%</td></tr>`).join('')}
//                 </table>

//                 <h2>Age Distribution</h2>
//                 <table>
//                     <tr><th>Age Group</th><th>Count</th></tr>
//                     ${Object.entries(ageDistribution).map(([ageGroup, count]) => `<tr><td>${ageGroup}</td><td>${count}</td></tr>`).join('')}
//                 </table>

//                 <h2>Benefit Coverage</h2>
//                 <div class="pie-chart">Satisfied: ${benefitCoverage.satisfied}% | Unsatisfied: ${benefitCoverage.unsatisfied}%</div>

//                 <h2>Expenses</h2>
//                 <table>
//                     <tr><th>Service</th><th>Percentage</th></tr>
//                     ${Object.entries(expensesData).map(([service, percentage]) => `<tr><td>${service}</td><td>${percentage}%</td></tr>`).join('')}
//                 </table>

//                 <h2>Scoring Interpretation</h2>
//                 <p>Includes calculated risk levels with color-coded indicators for employee health risk.</p>
//             </div>
//         </body>
//         </html>
//         `;

//         // Generate PDF with Puppeteer
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
// API for generating PDF report based on company report calculation
router.get("/api/companies/:slug/report-pdf", async (req, res) => {
  const { slug } = req.params;

  try {
    // Fetch the company data and calculations from the previous endpoint
    const reportDataResponse = await axios.get(
      `http://localhost:3000/api/companies/${slug}/report-calculation`
    );
    const reportData = reportDataResponse.data;

    if (!reportData) {
      return res.status(404).json({ error: "Report data not found" });
    }

    const company = reportData.company;

    // Generate HTML content for PDF
    const reportHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Health Assessment Report</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; margin: 20px; }
                .container { max-width: 1200px; margin: auto; padding: 20px; }
                h1, h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                table, th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f4f4f4; }
                .pie-chart { width: 150px; height: 150px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Health Report for ${company.name}</h1>
                <p><strong>Total Employees:</strong> ${
                  company.totalEmployees
                } | <strong>Male:</strong> ${
      company.maleEmployees
    } | <strong>Female:</strong> ${company.femaleEmployees}</p>
                
                <h2>Prevalent Health Conditions</h2>
                <table>
                    <tr><th>Condition</th><th>Prevalence (%)</th></tr>
                    ${Object.entries(company.conditionPrevalence)
                      .map(
                        ([condition, percentage]) =>
                          `<tr><td>${condition}</td><td>${percentage}</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>BMI Range</h2>
                <table>
                    <tr><th>Category</th><th>Percentage</th></tr>
                    ${Object.entries(company.bmiData)
                      .map(
                        ([category, count]) =>
                          `<tr><td>${category}</td><td>${(
                            (count / company.totalEmployees) *
                            100
                          ).toFixed(2)}%</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>Age Distribution</h2>
                <table>
                    <tr><th>Age Group</th><th>Count</th></tr>
                    ${Object.entries(company.ageDistribution)
                      .map(
                        ([ageGroup, count]) =>
                          `<tr><td>${ageGroup}</td><td>${count}</td></tr>`
                      )
                      .join("")}
                </table>

                <h2>Scoring Interpretation</h2>
                <p>Includes calculated risk levels with color-coded indicators for employee health risk.</p>
            </div>
        </body>
        </html>
        `;

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(reportHtml);
    const reportsDir = path.join(__dirname, "..", "public", "reports");
    if (!fs.existsSync(reportsDir))
      fs.mkdirSync(reportsDir, { recursive: true });
    const pdfPath = path.join(reportsDir, `${slug}-report.pdf`);

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });
    await browser.close();

    // Send the PDF URL as the response
    res.json({ url: `/reports/${slug}-report.pdf` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generating PDF report" });
  }
});

module.exports = router;
