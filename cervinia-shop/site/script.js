// Highlight the current section's nav button as the page scrolls
const navButtons = document.querySelectorAll('.nav-buttons a');
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

// Scroll reveal (progressive enhancement: elements are visible by default,
// only hidden once JS confirms it can animate them back in)
const revealEls = document.querySelectorAll('.reveal');
revealEls.forEach(el => el.classList.add('pending'));

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
revealEls.forEach(el => io.observe(el));

// Safety net: if the observer never fires (e.g. throttled/backgrounded tab),
// don't leave content permanently invisible.
setTimeout(() => revealEls.forEach(el => el.classList.add('in')), 2500);

// Quote form -> mailto summary (no backend on this static site)
const form = document.getElementById('quoteForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const get = (k) => data.get(k) || '—';
  const checks = [];
  if (data.get('equip')) checks.push('Equipment hire');
  if (data.get('lessons')) checks.push('Lessons');
  if (data.get('insurance')) checks.push('Ski accident insurance');

  const body = [
    `Name: ${get('fname')}`,
    `Email: ${get('femail')}`,
    `Arrival: ${get('arrival')}`,
    `Departure: ${get('departure')}`,
    `PAX: ${get('pax')}`,
    `Preferred accommodation: ${get('hotel')}`,
    `Room configuration: ${get('rooms')}`,
    `Airport transfer: ${get('transfer')}`,
    `Lift pass: ${get('pass')}`,
    `Extras: ${checks.length ? checks.join(', ') : 'None'}`,
    `Notes: ${get('notes')}`
  ].join('\n');

  const mailto = `mailto:info@cerviniatravelservices.com?subject=${encodeURIComponent('Cervinia Travel Services - Quote Request')}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
});
