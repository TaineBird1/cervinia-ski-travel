/**
 * Import pricing from the Cervinia Travel Services rate-sheet workbooks into
 * data/pricing.json and data/hotels.json.
 *
 * Usage:
 *   node scripts/importPricingFromExcel.js "Website - Ski_Hire_Pass_Lessons.xlsx" "Website - Cervinia_Hotel_Rates.xlsx"
 *   (either argument can be omitted if you only want to update one of the two)
 *
 * This matches the ACTUAL workbook layout the client sent, not a made-up
 * template:
 *
 *  "Website - Ski_Hire_Pass_Lessons.xlsx"
 *    - Sheet "Ski Hire Rates Long": columns Category | Item | Days | Price EUR
 *      (one row per category/item/day-count combination — this is what
 *      drives the Equipment Hire configurator)
 *    - Sheet "Ski Pass Rate Sheet": a row per "Consecutive Days" with columns
 *      for Adult / Senior / Young / Junior / Child prices
 *    - Sheet "Ski Lessons Rates": Private Lessons block (rows grouped by
 *      "N People", each with 2/3/4 hour + Full day rows and Low Season
 *      Morning/Afternoon + High Season prices) followed by a Group Lessons
 *      block (3 days / 5 days, per person, Low/High season)
 *
 *  "Website - Cervinia_Hotel_Rates_26-27 from 24-25.xlsx"
 *    - One sheet per hotel, each with an "Arrival date | Departure date |
 *      <room type columns...>" header, one row per 7-night week, and a notes
 *      column on the right (tourist tax, board basis, cancellation policy…)
 *
 * Re-run this any time you get an updated workbook in the same layout.
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const [, , skiFile, hotelFile] = process.argv;

if (!skiFile && !hotelFile) {
  console.error('Provide at least one workbook to import.');
  console.error('Example: node scripts/importPricingFromExcel.js "Ski_Hire_Pass_Lessons.xlsx" "Hotel_Rates.xlsx"');
  process.exit(1);
}

const PRICING_PATH = path.join(__dirname, '..', 'data', 'pricing.json');
const HOTELS_PATH = path.join(__dirname, '..', 'data', 'hotels.json');

function loadSheetRows(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

function isBlankRow(row) {
  return !row || row.every((c) => c === null || c === '');
}

// ---------------- Ski Hire / Passes / Lessons ----------------
function importSkiFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    return;
  }
  const wb = XLSX.readFile(resolved, { cellDates: true });
  const pricing = fs.existsSync(PRICING_PATH) ? JSON.parse(fs.readFileSync(PRICING_PATH, 'utf8')) : {};

  // --- Equipment: "Ski Hire Rates Long" (Category | Item | Days | Price EUR) ---
  const longRows = loadSheetRows(wb, 'Ski Hire Rates Long');
  if (longRows) {
    const dataRows = longRows.slice(2).filter((r) => !isBlankRow(r));
    const catItems = new Map(); // category -> [items in first-seen order]
    const catDayItemPrice = new Map(); // category -> day -> item -> price

    dataRows.forEach((r) => {
      const [cat, item, days, price] = r;
      if (!cat || !item || days == null) return;
      if (!catItems.has(cat)) catItems.set(cat, []);
      if (!catItems.get(cat).includes(item)) catItems.get(cat).push(item);
      if (!catDayItemPrice.has(cat)) catDayItemPrice.set(cat, new Map());
      const dayMap = catDayItemPrice.get(cat);
      if (!dayMap.has(days)) dayMap.set(days, {});
      dayMap.get(days)[item] = price;
    });

    const equipment = { categories: [...catItems.keys()], data: {} };
    catItems.forEach((items, cat) => {
      const pricesByDays = {};
      [...catDayItemPrice.get(cat).entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([day, itemPrices]) => {
          pricesByDays[String(day)] = items.map((it) => (it in itemPrices ? itemPrices[it] : null));
        });
      equipment.data[cat] = { items, pricesByDays };
    });

    pricing.equipment = equipment;
    console.log(`✅ Equipment: imported ${equipment.categories.length} categories`);
  } else {
    console.warn('Sheet "Ski Hire Rates Long" not found — equipment pricing left untouched.');
  }

  // --- Lift Passes: "Ski Pass Rate Sheet" ---
  const passRows = loadSheetRows(wb, 'Ski Pass Rate Sheet');
  if (passRows) {
    const seasonRow = passRows.find((r) => r[1] && String(r[1]).toLowerCase().includes('season'));
    const headerRowIndex = passRows.findIndex((r) => r[0] && String(r[0]).toLowerCase().includes('day'));
    const tiers = headerRowIndex >= 0
      ? passRows[headerRowIndex].slice(1, 6).map((h) => String(h).replace(/\n/g, ' ').trim()).filter(Boolean)
      : [];
    const pricesByDays = {};
    passRows.slice(headerRowIndex + 1).forEach((r) => {
      if (typeof r[0] !== 'number') return;
      pricesByDays[String(r[0])] = r.slice(1, 1 + tiers.length);
    });

    pricing.liftPasses = {
      season: seasonRow ? String(seasonRow[1]).trim() : pricing.liftPasses?.season,
      tiers,
      pricesByDays,
      notes: pricing.liftPasses?.notes || 'A Zermatt (international) upgrade can be purchased at the lift kiosk on the day, weather permitting.'
    };
    console.log(`✅ Lift Passes: imported ${Object.keys(pricesByDays).length} day options across ${tiers.length} tiers`);
  } else {
    console.warn('Sheet "Ski Pass Rate Sheet" not found — lift pass pricing left untouched.');
  }

  // --- Lessons: "Ski Lessons Rates" ---
  const lessonRows = loadSheetRows(wb, 'Ski Lessons Rates');
  if (lessonRows) {
    const private_ = { peopleOptions: [1, 2, 3, 4, 5, 6], durations: ['2 hours', '3 hours', '4 hours', 'Full day'], rates: {} };
    let currentPeople = null;
    const clean = (v) => (v === null || v === '' || v === '-' ? null : v);

    // Private block: rows after the "Morning | Afternoon" sub-header, up to "Group Lessons"
    const groupHeaderIdx = lessonRows.findIndex((r) => r[0] && String(r[0]).toLowerCase().includes('group lessons'));
    const privateBlock = lessonRows.slice(4, groupHeaderIdx > 0 ? groupHeaderIdx : undefined);

    privateBlock.forEach((r) => {
      const [label, duration, , lowAm, lowPm, high] = r;
      if (label) {
        const m = String(label).match(/(\d+)/);
        if (m) currentPeople = Number(m[1]);
      }
      if (currentPeople && duration) {
        private_.rates[String(currentPeople)] = private_.rates[String(currentPeople)] || {};
        private_.rates[String(currentPeople)][duration] = {
          lowMorning: clean(lowAm),
          lowAfternoon: clean(lowPm),
          high: clean(high)
        };
      }
    });

    // Group block: "5 days" / "3 days" rows, Low Season col 3, High Season col 5
    const group = [];
    if (groupHeaderIdx > 0) {
      lessonRows.slice(groupHeaderIdx).forEach((r) => {
        const label = r[0];
        if (label && /\d+\s*days?/i.test(String(label))) {
          const days = String(label).match(/\d+/)[0];
          group.push({
            id: `group-${days}day`,
            label: `Group Lesson — ${days} Days (Mon–Fri 10:00–12:30)`,
            low: clean(r[3]),
            high: clean(r[5])
          });
        }
      });
    }

    pricing.lessons = {
      seasonNote: pricing.lessons?.seasonNote
        || 'Check High/Low season dates with the resort — pricing differs between seasons.',
      private: private_,
      group
    };
    console.log(`✅ Lessons: imported private rates for ${Object.keys(private_.rates).length} group sizes, ${group.length} group packages`);
  } else {
    console.warn('Sheet "Ski Lessons Rates" not found — lesson pricing left untouched.');
  }

  pricing.currency = pricing.currency || 'EUR';
  pricing._source = `Imported from ${path.basename(resolved)} on ${new Date().toISOString().slice(0, 10)}`;
  fs.writeFileSync(PRICING_PATH, JSON.stringify(pricing, null, 2));
  console.log(`Saved ${PRICING_PATH}`);
}

// ---------------- Hotel rates ----------------
function importHotelFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    return;
  }
  const wb = XLSX.readFile(resolved, { cellDates: true });
  const hotels = {};

  wb.SheetNames.forEach((sheetName) => {
    const rows = loadSheetRows(wb, sheetName);
    if (!rows || rows.length < 3) return;

    const title = rows[0][0];
    const priceBasis = rows[1][0];
    const headerIdx = rows.findIndex((r) => r[0] && String(r[0]).toLowerCase().includes('arrival'));
    if (headerIdx < 0) return;
    const header = rows[headerIdx];

    const roomCols = [];
    for (let i = 2; i < header.length; i++) {
      if (header[i]) roomCols.push({ index: i, name: String(header[i]).replace(/\n/g, ' ').trim() });
    }
    const noteColIndex = header.length - 1;

    const notes = [];
    const weeks = [];
    rows.slice(headerIdx + 1).forEach((r) => {
      const note = r[noteColIndex];
      if (note && String(note).trim() && String(note).trim().toUpperCase() !== 'NOTES:') {
        notes.push(String(note).trim());
      }
      const [arrival, departure] = r;
      if (!arrival) return;
      weeks.push({
        arrival: toISODate(arrival),
        departure: toISODate(departure),
        prices: roomCols.map((c) => r[c.index])
      });
    });

    hotels[sheetName] = {
      title,
      priceBasis,
      rooms: roomCols.map((c) => c.name),
      notes,
      weeks
    };
  });

  const out = {
    _source: `Imported from ${path.basename(resolved)} on ${new Date().toISOString().slice(0, 10)}`,
    currency: 'EUR',
    hotels
  };
  fs.writeFileSync(HOTELS_PATH, JSON.stringify(out, null, 2));
  console.log(`✅ Hotels: imported ${Object.keys(hotels).length} properties`);
  console.log(`Saved ${HOTELS_PATH}`);
}

function toISODate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

if (skiFile) importSkiFile(skiFile);
if (hotelFile) importHotelFile(hotelFile);
