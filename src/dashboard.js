// Community dashboard — the landing screen.
//
// Every number is the sum of the per-household figures on the Customers tab,
// so the aggregate and the drill-down can never disagree. The toggle switches
// the data centre programme off and on and reprices the whole community.

import {
  HOMES,
  communityRollup,
  rollupByNeighborhood,
  topEarners,
  benefitsFor,
  rankMeasures,
  setDcProgram,
  dcProgramEnabled,
} from './data/homes.js';
import { usd, usdShort, num, pct, esc } from './format.js';

const BATTERY_HOURS = 18;

/** Roll up the community in both states so the comparison is always available. */
function bothStates() {
  const was = dcProgramEnabled();
  setDcProgram(false);
  const off = { ...communityRollup(), hoods: rollupByNeighborhood() };
  setDcProgram(true);
  const on = { ...communityRollup(), hoods: rollupByNeighborhood() };
  setDcProgram(was);
  return { off, on };
}

export function renderDashboard(root) {
  root.innerHTML = '<div class="page" id="dash-page"></div>';
  const page = root.querySelector('#dash-page');

  function draw() {
    const { off, on } = bothStates();
    const live = dcProgramEnabled();
    const r = live ? on : off;
    const other = live ? off : on;
    const leaders = topEarners(HOMES, 6);
    const maxAvg = Math.max(...r.hoods.map((h) => h.avgEarnings));

    // Change against the other state, so the effect of the toggle is obvious
    // without reading the table underneath.
    const delta = (current, otherVal, fmt) => {
      const diff = current - otherVal;
      const up = diff > 0;
      const share = otherVal > 0 ? Math.abs(diff) / otherVal : null;
      const chip = diff === 0
        ? '<span class="delta delta--flat">no change</span>'
        : `<span class="delta delta--${up ? 'up' : 'down'}">${
            up ? '\u2191' : '\u2193'
          } ${share == null ? fmt(Math.abs(diff)) : pct(share, 0)}</span>`;
      return `${chip}<span class="delta__ref">${
        live ? 'without' : 'with'
      } the programme: ${fmt(otherVal)}</span>`;
    };

    page.innerHTML = `
      <header class="page__head">
        <div class="page__eyebrow">Community</div>
        <h1 class="page__title">What this community is worth</h1>
        <p class="page__sub">
          ${num(
            r.homes
          )} households in Ava territory. Switch the data centre programme off to
          see what the same homes are worth with nobody buying their flexibility.
        </p>
      </header>

      <div class="progbar">
        <div class="progbar__label">
          <b>Data centre programme</b>
          <span>${
            live
              ? 'On — devices earn for shifting load when the grid needs it'
              : 'Off — households keep only what they save on their own bills'
          }</span>
        </div>
        <div class="seg" id="prog-toggle">
          <button data-on="0" class="${live ? '' : 'is-on'}">Off</button>
          <button data-on="1" class="${live ? 'is-on' : ''}">On</button>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="kpi__label">A household earns</div>
          <div class="kpi__value">${usd(r.avgEarnings)}<span>/yr</span></div>
          <div class="kpi__foot">${delta(r.avgEarnings, other.avgEarnings, usd)}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">The community earns</div>
          <div class="kpi__value">${usdShort(r.earnings)}<span>/yr</span></div>
          <div class="kpi__foot">${delta(r.earnings, other.earnings, usdShort)}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Homes with an upgrade that pays</div>
          <div class="kpi__value">${num(r.withOffer)}<span> of ${num(
      r.homes
    )}</span></div>
          <div class="kpi__foot">${delta(r.withOffer, other.withOffer, num)}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Homes gaining outage cover</div>
          <div class="kpi__value">${num(r.gainsBackup)}<span> × ${BATTERY_HOURS} h</span></div>
          <div class="kpi__foot">${delta(r.gainsBackup, other.gainsBackup, num)}</div>
        </div>
      </div>

      <div class="two-col two-col--wide" style="margin-top:22px">
        <section class="card">
          <div class="card__head">
            <span class="card__title">Before and after</span>
            <span class="card__note">same ${num(r.homes)} homes, both ways</span>
          </div>
          <div class="card__body" style="padding-top:8px">
            <table class="tbl ba">
              <thead>
                <tr>
                  <th></th>
                  <th class="num">Without</th>
                  <th class="num">With</th>
                  <th class="num">Change</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['A household earns', off.avgEarnings, on.avgEarnings, usd],
                  ['The community earns', off.earnings, on.earnings, usdShort],
                  ['Homes with an upgrade that pays', off.withOffer, on.withOffer, num],
                  ['Homes gaining outage cover', off.gainsBackup, on.gainsBackup, num],
                  ['Carbon avoided (t/yr)', off.co2, on.co2, num],
                ]
                  .map(([label, a, b, fmt]) => {
                    const mult = a > 0 ? b / a : null;
                    return `<tr>
                      <td>${label}</td>
                      <td class="num">${fmt(a)}</td>
                      <td class="num"><b>${fmt(b)}</b></td>
                      <td class="num ba__delta">${
                        mult == null
                          ? `+${fmt(b)}`
                          : `${mult.toFixed(mult >= 10 ? 0 : 1)}×`
                      }</td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
            <p class="dash-note">
              Without a data centre buying flexibility, <b>${num(
                off.homes - off.withOffer
              )}</b> households have no upgrade that pays for itself, and a battery is
              financeable for only <b>${num(off.gainsBackup)}</b> of them.
            </p>
          </div>
        </section>

        <section class="card">
          <div class="card__head">
            <span class="card__title">By neighbourhood</span>
            <span class="card__note">average earnings per household</span>
          </div>
          <div class="card__body">
            <div class="hoodlist">
              ${r.hoods
                .map(
                  (h) => `
                <div class="hoodrow">
                  <span class="hoodrow__name">${esc(h.name)}</span>
                  <span class="hoodrow__bar"><span style="width:${
                    (h.avgEarnings / maxAvg) * 100
                  }%"></span></span>
                  <span class="hoodrow__val">${usd(h.avgEarnings)}</span>
                  <span class="hoodrow__sub">${num(h.ready)} of ${num(
                    h.homes
                  )} ready to electrify today</span>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </section>
      </div>

      <section class="card" style="margin-top:16px">
        <div class="card__head">
          <span class="card__title">Households</span>
          <span class="card__note">highest earning first</span>
        </div>
        <div class="card__body" style="padding-top:8px">
          <div class="drill">
            ${leaders
              .map((h) => {
                const b = benefitsFor(h);
                const top = rankMeasures(h).top;
                return `
              <button class="drill__row" data-id="${h.id}">
                <span class="drill__who">
                  <b>${esc(h.address)}</b>
                  <small>${esc(h.neighborhood)}${
                  top ? ` · start with a ${esc(top.phrase)}` : ' · nothing pays yet'
                }</small>
                </span>
                <span class="drill__val">${usd(b.totalCash)}<small>/yr</small></span>
                <span class="drill__go">Open</span>
              </button>`;
              })
              .join('')}
          </div>
          <p class="dash-note" style="margin-top:12px">
            <a href="#/customers" class="dash-link">See all ${num(
              r.homes
            )} households</a>
          </p>
        </div>
      </section>
    `;

    page.querySelectorAll('#prog-toggle button').forEach((b) => {
      b.onclick = () => {
        setDcProgram(b.dataset.on === '1');
        draw();
      };
    });
    page.querySelectorAll('.drill__row').forEach((b) => {
      b.onclick = () => {
        window.location.hash = `#/customers/${b.dataset.id}`;
      };
    });
  }

  draw();
  return null;
}
