const express = require('express');
const orderStore = require('../lib/orderStore');
const { setSessionCookie, clearSessionCookie, requireAdmin } = require('../lib/adminAuth');

const router = express.Router();

router.use(express.json());

// POST /api/admin/login — body: { password }
router.post('/login', (req, res) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'Admin password is not configured on the server.' });
  }
  const { password } = req.body || {};
  if (password !== expected) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  setSessionCookie(req, res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  // Lets the dashboard check "am I already logged in?" without exposing data.
  requireAdmin(req, res, () => res.json({ ok: true }));
});

// Buckets a basket item's name into a revenue category. Matches the
// name templates built in public/js/app.js's addToBasket() calls.
function categorize(name) {
  if (name.startsWith('Airport Transfer')) return 'Transfers';
  if (name.startsWith('Ski Lift Pass')) return 'Lift Passes';
  if (name.startsWith('Private Lesson') || name.startsWith('Group Lesson')) return 'Lessons';
  const equipmentPrefixes = [
    'Skis and Poles', 'Ski Boots', 'Snowboard Boots', 'Snowboard Set - Board & Boots',
    'Snowboard', 'Ski Accessories', 'Ski Set - Skis, Boots & Poles'
  ];
  if (equipmentPrefixes.some((p) => name.startsWith(p))) return 'Equipment';
  return 'Accommodation';
}

router.get('/stats', requireAdmin, (req, res) => {
  const orders = orderStore.readAll();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalBookings = orders.length;
  const uniqueCustomers = new Set(
    orders.map((o) => (o.customerEmail || o.customerName || 'unknown').toLowerCase())
  ).size;

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const ordersLast30d = orders.filter((o) => now - new Date(o.createdAt).getTime() <= THIRTY_DAYS_MS);
  const revenueLast30d = ordersLast30d.reduce((sum, o) => sum + (o.total || 0), 0);

  const categoryTotals = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const cat = categorize(item.name || '');
      const itemTotal = item.total != null ? item.total : (item.unitPrice || 0) * (item.qty || 1);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + itemTotal;
    });
  });

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      total: o.total,
      itemCount: (o.items || []).length,
      createdAt: o.createdAt
    }));

  res.json({
    totalRevenue,
    totalBookings,
    uniqueCustomers,
    revenueLast30d,
    bookingsLast30d: ordersLast30d.length,
    categoryTotals,
    recentOrders
  });
});

module.exports = router;
