const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  // If SMTP auth is default mock, log the email to Winston and skip sending
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'mockemail@gmail.com' || !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'mockpass') {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
    logger.info(`[MOCK EMAIL TEXT] ${text}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"NetPrime Billing" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
  } catch (error) {
    logger.error(`Error sending email to ${to}: %O`, error);
  }
};

module.exports = { sendEmail };
