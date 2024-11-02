const nodemailer = require('nodemailer');
const logger = require('./logger');

// Validate environment variables
if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration variables must be defined');
}

// Configure the email transport using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Function to send registration confirmation email
const sendRegistrationEmail = async (to, username) => {
    const mailOptions = {
        from: '"Mentor Health" <no-reply@mentorhealth.com>',
        to: to,
        subject: 'Welcome to Mentor Health!',
        text: `Hello ${username},\n\nThank you for registering with Mentor Health!`,
        html: `<p>Hello ${username},</p><p>Thank you for registering with Mentor Health!</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Registration email sent to ${to}`);
    } catch (error) {
        logger.error('Error sending registration email:', error);
        throw new Error('Failed to send registration email');
    }
};

// Function to send password reset email
const sendPasswordResetEmail = async (to, resetLink) => {
    const mailOptions = {
        from: '"Mentor Health" <no-reply@mentorhealth.com>',
        to: to,
        subject: 'Password Reset Request',
        text: `Click the following link to reset your password: ${resetLink}`,
        html: `<p>Click the following link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
        logger.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

// Function to send health assessment report email
const sendHealthAssessmentEmail = async (email, report) => {
    const mailOptions = {
        from: '"Mentor Health" <no-reply@mentorhealth.com>',
        to: email,
        subject: 'Your Health Risk Assessment Report',
        text: `Hello,\n\nYour health risk score is: ${report.healthRiskScore}\n\nPlease find your report attached.`,
        attachments: [
            {
                filename: `report-${report.user}.pdf`,
                content: Buffer.from(report.pdfBuffer),
                contentType: 'application/pdf',
            },
        ],
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Health assessment email sent to ${email}`);
    } catch (error) {
        logger.error('Error sending health assessment email:', error);
        throw new Error('Failed to send health assessment email');
    }
};

// Function to send notification email
const sendNotificationEmail = async (to, subject, message) => {
    const mailOptions = {
        from: '"Mentor Health" <no-reply@mentorhealth.com>',
        to: to,
        subject: subject,
        text: message,
        html: `<p>${message}</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Notification email sent to ${to}`);
    } catch (error) {
        logger.error('Error sending notification email:', error);
        throw new Error('Failed to send notification email');
    }
};

module.exports = {
    sendRegistrationEmail,
    sendPasswordResetEmail,
    sendHealthAssessmentEmail,
    sendNotificationEmail,
};
