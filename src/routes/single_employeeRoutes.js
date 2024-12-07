const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/single_employeeController');

// Define routes and assign controller functions
router.get('/profile', dashboardController.getUserProfile);
router.get('/riskSection', dashboardController.getRiskSection);
router.get('/bmiRange', dashboardController.getBMIRange);
router.get('/bpInterpretation', dashboardController.getBPInterpretation);
router.get('/diabetes', dashboardController.getDiabetesInfo);
router.get('/cholesterol', dashboardController.getCholesterolInfo);
router.get('/scoring', dashboardController.getScoringInterpretation);

module.exports = router;
