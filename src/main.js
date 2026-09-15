// ReliAdapt · Planetary Intelligence
// Ava Community Intelligence — spatial demo for Ava Community Energy, Oakland.

import 'leaflet/dist/leaflet.css';
import './styles.css';

import { renderMap } from './map.js';
import { renderCustomers } from './customers.js';
import { renderDashboard } from './dashboard.js';
import { renderPrograms } from './programs.js';
import { renderCommunities } from './communities.js';
import { renderPermitsTab } from './layers/permits.js';
import { renderSolarTab } from './layers/solar.js';
import { renderGreenButtonTab } from './layers/greenbutton.js';
import { renderAbout } from './about.js';
import { renderWalkthrough } from './walkthrough.js';
import { closeDossier } from './dossier.js';
import { PORTFOLIO } from './data/homes.js';
import { num } from './format.js';

const TABS = [
  { id: 'dashboard', label: 'Community', group: 'Overview', render: renderDashboard },
  { id: 'map', label: 'Map', group: 'Overview', render: renderMap, flush: true },
  { id: 'programs', label: 'Programs', group: 'Overview', render: renderPrograms },
  { id: 'customers', label: 'Customers', group: 'Overview', render: renderCustomers },
  { id: 'communities', label: 'Communities', group: 'Overview', render: renderCommunities, flush: true },
  { id: 'permits', label: 'Permits', group: 'Intelligence', render: renderPermitsTab },
  { id: 'solar', label: 'Solar imagery', group: 'Intelligence', render: renderSolarTab },
  { id: 'green-button', label: 'Smart meter data', group: 'Intelligence', render: renderGreenButtonTab },
  { id: 'about', label: 'About', group: 'Context', render: renderAbout },
  { id: 'walkthrough', label: 'Walkthrough', group: 'Context', render: renderWalkthrough, flush: true },
];

const MARK = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
  <circle cx="9" cy="9" r="7.6" stroke="#1b3a8f" stroke-width="1.3"/>
  <path d="M1.9 10.6 C5 8.2 13 8.2 16.1 10.6" stroke="#1b3a8f" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="9" cy="9" r="2.5" fill="#e07c05"/>
</svg>`;

function shell() {
  const groups = [];
  for (const tab of TABS) {
    const last = groups[groups.length - 1];
    if (!last || last.name !== tab.group) groups.push({ name: tab.group, tabs: [tab] });
    else last.tabs.push(tab);
  }

  const navHtml = groups
    .map(
      (g) => `
    <div class="nav__group">${g.name}</div>
    ${g.tabs
      .map(
        (t) =>
          `<button class="nav__item" data-tab="${t.id}"><span>${t.label}</span></button>`
      )
      .join('')}`
    )
    .join('');

  document.querySelector('#app').innerHTML = `
    <nav class="nav">
      <div class="nav__brand">
        <div class="nav__mark">${MARK}<span>ReliAdapt</span></div>
        <div class="nav__tagline">Planetary Intelligence</div>
      </div>
      <div class="nav__list">${navHtml}</div>
      <div class="nav__foot">
        Ava Community Energy territory · Oakland, CA<br />
        ${num(PORTFOLIO.count)} synthetic homes · ${num(PORTFOLIO.readyCount)} ready today<br />
        <span style="opacity:.8">Demonstration data. Not a real customer record.</span>
      </div>
    </nav>
    <main class="main" id="view"></main>
  `;
}

let teardown = null;

function show(id, param) {
  const tab = TABS.find((t) => t.id === id) || TABS[0];
  closeDossier();
  teardown?.();
  teardown = null;

  document
    .querySelectorAll('.nav__item')
    .forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab.id));

  const view = document.querySelector('#view');
  view.innerHTML = '';
  view.scrollTop = 0;
  window.scrollTo(0, 0);

  teardown = tab.render(view, param) || null;
  document.title = `${tab.label} · ReliAdapt Ava Community Intelligence`;
}

/** '#/customers/H-0042' -> ['customers', 'H-0042'] */
function currentRoute() {
  const [id, param] = window.location.hash.replace(/^#\/?/, '').split('/');
  return [id || 'dashboard', param];
}

function boot() {
  shell();

  document.querySelectorAll('.nav__item').forEach((btn) => {
    btn.onclick = () => {
      window.location.hash = `#/${btn.dataset.tab}`;
    };
  });

  window.addEventListener('hashchange', () => show(...currentRoute()));
  show(...currentRoute());
}

boot();
