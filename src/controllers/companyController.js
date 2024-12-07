
const { v4: uuidv4 } = require("uuid"); // Ensure UUID import is correct
const db = require("../config/db"); // Database connection
const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, "-"); // Example slug generator

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

// const createCompany = async (req, res) => {
//   const { name, companyType, phoneNumber, email, city } = req.body;

//   const slug = generateSlug(name);

//   try {
//     logger.info("Checking for existing slug...");
//     const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [
//       slug,
//     ]);

//     if (results.length > 0) {
//       logger.warn(`Slug already exists for name: ${name}`);
//       return res
//         .status(400)
//         .json({
//           message: "Slug already exists. Please choose a different name.",
//         });
//     }

//     logger.info("Inserting new company into database...");
//     const result = await db.query(
//       "INSERT INTO companies (name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?)",
//       [name, companyType, phoneNumber, email, city, slug]
//     );

//     logger.info("Inserting form structure for company...");
//     //   await db.query('INSERT INTO form_structure (company_id) VALUES (?)', [id]);

//     const companyFormLink = `${baseUrl}/form/${slug}`;
//     res.status(201).json({
//       message: "Company and form added successfully",
//       result,
//       slug: companyFormLink,
//     });

//     logger.info(`Company created successfully with slug: ${slug}`);
//   } catch (error) {
//     logger.error("Error creating company:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

const createCompanyAndSendEmail = async (req, res) => {
  const { name, companyType, phoneNumber, email, city } = req.body;
  const slug = generateSlug(name);

  try {
    const [insertResult] = await db.query(
      'INSERT INTO companies (name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, companyType, phoneNumber, email, city, slug]
    );

    const companyFormLink = `${baseUrl}/form/${slug}`;

    await sendCompanyEmail(email, companyFormLink);

    res.status(201).json({
      message: 'Company created successfully',
      slug: companyFormLink,
    });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCompany = async (req, res) => {
  const { name, companyType, phoneNumber, email, city } = req.body;
  const slug = generateSlug(name);

  try {
    const [results] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);

    if (results.length > 0) {
      return res.status(400).json({ message: "Slug already exists. Please choose a different name." });
    }

    await db.query(
      "INSERT INTO companies (name, companyType, phoneNumber, email, city, url) VALUES (?, ?, ?, ?, ?, ?)",
      [name, companyType, phoneNumber, email, city, slug]
    );

    const fullUrl = `${req.protocol}://${req.get('host')}/form/${slug}`;

    res.status(201).json({
      message: "Company added successfully",
      data: { name, companyType, phoneNumber, email, city, slug, fullUrl },
    });
  } catch (error) {
    logger.error("Error creating company:", error);
    res.status(500).json({ error: "Internal server error" });
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
    const [results] = await db.query("SELECT * FROM companies WHERE id = ?", [  
      id,
    ]);
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
    const [results] = await db.query("DELETE FROM companies WHERE id = ?", [
      id,
    ]);
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
  
//   // Uncomment this for role checking if needed
//   // if (!req.user || !['admin', 'sub-admin'].includes(req.user.role)) {
//     //     return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
//     // }
    
//     try {
//       const [company] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);
  
//       if (!company || company.length === 0) {
//         return res.status(404).json({ error: "Company not found" });
//       }
  
//       const [employeesData] = await db.query(
//         "SELECT employee_info FROM assessment_response WHERE company_slug = ?",
//         [slug]
//       );
      
//       // Assuming employeesData is an array
//       const employees = employeesData.map(record => {
//         return JSON.parse(record.employee_info); // Parse the JSON string to an object
//       });
      
//       res.json({ company: company[0], employees });
//     } catch (error) {
//       logger.error("Error fetching company and employees:", error);
//       res.status(500).json({ error: error.message });
//     }
//   };
const getCompanyAndEmployees = async (req, res) => {
  const { slug } = req.params;

  try {
    const [company] = await db.query("SELECT * FROM companies WHERE url = ?", [slug]);

    if (!company || company.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const [employeesData] = await db.query(
      "SELECT assessment_id, employee_info FROM assessment_response WHERE company_slug = ?",
      [slug]
    );

    const employees = employeesData.map(record => ({
      assessment_id: record.assessment_id,
      employee_info: JSON.parse(record.employee_info)  // Keeping employee_info as it is
    }));

    res.json({ company: company[0], employees });
  } catch (error) {
    logger.error("Error fetching company and employees:", error);
    res.status(500).json({ error: error.message });
  }
};

  const { getEmployeeAssessmentData } = require('../models/AssessmentModel');
const logger = require('../utils/logger');

const calculateBMI = (weight, heightFeet, heightInches) => {
  const heightInMeters = heightFeet * 0.3048 + heightInches * 0.0254;
  return (weight / (heightInMeters * heightInMeters)).toFixed(2);
};

const getEmployeeDetails = async (req, res) => {
  const { slug, id } = req.params;
  
  try {
    const assessmentData = await getEmployeeAssessmentData(id, slug);
    
    if (!assessmentData) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    const { employeeInfo, healthAssessment } = assessmentData;
    
    const weight = parseFloat(employeeInfo.weight);
    const heightFeet = parseFloat(employeeInfo.heightFeet);
    const heightInches = parseFloat(employeeInfo.heightInches);
    const bmi = weight && heightFeet && heightInches
    ? calculateBMI(weight, heightFeet, heightInches)
    : "N/A";
    
    const bp = healthAssessment.bp || "No data";
    const diabetesRisk = healthAssessment.diabetes || "No data";
    const cholesterol = healthAssessment.cholesterol || "No data";
    const riskSectionScores = healthAssessment.risk_section_scores || {};
    
    res.json({
      employee: {
        ...employeeInfo,
        bmi,
        bp,
        diabetesRisk,
        cholesterol,
        riskSectionScores,
        marks: healthAssessment.marks || 0,
      },
    });
  } catch (error) {
    logger.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = {
  createCompanyAndSendEmail,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getCompanyAndEmployees,
  getEmployeeDetails,
  createCompany
};
