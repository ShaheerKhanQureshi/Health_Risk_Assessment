// const express = require('express');
// const db = require('../config/db');
// const { authenticate } = require('../middlewares/auth');
// const { body, validationResult } = require('express-validator');
// const { v4: uuidv4 } = require('uuid');
// const logger = require('../utils/logger'); // Assuming you have a logger utility

// const router = express.Router();

// // Helper function to generate a URL-friendly slug
// function generateSlug(name) {
//   return name
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with a dash
//     .replace(/^-|-$/g, '') // Remove leading or trailing dashes
//     .substring(0, 200); // Limit slug length to 200 characters
// }

// // Get all companies
// router.get('/', authenticate('admin'), (req, res) => {
//     db.query('SELECT * FROM companies', (err, results) => {
//         if (err) {
//             logger.error('Error fetching companies:', err);
//             return res.status(500).json({ error: err.message });
//         }
//         res.json(results);
//     });
// });

// // Add a new company
// // router.post(
// //     '/',
// //     authenticate('admin'),
// //     [
// //         body('name').isString().notEmpty().withMessage('Name is required'),
// //         body('companytype').isString().notEmpty().withMessage('Company Type is required'), // Changed here
// //         body('phone').isString().optional(),
// //         body('email').isEmail().withMessage('Valid email is required'),
// //         body('city').isString().optional(),
// //     ],
// //     (req, res) => {
// //         const errors = validationResult(req);
// //         if (!errors.isEmpty()) {
// //             return res.status(400).json({ errors: errors.array() });
// //         }

// //         const { name, companytype, phone, email, city } = req.body; // Changed here
// //         const id = uuidv4(); // Generate UUID
// //         const slug = generateSlug(name); // Generate slug from name

// //         // Check if slug already exists
// //         db.query('SELECT * FROM companies WHERE url = ?', [slug], (err, results) => {
// //             if (err) {
// //                 logger.error('Error checking slug:', err);
// //                 return res.status(500).json({ error: err.message });
// //             }
// //             if (results.length > 0) {
// //                 return res.status(400).json({ message: 'Slug already exists. Please choose a different name.' });
// //             }

// //             db.query(
// //                 'INSERT INTO companies (id, name, companytype, phone, email, city, url) VALUES (?, ?, ?, ?, ?, ?, ?)', // Changed here
// //                 [id, name, companytype, phone, email, city, slug], // Changed here
// //                 (err) => {
// //                     if (err) {
// //                         logger.error('Error inserting company:', err);
// //                         return res.status(500).json({ error: err.message });
// //                     }
// //                     res.status(201).json({ message: 'Company added successfully', id, slug });
// //                 }
// //             );
// //         });
// //     }
// // );

// // Add a new company
// router.post(
//   '/',
//   authenticate('admin'),
//   [
//       body('name').isString().notEmpty().withMessage('Name is required'),
//       body('companyType').isString().notEmpty().withMessage('Company Type is required'), // Changed here
//       body('phone').isString().optional(),
//       body('email').isEmail().withMessage('Valid email is required'),
//       body('city').isString().optional(),
//   ],
//   (req, res) => {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//           return res.status(400).json({ errors: errors.array() });
//       }

//       const { name, companyType, phone, email, city } = req.body; // Changed here
//       const id = uuidv4(); // Generate UUID
//       const slug = generateSlug(name); // Generate slug from name

//       // Check if slug already exists
//       db.query('SELECT * FROM companies WHERE url = ?', [slug], (err, results) => {
//           if (err) {
//               logger.error('Error checking slug:', err);
//               return res.status(500).json({ error: err.message });
//           }
//           if (results.length > 0) {
//               return res.status(400).json({ message: 'Slug already exists. Please choose a different name.' });
//           }

//           db.query(
//               'INSERT INTO companies (id, name, companyType, phone, email, city, url) VALUES (?, ?, ?, ?, ?, ?, ?)', // Changed here
//               [id, name, companyType, phone, email, city, slug], // Changed here
//               (err) => {
//                   if (err) {
//                       logger.error('Error inserting company:', err);
//                       return res.status(500).json({ error: err.message });
//                   }
//                   res.status(201).json({ message: 'Company added successfully', id, slug });
//               }
//           );
//       });
//   }
// );

// // Update an existing company
// router.put('/:id', authenticate('admin'), (req, res) => {
//     const { id } = req.params;
//     const { name, companytype, phone, email, city } = req.body; // Changed here
//     const slug = generateSlug(name); // Generate new slug from name

//     db.query(
//         'UPDATE companies SET name = ?, companytype = ?, phone = ?, email = ?, city = ?, url = ? WHERE id = ?', // Changed here
//         [name, companytype, phone, email, city, slug, id], // Changed here
//         (err, results) => {
//             if (err) {
//                 logger.error('Error updating company:', err);
//                 return res.status(500).json({ error: err.message });
//             }
//             if (results.affectedRows === 0) {
//                 return res.status(404).json({ message: 'Company not found' });
//             }
//             res.json({ message: 'Company updated successfully', slug });
//         }
//     );
// });

// // Delete a company
// router.delete('/:id', authenticate('admin'), (req, res) => {
//     const { id } = req.params;

//     db.query('DELETE FROM companies WHERE id = ?', [id], (err, results) => {
//         if (err) {
//             logger.error('Error deleting company:', err);
//             return res.status(500).json({ error: err.message });
//         }
//         if (results.affectedRows === 0) {
//             return res.status(404).json({ message: 'Company not found' });
//         }
//         res.json({ message: 'Company deleted successfully' });
//     });
// });

// module.exports = router;

const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const router = express.Router();
const companyController = require('../controllers/companyController');

const { 
  createCompany,
  getCompanyById,
  getAllCompanies,
  updateCompany,
  deleteCompany,
  getCompanyAndEmployees,
  getEmployeeDetails 
} = companyController;

// Additional routes
router.get("/companies/:slug", authenticate("admin", "sub-admin"), getCompanyAndEmployees);
router.get("/employee/:id", authenticate("admin", "sub-admin"), getEmployeeDetails);
router.get("/companies", authenticate("admin", "sub-admin"), getAllCompanies);
// Utility function to generate slug
function generateSlug(name) {
  return name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
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
async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, companyType, phoneNumber, email, city } = req.body;
    const id = uuidv4();
    const slug = generateSlug(name);

    try {
      // Check for slug uniqueness
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
      const fullUrl = `${req.protocol}://${req.get('host')}/form/${slug}`;

      // Send success response
      res.status(201).json({
        message: "Company added successfully",
        data: { id, slug: fullUrl },
      });
    } catch (error) {
      logger.error("Error creating company:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // authenticate("admin", "sub-admin"),
// Get a company by ID
router.get("/:id",  getCompanyById);
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


module.exports = router;
