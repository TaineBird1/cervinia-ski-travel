// Where enquiries and generated quote PDFs are kept.
//
// By default they live inside the app folder, which on Render's free plan is
// wiped on every restart or deploy. To keep them, attach a Render persistent
// disk and set DATA_DIR to its mount path (for example /var/data): orders,
// contact-form enquiries and quote PDFs then survive restarts. The rate sheets
// (data/pricing.json, data/hotels.json) are part of the code and stay put.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INVOICES_DIR = process.env.INVOICES_DIR
  || (process.env.DATA_DIR ? path.join(DATA_DIR, 'invoices') : path.join(__dirname, '..', 'invoices'));

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(INVOICES_DIR, { recursive: true });

// A small JSON-file store. Writes go to a temp file and are renamed into place,
// so a crash mid-write can't leave a half-written (unreadable) file behind.
function createStore(fileName) {
  const file = path.join(DATA_DIR, fileName);

  function readAll() {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    } catch (err) {
      return [];
    }
  }

  function save(record) {
    const records = readAll();
    const existing = records.findIndex((r) => r.id === record.id);
    if (existing >= 0) records[existing] = record; else records.push(record);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(records, null, 2));
    fs.renameSync(tmp, file);
    return record;
  }

  return { readAll, save };
}

module.exports = { DATA_DIR, INVOICES_DIR, createStore };
