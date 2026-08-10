require('dotenv').config();
const path = require('path');
const express = require('express');

const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Stripe webhook MUST receive the raw request body (for signature
// verification), so it is mounted BEFORE express.json(). Do not move this.
app.use('/webhook', webhookRoutes);

// Regular JSON parsing for everything else
app.use(express.json());

// Marketing site (site/ — hero, resort info, gallery, contact) at "/".
// Kept inside this directory (not a sibling) so it stays within Render's
// configured root directory; still only this specific folder is exposed,
// never the rest of cervinia-shop's source or .env.
app.use(express.static(path.join(__dirname, 'site')));

// Shop frontend (public/index.html, css, js, success.html, cancel.html) at "/shop".
app.use('/shop', express.static(path.join(__dirname, 'public')));

// API routes (pricing, checkout session, order lookup, invoice download)
app.use('/api', apiRoutes);

// Admin dashboard API (revenue/booking stats) — password-protected, see lib/adminAuth.js
app.use('/api/admin', adminRoutes);
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.listen(PORT, () => {
  console.log(`Cervinia Travel Services shop running at http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_secret_key_here')) {
    console.warn('\n⚠️  STRIPE_SECRET_KEY is not set. Copy .env.example to .env and add your Stripe keys.\n');
  }
});
