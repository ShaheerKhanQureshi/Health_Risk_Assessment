// module.exports = router;
const express = require("express");
const router = express.Router();
const { getReportData, generatePdfReport } = require("../controllers/CompanyCalculationsController");

// Route to get the report data (JSON response)
router.get("/company-calculation/companies/:slug/report-calculation", async (req, res) => {
  try {
    const reportData = await getReportData(req.params.slug);
    res.status(200).json(reportData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route to generate and download PDF report
router.get("/company-calculation/companies/:slug/report-calculation/pdf", async (req, res) => {
  try {
    const reportData = await getReportData(req.params.slug);
    const filePath = await generatePdfReport(req.params.slug, reportData);
    res.download(filePath);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;