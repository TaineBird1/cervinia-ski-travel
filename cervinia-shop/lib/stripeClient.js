const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing — checkout will fail until you set it in .env');
}

module.exports = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing', {
  apiVersion: '2024-06-20'
});
