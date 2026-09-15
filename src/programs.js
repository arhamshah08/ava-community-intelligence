// Programs — which value streams are running, and how they stack.
//
// A controllable kW can be sold into more than one programme and a retrofit can
// draw on more than one incentive. Switching programmes on and off here
// reprices every household in the app.

import {
  HOMES,
  PROGRAMS,
  PROGRAM_RATES,
  programOn,
  setProgram,
  communityRollup,
  stackFor,
  rankMeasures,
  benefitsFor,
} from './data/homes.js';
import { usd, usdShort, num, pct, esc } from './format.js';

/** How many households a programme can actually pay, given the current mix. */
function eligibleCount(id) {
  return HOMES.filter((h) => {
    const { ranked } = rankMeasures(h);
    const st = stackFor(h);
    if (id === 'flex' || id === 'dr') return st.flexKw > 0;
    if (id === 'lcfs') return h.hasEV || ranked.some((m) => m.key === 'ev');
    if (id === 'sgip') return ranked.some((m) => m.key === 'battery');
    if (id === 'ee') return ranked.length > 0;
    return false;
  }).length;
}

/** Community value contributed by each revenue programme in the current mix. */
function contributions() {
  const out = new Map();
  for (const h of HOMES) {
    for (const row of stackFor(h).annual) {
      out.set(row.id, (out.get(row.id) || 0) + row.amount);
    }
  }
  return out;
}

export function renderPrograms(root) {
  root.innerHTML = '<div class="page" id="prog-page"></div>';
  const page = root.querySelector('#prog-page');

  function draw() {
    const r = communityRollup();
    const contrib = contributions();
    const total = [...contrib.values()].reduce((s, v) => s + v, 0);
    const revenueRows = [
      { id: 'bills', label: 'Bill savings', always: true },
      ...PROGRAMS.filter((p) => p.pays === 'revenue' && programOn(p.id)),
    ];
    const maxContrib = Math.max(1, ...revenueRows.map((x) => contrib.get(x.id) || 0));

    page.innerHTML = `
      <header class="page__head">
        <div class="page__eyebrow">Programs</div>
        <h1 class="page__title">Stack the programmes, and see what a household is worth</h1>
        <p class="page__sub">
          Mix the value streams below. Revenue programmes pay a household every year;
          capex programmes lower what it has to put in. Every number on the other tabs
          follows this mix.
        </p>
      </header>

      <div class="kpis" style="margin-bottom:22px">
        <div class="kpi">
          <div class="kpi__label">A household earns</div>
          <div class="kpi__value">${usd(r.avgEarnings)}<span>/yr</span></div>
          <div class="kpi__foot">${num(
            [...PROGRAMS].filter((p) => programOn(p.id)).length
          )} of ${num(PROGRAMS.length)} programmes running</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">The community earns</div>
          <div class="kpi__value">${usdShort(r.earnings)}<span>/yr</span></div>
          <div class="kpi__foot">across ${num(r.homes)} households</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Homes with an upgrade that pays</div>
          <div class="kpi__value">${num(r.withOffer)}<span> of ${num(r.homes)}</span></div>
          <div class="kpi__foot">clearing the ${pct(0.06, 0)} return floor</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Homes gaining outage cover</div>
          <div class="kpi__value">${num(r.gainsBackup)}<span> × 18 h</span></div>
          <div class="kpi__foot">storage that pencils in this mix</div>
        </div>
      </div>

      <div class="two-col two-col--wide">
        <section class="card">
          <div class="card__head">
            <span class="card__title">Programmes</span>
            <span class="card__note">mix them</span>
          </div>
          <div class="card__body" style="padding-top:8px">
            <div class="proglist">
              ${PROGRAMS.map((p) => {
                const on = programOn(p.id);
                const c = contrib.get(p.id) || 0;
                return `
                <div class="progrow ${on ? 'is-on' : ''}">
                  <button class="switch ${on ? 'is-on' : ''}" data-id="${p.id}"
                          role="switch" aria-checked="${on}" aria-label="${esc(p.name)}">
                    <span></span>
                  </button>
                  <div class="progrow__main">
                    <div class="progrow__name">${esc(p.name)}</div>
                    <div class="progrow__blurb">${esc(p.blurb)}</div>
                  </div>
                  <div class="progrow__nums">
                    <div class="progrow__unit">${esc(p.unit)}</div>
                    <div class="progrow__eff">${
                      !on
                        ? 'off'
                        : p.pays === 'revenue'
                        ? `${usdShort(c)}/yr · ${num(eligibleCount(p.id))} homes`
                        : `${num(eligibleCount(p.id))} homes`
                    }</div>
                  </div>
                </div>`;
              }).join('')}
            </div>
            ${
              programOn('flex') && programOn('dr')
                ? `<p class="dash-note">Both flexibility programmes are running, so wholesale
                   demand response is paid at ${pct(
                     PROGRAM_RATES.drHaircut,
                     0
                   )} — the same kW cannot be
                   sold twice at full value.</p>`
                : ''
            }
          </div>
        </section>

        <section class="card">
          <div class="card__head">
            <span class="card__title">Where the money comes from</span>
            <span class="card__note">community, per year</span>
          </div>
          <div class="card__body">
            <div class="hoodlist">
              ${revenueRows
                .map((x) => {
                  const c = contrib.get(x.id) || 0;
                  return `
                <div class="hoodrow">
                  <span class="hoodrow__name">${esc(x.label || x.name)}</span>
                  <span class="hoodrow__bar"><span style="width:${
                    (c / maxContrib) * 100
                  }%"></span></span>
                  <span class="hoodrow__val">${usdShort(c)}</span>
                  <span class="hoodrow__sub">${pct(
                    total ? c / total : 0,
                    0
                  )} of what the community earns</span>
                </div>`;
                })
                .join('')}
            </div>
            ${
              revenueRows.length === 1
                ? `<p class="dash-note">No revenue programme is running. Households keep only
                   what they save on their own bills.</p>`
                : ''
            }
          </div>
        </section>
      </div>

      <section class="card" style="margin-top:16px">
        <div class="card__head">
          <span class="card__title">How it stacks for one household</span>
          <span class="card__note">highest earning first</span>
        </div>
        <div class="card__body" style="padding-top:8px">
          <div class="drill">
            ${[...HOMES]
              .sort((a, b) => benefitsFor(b).totalCash - benefitsFor(a).totalCash)
              .slice(0, 5)
              .map((h) => {
                const st = stackFor(h);
                return `
              <button class="drill__row" data-home="${h.id}">
                <span class="drill__who">
                  <b>${esc(h.address)}</b>
                  <small>${st.annual
                    .map((x) => `${esc(x.label)} ${usd(x.amount)}`)
                    .join(' + ')}</small>
                </span>
                <span class="drill__val">${usd(st.total)}<small>/yr</small></span>
                <span class="drill__go">Open</span>
              </button>`;
              })
              .join('')}
          </div>
        </div>
      </section>
    </div>
    `;

    page.querySelectorAll('.switch').forEach((b) => {
      b.onclick = () => {
        setProgram(b.dataset.id, !programOn(b.dataset.id));
        draw();
      };
    });
    page.querySelectorAll('.drill__row').forEach((b) => {
      b.onclick = () => {
        window.location.hash = `#/customers/${b.dataset.home}`;
      };
    });
  }

  draw();
  return null;
}
