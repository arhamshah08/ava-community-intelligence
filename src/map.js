// Map tab — a toggle between the two sides of the same trade.
//
//   Design a data centre : size a campus and price what the community can sell it
//   Community            : the households that would actually deliver it
//
// The designer is the entry point, because the flexibility number only means
// something once you know what constraint it is being asked to solve.

import L from 'leaflet';
import {
  HOMES,
  NEIGHBORHOODS,
  portfolio,
  provenanceFor,
  PROVENANCE_LABELS,
} from './data/homes.js';
import { DATA_CENTERS } from './data/datacenters.js';
import { openDossier } from './dossier.js';
import { renderDesigner } from './designer.js';
import { assetStrip } from './icons.js';
import { usd, usdShort, num, pct, esc } from './format.js';

const OAKLAND = [37.8044, -122.2712];

export const IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const IMAGERY_ATTR =
  'Imagery &copy; Esri, Maxar, Earthstar Geographics';

const REFERENCE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

const STAR_PATH =
  'M8 0.6 L10.05 5.55 L15.4 5.98 L11.32 9.48 L12.57 14.7 L8 11.9 L3.43 14.7 L4.68 9.48 L0.6 5.98 L5.95 5.55 Z';

function starIcon() {
  return L.divIcon({
    className: '',
    html: `<svg class="marker-star" width="16" height="16" viewBox="0 0 16 16">
      <path d="${STAR_PATH}" fill="#e07c05" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// ─────────────────────────── tab shell ───────────────────────────

export function renderMap(root) {
  let teardown = null;

  root.innerHTML = `
    <div class="tabshell">
      <header class="viewtoggle">
        <div class="seg" id="view-seg">
          <button data-view="community" class="is-on">Community</button>
          <button data-view="design">Design a data centre</button>
        </div>
        <p class="viewtoggle__note" id="view-note"></p>
      </header>
      <div class="tabshell__body" id="view-body"></div>
    </div>
  `;

  const body = root.querySelector('#view-body');
  const note = root.querySelector('#view-note');

  const NOTES = {
    design:
      'Size a campus against a real feeder, then see what the neighbourhood can sell it.',
    community:
      'Hover a home for capacity and assets. Double-click for the full dossier.',
  };

  function swap(view) {
    teardown?.();
    teardown = null;
    body.className = `tabshell__body ${
      view === 'community' ? 'tabshell__body--flush' : ''
    }`;
    body.innerHTML = '';
    note.textContent = NOTES[view];
    root
      .querySelectorAll('#view-seg button')
      .forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
    teardown =
      view === 'community' ? renderCommunity(body) : renderDesignerPage(body);
  }

  root.querySelectorAll('#view-seg button').forEach((b) => {
    b.onclick = () => swap(b.dataset.view);
  });

  swap('community');

  return () => teardown?.();
}

function renderDesignerPage(body) {
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <header class="page__head">
      <div class="page__eyebrow">Step 1 · the ask</div>
      <h1 class="page__title">What does this campus need, and can the neighbourhood sell it?</h1>
    </header>
    <div id="designer-slot"></div>
  `;
  body.appendChild(page);
  return renderDesigner(page.querySelector('#designer-slot'));
}

// ─────────────────────────── community map ───────────────────────────

function renderCommunity(body) {
  const filters = { hoods: new Set(NEIGHBORHOODS.map((n) => n.id)), status: 'all' };

  body.innerHTML = `
    <div class="mapwrap">
      <div id="map"></div>

      <section class="map-panel map-panel--head">
        <div class="page__eyebrow">Ava Community Energy · Oakland</div>
        <h1>Who can deliver it</h1>
        <p>Every rooftop in the synthetic territory, scored against the panel capacity it already has.</p>

        <div class="legend">
          <div class="legend__row">
            <span class="legend__key">
              <svg width="15" height="15" viewBox="0 0 16 16"><path d="${STAR_PATH}" fill="#e07c05" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>
            </span>
            <span><b id="lg-ready">0</b> can electrify today</span>
          </div>
          <div class="legend__row">
            <span class="legend__key"><span class="dot" style="background:#2563eb;box-shadow:0 0 0 1.5px #fff"></span></span>
            <span><b id="lg-upgrade">0</b> need a panel upgrade first</span>
          </div>
          <div class="legend__row">
            <span class="legend__key"><span style="width:13px;height:9px;border-radius:2px;background:rgba(124,58,237,.55);border:1.5px solid #7c3aed;display:block"></span></span>
            <span><b>${DATA_CENTERS.length}</b> candidate data centre sites</span>
          </div>
        </div>

        <div class="filters">
          <div class="filters__label">Neighbourhood</div>
          <div class="filters__row" id="hood-chips">
            ${NEIGHBORHOODS.map(
              (n) => `<button class="chip is-on" data-hood="${n.id}">${esc(n.name)}</button>`
            ).join('')}
          </div>
          <div class="filters__label" style="margin-top:10px">Readiness</div>
          <div class="filters__row" id="status-chips">
            <button class="chip is-on" data-status="all">All</button>
            <button class="chip" data-status="ready">Ready today</button>
            <button class="chip" data-status="upgrade">Needs upgrade</button>
          </div>
        </div>
      </section>

      <section class="map-panel map-panel--value">
        <header class="value__head">
          <h2>Community value in view</h2>
          <p id="value-scope">across 255 homes</p>
        </header>
        <dl class="value__body">
          <div class="value__row"><dt>Retrofit investment</dt><dd id="v-cost">–</dd></div>
          <div class="value__row"><dt>Carbon avoided</dt><dd id="v-co2">–</dd></div>
          <div class="value__row"><dt>Avg. bill savings</dt><dd id="v-bill">–</dd></div>
          <div class="value__row"><dt>Flexible load unlocked</dt><dd id="v-flex">–</dd></div>
        </dl>
        <footer class="value__foot">
          Bill savings are net of higher winter heating cost on California electric rates and include the
          flexibility enrolment credit. <span class="synthetic">Synthetic data</span>
        </footer>
      </section>

      <div id="scorecard"></div>
    </div>
  `;

  const map = L.map('map', {
    center: OAKLAND,
    zoom: 13,
    zoomControl: false,
    // Double-click is the dossier gesture, so it must not also zoom the map
    // when the click lands next to a marker rather than on it.
    doubleClickZoom: false,
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer(IMAGERY_URL, { maxZoom: 19, attribution: IMAGERY_ATTR }).addTo(map);
  L.tileLayer(REFERENCE_URL, { maxZoom: 19, opacity: 0.55 }).addTo(map);
  map.attributionControl.setPrefix('');

  for (const dc of DATA_CENTERS) {
    L.polygon(dc.polygon, {
      color: dc.color,
      weight: 2,
      fillColor: dc.color,
      fillOpacity: 0.34,
    })
      .addTo(map)
      .bindTooltip(
        `<b>${esc(dc.shortName)}</b><small>${dc.capacityMW} MW · ${esc(dc.status)}</small>`,
        { permanent: true, direction: 'center', className: 'dc-label' }
      );
  }

  const homeLayer = L.layerGroup().addTo(map);
  const markers = new Map();
  let selectedId = null;

  /** Hover card: capacity, utilisation, and which facets the home has. */
  function hoverHtml(home) {
    const util = Math.round(home.utilNow * 100);
    const proj = Math.round(home.utilProjected * 100);
    return `
      <div class="hovercard">
        <div class="hovercard__addr">${esc(home.address)}</div>
        <div class="hovercard__meta">${esc(home.neighborhood)} · built ${home.yearBuilt}</div>
        <div class="hovercard__rows">
          <div><span>Service</span><b>${home.panelAmps} A · ${home.serviceKw} kW</b></div>
          <div><span>Utilisation now</span><b>${util}%</b></div>
          <div><span>After electrifying</span><b class="${
            proj > 100 ? 'is-over' : ''
          }">${proj}%</b></div>
          <div><span>Flexibility</span><b>${home.flexKw} kW</b></div>
        </div>
        <div class="hovercard__util"><span style="width:${Math.min(
          100,
          util
        )}%"></span></div>
        <div class="hovercard__facets">${assetStrip(home)}</div>
        <div class="hovercard__hint">Double-click for the full dossier</div>
      </div>`;
  }

  function markerFor(home) {
    const m = home.ready
      ? L.marker([home.lat, home.lng], {
          icon: starIcon(),
          keyboard: false,
          riseOnHover: true,
        })
      : L.circleMarker([home.lat, home.lng], {
          radius: 4.5,
          color: '#ffffff',
          weight: 1.2,
          fillColor: '#2563eb',
          fillOpacity: 0.95,
        });

    m.bindTooltip(hoverHtml(home), {
      direction: 'top',
      className: 'hover-tip',
      offset: [0, -8],
      opacity: 1,
    });
    return m;
  }

  // Toggling a class rather than calling setIcon() matters: setIcon replaces
  // the marker's DOM node, so the second click of a double-click would land on
  // a brand new element and the browser would never fire dblclick.
  function setStarSelected(marker, on) {
    marker.getElement?.()?.querySelector?.('.marker-star')?.classList.toggle('is-sel', on);
  }

  function select(home) {
    if (selectedId && markers.has(selectedId)) {
      const prev = markers.get(selectedId);
      const prevHome = HOMES.find((h) => h.id === selectedId);
      if (prevHome?.ready) setStarSelected(prev, false);
      else prev.setStyle?.({ radius: 4.5, weight: 1.2 });
    }
    selectedId = home.id;
    const m = markers.get(home.id);
    if (home.ready) setStarSelected(m, true);
    else m.setStyle?.({ radius: 6.5, weight: 2.4 });
    drawScorecard(home);
  }

  function visibleHomes() {
    return HOMES.filter(
      (h) =>
        filters.hoods.has(h.neighborhoodId) &&
        (filters.status === 'all' || h.status === filters.status)
    );
  }

  function draw() {
    homeLayer.clearLayers();
    markers.clear();
    const shown = visibleHomes();

    for (const home of shown) {
      const m = markerFor(home);
      m.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        select(home);
      });
      m.on('dblclick', (e) => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e.originalEvent);
        m.closeTooltip();
        select(home);
        openDossier(home);
      });
      m.addTo(homeLayer);
      markers.set(home.id, m);
    }

    const p = portfolio(shown);
    body.querySelector('#lg-ready').textContent = num(p.readyCount);
    body.querySelector('#lg-upgrade').textContent = num(p.upgradeCount);
    body.querySelector('#value-scope').textContent = `across ${num(
      p.count
    )} homes in view`;
    body.querySelector('#v-cost').textContent = usdShort(p.retrofitCost);
    body.querySelector('#v-co2').textContent = `${num(p.co2Tons)} t/yr`;
    body.querySelector('#v-bill').textContent = `${usd(p.avgBillSavings)}/mo`;
    body.querySelector('#v-flex').textContent = `${num(p.flexKw, 0)} kW`;
  }

  const scorecard = body.querySelector('#scorecard');

  function drawScorecard(home) {
    const prov = provenanceFor(home);
    scorecard.innerHTML = `
      <section class="map-panel map-panel--score">
        <button class="score__close" aria-label="Close">&times;</button>
        <header class="score__head">
          <div class="score__addr">${esc(home.address)}</div>
          <div class="score__meta">${esc(
      home.neighborhood
    )} · built ${home.yearBuilt} · ${home.panelAmps} A</div>
          <div style="margin-top:8px">
            <span class="tag tag--${home.ready ? 'ready' : 'upgrade'}">
              ${
                home.ready
                  ? 'Can electrify today'
                  : `Needs ${home.panelAmps}A → 200A upgrade`
              }
            </span>
          </div>
        </header>
        <div class="score__body">
          <div class="score__grid">
            <div class="score__cell">
              <div class="stat__label">Retrofit</div>
              <div class="stat__value">${usdShort(home.retrofitCost)}</div>
            </div>
            <div class="score__cell">
              <div class="stat__label">CO₂ / yr</div>
              <div class="stat__value">${home.co2TonsPerYear.toFixed(1)}<small>t</small></div>
            </div>
            <div class="score__cell">
              <div class="stat__label">Bill</div>
              <div class="stat__value">${usd(home.billSavingsMonthly)}<small>/mo</small></div>
            </div>
          </div>
          <div class="score__prov">
            ${prov
              .map(
                (p) =>
                  `<span class="tag tag--${p.toLowerCase()}">${esc(
                    PROVENANCE_LABELS[p]
                  )}</span>`
              )
              .join('')}
            <span class="tag tag--muted">${home.panelAmps}A · ${home.headroomAmps}A spare</span>
            <span class="tag tag--muted">Rank ${num(home.rank)} / ${num(HOMES.length)}</span>
          </div>
        </div>
        <footer class="score__cta">
          <span>Double-click the marker for the full dossier</span>
          <button class="chip" id="score-open">Open</button>
        </footer>
      </section>
    `;
    scorecard.querySelector('.score__close').onclick = () => {
      scorecard.innerHTML = '';
    };
    scorecard.querySelector('#score-open').onclick = () => openDossier(home);
  }

  map.on('click', () => {
    scorecard.innerHTML = '';
  });

  body.querySelectorAll('#hood-chips .chip').forEach((chip) => {
    chip.onclick = () => {
      const id = chip.dataset.hood;
      if (filters.hoods.has(id) && filters.hoods.size > 1) filters.hoods.delete(id);
      else filters.hoods.add(id);
      chip.classList.toggle('is-on', filters.hoods.has(id));
      draw();
    };
  });
  body.querySelectorAll('#status-chips .chip').forEach((chip) => {
    chip.onclick = () => {
      filters.status = chip.dataset.status;
      body
        .querySelectorAll('#status-chips .chip')
        .forEach((c) => c.classList.toggle('is-on', c === chip));
      draw();
    };
  });

  draw();

  // Inset only for the header panel on the left; the value card on the right
  // is opaque and can sit over the edge of the territory without hiding much.
  // The container is sized by the tab swap, so a single timed fit can measure
  // a stale box and frame the whole bay. Fit after layout settles, then once
  // more, and stop as soon as the map is actually showing the territory.
  const territory = L.latLngBounds(HOMES.map((h) => [h.lat, h.lng]));
  const fit = () => {
    map.invalidateSize();
    map.fitBounds(territory, {
      paddingTopLeft: [345, 24],
      paddingBottomRight: [120, 24],
    });
  };
  requestAnimationFrame(() => requestAnimationFrame(fit));
  const refit = setTimeout(fit, 450);

  return () => {
    clearTimeout(refit);
    map.remove();
  };
}
