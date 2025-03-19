// const db = require("../config/db");


// const parseEmployeeInfo = (employeeInfo) => {
//   try {
//     return JSON.parse(employeeInfo);
//   } catch (e) {
//     console.error(`Error parsing employee data: ${e.message}`);
//     return null;
//   }
// };

// const getEmployeeNeeds = async (slug) => {
//   try {
//     // Fetch company data
//     const [companyResult] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
//     if (companyResult.length === 0) throw new Error("Company not found");
//     const company = companyResult[0];

//     // Fetch employee responses
//     const [employeeResult] = await db.query("SELECT * FROM assessment_response WHERE company_slug = ?", [slug]);
//     if (employeeResult.length === 0) throw new Error("No employees found for the company");

//     const employeesWithPharmacyNeed = [];
//     const employeesWithInsuranceNeed = [];
//     let maleCount = 0;
//     let femaleCount = 0;

//     // Process each employee's response
//     employeeResult.forEach((emp) => {
//       // Parse employee info
//       const employeeInfo = parseEmployeeInfo(emp.employee_info);
//       if (!employeeInfo) return;

//       // Parse health assessment
//       let healthAssessment;
//       try {
//         healthAssessment = JSON.parse(emp.health_assessment);
//       } catch (e) {
//         console.error(`Error parsing health assessment for employee ${emp.id}: ${e.message}`);
//         return;
//       }

//       // Count genders
//       if (employeeInfo.gender === "Male") maleCount++;
//       if (employeeInfo.gender === "Female") femaleCount++;

//       // Process Health Benefits and Expenditure (HBE) data
//       healthAssessment.forEach((section) => {
//         if (section.subHeading === "Health Benefits and Expenditure") {
//           section.questions.forEach((question) => {
//             if (question.questionId === "HBE7") {  // Pharmacy need
//               if (Array.isArray(question.response) && question.response.includes("Yes")) {
//                 employeesWithPharmacyNeed.push({
//                   fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
//                   email: employeeInfo.email,
//                   dob: employeeInfo.dob,
//                   company: company.name,
//                   answer: question.response.join(", ")
//                 });
//               } else if (question.response === "Yes") {
//                 employeesWithPharmacyNeed.push({
//                   fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
//                   email: employeeInfo.email,
//                   dob: employeeInfo.dob,
//                   company: company.name,
//                   answer: question.response
//                 });
//               }
//             }
//             if (question.questionId === "HBE8") {  // Insurance need
//               if (Array.isArray(question.response) && question.response.includes("Yes")) {
//                 employeesWithInsuranceNeed.push({
//                   fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
//                   email: employeeInfo.email,
//                   dob: employeeInfo.dob,
//                   company: company.name,
//                   answer: question.response.join(", ")
//                 });

//                 // Check if HBE9 exists and capture the family members
//                 const familyQuestion = section.questions.find(q => q.questionId === "HBE9");
//                 if (familyQuestion && Array.isArray(familyQuestion.response)) {
//                   const familyMembers = familyQuestion.response.join(", ");
//                   employeesWithInsuranceNeed[employeesWithInsuranceNeed.length - 1].familyMembers = familyMembers;
//                 }
//               } else if (question.response === "Yes") {
//                 employeesWithInsuranceNeed.push({
//                   fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
//                   email: employeeInfo.email,
//                   dob: employeeInfo.dob,
//                   company: company.name,
//                   answer: question.response
//                 });

//                 // Check if HBE9 exists and capture the family members
//                 const familyQuestion = section.questions.find(q => q.questionId === "HBE9");
//                 if (familyQuestion && Array.isArray(familyQuestion.response)) {
//                   const familyMembers = familyQuestion.response.join(", ");
//                   employeesWithInsuranceNeed[employeesWithInsuranceNeed.length - 1].familyMembers = familyMembers;
//                 }
//               }
//             }
//           });
//         }
//       });
//     });

//     // Return the aggregated data
//     return {
//       company: company.name,
//       totalEmployees: employeeResult.length,
//       maleCount,
//       femaleCount,
//       employeesWithPharmacyNeed,
//       employeesWithInsuranceNeed
//     };
//   } catch (error) {
//     console.error("Error fetching employee needs:", error);
//     throw new Error("Error fetching employee needs");
//   }
// };

// module.exports = { getEmployeeNeeds };
const db = require("../config/db");

const parseEmployeeInfo = (employeeInfo) => {
  try {
    return JSON.parse(employeeInfo);
  } catch (e) {
    console.error(`Error parsing employee data: ${e.message}`);
    return null;
  }
};

const getEmployeeNeeds = async (slug) => {
  try {
    // Fetch company data
    const [companyResult] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
    if (companyResult.length === 0) throw new Error("Company not found");
    const company = companyResult[0];

    // Fetch employee responses
    const [employeeResult] = await db.query("SELECT * FROM assessment_response WHERE company_slug = ?", [slug]);
    if (employeeResult.length === 0) throw new Error("No employees found for the company");

    const employeesWithPharmacyNeed = [];
    const employeesWithInsuranceNeed = [];
    let maleCount = 0;
    let femaleCount = 0;

    // Process each employee's response
    employeeResult.forEach((emp) => {
      // Parse employee info
      const employeeInfo = parseEmployeeInfo(emp.employee_info);
      if (!employeeInfo) return;

      // Parse health assessment
      let healthAssessment;
      try {
        healthAssessment = JSON.parse(emp.health_assessment);
      } catch (e) {
        console.error(`Error parsing health assessment for employee ${emp.id}: ${e.message}`);
        return;
      }

      // Count genders
      if (employeeInfo.gender === "Male") maleCount++;
      if (employeeInfo.gender === "Female") femaleCount++;

      // Process Health Benefits and Expenditure (HBE) data
      healthAssessment.forEach((section) => {
        if (section.subHeading === "Health Benefits and Expenditure") {
          section.questions.forEach((question) => {
            if (question.questionId === "HBE7") {  // Pharmacy need
              if (Array.isArray(question.response) && question.response.includes("Yes")) {
                employeesWithPharmacyNeed.push({
                  fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
                  email: employeeInfo.email,
                  dob: employeeInfo.dob,
                  company: company.name,
                  answer: question.response.join(", "),
                  createdAt: emp.created_at // Include the created_at timestamp
                });
              } else if (question.response === "Yes") {
                employeesWithPharmacyNeed.push({
                  fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
                  email: employeeInfo.email,
                  dob: employeeInfo.dob,
                  company: company.name,
                  answer: question.response,
                  createdAt: emp.created_at // Include the created_at timestamp
                });
              }
            }
            if (question.questionId === "HBE8") {  // Insurance need
              if (Array.isArray(question.response) && question.response.includes("Yes")) {
                employeesWithInsuranceNeed.push({
                  fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
                  email: employeeInfo.email,
                  dob: employeeInfo.dob,
                  company: company.name,
                  answer: question.response.join(", "),
                  createdAt: emp.created_at // Include the created_at timestamp
                });

                // Check if HBE9 exists and capture the family members
                const familyQuestion = section.questions.find(q => q.questionId === "HBE9");
                if (familyQuestion && Array.isArray(familyQuestion.response)) {
                  const familyMembers = familyQuestion.response.join(", ");
                  employeesWithInsuranceNeed[employeesWithInsuranceNeed.length - 1].familyMembers = familyMembers;
                }
              } else if (question.response === "Yes") {
                employeesWithInsuranceNeed.push({
                  fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
                  email: employeeInfo.email,
                  dob: employeeInfo.dob,
                  company: company.name,
                  answer: question.response,
                  createdAt: emp.created_at // Include the created_at timestamp
                });

                // Check if HBE9 exists and capture the family members
                const familyQuestion = section.questions.find(q => q.questionId === "HBE9");
                if (familyQuestion && Array.isArray(familyQuestion.response)) {
                  const familyMembers = familyQuestion.response.join(", ");
                  employeesWithInsuranceNeed[employeesWithInsuranceNeed.length - 1].familyMembers = familyMembers;
                }
              }
            }
          });
        }
      });
    });

    // Return the aggregated data
    return {
      company: company.name,
      totalEmployees: employeeResult.length,
      maleCount,
      femaleCount,
      employeesWithPharmacyNeed,
      employeesWithInsuranceNeed
    };
  } catch (error) {
    console.error("Error fetching employee needs:", error);
    throw new Error("Error fetching employee needs");
  }
};

module.exports = { getEmployeeNeeds };
