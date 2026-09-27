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
