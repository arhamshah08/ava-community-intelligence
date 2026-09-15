// Layer 3 · Smart Meter Data (Disaggregation)
//
// Fifteen-minute interval data is the only layer that sees behaviour rather
// than equipment. Disaggregation turns one meter channel into the five loads
// underneath it, which is what makes a flexibility offer specific.

import Chart from 'chart.js/auto';
import { HOMES, PORTFOLIO } from '../data/homes.js';
import { num, pct, clock, esc } from '../format.js';

const INTERVALS = 96; // 24 h at 15 minutes
const SEED = 0x71d2a4;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMPONENTS = [
  {
    key: 'ev',
    label: 'EV charging',
    color: '#1b3a8f',
    signature: 'A flat 6.6 kW block that starts after the midnight rate change and stops mid-charge. Nothing else in a house draws a constant 6.6 kW for four hours.',
  },
  {
    key: 'heatPump',
    label: 'Heat pump',
    color: '#7c3aed',
    signature: 'Thermostatic cycling — roughly 45 minutes on, 15 off, clustered around the morning and evening setpoint changes. Amplitude tracks outdoor temperature.',
  },
  {
    key: 'waterHeater',
    label: 'Water heater',
    color: '#0f7b4f',
    signature: 'Two sharp recovery pulses of about 1.1 kW, following morning and evening hot water draws. Short, steep, and highly repeatable day to day.',
  },
  {
    key: 'fridge',
    label: 'Refrigeration',
    color: '#2563eb',
    signature: 'A short regular cycle at roughly 0.4 kW that never stops for long. Useful mainly as a subtraction so it does not contaminate the other signatures.',
  },
  {
    key: 'base',
    label: 'Base load',
    color: '#9aa5b3',
    signature: 'The always-on floor: networking, standby draw, lighting. Whatever is left once the four identifiable loads are removed.',
  },
];

/** Annotated windows the disaggregation keys off. */
const BANDS = [
  { from: 92, to: 95, label: 'EV · 6.6 kW flat', color: 'rgba(27,58,143,0.10)' },
  { from: 0, to: 11, label: 'EV · 6.6 kW flat', color: 'rgba(27,58,143,0.10)' },
  { from: 68, to: 88, label: 'Heat pump · 45 min cycling', color: 'rgba(124,58,237,0.10)' },
];

function buildDay() {
  const rand = mulberry32(SEED);
  const series = {
    ev: new Array(INTERVALS).fill(0),
    heatPump: new Array(INTERVALS).fill(0),
    waterHeater: new Array(INTERVALS).fill(0),
    fridge: new Array(INTERVALS).fill(0),
    base: new Array(INTERVALS).fill(0),
  };

  for (let i = 0; i < INTERVALS; i++) {
    // Always-on floor with a gentle evening rise.
    const hour = i / 4;
    series.base[i] =
      0.2 + 0.06 * Math.sin(((hour - 4) / 24) * Math.PI * 2) + rand() * 0.03;

    // Compressor cycling: three intervals on out of every eight.
    series.fridge[i] = i % 8 < 3 ? 0.4 + rand() * 0.05 : 0.04;

    // Heat pump water heater recovery after the two big draws.
    if ((i >= 26 && i <= 30) || (i >= 76 && i <= 82)) {
      series.waterHeater[i] = 1.05 + rand() * 0.12;
    }

    // Space conditioning: thermostatic cycling inside the setpoint windows.
    const inMorning = i >= 22 && i <= 36;
    const inEvening = i >= 68 && i <= 88;
    if (inMorning || inEvening) {
      const phase = i % 4; // 45 min on, 15 min off
      series.heatPump[i] = phase < 3 ? (inEvening ? 1.72 : 1.5) + rand() * 0.14 : 0.06;
    }

    // Managed EV charging, straddling midnight.
    if (i >= 92 || i <= 11) series.ev[i] = 6.6;
  }

  const total = Array.from({ length: INTERVALS }, (_, i) =>
    COMPONENTS.reduce((s, c) => s + series[c.key][i], 0)
  );

  const kwh = {};
  for (const c of COMPONENTS) {
    kwh[c.key] = series[c.key].reduce((s, v) => s + v, 0) / 4; // 15-min intervals
  }

  return { series, total, kwh };
}

const DAY = buildDay();

// Vertical bands with labels, drawn behind the datasets.
const bandPlugin = {
  id: 'signatureBands',
  beforeDatasetsDraw(chart, _args, opts) {
    if (!opts?.show) return;
    const { ctx, chartArea, scales } = chart;
    ctx.save();
    for (const band of BANDS) {
      const x1 = scales.x.getPixelForValue(band.from);
      const x2 = scales.x.getPixelForValue(band.to);
      ctx.fillStyle = band.color;
      ctx.fillRect(x1, chartArea.top, x2 - x1, chartArea.bottom - chartArea.top);
      ctx.strokeStyle = band.color.replace(/0\.10\)$/, '0.45)');
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, chartArea.top);
      ctx.lineTo(x1, chartArea.bottom);
      ctx.moveTo(x2, chartArea.top);
      ctx.lineTo(x2, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      if (x2 - x1 > 62) {
        ctx.fillStyle = '#111111';
        ctx.font = '600 14px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(band.label, (x1 + x2) / 2, chartArea.top + 13);
      }
    }
    ctx.restore();
  },
};

export function renderGreenButtonTab(root) {
  // A representative fully-electrified, EV-owning household from the dataset.
  const sample =
    HOMES.find((h) => h.hasAmi && h.hasEV && h.ready) ||
    HOMES.find((h) => h.hasAmi) ||
    HOMES[0];

  const dailyKwh = DAY.total.reduce((s, v) => s + v, 0) / 4;
  const peakKw = Math.max(...DAY.total);
  const loadFactor = dailyKwh / 24 / peakKw;
  const flexKwh = DAY.kwh.ev + DAY.kwh.heatPump + DAY.kwh.waterHeater;

  root.innerHTML = `
    <div class="page">
      <header class="page__head">
        <div class="page__eyebrow">Smart meter data</div>
        <h1 class="page__title">Smart meter data disaggregation</h1>
        <p class="page__sub">
          One meter channel, ${INTERVALS} fifteen-minute intervals. Disaggregation separates the
          four loads with distinguishable signatures from the always-on floor, which is what
          turns "this house uses ${num(dailyKwh, 1)} kWh a day" into a specific flexibility offer.
        </p>
      </header>

      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
        <div class="seg" id="gb-seg">
          <button data-mode="raw" class="is-on">Raw meter channel</button>
          <button data-mode="split">Disaggregate</button>
        </div>
        <span style="font-size:var(--fs-sm);color:var(--ink)">
          ${esc(sample.address)} · ${esc(sample.neighborhood)} · ${sample.panelAmps}A service
        </span>
        <span class="synthetic" style="margin-left:auto">Synthetic interval data</span>
      </div>

      <section class="card" style="margin-bottom:16px">
        <div class="card__head">
          <span class="card__title" id="gb-title">Total household demand</span>
          <span class="card__note">15-minute intervals, midnight to midnight</span>
        </div>
        <div class="card__body">
          <div class="chartbox chartbox--tall"><canvas id="gb-chart"></canvas></div>
        </div>
      </section>

      <div class="grid grid--4" style="margin-bottom:16px">
        ${[
          ['Daily consumption', `${num(dailyKwh, 1)}<small> kWh</small>`, 'sum of all intervals'],
          ['Peak demand', `${num(peakKw, 1)}<small> kW</small>`, `at ${clock(DAY.total.indexOf(peakKw) * 15)}`],
          ['Load factor', pct(loadFactor, 0), 'average ÷ peak'],
          [
            'Shiftable energy',
            `${num(flexKwh, 1)}<small> kWh</small>`,
            `${pct(flexKwh / dailyKwh, 0)} of the day`,
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

      <div class="two-col">
        <section class="card">
          <div class="card__head"><span class="card__title">Signatures</span></div>
          <div class="card__body">
            <div class="sig">
              ${COMPONENTS.map(
                (c) => `
                <div class="sig__item">
                  <span class="sig__swatch" style="background:${c.color}"></span>
                  <div>
                    <div class="sig__name">${esc(c.label)}</div>
                    <div class="sig__desc">${esc(c.signature)}</div>
                    <div class="sig__kwh">${num(DAY.kwh[c.key], 1)} kWh/day · ${pct(
                  DAY.kwh[c.key] / dailyKwh,
                  0
                )}</div>
                  </div>
                </div>`
              ).join('')}
            </div>
          </div>
        </section>

        <div style="display:grid;gap:16px">
          <section class="card">
            <div class="card__head"><span class="card__title">Territory coverage</span></div>
            <div class="card__body">
              <div class="cov">
                <div class="cov__row">
                  <div class="cov__top">
                    <b>Homes with interval data</b>
                    <span class="cov__pct">${num(PORTFOLIO.amiCount)} / ${num(
    PORTFOLIO.count
  )} · ${pct(PORTFOLIO.amiCount / PORTFOLIO.count, 0)}</span>
                  </div>
                  <div class="bar"><div class="bar__fill bar__fill--p3" style="width:${
                    (PORTFOLIO.amiCount / PORTFOLIO.count) * 100
                  }%"></div></div>
                </div>
              </div>
            </div>
          </section>

          <div class="callout">
            <div class="callout__title">What this unlocks</div>
            <div class="callout__body">
              The EV block and the evening heat pump cycling both sit inside the hours a data
              centre would call an event. Together they are ${num(
                DAY.kwh.ev + DAY.kwh.heatPump,
                1
              )} kWh a day of load that
              can move without anyone noticing — the basis of the ${PORTFOLIO.avgFlexKw} kW average
              coincident flexibility used in the Data Centers tab.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const labels = Array.from({ length: INTERVALS }, (_, i) => clock(i * 15));
  const ctx = root.querySelector('#gb-chart');
  let chart = null;
  let mode = 'raw';

  const axisOpts = (stacked) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        stacked,
        beginAtZero: true,
        title: { display: true, text: 'kW', color: '#111111', font: { size: 14 } },
        grid: { color: '#eff2f5' },
        ticks: { color: '#111111', font: { size: 14 } },
      },
      x: {
        stacked,
        grid: { display: false },
        ticks: {
          color: '#111111',
          font: { size: 14 },
          maxTicksLimit: 13,
          callback(value) {
            const i = Number(value);
            return i % 8 === 0 ? labels[i] : '';
          },
        },
      },
    },
    plugins: {
      signatureBands: { show: true },
      legend: {
        display: stacked,
        position: 'bottom',
        labels: { boxWidth: 10, boxHeight: 10, color: '#111111', font: { size: 14 } },
      },
      tooltip: {
        callbacks: { title: (items) => `${labels[items[0].dataIndex]} – 15 min interval` },
      },
    },
  });

  function draw() {
    chart?.destroy();
    const stacked = mode === 'split';
    const datasets = stacked
      ? [...COMPONENTS].reverse().map((c) => ({
          label: c.label,
          data: DAY.series[c.key],
          borderColor: c.color,
          backgroundColor: `${c.color}d9`,
          borderWidth: 0,
          fill: true,
          pointRadius: 0,
          tension: 0.08,
        }))
      : [
          {
            label: 'Metered demand',
            data: DAY.total,
            borderColor: '#12161c',
            backgroundColor: 'rgba(18,22,28,0.06)',
            borderWidth: 1.8,
            fill: true,
            pointRadius: 0,
            tension: 0.1,
          },
        ];

    chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: axisOpts(stacked),
      plugins: [bandPlugin],
    });

    root.querySelector('#gb-title').textContent = stacked
      ? 'Disaggregated into five end uses'
      : 'Total household demand';
  }

  root.querySelectorAll('#gb-seg button').forEach((btn) => {
    btn.onclick = () => {
      mode = btn.dataset.mode;
      root
        .querySelectorAll('#gb-seg button')
        .forEach((b) => b.classList.toggle('is-on', b === btn));
      draw();
    };
  });

  draw();

  return () => chart?.destroy();
}
