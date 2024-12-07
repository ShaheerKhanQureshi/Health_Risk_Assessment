const db = require("../config/db");
const logger = require("../utils/logger");
const pdfmake = require('pdfmake');
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


const calculateConditionPrevalence = (employees) => {
  const conditions = {
    "Rheumatoid Arthritis": 0,
    "Diabetes": 0,
    "Hypertension (High BP)": 0,
    "Osteoarthritis": 0,
    "Gout": 0,
    "Anemia": 0,
    "High Cholesterol": 0,
    "Fibromyalgia": 0,
    "Thyroid Disease": 0,
    "Cardiovascular Disease (heart disease)": 0,
    "Asthma": 0,
    "Osteoporosis": 0,
    "Chronic Kidney Disease": 0,
    "Chronic Obstructive Pulmonary Disease (COPD) / lung disease": 0,
    "Urogenital Disease": 0,
    "Metabolic Disorder": 0,
    "Cancer": 0,
    "Myocardial Infarction": 0,
    "Hepatitis B or C": 0,
    "Tuberculosis": 0,
    "Heart failure": 0,
  };

  employees.forEach((emp) => {
    let healthData = [];
    try {
      healthData = JSON.parse(emp.health_assessment);
    } catch (e) {
      console.error(`Error parsing health_assessment for employee ${emp.id}: ${e.message}`);
      return;
    }

    healthData.forEach((section) => {
      if (section.subHeading === "Personal Medical History") {
        section.questions.forEach((question) => {
          if (question.questionId === "PMH3" || question.questionId === "PMH5" || question.questionId === "PMH7") {
            const conditionsList = Array.isArray(question.response) ? question.response : [question.response];

            conditionsList.forEach((condition) => {
              if (conditions.hasOwnProperty(condition)) {
                conditions[condition]++;
              }
            });
          }
        });
      }
    });
  });

  const totalEmployees = employees.length;
  Object.keys(conditions).forEach((condition) => {
    conditions[condition] = ((conditions[condition] / totalEmployees) * 100).toFixed(2);
  });

  return conditions;
};


const calculateRiskDistribution = (employees) => {
  // Define section total max scores
  const sectionMaxScores = {
    "Personal Health Habits": 50,
    "Personal Medical History": 156,
    "Women Health": 23,
    "Lifestyle and Diet": 31,
    "Mental and Emotional Health Risk": 40,
    "Occupational Health Risk": 50,
    "Burnout at Work": 50
  };

  // Initialize counters for section-wise distribution
  const sectionScores = {
    "Personal Health Habits": [],
    "Personal Medical History": [],
    "Women Health": [],
    "Lifestyle and Diet": [],
    "Mental and Emotional Health Risk": [],
    "Occupational Health Risk": [],
    "Burnout at Work": []
  };

  const riskCategories = {
    "Low Risk (0-80)": 0,
    "Moderate Risk (81-160)": 0,
    "High Risk (161-240)": 0,
    "Very High Risk (241-320)": 0,
    "Severe Risk (321-400)": 0
  };

  // Initialize total employee count
  const totalEmployees = employees.length;

  if (totalEmployees === 0) {
    return {
      sectionScores,
      riskCategories,
      totalEmployees
    };
  }

  // Process each employee's health assessment
  employees.forEach((emp) => {
    let healthAssessment;

    try {
      // Attempt to parse the health_assessment field
      healthAssessment = JSON.parse(emp.health_assessment);
    } catch (error) {
      console.error('Error parsing health_assessment for employee:', emp);
      return;
    }

    // Collect scores for each section
    healthAssessment.forEach((section) => {
      if (sectionScores[section.subHeading] && section.sectionScore != null) {
        sectionScores[section.subHeading].push(section.sectionScore);
      }
    });
  });

  // Calculate average score per section
  const sectionAverages = {};
  for (let section in sectionScores) {
    const scores = sectionScores[section];

    if (scores.length > 0) {
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / scores.length;
      sectionAverages[section] = averageScore;
    } else {
      // If no data for this section, mark as null or N/A
      sectionAverages[section] = "N/A";
    }
  }

  // Calculate how many employees fall into each risk category based on average score for each section
  for (let section in sectionScores) {
    sectionScores[section].forEach((score) => {
      let category = '';
      if (score <= 80) {
        category = "Low Risk (0-80)";
      } else if (score <= 160) {
        category = "Moderate Risk (81-160)";
      } else if (score <= 240) {
        category = "High Risk (161-240)";
      } else if (score <= 320) {
        category = "Very High Risk (241-320)";
      } else {
        category = "Severe Risk (321-400)";
      }

      riskCategories[category]++;
    });
  }

  // Calculate percentage distribution for each risk category
  for (let category in riskCategories) {
    const percentage = ((riskCategories[category] / totalEmployees) * 100).toFixed(2);
    riskCategories[category] = {
      count: riskCategories[category],
      percentage: percentage
    };
  }

  return {
    sectionAverages,       // Average scores per section
    riskCategories,        // Risk categories with percentages
    totalEmployees         // Total number of employees
  };
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

const calculateExpensesChart = (employees) => {
  const expensesData = {
    opd: 0,
    Ipd: 0,
    lab: 0,
    pharmacy: 0,
    total: 0
  };

  const totalEmployees = employees.length;

  if (totalEmployees === 0) {
    return {
      opd: '0.00',
      Ipd: '0.00',
      lab: '0.00',
      pharmacy: '0.00',
      total: '100.00'
    };
  }

  const expenseOptions = {
    "HBE4": {
      "More than PKR 6000": 5,
      "PKR 5000 - PKR 6000": 4,
      "PKR 3000 - PKR 4000": 3,
      "PKR 1000 - PKR 2000": 2,
      "Less than PKR 1000": 1
    },
    "HBE5": {
      "More than PKR 10,000": 5,
      "PKR 6000 - PKR 10,000": 4,
      "PKR 4000 - PKR 5000": 3,
      "PKR 2000 - PKR 3000": 2,
      "Less than PKR 2000": 1
    },
    "HBE6": {
      "More than PKR 15,000": 5,
      "PKR 12,000 - PKR 15,000": 4,
      "PKR 8000 - PKR 11,000": 3,
      "PKR 5000 - PKR 8000": 2,
      "Less than PKR 5000": 1
    },
    "HBE2": {
      "OPD": 1,
      "IPD": 1,
      "Pharmacy": 1,
      "Lab and Diagnostics": 1,
      "Homecare services": 1,
      "Telemedicine": 1
    },
    "HBE3": {
      "OPD": 1,
      "IPD": 1,
      "Pharmacy": 1,
      "Lab and Diagnostics": 1,
      "Homecare": 1,
      "Maternity": 1,
      "Telemedicine": 1,
      "Dental procedure": 1,
      "Pre-existing condition": 1,
      "Wellness program and preventive care": 1
    }
  };

  employees.forEach((emp) => {
    let healthAssessment;
    try {
      healthAssessment = JSON.parse(emp.health_assessment);
    } catch (error) {
      return;
    }

    healthAssessment.forEach((section) => {
      if (section.subHeading === "Health Benefits and Expenditure") {
        section.questions.forEach((question) => {
          if (question.questionId === "HBE4" || question.questionId === "HBE5" || question.questionId === "HBE6") {
            const expenseType = question.questionId;
            const expenseValue = expenseOptions[expenseType] && expenseOptions[expenseType][question.response];
            if (expenseValue) {
              if (expenseType === "HBE4") {
                expensesData.opd += expenseValue;
              } else if (expenseType === "HBE5") {
                expensesData.lab += expenseValue;
              } else if (expenseType === "HBE6") {
                expensesData.pharmacy += expenseValue;
              }
            }
          }

          if (question.questionId === "HBE2") {
            const servicesUsed = Array.isArray(question.response) ? question.response : [question.response];
            servicesUsed.forEach((service) => {
              if (expenseOptions.HBE2[service]) {
                expensesData[service] = (expensesData[service] || 0) + expenseOptions.HBE2[service];
              }
            });
          }

          if (question.questionId === "HBE3") {
            const servicesCovered = Array.isArray(question.response) ? question.response : [question.response];
            servicesCovered.forEach((service) => {
              if (expenseOptions.HBE3[service]) {
                expensesData[service] = (expensesData[service] || 0) + expenseOptions.HBE3[service];
              }
            });
          }
        });
      }
    });
  });

  expensesData.total = expensesData.opd + expensesData.IPD + expensesData.lab + expensesData.pharmacy;

  if (expensesData.total === 0) {
    return {
      opd: '0.00',
      IPD: '0.00',
      lab: '0.00',
      pharmacy: '0.00',
      total: '100.00'
    };
  }

  const totalSum = expensesData.total;
  return {
    opd: ((expensesData.opd / totalSum) * 100).toFixed(2),
    IPD: ((expensesData.IPD / totalSum) * 100).toFixed(2),
    lab: ((expensesData.lab / totalSum) * 100).toFixed(2),
    pharmacy: ((expensesData.pharmacy / totalSum) * 100).toFixed(2),
    total: '100.00'
  };
};

const calculateWomanHealthChart = (employees) => {
  const conditions = {
    "Polycystic Ovarian Syndrome (PCOS)": 0,
    "Endometriosis": 0,
    "Uterine Fibroids": 0,
    "Ovarian cysts": 0,
    "Menstrual Irregularities": 0,
  };

  let employeesWithGynecologicalIssues = 0;
  let employeesPlanningPregnancy = 0;
  let totalEmployees = employees.length;

  employees.forEach((emp) => {
    let healthData = [];
    try {
      healthData = JSON.parse(emp.health_assessment);
    } catch (e) {
      console.error(`Error parsing health_assessment for employee ${emp.id}: ${e.message}`);
      return;
    }

    healthData.forEach((section) => {
      if (section.subHeading === "Women Health") {
        section.questions.forEach((question) => {
          if (question.questionId === "WH2") {
            const conditionsList = Array.isArray(question.response) ? question.response : [question.response];
            if (conditionsList.length > 0) {
              employeesWithGynecologicalIssues++;
            }
            conditionsList.forEach((condition) => {
              if (conditions.hasOwnProperty(condition)) {
                conditions[condition]++;
              }
            });
          }
          if (question.questionId === "WH4") {
            if (question.response === "Yes") {
              employeesPlanningPregnancy++;
            }
          }
        });
      }
    });
  });

  const percentageWithGynecologicalIssues = ((employeesWithGynecologicalIssues / totalEmployees) * 100).toFixed(2);

  const conditionPrevalence = {};
  Object.keys(conditions).forEach((condition) => {
    conditionPrevalence[condition] = ((conditions[condition] / totalEmployees) * 100).toFixed(2);
  });

  let mostPrevalentCondition = null;
  let highestPrevalence = 0;
  Object.keys(conditionPrevalence).forEach((condition) => {
    const prevalence = parseFloat(conditionPrevalence[condition]);
    if (prevalence > highestPrevalence) {
      highestPrevalence = prevalence;
      mostPrevalentCondition = condition;
    }
  });

  const percentagePlanningPregnancy = ((employeesPlanningPregnancy / totalEmployees) * 100).toFixed(2);

  let totalConditionPercentage = 0;
  Object.keys(conditionPrevalence).forEach((condition) => {
    totalConditionPercentage += parseFloat(conditionPrevalence[condition]);
  });

  if (totalConditionPercentage > 0) {
    Object.keys(conditionPrevalence).forEach((condition) => {
      conditionPrevalence[condition] = ((parseFloat(conditionPrevalence[condition]) / totalConditionPercentage) * 100).toFixed(2);
    });
  }

  return {
    percentageWithGynecologicalIssues,
    mostPrevalentCondition,
    highestPrevalence,
    percentagePlanningPregnancy,
    conditionPrevalence
  };
};

const calculateServicesBenefit = (employees) => {
  const servicesData = {
    Telemedicine: { using: 0, covered: 0 },
    OPD: { using: 0, covered: 0 },
    IPD: { using: 0, covered: 0 },
    Pharmacy: { using: 0, covered: 0 },
    "Lab and Diagnostics": { using: 0, covered: 0 },
    Homecare: { using: 0, covered: 0 },
    Maternity: { using: 0, covered: 0 },
    "Dental procedure": { using: 0, covered: 0 },
    "Pre-existing condition": { using: 0, covered: 0 },
    "Wellness program and preventive care": { using: 0, covered: 0 }
  };

  const totalEmployees = employees.length;

  if (totalEmployees === 0) {
    return { ServiceBenefit: servicesData };
  }

  employees.forEach((emp) => {
    let healthAssessment;
    try {
      healthAssessment = JSON.parse(emp.health_assessment);
    } catch (error) {
      console.error('Error parsing health_assessment for employee:', emp);
      return;
    }

    if (healthAssessment) {
      healthAssessment.forEach((section) => {
        if (section.subHeading === "Health Benefits and Expenditure") {
          section.questions.forEach((question) => {
            if (question.questionId === "HBE2") {
              const servicesUsed = Array.isArray(question.response) ? question.response : [question.response];
              servicesUsed.forEach((service) => {
                if (servicesData[service]) {
                  servicesData[service].using++;
                }
              });
            }

            if (question.questionId === "HBE3") {
              const servicesCovered = Array.isArray(question.response) ? question.response : [question.response];
              servicesCovered.forEach((service) => {
                if (servicesData[service]) {
                  servicesData[service].covered++;
                }
              });
            }
          });
        }
      });
    }
  });

  Object.keys(servicesData).forEach((service) => {
    servicesData[service].using = ((servicesData[service].using / totalEmployees) * 100).toFixed(2);
    servicesData[service].covered = ((servicesData[service].covered / totalEmployees) * 100).toFixed(2);

    if (parseFloat(servicesData[service].using) > 100) {
      servicesData[service].using = "100.00";
    }
    if (parseFloat(servicesData[service].covered) > 100) {
      servicesData[service].covered = "100.00";
    }
  });

  return { ServiceBenefit: servicesData };
};


const satisfactionQuestion = {
  id: "HBE1",
  questionText: "Do you believe the health benefits offered by the company sufficiently meet your needs?",
  questionType: "mcq",
  options: [
    { answer: "Yes", score: 1 },
    { answer: "No", score: 5 }
  ]
};

const calculateSatisfactionLevels = (employees, question = satisfactionQuestion) => {
  let yesCount = 0;
  let noCount = 0;

  employees.forEach((emp) => {
    let healthData = [];
    try {
      healthData = JSON.parse(emp.health_assessment);
    } catch (e) {
      console.error(`Error parsing health_assessment for employee ${emp.id}: ${e.message}`);
      return;
    }

    healthData.forEach((section) => {
      if (section.subHeading === "Health Benefits and Expenditure") {
        section.questions.forEach((questionData) => {
          if (questionData.questionId === question.id) {
            if (questionData.response === "Yes") {
              yesCount++;
            } else if (questionData.response === "No") {
              noCount++;
            }
          }
        });
      }
    });
  });

  const totalEmployees = employees.length;
  const satisfactionYesPercentage = ((yesCount / totalEmployees) * 100).toFixed(2);
  const satisfactionNoPercentage = ((noCount / totalEmployees) * 100).toFixed(2);

  return {
    satisfactionLevel: {
      heading: "Satisfaction Level",  // Heading only, no full question text here
      yesPercentage: satisfactionYesPercentage,
      noPercentage: satisfactionNoPercentage
    }
  };
};


const calculateFitnessHealthData = (employees) => {
  const companyConditions = {};


  const conditions = {
    cholesterol: {
      "Normal Cholesterol": { count: 0, interpretation: "Generally considered healthy with low cardiovascular risk." },
      "Borderline High Cholesterol": { count: 0, interpretation: "Possible risk for heart disease; lifestyle changes recommended." },
      "High Cholesterol": { count: 0, interpretation: "Increased risk of cardiovascular disease; consider medical intervention." },
      "Unknown": { count: 0, interpretation: "Cholesterol level unknown." }
    },
    bloodPressure: {
      "Normal Blood Pressure": { count: 0, interpretation: "Indicates good cardiovascular health." },
      "Elevated Blood Pressure": { count: 0, interpretation: "Risk of hypertension; lifestyle changes recommended." },
      "Hypertension Stage 1": { count: 0, interpretation: "Hypertension stage 1; requires lifestyle changes and possibly medication." },
      "Hypertension Stage 2": { count: 0, interpretation: "Hypertension stage 2; urgent medical intervention may be required." },
      "Low Blood Pressure": { count: 0, interpretation: "Low blood pressure; may need further evaluation if symptoms are present." },
      "Unknown": { count: 0, interpretation: "Blood pressure unknown." }
    },
    glucose: {
      "Normal Glucose": { count: 0, interpretation: "Indicates healthy glucose levels." },
      "Prediabetes": { count: 0, interpretation: "Indicates prediabetes; lifestyle modifications are recommended." },
      "Diabetes": { count: 0, interpretation: "Indicates diabetes; requires further testing and management." },
      "Low Glucose": { count: 0, interpretation: "Glucose level too low; consult a healthcare provider." },
      "Unknown": { count: 0, interpretation: "Glucose level unknown." }
    }
  };

  employees.forEach((emp) => {
    const companySlug = emp.company_slug;
    if (!companySlug) return;

    if (!companyConditions[companySlug]) {
      companyConditions[companySlug] = { ...conditions };
    }

    let healthData = [];
    try {
      healthData = JSON.parse(emp.health_assessment);
    } catch (e) {
      console.error(`Error parsing health_assessment for employee ${emp.id}: ${e.message}`);
      return;
    }

    healthData.forEach((section) => {
      if (section.subHeading === "Personal Medical History") {
        section.questions.forEach((question) => {
          if (question.questionId === "PMH14") {
            // Blood Pressure Processing
            const bpValue = processBloodPressure(question.response);
            if (bpValue) companyConditions[companySlug].bloodPressure[bpValue].count++;
          }
          if (question.questionId === "PMH15") {
            // Glucose Processing
            const glucoseValue = processGlucose(question.response);
            if (glucoseValue) companyConditions[companySlug].glucose[glucoseValue].count++;
          }
          if (question.questionId === "PMH16") {
            // Cholesterol Processing
            const cholesterolValue = processCholesterol(question.response);
            if (cholesterolValue) companyConditions[companySlug].cholesterol[cholesterolValue].count++;
          }
        });
      }
    });
  });

  const result = {};
  Object.keys(companyConditions).forEach((companySlug) => {
    const companyData = companyConditions[companySlug];
    const totalEmployeesInCompany = employees.filter((emp) => emp.company_slug === companySlug).length;

    const companyPrevalence = {
      cholesterol: {},
      bloodPressure: {},
      glucose: {}
    };

    Object.keys(companyData.cholesterol).forEach((condition) => {
      companyPrevalence.cholesterol[condition] = {
        percentage: ((companyData.cholesterol[condition].count / totalEmployeesInCompany) * 100).toFixed(2),
        interpretation: companyData.cholesterol[condition].interpretation
      };
    });

    Object.keys(companyData.bloodPressure).forEach((condition) => {
      companyPrevalence.bloodPressure[condition] = {
        percentage: ((companyData.bloodPressure[condition].count / totalEmployeesInCompany) * 100).toFixed(2),
        interpretation: companyData.bloodPressure[condition].interpretation
      };
    });

    Object.keys(companyData.glucose).forEach((condition) => {
      companyPrevalence.glucose[condition] = {
        percentage: ((companyData.glucose[condition].count / totalEmployeesInCompany) * 100).toFixed(2),
        interpretation: companyData.glucose[condition].interpretation
      };
    });

    result[companySlug] = companyPrevalence;
  });

  return result;
};

// Function to process Blood Pressure
const processBloodPressure = (bpResponse) => {
  if (!bpResponse) return null;

  const bp = bpResponse.trim().toLowerCase();

  if (bp.includes("140 mmhg or higher / 90 mmhg or higher")) {
    return "Hypertension Stage 2";
  } else if (bp.includes("130-139 mmhg / 85-89 mmhg")) {
    return "Hypertension Stage 1";
  } else if (bp.includes("120-129 mmhg / 80-84 mmhg")) {
    return "Elevated Blood Pressure";
  } else if (bp.includes("80-119 mmhg / 60-79 mmhg")) {
    return "Normal Blood Pressure";
  } else if (bp.includes("less than 80 mmhg / less than 60 mmhg")) {
    return "Low Blood Pressure";
  }
  return "Unknown";
};

// Function to process Glucose Levels
const processGlucose = (glucoseResponse) => {
  if (!glucoseResponse) return null;

  const glucose = glucoseResponse.trim().toLowerCase();

  if (glucose.includes("150 mg/dl or higher")) {
    return "Diabetes";
  } else if (glucose.includes("126-149 mg/dl")) {
    return "Diabetes";
  } else if (glucose.includes("100-125 mg/dl")) {
    return "Prediabetes";
  } else if (glucose.includes("70-99 mg/dl")) {
    return "Normal Glucose";
  } else if (glucose.includes("less than 70 mg/dl")) {
    return "Low Glucose";
  }
  return "Unknown";
};

// Function to process Cholesterol Levels
const processCholesterol = (cholesterolResponse) => {
  if (!cholesterolResponse) return null;

  const cholesterol = cholesterolResponse.trim().toLowerCase();

  if (cholesterol.includes("greater than 3")) {
    return "High Cholesterol";
  } else if (cholesterol.includes("2.5-3")) {
    return "Borderline High Cholesterol";
  } else if (cholesterol.includes("2-2.5")) {
    return "Normal Cholesterol";
  } else if (cholesterol.includes("1.5-2")) {
    return "Normal Cholesterol";
  } else if (cholesterol.includes("less than 1.5")) {
    return "Normal Cholesterol";
  }
  return "Unknown";
};


const getReportData = async (slug) => {
  try {
    // Fetch company data based on the provided slug
    const [companyResult] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
    if (companyResult.length === 0) throw new Error("Company not found");
    const company = companyResult[0];

    // Fetch employee data (assessment responses) for the specified company
    const [employeeResult] = await db.query("SELECT * FROM assessment_response WHERE company_slug = ?", [slug]);
    if (employeeResult.length === 0) throw new Error("No employees found for the company");

    // Get total employees and gender distribution
    const totalEmployees = employeeResult.length;
    const MaleEmployees = employeeResult.filter((emp) => JSON.parse(emp.employee_info).gender === "Male").length;
    const FemaleEmployees = employeeResult.filter((emp) => JSON.parse(emp.employee_info).gender === "Female").length;

    // Calculate health-related data
    const ageDistribution = calculateAgeDistribution(employeeResult);
    const bmiData = calculateBMI(employeeResult);
    const prevalentHealthCondition = calculateConditionPrevalence(employeeResult);
    const riskLevels = calculateRiskDistribution(employeeResult);
    const HealthData = calculateFitnessHealthData(employeeResult); // This includes BP, cholesterol, and glucose levels
    const WomanHealthChart = calculateWomanHealthChart(employeeResult);
    const satisfactionLevels = calculateSatisfactionLevels(employeeResult);
    const ServiceBenifit = calculateServicesBenefit(employeeResult);
    const ExpensesChart = calculateExpensesChart(employeeResult);
    const SectionWiseRiskDistribution = calculateRiskDistribution(employeeResult);
    // const totalaverages = calculateHealthRisk(employeeResult)

    // Return the report data for the company
    return {
      company: {
        id: company.id,
        name: company.name,
        companyType: company.companyType,
        phoneNumber: company.phoneNumber,
        email: company.email,
        city: company.city,
        url: company.url,
        totalEmployees,
        MaleEmployees,
        FemaleEmployees,
        conditionPrevalence: prevalentHealthCondition,
        ageDistribution,
        bmiData,
        HealthData,
        WomanHealthChart,
        ExpensesChart,
        // totalaverages, 
        satisfactionLevels,
        SectionWiseRiskDistribution,
        ServiceBenifit,
        riskLevels,
      },
    };
  } catch (error) {
    logger.error("Error fetching report data:", error);
    throw new Error("Error fetching report data");
  }
};
// const getReportData = async (slug) => {
//   try {
//     const companyResult = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
//     if (!companyResult || companyResult.length === 0) {
//       throw new Error("Company not found");
//     }

//     const company = companyResult[0];
//     const employeeResult = await db.query("SELECT * FROM assessment_response WHERE company_slug = ?", [slug]);
//     if (!employeeResult || employeeResult.length === 0) {
//       throw new Error("No employees found for the company");
//     }

//     // Initialize employee counters and data containers
//     const totalEmployees = employeeResult.length;
//     let maleCount = 0;
//     let femaleCount = 0;
//     let validEmployees = [];
    
//     // Process employee data, parse employee_info only if valid
//     employeeResult.forEach(emp => {
//       let employeeInfo;
//       try {
//         employeeInfo = emp.employee_info ? JSON.parse(emp.employee_info) : null;
//       } catch (err) {
//         console.error(`Invalid JSON for employee ${emp.id}:`, err);
//         return; // Skip this employee if JSON is malformed
//       }
      
//       if (employeeInfo) {
//         validEmployees.push(employeeInfo);
//         if (employeeInfo.gender === "Male") maleCount++;
//         if (employeeInfo.gender === "Female") femaleCount++;
//       }
//     });

//     // If there are no valid employees after filtering
//     if (validEmployees.length === 0) {
//       throw new Error("No valid employee data found.");
//     }

//     // Calculate health-related data
//     const ageDistribution = calculateAgeDistribution(validEmployees);
//     const bmiData = calculateBMI(validEmployees);
//     const prevalentHealthCondition = calculateConditionPrevalence(validEmployees);
//     const riskLevels = calculateRiskDistribution(validEmployees);
//     const healthData = calculateFitnessHealthData(validEmployees);
//     const womanHealthChart = calculateWomanHealthChart(validEmployees);
//     const satisfactionLevels = calculateSatisfactionLevels(validEmployees);
//     const serviceBenefit = calculateServicesBenefit(validEmployees);
//     const expensesChart = calculateExpensesChart(validEmployees);
//     const sectionWiseRiskDistribution = calculateRiskDistribution(validEmployees);

//     // Return the report data
//     return {
//       company: {
//         id: company.id,
//         name: company.name,
//         companyType: company.companyType,
//         phoneNumber: company.phoneNumber,
//         email: company.email,
//         city: company.city,
//         url: company.url,
//         totalEmployees,
//         maleEmployees: maleCount,
//         femaleEmployees: femaleCount,
//         conditionPrevalence: prevalentHealthCondition,
//         ageDistribution,
//         bmiData,
//         healthData,
//         womanHealthChart,
//         expensesChart,
//         satisfactionLevels,
//         sectionWiseRiskDistribution,
//         serviceBenefit,
//         riskLevels,
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching report data:", error);
//     throw new Error("Error fetching report data");
//   }
// };


// const generatePdfReport = async (reportData) => {
//   const { company } = reportData;

//   // Define document definition for pdfmake
//   const docDefinition = {
//     content: [
//       { text: `Health Report for ${company.name}`, style: 'header' },
//       { text: `Company Type: ${company.companyType}`, style: 'subheader' },
//       { text: `Location: ${company.city}`, style: 'subheader' },
//       { text: `Contact: ${company.phoneNumber} | ${company.email}`, style: 'subheader' },
      
//       { text: 'Employee Overview', style: 'sectionHeader' },
//       {
//         table: {
//           body: [
//             ['Total Employees', company.totalEmployees],
//             ['Male Employees', company.MaleEmployees],
//             ['Female Employees', company.FemaleEmployees]
//           ]
//         }
//       },

//       { text: 'Health Data Overview', style: 'sectionHeader' },
//       { text: `Age Distribution: ${JSON.stringify(company.ageDistribution)}`, style: 'content' },
//       { text: `BMI Data: ${JSON.stringify(company.bmiData)}`, style: 'content' },
//       { text: `Prevalent Health Conditions: ${JSON.stringify(company.conditionPrevalence)}`, style: 'content' },
//       { text: `Risk Levels: ${JSON.stringify(company.riskLevels)}`, style: 'content' },

//       { text: 'Women\'s Health', style: 'sectionHeader' },
//       { text: `Women's Health Data: ${JSON.stringify(company.WomanHealthChart)}`, style: 'content' },

//       { text: 'Satisfaction and Services', style: 'sectionHeader' },
//       { text: `Satisfaction Levels: ${JSON.stringify(company.satisfactionLevels)}`, style: 'content' },
//       { text: `Service Benefits: ${JSON.stringify(company.ServiceBenifit)}`, style: 'content' },

//       { text: 'Financial Insights', style: 'sectionHeader' },
//       { text: `Expenses Chart: ${JSON.stringify(company.ExpensesChart)}`, style: 'content' },

//       { text: 'Theoretical Analysis', style: 'sectionHeader' },
//       { text: 'Based on the collected data, the company can evaluate the following...', style: 'content' }
//     ],
//     styles: {
//       header: {
//         fontSize: 18,
//         bold: true,
//         alignment: 'center',
//         margin: [0, 0, 0, 10]
//       },
//       subheader: {
//         fontSize: 14,
//         italics: true,
//         margin: [0, 10, 0, 5]
//       },
//       sectionHeader: {
//         fontSize: 16,
//         bold: true,
//         margin: [0, 15, 0, 5]
//       },
//       content: {
//         fontSize: 12,
//         margin: [0, 5, 0, 5]
//       }
//     }
//   };

//   const pdfDoc = pdfmake.createPdf(docDefinition);

//   const pdfPath = path.join(__dirname, 'report.pdf');
  
//   // Save the PDF to a file
//   return new Promise((resolve, reject) => {
//     pdfDoc.getBuffer((buffer) => {
//       fs.writeFile(pdfPath, buffer, (err) => {
//         if (err) return reject(err);
//         resolve(pdfPath);
//       });
//     });
//   });
// };

module.exports = {
  getReportData,
  // generatePdfReport,
};
