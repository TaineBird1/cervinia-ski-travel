const { Resend } = require('resend');

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is missing — invoice emails will be skipped until you set it in .env');
}

module.exports = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
