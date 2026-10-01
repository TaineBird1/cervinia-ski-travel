// Highlight the current section's nav button as the page scrolls.
// Scoped to in-page anchors only — the Resort Info dropdown's links are
// external URLs, not section hashes, so they're excluded here.
const navButtons = document.querySelectorAll('.nav-buttons a[href^="#"]');
const sections = Array.from(navButtons)
  .map(a => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = '#' + entry.target.id;
      navButtons.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
    }
  });
}, { rootMargin: '-45% 0px -45% 0px' });
sections.forEach(s => s.id && sectionObserver.observe(s));

// One deliberate reveal on page load: the hero settles in once, nothing else
// fades on scroll (per design brief — per-card scroll reveal reads as templated).
// Uses setTimeout rather than requestAnimationFrame: rAF is paused in
// backgrounded/inactive tabs in most browsers, which could leave the hero
// permanently invisible if someone opens the link in a background tab.
const heroContent = document.querySelector('.hero-content');
if (heroContent) {
  heroContent.classList.add('pending');
  setTimeout(() => heroContent.classList.remove('pending'), 60);
}

// ---------- Chip groups (Group Size / What Do You Need) ----------
function initChipGroup(el) {
  const multi = el.dataset.multi === 'true';
  el.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (multi) {
        chip.classList.toggle('active');
      } else {
        el.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }
    });
  });
}
document.querySelectorAll('.chip-group').forEach(initChipGroup);

function selectedChipValues(groupId) {
  const el = document.getElementById(groupId);
  if (!el) return [];
  return Array.from(el.querySelectorAll('.chip.active')).map(c => c.dataset.value);
}

// Quote form -> mailto summary (no backend on this static site)
const form = document.getElementById('quoteForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const get = (k) => data.get(k) || '—';

  const groupSize = selectedChipValues('groupSizeChips')[0] || '—';
  const needs = selectedChipValues('needsChips');

  const body = [
    `Name: ${get('fname')}`,
    `Email: ${get('femail')}`,
    `Arrival: ${get('arrival')}`,
    `Departure: ${get('departure')}`,
    `Group size: ${groupSize}`,
    `Services needed: ${needs.length ? needs.join(', ') : 'None selected'}`,
    `Notes: ${get('notes')}`
  ].join('\n');

  const mailto = `mailto:info@cerviniatravelservices.com?subject=${encodeURIComponent('Cervinia Travel Services - Quote Request')}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
});

// ---------- Live mountain weather widget (Open-Meteo, no API key needed) ----------
(function initWeatherWidget() {
  const body = document.getElementById('wwBody');
  const updatedEl = document.getElementById('wwUpdated');
  if (!body) return;

  const lang = document.documentElement.lang || 'en';
  const STRINGS = {
    en: {
      error: 'Live conditions unavailable right now — check back soon.',
      snowLabel: 'Snow forecast, next 3 days',
      windLabel: 'Wind',
      updated: (time) => `Updated ${time} CET`
    },
    fr: {
      error: 'Conditions en direct indisponibles pour le moment — réessayez bientôt.',
      snowLabel: 'Neige prévue, 3 prochains jours',
      windLabel: 'Vent',
      updated: (time) => `Mis à jour à ${time} (HEC)`
    },
    de: {
      error: 'Live-Bedingungen derzeit nicht verfügbar — bitte später erneut versuchen.',
      snowLabel: 'Schneevorhersage, nächste 3 Tage',
      windLabel: 'Wind',
      updated: (time) => `Aktualisiert um ${time} (MEZ)`
    }
  };
  const t = STRINGS[lang] || STRINGS.en;

  // WMO weather codes -> icon + localized description
  const WEATHER_CODES = {
    0: { icon: 'sun', text: { en: 'Clear sky', fr: 'Ciel dégagé', de: 'Klarer Himmel' } },
    1: { icon: 'sun', text: { en: 'Mostly clear', fr: 'Généralement dégagé', de: 'Meist klar' } },
    2: { icon: 'cloud-sun', text: { en: 'Partly cloudy', fr: 'Partiellement nuageux', de: 'Teilweise bewölkt' } },
    3: { icon: 'cloud', text: { en: 'Overcast', fr: 'Couvert', de: 'Bedeckt' } },
    45: { icon: 'fog', text: { en: 'Fog', fr: 'Brouillard', de: 'Nebel' } },
    48: { icon: 'fog', text: { en: 'Fog', fr: 'Brouillard', de: 'Nebel' } },
    51: { icon: 'rain', text: { en: 'Light drizzle', fr: 'Bruine légère', de: 'Leichter Sprühregen' } },
    53: { icon: 'rain', text: { en: 'Drizzle', fr: 'Bruine', de: 'Sprühregen' } },
    55: { icon: 'rain', text: { en: 'Heavy drizzle', fr: 'Forte bruine', de: 'Starker Sprühregen' } },
    56: { icon: 'rain', text: { en: 'Freezing drizzle', fr: 'Bruine verglaçante', de: 'Gefrierender Sprühregen' } },
    57: { icon: 'rain', text: { en: 'Freezing drizzle', fr: 'Bruine verglaçante', de: 'Gefrierender Sprühregen' } },
    61: { icon: 'rain', text: { en: 'Light rain', fr: 'Pluie légère', de: 'Leichter Regen' } },
    63: { icon: 'rain', text: { en: 'Rain', fr: 'Pluie', de: 'Regen' } },
    65: { icon: 'rain', text: { en: 'Heavy rain', fr: 'Forte pluie', de: 'Starker Regen' } },
    66: { icon: 'rain', text: { en: 'Freezing rain', fr: 'Pluie verglaçante', de: 'Gefrierender Regen' } },
    67: { icon: 'rain', text: { en: 'Freezing rain', fr: 'Pluie verglaçante', de: 'Gefrierender Regen' } },
    71: { icon: 'snow', text: { en: 'Light snow', fr: 'Neige légère', de: 'Leichter Schneefall' } },
    73: { icon: 'snow', text: { en: 'Snow', fr: 'Neige', de: 'Schneefall' } },
    75: { icon: 'snow', text: { en: 'Heavy snow', fr: 'Fortes chutes de neige', de: 'Starker Schneefall' } },
    77: { icon: 'snow', text: { en: 'Snow grains', fr: 'Grains de neige', de: 'Schneegriesel' } },
    80: { icon: 'rain', text: { en: 'Rain showers', fr: 'Averses de pluie', de: 'Regenschauer' } },
    81: { icon: 'rain', text: { en: 'Rain showers', fr: 'Averses de pluie', de: 'Regenschauer' } },
    82: { icon: 'rain', text: { en: 'Heavy rain showers', fr: 'Fortes averses', de: 'Starke Regenschauer' } },
    85: { icon: 'snow', text: { en: 'Snow showers', fr: 'Averses de neige', de: 'Schneeschauer' } },
    86: { icon: 'snow', text: { en: 'Heavy snow showers', fr: 'Fortes averses de neige', de: 'Starke Schneeschauer' } },
    95: { icon: 'storm', text: { en: 'Thunderstorm', fr: 'Orage', de: 'Gewitter' } },
    96: { icon: 'storm', text: { en: 'Thunderstorm with hail', fr: 'Orage avec grêle', de: 'Gewitter mit Hagel' } },
    99: { icon: 'storm', text: { en: 'Thunderstorm with hail', fr: 'Orage avec grêle', de: 'Gewitter mit Hagel' } }
  };

  const ICON_PATHS = {
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    'cloud-sun': '<circle cx="8" cy="8.5" r="3"/><path d="M8 2.5v2M3.2 8.5h2M4.5 5l1.4 1.4M11.5 5l-1.4 1.4"/><path d="M9.5 19h7.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 8.3 13 3 3 0 0 0 9.5 19Z"/>',
    cloud: '<path d="M7 18h10.5a3.75 3.75 0 0 0 0-7.5 5.5 5.5 0 0 0-10.6-1.7A4 4 0 0 0 7 18Z"/>',
    fog: '<path d="M4 8h16M2 12h20M4 16h16M6 20h12"/>',
    rain: '<path d="M7 15h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.6A3.5 3.5 0 0 0 7 15Z"/><path d="M8 18v2M12 18v2M16 18v2"/>',
    snow: '<path d="M7 13h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.6A3.5 3.5 0 0 0 7 13Z"/><path d="M9 17v5M9 18.5l-2 1.3M9 18.5l2 1.3M9 20.5l-2 1.3M9 20.5l2 1.3M15 17v5M15 18.5l-2 1.3M15 18.5l2 1.3M15 20.5l-2 1.3M15 20.5l2 1.3"/>',
    storm: '<path d="M7 13h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.6A3.5 3.5 0 0 0 7 13Z"/><path d="M12 15l-2.5 4h3L10 23"/>'
  };

  function iconSvg(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ICON_PATHS.cloud}</svg>`;
  }

  const url = 'https://api.open-meteo.com/v1/forecast?latitude=45.9354&longitude=7.6298&current_weather=true&daily=snowfall_sum&timezone=Europe%2FRome&forecast_days=3';

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('weather request failed');
      return res.json();
    })
    .then((data) => {
      const cw = data.current_weather;
      const codeInfo = WEATHER_CODES[cw.weathercode] || WEATHER_CODES[3];
      const desc = codeInfo.text[lang] || codeInfo.text.en;
      const snowSum = (data.daily.snowfall_sum || []).reduce((a, b) => a + b, 0);
      const time = cw.time.slice(11, 16);

      body.innerHTML = `
        <div class="ww-main">
          <span class="ww-icon">${iconSvg(codeInfo.icon)}</span>
          <span class="ww-temp">${Math.round(cw.temperature)}°C</span>
          <span class="ww-desc">${desc}</span>
        </div>
        <div class="ww-stats">
          <div class="ww-stat"><span class="ww-stat-num">${Math.round(snowSum)}cm</span><span class="ww-stat-label">${t.snowLabel}</span></div>
          <div class="ww-stat"><span class="ww-stat-num">${Math.round(cw.windspeed)}km/h</span><span class="ww-stat-label">${t.windLabel}</span></div>
        </div>
      `;
      if (updatedEl) updatedEl.textContent = t.updated(time);
    })
    .catch(() => {
      body.innerHTML = `<span class="ww-status">${t.error}</span>`;
    });
})();

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
