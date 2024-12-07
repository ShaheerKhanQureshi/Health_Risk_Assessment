const express = require("express");
const router = express.Router();
const { getReportData } = require("../controllers/CompanyCalculationsController");
const { generatePdfReport } = require('../controllers/CompanyCalculationsController');

// Route to get the report data (JSON response)
router.get("/company-calculation/companies/:slug/report-calculation", async (req, res) => {
  try {
    const reportData = await getReportData(req.params.slug);
    res.status(200).json(reportData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// Route to generate and download the corporate health report as a PDF
router.get('/company-calculation/companies/generate-report/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const reportData = await getReportData(slug);
    const pdfPath = await generatePdfReport(reportData);
    res.sendFile(pdfPath); // Send the generated PDF file
  } catch (error) {
    res.status(500).send('Error generating report');
  }
});
module.exports = router;
