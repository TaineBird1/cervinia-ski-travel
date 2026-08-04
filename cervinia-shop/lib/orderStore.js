// Very small file-based order store. Fine for a low-volume travel agency
// site; swap for a real database later if you outgrow it.

const fs = require('fs');
const path = require('path');

const ORDERS_PATH = path.join(__dirname, '..', 'data', 'orders.json');

function readAll() {
  try {
    const raw = fs.readFileSync(ORDERS_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

function writeAll(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
}

function findBySessionId(sessionId) {
  return readAll().find((o) => o.sessionId === sessionId);
}

function save(order) {
  const orders = readAll();
  const existingIndex = orders.findIndex((o) => o.id === order.id);
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }
  writeAll(orders);
  return order;
}

module.exports = { readAll, findBySessionId, save };
