// Language packs for the shop, shared by the browser (public/js/app.js) and the
// server (lib/priceCheck.js, quote PDF, emails). English is the base language;
// the Italian pack translates screen text, rate-sheet labels and the line names
// that appear on quotes. Rate-sheet data itself (data/*.json) stays in English —
// it is the key the prices are looked up by — and is translated for display only.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CTS_I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // ---------- Italian translations of rate-sheet labels ----------
  const IT_DATA = {
    // airports
    'Milan Malpensa Airport': 'Aeroporto di Milano Malpensa',
    'Turin Caselle Airport': 'Aeroporto di Torino Caselle',
    'Bergamo Airport': 'Aeroporto di Bergamo Orio al Serio',
    'Milan Linate Airport': 'Aeroporto di Milano Linate',
    'Saturdays only; price per group': 'Solo il sabato; prezzo per gruppo',
    'Price per group': 'Prezzo per gruppo',
    'One-way rates, price per group (not per person). Shared shuttles run Saturdays only.':
      'Tariffe per singola tratta, prezzo per gruppo (non a persona). Le navette condivise circolano solo il sabato.',
    // equipment
    'Skis and Poles': 'Sci e bastoncini',
    'Ski Boots': 'Scarponi da sci',
    'Snowboard': 'Snowboard',
    'Snowboard Boots': 'Scarponi da snowboard',
    'Ski Accessories': 'Accessori per lo sci',
    'Ski Set - Skis, Boots & Poles': 'Set sci: sci, scarponi e bastoncini',
    'Snowboard Set - Board & Boots': 'Set snowboard: tavola e scarponi',
    'Kids up to 11 years': 'Bambini fino a 11 anni',
    'Evolution Beginner': 'Evolution principiante',
    'Performance Intermediate': 'Performance intermedio',
    'Excellence Experienced': 'Excellence esperto',
    'Rider up to 13 years': 'Rider fino a 13 anni',
    'Ski Jacket & Pants': 'Giacca e pantaloni da sci',
    'Helmet (Junior)': 'Casco (junior)',
    'Helmet (Adult)': 'Casco (adulto)',
    'Gloves (Junior)': 'Guanti (junior)',
    'Gloves (Adult)': 'Guanti (adulto)',
    'Goggles (Junior)': 'Maschera (junior)',
    'Goggles (Adult)': 'Maschera (adulto)',
    'Storage Lockers': 'Armadietti',
    // lift passes
    'Adult Standard': 'Adulto standard',
    'Senior (>65)': 'Senior (over 65)',
    'Young (U24)': 'Giovane (under 24)',
    'Junior (U16)': 'Junior (under 16)',
    'Child (U8)': 'Bambino (under 8)',
    'Season 24 Oct 2026 - 02 May 2027': 'Stagione dal 24 ott 2026 al 2 mag 2027',
    'Child (U8) ski free with an adult pass, or pay the listed price for a standalone pass. A Zermatt (international) upgrade can be purchased at the lift kiosk on the day, weather permitting.':
      "I bambini (under 8) sciano gratis con uno skipass adulto, oppure pagano il prezzo indicato per uno skipass individuale. L'estensione allo skipass internazionale (Zermatt) si può acquistare alla biglietteria degli impianti il giorno stesso, compatibilmente con le condizioni meteo.",
    // lessons
    'High Season: 06-08 Dec | 20 Dec-11 Jan | 14 Feb-01 Mar | 30 Mar-12 Apr. All other dates are Low Season.':
      'Alta stagione: 6-8 dic | 20 dic-11 gen | 14 feb-1 mar | 30 mar-12 apr. Tutte le altre date rientrano nella bassa stagione.',
    '2 hours': '2 ore',
    '3 hours': '3 ore',
    '4 hours': '4 ore',
    'Full day': 'Giornata intera',
    'Group Lesson — 3 Days (Mon–Fri 10:00–12:30)': 'Lezione di gruppo — 3 giorni (lun–ven 10:00–12:30)',
    'Group Lesson — 5 Days (Mon–Fri 10:00–12:30)': 'Lezione di gruppo — 5 giorni (lun–ven 10:00–12:30)',
    // hotels: price basis
    'Prices in € Per Person for 7 Nights': 'Prezzi in € a persona per 7 notti',
    'Prices in € Per Person for 7 nights Bed & Breakfast': 'Prezzi in € a persona per 7 notti con pernottamento e prima colazione',
    // hotels: rooms
    'Standard Room': 'Camera standard',
    'Luxury room': 'Camera Luxury',
    'Superior Room': 'Camera Superior',
    'Superior Room BB': 'Camera Superior B&B',
    'Deluxe Room BB': 'Camera Deluxe B&B',
    'Junior Suite BB': 'Junior Suite B&B',
    'Classic Double HB': 'Doppia Classic, mezza pensione',
    'Classic Double B&B': 'Doppia Classic, B&B',
    'Superior Double HB': 'Doppia Superior, mezza pensione',
    'Superior Double B&B': 'Doppia Superior, B&B',
    'Superior Cervino HB': 'Superior Cervino, mezza pensione',
    'Superior Cervino B&B': 'Superior Cervino, B&B',
    'Standard Room B&B': 'Camera standard B&B',
    'Suite Room B&B': 'Suite B&B',
    // hotels: child policy labels
    'Under 12 (3rd bed) — 20% off': 'Sotto i 12 anni (3º letto) — sconto del 20%',
    '12+ (3rd bed) — 10% off': 'Dai 12 anni (3º letto) — sconto del 10%',
    '0–3 yrs, in cot — €20/night (+ meals)': '0–3 anni, nel lettino — €20 a notte (+ pasti)',
    '4–6 yrs — 50% off': '4–6 anni — sconto del 50%',
    '7+ yrs (3rd/4th bed) — 35% off': 'Da 7 anni (3º/4º letto) — sconto del 35%',
    // hotels: notes
    '• €1.50 tourist tax per person to be paid to hotel on arrival for Standard Room':
      "• Tassa di soggiorno di €1,50 a persona da pagare in hotel all'arrivo per la camera standard",
    '• No tourist tax payable on Luxury Room (hotel will pay)':
      "• Nessuna tassa di soggiorno da pagare per la camera Luxury (la paga l'hotel)",
    '• Minimum stay 7 nights': '• Soggiorno minimo 7 notti',
    '• Half Board': '• Mezza pensione',
    '• Tourist tax of €1-€2 per person per night not included (Pay hotel direct on arrival)':
      "• Tassa di soggiorno di €1-€2 a persona a notte non inclusa (da pagare direttamente in hotel all'arrivo)",
    '• Third Bed: discount of 20% for children under 12': '• Terzo letto: sconto del 20% per i bambini sotto i 12 anni',
    '• Third Bed: discount of 10% for children over 12': '• Terzo letto: sconto del 10% per i ragazzi sopra i 12 anni',
    '• Supplement DUS 30%': '• Supplemento camera doppia uso singola (DUS) 30%',
    '- 3rd and 4th beds sharing the room with 2 adults:': '- 3º e 4º letto nella camera con 2 adulti:',
    '- From 0 to 3 years in a cot - €20 p/day (plus eventual meals)': '- Da 0 a 3 anni nel lettino: €20 al giorno (più eventuali pasti)',
    '- From 4 to 6 years - 50% discount': '- Da 4 a 6 anni: sconto del 50%',
    '- From 7 years and for 3-4 Adults: 35% discount': '- Da 7 anni in su e per 3-4 adulti: sconto del 35%',
    '- Access to the Wellness Centre is included in the rates.': "- L'accesso al centro benessere è incluso nelle tariffe.",
    '- The Wellness area includes .Swimming Pool, Whirlpool, Kneipp pool, Vitarium,':
      "- L'area benessere comprende piscina, idromassaggio, vasca Kneipp, Vitarium,",
    'as well as the Turkish bath and Sauna': 'nonché bagno turco e sauna',
    '- Children are allowed from 6 years old.': '- I bambini sono ammessi dai 6 anni.',
    '- Access to the Sauna world is permitted from 16 years old.': "- L'accesso al mondo delle saune è consentito dai 16 anni.",
    '- Children from 6 to 12 years must be accompanied by an adult.': '- I bambini dai 6 ai 12 anni devono essere accompagnati da un adulto.',
    'CANCELLATION POLICY:': 'CONDIZIONI DI CANCELLAZIONE:',
    '• Till 30 days before the arrival: no penalty.': "• Fino a 30 giorni prima dell'arrivo: nessuna penale.",
    '• From 29 to 16 days: we keep 30% of the stay.': "• Da 29 a 16 giorni prima dell'arrivo: viene trattenuto il 30% dell'importo del soggiorno.",
    '• From 15 till 7 days: we keep 50% of the stay.': "• Da 15 a 7 giorni prima dell'arrivo: viene trattenuto il 50% dell'importo del soggiorno.",
    '• From 6 to the day of arrival: we keep the full amount of the stay.':
      "• Da 6 giorni prima dell'arrivo fino al giorno stesso: viene trattenuto l'intero importo del soggiorno.",
    '• Half board or B&B': '• Mezza pensione o B&B',
    '• The Tourism tax is not included in these prices.': '• La tassa di soggiorno non è inclusa in questi prezzi.',
    '• €1-€2 per day per person is payable to the hotel': "• €1-€2 al giorno a persona da pagare all'hotel",
    '• Bed & Breakfast': '• Pernottamento e prima colazione (B&B)',
    '• The Tourism tax is not included in these prices. €1-€2 per day per person is payable to the hotel':
      "• La tassa di soggiorno non è inclusa in questi prezzi. €1-€2 al giorno a persona da pagare all'hotel"
  };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const dateFmt = (locale) => (dateStr) =>
    new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const monthFmt = (locale) => (monthStr) =>
    cap(new Date(`${monthStr}T00:00:00Z`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }));

  // ---------- English (the base language: reproduces the original wording exactly) ----------
  const en = {
    code: 'en',
    money: (n) => Number(n).toFixed(2),
    d: (s) => s,
    fmtDate: dateFmt('en-GB'),
    monthLabel: monthFmt('en-GB'),
    days: (n) => `${n} day${n === 1 ? '' : 's'}`,
    nights: (n) => `${n} night${n === 1 ? '' : 's'}`,
    typeLabel: (type) => (type === 'shared' ? 'Shared Shuttle' : 'Scheduled Transfer'),
    directionLabel: (dir) => (dir === 'return' ? 'Return' : 'One-way'),
    names: {
      bookingFee: (airport) => `Transfer Booking Fee — ${airport}`,
      transferPrefix: (airport, typeLabel, dirLabel, guests) => `Airport Transfer — ${airport} (${typeLabel}, ${dirLabel}, ${guests} pax)`,
      equipment: (cat, item, days) => `${cat} — ${item} — ${days}`,
      pass: (tier, days, free) => `Ski Lift Pass — ${tier}, ${days}${free ? ' — Free (with adult pass)' : ''}`,
      lessonPrivate: (people, duration, season, time) =>
        `Private Lesson — ${people} people, ${duration} (${season === 'high' ? 'High Season' : `Low Season, ${time === 'lowAfternoon' ? 'Afternoon' : 'Morning'}`})`,
      lessonGroup: (label, season) => `${label} (${season === 'high' ? 'High Season' : 'Low Season'})`,
      hotelBase: (hotel, room, checkIn, checkOut, nights, fmtDate) =>
        `${hotel} — ${room}, ${fmtDate(checkIn)} – ${fmtDate(checkOut)} (${nights} night${nights === 1 ? '' : 's'})`,
      hotelAdults: (base, qty) => `${base} (${qty} adult${qty > 1 ? 's' : ''})`,
      hotelChildrenStd: (base, qty) => `${base} (${qty} child${qty > 1 ? 'ren' : ''}, standard rate)`,
      hotelChild: (base, tierLabel) => `${base} (Child: ${tierLabel})`
    },
    ui: {
      loadPricingError: 'Could not load pricing — is the server running?',
      loadHotelsError: 'Could not load hotel rates — is the server running?',
      stayingAt: 'Staying at', contact: 'Contact',
      paxLuggage: (n) => `${n} pax w/ luggage`,
      paxEquip: (n) => `${n} pax w/ ski/board equipment`,
      travelTime: (t) => `Travel time: approx. ${t}`,
      free: 'Free',
      people: (n) => `${n} ${n === 1 ? 'person' : 'people'}`,
      morning: 'Morning', afternoon: 'Afternoon',
      selectCheckIn: 'Select your check-in date.',
      checkInSelected: (d) => `Check-in: ${d} — now select your check-out date.`,
      rangeSummary: (a, b, n) => `${a} → ${b} · ${n} night${n > 1 ? 's' : ''}`,
      noChildDiscount: 'No child discount at this property — children are charged at the standard adult rate.',
      childN: (i) => `Child ${i}:`,
      minNights: (n) => `This hotel requires a minimum stay of ${n} nights — please select a longer date range.`,
      basketEmpty: 'Your basket is empty — add some items to get started.',
      remove: 'Remove',
      fxNote: (cur, eur) => `${cur} shown for reference — your quote will be confirmed in euros (${eur} total).`,
      completeTrip: 'Complete your trip',
      cats: { stay: 'Stay', transfer: 'Transfer', equipment: 'Equipment', pass: 'Lift Pass', lessons: 'Lessons' },
      feeNote: (fee) => `+ ${fee} booking fee, added as a separate line when you add this to your basket.`,
      keyCardNote: (fee) => `Price includes a ${fee} key card charge (waived on free child passes).`,
      errBasketEmpty: 'Your basket is empty.',
      errName: 'Please enter a name for the booking.',
      errEmail: 'Please enter a valid email address.',
      sending: 'Sending your enquiry…',
      sendFailed: 'Could not send your enquiry.',
      sendBtn: 'Send Enquiry',
      successPath: '/shop/success.html'
    },
    errors: {
      basketEmpty: 'Your basket is empty.',
      basketTooLarge: 'Your basket is too large — please send it in two enquiries.',
      basketStale: 'Something in your basket looks out of date — please refresh the page and add it again.',
      needName: 'Please enter a name for the enquiry.',
      needEmail: 'Please enter a valid email address.',
      tooMany: 'Too many enquiries just now — please wait a while, or WhatsApp us directly.',
      sendFailed: 'Could not send your enquiry. Please try again or WhatsApp us directly.'
    }
  };

  // ---------- Italian ----------
  const it = {
    code: 'it',
    money: (n) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    d: (s) => IT_DATA[s] || s,
    fmtDate: dateFmt('it-IT'),
    monthLabel: monthFmt('it-IT'),
    days: (n) => `${n} giorn${n === 1 ? 'o' : 'i'}`,
    nights: (n) => `${n} nott${n === 1 ? 'e' : 'i'}`,
    typeLabel: (type) => (type === 'shared' ? 'Navetta condivisa' : 'Transfer privato'),
    directionLabel: (dir) => (dir === 'return' ? 'andata e ritorno' : 'solo andata'),
    names: {
      bookingFee: (airport) => `Quota di prenotazione transfer — ${airport}`,
      transferPrefix: (airport, typeLabel, dirLabel, guests) => `Transfer aeroportuale — ${airport} (${typeLabel}, ${dirLabel}, ${guests} pers.)`,
      equipment: (cat, item, days) => `${cat} — ${item} — ${days}`,
      pass: (tier, days, free) => `Skipass — ${tier}, ${days}${free ? ' — gratis con skipass adulto' : ''}`,
      lessonPrivate: (people, duration, season, time) =>
        `Lezione privata — ${people} ${Number(people) === 1 ? 'persona' : 'persone'}, ${duration.charAt(0).toLowerCase() + duration.slice(1)} (${season === 'high' ? 'alta stagione' : `bassa stagione, ${time === 'lowAfternoon' ? 'pomeriggio' : 'mattina'}`})`,
      lessonGroup: (label, season) => `${label} — ${season === 'high' ? 'alta stagione' : 'bassa stagione'}`,
      hotelBase: (hotel, room, checkIn, checkOut, nights, fmtDate) =>
        `${hotel} — ${room}, ${fmtDate(checkIn)} – ${fmtDate(checkOut)} (${nights} nott${nights === 1 ? 'e' : 'i'})`,
      hotelAdults: (base, qty) => base.replace(/\)$/, `, ${qty} adult${qty > 1 ? 'i' : 'o'})`),
      hotelChildrenStd: (base, qty) => base.replace(/\)$/, `, ${qty} bambin${qty > 1 ? 'i' : 'o'}, tariffa standard)`),
      hotelChild: (base, tierLabel) => base.replace(/\)$/, `, bambino: ${lc(tierLabel)})`)
    },
    ui: {
      loadPricingError: 'Impossibile caricare i prezzi. Riprovate tra poco.',
      loadHotelsError: 'Impossibile caricare le tariffe degli hotel. Riprovate tra poco.',
      stayingAt: 'Alloggio', contact: 'Telefono',
      paxLuggage: (n) => `${n} pers. con bagagli`,
      paxEquip: (n) => `${n} pers. con attrezzatura da sci/snowboard`,
      travelTime: (t) => `Tempo di percorrenza: circa ${t}`,
      free: 'Gratis',
      people: (n) => `${n} ${n === 1 ? 'persona' : 'persone'}`,
      morning: 'Mattina', afternoon: 'Pomeriggio',
      selectCheckIn: 'Selezionate la data di arrivo.',
      checkInSelected: (d) => `Arrivo: ${d}. Ora selezionate la data di partenza.`,
      rangeSummary: (a, b, n) => `${a} → ${b} · ${n} nott${n > 1 ? 'i' : 'e'}`,
      noChildDiscount: 'Nessuna riduzione per i bambini in questa struttura: pagano la tariffa adulti standard.',
      childN: (i) => `Bambino ${i}:`,
      minNights: (n) => `Questo hotel richiede un soggiorno minimo di ${n} notti: selezionate un periodo più lungo.`,
      basketEmpty: 'Il carrello è vuoto: aggiungete qualcosa per iniziare.',
      remove: 'Rimuovi',
      fxNote: (cur, eur) => `Importi in ${cur} mostrati solo a titolo indicativo: il vostro preventivo sarà confermato in euro (totale ${eur}).`,
      completeTrip: 'Completate il vostro viaggio',
      cats: { stay: 'Soggiorno', transfer: 'Transfer', equipment: 'Attrezzatura', pass: 'Skipass', lessons: 'Lezioni' },
      feeNote: (fee) => `+ ${fee} di quota di prenotazione, aggiunta come riga separata quando inserite il transfer nel carrello.`,
      keyCardNote: (fee) => `Il prezzo include ${fee} per la key card (non dovuti per gli skipass gratuiti dei bambini).`,
      errBasketEmpty: 'Il carrello è vuoto.',
      errName: 'Inserite un nome per la richiesta.',
      errEmail: 'Inserite un indirizzo email valido.',
      sending: 'Invio della richiesta in corso…',
      sendFailed: 'Impossibile inviare la richiesta.',
      sendBtn: 'Invia richiesta',
      successPath: '/shop/it/success.html'
    },
    errors: {
      basketEmpty: 'Il carrello è vuoto.',
      basketTooLarge: 'Il carrello contiene troppi articoli: inviate due richieste separate.',
      basketStale: 'Qualcosa nel carrello potrebbe non essere più aggiornato: ricaricate la pagina e aggiungetelo di nuovo.',
      needName: 'Inserite un nome per la richiesta.',
      needEmail: 'Inserite un indirizzo email valido.',
      tooMany: 'Troppe richieste in questo momento: attendete qualche minuto oppure scriveteci direttamente su WhatsApp.',
      sendFailed: 'Impossibile inviare la richiesta. Riprovate oppure scriveteci direttamente su WhatsApp.'
    }
  };

  const packs = { en, it };
  const get = (code) => packs[code] || en;
  return { packs, get, en, it, IT_DATA };
});
