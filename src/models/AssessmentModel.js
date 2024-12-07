const db = require('../config/db');

const getEmployeeAssessmentData = async (id, slug) => {
  const [results] = await db.query(
    "SELECT employee_info, health_assessment FROM assessment_response WHERE id = ? AND company_slug = ?",
    [id, slug]
  );

  if (results.length === 0) {
    return null;
  }

  const employeeData = results[0];
  const employeeInfo = JSON.parse(employeeData.employee_info);
  const healthAssessment = JSON.parse(employeeData.health_assessment);

  return { employeeInfo, healthAssessment };
};

module.exports = {
  getEmployeeAssessmentData,
};
