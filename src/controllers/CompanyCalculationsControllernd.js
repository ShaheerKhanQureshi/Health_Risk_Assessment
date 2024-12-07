const db = require("../config/db");
const logger = require("../utils/logger");
const puppeteer = require("puppeteer");
const path = require("path");

const calculateBMI = (employees) => {
  const bmiData = {
    "Below-Normal-Weight": 0,
    "Normal-Weight": 0,
    "Overweight": 0,
    "Class-I-Obesity": 0,
    "Class-II-Obesity": 0,
    "Class-III-Obesity": 0,
  };

  employees.forEach((emp) => {
    const { weight, height } = JSON.parse(emp.employee_info);
    if (weight && height) {
      const bmi = weight / Math.pow(height / 100, 2);
      let category = "Below-Normal-Weight";
      if (bmi >= 18.5 && bmi <= 24.9) category = "Normal-Weight";
      else if (bmi >= 25 && bmi <= 29.9) category = "Overweight";
      else if (bmi >= 30 && bmi <= 34.9) category = "Class-I-Obesity";
      else if (bmi >= 35 && bmi <= 39.9) category = "Class-II-Obesity";
      else if (bmi >= 40) category = "Class-III-Obesity";
      bmiData[category]++;
    }
  });

  return bmiData;
};

const calculateAgeDistribution = (employees) => {
    const ageDistribution = {
      "<25": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55+": 0,
    };
  
    employees.forEach((emp) => {
      const age = new Date().getFullYear() - new Date(JSON.parse(emp.employee_info).dob).getFullYear();
      if (age < 25) ageDistribution["<25"]++;
      else if (age < 35) ageDistribution["25-34"]++;
      else if (age < 45) ageDistribution["35-44"]++;
      else if (age < 55) ageDistribution["45-54"]++;
      else ageDistribution["55+"]++;
    });
  
    return ageDistribution;
  };

  const calculateHealthMetricsForCompany = async (req, res) => {
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
  
      // Aggregated results
      let bloodPressureRanges = {
        "Hypertension stage 2": 0,
        "Hypertension stage 1": 0,
        "Elevated blood pressure": 0,
        "Normal blood pressure": 0,
        "Low blood pressure": 0
      };
  
      let glucoseRanges = {
        "Uncontrolled Diabetes": 0,
        "Diabetes": 0,
        "Prediabetes": 0,
        "Normal": 0
      };
  
      let cholesterolRanges = {
        "Optimal": 0,
        "Good": 0,
        "Borderline": 0,
        "Moderate Risk": 0,
        "High Risk": 0
      };
  
      // Iterate over all employees and calculate health data
      for (let row of results) {
        let employeeInfo;
        let healthAssessment;
  
        try {
          employeeInfo = JSON.parse(row.employee_info);
          healthAssessment = JSON.parse(row.health_assessment);
        } catch (jsonErr) {
          console.error("Error parsing data:", jsonErr.message);
          continue; // Skip this employee if parsing fails
        }
  
        const { dob, height, weight } = employeeInfo;
        const age = calculateAge(dob);
        const bmi = calculateBMI(weight, height);
        const bmiCategory = getBMICategory(bmi);
  
        const { bpValue, bpInterpretation } = getBloodPressureData(healthAssessment);
        if (bpInterpretation === "Hypertension stage 2") bloodPressureRanges["Hypertension stage 2"]++;
        else if (bpInterpretation === "Hypertension stage 1") bloodPressureRanges["Hypertension stage 1"]++;
        else if (bpInterpretation === "Elevated blood pressure") bloodPressureRanges["Elevated blood pressure"]++;
        else if (bpInterpretation === "Normal blood pressure") bloodPressureRanges["Normal blood pressure"]++;
        else if (bpInterpretation === "Low blood pressure") bloodPressureRanges["Low blood pressure"]++;
  
        const { glucose_level, diabetesRisk } = getDiabetesRisk(healthAssessment);
        if (diabetesRisk === "High Risk") glucoseRanges["Uncontrolled Diabetes"]++;
        else if (diabetesRisk === "Normal") glucoseRanges["Normal"]++;
        else if (diabetesRisk === "Prediabetes") glucoseRanges["Prediabetes"]++;
        else if (diabetesRisk === "Diabetes") glucoseRanges["Diabetes"]++;
  
        const { cholesterol_level, cholesterolRisk } = getCholesterolRisk(healthAssessment);
        if (cholesterolRisk === "High Risk") cholesterolRanges["High Risk"]++;
        else if (cholesterolRisk === "Moderate risk") cholesterolRanges["Moderate Risk"]++;
        else if (cholesterolRisk === "Borderline") cholesterolRanges["Borderline"]++;
        else if (cholesterolRisk === "Good") cholesterolRanges["Good"]++;
        else if (cholesterolRisk === "Optimal") cholesterolRanges["Optimal"]++;
      }
  
      // Return the aggregated report
      return res.json({
        success: true,
        data: {
          bloodPressureRanges,
          glucoseRanges,
          cholesterolRanges,
          totalEmployees: results.length,
        },
      });
  
    } catch (err) {
      console.error("Error in getCompanyHealthReport:", err.message);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching the company's health report",
      });
    }
  };
  
  const getReportData = async (slug) => {
    try {
      const [companyResult] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
      if (companyResult.length === 0) throw new Error("Company not found");
      const company = companyResult[0];
  
      const [employeeResult] = await db.query("SELECT * FROM assessment_response WHERE company_slug = ?", [slug]);
      if (employeeResult.length === 0) throw new Error("No employees found for the company");
  
      const totalEmployees = employeeResult.length;

      const MaleEmployees = employeeResult.filter((emp) => JSON.parse(emp.employee_info).gender === "Male").length;
      const FemaleEmployees = employeeResult.filter((emp) => JSON.parse(emp.employee_info).gender === "Female").length;
  
      const ageDistribution = calculateAgeDistribution(employeeResult);
      const bmiData = calculateBMI(employeeResult);
      const prevalentHealthCondition = calculateConditionPrevalence(employeeResult);
      const conditionPrevalence = calculateConditionPrevalence(employeeResult);
      // const riskLevels = calculateRiskLevels(employeeResult);
      const HealthMetricsForCompany = calculateHealthMetricsForCompany(employeeResult);
      const WomanHealthChart = calculateWomanHealthChart(employeeResult);
      // const benefitCoverage = calculateBenefitCoverage(employeeResult);
      const satisfactionLevels = calculateSatisfactionLevels(employeeResult);
      const ScoringInterpretation = calculateScoringInterpretation(employeeResult);
      const ServiceBenifit = calculateServicesBenefit (employeeResult); 
      const ExpensesChart = calculateExpensesChart (employeeResult);
      const SectionWiseRiskDistribution = calculateSectionWiseRiskDistribution(employeeResult);
     
  
      return {
        company: {
          name: company.name,
          totalEmployees,
          MaleEmployees,
          FemaleEmployees,
          conditionPrevalence,
          ageDistribution,
          bmiData,
         
          HealthMetricsForCompany,
          WomanHealthChart,
          ExpensesChart,
         
          satisfactionLevels,
          ScoringInterpretation,
          prevalentHealthCondition, // Newly added data
          SectionWiseRiskDistribution, 
          ServiceBenifit// Newly added data
        },
      };
    } catch (error) {
      logger.error("Error fetching report data:", error);
      throw new Error("Error fetching report data");
    }
  };
  
  const generatePdfReport = async (slug, reportData) => {
    try {
      const company = reportData?.company;
      if (!company) {
        throw new Error("Company data is missing from report data");
      }
  
      const riskSummary = company.riskSummary ?? {};
      const bpCategories = company.healthMetrics?.bpCategories ?? {};
      const diabetesCategories = company.healthMetrics?.diabetesCategories ?? {};
      const cholesterolCategories = company.healthMetrics?.cholesterolCategories ?? {};
      const prevalentHealthCondition = company.prevalentHealthCondition ?? {};
      const sectionWiseRiskDistribution = company.sectionWiseRiskDistribution ?? {};
  
      const reportHtml = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${company.name} - Report</title>
          </head>
          <body>
            <h1>Health Report for ${company.name}</h1>
            
            <h2>Employee Statistics</h2>
            <p>Total Employees: ${company.totalEmployees ?? 'N/A'}</p>
            <p>Male Employees: ${company.MaleEmployees ?? 'N/A'}</p>
            <p>Female Employees: ${company.FemaleEmployees ?? 'N/A'}</p>
            
            <h2>Condition Prevalence</h2>
            <ul>${Object.entries(company.conditionPrevalence ?? {}).map(([condition, count]) => `<li>${condition}: ${count}</li>`).join("")}</ul>
     
            <h2>BMI Categories</h2>
            <ul>${Object.entries(company.bmiData ?? {}).map(([category, count]) => `<li>${category}: ${count}</li>`).join("")}</ul>
    
            <h2>Age Distribution</h2>
            <ul>${Object.entries(company.ageDistribution ?? {}).map(([ageRange, count]) => `<li>${ageRange}: ${count}</li>`).join("")}</ul>
    
            <h2>Risk Summary</h2>
            <ul>
              <li>Low Risk: ${riskSummary.low ?? 0}</li>
              <li>Moderate Risk: ${riskSummary.moderate ?? 0}</li>
              <li>High Risk: ${riskSummary.high ?? 0}</li>
            </ul>
    
            <h2>Health Metrics</h2>
            <p>Blood Pressure Categories:</p>
            <ul>${Object.entries(bpCategories).map(([category, count]) => `<li>${category}: ${count}</li>`).join("")}</ul>
    
            <p>Diabetes Categories:</p>
            <ul>${Object.entries(diabetesCategories).map(([category, count]) => `<li>${category}: ${count}</li>`).join("")}</ul>
    
            <p>Cholesterol Categories:</p>
            <ul>${Object.entries(cholesterolCategories).map(([category, count]) => `<li>${category}: ${count}</li>`).join("")}</ul>
    
            <h2>Prevalent Health Conditions</h2>
            <ul>${Object.entries(prevalentHealthCondition).map(([condition, percentage]) => `<li>${condition}: ${percentage}</li>`).join("")}</ul>
    
            <h2>Section-Wise Risk Distribution</h2>
            <ul>${Object.entries(sectionWiseRiskDistribution).map(([section, risks]) => `
                <li>${section}:
                  <ul>
                    ${Object.entries(risks).map(([riskLevel, count]) => `<li>${riskLevel}: ${count}</li>`).join("")}
                  </ul>
                </li>
              `).join("")}</ul>
          </body>
        </html>`;
  
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(reportHtml);
      const filePath = path.join(__dirname, "../reports", `${slug}-report.pdf`);
      await page.pdf({ path: filePath });
      await browser.close();
      
      return filePath;
    } catch (error) {
      logger.error("Error generating PDF report:", error);
      throw new Error("Error generating PDF report");
    }
  };
  
module.exports = {
  getReportData,
  generatePdfReport,
};
