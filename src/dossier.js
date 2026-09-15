// Home dossier — opened by double-clicking a marker on the map.
// Shows everything the three intelligence layers know about one address, and
// where each fact came from.

import { attributeSources, provenanceFor, PROVENANCE_LABELS } from './data/homes.js';
import { PERMITS_BY_HOME } from './data/permits.js';
import { runPipeline } from './layers/permits.js';
import { assetFlags, ASSET_META, icon } from './icons.js';
import { usd, num, pct, shortDate, esc } from './format.js';

/** Asset register: what is installed, and when it went in. */
function registerHtml(home) {
  const flags = assetFlags(home);
  const rows = [
    {
      key: 'panel',
      label: `${home.panelAmps} A service panel`,
      year: home.installs.panel,
      detail: `${home.serviceKw} kW · ${home.headroomAmps} A spare`,
    },
    {
      key: 'heatPump',
      label: home.hasHeatPump ? 'Air-source heat pump' : 'Gas furnace',
      year: home.installs.heatPump,
      detail: home.hasHeatPump ? 'Space heating + cooling' : 'Replacement candidate',
    },
    {
      key: 'waterHeater',
      label:
        home.waterHeater === 'heat-pump'
          ? 'Heat pump water heater'
          : home.waterHeater === 'electric-resistance'
          ? 'Electric resistance water heater'
          : 'Gas storage water heater',
      year: home.installs.waterHeater,
      detail: home.waterHeater === 'heat-pump' ? 'Thermal storage available' : 'Replacement candidate',
    },
    {
      key: 'solar',
      label: home.hasSolar ? 'Rooftop PV array' : 'No rooftop PV',
      year: home.installs.solar,
      detail: home.hasSolar ? 'Detected from imagery' : 'Roof unshaded, array feasible',
    },
    {
      key: 'ev',
      label: home.hasEV ? 'Level 2 EV charger' : 'No EV charging',
      year: home.installs.ev,
      detail: home.hasEV
        ? home.usesEms
          ? 'Load-managed circuit'
          : 'Unmanaged 32 A circuit'
        : 'No dedicated circuit',
    },
    {
      key: 'battery',
      label: home.hasBattery ? 'Home battery' : 'No storage',
      year: home.installs.battery,
      detail: home.hasBattery ? '13.5 kWh · backup capable' : 'No outage cover',
    },
  ];

  return rows
    .map(
      (r) => `
    <div class="register__row ${flags[r.key] ? '' : 'is-absent'}">
      <span class="register__icon">${icon(r.key, flags[r.key])}</span>
      <div class="register__main">
        <div class="register__label">${esc(r.label)}</div>
        <div class="register__detail">${esc(r.detail)}</div>
      </div>
      <span class="register__year">${r.year ? `installed ${r.year}` : '—'}</span>
    </div>`
    )
    .join('');
}

let cleanup = null;

export function openDossier(home) {
  closeDossier();

  const permit = PERMITS_BY_HOME.get(home.id);
  const prov = provenanceFor(home);
  const attrs = attributeSources(home);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <article class="dossier" role="dialog" aria-modal="true">
      <header class="dossier__head">
        <div>
          <h2 class="dossier__addr">${esc(home.address)}</h2>
          <div class="dossier__meta">
            ${esc(home.neighborhood)} · built ${home.yearBuilt} · ${num(home.sqft)} sq ft
          </div>
          <div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap">
            <span class="tag tag--${home.ready ? 'ready' : 'upgrade'}">
              ${home.ready ? 'Can electrify today' : `Needs ${home.panelAmps}A → 200A service upgrade`}
            </span>
            ${prov
              .map(
                (p) =>
                  `<span class="tag tag--${p.toLowerCase()}">${esc(PROVENANCE_LABELS[p])}</span>`
              )
              .join('')}
          </div>
        </div>
        <button class="dossier__close" aria-label="Close dossier">&times;</button>
      </header>

      <div class="dossier__body">
        <section>
          <div class="sec__title">Asset register</div>
          <div class="register">${registerHtml(home)}</div>
          <div class="register__foot">
            Service utilisation ${pct(home.utilNow, 0)} today, ${pct(
    home.utilProjected,
    0
  )} after full electrification · sustainability rank ${num(home.rank)} of ${num(
    255
  )} · ${num(home.hoodRank)} of ${num(home.hoodCount)} in ${esc(home.neighborhood)}
          </div>
        </section>

        <section>
          <div class="sec__title">Where each attribute came from</div>
          <div class="assets">
            ${attrs
              .map(
                (a) => `
              <div class="asset">
                <span class="asset__label">${esc(a.label)}</span>
                <span class="asset__value">${esc(a.value)}</span>
                <span>${
                  a.source
                    ? `<span class="tag tag--${a.source.toLowerCase()}">${esc(
                        PROVENANCE_LABELS[a.source]
                      )}</span>`
                    : `<span class="tag tag--muted">modelled</span>`
                }</span>
              </div>`
              )
              .join('')}
            <div class="asset">
              <span class="asset__label">Service capacity</span>
              <span class="asset__value">${home.existingAmps}A used of ${Math.round(
    home.panelAmps * 0.8
  )}A usable</span>
              <span><span class="tag tag--muted">${home.headroomAmps}A spare</span></span>
            </div>
          </div>
        </section>

        <div class="grid grid--2">
          <section>
            <div class="sec__title">Retrofit scope</div>
            <div class="ledger">
              ${home.measures
                .map(
                  (m) => `<div class="ledger__row"><span>${esc(m.label)}</span><span>${usd(
                    m.cost
                  )}</span></div>`
                )
                .join('')}
              <div class="ledger__row is-total"><span>Total</span><span>${usd(
                home.retrofitCost
              )}</span></div>
            </div>
          </section>

          <section>
            <div class="sec__title">Household outcome</div>
            <div class="ledger">
              ${home.billSavingsParts
                .map(
                  (p) => `<div class="ledger__row ${
                    p.value < 0 ? 'is-neg' : ''
                  }"><span>${esc(p.label)}</span><span>${
                    p.value < 0 ? '−' : ''
                  }${usd(Math.abs(p.value))}/mo</span></div>`
                )
                .join('')}
              <div class="ledger__row is-total"><span>Net bill impact</span><span>${usd(
                home.billSavingsMonthly
              )}/mo</span></div>
              <div class="ledger__row"><span>Carbon avoided</span><span>${home.co2TonsPerYear.toFixed(
                1
              )} t/yr</span></div>
              <div class="ledger__row"><span>Flexible load (coincident)</span><span>${home.flexKw.toFixed(
                1
              )} kW</span></div>
            </div>
          </section>
        </div>

        <section id="dossier-permit"></section>
      </div>
    </article>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const permitSlot = modal.querySelector('#dossier-permit');
  let cancelPipeline = null;

  if (permit) {
    permitSlot.innerHTML = `
      <div class="sec__title">Layer 1 · permit record on file</div>
      <div class="permit-card">
        <div class="permit-card__top">
          <span class="permit-card__no">${esc(permit.number)}</span>
          <span class="permit-card__date">${esc(shortDate(permit.date))} · ${esc(
      permit.type
    )} · ${usd(permit.valuation)}</span>
        </div>
        <div class="permit-card__addr">${esc(permit.address)}</div>
        <div class="permit-card__desc">${esc(permit.description)}</div>
      </div>
      <div style="height:12px"></div>
      <div id="dossier-pipeline"></div>
    `;
    cancelPipeline = runPipeline(
      permitSlot.querySelector('#dossier-pipeline'),
      permit
    );
  } else {
    permitSlot.innerHTML = `
      <div class="sec__title">Layer 1 · permits</div>
      <div class="card"><div class="card__body" style="color:var(--ink)">
        No building permit on file for this address. Panel and equipment attributes here are
        ${
          home.hasAmi
            ? 'inferred from Layer 3 interval data and Layer 2 imagery.'
            : 'modelled from vintage and neighbourhood stock, with no meter or permit evidence.'
        }
      </div></div>
    `;
  }

  const close = () => closeDossier();
  modal.querySelector('.dossier__close').onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  cleanup = () => {
    cancelPipeline?.();
    document.removeEventListener('keydown', onKey);
    modal.remove();
    document.body.style.overflow = '';
  };
}

export function closeDossier() {
  cleanup?.();
  cleanup = null;
}
