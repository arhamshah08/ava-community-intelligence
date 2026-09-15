// Communities — explore other territories, their programmes and their people.
//
// A large California map with every community energy provider on it. Selecting
// one opens who runs it, which programmes it already operates, and which
// offices matter for outreach.

import L from 'leaflet';
import { COMMUNITIES, AS_OF } from './data/communities.js';
import { IMAGERY_URL, IMAGERY_ATTR } from './map.js';
import { num, esc } from './format.js';

const CA_CENTER = [37.3, -120.6];

const LIGHT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

/** Marker size tracks account count, so scale reads off the map. */
function radiusFor(accounts) {
  return 7 + Math.sqrt(accounts / 1000) * 0.55;
}

export function renderCommunities(root) {
  let selected = COMMUNITIES.find((c) => c.home) || COMMUNITIES[0];

  root.innerHTML = `
    <div class="tabshell">
      <header class="viewtoggle">
        <div class="progbar__label">
          <b>Communities</b>
          <span>${num(COMMUNITIES.length)} California providers · ${num(
    COMMUNITIES.reduce((s, c) => s + c.accounts, 0)
  )} accounts between them</span>
        </div>
        <span class="progflag" style="margin-left:auto">People verified as of ${esc(
          AS_OF
        )}</span>
      </header>
      <div class="tabshell__body commwrap">
        <div id="comm-map"></div>
        <aside class="commpanel" id="comm-panel"></aside>
      </div>
    </div>
  `;

  const map = L.map('comm-map', {
    center: CA_CENTER,
    zoom: 6,
    zoomControl: false,
    scrollWheelZoom: true,
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer(LIGHT_URL, { maxZoom: 16 }).addTo(map);
  L.tileLayer(LABELS_URL, { maxZoom: 16, opacity: 0.9, attribution: IMAGERY_ATTR }).addTo(
    map
  );
  map.attributionControl.setPrefix('');

  const markers = new Map();

  function paint() {
    for (const [id, m] of markers) {
      const isSel = id === selected.id;
      m.setStyle({
        fillColor: isSel ? '#e07c05' : '#1b3a8f',
        color: '#ffffff',
        weight: isSel ? 3 : 1.6,
        fillOpacity: isSel ? 0.95 : 0.7,
      });
    }
  }

  function select(c, fly = true) {
    selected = c;
    paint();
    drawPanel();
    if (fly) map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 8), { duration: 0.6 });
  }

  for (const c of COMMUNITIES) {
    const m = L.circleMarker([c.lat, c.lng], {
      radius: radiusFor(c.accounts),
    })
      .addTo(map)
      .bindTooltip(
        `<b>${esc(c.name)}</b><small>${num(c.accounts)} accounts · ${esc(
          c.hq
        )}</small>`,
        { direction: 'top', className: 'dc-label', offset: [0, -6] }
      );
    m.on('click', () => select(c));
    if (c.load) m.options.title = c.load;
    markers.set(c.id, m);
  }

  const panel = root.querySelector('#comm-panel');

  function drawPanel() {
    const c = selected;
    panel.innerHTML = `
      <div class="commpanel__head">
        <div class="page__eyebrow">${esc(c.type)}</div>
        <h2 class="commpanel__name">${esc(c.name)}</h2>
        ${c.former ? `<div class="commpanel__sub">${esc(c.former)}</div>` : ''}
        ${c.home ? '<span class="tag tag--ready">This demo’s territory</span>' : ''}
      </div>

      <div class="commpanel__body">
        <div class="grid grid--2" style="gap:12px">
          <div>
            <div class="stat__label">Accounts</div>
            <div class="stat__value">${num(c.accounts)}</div>
          </div>
          <div>
            <div class="stat__label">Launched</div>
            <div class="stat__value">${c.launched}</div>
          </div>
          <div>
            <div class="stat__label">Serves</div>
            <div class="stat__value" style="font-size:var(--fs-sm);font-weight:var(--fw-normal);line-height:1.35">${esc(c.serves)}</div>
          </div>
          <div>
            <div class="stat__label">HQ</div>
            <div class="stat__value" style="font-size:var(--fs-sm);font-weight:var(--fw-normal);line-height:1.35">${esc(c.hq)}</div>
          </div>
        </div>

        <section>
          <div class="sec__title">Programmes already running</div>
          <div class="ledger">
            ${c.programs
              .map(
                (p) => `
              <div class="ledger__row" title="${esc(p.desc)}">
                <span>${esc(p.name)}</span>
                <span></span>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <section>
          <div class="sec__title">Who runs it</div>
          <div class="ledger">
            ${c.people
              .map(
                (p) => `
              <div class="ledger__row">
                <span>${esc(p.role)}</span>
                <span>${esc(p.name)}${
                  p.verify ? ' <span class="tag tag--muted">verify</span>' : ''
                }</span>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <section>
          <div class="sec__title">Offices that matter</div>
          <div class="ledger">
            ${c.political
              .map(
                (p) => `
              <div class="ledger__row">
                <span>${esc(p.office)}</span>
                <span>${esc(p.name)}${
                  p.verify ? ' <span class="tag tag--muted">verify</span>' : ''
                }</span>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <p class="nobar">Named people verified as of early 2026.</p>
      </div>
    `;
  }

  paint();
  drawPanel();

  // Fit to the providers themselves rather than a fixed zoom: the container is
  // sized by the tab swap, and a stale measurement frames the wrong state.
  const bounds = L.latLngBounds(COMMUNITIES.map((c) => [c.lat, c.lng]));
  const fit = () => {
    map.invalidateSize();
    map.fitBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [60, 40] });
  };
  requestAnimationFrame(() => requestAnimationFrame(fit));
  const refit = setTimeout(fit, 400);

  return () => {
    clearTimeout(refit);
    map.remove();
  };
}
