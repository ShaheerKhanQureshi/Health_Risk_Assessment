const nodemailer = require('nodemailer');
const logger = require('./logger'); // Assuming you have a logger utility

// Validate environment variables
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email user and password must be defined in environment variables');
}

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Function to send email to user
async function sendEmailToUser(email, report) {
    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
        logger.error('Invalid email address provided:', email);
        throw new Error('Invalid email address');
    }

    // Validate report structure
    if (!report || !report.healthRiskScore || !report.pdfBuffer) {
        logger.error('Invalid report structure:', report);
        throw new Error('Invalid report data');
    }

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Your Health Risk Assessment Report',
        text: `Hello,\n\nYour health risk score is: ${report.healthRiskScore}\n\nPlease find your report attached.`,
        html: `<p>Hello,</p><p>Your health risk score is: <strong>${report.healthRiskScore}</strong></p><p>Please find your report attached.</p>`,
        attachments: [
            {
                filename: `report-${report.user}.pdf`,
                content: Buffer.from(report.pdfBuffer),
                contentType: 'application/pdf',
            },
        ],
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info('Email sent: ' + info.response);
    } catch (error) {
        logger.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}

module.exports = { sendEmailToUser };
