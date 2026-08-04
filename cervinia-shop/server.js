require('dotenv').config();
const path = require('path');
const express = require('express');

const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Stripe webhook MUST receive the raw request body (for signature
// verification), so it is mounted BEFORE express.json(). Do not move this.
app.use('/webhook', webhookRoutes);

// Regular JSON parsing for everything else
app.use(express.json());

// Marketing site (../site — hero, resort info, gallery, contact) at "/".
// Only this specific folder is exposed, never the parent project directory,
// so cervinia-shop's own source and .env are never reachable over HTTP.
app.use(express.static(path.join(__dirname, '..', 'site')));

// Shop frontend (public/index.html, css, js, success.html, cancel.html) at "/shop".
app.use('/shop', express.static(path.join(__dirname, 'public')));

// API routes (pricing, checkout session, order lookup, invoice download)
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Cervinia Travel Services shop running at http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_secret_key_here')) {
    console.warn('\n⚠️  STRIPE_SECRET_KEY is not set. Copy .env.example to .env and add your Stripe keys.\n');
  }
});
