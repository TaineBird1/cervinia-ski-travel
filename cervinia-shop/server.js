require('dotenv').config();
const path = require('path');
const express = require('express');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
// Behind Render/Cloudflare: use the forwarded address for rate limiting, hide the framework header.
app.set('trust proxy', true);
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Browser-side protections sent with every response. The content policy only
// allows what the site really uses: its own files, Google Fonts, the Open-Meteo
// weather feed and Cloudflare's visitor counter.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://api.open-meteo.com https://cloudflareinsights.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});

// Photos, logos and PDFs rarely change, so browsers keep them for a week instead
// of re-checking on every visit. Pages, CSS and JS still revalidate every time
// (cheap 304s) so updates go live straight away.
function cacheStaticAssets(res, filePath) {
  if (/\.(jpe?g|png|webp|gif|svg|ico|pdf|woff2?)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}

// JSON bodies (small cap: nothing legitimate is large)
app.use(express.json({ limit: '50kb' }));

// Marketing site (site/ — hero, resort info, gallery, contact) at "/".
// Kept inside this directory (not a sibling) so it stays within Render's
// configured root directory; still only this specific folder is exposed,
// never the rest of cervinia-shop's source or .env.
app.use(express.static(path.join(__dirname, 'site'), { setHeaders: cacheStaticAssets }));

// Shop frontend (public/index.html, css, js, success.html) at "/shop".
app.use('/shop', express.static(path.join(__dirname, 'public'), { setHeaders: cacheStaticAssets }));

// API routes (pricing, enquiries, contact form, quote lookup and download)
app.use('/api', apiRoutes);

// Admin dashboard API (revenue/booking stats) — password-protected, see lib/adminAuth.js
app.use('/api/admin', adminRoutes);
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.listen(PORT, () => {
  console.log(`Cervinia Travel Services shop running at http://localhost:${PORT}`);
});
