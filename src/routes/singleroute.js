// In routes/singleroute.js
const express = require('express');
const router = express.Router();
const singleuser = require('../controllers/singleuser');
const { generateHealthReportPDF } = require('../controllers/singleuser');

router.get('/:company_slug/employees/:user_id/userHealthReport', singleuser.getUserHealthReport);

router.get('/:company_slug/employees/:user_id/export-report', async (req, res) => {
  const { company_slug, user_id } = req.params;
  const { assessment_id } = req.query;

  if (!assessment_id || isNaN(assessment_id)) {
    return res.status(400).json({ success: false, message: "Invalid assessment_id" });
  }

  await generateHealthReportPDF(company_slug, assessment_id, res);
});

module.exports = router;





// const express = require('express');
// const router = express.Router();
// const singleuser = require('../controllers/singleuser');

// router.get('/:company_slug/employees/:user_id/profile', singleuser.getUserProfile);
// router.get('/:company_slug/employees/:user_id/riskSection', singleuser.getRiskSection);
// router.get('/:company_slug/employees/:user_id/bmiRange', singleuser.getBMIRange);
// router.get('/:company_slug/employees/:user_id/bpInterpretation', singleuser.getBPInterpretation);
// router.get('/:company_slug/employees/:user_id/diabetes', singleuser.getDiabetesInfo);
// router.get('/:company_slug/employees/:user_id/cholesterol', singleuser.getCholesterolInfo);
// router.get('/:company_slug/employees/:user_id/scoring', singleuser.getScoringInterpretation);
// router.get('/:company_slug/employees/:user_id/details', singleuser.getCompanyDetails);
// router.get('/:company_slug/employees/:user_id/employeeAssessments', singleuser.getEmployeeAssessments);
// router.get('/:company_slug/employees/:user_id/userHealthReport', singleuser.getUserProfile);

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const singleuser = require('../controllers/singleuser');

// router.get('/profile', singleuser.getUserProfile);
// router.get('/riskSection', singleuser.getRiskSection);
// router.get('/bmiRange', singleuser.getBMIRange);
// router.get('/bpInterpretation', singleuser.getBPInterpretation);
// router.get('/diabetes', singleuser.getDiabetesInfo);
// router.get('/cholesterol', singleuser.getCholesterolInfo);
// router.get('/scoring', singleuser.getScoringInterpretation);

// router.get('/companyDetails', singleuser.getCompanyDetails);
// router.get('/employeeAssessments', singleuser.getEmployeeAssessments);

// router.get('/userHealthReport', singleuser.getUserHealthReport);

// module.exports = router;
