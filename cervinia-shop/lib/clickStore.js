// Clicks on outbound partner links (Skiset, transfers, lift-pass sites), kept
// as one counter per day / partner / page so the file stays small and holds no
// personal data. Shown in the admin dashboard. See lib/dataDir.js.
const { createStore } = require('./dataDir');

const store = createStore('clicks.json');

// Anything not on these lists is ignored, so the endpoint can't be used to
// fill the file with arbitrary text.
const PARTNERS = ['skiset', 'transfers', 'pass-cervinia', 'pass-international', 'pass-aosta'];
const SOURCES = ['site-en', 'site-it', 'shop'];

function record(partner, from) {
  if (!PARTNERS.includes(partner) || !SOURCES.includes(from)) return false;
  const day = new Date().toISOString().slice(0, 10);
  const id = `${day}|${partner}|${from}`;
  const existing = store.readAll().find((r) => r.id === id);
  store.save({ id, day, partner, from, count: (existing ? existing.count : 0) + 1 });
  return true;
}

module.exports = { record, readAll: store.readAll, PARTNERS, SOURCES };
