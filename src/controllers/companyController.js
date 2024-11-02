// // Create a new company
// // // Create a new company
// // // exports.createCompany = async (req, res) => {
// // //   const { name, companyType, phoneNumber, email, city } = req.body;
// // //   const id = uuidv4();
// // //   const slug = generateSlug(name);

// // //   try {
//   // //     // Check for slug uniqueness
// // //     const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [
//   // //       slug,
//   // //     ]);
//   // //     if (results.length > 0) {
// // //       return res.status(400).json({
//   // //         message: "Slug already exists. Please choose a different name.",
// // //       });
// // //     }

// // //     // Insert new company
// // //     const result = await db.query(
//   // //       "INSERT INTO companies (uuid, name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
//   // //       [id, name, companyType, phoneNumber, email, city, slug]
//   // //     );
  
//   // //     // Insert form structure with the new ID
// // //     await db.query("INSERT INTO form_structure (id, company_id) VALUES (?,?)", [
//   // //       id,
// // //       id,
// // //     ]);

// // //     // Construct the full URL for the form using baseUrl
// // //     const fullUrl = `${baseUrl}/form/${slug}`;
// // //     console.log("Generated URL:", fullUrl); // Debug line
// // //     console.log(result);
// // //     res.status(201).json({
// // //       message: "Company and form added successfully",
// // //       result,
// // //       slug: `${baseUrl}/form/${slug}`, // Include the full URL
// // //     });
// // //   } catch (error) {
//   // //     logger.error("Error creating company:", error);
//   // //     res.status(500).json({ error: "Internal server error" });
//   // //   }
//   // // };
  
//   // // const generateSlug = (name) => {
//     // //   return name
//     // //     .toLowerCase()
//     // //     .replace(/[^a-z0-9]+/g, "-")
//     // //     .replace(/^-|-$/g, "")
// // //     .substring(0, 200);
// // // };

// // // Create a new company
// // exports.createCompany = async (req, res) => {
//   //   const { name, companyType, phoneNumber, email, city } = req.body;
//   //   const slug = generateSlug(name); // Generate a slug based on the company name
  
// //   try {
//   //     // Check for slug uniqueness
//   //     const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
//   //     if (results.length > 0) {
//     //       return res.status(400).json({
//       //         message: "Slug already exists. Please choose a different name.",
//       //       });
//       //     }
      
// //     // Insert new company into the database
// //     const [insertResult] = await db.query(
//   //       "INSERT INTO companies (name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?)",
// //       [name, companyType, phoneNumber, email, city, slug]
// //     );

// //     // Construct the full URL for the form
// //     const baseUrl = req.protocol + '://' + req.get('host'); // Generate base URL dynamically
// //     const fullUrl = `${baseUrl}/form/${slug}`;
// //     console.log("Generated URL:", fullUrl); // Log the generated URL for debugging

// //     // Send success response
// //     res.status(201).json({
//   //       message: "Company added successfully",
//   //       result: insertResult, // Include the result of the insert operation
//   //       slug: fullUrl, // Include the generated slug URL
//   //     });
//   //   } catch (error) {
//     //     logger.error("Error creating company:", error);
//     //     res.status(500).json({ error: "Internal server error" });
//     //   }
//     // };
    
//     // // // Function to create dynamic tables
//     // // const createCompanyTables = async (slug) => {
// // //   const createEmployeesTableQuery = `
// // //     CREATE TABLE IF NOT EXISTS \`${slug}_assessment_response\` (
//   // //         id BIGINT AUTO_INCREMENT PRIMARY KEY,
// // //         employee_info LTEXT,
// // //         health_assessment TEXT,
// // //         createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// // //     );
// // // `;

// //   //   const createAssessmentsTableQuery = `
// //   //         CREATE TABLE IF NOT EXISTS ${slug}_assessments (
// //   //             id BIGINT AUTO_INCREMENT PRIMARY KEY,
// //   //             employee_id BIGINT,
// //   //             healthRiskScore DECIMAL(5, 2),
// //   //             emotionalHealthScore DECIMAL(5, 2),
// //   //             nutritionalHabitsScore DECIMAL(5, 2),
// //   //             bmi DECIMAL(5, 2),
// //   //             prevalentRiskFactors TEXT,
// //   //             recommendations TEXT,
// //   //             createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
// //   //             FOREIGN KEY (employee_id) REFERENCES ${slug}_employees(id)
// //   //         );
// //   //     `;

// // //   try {
//   // //     await db.query(createEmployeesTableQuery);
//   // //     // await db.query(createAssessmentsTableQuery);
// // //   } catch (error) {
//   // //     logger.error("Error creating company tables:", error);
//   // //     throw new Error("Table creation failed");
//   // //   }
// // // };


// // NEW CODE CHANGES FOR AUTH
// const { v4: uuidv4 } = require("uuid");
// const db = require("../config/db"); // Database connection
// const logger = require("../utils/logger");

// // Helper function to generate slug
// function generateSlug(name) {
//     return name
//         .toLowerCase()
//         .replace(/[^a-z0-9]+/g, "-")
//         .replace(/^-|-$/g, "")
//         .substring(0, 200);
// }

// // Base URL for generating the complete link
// const baseUrl = process.env.BASE_URL || "http://localhost:3000";

// const createCompany = async (req, res) => {
//   const { name, companyType, phoneNumber, email, city } = req.body;
//   const id = uuidv4();
//   const slug = generateSlug(name);

//   try {
//       const [results] = await db.query('SELECT * FROM companies WHERE url = ?', [slug]);
//       if (results.length > 0) {
//           return res.status(400).json({ message: 'Slug already exists. Please choose a different name.' });
//       }
//       await db.query('INSERT INTO companies (id, name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, companyType, phoneNumber, email, city, slug]);
//       await db.query('INSERT INTO form_structure (company_id) VALUES (?)', [id]);

//       res.status(201).json({
//           message: 'Company and form added successfully',
//           id,
//           slug: `/form/${slug}`,
//       });
//   } catch (error) {
//       logger.error('Error creating company:', error);
//       res.status(500).json({ error: 'Internal server error' });
//   }
// };

const { v4: uuidv4 } = require("uuid"); // Ensure UUID import is correct
const db = require("../config/db"); // Database connection
const logger = require("../utils/logger"); // Ensure logger is imported
const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, '-'); // Example slug generator

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const createCompany = async (req, res) => {
  const { name, companyType, phoneNumber, email, city } = req.body;
  const slug = generateSlug(name);

  try {
      logger.info("Checking for existing slug...");
      const [results] = await db.query('SELECT * FROM companies WHERE url = ?', [slug]);
      
      if (results.length > 0) {
          logger.warn(`Slug already exists for name: ${name}`);
          return res.status(400).json({ message: 'Slug already exists. Please choose a different name.' });
      }

      logger.info("Inserting new company into database...");
      const result = await db.query(
          'INSERT INTO companies (name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?)',
          [name, companyType, phoneNumber, email, city, slug]
      );

      logger.info("Inserting form structure for company...");
    //   await db.query('INSERT INTO form_structure (company_id) VALUES (?)', [id]);

      const companyFormLink = `${baseUrl}/form/${slug}`;
      res.status(201).json({
          message: 'Company and form added successfully',
          result,
          slug: companyFormLink,
      });

      logger.info(`Company created successfully with slug: ${slug}`);
  } catch (error) {
      logger.error('Error creating company:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};
const getAllCompanies = async (req, res) => {
  try {
      const [results] = await db.query("SELECT * FROM companies");
      res.json(results);
  } catch (error) {
      logger.error("Error fetching companies:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};

const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
      const [results] = await db.query("SELECT * FROM companies WHERE id = ?", [id]);
      if (results.length === 0) {
          return res.status(404).json({ message: "Company not found" });
      }
      res.json(results[0]);
  } catch (error) {
      logger.error("Error fetching company:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};


const updateCompany = async (req, res) => {
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
  } catch (error) {
      logger.error("Error updating company:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};

const deleteCompany = async (req, res) => {
  const { id } = req.params;

  try {
      const [results] = await db.query("DELETE FROM companies WHERE id = ?", [id]);
      if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Company not found" });
      }
      res.json({ message: "Company deleted successfully" });
  } catch (error) {
      logger.error("Error deleting company:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};

// const getCompanyAndEmployees = async (req, res) => {
//   const { slug } = req.params;
//   const userId = req.user ? req.user.id : null; // Check if req.user exists

//   if (!userId) {
//     return res.status(401).json({ error: "User not authenticated" });
//   }

//   try {
//       const [company] = await db.query('SELECT * FROM companies WHERE url = ? AND id IN (SELECT company_id FROM users WHERE id = ?)', [slug, userId]);
//       if (!company.length) {
//           return res.status(404).json({ error: 'Company not found' });
//       }
//       const employees = await db.query('SELECT * FROM employees WHERE company_id = ?', [company[0].id]);
//       const employeeDetails = await Promise.all(employees.map(async (employee) => {
//           const assessments = await db.query('SELECT * FROM health_assessments WHERE employee_id = ?', [employee.id]);
//           return {
//               ...employee,
//               assessments: assessments.map(a => JSON.parse(a.responses)),
//           };
//       }));
//       res.json({ company: company[0], employees: employeeDetails });
//   } catch (error) {
//       logger.error("Error fetching company and employees:", error);
//       res.status(500).json({ error: error.message });
//   }
// };
const getCompanyAndEmployees = async (req, res) => {
  const { slug } = req.params;

  if (!req.user || !['admin', 'sub-admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }

  try {
      const [company] = await db.query(
          'SELECT * FROM companies WHERE url = ?',
          [slug]
      );

      if (!company || company.length === 0) {
          return res.status(404).json({ error: 'Company not found' });
      }

      const employees = await db.query('SELECT * FROM employees WHERE company_id = ?', [company[0].id]);

      const employeeDetails = await Promise.all(employees.map(async (employee) => {
          const assessments = await db.query('SELECT * FROM health_assessments WHERE employee_id = ?', [employee.id]);
          return {
              ...employee,
              assessments: assessments.map(a => JSON.parse(a.responses)),
          };
      }));

      res.json({ company: company[0], employees: employeeDetails });
  } catch (error) {
      logger.error("Error fetching company and employees:", error);
      res.status(500).json({ error: error.message });
  }
};


const getEmployeeDetails = async (req, res) => {
  const { employeeId } = req.params;

  try {
      const [employeeResults] = await db.query("SELECT * FROM assessment_response WHERE id = ?", [employeeId]);
      if (employeeResults.length === 0) {
          return res.status(404).json({ message: "Employee not found" });
      }

      const employee = employeeResults[0];
      const employeeInfo = employee.employee_info;
      const healthAssessment = employee.health_assessment || [];
      const weight = parseFloat(employeeInfo.weight);
      const heightFeet = parseFloat(employeeInfo.heightFeet);
      const heightInches = parseFloat(employeeInfo.heightInches);
      const bmi = weight && heightFeet && heightInches ? calculateBMI(weight, heightFeet, heightInches) : "N/A";

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
};

function calculateBMI(weight, heightFeet, heightInches) {
  const heightInMeters = (heightFeet * 0.3048) + (heightInches * 0.0254);
  return (weight / (heightInMeters * heightInMeters)).toFixed(2);
}

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getCompanyAndEmployees,
  getEmployeeDetails,
};

