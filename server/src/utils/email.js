const nodemailer = require('nodemailer');
const logger = require('./logger');

const emailPort = parseInt(process.env.EMAIL_PORT, 10) || 587;
const emailSecure = process.env.EMAIL_SECURE
  ? process.env.EMAIL_SECURE === 'true'
  : emailPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: emailPort,
  secure: emailSecure, // true for 465, false for STARTTLS ports like 587
  connectionTimeout: 10000, // 10 seconds connection timeout
  greetingTimeout: 10000,   // 10 seconds greeting timeout
  socketTimeout: 15000,     // 15 seconds socket activity timeout
  family: 4,                // Force IPv4 resolution to prevent Render IPv6 timeouts
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html, text, attachments }) => {
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
      html,
      attachments
    });
    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
  } catch (error) {
    logger.error(`Error sending email to ${to}: %O`, error);
    throw error; // Propagate the email error to the caller
  }
};

module.exports = { sendEmail };
