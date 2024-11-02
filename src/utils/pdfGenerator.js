const PDFDocument = require('pdfkit');
const logger = require('./logger'); // Assuming you have a logger utility

function createPdfFromResponses(responses) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        let buffers = [];

        // Collect data from PDF document
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // Error handling
        doc.on('error', (err) => {
            logger.error('PDF generation error:', err); // Log the error
            reject(err);
        });

        // Add content to the PDF
        doc.fontSize(16).text('Health Risk Assessment Report', { align: 'center' });
        doc.moveDown();

        responses.forEach((response) => {
            doc.fontSize(12).text(`Question: ${response.question.text}`, { bold: true });
            doc.fontSize(12).text(`Response: ${response.response}`);
            doc.moveDown();
        });

        // Finalize the PDF
        doc.end();
    });
}

module.exports = { createPdfFromResponses };
