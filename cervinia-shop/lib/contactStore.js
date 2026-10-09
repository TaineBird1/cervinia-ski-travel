// Marketing-site contact-form enquiries (accommodation / custom requests).
// Kept alongside shop orders so they show in the admin dashboard and don't
// depend on the notification email alone. See lib/dataDir.js.
const { createStore } = require('./dataDir');

module.exports = createStore('contacts.json');
