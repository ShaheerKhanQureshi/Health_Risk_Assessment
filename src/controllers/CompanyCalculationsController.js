const db = require("../config/db");
const logger = require("../utils/logger");
const pdfmake = require('pdfmake');
const path = require("path");



const calculateBMI = (employees) => {
  const bmiData = {
    "BelowNormalWeight": 0,
    "NormalWeight": 0,
    "Overweight": 0,
    "ClassIObesity": 0,
    "ClassIIObesity": 0,
    "ClassIIIObesity": 0, 
  };

  employees.forEach((emp) => {
    const { weight, height } = JSON.parse(emp.employee_info);
    if (weight && height) {
      const feet = Math.floor(height);
      const inches = (height - feet) * 10;
      const totalHeightCm = (feet * 30.48) + (inches * 2.54);
      const bmi = weight / Math.pow(totalHeightCm / 100, 2);
      let category = "BelowNormalWeight";
      if (bmi >= 18.5 && bmi <= 24.9) category = "NormalWeight";
      else if (bmi >= 25 && bmi <= 29.9) category = "Overweight";
      else if (bmi >= 30 && bmi <= 34.9) category = "ClassIObesity";
      else if (bmi >= 35 && bmi <= 39.9) category = "ClassIIObesity";
      else if (bmi >= 40) category = "ClassIIIObesity";
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

  // Initialize total employee count
  const totalEmployees = employees.length;

  if (totalEmployees === 0) {
    return {
      sectionScores,
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


  return {
    sectionAverages,       // Average scores per section

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


// const calculateFitnessHealthData = (employees) => {
//   const companyConditions = {};


//   const conditions = {
//     cholesterol: {
//       "Normal Cholesterol": { count: 0, interpretation: "Generally considered healthy with low cardiovascular risk." },
//       "Borderline High Cholesterol": { count: 0, interpretation: "Possible risk for heart disease; lifestyle changes recommended." },
//       "High Cholesterol": { count: 0, interpretation: "Increased risk of cardiovascular disease; consider medical intervention." },
//       "Unknown": { count: 0, interpretation: "Cholesterol level unknown." }
//     },
//     bloodPressure: {
//       "Normal Blood Pressure": { count: 0, interpretation: "Indicates good cardiovascular health." },
//       "Elevated Blood Pressure": { count: 0, interpretation: "Risk of hypertension; lifestyle changes recommended." },
//       "Hypertension Stage 1": { count: 0, interpretation: "Hypertension stage 1; requires lifestyle changes and possibly medication." },
//       "Hypertension Stage 2": { count: 0, interpretation: "Hypertension stage 2; urgent medical intervention may be required." },
//       "Low Blood Pressure": { count: 0, interpretation: "Low blood pressure; may need further evaluation if symptoms are present." },
//       "Unknown": { count: 0, interpretation: "Blood pressure unknown." }
//     },
//     glucose: {
//       "Normal Glucose": { count: 0, interpretation: "Indicates healthy glucose levels." },
//       "Prediabetes": { count: 0, interpretation: "Indicates prediabetes; lifestyle modifications are recommended." },
//       "Diabetes": { count: 0, interpretation: "Indicates diabetes; requires further testing and management." },
//       "Low Glucose": { count: 0, interpretation: "Glucose level too low; consult a healthcare provider." },
//       "Unknown": { count: 0, interpretation: "Glucose level unknown." }
//     }
//   };

//   employees.forEach((emp) => {
//     const companySlug = emp.company_slug;
//     if (!companySlug) return;

//     if (!companyConditions[companySlug]) {
//       companyConditions[companySlug] = { ...conditions };
//     }

//     let healthData = [];
//     try {
//       healthData = JSON.parse(emp.health_assessment);
//     } catch (e) {
//       console.error(`Error parsing health_assessment for employee ${emp.id}: ${e.message}`);
//       return;
//     }

//     healthData.forEach((section) => {
//       if (section.subHeading === "Personal Medical History") {
//         section.questions.forEach((question) => {
//           if (question.questionId === "PMH14") {
//             // Blood Pressure Processing
//             const bpValue = processBloodPressure(question.response);
//             if (bpValue) companyConditions[companySlug].bloodPressure[bpValue].count++;
//           }
//           if (question.questionId === "PMH15") {
//             // Glucose Processing
//             const glucoseValue = processGlucose(question.response);
//             if (glucoseValue) companyConditions[companySlug].glucose[glucoseValue].count++;
//           }
//           if (question.questionId === "PMH16") {
//             // Cholesterol Processing
//             const cholesterolValue = processCholesterol(question.response);
//             if (cholesterolValue) companyConditions[companySlug].cholesterol[cholesterolValue].count++;
//           }
//         });
//       }
//     });
//   });

//   const result = {};
//   Object.keys(companyConditions).forEach((companySlug) => {
//     const companyData = companyConditions[companySlug];
//     const totalEmployeesInCompany = employees.filter((emp) => emp.company_slug === companySlug).length;

//     const companyPrevalence = {
//       cholesterol: {},
//       bloodPressure: {},
//       glucose: {}
//     };

//     Object.keys(companyData.cholesterol).forEach((condition) => {
//       companyPrevalence.cholesterol[condition] = {
//         percentage: ((companyData.cholesterol[condition].count / totalEmployeesInCompany) * 100).toFixed(2),
//         interpretation: companyData.cholesterol[condition].interpretation
//       };
//     });

//     Object.keys(companyData.bloodPressure).forEach((condition) => {
//       companyPrevalence.bloodPressure[condition] = {
//         percentage: ((companyData.bloodPressure[condition].count / totalEmployeesInCompany) * 100).toFixed(2),
//         interpretation: companyData.bloodPressure[condition].interpretation
//       };
//     });

//     Object.keys(companyData.glucose).forEach((condition) => {
//       companyPrevalence.glucose[condition] = {
//         percentage: ((companyData.glucose[condition].count / totalEmployeesInCompany) * 100).toFixed(2),
//         interpretation: companyData.glucose[condition].interpretation
//       };
//     });

//     result[companySlug] = companyPrevalence;
//   });

//   return result;
// };

// // Function to process Blood Pressure
// const processBloodPressure = (bpResponse) => {
//   if (!bpResponse) return null;

//   const bp = bpResponse.trim().toLowerCase();

//   if (bp.includes("140 mmhg or higher / 90 mmhg or higher")) {
//     return "Hypertension Stage 2";
//   } else if (bp.includes("130-139 mmhg / 85-89 mmhg")) {
//     return "Hypertension Stage 1";
//   } else if (bp.includes("120-129 mmhg / 80-84 mmhg")) {
//     return "Elevated Blood Pressure";
//   } else if (bp.includes("80-119 mmhg / 60-79 mmhg")) {
//     return "Normal Blood Pressure";
//   } else if (bp.includes("less than 80 mmhg / less than 60 mmhg")) {
//     return "Low Blood Pressure";
//   }
//   return "Unknown";
// };


// const processGlucose = (glucoseResponse) => {
//   if (!glucoseResponse) return null;

//   const glucose = glucoseResponse.trim().toLowerCase();

//   if (glucose.includes("150 mg/dl or higher")) {
//     return "Diabetes";
//   } else if (glucose.includes("126-149 mg/dl")) {
//     return "Diabetes";
//   } else if (glucose.includes("100-125 mg/dl")) {
//     return "Prediabetes";
//   } else if (glucose.includes("70-99 mg/dl")) {
//     return "Normal Glucose";
//   } else if (glucose.includes("less than 70 mg/dl")) {
//     return "Low Glucose";
//   }
//   return "Unknown";
// };


// const processCholesterol = (cholesterolResponse) => {
//   if (!cholesterolResponse) return null;

//   const cholesterol = cholesterolResponse.trim().toLowerCase();

//   if (cholesterol.includes("greater than 3")) {
//     return "High Cholesterol";
//   } else if (cholesterol.includes("2.5-3")) {
//     return "Borderline High Cholesterol";
//   } else if (cholesterol.includes("2-2.5")) {
//     return "Normal Cholesterol";
//   } else if (cholesterol.includes("1.5-2")) {
//     return "Normal Cholesterol";
//   } else if (cholesterol.includes("less than 1.5")) {
//     return "Normal Cholesterol";
//   }
//   return "Unknown";
// };
const calculateFitnessHealthData = (employees) => {
  const companyConditions = {};

  const conditions = {
    cholesterol: {
      "Less than 1.5": { count: 0, interpretation: "Optimal ratio; indicates low risk for cardiovascular disease." },
      "1.5 - 2.0": { count: 0, interpretation: "Good ratio; generally considered healthy, with a low risk of CVD." },
      "2.5 - 3.0": { count: 0, interpretation: "Moderate risk; individuals should consider making lifestyle changes." },
      "Greater than 3.0": { count: 0, interpretation: "High risk; indicates a significant risk for cardiovascular disease; medical intervention may be necessary." },
      "Unknown": { count: 0, interpretation: "Cholesterol level unknown." }
    },
    bloodPressure: {
      "140 mmHg or higher / 90 mmHg or higher": { count: 0, interpretation: "Hypertension stage 2" },
      "130-139 mmHg / 85-89 mmHg": { count: 0, interpretation: "Hypertension stage 1" },
      "120-129 mmHg / 80-84 mmHg": { count: 0, interpretation: "Elevated blood pressure" },
      "80-119 mmHg / 60-79 mmHg": { count: 0, interpretation: "Normal blood pressure" },
      "Less than 80 mmHg / less than 60 mmHg": { count: 0, interpretation: "Low blood pressure" },
      "Unknown": { count: 0, interpretation: "Blood pressure unknown." }
    },
    glucose: {
      "150 mg/dL or higher": { count: 0, interpretation: "Indicates uncontrolled diabetes" },
      "126 - 149 mg/dL": { count: 0, interpretation: "Indicates diabetes" },
      "100 - 125 mg/dL": { count: 0, interpretation: "Indicates prediabetes" },
      "70 - 99 mg/dL": { count: 0, interpretation: "Indicates normal fasting glucose" },
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
    return "140 mmHg or higher / 90 mmHg or higher";
  } else if (bp.includes("130-139 mmhg / 85-89 mmhg")) {
    return "130-139 mmHg / 85-89 mmHg";
  } else if (bp.includes("120-129 mmhg / 80-84 mmhg")) {
    return "120-129 mmHg / 80-84 mmHg";
  } else if (bp.includes("80-119 mmhg / 60-79 mmhg")) {
    return "80-119 mmHg / 60-79 mmHg";
  } else if (bp.includes("less than 80 mmhg / less than 60 mmhg")) {
    return "Less than 80 mmHg / less than 60 mmHg";
  }
  return "Unknown";
};

const processGlucose = (glucoseResponse) => {
  if (!glucoseResponse) return null;

  const glucose = glucoseResponse.trim().toLowerCase();

  if (glucose.includes("150 mg/dl or higher")) {
    return "150 mg/dL or higher";
  } else if (glucose.includes("126-149 mg/dl")) {
    return "126 - 149 mg/dL";
  } else if (glucose.includes("100-125 mg/dl")) {
    return "100 - 125 mg/dL";
  } else if (glucose.includes("70-99 mg/dl")) {
    return "70 - 99 mg/dL";
  }
  return "Unknown";
};

const processCholesterol = (cholesterolResponse) => {
  if (!cholesterolResponse) return null;

  const cholesterol = cholesterolResponse.trim().toLowerCase();

  if (cholesterol.includes("greater than 3")) {
    return "Greater than 3.0";
  } else if (cholesterol.includes("2.5-3")) {
    return "2.5 - 3.0";
  } else if (cholesterol.includes("1.5-2")) {
    return "1.5 - 2.0";
  } else if (cholesterol.includes("less than 1.5")) {
    return "Less than 1.5";
  }
  return "Unknown";
};

const calculateEmployeeRiskScores = (employees) => {
  // Risk category ranges and corresponding messages
  const riskCategories = [
    { range: [0, 80], category: "Low Risk!" },
    { range: [81, 160], category: "Moderate Risk! " },
    { range: [161, 240], category: "High Risk! " },
    { range: [241, 320], category: "Very High Risk!" },
    { range: [321, 400], category: "Severe Risk!" }
  ];

  const riskCount = {
    "Low Risk! ": 0,
    "Moderate Risk! ": 0,
    "High Risk!": 0,
    "Very High Risk!": 0,
    "Severe Risk!.": 0
  };

  // Function to calculate total score for an employee
  const calculateTotalScore = (healthData) => {
    let totalScore = 0;
    healthData.forEach((section) => {
      if (section.sectionScore) {
        totalScore += section.sectionScore;
      }
    });
    return totalScore;
  };

  // Process each employee
  employees.forEach((emp) => {
    let healthData = [];
    try {
      healthData = JSON.parse(emp.health_assessment); // Assuming health_assessment is a JSON string
    } catch (e) {
      console.error(`Error parsing health_assessment for employee ${emp.id}: ${e.message}`);
      return;
    }

    const totalScore = calculateTotalScore(healthData);

    // Determine the risk category based on the total score
    riskCategories.forEach((category) => {
      const [min, max] = category.range;
      if (totalScore >= min && totalScore <= max) {
        riskCount[category.category]++;
      }
    });
  });

  // Calculate the percentage distribution for each risk category
  const totalEmployees = employees.length;
  const riskPercentage = {};

  Object.keys(riskCount).forEach((category) => {
    riskPercentage[category] = ((riskCount[category] / totalEmployees) * 100).toFixed(2);
  });

  return riskPercentage;
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
    const riskLevels = calculateEmployeeRiskScores(employeeResult);
    const HealthData = calculateFitnessHealthData(employeeResult);
    const WomanHealthChart = calculateWomanHealthChart(employeeResult);
    const satisfactionLevels = calculateSatisfactionLevels(employeeResult);
    const ServiceBenifit = calculateServicesBenefit(employeeResult);
    const ExpensesChart = calculateExpensesChart(employeeResult);
    const SectionWiseRiskDistribution = calculateRiskDistribution(employeeResult);

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

const generatePdfReport = async (reportData) => {
  const { company } = reportData;


  const docDefinition = {
    content: [
      { text: `Health Report for ${company.name}`, style: 'header' },
      { text: `Company Type: ${company.companyType}`, style: 'subheader' },
      { text: `Location: ${company.city}`, style: 'subheader' },
      { text: `Contact: ${company.phoneNumber} | ${company.email}`, style: 'subheader' },

      { text: 'Employee Overview', style: 'sectionHeader' },
      {
        table: {
          body: [
            ['Total Employees', company.totalEmployees],
            ['Male Employees', company.MaleEmployees],
            ['Female Employees', company.FemaleEmployees]
          ]
        }
      },

      { text: 'Health Data Overview', style: 'sectionHeader' },
      { text: `Age Distribution: ${JSON.stringify(company.ageDistribution)}`, style: 'content' },
      { text: `BMI Data: ${JSON.stringify(company.bmiData)}`, style: 'content' },
      { text: `Prevalent Health Conditions: ${JSON.stringify(company.conditionPrevalence)}`, style: 'content' },
      { text: `Risk Levels: ${JSON.stringify(company.riskLevels)}`, style: 'content' },

      { text: 'Women\'s Health', style: 'sectionHeader' },
      { text: `Women's Health Data: ${JSON.stringify(company.WomanHealthChart)}`, style: 'content' },

      { text: 'Satisfaction and Services', style: 'sectionHeader' },
      { text: `Satisfaction Levels: ${JSON.stringify(company.satisfactionLevels)}`, style: 'content' },
      { text: `Service Benefits: ${JSON.stringify(company.ServiceBenifit)}`, style: 'content' },

      { text: 'Financial Insights', style: 'sectionHeader' },
      { text: `Expenses Chart: ${JSON.stringify(company.ExpensesChart)}`, style: 'content' },

      { text: 'Theoretical Analysis', style: 'sectionHeader' },
      { text: 'Based on the collected data, the company can evaluate the following...', style: 'content' }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        italics: true,
        margin: [0, 10, 0, 5]
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        margin: [0, 15, 0, 5]
      },
      content: {
        fontSize: 12,
        margin: [0, 5, 0, 5]
      }
    }
  };

  const pdfDoc = pdfmake.createPdf(docDefinition);

  const pdfPath = path.join(__dirname, 'report.pdf');


  return new Promise((resolve, reject) => {
    pdfDoc.getBuffer((buffer) => {
      fs.writeFile(pdfPath, buffer, (err) => {
        if (err) return reject(err);
        resolve(pdfPath);
      });
    });
  });
};

module.exports = {
  getReportData,
  generatePdfReport,
};
