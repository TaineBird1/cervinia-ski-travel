// Switches the site's public web address everywhere it is written into the
// pages (canonical links, language alternates, sharing tags, structured data,
// sitemap, robots.txt). Run it when the branded domain goes live:
//
//   node scripts/set-base-url.js https://www.cerviniatravelservices.com
//
// If the address was changed before, say what to replace:
//   node scripts/set-base-url.js https://new.example --from https://old.example
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const target = (args[0] || '').replace(/\/+$/, '');
const fromIndex = args.indexOf('--from');
const from = (fromIndex >= 0 ? args[fromIndex + 1] : 'https://cervinia-ski-travel.onrender.com').replace(/\/+$/, '');

if (!/^https:\/\/[a-z0-9.-]+$/i.test(target)) {
  console.error('Usage: node scripts/set-base-url.js https://your-domain.com [--from https://old-address]');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|xml|txt)$/i.test(entry.name)) files.push(full);
  }
}).call(null, path.join(root, 'site'));
files.push(path.join(root, 'public', 'index.html'));

let total = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const count = before.split(from).length - 1;
  if (!count) continue;
  fs.writeFileSync(file, before.split(from).join(target));
  total += count;
  console.log(`${String(count).padStart(3)}  ${path.relative(root, file)}`);
}
console.log(`\nReplaced ${total} occurrence(s) of ${from} with ${target}.`);
console.log('Remember to set BUSINESS_WEBSITE on the server so the PDF quote shows the new address.');
