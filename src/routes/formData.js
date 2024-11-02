// // const express = require("express");
// // const db = require('../config/db');

// // const router = express.Router();

// // // Get form data by company ID
// // router.get('/formdata/:id', async (req, res) => {
// //   const { id } = req.params;
  
// //   try {
// //     const [formStructure] = await db.query("SELECT * FROM form_structure WHERE company_id = ?", [id]);
    
// //     if (formStructure.length === 0) {
// //       return res.status(404).json({ error: "Form data not found" });
// //     }
    
// //     res.json(formStructure);
// //   } catch (err) {
// //     console.error("Error fetching form data:", err);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // });

// // module.exports = router;
// const express = require("express");
// const db = require('../config/db');
// const { authenticate } = require('../middlewares/auth');
// const router = express.Router();

// // Fetch form data by company ID
// router.get('/formdata/:id', authenticate('admin'), async (req, res) => {
//     const { id } = req.params;
    
//     try {
//         const [formStructure] = await db.query("SELECT * FROM form_structure WHERE company_id = ?", [id]);
        
//         if (formStructure.length === 0) {
//             return res.status(404).json({ error: "Form data not found" });
//         }
        
//         res.json(formStructure);
//     } catch (err) {
//         console.error("Error fetching form data:", err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// // Fetch form data based on the company's unique slug (URL)
// router.get('/formdata/url/:slug', authenticate('admin'), async (req, res) => {
//     const { slug } = req.params;

//     try {
//         // Fetch the company ID based on the slug
//         const [company] = await db.query('SELECT id FROM companies WHERE url = ?', [slug]);
//         if (company.length === 0) {
//             return res.status(404).json({ error: 'Company not found' });
//         }

//         // Fetch form structure/questions based on the company ID
//         const [formQuestions] = await db.query('SELECT * FROM form_structure WHERE company_id = ?', [company[0].id]);
//         if (formQuestions.length === 0) {
//             return res.status(404).json({ error: 'Form questions not found' });
//         }

//         res.json(formQuestions);
//     } catch (error) {
//         console.error('Error fetching form data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// module.exports = router;
