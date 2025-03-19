const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const router = express.Router();
const companyController = require('../controllers/companyController');
// const CompanyCalculationsController = require('../controllers/CompanyCalculationsController');


const {
  getCompanyById,
  getAllCompanies,
  getCompanyAndEmployees,
  getEmployeeDetails,
  getCompanyAndEmployeeGenderCount
} = companyController;

// Additional routes
router.get("/companies/:slug", authenticate("admin", "sub-admin"), getCompanyAndEmployees);
router.get("/employee/:id", authenticate("admin", "sub-admin"), getEmployeeDetails);
// router.use('/', CompanyCalculationsController);
router.get("/companies", authenticate("admin", "sub-admin"), getAllCompanies);
router.get("/companies/:slug/gender-count", authenticate("admin", "sub-admin"), getCompanyAndEmployeeGenderCount);

function generateSlug(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
  
  
  const uniqueId = Math.floor(100000 + Math.random() * 900000);  // Generates a 6-digit number
  return `${slug}-${uniqueId}`;
}
router.post(
  '/companies',
  authenticate('admin', 'sub-admin'),
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('companyType').isString().notEmpty().withMessage('Company Type is required'),
    body('phoneNumber').isString().optional(),
    body('email').isEmail().withMessage('Valid email is required'),
    body('city').isString().optional(),
  ],
  createCompany
);

async function createCompany(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, companyType, phoneNumber, email, city } = req.body;
  const slug = generateSlug(name);  // This will generate a slug based on the company name

  try {
    // Check for slug uniqueness in the database
    const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
    if (results.length > 0) {
      return res.status(400).json({ message: "Slug already exists. Please choose a different name." });
    }

    // Insert new company into the database without providing the id (let the database handle it)
    const [result] = await db.query(
      "INSERT INTO companies (name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?)",
      [name, companyType, phoneNumber, email, city, slug]
    );

    // Get the inserted company ID from the result
    const companyId = result.insertId;

    // Construct the full URL for the form
    const fullUrl = `http://quiz.thementorhealth.com/form/${slug}`;

    // Send success response
    res.status(201).json({
      message: "Company added successfully",
      data: {
        id: companyId,  // Return the auto-generated company ID
        name,
        companyType,
        phoneNumber,
        email,
        city,
        fullUrl,  // Full URL with the slug and unique ID
        slug: `/form/${slug}`,  // Relative URL with unique ID
      },
    });
  } catch (error) {
    logger.error("Error creating company:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
// authenticate("admin", "sub-admin"),
// Get a company by ID
router.get("/:id", getCompanyById);
// Update a company's details
// router.put("/updateCompany/:id", authenticate("admin", "sub-admin"), async (req, res) => {
//   const { id } = req.params;
//   const { name, companyType, phoneNumber, email, city } = req.body;
//   const slug = generateSlug(name);

//   try {
//     const [results] = await db.query(
//       "UPDATE companies SET name = ?, companyType = ?, phoneNumber = ?, email = ?, city = ?, url = ? WHERE id = ?",
//       [name, companyType, phoneNumber, email, city, slug, id]
//     );

//     if (results.affectedRows === 0) {
//       return res.status(404).json({ message: "Company not found" });
//     }
//     res.json({
//       message: "Company updated successfully",
//       slug: `/form/${slug}`,
//     });
//   } catch (err) {
//     logger.error("Error updating company:", err);
//     res.status(500).json({ error: err.message });
//   }
// });
router.put("/updateCompany/:slug", authenticate("admin", "sub-admin"), async (req, res) => {
  const { slug } = req.params; // Use slug to find the company
  const { name, companyType, phoneNumber, email, city } = req.body;
  const newSlug = generateSlug(name); // Generate a new slug based on the updated name

  try {
    // Update the company using the slug (which is stored in the `url` column)
    const [results] = await db.query(
      "UPDATE companies SET name = ?, companyType = ?, phoneNumber = ?, email = ?, city = ?, url = ? WHERE url = ?",
      [name, companyType, phoneNumber, email, city, newSlug, slug]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      message: "Company updated successfully",
      slug: `/form/${newSlug}`,
    });
  } catch (err) {
    logger.error("Error updating company:", err);
    res.status(500).json({ error: err.message });
  }
});


// Delete a company
router.delete("/deleteCompany/:id", authenticate("admin", "sub-admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const [results] = await db.query("DELETE FROM companies WHERE id = ?", [id]);
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({ message: "Company deleted successfully" });
  } catch (err) {
    logger.error("Error deleting company:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/companies/detail/:slug", authenticate("admin", "sub-admin"), async (req, res) => {
  const { slug } = req.params;

  try {
    const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      message: "Company fetched successfully",
      data: results[0],
    });
  } catch (err) {
    logger.error("Error fetching company:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;