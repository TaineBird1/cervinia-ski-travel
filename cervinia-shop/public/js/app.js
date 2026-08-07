(() => {
  const state = {
    pricing: null,
    hotels: null,
    basket: JSON.parse(localStorage.getItem('cervinia_basket') || '[]'),
    transfer: { airport: null, type: null, guests: 1 },
    equip: { catIndex: 0, itemIndex: 0, days: 1 },
    pass: { tierIndex: 0, days: 1, guests: 1, childFree: false },
    lesson: {
      type: 'private',
      people: 1,
      duration: '2 hours',
      season: 'low',
      time: 'lowMorning',
      groupId: null,
      groupSeason: 'low',
      groupGuests: 1
    },
    hotel: {
      name: null, roomIndex: 0, guests: 1, children: 0, childRateIndexes: [],
      checkIn: null, checkOut: null, calMonth: null
    }
  };

  const fmt = (n) => `€${Number(n).toFixed(2)}`;

  fetch('/api/pricing')
    .then((r) => r.json())
    .then((pricing) => {
      state.pricing = pricing;
      initTransfers();
      initEquipment();
      initPasses();
      initLessons();
      renderBasket();
    })
    .catch(() => {
      document.querySelectorAll('.cat-section').forEach((s) => {
        const sub = s.querySelector('.section-sub');
        if (sub && s.id !== 'accommodation') sub.textContent = 'Could not load pricing — is the server running?';
      });
    });

  fetch('/api/hotels')
    .then((r) => r.json())
    .then((data) => {
      state.hotels = data.hotels;
      initAccommodation();
    })
    .catch(() => {
      const sub = document.getElementById('hotelPriceBasisNote');
      if (sub) sub.textContent = 'Could not load hotel rates — is the server running?';
    });

  // ---------- helpers ----------
  function buildButtons(container, labels, activeIndex, onClick) {
    container.innerHTML = '';
    labels.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt-btn' + (i === activeIndex ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onClick(i);
      });
      container.appendChild(btn);
    });
  }

  function sortedDayKeys(obj) {
    return Object.keys(obj).sort((a, b) => Number(a) - Number(b));
  }

  function setupStepper(el, valueEl, onChange, min = 1, max = 20, initial = 1) {
    let value = initial;
    valueEl.textContent = value;
    function setValue(v) {
      value = Math.min(max, Math.max(min, v));
      valueEl.textContent = value;
    }
    el.querySelectorAll('.step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setValue(value + Number(btn.dataset.step));
        onChange(value);
      });
    });
    return { get: () => value, set: setValue };
  }

  // ---------- Transfers ----------
  // Rates are PER GROUP, not per person: shared shuttles are priced per
  // headcount (1-8), private transfers are priced per group in two tiers
  // (1-2 pax / 3-8 pax). "Guests" selects which price applies rather than
  // multiplying a per-person rate.
  function initTransfers() {
    document.getElementById('transferNote').textContent = state.pricing.transfers.notes || '';

    document.getElementById('transferTypeBtns').querySelectorAll('.opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('transferTypeBtns').querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.transfer.type = btn.dataset.type;
        state.transfer.airport = null;
        renderTransferAirports();
        updateTransferPrice();
      });
    });
    state.transfer.type = 'shared';
    renderTransferAirports();

    setupStepper(
      document.getElementById('transferGuestsStepper'),
      document.getElementById('transferGuestsValue'),
      (v) => { state.transfer.guests = v; updateTransferPrice(); },
      1,
      8
    );

    updateTransferPrice();

    document.getElementById('transferAddBtn').addEventListener('click', () => {
      const opt = currentTransferOption();
      const unitPrice = currentTransferPrice();
      if (!opt || unitPrice == null) return;
      const typeLabel = state.transfer.type === 'shared' ? 'Shared Shuttle' : 'Scheduled Transfer';
      addToBasket({
        id: `transfer-${state.transfer.type}-${opt.airport}-${state.transfer.guests}`,
        name: `Airport Transfer — ${opt.airport} (${typeLabel}, ${state.transfer.guests} pax)`,
        unitPrice,
        qty: 1
      });
    });
  }

  function renderTransferAirports() {
    const list = state.pricing.transfers[state.transfer.type].options;
    const airports = list.map((o) => o.airport);
    buildButtons(document.getElementById('transferAirportBtns'), airports, 0, (i) => {
      state.transfer.airport = airports[i];
      updateTransferPrice();
    });
    state.transfer.airport = airports[0];
  }

  function currentTransferOption() {
    const list = state.pricing.transfers[state.transfer.type].options;
    return list.find((o) => o.airport === state.transfer.airport) || null;
  }

  function currentTransferPrice() {
    const opt = currentTransferOption();
    if (!opt) return null;
    if (state.transfer.type === 'shared') {
      const price = opt.pricesByPax[String(state.transfer.guests)];
      return price == null ? null : price;
    }
    return state.transfer.guests <= 2 ? opt.price1to2 : opt.price3to8;
  }

  function updateTransferPrice() {
    const opt = currentTransferOption();
    const price = currentTransferPrice();
    const addBtn = document.getElementById('transferAddBtn');
    const note = document.getElementById('transferUnavailable');
    const timeNote = document.getElementById('transferTravelTime');

    if (price == null) {
      document.getElementById('transferPrice').textContent = '—';
      addBtn.disabled = true;
      note.style.display = 'block';
    } else {
      document.getElementById('transferPrice').textContent = fmt(price);
      addBtn.disabled = false;
      note.style.display = 'none';
    }
    timeNote.textContent = opt && opt.travelTime ? `Travel time: approx. ${opt.travelTime.replace('h', 'h ')}` : '';
  }

  // ---------- Equipment ----------
  function initEquipment() {
    const categories = state.pricing.equipment.categories;
    buildButtons(document.getElementById('equipCategoryBtns'), categories, 0, (i) => {
      state.equip.catIndex = i;
      state.equip.itemIndex = 0;
      renderEquipItems();
      renderEquipDays();
      updateEquipPrice();
    });

    renderEquipItems();
    renderEquipDays();
    updateEquipPrice();

    document.getElementById('equipAddBtn').addEventListener('click', () => {
      const price = currentEquipPrice();
      if (price == null) return;
      const cat = state.pricing.equipment.categories[state.equip.catIndex];
      const item = state.pricing.equipment.data[cat].items[state.equip.itemIndex];
      addToBasket({
        id: `equip-${state.equip.catIndex}-${state.equip.itemIndex}-${state.equip.days}`,
        name: `${cat} — ${item} — ${state.equip.days} day${state.equip.days > 1 ? 's' : ''}`,
        unitPrice: price,
        qty: 1
      });
    });
  }

  function renderEquipItems() {
    const cat = state.pricing.equipment.categories[state.equip.catIndex];
    const items = state.pricing.equipment.data[cat].items;
    buildButtons(document.getElementById('equipItemBtns'), items, state.equip.itemIndex, (i) => {
      state.equip.itemIndex = i;
      updateEquipPrice();
    });
  }

  function renderEquipDays() {
    const cat = state.pricing.equipment.categories[state.equip.catIndex];
    const dayKeys = sortedDayKeys(state.pricing.equipment.data[cat].pricesByDays);
    if (!dayKeys.includes(String(state.equip.days))) state.equip.days = Number(dayKeys[0]);
    buildButtons(
      document.getElementById('equipDaysBtns'),
      dayKeys.map((d) => `${d} day${d > 1 ? 's' : ''}`),
      dayKeys.indexOf(String(state.equip.days)),
      (i) => { state.equip.days = Number(dayKeys[i]); updateEquipPrice(); }
    );
  }

  function currentEquipPrice() {
    const cat = state.pricing.equipment.categories[state.equip.catIndex];
    const row = state.pricing.equipment.data[cat].pricesByDays[String(state.equip.days)];
    return row ? row[state.equip.itemIndex] : null;
  }

  function updateEquipPrice() {
    const price = currentEquipPrice();
    const addBtn = document.getElementById('equipAddBtn');
    const note = document.getElementById('equipUnavailable');
    if (price == null) {
      document.getElementById('equipPrice').textContent = '—';
      addBtn.disabled = true;
      note.style.display = 'block';
    } else {
      document.getElementById('equipPrice').textContent = fmt(price);
      addBtn.disabled = false;
      note.style.display = 'none';
    }
  }

  // ---------- Lift Passes ----------
  function initPasses() {
    const tiers = state.pricing.liftPasses.tiers;
    const childTierIndex = tiers.indexOf('Child (U8)');
    const childFreeGroup = document.getElementById('passChildFreeGroup');
    const childFreeCheck = document.getElementById('passChildFreeCheck');

    function syncChildFreeVisibility() {
      const isChildTier = state.pass.tierIndex === childTierIndex;
      childFreeGroup.style.display = isChildTier ? 'block' : 'none';
      if (!isChildTier) {
        state.pass.childFree = false;
        childFreeCheck.checked = false;
      }
    }

    buildButtons(document.getElementById('passTierBtns'), tiers, 0, (i) => {
      state.pass.tierIndex = i;
      syncChildFreeVisibility();
      updatePassPrice();
    });
    syncChildFreeVisibility();

    childFreeCheck.addEventListener('change', () => {
      state.pass.childFree = childFreeCheck.checked;
      updatePassPrice();
    });

    const dayKeys = sortedDayKeys(state.pricing.liftPasses.pricesByDays);
    buildButtons(
      document.getElementById('passDaysBtns'),
      dayKeys.map((d) => `${d} day${d > 1 ? 's' : ''}`),
      0,
      (i) => { state.pass.days = Number(dayKeys[i]); updatePassPrice(); }
    );
    state.pass.days = Number(dayKeys[0]);

    document.getElementById('passSeasonNote').textContent = state.pricing.liftPasses.season || '';
    document.getElementById('passZermattNote').textContent = state.pricing.liftPasses.notes || '';

    setupStepper(
      document.getElementById('passGuestsStepper'),
      document.getElementById('passGuestsValue'),
      (v) => { state.pass.guests = v; updatePassPrice(); }
    );

    updatePassPrice();

    document.getElementById('passAddBtn').addEventListener('click', () => {
      const unitPrice = currentPassUnitPrice();
      if (unitPrice == null) return;
      const tierLabel = state.pricing.liftPasses.tiers[state.pass.tierIndex];
      const freeSuffix = state.pass.childFree ? ' — Free (with adult pass)' : '';
      addToBasket({
        id: `pass-${state.pass.tierIndex}-${state.pass.days}${state.pass.childFree ? '-free' : ''}`,
        name: `Ski Lift Pass — ${tierLabel}, ${state.pass.days} day${state.pass.days > 1 ? 's' : ''}${freeSuffix}`,
        unitPrice,
        qty: state.pass.guests
      });
    });
  }

  function currentPassUnitPrice() {
    if (state.pass.childFree) return 0;
    const row = state.pricing.liftPasses.pricesByDays[String(state.pass.days)];
    return row ? row[state.pass.tierIndex] : null;
  }

  function updatePassPrice() {
    const unit = currentPassUnitPrice();
    const total = unit == null ? null : unit * state.pass.guests;
    document.getElementById('passPrice').textContent =
      total == null ? '—' : state.pass.childFree ? 'Free' : fmt(total);
    document.getElementById('passAddBtn').disabled = total == null;
  }

  // ---------- Lessons ----------
  function initLessons() {
    document.getElementById('lessonSeasonNote').textContent = state.pricing.lessons.seasonNote || '';

    const typeBtns = document.getElementById('lessonTypeBtns');
    typeBtns.querySelectorAll('.opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        typeBtns.querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.lesson.type = btn.dataset.type;
        document.getElementById('lessonPrivatePanel').style.display = state.lesson.type === 'private' ? 'block' : 'none';
        document.getElementById('lessonGroupPanel').style.display = state.lesson.type === 'group' ? 'block' : 'none';
        updateLessonPrice();
      });
    });

    // Private panel
    const people = state.pricing.lessons.private.peopleOptions;
    buildButtons(document.getElementById('lessonPeopleBtns'), people.map((p) => `${p} ${p === 1 ? 'person' : 'people'}`), 0, (i) => {
      state.lesson.people = people[i];
      renderLessonTimes();
      updateLessonPrice();
    });

    const durations = state.pricing.lessons.private.durations;
    buildButtons(document.getElementById('lessonDurationBtns'), durations, 0, (i) => {
      state.lesson.duration = durations[i];
      renderLessonTimes();
      updateLessonPrice();
    });

    document.getElementById('lessonSeasonBtns').querySelectorAll('.opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('lessonSeasonBtns').querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.lesson.season = btn.dataset.season;
        renderLessonTimes();
        updateLessonPrice();
      });
    });

    renderLessonTimes();

    // Group panel
    const groupOptions = state.pricing.lessons.group;
    buildButtons(document.getElementById('lessonGroupOptionBtns'), groupOptions.map((g) => g.label), 0, (i) => {
      state.lesson.groupId = groupOptions[i].id;
      updateLessonPrice();
    });
    state.lesson.groupId = groupOptions[0]?.id;

    document.getElementById('lessonGroupSeasonBtns').querySelectorAll('.opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('lessonGroupSeasonBtns').querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.lesson.groupSeason = btn.dataset.season;
        updateLessonPrice();
      });
    });

    setupStepper(
      document.getElementById('lessonGroupGuestsStepper'),
      document.getElementById('lessonGroupGuestsValue'),
      (v) => { state.lesson.groupGuests = v; updateLessonPrice(); }
    );

    updateLessonPrice();

    document.getElementById('lessonAddBtn').addEventListener('click', () => {
      if (state.lesson.type === 'private') {
        const price = currentPrivateLessonPrice();
        if (price == null) return;
        const seasonLabel = state.lesson.season === 'high' ? 'High Season' : `Low Season, ${state.lesson.time === 'lowAfternoon' ? 'Afternoon' : 'Morning'}`;
        addToBasket({
          id: `lesson-private-${state.lesson.people}-${state.lesson.duration}-${state.lesson.season}-${state.lesson.time}`,
          name: `Private Lesson — ${state.lesson.people} people, ${state.lesson.duration} (${seasonLabel})`,
          unitPrice: price,
          qty: 1
        });
      } else {
        const price = currentGroupLessonPrice();
        if (price == null) return;
        const g = state.pricing.lessons.group.find((g) => g.id === state.lesson.groupId);
        const seasonLabel = state.lesson.groupSeason === 'high' ? 'High Season' : 'Low Season';
        addToBasket({
          id: `lesson-group-${g.id}-${state.lesson.groupSeason}`,
          name: `${g.label} (${seasonLabel})`,
          unitPrice: price,
          qty: state.lesson.groupGuests
        });
      }
    });
  }

  function renderLessonTimes() {
    const rates = state.pricing.lessons.private.rates[String(state.lesson.people)];
    const durationRates = rates ? rates[state.lesson.duration] : null;
    const timeGroup = document.getElementById('lessonTimeGroup');

    if (state.lesson.season === 'high' || !durationRates) {
      timeGroup.style.display = 'none';
      state.lesson.time = 'high';
      return;
    }

    const options = [];
    if (durationRates.lowMorning != null) options.push({ key: 'lowMorning', label: 'Morning' });
    if (durationRates.lowAfternoon != null) options.push({ key: 'lowAfternoon', label: 'Afternoon' });

    if (options.length === 0) {
      timeGroup.style.display = 'none';
      return;
    }
    timeGroup.style.display = 'block';
    if (!options.find((o) => o.key === state.lesson.time)) {
      state.lesson.time = options[0].key;
    }
    buildButtons(
      document.getElementById('lessonTimeBtns'),
      options.map((o) => o.label),
      options.findIndex((o) => o.key === state.lesson.time),
      (i) => { state.lesson.time = options[i].key; updateLessonPrice(); }
    );
  }

  function currentPrivateLessonPrice() {
    const rates = state.pricing.lessons.private.rates[String(state.lesson.people)];
    const durationRates = rates ? rates[state.lesson.duration] : null;
    if (!durationRates) return null;
    if (state.lesson.season === 'high') return durationRates.high;
    return durationRates[state.lesson.time];
  }

  function currentGroupLessonPrice() {
    const g = state.pricing.lessons.group.find((g) => g.id === state.lesson.groupId);
    if (!g) return null;
    const per = state.lesson.groupSeason === 'high' ? g.high : g.low;
    return per == null ? null : per * state.lesson.groupGuests;
  }

  function updateLessonPrice() {
    const note = document.getElementById('lessonUnavailable');
    const addBtn = document.getElementById('lessonAddBtn');
    let total = null;

    if (state.lesson.type === 'private') {
      total = currentPrivateLessonPrice();
    } else {
      total = currentGroupLessonPrice();
    }

    if (total == null) {
      document.getElementById('lessonPrice').textContent = '—';
      addBtn.disabled = true;
      note.style.display = 'block';
    } else {
      document.getElementById('lessonPrice').textContent = fmt(total);
      addBtn.disabled = false;
      note.style.display = 'none';
    }
  }

  // ---------- Accommodation ----------
  // Hotels quote fixed weekly package rates (see notes: several require a
  // minimum 7-night stay). The calendar below lets guests pick any check-in/
  // check-out date, so nightly rates are derived by dividing each quoted
  // week's price by 7 and summing across the selected range — that nightly
  // figure was never quoted by the hotel directly.
  function initAccommodation() {
    const hotelNames = Object.keys(state.hotels);
    let childrenStepper;

    buildButtons(document.getElementById('hotelNameBtns'), hotelNames, 0, (i) => {
      state.hotel.name = hotelNames[i];
      state.hotel.roomIndex = 0;
      state.hotel.checkIn = null;
      state.hotel.checkOut = null;
      state.hotel.calMonth = null;
      state.hotel.children = 0;
      state.hotel.childRateIndexes = [];
      if (childrenStepper) childrenStepper.set(0);
      renderHotelCalendar();
      renderHotelRooms();
      renderHotelNotes();
      renderChildRates();
      updateHotelPrice();
    });
    state.hotel.name = hotelNames[0];

    renderHotelCalendar();
    renderHotelRooms();
    renderHotelNotes();

    document.getElementById('calPrev').addEventListener('click', () => shiftCalMonth(-1));
    document.getElementById('calNext').addEventListener('click', () => shiftCalMonth(1));

    setupStepper(
      document.getElementById('hotelGuestsStepper'),
      document.getElementById('hotelGuestsValue'),
      (v) => { state.hotel.guests = v; updateHotelPrice(); },
      1,
      10
    );

    childrenStepper = setupStepper(
      document.getElementById('hotelChildrenStepper'),
      document.getElementById('hotelChildrenValue'),
      (v) => {
        state.hotel.children = v;
        syncChildRateCount();
        renderChildRates();
        updateHotelPrice();
      },
      0,
      6,
      0
    );

    renderChildRates();
    updateHotelPrice();

    document.getElementById('hotelAddBtn').addEventListener('click', () => {
      const hotel = state.hotels[state.hotel.name];
      const { checkIn, checkOut } = state.hotel;
      if (!checkIn || !checkOut) return;
      const nights = dateDiffNights(checkIn, checkOut);
      const minNights = hotel.minNights || 1;
      const adultUnitTotal = rangeAdultUnitTotal(hotel, state.hotel.roomIndex, checkIn, checkOut);
      if (adultUnitTotal == null || nights < minNights) return;

      const roomName = hotel.rooms[state.hotel.roomIndex];
      const label = `${fmtDate(checkIn)} – ${fmtDate(checkOut)} (${nights} night${nights > 1 ? 's' : ''})`;

      addToBasket({
        id: `hotel-${state.hotel.name}-${checkIn}-${checkOut}-${state.hotel.roomIndex}`,
        name: `${state.hotel.name} — ${roomName}, ${label} (${state.hotel.guests} adult${state.hotel.guests > 1 ? 's' : ''})`,
        unitPrice: adultUnitTotal,
        qty: state.hotel.guests
      });

      if (state.hotel.children > 0) {
        const policy = hotel.childPolicy;
        if (!policy || policy.length === 0) {
          addToBasket({
            id: `hotel-${state.hotel.name}-${checkIn}-${checkOut}-${state.hotel.roomIndex}-children`,
            name: `${state.hotel.name} — ${roomName}, ${label} (${state.hotel.children} child${state.hotel.children > 1 ? 'ren' : ''}, standard rate)`,
            unitPrice: adultUnitTotal,
            qty: state.hotel.children
          });
        } else {
          const counts = {};
          state.hotel.childRateIndexes.forEach((idx) => { counts[idx] = (counts[idx] || 0) + 1; });
          Object.entries(counts).forEach(([idxStr, qty]) => {
            const idx = Number(idxStr);
            const tier = policy[idx] || policy[0];
            const cost = childTierCost(tier, adultUnitTotal, nights);
            addToBasket({
              id: `hotel-${state.hotel.name}-${checkIn}-${checkOut}-${state.hotel.roomIndex}-child-${idx}`,
              name: `${state.hotel.name} — ${roomName}, ${label} (Child: ${tier.label})`,
              unitPrice: cost,
              qty
            });
          });
        }
      }
    });
  }

  function syncChildRateCount() {
    const arr = state.hotel.childRateIndexes;
    while (arr.length < state.hotel.children) arr.push(0);
    arr.length = state.hotel.children;
  }

  function renderChildRates() {
    const container = document.getElementById('hotelChildRates');
    const hotel = state.hotels[state.hotel.name];
    const policy = hotel.childPolicy;
    container.innerHTML = '';
    if (state.hotel.children === 0) return;

    if (!policy || policy.length === 0) {
      const note = document.createElement('p');
      note.className = 'child-rate-note';
      note.textContent = 'No child discount at this property — children are charged at the standard adult rate.';
      container.appendChild(note);
      return;
    }

    for (let i = 0; i < state.hotel.children; i++) {
      const row = document.createElement('div');
      row.className = 'child-rate-row';
      const label = document.createElement('span');
      label.textContent = `Child ${i + 1}:`;
      const select = document.createElement('select');
      policy.forEach((tier, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = tier.label;
        select.appendChild(opt);
      });
      select.value = String(state.hotel.childRateIndexes[i] || 0);
      select.addEventListener('change', () => {
        state.hotel.childRateIndexes[i] = Number(select.value);
        updateHotelPrice();
      });
      row.appendChild(label);
      row.appendChild(select);
      container.appendChild(row);
    }
  }

  function childTierCost(tier, adultUnitTotal, nights) {
    switch (tier.mode) {
      case 'free': return 0;
      case 'flatPerNight': return tier.amount * nights;
      case 'percentOff': return adultUnitTotal * (1 - tier.amount / 100);
      default: return adultUnitTotal;
    }
  }

  function currentHotelChildrenCost(adultUnitTotal, nights) {
    if (state.hotel.children === 0) return 0;
    const hotel = state.hotels[state.hotel.name];
    const policy = hotel.childPolicy;
    if (!policy || policy.length === 0) return adultUnitTotal * state.hotel.children;
    return state.hotel.childRateIndexes.reduce(
      (sum, idx) => sum + childTierCost(policy[idx] || policy[0], adultUnitTotal, nights),
      0
    );
  }

  // ---- date / calendar helpers ----
  function hotelSeasonRange(hotel) {
    const weeks = hotel.weeks;
    return { min: weeks[0].arrival, max: weeks[weeks.length - 1].departure };
  }

  function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function dateDiffNights(checkIn, checkOut) {
    const a = new Date(`${checkIn}T00:00:00`);
    const b = new Date(`${checkOut}T00:00:00`);
    return Math.round((b - a) / 86400000);
  }

  function isoMonth(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function fmtDate(dateStr) {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function nightlyRateForDate(hotel, roomIndex, dateStr) {
    const week = hotel.weeks.find((w) => dateStr >= w.arrival && dateStr < w.departure);
    if (!week) return null;
    const weekPrice = week.prices[roomIndex];
    return weekPrice == null ? null : weekPrice / 7;
  }

  function rangeAdultUnitTotal(hotel, roomIndex, checkIn, checkOut) {
    const n = dateDiffNights(checkIn, checkOut);
    if (n <= 0) return null;
    let total = 0;
    let cursor = checkIn;
    for (let i = 0; i < n; i++) {
      const rate = nightlyRateForDate(hotel, roomIndex, cursor);
      if (rate == null) return null;
      total += rate;
      cursor = addDays(cursor, 1);
    }
    return total;
  }

  function shiftCalMonth(delta) {
    const hotel = state.hotels[state.hotel.name];
    const { min, max } = hotelSeasonRange(hotel);
    const d = new Date(`${state.hotel.calMonth}T00:00:00`);
    d.setMonth(d.getMonth() + delta);
    const next = isoMonth(d);
    if (next < min.slice(0, 7) + '-01' || next > max.slice(0, 7) + '-01') return;
    state.hotel.calMonth = next;
    renderHotelCalendar();
  }

  function renderHotelCalendar() {
    const hotel = state.hotels[state.hotel.name];
    const { min, max } = hotelSeasonRange(hotel);
    if (!state.hotel.calMonth) state.hotel.calMonth = min.slice(0, 7) + '-01';

    const monthDate = new Date(`${state.hotel.calMonth}T00:00:00`);
    document.getElementById('calMonthLabel').textContent =
      monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const year = monthDate.getFullYear();
    const monthIdx = monthDate.getMonth();
    const firstOfMonth = new Date(year, monthIdx, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    for (let i = 0; i < startWeekday; i++) {
      grid.appendChild(document.createElement('span'));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = d;

      const inSeason = dateStr >= min && dateStr <= max;
      if (!inSeason) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => selectCalendarDay(dateStr));
      }

      if (state.hotel.checkIn === dateStr) btn.classList.add('cal-checkin');
      if (state.hotel.checkOut === dateStr) btn.classList.add('cal-checkout');
      if (state.hotel.checkIn && state.hotel.checkOut && dateStr > state.hotel.checkIn && dateStr < state.hotel.checkOut) {
        btn.classList.add('cal-in-range');
      }

      grid.appendChild(btn);
    }

    document.getElementById('calPrev').disabled = state.hotel.calMonth <= min.slice(0, 7) + '-01';
    document.getElementById('calNext').disabled = state.hotel.calMonth >= max.slice(0, 7) + '-01';
  }

  function selectCalendarDay(dateStr) {
    if (!state.hotel.checkIn || state.hotel.checkOut) {
      state.hotel.checkIn = dateStr;
      state.hotel.checkOut = null;
    } else if (dateStr > state.hotel.checkIn) {
      state.hotel.checkOut = dateStr;
    } else {
      state.hotel.checkIn = dateStr;
      state.hotel.checkOut = null;
    }
    renderHotelCalendar();
    updateHotelPrice();
  }

  function renderCalSelectionSummary() {
    const el = document.getElementById('calSelectionSummary');
    if (!state.hotel.checkIn) {
      el.textContent = 'Select your check-in date.';
    } else if (!state.hotel.checkOut) {
      el.textContent = `Check-in: ${fmtDate(state.hotel.checkIn)} — now select your check-out date.`;
    } else {
      const n = dateDiffNights(state.hotel.checkIn, state.hotel.checkOut);
      el.textContent = `${fmtDate(state.hotel.checkIn)} → ${fmtDate(state.hotel.checkOut)} · ${n} night${n > 1 ? 's' : ''}`;
    }
  }

  function renderHotelRooms() {
    const hotel = state.hotels[state.hotel.name];
    buildButtons(document.getElementById('hotelRoomBtns'), hotel.rooms, state.hotel.roomIndex, (i) => {
      state.hotel.roomIndex = i;
      updateHotelPrice();
    });
  }

  function renderHotelNotes() {
    const hotel = state.hotels[state.hotel.name];
    document.getElementById('hotelPriceBasisNote').textContent = hotel.priceBasis;
    document.getElementById('hotelNotesList').innerHTML = hotel.notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('');
  }

  function updateHotelPrice() {
    const hotel = state.hotels[state.hotel.name];
    const priceEl = document.getElementById('hotelPrice');
    const addBtn = document.getElementById('hotelAddBtn');
    const note = document.getElementById('hotelUnavailable');
    const minNightsNote = document.getElementById('hotelMinNightsNote');
    renderCalSelectionSummary();

    const { checkIn, checkOut } = state.hotel;
    if (!checkIn || !checkOut) {
      priceEl.textContent = '—';
      addBtn.disabled = true;
      note.style.display = 'none';
      minNightsNote.style.display = 'none';
      return;
    }

    const nights = dateDiffNights(checkIn, checkOut);
    const adultUnitTotal = rangeAdultUnitTotal(hotel, state.hotel.roomIndex, checkIn, checkOut);

    if (adultUnitTotal == null) {
      priceEl.textContent = '—';
      addBtn.disabled = true;
      note.style.display = 'block';
      minNightsNote.style.display = 'none';
      return;
    }
    note.style.display = 'none';

    const minNights = hotel.minNights || 1;
    if (nights < minNights) {
      priceEl.textContent = '—';
      addBtn.disabled = true;
      minNightsNote.textContent = `This hotel requires a minimum stay of ${minNights} nights — please select a longer date range.`;
      minNightsNote.style.display = 'block';
      return;
    }
    minNightsNote.style.display = 'none';

    const total = adultUnitTotal * state.hotel.guests + currentHotelChildrenCost(adultUnitTotal, nights);
    priceEl.textContent = fmt(total);
    addBtn.disabled = false;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Basket ----------
  function addToBasket(item) {
    const existing = state.basket.find((b) => b.id === item.id);
    if (existing) {
      existing.qty += item.qty;
    } else {
      state.basket.push(item);
    }
    persistBasket();
    renderBasket();
    openBasket();
  }

  function removeFromBasket(id) {
    state.basket = state.basket.filter((b) => b.id !== id);
    persistBasket();
    renderBasket();
  }

  function persistBasket() {
    localStorage.setItem('cervinia_basket', JSON.stringify(state.basket));
  }

  function renderBasket() {
    const container = document.getElementById('basketItems');
    const emptyMsg = document.getElementById('basketEmpty');
    container.innerHTML = '';

    if (state.basket.length === 0) {
      container.appendChild(emptyMsg);
      emptyMsg.style.display = 'block';
    } else {
      state.basket.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'basket-item';
        row.innerHTML = `
          <div>
            <div class="basket-item-name">${item.name}</div>
            <div class="basket-item-meta">${item.qty} × €${item.unitPrice.toFixed(2)}</div>
          </div>
          <div class="basket-item-right">
            <div class="basket-item-price">${fmt(item.unitPrice * item.qty)}</div>
            <button class="basket-item-remove" data-id="${item.id}">Remove</button>
          </div>
        `;
        container.appendChild(row);
      });
      container.querySelectorAll('.basket-item-remove').forEach((btn) => {
        btn.addEventListener('click', () => removeFromBasket(btn.dataset.id));
      });
    }

    const total = state.basket.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    document.getElementById('basketTotal').textContent = fmt(total);
    const count = state.basket.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('basketCount').textContent = count;

    renderBasketNudge();
  }

  // "Complete your trip" nudge — shows which categories are already in the
  // basket and lets the customer jump straight to any they haven't added.
  const TRIP_CATEGORIES = [
    { prefix: 'transfer-', label: 'Transfer', target: 'transfers' },
    { prefix: 'equip-', label: 'Equipment', target: 'equipment' },
    { prefix: 'pass-', label: 'Lift Pass', target: 'passes' },
    { prefix: 'lesson-', label: 'Lessons', target: 'lessons' },
    { prefix: 'hotel-', label: 'Stay', target: 'accommodation' }
  ];

  function renderBasketNudge() {
    const el = document.getElementById('basketNudge');
    if (!el) return;
    if (state.basket.length === 0) {
      el.innerHTML = '';
      return;
    }

    const chips = TRIP_CATEGORIES.map((cat) => {
      const has = state.basket.some((item) => item.id.startsWith(cat.prefix));
      return has
        ? `<span class="nudge-chip done">✓ ${cat.label}</span>`
        : `<button type="button" class="nudge-chip missing" data-target="${cat.target}">+ ${cat.label}</button>`;
    }).join('');

    el.innerHTML = `<div class="basket-nudge-label">Complete your trip</div><div class="nudge-chips">${chips}</div>`;

    el.querySelectorAll('.nudge-chip.missing').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeBasket();
        document.getElementById(btn.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function openBasket() {
    document.getElementById('basketDrawer').classList.add('open');
    document.getElementById('basketOverlay').classList.add('open');
  }
  function closeBasket() {
    document.getElementById('basketDrawer').classList.remove('open');
    document.getElementById('basketOverlay').classList.remove('open');
  }

  document.getElementById('basketToggle').addEventListener('click', openBasket);
  document.getElementById('basketClose').addEventListener('click', closeBasket);
  document.getElementById('basketOverlay').addEventListener('click', closeBasket);

  // ---------- Checkout ----------
  document.getElementById('checkoutBtn').addEventListener('click', async () => {
    const errorEl = document.getElementById('checkoutError');
    errorEl.style.display = 'none';
    const customerName = document.getElementById('customerName').value.trim();

    if (state.basket.length === 0) {
      errorEl.textContent = 'Your basket is empty.';
      errorEl.style.display = 'block';
      return;
    }
    if (!customerName) {
      errorEl.textContent = 'Please enter a name for the booking.';
      errorEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    btn.textContent = 'Redirecting to secure checkout…';

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, items: state.basket })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Pay & Checkout';
    }
  });

  // ---------- Resort info dropdown ----------
  const infoDropdown = document.getElementById('infoDropdown');
  const infoDropdownBtn = document.getElementById('infoDropdownBtn');
  if (infoDropdown && infoDropdownBtn) {
    infoDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = infoDropdown.classList.toggle('open');
      infoDropdownBtn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
      if (!infoDropdown.contains(e.target)) {
        infoDropdown.classList.remove('open');
        infoDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Category nav ----------
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const sections = ['transfers', 'equipment', 'passes', 'lessons', 'accommodation'].map((id) => document.getElementById(id));
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.cat-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.target === entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  sections.forEach((s) => navObserver.observe(s));
})();
