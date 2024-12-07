const reportController = require('../controllers/reportController');

// Route to get dashboard data for a specific company
router.get('/dashboard/:company_slug',reportController.getDashboardData);