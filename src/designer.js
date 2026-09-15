// Data centre designer — the first half of the Map tab's toggle.
//
// Size a campus, press Calculate, and the model answers three questions: what
// does it peak at, how much flexible capacity exists nearby to cover the gap,
// and how often can that flexibility actually be called. Then it prices it.

import Chart from 'chart.js/auto';
import {
  DATA_CENTERS,
  WORKLOADS,
  ECON,
  HOUSEHOLD_EVENT_CAP,
  designCampus,
} from './data/datacenters.js';
import { HOMES, SAMPLE_SCALE, TERRITORY_HOUSEHOLDS } from './data/homes.js';
import { usd, usdShort, num, pct, esc } from './format.js';

/** Straight-line distance in km, good enough for a catchment radius. */
function distanceKm(a, b) {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLng =
    (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

const CATCHMENT_KM = 5;

/**
 * The households close enough to this site to serve its feeder.
 *
 * The map holds a surveyed sample, so the sample's readiness and flexibility
 * rates are scaled to the real household count in the catchment. Both the
 * sampled evidence and the scaled estimate are returned, and the UI shows both.
 */
export function communityNearSite(site) {
  const centre = { lat: site.labelAt[0], lng: site.labelAt[1] };
  const inRange = HOMES.filter((h) => distanceKm(h, centre) <= CATCHMENT_KM);
  const enrollable = inRange.filter((h) => h.ready);
  const sampleFlexKw = enrollable.reduce((s, h) => s + h.flexKw, 0);
  const samplePotentialKw = inRange.reduce((s, h) => s + h.flexKw, 0);

  const scaledHouseholds = Math.round(inRange.length * SAMPLE_SCALE);
  const scaledReady = Math.round(enrollable.length * SAMPLE_SCALE);
  const flexKw = sampleFlexKw * SAMPLE_SCALE;
  const potentialKw = samplePotentialKw * SAMPLE_SCALE;

  return {
    // surveyed evidence
    sampled: inRange.length,
    sampledReady: enrollable.length,
    sampledBlocked: inRange.length - enrollable.length,
    sampleFlexKw: Math.round(sampleFlexKw),
    // scaled to the catchment
    households: scaledHouseholds,
    ready: scaledReady,
    blocked: scaledHouseholds - scaledReady,
    flexKw: Math.round(flexKw),
    flexMW: Math.round((flexKw / 1000) * 10) / 10,
    potentialMW: Math.round((potentialKw / 1000) * 10) / 10,
    readyShare: inRange.length ? enrollable.length / inRange.length : 0,
  };
}

export function renderDesigner(root) {
  const state = {
    itLoadMW: 34,
    workloadId: 'mixed',
    siteId: DATA_CENTERS[0].id,
    calculated: false,
  };
  let chart = null;

  root.innerHTML = `
    <div class="designer">
      <section class="card designer__inputs">
        <div class="card__head">
          <span class="card__title">Design a campus</span>
          <span class="card__note">step 1</span>
        </div>
        <div class="card__body" style="display:grid;gap:18px">
          <div class="field">
            <label class="field__label" for="d-load">
              <span>IT load</span><b id="d-load-out">${state.itLoadMW} MW</b>
            </label>
            <input type="range" id="d-load" min="2" max="90" step="1" value="${state.itLoadMW}" />
          </div>

          <div>
            <div class="filters__label">Workload</div>
            <div class="seg seg--stack" id="d-workload">
              ${WORKLOADS.map(
                (w) =>
                  `<button data-id="${w.id}" class="${
                    w.id === state.workloadId ? 'is-on' : ''
                  }">${esc(w.label)}</button>`
              ).join('')}
            </div>
          </div>

          <div>
            <div class="filters__label">Candidate site</div>
            <div class="seg seg--stack" id="d-site">
              ${DATA_CENTERS.map(
                (d) =>
                  `<button data-id="${d.id}" class="${
                    d.id === state.siteId ? 'is-on' : ''
                  }">${esc(d.shortName)}</button>`
              ).join('')}
            </div>
          </div>

          <button class="btn btn--lg" id="d-calc">Calculate</button>
        </div>
      </section>

      <div class="designer__results" id="d-results">
        <div class="empty-state">
          <div class="empty-state__mark">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#9aa5b3" stroke-width="1.4"/>
              <path d="M12 7.5v5l3 2" stroke="#9aa5b3" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Size the campus, then press Calculate</h3>
          <p>The model returns the coincident peak, the flexible capacity available nearby,
             how often it can be called, and what those services are worth.</p>
        </div>
      </div>
    </div>
  `;

  const site = () => DATA_CENTERS.find((d) => d.id === state.siteId);
  const workload = () => WORKLOADS.find((w) => w.id === state.workloadId);

  function syncNotes() {
    root.querySelector('#d-load-out').textContent = `${state.itLoadMW} MW`;
    const racks = Math.round((state.itLoadMW * 1000) / 12);
    const s = site();
  }

  function calculate() {
    const s = site();
    const d = designCampus({
      itLoadMW: state.itLoadMW,
      workloadId: state.workloadId,
      headroomMW: s.feederHeadroomMW,
    });
    const community = communityNearSite(s);

    // Can the nearby community actually cover the gap?
    const homesNeeded = Math.ceil(d.gapKW / ECON.avgFlexKwPerHome);
    const servedKw = Math.min(d.gapKW, community.flexKw);
    const shortfallKw = Math.max(0, d.gapKW - community.flexKw);
    const homesShort = Math.ceil(shortfallKw / ECON.avgFlexKwPerHome);

    // Value is priced on what can actually be delivered, not the whole gap.
    const capacityValue = servedKw * ECON.capacityPerKwYr;
    const energyValue =
      servedKw * d.eventHours * d.eventsPossible * ECON.energyPerKwh;
    const annualValue = capacityValue + energyValue;
    const deferredUpgrade = (servedKw / 1000) * ECON.deferredUpgradePerMW;
    const communityInvestment =
      Math.ceil(servedKw / ECON.avgFlexKwPerHome) * ECON.communityInvestmentPerHome;
    const payback = annualValue > 0 ? communityInvestment / annualValue : null;

    const feasible = d.gapMW === 0 || shortfallKw === 0;

    root.querySelector('#d-results').innerHTML = `
      <div class="verdict verdict--${
        d.gapMW === 0 ? 'clear' : feasible ? 'ok' : 'short'
      }">
        <div class="verdict__title">
          ${
            d.gapMW === 0
              ? 'No feeder constraint at this size'
              : feasible
              ? 'Servable from the community'
              : `Short by ${num(homesShort)} households`
          }
        </div>
        <div class="verdict__body">
          ${
            d.gapMW === 0
              ? `A ${num(d.peakMW, 1)} MW peak sits inside ${s.feeder}'s ${
                  d.headroomMW
                } MW of headroom. Scale the campus up to see the trade.`
              : feasible
              ? `The ${num(d.gapMW, 1)} MW gap needs ${num(
                  homesNeeded
                )} electrified households. The catchment holds about ${num(
                  community.ready
                )} that are ready today, carrying ${num(
                  community.flexMW,
                  1
                )} MW — enough, with ${num(
                  community.blocked
                )} more behind a panel upgrade.`
              : `The ${num(d.gapMW, 1)} MW gap needs ${num(
                  homesNeeded
                )} households but the catchment only has about ${num(
                  community.ready
                )} ready, carrying ${num(
                  community.flexMW,
                  1
                )} MW. Upgrading the ${num(
                  community.blocked
                )} blocked homes would close it.`
          }
        </div>
      </div>

      <div class="grid grid--3 designer__headline">
        <div class="card"><div class="card__body">
          <div class="stat__label">Peak demand</div>
          <div class="stat__value">${num(d.peakMW, 1)}<small> MW</small></div>
                  </div></div>
        <div class="card"><div class="card__body">
          <div class="stat__label">Flexible capacity</div>
          <div class="stat__value" style="color:var(--ink)">${num(
            community.flexMW,
            1
          )}<small> MW</small></div>
                  </div></div>
        <div class="card"><div class="card__body">
          <div class="stat__label">Call frequency</div>
          <div class="stat__value">${num(d.eventsPossible)}<small>/yr</small></div>
                  </div></div>
      </div>

      ${
        d.coverage < 1 && d.gapMW > 0
          ? `<div class="note-strip">
               Flexibility can cover <b>${pct(d.coverage, 0)}</b> of the ${num(
              d.bindingDays
            )} days this constraint binds. A flatter, always-on workload needs wire;
               a peakier one is where flexibility does the whole job — try Inference / colo.
             </div>`
          : ''
      }

      <section class="card">
        <div class="card__head">
          <span class="card__title">Demand against feeder headroom</span>
          <span class="card__note">${num(d.hoursAbove)} of 24 hours above the limit</span>
        </div>
        <div class="card__body"><div class="chartbox"><canvas id="d-chart"></canvas></div></div>
      </section>

      <section class="card">
        <div class="card__head">
          <span class="card__title">Value of the services created</span>
          <span class="card__note">priced on ${num(
            servedKw
          )} kW actually deliverable</span>
        </div>
        <div class="card__body">
          <div class="ledger">
            <div class="ledger__row"><span>Capacity · ${num(
              servedKw
            )} kW × ${usd(ECON.capacityPerKwYr)}/kW-yr</span><span>${usd(
      capacityValue
    )}</span></div>
            <div class="ledger__row"><span>Called energy · ${num(
              d.eventsPossible
            )} events × ${num(d.eventHours)} h</span><span>${usd(energyValue)}</span></div>
            <div class="ledger__row is-total"><span>Annual value</span><span>${usd(
              annualValue
            )}</span></div>
            <div class="ledger__row"><span>Distribution upgrade deferred</span><span>${usd(
              deferredUpgrade
            )}</span></div>
            <div class="ledger__row"><span>Community investment required</span><span>${usd(
              communityInvestment
            )}</span></div>
            <div class="ledger__row is-total"><span>Payback</span><span>${
              payback == null ? '—' : `${payback.toFixed(1)} yr`
            }</span></div>
          </div>
          <p class="fineprint">
            Capacity is scaled from a surveyed sample: ${num(
              community.sampled
            )} homes mapped in the ${CATCHMENT_KM} km catchment, ${pct(
      community.readyShare,
      0
    )} ready today, applied to the ~${num(
      TERRITORY_HOUSEHOLDS
    )} Oakland households in Ava's territory.
            Capacity at ${usd(ECON.capacityPerKwYr)}/kW-yr, called energy at $${ECON.energyPerKwh.toFixed(
      2
    )}/kWh,
            deferred upgrades at ${usdShort(
              ECON.deferredUpgradePerMW
            )}/MW, and ${usd(
      ECON.communityInvestmentPerHome
    )} to electrify each household.
            <span class="synthetic">Synthetic sites and load shapes</span>
          </p>
        </div>
      </section>
    `;

    // Load shape against the headroom line.
    chart?.destroy();
    chart = new Chart(root.querySelector('#d-chart'), {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
        datasets: [
          {
            label: 'Site demand (MW)',
            data: d.hourly,
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.12)',
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            tension: 0.35,
          },
          {
            label: `Feeder headroom (${d.headroomMW} MW)`,
            data: new Array(24).fill(d.headroomMW),
            borderColor: '#d4342a',
            borderWidth: 1.6,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'MW', color: '#111111', font: { size: 14 } },
            grid: { color: '#eff2f5' },
            ticks: { color: '#111111', font: { size: 14 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#111111', font: { size: 14 }, maxTicksLimit: 12 },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, boxHeight: 10, color: '#111111', font: { size: 14 } },
          },
        },
      },
    });

    state.calculated = true;
  }

  root.querySelector('#d-load').oninput = (e) => {
    state.itLoadMW = Number(e.target.value);
    syncNotes();
    if (state.calculated) calculate();
  };
  root.querySelectorAll('#d-workload button').forEach((b) => {
    b.onclick = () => {
      state.workloadId = b.dataset.id;
      root
        .querySelectorAll('#d-workload button')
        .forEach((x) => x.classList.toggle('is-on', x === b));
      syncNotes();
      if (state.calculated) calculate();
    };
  });
  root.querySelectorAll('#d-site button').forEach((b) => {
    b.onclick = () => {
      state.siteId = b.dataset.id;
      root
        .querySelectorAll('#d-site button')
        .forEach((x) => x.classList.toggle('is-on', x === b));
      syncNotes();
      if (state.calculated) calculate();
    };
  });
  root.querySelector('#d-calc').onclick = calculate;

  syncNotes();

  return () => chart?.destroy();
}
