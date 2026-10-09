// Shop enquiries (basket quotes). See lib/dataDir.js for where the file lives.
const { createStore } = require('./dataDir');

const store = createStore('orders.json');

function findBySessionId(sessionId) {
  return store.readAll().find((o) => o.sessionId === sessionId);
}

module.exports = { readAll: store.readAll, findBySessionId, save: store.save };
