// Small in-memory rate limiter. The enquiry endpoints send email to an address
// the visitor types in, so they are limited per visitor (IP) and per
// recipient address — otherwise the forms could be used to spam third parties
// from our sender or burn through the email allowance. In-memory is enough for
// one server; counts reset on restart, which is acceptable here.
const HOUR = 60 * 60 * 1000;

function createLimiter({ windowMs = HOUR, max }) {
  const hits = new Map();

  const timer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, stamps] of hits) {
      const fresh = stamps.filter((t) => t > cutoff);
      if (fresh.length) hits.set(key, fresh); else hits.delete(key);
    }
  }, 10 * 60 * 1000);
  timer.unref();

  // Returns true (and records the hit) if the key is still within its allowance.
  return function allow(key) {
    const now = Date.now();
    const fresh = (hits.get(key) || []).filter((t) => t > now - windowMs);
    if (fresh.length >= max) {
      hits.set(key, fresh);
      return false;
    }
    fresh.push(now);
    hits.set(key, fresh);
    return true;
  };
}

// Behind Cloudflare the real visitor address is in CF-Connecting-IP.
function clientIp(req) {
  return String(req.headers['cf-connecting-ip'] || req.ip || 'unknown');
}

module.exports = { createLimiter, clientIp, HOUR };
