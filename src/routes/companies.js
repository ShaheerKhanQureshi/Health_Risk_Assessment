const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const router = express.Router();
const companyController = require('../controllers/companyController');
const CompanyCalculationsController = require('../controllers/CompanyCalculationsController');


const {
  getCompanyById,
  getAllCompanies,
  getCompanyAndEmployees,
  getEmployeeDetails
} = companyController;

// Additional routes
router.get("/companies/:slug", authenticate("admin", "sub-admin"), getCompanyAndEmployees);
router.get("/employee/:id", authenticate("admin", "sub-admin"), getEmployeeDetails);
// router.use('/', CompanyCalculationsController);
router.get("/companies", authenticate("admin", "sub-admin"), getAllCompanies);
// Utility function to generate slug
// function generateSlug(name) {
//   return name
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "-")
//     .replace(/^-|-$/g, "")
//     .substring(0, 200);
// }

// // Create a new company
// router.post(
//   '/companies',
//   authenticate('admin', 'sub-admin'),
//   [
//     body('name').isString().notEmpty().withMessage('Name is required'),
//     body('companyType').isString().notEmpty().withMessage('Company Type is required'),
//     body('phoneNumber').isString().optional(),
//     body('email').isEmail().withMessage('Valid email is required'),
//     body('city').isString().optional(),

//   ],
//   createCompany
// );
// async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   const { name, companyType, phoneNumber, email, city } = req.body;
//   const id = uuidv4();
//   const slug = generateSlug(name);

//   try {
//     // Check for slug uniqueness
//     const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
//     if (results.length > 0) {
//       return res.status(400).json({ message: "Slug already exists. Please choose a different name." });
//     }

//     // Insert new company into the database
//     await db.query(
//       "INSERT INTO companies (id, name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
//       [id, name, companyType, phoneNumber, email, city, slug]
//     );

//     // Construct the full URL for the form
//     // const fullUrl = `${req.protocol}://${req.get('host')}/form/${slug}`;
//      const fullUrl = `http://localhost:3000/form/${slug}`;

//     // Send success response
//     res.status(201).json({
//       message: "Company added successfully", 
//       data: { id, slug: fullUrl },
//     });
//   } catch (error) {
//     logger.error("Error creating company:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }
// Utility function to generate slug with additional unique six-digit number
function generateSlug(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
  
  // Generate a unique 6-digit number (random, or you could use UUID and format it)
  const uniqueId = Math.floor(100000 + Math.random() * 900000);  // Generates a 6-digit number
  return `${slug}-${uniqueId}`;
}

// Create a new company
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
  const id = uuidv4();  // Unique UUID for the company record
  const slug = generateSlug(name);  // This will generate a slug with a unique ID

  try {
    // Check for slug uniqueness in the database
    const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
    if (results.length > 0) {
      return res.status(400).json({ message: "Slug already exists. Please choose a different name." });
    }

    // Insert new company into the database
    await db.query(
      "INSERT INTO companies (id, name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, name, companyType, phoneNumber, email, city, slug]
    );

    // Construct the full URL for the form
    const fullUrl = `http://localhost:3000/form/${slug}`;

    // Send success response
    res.status(201).json({
      message: "Company added successfully",
      data: {
        id,
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
router.put("/:id", authenticate("admin", "sub-admin"), async (req, res) => {
  const { id } = req.params;
  const { name, companyType, phoneNumber, email, city } = req.body;
  const slug = generateSlug(name);

  try {
    const [results] = await db.query(
      "UPDATE companies SET name = ?, companyType = ?, phoneNumber = ?, email = ?, city = ?, url = ? WHERE id = ?",
      [name, companyType, phoneNumber, email, city, slug, id]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({
      message: "Company updated successfully",
      slug: `/form/${slug}`,
    });
  } catch (err) {
    logger.error("Error updating company:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a company
router.delete("/:id", authenticate("admin", "sub-admin"), async (req, res) => {
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
