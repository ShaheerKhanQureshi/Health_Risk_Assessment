// // helpers.js

// // Function to safely parse JSON strings (handles any invalid JSON gracefully)
// function parseJsonData(data) {
//     try {
//         return JSON.parse(data);
//     } catch (error) {
//         return {}; // Return an empty object if parsing fails
//     }
// }

// // Function to calculate BMI and categorize it
// function calculateBMI(weight, height) {
//     const bmi = (weight / ((height / 100) ** 2)).toFixed(2);
//     let category;
    
//     if (bmi < 18.5) category = 'Below Normal Weight';
//     else if (bmi < 25) category = 'Normal Weight';
//     else if (bmi < 30) category = 'Overweight';
//     else if (bmi < 35) category = 'Class I Obesity';
//     else if (bmi < 40) category = 'Class II Obesity';
//     else category = 'Class III Obesity';
    
//     return { bmi, category };
// }

// // Function to calculate the prevalence of specific health conditions in the data
// function calculateHealthConditionsPrevalence(employeeData, healthKeywords) {
//     const conditionCounts = {};
    
//     for (const condition in healthKeywords) {
//         conditionCounts[condition] = 0;
//     }

//     employeeData.forEach(emp => {
//         const response = parseJsonData(emp.response);
//         for (const [condition, keywords] of Object.entries(healthKeywords)) {
//             if (keywords.some(keyword => response.includes(keyword))) {
//                 conditionCounts[condition]++;
//             }
//         }
//     });
    
//     const totalEmployees = employeeData.length;
//     const prevalencePercentages = {};

//     for (const [condition, count] of Object.entries(conditionCounts)) {
//         prevalencePercentages[condition] = ((count / totalEmployees) * 100).toFixed(2) + "%";
//     }

//     return prevalencePercentages;
// }

// // Function to calculate the age distribution across employees
// function calculateAgeDistribution(employeeData) {
//     const ageDistribution = {
//         "<18": 0,
//         "18-30": 0,
//         "30-50": 0,
//         "50+": 0
//     };

//     employeeData.forEach(emp => {
//         const age = emp.age;
//         if (age < 18) ageDistribution["<18"]++;
//         else if (age <= 30) ageDistribution["18-30"]++;
//         else if (age <= 50) ageDistribution["30-50"]++;
//         else ageDistribution["50+"]++;
//     });

//     return ageDistribution;
// }

// // Function to calculate health risk levels based on responses
// function calculateRisk(response) {
//     let riskLevel = 'lowRisk';

//     // Logic for calculating risk level based on specific responses in the health assessment
//     if (response.bmi >= 30 || response.bp === 'High' || response.diabetes === 'Yes') {
//         riskLevel = 'highRisk';
//     }

//     return { riskLevel };
// }

// // Function to calculate average score in specific sections
// function calculateSectionScores(employeeData, sections) {
//     const sectionScores = {};
//     sections.forEach(section => {
//         let totalScore = 0;
//         let totalCount = 0;

//         employeeData.forEach(emp => {
//             const response = parseJsonData(emp.response);
//             if (response[section] !== undefined) {
//                 totalScore += response[section];
//                 totalCount++;
//             }
//         });

//         sectionScores[section] = totalCount > 0 ? (totalScore / totalCount).toFixed(2) : 0;
//     });

//     return sectionScores;
// }

// // Function to calculate the benefit coverage satisfaction percentage
// function calculateBenefitCoverageSatisfaction(employeeData) {
//     const benefitCoverage = { satisfied: 0, unsatisfied: 0 };

//     employeeData.forEach(emp => {
//         const response = parseJsonData(emp.response);
//         if (response.benefitCoverage === 'Satisfied') {
//             benefitCoverage.satisfied++;
//         } else if (response.benefitCoverage === 'Unsatisfied') {
//             benefitCoverage.unsatisfied++;
//         }
//     });

//     const totalEmployees = employeeData.length;
//     return {
//         satisfied: ((benefitCoverage.satisfied / totalEmployees) * 100).toFixed(2) + "%",
//         unsatisfied: ((benefitCoverage.unsatisfied / totalEmployees) * 100).toFixed(2) + "%"
//     };
// }

// module.exports = {
//     parseJsonData,
//     calculateBMI,
//     calculateHealthConditionsPrevalence,
//     calculateAgeDistribution,
//     calculateRisk,
//     calculateSectionScores,
//     calculateBenefitCoverageSatisfaction
// };

// Function to safely parse JSON strings (handles any invalid JSON gracefully)
function parseJsonData(data) {
    try {
        return JSON.parse(data);
    } catch (error) {
        return {}; // Return an empty object if parsing fails
    }
}

// Function to calculate BMI and categorize it
function calculateBMI(weight, height) {
    const bmi = (weight / ((height / 100) ** 2)).toFixed(2);
    let category;
    
    if (bmi < 18.5) category = 'Below Normal Weight';
    else if (bmi < 25) category = 'Normal Weight';
    else if (bmi < 30) category = 'Overweight';
    else if (bmi < 35) category = 'Class I Obesity';
    else if (bmi < 40) category = 'Class II Obesity';
    else category = 'Class III Obesity';
    
    return { bmi, category };
}

// Function to calculate the prevalence of specific health conditions in the data
function calculateHealthConditionsPrevalence(employeeData, healthKeywords) {
    const conditionCounts = {};
    
    for (const condition in healthKeywords) {
        conditionCounts[condition] = 0;
    }

    employeeData.forEach(emp => {
        const response = parseJsonData(emp.response);
        for (const [condition, keywords] of Object.entries(healthKeywords)) {
            if (keywords.some(keyword => response.includes(keyword))) {
                conditionCounts[condition]++;
            }
        }
    });
    
    const totalEmployees = employeeData.length;
    const prevalencePercentages = {};

    for (const [condition, count] of Object.entries(conditionCounts)) {
        prevalencePercentages[condition] = ((count / totalEmployees) * 100).toFixed(2) + "%";
    }

    return prevalencePercentages;
}

// Function to calculate the age distribution across employees
function calculateAgeDistribution(employeeData) {
    const ageDistribution = {
        "<18": 0,
        "18-30": 0,
        "30-50": 0,
        "50+": 0
    };

    employeeData.forEach(emp => {
        const age = calculateAge(JSON.parse(emp.employee_info).dob);
        if (age < 18) ageDistribution["<18"]++;
        else if (age <= 30) ageDistribution["18-30"]++;
        else if (age <= 50) ageDistribution["30-50"]++;
        else ageDistribution["50+"]++;
    });

    return ageDistribution;
}

function calculateAge(dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
  
    // Adjust age if the birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
  
    return age;
  }

// Function to calculate health risk levels based on responses
function calculateRisk(response) {
    let riskLevel = 'lowRisk';

    // Logic for calculating risk level based on specific responses in the health assessment
    if (response.bmi >= 30 || response.bp === 'High' || response.diabetes === 'Yes') {
        riskLevel = 'highRisk';
    }

    return { riskLevel };
}

// Function to calculate average score in specific sections (e.g., satisfaction, exercise, etc.)
function calculateSectionScores(employeeData, sections) {
    const sectionScores = {};
    sections.forEach(section => {
        let totalScore = 0;
        let totalCount = 0;

        employeeData.forEach(emp => {
            const response = parseJsonData(emp.response);
            if (response[section] !== undefined) {
                totalScore += response[section];
                totalCount++;
            }
        });

        sectionScores[section] = totalCount > 0 ? (totalScore / totalCount).toFixed(2) : 0;
    });

    return sectionScores;
}

// Function to calculate the benefit coverage satisfaction percentage
function calculateBenefitCoverageSatisfaction(employeeData) {
    const benefitCoverage = { satisfied: 0, unsatisfied: 0 };

    employeeData.forEach(emp => {
        const response = parseJsonData(emp.response);
        if (response.benefitCoverage === 'Satisfied') {
            benefitCoverage.satisfied++;
        } else if (response.benefitCoverage === 'Unsatisfied') {
            benefitCoverage.unsatisfied++;
        }
    });

    const totalEmployees = employeeData.length;
    return {
        satisfied: ((benefitCoverage.satisfied / totalEmployees) * 100).toFixed(2) + "%",
        unsatisfied: ((benefitCoverage.unsatisfied / totalEmployees) * 100).toFixed(2) + "%"
    };
}

// Function to calculate gynecological and pregnancy-related health data for female employees
function calculateFemaleHealthMetrics(employeeData) {
    const femaleHealthMetrics = {
        gynecologicalConditions: 0,
        pregnancyPlans: 0
    };

    const femaleEmployees = employeeData.filter(emp => emp.gender === 'female');

    femaleEmployees.forEach(emp => {
        const response = parseJsonData(emp.response);

        if (response.gynecologicalCondition === 'Yes') {
            femaleHealthMetrics.gynecologicalConditions++;
        }

        if (response.pregnancyPlans === 'Yes') {
            femaleHealthMetrics.pregnancyPlans++;
        }
    });

    const totalFemaleEmployees = femaleEmployees.length;
    return {
        gynecologicalConditionsPercentage: (femaleHealthMetrics.gynecologicalConditions / totalFemaleEmployees * 100).toFixed(2) + "%",
        pregnancyPlansPercentage: (femaleHealthMetrics.pregnancyPlans / totalFemaleEmployees * 100).toFixed(2) + "%"
    };
}

// Function to calculate the distribution of healthcare expenses across different services
function calculateExpenseDistribution(expenses) {
    const totalExpense = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    const expenseDistribution = expenses.map(expense => ({
        service: expense.service,
        percentage: ((expense.amount / totalExpense) * 100).toFixed(2) + "%"
    }));

    return expenseDistribution;
}

// Function to calculate service benefits utilization percentages
function calculateServiceUtilization(employeeData, serviceKeys) {
    const serviceUtilization = {};

    serviceKeys.forEach(service => {
        serviceUtilization[service] = 0;
    });

    employeeData.forEach(emp => {
        const response = parseJsonData(emp.response);
        serviceKeys.forEach(service => {
            if (response[service] === 'Used') {
                serviceUtilization[service]++;
            }
        });
    });

    const totalEmployees = employeeData.length;
    for (const [service, count] of Object.entries(serviceUtilization)) {
        serviceUtilization[service] = ((count / totalEmployees) * 100).toFixed(2) + "%";
    }

    return serviceUtilization;
}

// Function to calculate the overall health score for employees
function calculateHealthScore(employeeData) {
    const healthScores = [];

    employeeData.forEach(emp => {
        const response = parseJsonData(emp.response);
        let score = 0;

        // Calculate health score based on different criteria (e.g., BMI, blood pressure, diabetes, cholesterol)
        if (response.bmi >= 30) score += 3; // Obesity
        if (response.bp === 'High') score += 2; // High blood pressure
        if (response.diabetes === 'Yes') score += 2; // Diabetes

        healthScores.push(score);
    });

    const averageHealthScore = healthScores.reduce((acc, score) => acc + score, 0) / healthScores.length;
    let healthCategory = 'Low Risk';

    if (averageHealthScore >= 5) healthCategory = 'High Risk';
    else if (averageHealthScore >= 3) healthCategory = 'Medium Risk';

    return { averageHealthScore, healthCategory };
}

module.exports = {
    parseJsonData,
    calculateBMI,
    calculateHealthConditionsPrevalence,
    calculateAgeDistribution,
    calculateRisk,
    calculateSectionScores,
    calculateBenefitCoverageSatisfaction,
    calculateFemaleHealthMetrics,
    calculateExpenseDistribution,
    calculateServiceUtilization,
    calculateHealthScore
};
