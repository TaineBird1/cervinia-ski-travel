// Minimal single-password admin session, signed with HMAC so the cookie
// can't be forged without ADMIN_SESSION_SECRET. No user table needed —
// this is a single shared password for the business owner, not a
// multi-user system.

const crypto = require('crypto');

// The session secret must never be a value that is public in the source code.
// Use ADMIN_SESSION_SECRET if set; otherwise derive one from ADMIN_PASSWORD
// (which has to exist for anyone to log in at all). With neither set there is
// no secret, so no session can ever verify and the admin area stays locked.
const SECRET = process.env.ADMIN_SESSION_SECRET
  || (process.env.ADMIN_PASSWORD
    ? crypto.createHmac('sha256', process.env.ADMIN_PASSWORD).update('cervinia-admin-session-key').digest('hex')
    : null);
const COOKIE_NAME = 'cervinia_admin_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(value) {
  if (!SECRET) throw new Error('Admin session secret is not configured.');
  const hmac = crypto.createHmac('sha256', SECRET).update(value).digest('hex');
  return `${value}.${hmac}`;
}

function verify(token) {
  if (!token || !SECRET) return false;
  const idx = token.lastIndexOf('.');
  if (idx === -1) return false;
  const value = token.slice(0, idx);
  const hmac = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(value).digest('hex');
  if (hmac.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return false;
  const expiresAt = Number(value);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

function createSessionToken() {
  return sign(String(Date.now() + MAX_AGE_MS));
}

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function isRequestSecure(req) {
  return req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
}

function setSessionCookie(req, res) {
  const token = createSessionToken();
  const secureFlag = isRequestSecure(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}; SameSite=Lax${secureFlag}`
  );
}

function clearSessionCookie(req, res) {
  const secureFlag = isRequestSecure(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`);
}

function requireAdmin(req, res, next) {
  if (verify(getCookie(req, COOKIE_NAME))) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

module.exports = { getCookie, setSessionCookie, clearSessionCookie, requireAdmin, COOKIE_NAME };
