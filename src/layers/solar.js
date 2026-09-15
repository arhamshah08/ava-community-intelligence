// Layer 2 · Solar
//
// Rooftop PV is invisible to permits once a system predates the feed and
// invisible to interval data when it is net-metered behind the meter. Imagery
// is the only layer with full coverage, so it is what sets the denominator.

import L from 'leaflet';
import { IMAGERY_URL, IMAGERY_ATTR } from '../map.js';
import { PORTFOLIO } from '../data/homes.js';
import { num, pct, esc } from '../format.js';

// A single West Oakland block group, scanned at parcel resolution.
const BLOCK = { lat: 37.8102, lng: -122.2898 };
const GRID_ANGLE = 32;
const AVA_BENCHMARK = 0.14; // territory-wide rooftop solar adoption

const SEED = 0x2c0f11;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M_PER_DEG_LAT = 111320;

function offset(center, east, north) {
  return [
    center.lat + north / M_PER_DEG_LAT,
    center.lng + east / (M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180)),
  ];
}

function rot(u, v, deg) {
  const a = (deg * Math.PI) / 180;
  return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
}

/** Axis-aligned rectangle in local metres, rotated onto the street grid. */
function roofPolygon(u, v, w, d, deg) {
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([du, dv]) => {
    const [x, y] = rot(u + du, v + dv, deg);
    return offset(BLOCK, x, y);
  });
}

function buildRoofs() {
  const rand = mulberry32(SEED);
  const roofs = [];
  const STREET = 95;
  const PARCEL = 34;
  const SETBACK = 17;

  const raw = [];
  for (let v = -115; v <= 115; v += STREET) {
    for (let u = -190; u <= 190; u += PARCEL) {
      for (const side of [-1, 1]) {
        const w = 10 + rand() * 4.5;
        const d = 14 + rand() * 6;
        const jitter = (rand() - 0.5) * 6;
        raw.push({ u: u + jitter, v: v + side * SETBACK, w, d });
      }
    }
  }

  const stride = Math.max(1, Math.floor(raw.length / 46));
  for (let i = 0; i < raw.length && roofs.length < 46; i += stride) {
    const r = raw[i];
    // Roughly 15% of this block carries PV — slightly above the synthetic
    // territory rate and just above Ava's reported adoption.
    const hasSolar = rand() < 0.16;
    roofs.push({
      id: `R-${String(roofs.length + 1).padStart(3, '0')}`,
      center: offset(BLOCK, ...rot(r.u, r.v, GRID_ANGLE)),
      polygon: roofPolygon(r.u, r.v, r.w, r.d, GRID_ANGLE),
      areaM2: Math.round(r.w * r.d),
      hasSolar,
      confidence: hasSolar ? 0.71 + rand() * 0.26 : 0,
      arrayKw: hasSolar ? Math.round((2.4 + rand() * 4.8) * 10) / 10 : 0,
      panels: hasSolar ? 6 + Math.floor(rand() * 16) : 0,
    });
  }
  return roofs;
}

const ROOFS = buildRoofs();

export function renderSolarTab(root) {
  const detected = ROOFS.filter((r) => r.hasSolar);
  const blockRate = detected.length / ROOFS.length;

  root.innerHTML = `
    <div class="page">
      <header class="page__head">
        <div class="page__eyebrow">Solar imagery</div>
        <h1 class="page__title">Rooftop solar detection from imagery</h1>
        <p class="page__sub">
          A parcel-resolution sweep over one West Oakland block group. Every rooftop is
          examined; the ones carrying PV are shaded and scored. Imagery is the only layer
          with complete coverage, so it is what the other two are measured against.
        </p>
      </header>

      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
        <button class="btn btn--detect" id="run-detect">Run detection</button>
        <button class="btn btn--ghost" id="reset-detect">Reset</button>
        <span class="synthetic" style="margin-left:4px">Synthetic rooftops over real imagery</span>
      </div>

      <div class="solarwrap" style="margin-bottom:16px">
        <div id="solar-map"></div>
        <div class="sweep" id="sweep"></div>
        <div class="solar-hud">
          <div class="solar-hud__title">Detection log</div>
          <div class="solar-hud__log" id="detect-log">
            <span style="opacity:1">${ROOFS.length} rooftops in scan window</span>
            <span style="opacity:1;color:var(--ink)">idle — press Run detection</span>
          </div>
        </div>
      </div>

      <div class="grid grid--4">
        ${[
          ['Rooftops scanned', num(ROOFS.length), 'parcel polygons in window', ''],
          ['PV detected', `<span id="stat-detected">0</span>`, 'red shaded rooftops', ''],
          ['Block adoption', `<span id="stat-rate">0%</span>`, `Ava benchmark ${pct(AVA_BENCHMARK, 0)}`, ''],
          [
            'Territory adoption',
            pct(PORTFOLIO.solarCount / PORTFOLIO.count, 1),
            `${num(PORTFOLIO.solarCount)} of ${num(PORTFOLIO.count)} homes`,
            '',
          ],
        ]
          .map(
            ([label, value, foot]) => `
          <div class="card"><div class="card__body">
            <div class="stat__label">${label}</div>
            <div class="stat__value">${value}</div>
            <div class="stat__foot">${foot}</div>
          </div></div>`
          )
          .join('')}
      </div>

      <div class="callout" style="margin-top:16px" id="solar-verdict">
        <div class="callout__title">Why this matters for flexibility</div>
        <div class="callout__body">
          A rooftop that already has PV behaves differently in an event: it is a net exporter
          at midday and a normal load at the evening peak. Detecting it from imagery is what
          keeps the flexibility forecast honest for the ${pct(
            1 - AVA_BENCHMARK,
            0
          )} of homes that have no array at all.
        </div>
      </div>
    </div>
  `;

  const map = L.map('solar-map', {
    center: BLOCK,
    zoom: 18,
    // The detection HUD owns the top-left corner.
    zoomControl: false,
    attributionControl: true,
  });
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.tileLayer(IMAGERY_URL, { maxZoom: 20, attribution: IMAGERY_ATTR }).addTo(map);
  map.attributionControl.setPrefix('');

  const outlineLayer = L.layerGroup().addTo(map);
  const detectLayer = L.layerGroup().addTo(map);

  const bounds = L.latLngBounds(ROOFS.flatMap((r) => r.polygon));
  map.fitBounds(bounds, { padding: [24, 24] });

  const sweep = root.querySelector('#sweep');
  const log = root.querySelector('#detect-log');
  const runBtn = root.querySelector('#run-detect');
  const resetBtn = root.querySelector('#reset-detect');

  let raf = null;
  let found = 0;

  function drawOutlines() {
    outlineLayer.clearLayers();
    for (const r of ROOFS) {
      L.polygon(r.polygon, {
        color: '#ffffff',
        weight: 1,
        opacity: 0.5,
        fill: false,
        interactive: false,
      }).addTo(outlineLayer);
    }
  }

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    found = 0;
    detectLayer.clearLayers();
    sweep.classList.remove('is-on');
    sweep.style.transform = '';
    log.innerHTML = `
      <span style="opacity:1">${ROOFS.length} rooftops in scan window</span>
      <span style="opacity:1;color:var(--ink)">idle — press Run detection</span>`;
    root.querySelector('#stat-detected').textContent = '0';
    root.querySelector('#stat-rate').textContent = '0%';
    runBtn.disabled = false;
    ROOFS.forEach((r) => (r._done = false));
  }

  function addLine(text, color) {
    const span = document.createElement('span');
    span.textContent = text;
    if (color) span.style.color = color;
    log.appendChild(span);
    while (log.children.length > 8) log.removeChild(log.firstChild);
  }

  function reveal(roof) {
    L.polygon(roof.polygon, {
      color: '#d4342a',
      weight: 2,
      fillColor: '#d4342a',
      fillOpacity: 0.48,
    })
      .addTo(detectLayer)
      .bindTooltip(`${pct(roof.confidence, 0)} · ${roof.arrayKw} kW`, {
        permanent: true,
        direction: 'top',
        className: 'roof-label',
        offset: [0, -4],
      });

    found += 1;
    root.querySelector('#stat-detected').textContent = String(found);
    root.querySelector('#stat-rate').textContent = pct(found / ROOFS.length, 1);
    addLine(
      `${roof.id}  PV  ${pct(roof.confidence, 0)}  ${roof.arrayKw} kW  ${roof.panels}p`,
      null
    );
  }

  function run() {
    reset();
    runBtn.disabled = true;
    const box = root.querySelector('.solarwrap').getBoundingClientRect();
    const width = box.width;
    const points = ROOFS.map((r) => ({
      roof: r,
      x: map.latLngToContainerPoint(r.center).x,
    }));

    addLine('scan started — 0.5 m/px imagery');
    sweep.classList.add('is-on');

    const DURATION = 3600;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      const x = -120 + t * (width + 120);
      sweep.style.transform = `translateX(${x}px)`;

      for (const p of points) {
        if (!p.roof._done && p.x <= x + 120) {
          p.roof._done = true;
          if (p.roof.hasSolar) reveal(p.roof);
        }
      }

      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        sweep.classList.remove('is-on');
        runBtn.disabled = false;
        raf = null;
        addLine(
          `scan complete — ${found}/${ROOFS.length} rooftops with PV (${pct(
            found / ROOFS.length,
            1
          )})`,
          null
        );
      }
    };
    raf = requestAnimationFrame(step);
  }

  drawOutlines();
  runBtn.onclick = run;
  resetBtn.onclick = reset;

  setTimeout(() => {
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [24, 24] });
  }, 60);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    map.remove();
  };
}
