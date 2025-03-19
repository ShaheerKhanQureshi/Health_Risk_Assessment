const express = require('express');
const router = express.Router();
const { getEmployeeNeeds } = require('../controllers/onlyformentorController');


router.get('/employee-needs/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await getEmployeeNeeds(slug);
    res.json(result);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Failed to fetch employee needs' });
  }
});

module.exports = router;
