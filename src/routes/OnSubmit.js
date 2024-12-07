const express = require('express');
const router = express.Router();
const employeeReportController = require('../controllers/onSubmitController');

router.get('/employee-report/:company_slug', employeeReportController.getEmployeeHealthInfo);

module.exports = router;
