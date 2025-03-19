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


