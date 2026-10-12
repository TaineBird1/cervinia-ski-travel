// Server-side pricing for enquiry baskets.
//
// The browser sends each basket line with an id that encodes the options the
// customer picked (e.g. "equip-1-2-3", "hotel-Hotel Lyskamm-2026-12-05-...").
// This module rebuilds the unit price AND the line name from that id and the
// rate sheets in /data, so nobody can send a quote with a price or description
// the shop would never have produced. The arithmetic mirrors public/js/app.js.
const fs = require('fs');
const path = require('path');

const I18N = require('../public/js/i18n.js');

const PRICING_PATH = path.join(__dirname, '..', 'data', 'pricing.json');
const HOTELS_PATH = path.join(__dirname, '..', 'data', 'hotels.json');

const TRANSFER_BOOKING_FEE = 16;
const PASS_SURCHARGE = 2;
const MAX_ITEMS = 40;
const MAX_QTY = 50;
const MAX_SUFFIX = 300;

class BasketError extends Error {}


function cleanText(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// ---------- transfers ----------
function priceTransfer(pricing, id, clientName, L) {
  const feeMatch = id.match(/^transfer-(shared|private)-(.+)-(\d+)-([a-z-]+)-fee$/);
  const match = feeMatch || id.match(/^transfer-(shared|private)-(.+)-(\d+)-([a-z-]+)$/);
  if (!match) return null;
  const [, type, airport, guestsStr, direction] = match;
  const guests = Number(guestsStr);
  const option = (pricing.transfers[type] && pricing.transfers[type].options || []).find((o) => o.airport === airport);
  if (!option) return null;

  if (feeMatch) {
    return { unitPrice: TRANSFER_BOOKING_FEE, name: (P) => P.names.bookingFee(P.d(airport)) };
  }

  let price;
  if (type === 'shared') price = option.pricesByPax && option.pricesByPax[String(guests)];
  else price = guests <= 2 ? option.price1to2 : option.price3to8;
  if (price == null) return null;
  const unitPrice = direction === 'return' ? price * 2 : price;

  const prefixFor = (P) => P.names.transferPrefix(P.d(airport), P.typeLabel(type), P.directionLabel(direction), guests);
  // The customer's own details (address, contact, luggage) follow the prefix,
  // written in whichever language the customer's page used.
  let suffix = '';
  [L, I18N.en].some((P) => {
    const prefix = prefixFor(P);
    if (!clientName.startsWith(`${prefix} — `)) return false;
    suffix = ` — ${cleanText(clientName.slice(prefix.length + 3), MAX_SUFFIX)}`;
    return true;
  });
  return { unitPrice, name: (P) => prefixFor(P) + suffix };
}

// ---------- equipment ----------
function priceEquipment(pricing, id) {
  const m = id.match(/^equip-(\d+)-(\d+)-(\d+)$/);
  if (!m) return null;
  const [catIndex, itemIndex, days] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const cat = pricing.equipment.categories[catIndex];
  const group = cat && pricing.equipment.data[cat];
  const item = group && group.items[itemIndex];
  const row = group && group.pricesByDays[String(days)];
  const price = row ? row[itemIndex] : null;
  if (item == null || price == null) return null;
  return { unitPrice: price, name: (P) => P.names.equipment(P.d(cat), P.d(item), P.days(days)) };
}

// ---------- lift passes ----------
function pricePass(pricing, id) {
  const m = id.match(/^pass-(\d+)-(\d+)(-free)?$/);
  if (!m) return null;
  const tierIndex = Number(m[1]);
  const days = Number(m[2]);
  const free = Boolean(m[3]);
  const tierLabel = pricing.liftPasses.tiers[tierIndex];
  if (!tierLabel) return null;

  let unitPrice;
  if (free) {
    unitPrice = 0;
  } else {
    const row = pricing.liftPasses.pricesByDays[String(days)];
    const base = row ? row[tierIndex] : null;
    if (base == null) return null;
    unitPrice = base + PASS_SURCHARGE;
  }
  return { unitPrice, name: (P) => P.names.pass(P.d(tierLabel), P.days(days), free) };
}

// ---------- lessons ----------
function priceLesson(pricing, id) {
  let m = id.match(/^lesson-private-(\d+)-(.+)-(high|low)-(high|lowMorning|lowAfternoon)$/);
  if (m) {
    const [people, duration, season, time] = [m[1], m[2], m[3], m[4]];
    const rates = pricing.lessons.private.rates[people];
    const durationRates = rates ? rates[duration] : null;
    if (!durationRates) return null;
    const unitPrice = season === 'high' ? durationRates.high : durationRates[time];
    if (unitPrice == null) return null;
    return { unitPrice, name: (P) => P.names.lessonPrivate(people, P.d(duration), season, time) };
  }

  m = id.match(/^lesson-group-(.+)-(high|low)$/);
  if (m) {
    const group = pricing.lessons.group.find((g) => g.id === m[1]);
    if (!group) return null;
    const unitPrice = m[2] === 'high' ? group.high : group.low;
    if (unitPrice == null) return null;
    return { unitPrice, name: (P) => P.names.lessonGroup(P.d(group.label), m[2]) };
  }
  return null;
}

// ---------- accommodation ----------
const dateOnly = (s) => new Date(`${s}T00:00:00Z`);
const nightsBetween = (a, b) => Math.round((dateOnly(b) - dateOnly(a)) / 86400000);
function addDays(dateStr, days) {
  const d = dateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function adultUnitTotal(hotel, roomIndex, checkIn, checkOut) {
  const n = nightsBetween(checkIn, checkOut);
  if (n <= 0 || n > 60) return null;
  let total = 0;
  let cursor = checkIn;
  for (let i = 0; i < n; i++) {
    const week = hotel.weeks.find((w) => cursor >= w.arrival && cursor < w.departure);
    const weekPrice = week ? week.prices[roomIndex] : null;
    if (weekPrice == null) return null;
    total += weekPrice / 7;
    cursor = addDays(cursor, 1);
  }
  return total;
}

function childTierCost(tier, adultTotal, nights) {
  switch (tier.mode) {
    case 'free': return 0;
    case 'flatPerNight': return tier.amount * nights;
    case 'percentOff': return adultTotal * (1 - tier.amount / 100);
    default: return adultTotal;
  }
}

function priceHotel(hotels, id, qty) {
  const m = id.match(/^hotel-(.+)-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})-(\d+)(?:-(children)|-child-(\d+))?$/);
  if (!m) return null;
  const [, hotelName, checkIn, checkOut, roomStr, childrenFlag, childIdx] = m;
  const hotel = hotels[hotelName];
  if (!hotel) return null;
  const roomIndex = Number(roomStr);
  const roomName = hotel.rooms[roomIndex];
  const nights = nightsBetween(checkIn, checkOut);
  if (!roomName || nights < (hotel.minNights || 1)) return null;
  const adultTotal = adultUnitTotal(hotel, roomIndex, checkIn, checkOut);
  if (adultTotal == null) return null;

  const baseFor = (P) => P.names.hotelBase(hotelName, P.d(roomName), checkIn, checkOut, nights, P.fmtDate);

  if (childrenFlag) {
    if (hotel.childPolicy && hotel.childPolicy.length) return null;
    return { unitPrice: adultTotal, name: (P) => P.names.hotelChildrenStd(baseFor(P), qty) };
  }
  if (childIdx != null) {
    const policy = hotel.childPolicy;
    if (!policy || !policy.length) return null;
    const tier = policy[Number(childIdx)] || policy[0];
    return { unitPrice: childTierCost(tier, adultTotal, nights), name: (P) => P.names.hotelChild(baseFor(P), P.d(tier.label)) };
  }
  return { unitPrice: adultTotal, name: (P) => P.names.hotelAdults(baseFor(P), qty) };
}

// ---------- public API ----------
/**
 * Validates a client basket and returns normalised lines with server-side
 * prices and names. Throws BasketError (safe to show the customer) if any line
 * is unrecognised, so a forged or stale basket is never turned into a quote.
 */
function priceBasket(rawItems, lang) {
  const L = I18N.get(lang);
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new BasketError(L.errors.basketEmpty);
  if (rawItems.length > MAX_ITEMS) throw new BasketError(L.errors.basketTooLarge);

  const pricing = JSON.parse(fs.readFileSync(PRICING_PATH, 'utf8'));
  const hotels = JSON.parse(fs.readFileSync(HOTELS_PATH, 'utf8')).hotels;

  return rawItems.map((raw) => {
    const id = cleanText(raw && raw.id, 200);
    const qty = Number(raw && raw.qty);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new BasketError(L.errors.basketStale);
    }
    const clientName = cleanText(raw.name, 500);

    const priced =
      (id.startsWith('transfer-') && priceTransfer(pricing, id, clientName, L)) ||
      (id.startsWith('equip-') && priceEquipment(pricing, id)) ||
      (id.startsWith('pass-') && pricePass(pricing, id)) ||
      (id.startsWith('lesson-') && priceLesson(pricing, id)) ||
      (id.startsWith('hotel-') && priceHotel(hotels, id, qty)) ||
      null;

    if (!priced) {
      throw new BasketError(L.errors.basketStale);
    }
    const unitPrice = priced.unitPrice;
    // `name` is always English (the business's working language, used by the admin
    // dashboard); `nameLocal` is the customer's own language for their quote.
    const line = { name: priced.name(I18N.en), qty, unitPrice, total: unitPrice * qty };
    if (L.code !== 'en') line.nameLocal = priced.name(L);
    return line;
  });
}

module.exports = { priceBasket, BasketError, cleanText };
