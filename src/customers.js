// Customers tab.
//
// The layers tell you what is behind each meter. This tab is what you do with
// that: the single measure worth the most to each household, what the grid
// operator needs to know about them, and a message written for the benefit
// that particular household actually responds to.

import {
  HOMES,
  measuresFor,
  rankMeasures,
  operatorInsight,
  benefitsFor,
  netCapex,
  roiOf,
  paybackOf,
  ROI_FLOOR,
  dcProgramEnabled,
  stackFor,
  explainFor,
  ladderFor,
} from './data/homes.js';
import { assetStrip, icon } from './icons.js';
import { usd, num, pct, esc } from './format.js';

// The five benefit categories a message can lead with.
const ANGLES = [
  { id: 'roi', label: 'Return', hint: 'Money back, fastest payback first' },
  { id: 'environmental', label: 'Environment', hint: 'Tonnes of carbon off the property' },
  { id: 'resilience', label: 'Resilience', hint: 'Staying powered through an outage' },
  { id: 'community', label: 'Community', hint: 'Local jobs and neighbourhood revenue' },
  { id: 'leaderboard', label: 'Standing', hint: 'Where they rank among neighbours' },
];

function insightTagClass(level) {
  return (
    {
      blocked: 'tag--upgrade',
      inspect: 'tag--p1',
      opportunity: 'tag--p2',
      ready: 'tag--ready',
      watch: 'tag--muted',
    }[level] || 'tag--muted'
  );
}

/** Composes the outreach message for one household and one benefit angle. */
function composeMessage(home, angle) {
  const { top, prerequisite } = rankMeasures(home);
  const b = benefitsFor(home);
  const measure = top ? top.phrase : 'an upgrade';

  const cat = measuresFor(home);
  const gate = prerequisite
    ? ` Your ${home.panelAmps} A panel has to be upgraded first — that work is covered at ${usd(
        netCapex(cat.panel)
      )} after incentives, and it is what unlocks everything below.`
    : '';

  const bodies = {
    roi: `A ${measure} is the single best return on your property right now: ${usd(
      netCapex(top || cat.hpwh)
    )} after incentives, returning about ${usd(
      (top || cat.hpwh).cash
    )} a year. That pays for itself in ${
      paybackOf(top || cat.hpwh)?.toFixed(1) ?? '—'
    } years, and keeps paying after that.${gate}`,

    environmental: `Electrifying ${esc(
      home.address
    )} takes about ${b.environmental.co2TonsPerYear} tonnes of CO₂ off the property every year — that is ${
      b.environmental.thermsOffGas
    } therms of gas you stop burning. Starting with a ${measure} gets you most of the way.${gate}`,

    resilience: b.resilience.critical
      ? `Adding storage alongside your other equipment keeps the essentials running for about ${b.resilience.backupHours} hours through a PSPS shutoff or a storm outage — fridge, lights, medical equipment and internet, without a generator.${gate}`
      : `Right now an outage takes everything out at ${esc(
          home.address
        )}. A battery is the only measure that changes that, and it pairs with the ${measure} we are already recommending.${gate}`,

    community: `Every ${usd(
      b.roi.bundleCapex
    )} retrofit puts roughly ${usd(
      b.community.localLabour
    )} into local installers, and enrolling your ${
      b.community.flexKw
    } kW of flexible load earns about ${usd(
      b.community.flexRevenueYr
    )} a year that stays in ${esc(
      home.neighborhood
    )} instead of paying for a new substation.${gate}`,

    leaderboard: `${esc(home.neighborhood)} has ${num(
      home.hoodCount
    )} homes on our map and yours currently ranks ${num(
      home.hoodRank
    )}. A ${measure} would move you into the top ${Math.max(
      5,
      Math.round((home.hoodRank / home.hoodCount) * 100) - 20
    )}% of the neighbourhood — and you would be ahead of ${num(
      Math.max(0, HOMES.length - home.rank)
    )} households territory-wide.${gate}`,
  };

  return `Hello,

${bodies[angle]}

Ava Community Energy covers the assessment and handles the paperwork. Reply and we will book a visit.

— Ava Community Energy`;
}

export function renderCustomers(root, preselectId) {
  const state = {
    sort: 'mix',
    filter: 'all',
    selectedId: null,
    angle: 'roi',
  };

  root.innerHTML = `
    <div class="page">
      <header class="page__head">
        <div class="page__eyebrow">Customers</div>
        <h1 class="page__title">What to offer each household, and why they will say yes</h1>
        <p class="page__sub">
          Every row is scored from the three intelligence layers. The recommendation is the
          measure with the best cash return that this household does not already have; the
          operator note is what matters before anyone is enrolled.
        </p>
      </header>

      <div class="toolbar">
        <div class="seg" id="c-filter">
          <button data-f="all" class="is-on">All</button>
          <button data-f="ready">Ready today</button>
          <button data-f="blocked">Upgrade needed</button>
          <button data-f="solar">Has solar</button>
        </div>
        <div class="seg" id="c-sort">
          <button data-s="mix" class="is-on">Mixed</button>
          <button data-s="roi">Best return</button>
          <button data-s="score">Sustainability rank</button>
          <button data-s="flex">Flexibility</button>
        </div>
        <span class="progflag" id="c-progflag"></span>
        <span class="synthetic" style="margin-left:auto">Synthetic households</span>
      </div>

      <div class="two-col two-col--wide">
        <section class="card">
          <div class="card__head">
            <span class="card__title">Customer list</span>
            <span class="card__note" id="c-count"></span>
          </div>
          <div class="ctable-wrap">
            <table class="tbl ctable">
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Recommend</th>
                  <th>Value stack</th>
                  <th class="num">Next</th>
                </tr>
              </thead>
              <tbody id="c-rows"></tbody>
            </table>
          </div>
        </section>

        <div id="c-detail"></div>
      </div>

      <section class="card" style="margin-top:16px">
        <div class="card__head">
          <span class="card__title">Sustainability leaderboard</span>
          <span class="card__note">electrification progress, territory-wide</span>
        </div>
        <div class="card__body">
          <div class="leader" id="c-leader"></div>
        </div>
      </section>
    </div>
  `;

  const rowsEl = root.querySelector('#c-rows');
  const detailEl = root.querySelector('#c-detail');

  function pool() {
    let list = HOMES;
    if (state.filter === 'ready') list = list.filter((h) => h.ready);
    if (state.filter === 'blocked') list = list.filter((h) => !h.ready);
    if (state.filter === 'solar') list = list.filter((h) => h.hasSolar);

    const sorted = [...list];
    if (state.sort === 'mix') {
      // Round-robin across recommendation types, best return first inside each,
      // so the top of the list shows the range of offers rather than 60 of the
      // single highest-ROI measure.
      const groups = new Map();
      for (const h of list) {
        const k = rankMeasures(h).top?.key || 'none';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(h);
      }
      const roiOfHome = (h) => {
        const t = rankMeasures(h).top;
        return t ? roiOf(t) : -1;
      };
      for (const g of groups.values()) g.sort((a, b) => roiOfHome(b) - roiOfHome(a));
      const keys = [...groups.keys()].filter((k) => k !== 'none');
      keys.sort((a, b) => roiOfHome(groups.get(b)[0]) - roiOfHome(groups.get(a)[0]));
      if (groups.has('none')) keys.push('none');
      const out = [];
      for (let i = 0; out.length < list.length; i++) {
        let added = false;
        for (const k of keys) {
          const row = groups.get(k)[i];
          if (row) {
            out.push(row);
            added = true;
          }
        }
        if (!added) break;
      }
      return out.slice(0, 60);
    }
    if (state.sort === 'roi') {
      sorted.sort((a, b) => {
        const ra = rankMeasures(a).top,
          rb = rankMeasures(b).top;
        return (rb ? roiOf(rb) : 0) - (ra ? roiOf(ra) : 0);
      });
    } else if (state.sort === 'score') {
      sorted.sort((a, b) => b.score - a.score);
    } else {
      sorted.sort((a, b) => b.flexKw - a.flexKw);
    }
    return sorted.slice(0, 60);
  }

  function drawRows() {
    const list = pool();
    // One scale across the visible rows, so the bars are comparable.
    const maxStack = Math.max(1, ...list.map((h) => ladderFor(h).total));
    root.querySelector('#c-count').textContent = `showing ${num(
      list.length
    )} of ${num(HOMES.length)}`;

    rowsEl.innerHTML = list
      .map((h) => {
        const { top } = rankMeasures(h);
        const lad = ladderFor(h);
        return `
        <tr data-id="${h.id}" class="${h.id === state.selectedId ? 'is-sel' : ''}">
          <td>
            <div class="ctable__addr">${esc(h.address)}</div>
            <div class="ctable__sub">${esc(h.neighborhood)} · ${num(
          h.netKwh
        )} kWh/yr · ${h.flexKw} kW flexible</div>
          </td>
          <td>
            <span class="tag ${h.ready ? 'tag--ready' : 'tag--upgrade'}">${
          top ? esc(top.short) : 'Nothing pays yet'
        }</span>
          </td>
          <td>${stackBar(lad, maxStack)}</td>
          <td class="num ctable__next">${
            lad.next ? esc(lad.next.short) : 'Fully stacked'
          }</td>
        </tr>`;
      })
      .join('');

    rowsEl.querySelectorAll('tr').forEach((tr) => {
      tr.onclick = () => selectHome(tr.dataset.id);
      tr.ondblclick = () => openWhy(HOMES.find((h) => h.id === tr.dataset.id));
    });
  }

  function selectHome(id) {
    state.selectedId = id;
    rowsEl
      .querySelectorAll('tr')
      .forEach((tr) => tr.classList.toggle('is-sel', tr.dataset.id === id));
    drawDetail();
  }

  function drawDetail() {
    const home = HOMES.find((h) => h.id === state.selectedId);
    if (!home) {
      detailEl.innerHTML = `
        <div class="card"><div class="card__body">
          <div class="empty-state empty-state--sm">
            <h3>Select a household</h3>
            <p>Pick a row to see the full recommendation, the operator note, the five benefit
               angles and a message drafted for whichever one lands.</p>
          </div>
        </div></div>`;
      return;
    }

    const { ranked, belowBar, prerequisite, top } = rankMeasures(home);
    const b = benefitsFor(home);
    const ins = operatorInsight(home);

    detailEl.innerHTML = `
      <div style="display:grid;gap:16px">
        <section class="card">
          <div class="card__head">
            <div>
              <div class="card__title">${esc(home.address)}</div>
              <div class="card__note">${esc(
      home.neighborhood
    )} · built ${home.yearBuilt} · ${home.panelAmps} A</div>
            </div>
            <span class="tag ${home.ready ? 'tag--ready' : 'tag--upgrade'}">${
      home.ready ? 'Ready today' : 'Upgrade first'
    }</span>
          </div>
          <div class="card__body">
            <div class="sec__title">Most valuable next move</div>
            ${
              top
                ? `<div class="reco">
                     <div class="reco__top">
                       <span class="reco__icon">${icon(top.key)}</span>
                       <div>
                         <div class="reco__label">${esc(top.label)}</div>
                         <div class="reco__why">${esc(top.why)}</div>
                       </div>
                     </div>
                     <div class="reco__nums">
                       <div><div class="stat__label">Net cost</div><div class="stat__value">${usd(
                         netCapex(top)
                       )}</div><div class="stat__foot">after ${usd(
                    top.incentive
                  )} incentive</div></div>
                       <div><div class="stat__label">Annual value</div><div class="stat__value" style="color:var(--ink)">${usd(
                         top.cash
                       )}</div><div class="stat__foot">bill + flexibility</div></div>
                       <div><div class="stat__label">Return</div><div class="stat__value">${pct(
                         roiOf(top),
                         0
                       )}</div><div class="stat__foot">${
                    paybackOf(top)?.toFixed(1) ?? '—'
                  } yr payback</div></div>
                     </div>
                   </div>`
                : `<p class="nobar">Nothing on this property clears the return bar today${
                    dcProgramEnabled()
                      ? ''
                      : ' — switch the data centre programme on and it will'
                  }.</p>`
            }
            ${
              prerequisite
                ? `<div class="prereq">
                     <b>Prerequisite:</b> ${esc(prerequisite.label)} · ${usd(
                    netCapex(prerequisite)
                  )} net. ${esc(prerequisite.why)}
                   </div>`
                : ''
            }

            <div class="sec__title" style="margin-top:18px">Also worth doing</div>
            <div class="ledger">
              ${ranked
                .slice(1, 4)
                .map(
                  (m) => `
                <div class="ledger__row">
                  <span>${esc(m.short)} · ${usd(netCapex(m))} net</span>
                  <span>${pct(roiOf(m), 0)} · ${
                    paybackOf(m)?.toFixed(1) ?? '—'
                  } yr</span>
                </div>`
                )
                .join('')}
              ${
                ranked.length <= 1
                  ? '<div class="ledger__row"><span>Nothing else clears the bar</span><span>—</span></div>'
                  : ''
              }
            </div>
            ${
              belowBar.length
                ? `<div class="sec__title" style="margin-top:18px">Not justified on return today</div>
                   <div class="ledger">
                     ${belowBar
                       .map(
                         (m) => `
                       <div class="ledger__row is-neg">
                         <span>${esc(m.short)} · ${usd(netCapex(m))} net</span>
                         <span>${pct(roiOf(m), 0)}</span>
                       </div>`
                       )
                       .join('')}
                   </div>
                   <p class="nobar">Worth doing for carbon or comfort, but it does not pay
                   for itself at ${pct(ROI_FLOOR, 0)} — so we do not lead with it.</p>`
                : ''
            }
          </div>
        </section>

        <section class="card">
          <div class="card__head"><span class="card__title">Grid operator note</span></div>
          <div class="card__body">
            <div style="display:flex;gap:9px;align-items:flex-start">
              <span class="tag ${insightTagClass(ins.level)}">${esc(ins.level[0].toUpperCase() + ins.level.slice(1))}</span>
              <div>
                <div style="font-size:var(--fs-sm);font-weight:var(--fw-bold)">${esc(ins.headline)}</div>
                <div style="font-size:var(--fs-sm);color:var(--ink);margin-top:3px;line-height:var(--lh-body)">${esc(
                  ins.detail
                )}</div>
              </div>
            </div>
            <div class="ledger" style="margin-top:14px">
              <div class="ledger__row"><span>Service utilisation today</span><span>${pct(
                home.utilNow,
                0
              )} of ${home.usableAmps} A usable</span></div>
              <div class="ledger__row ${
                home.utilProjected > 1 ? 'is-neg' : ''
              }"><span>After full electrification</span><span>${pct(
      home.utilProjected,
      0
    )}</span></div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__head"><span class="card__title">Why they would say yes</span></div>
          <div class="card__body">
            <div class="benefits">
              <div class="benefit">
                <div class="benefit__label">Return</div>
                <div class="benefit__value">${pct(b.roi.bundleRoi, 0)}</div>
                <div class="benefit__foot">${usd(
                  b.roi.bundleCash
                )}/yr on ${usd(b.roi.bundleCapex)} · ${
      b.roi.bundlePayback?.toFixed(1) ?? '—'
    } yr</div>
              </div>
              <div class="benefit">
                <div class="benefit__label">Environment</div>
                <div class="benefit__value">${b.environmental.co2TonsPerYear} t</div>
                <div class="benefit__foot">per year · ${usd(
                  b.environmental.carbonValue
                )} at social cost</div>
              </div>
              <div class="benefit">
                <div class="benefit__label">Resilience</div>
                <div class="benefit__value">${
                  b.resilience.backupHours || '0'
                } h</div>
                <div class="benefit__foot">${esc(b.resilience.note)}</div>
              </div>
              <div class="benefit">
                <div class="benefit__label">Community</div>
                <div class="benefit__value">${usd(b.community.localLabour)}</div>
                <div class="benefit__foot">local labour · ${usd(
                  b.community.flexRevenueYr
                )}/yr flexibility revenue</div>
              </div>
              <div class="benefit">
                <div class="benefit__label">Standing</div>
                <div class="benefit__value">#${num(home.hoodRank)}</div>
                <div class="benefit__foot">of ${num(
                  home.hoodCount
                )} in ${esc(home.neighborhood)} · #${num(home.rank)} territory-wide</div>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__head">
            <span class="card__title">Value stack</span>
            <span class="card__note">what pays this household, by programme</span>
          </div>
          <div class="card__body">
            ${stackPanel(home)}
            <div class="ledger" style="margin-top:14px">
              ${stackFor(home)
                .annual.map(
                  (row) => `
                <div class="ledger__row">
                  <span>${esc(row.label)}${
                    row.note ? ` · ${esc(row.note)}` : ''
                  }</span>
                  <span>${usd(row.amount)}/yr</span>
                </div>`
                )
                .join('')}
              <div class="ledger__row is-total"><span>Total</span><span>${usd(
                stackFor(home).total
              )}/yr</span></div>
            </div>
            ${
              stackFor(home).capex.length
                ? `<div class="ledger" style="margin-top:12px">
                     ${stackFor(home)
                       .capex.map(
                         (row) => `
                     <div class="ledger__row"><span>${esc(
                       row.label
                     )}</span><span>-${usd(row.amount)} upfront</span></div>`
                       )
                       .join('')}
                   </div>`
                : ''
            }
            <p class="nobar"><a href="#/programs" class="dash-link">Change which programmes are running</a></p>
          </div>
        </section>

        <section class="card">
          <div class="card__head">
            <span class="card__title">Personalised outreach</span>
            <span class="card__note">lead with the angle that lands</span>
          </div>
          <div class="card__body">
            <div class="filters__row" id="c-angles">
              ${ANGLES.map(
                (a) =>
                  `<button class="chip ${
                    a.id === state.angle ? 'is-on' : ''
                  }" data-angle="${a.id}" title="${esc(a.hint)}">${esc(a.label)}</button>`
              ).join('')}
            </div>
            <textarea class="message" id="c-message" rows="11" spellcheck="false"></textarea>
            <div style="display:flex;gap:9px;margin-top:10px;align-items:center">
              <button class="btn" id="c-copy">Copy message</button>
              <span class="card__note" id="c-copied"></span>
            </div>
          </div>
        </section>
      </div>
    `;

    const msg = detailEl.querySelector('#c-message');
    msg.value = composeMessage(home, state.angle);

    detailEl.querySelectorAll('#c-angles .chip').forEach((chip) => {
      chip.onclick = () => {
        state.angle = chip.dataset.angle;
        detailEl
          .querySelectorAll('#c-angles .chip')
          .forEach((c) => c.classList.toggle('is-on', c === chip));
        msg.value = composeMessage(home, state.angle);
      };
    });

    detailEl.querySelector('#c-copy').onclick = async () => {
      const flag = detailEl.querySelector('#c-copied');
      try {
        await navigator.clipboard.writeText(msg.value);
        flag.textContent = 'Copied to clipboard';
      } catch {
        msg.select();
        flag.textContent = 'Selected — press ⌘C';
      }
      setTimeout(() => (flag.textContent = ''), 2600);
    };
  }

  function drawLeaderboard() {
    const top = [...HOMES].sort((a, b) => b.score - a.score).slice(0, 10);
    const max = top[0]?.score || 100;
    root.querySelector('#c-leader').innerHTML = top
      .map(
        (h, i) => `
      <button class="leader__row" data-id="${h.id}">
        <span class="leader__rank">${i + 1}</span>
        <span class="leader__who">
          <b>${esc(h.address)}</b>
          <small>${esc(h.neighborhood)}</small>
        </span>
        <span class="facets">${assetStrip(h)}</span>
        <span class="leader__bar"><span style="width:${(h.score / max) * 100}%"></span></span>
        <span class="leader__score">${h.score}</span>
      </button>`
      )
      .join('');

    root.querySelectorAll('.leader__row').forEach((b) => {
      b.onclick = () => {
        selectHome(b.dataset.id);
        root.querySelector('.ctable-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    });
  }

  root.querySelectorAll('#c-filter button').forEach((b) => {
    b.onclick = () => {
      state.filter = b.dataset.f;
      root
        .querySelectorAll('#c-filter button')
        .forEach((x) => x.classList.toggle('is-on', x === b));
      drawRows();
    };
  });
  root.querySelectorAll('#c-sort button').forEach((b) => {
    b.onclick = () => {
      state.sort = b.dataset.s;
      root
        .querySelectorAll('#c-sort button')
        .forEach((x) => x.classList.toggle('is-on', x === b));
      drawRows();
    };
  });

  root.querySelector('#c-progflag').textContent = dcProgramEnabled()
    ? 'Data centre programme: on'
    : 'Data centre programme: off';

  drawRows();
  // A drill-down from the dashboard names the household; otherwise take the top row.
  const preselect = preselectId && HOMES.some((h) => h.id === preselectId);
  if (preselect && !pool().some((h) => h.id === preselectId)) {
    state.filter = 'all';
    root
      .querySelectorAll('#c-filter button')
      .forEach((x) => x.classList.toggle('is-on', x.dataset.f === 'all'));
    drawRows();
  }
  selectHome(preselect ? preselectId : pool()[0].id);
  if (preselect) {
    root.querySelector('#c-rows tr.is-sel')?.scrollIntoView({ block: 'center' });
  }
  drawLeaderboard();

  return null;
}

// ── why this recommendation ─────────────────────────────────────────────────
// Double-clicking a row opens the audit trail: every measure in the catalogue,
// whether the household was eligible, and what the return did or did not do.

let whyCleanup = null;

function closeWhy() {
  whyCleanup?.();
  whyCleanup = null;
}

function openWhy(home) {
  if (!home) return;
  closeWhy();

  const rows = explainFor(home);
  const { top, prerequisite } = rankMeasures(home);
  const stack = stackFor(home);

  const badge = (v) =>
    ({
      recommended: 'tag--ready',
      'below the return floor': 'tag--upgrade',
      eligible: 'tag--p3',
      'not eligible': 'tag--muted',
    }[v] || 'tag--muted');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <article class="dossier" role="dialog" aria-modal="true">
      <header class="dossier__head">
        <div>
          <h2 class="dossier__addr">${esc(home.address)}</h2>
          <div class="dossier__meta">${esc(home.neighborhood)} · built ${
    home.yearBuilt
  } · ${home.panelAmps} A · ${num(home.sqft)} sq ft</div>
          <div style="margin-top:9px">
            <span class="tag ${top ? 'tag--ready' : 'tag--muted'}">${
    top ? `We recommend: ${esc(top.label)}` : 'Nothing clears the return floor'
  }</span>
          </div>
        </div>
        <button class="dossier__close" aria-label="Close">&times;</button>
      </header>

      <div class="dossier__body">
        ${
          top
            ? `<section>
                 <div class="sec__title">Why this one</div>
                 <div class="ledger">
                   <div class="ledger__row"><span>Net cost after incentives</span><span>${usd(
                     netCapex(top)
                   )}</span></div>
                   <div class="ledger__row"><span>Saved on its own bills</span><span>${usd(
                     top.baseCash
                   )}/yr</span></div>
                   <div class="ledger__row"><span>Earned from programmes</span><span>${usd(
                     top.cash - top.baseCash
                   )}/yr</span></div>
                   <div class="ledger__row is-total"><span>Return</span><span>${pct(
                     roiOf(top),
                     0
                   )} · ${paybackOf(top)?.toFixed(1) ?? '—'} yr</span></div>
                 </div>
                 <p class="nobar">${esc(top.why)}</p>
               </section>`
            : ''
        }

        ${
          prerequisite
            ? `<div class="prereq"><b>Before anything:</b> ${esc(
                prerequisite.label
              )} · ${usd(
                netCapex(prerequisite)
              )} net. The ${home.panelAmps} A service is at ${pct(
                home.utilProjected,
                0
              )} of usable capacity once electrified.</div>`
            : ''
        }

        <section>
          <div class="sec__title">Every measure we checked</div>
          <div class="whytable">
            ${rows
              .map(
                (r) => `
              <div class="whyrow ${r.eligible ? '' : 'is-out'}">
                <span class="whyrow__mark ${r.eligible ? 'ok' : 'no'}">${
                  r.eligible ? '✓' : '✕'
                }</span>
                <div class="whyrow__main">
                  <div class="whyrow__name">${esc(r.short)}</div>
                  <div class="whyrow__reason">${esc(r.reason)}</div>
                </div>
                <span class="tag ${badge(r.verdict)}">${esc(r.verdict)}</span>
                <span class="whyrow__roi">${r.eligible ? pct(r.roi, 0) : '—'}</span>
              </div>`
              )
              .join('')}
          </div>
          <p class="nobar">A measure is only recommended when the household is eligible
             for it and the return clears ${pct(ROI_FLOOR, 0)}.</p>
        </section>

        <section>
          <div class="sec__title">What pays for it</div>
          <div class="ledger">
            ${stack.annual
              .map(
                (row) =>
                  `<div class="ledger__row"><span>${esc(row.label)}${
                    row.note ? ` · ${esc(row.note)}` : ''
                  }</span><span>${usd(row.amount)}/yr</span></div>`
              )
              .join('')}
            <div class="ledger__row is-total"><span>Total</span><span>${usd(
              stack.total
            )}/yr</span></div>
          </div>
        </section>
      </div>
    </article>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.querySelector('.dossier__close').onclick = closeWhy;
  modal.onclick = (e) => {
    if (e.target === modal) closeWhy();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') closeWhy();
  };
  document.addEventListener('keydown', onKey);
  whyCleanup = () => {
    document.removeEventListener('keydown', onKey);
    modal.remove();
    document.body.style.overflow = '';
  };
}

// ── value stack bar ─────────────────────────────────────────────────────────
// Each earned rung is a filled segment sized by what it pays; the next rung is
// drawn as an outline, so you can see what the household has and what is still
// on the table.

function stackBar(lad, max, opts = {}) {
  const earned = lad.steps.filter((s) => s.state === 'earned' && s.amount > 0);
  const scale = (v) => `${Math.max(0, (v / max) * 100)}%`;
  const segs = earned
    .map(
      (s) =>
        `<span class="seg seg--${s.id}" style="width:${scale(
          s.amount
        )}" title="${s.label}"></span>`
    )
    .join('');
  const next =
    lad.next && !opts.hideNext
      ? `<span class="seg seg--next" style="width:${scale(
          max * (opts.nextShare ?? 0.12)
        )}" title="Next: ${lad.next.label}"></span>`
      : '';
  return `<span class="stackbar">${segs}${next}</span>`;
}

/** The full stack for one household: bar, legend, and the next rung. */
function stackPanel(home) {
  const lad = ladderFor(home);
  const max = Math.max(1, lad.total);

  return `
    <div class="stackwrap">
      <div class="stackwrap__top">
        <div>
          <div class="stackwrap__total">${usd(lad.total)}<small>/yr</small></div>
          <div class="stackwrap__sub">${num(
            home.netKwh
          )} kWh a year · ${lad.flexKw} kW controllable</div>
        </div>
      </div>
      ${stackBar(lad, max, { hideNext: true })}
      <div class="stacklegend">
        ${lad.steps
          .filter((s) => s.amount > 0)
          .map(
            (s) => `
          <div class="stacklegend__row">
            <span class="swatch swatch--${s.id}"></span>
            <span>${esc(s.label)}</span>
            <b>${usd(s.amount)}</b>
          </div>`
          )
          .join('')}
      </div>
      ${
        lad.next
          ? `<div class="nextrung">
               <div class="nextrung__label">Next in the stack</div>
               <div class="nextrung__name">${esc(lad.next.label)}</div>
               <div class="nextrung__need">${esc(
                 lad.next.blocked || 'Ready to enrol now'
               )}</div>
             </div>`
          : `<div class="nextrung"><div class="nextrung__label">Next in the stack</div>
               <div class="nextrung__name">Fully stacked</div>
               <div class="nextrung__need">Every programme this household qualifies for is already paying.</div>
             </div>`
      }
    </div>`;
}
