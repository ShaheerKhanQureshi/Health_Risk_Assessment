const db = require('../config/db');

const getEmployeeDetails = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM employees WHERE id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employee = results[0];
        const employeeInfo = JSON.parse(employee.employee_info);
        const healthAssessment = JSON.parse(employee.health_assessment);
        const bmi = calculateBMI(employeeInfo.weight, employeeInfo.height);

        res.json({
            id: employee.id,
            employeeInfo,
            healthAssessment,
            bmi,
        });
    });
};

const calculateBMI = (weight, height) => {
    return (weight / (height * height)).toFixed(2);
};

module.exports = {
    getEmployeeDetails,
};
