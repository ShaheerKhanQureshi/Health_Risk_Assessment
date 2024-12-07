const express = require("express");
const db = require("../config/db");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const roleAuth = require("../middlewares/roleAuth");

router.get("/companies/:slug", roleAuth(["admin", "sub-admin"]), (req, res) => {
  console.log("Middleware passed, entering route handler");
  const slug = req.params.slug;
  console.log("Received slug:", slug);
  try {
    db.query(
      `SELECT * FROM assessment_response WHERE company_slug = '${slug}'`,
      [],
      (err, results) => {
        console.log("Inside db.query callback");
        if (err) {
          console.error("Database error:", err); // This should log the specific error message
          return res.status(500).json({ error: err.message });
        }
        console.log("Query results:", results); // Log the results to confirm if any records are returned
        return res.json(results);
      }
    );
  } catch (err) {
    return res.status(500).json({message: "err"})
  }
});

//new code 
router.get("/company/:slug/employee/:id", async (req, res) => {
  const { slug, id } = req.params;

  try {
    const [employeeResults] = await db.query(
      "SELECT employee_info, health_assessment FROM assessment_response WHERE id = ? AND company_slug = ?",
      [id, slug]
    );

    if (employeeResults.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employee = employeeResults[0];
    const employeeInfo = JSON.parse(employee.employee_info);
    const healthAssessment = JSON.parse(employee.health_assessment) || {};

    const weight = parseFloat(employeeInfo.weight);
    const heightFeet = parseFloat(employeeInfo.heightFeet);
    const heightInches = parseFloat(employeeInfo.heightInches);
    const bmi = weight && heightFeet && heightInches
      ? calculateBMI(weight, heightFeet, heightInches)
      : "N/A";

    res.json({
      employee: {
        ...employeeInfo,
        healthAssessment,
        bmi,
        marks: healthAssessment.marks || 0,
      },
    });
  } catch (error) {
    logger.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function calculateBMI(weight, heightFeet, heightInches) {
  const heightInMeters = heightFeet * 0.3048 + heightInches * 0.0254;
  return (weight / (heightInMeters * heightInMeters)).toFixed(2);
}

router.post(
  "/company/:slug/employees",
  [
    body("employee_info")
      .isJSON()
      .withMessage("Employee info must be in JSON format"),
    body("health_assessment")
      .isJSON()
      .withMessage("Health assessment must be in JSON format"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { slug } = req.params;
    const { employee_info, health_assessment } = req.body;

    db.query(
      "INSERT INTO employees (company_slug, employee_info, health_assessment, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [slug, employee_info, health_assessment],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Employee added successfully" });
      }
    );
  }
);

router.put("/company/:slug/employee/:id", (req, res) => {
  const { slug, id } = req.params;
  const { employee_info, health_assessment } = req.body;

  db.query(
    "UPDATE employees SET employee_info = ?, health_assessment = ?, updated_at = NOW() WHERE id = ? AND company_slug = ?",
    [employee_info, health_assessment, id, slug],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.affectedRows === 0)
        return res.status(404).json({ message: "Employee not found" });
      res.json({ message: "Employee updated successfully" });
    }
  );
});

router.delete("/company/:slug/employee/:id", (req, res) => {
  const { slug, id } = req.params;

  db.query(
    "DELETE FROM employees WHERE id = ? AND company_slug = ?",
    [id, slug],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.affectedRows === 0)
        return res.status(404).json({ message: "Employee not found" });
      res.json({ message: "Employee deleted successfully" });
    }
  );
});

module.exports = router;
