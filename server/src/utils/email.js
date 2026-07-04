const nodemailer = require('nodemailer');
const logger = require('./logger');

const cleanEnv = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/^['"]|['"]$/g, '').trim();
};

const emailHost = cleanEnv(process.env.EMAIL_HOST) || 'smtp.gmail.com';
const emailUser = cleanEnv(process.env.EMAIL_USER);
const emailPass = cleanEnv(process.env.EMAIL_PASS);
const emailPort = parseInt(cleanEnv(process.env.EMAIL_PORT), 10) || 587;
const emailSecureValue = cleanEnv(process.env.EMAIL_SECURE).toLowerCase();
const emailSecure = emailSecureValue
  ? emailSecureValue === 'true'
  : emailPort === 465;
const emailFrom = cleanEnv(process.env.EMAIL_FROM) || emailUser;

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailSecure, // true for 465, false for STARTTLS ports like 587
  requireTLS: emailPort === 587,
  connectionTimeout: 10000, // 10 seconds connection timeout
  greetingTimeout: 10000,   // 10 seconds greeting timeout
  socketTimeout: 15000,     // 15 seconds socket activity timeout
  family: 4,                // Force IPv4 resolution to prevent Render IPv6 timeouts
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

logger.info(
  'SMTP configured: host=%s port=%s secure=%s requireTLS=%s user=%s',
  emailHost,
  emailPort,
  emailSecure,
  emailPort === 587,
  emailUser ? emailUser.replace(/^(.{2}).*(@.*)$/, '$1***$2') : 'missing'
);

transporter.verify()
  .then(() => logger.info('SMTP transporter verified successfully.'))
  .catch(error => logger.error('SMTP transporter verification failed: %O', error));

const sendEmail = async ({ to, subject, html, text, attachments }) => {
  // If SMTP auth is default mock, log the email to Winston and skip sending
  if (!emailUser || emailUser === 'mockemail@gmail.com' || !emailPass || emailPass === 'mockpass') {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
    logger.info(`[MOCK EMAIL TEXT] ${text}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"NetPrime" <${emailFrom}>`,
      to,
      subject,
      text,
      html,
      attachments
    });
    if (info.rejected && info.rejected.length > 0) {
      throw new Error(`SMTP rejected recipient(s): ${info.rejected.join(', ')}`);
    }
    logger.info(
      'Email accepted by SMTP provider. to=%s messageId=%s response=%s',
      to,
      info.messageId,
      info.response
    );
    return info;
  } catch (error) {
    logger.error(`Error sending email to ${to}: %O`, error);
    throw error; // Propagate the email error to the caller
  }
};

module.exports = { sendEmail };
