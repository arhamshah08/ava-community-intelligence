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
import { productsFor, sizingNote } from './data/products.js';
import { usd, num, pct, esc } from './format.js';

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
  const state = { sort: 'mix', filter: 'all', selectedId: null, angle: 'roi' };

  root.innerHTML = `
    <div class="page">
      <header class="page__head">
        <div class="page__eyebrow">Customers</div>
        <h1 class="page__title">What to offer each household, and why they will say yes</h1>
        <p class="page__sub">
          Every row is scored from the three intelligence layers. Double-click a household
          to open its full case: the recommendation, the value stack, and what comes next.
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

      <section class="card">
        <div class="card__head">
          <span class="card__title">Customer list</span>
          <span class="card__note" id="c-count"></span>
        </div>
        <div class="ctable-wrap ctable-wrap--full">
          <table class="tbl ctable">
            <thead>
              <tr>
                <th>Household</th>
                <th>Assets</th>
                <th>Recommend</th>
                <th class="num">Return</th>
                <th>Value stack</th>
                <th>Next in the stack</th>
              </tr>
            </thead>
            <tbody id="c-rows"></tbody>
          </table>
        </div>
      </section>

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
    )} of ${num(HOMES.length)} · double-click for the full case`;

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
          <td><div class="facets">${assetStrip(h)}</div></td>
          <td>
            <span class="tag ${h.ready ? 'tag--ready' : 'tag--upgrade'}">${
          top ? esc(top.short) : 'Nothing pays yet'
        }</span>
          </td>
          <td class="num">${top ? pct(roiOf(top), 0) : '—'}</td>
          <td>${stackBar(lad, maxStack)}</td>
          <td class="ctable__next">${
            lad.next ? esc(lad.next.short) : 'Fully stacked'
          }</td>
        </tr>`;
      })
      .join('');

    rowsEl.querySelectorAll('tr').forEach((tr) => {
      tr.onclick = () => {
        state.selectedId = tr.dataset.id;
        rowsEl
          .querySelectorAll('tr')
          .forEach((x) => x.classList.toggle('is-sel', x === tr));
      };
      tr.ondblclick = () => openCustomer(HOMES.find((h) => h.id === tr.dataset.id));
    });
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
      b.onclick = () => openCustomer(HOMES.find((h) => h.id === b.dataset.id));
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
  drawLeaderboard();

  // A drill-down from the dashboard or Programs names a household: open it.
  const preselect = preselectId && HOMES.find((h) => h.id === preselectId);
  if (preselect) {
    state.selectedId = preselect.id;
    openCustomer(preselect);
  }

  return () => closeCustomer();
}

// ── the full case for one household ─────────────────────────────────────────
// Everything that used to sit in a side column now opens here on double-click:
// the recommendation and why it won, the value stack and what comes next, what
// we rejected, the operator note, and a message drafted for whichever benefit
// lands.

let cardCleanup = null;

function closeCustomer() {
  cardCleanup?.();
  cardCleanup = null;
}

function openCustomer(home) {
  if (!home) return;
  closeCustomer();

  const { ranked, belowBar, prerequisite, top } = rankMeasures(home);
  const b = benefitsFor(home);
  const ins = operatorInsight(home);
  const checks = explainFor(home);
  const state = { angle: 'roi' };

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
  } · ${home.panelAmps} A · ${num(home.netKwh)} kWh/yr · ${
    home.flexKw
  } kW flexible</div>
          <div style="margin-top:9px">
            <span class="tag ${home.ready ? 'tag--ready' : 'tag--upgrade'}">${
    home.ready ? 'Ready today' : 'Upgrade first'
  }</span>
          </div>
        </div>
        <button class="dossier__close" aria-label="Close">&times;</button>
      </header>

      <div class="dossier__body">
        <section>
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
                     <div><div class="stat__label">Annual value</div><div class="stat__value">${usd(
                       top.cash
                     )}</div><div class="stat__foot">bill + programmes</div></div>
                     <div><div class="stat__label">Return</div><div class="stat__value">${pct(
                       roiOf(top),
                       0
                     )}</div><div class="stat__foot">${
                  paybackOf(top)?.toFixed(1) ?? '—'
                } yr payback</div></div>
                   </div>
                   <button class="reco__shop" data-products="${top.key}">
                     See products you can buy →
                   </button>
                 </div>`
              : `<p class="nobar">Nothing on this property clears the return bar today${
                  dcProgramEnabled()
                    ? ''
                    : ' — switch the data centre programme on and it will'
                }.</p>`
          }
          ${
            prerequisite
              ? `<div class="prereq"><b>Prerequisite:</b> ${esc(
                  prerequisite.label
                )} · ${usd(netCapex(prerequisite))} net. ${esc(prerequisite.why)}</div>`
              : ''
          }
        </section>

        <section id="m-products"></section>

        <section>
          <div class="sec__title">Value stack</div>
          ${stackPanel(home)}
        </section>

        <div class="grid grid--2">
          <section>
            <div class="sec__title">Also worth doing</div>
            <div class="ledger">
              ${
                ranked.length > 1
                  ? ranked
                      .slice(1, 4)
                      .map(
                        (m) => `
                <button class="ledger__row ledger__row--link" data-products="${m.key}">
                  <span>${esc(m.short)} · ${usd(netCapex(m))} net</span>
                  <span>${pct(roiOf(m), 0)} · ${
                          paybackOf(m)?.toFixed(1) ?? '—'
                        } yr</span>
                </button>`
                      )
                      .join('')
                  : '<div class="ledger__row"><span>Nothing else clears the bar</span><span>—</span></div>'
              }
            </div>
          </section>

          <section>
            <div class="sec__title">Not justified on return today</div>
            <div class="ledger">
              ${
                belowBar.length
                  ? belowBar
                      .map(
                        (m) => `
                <div class="ledger__row is-neg">
                  <span>${esc(m.short)} · ${usd(netCapex(m))} net</span>
                  <span>${pct(roiOf(m), 0)}</span>
                </div>`
                      )
                      .join('')
                  : '<div class="ledger__row"><span>Nothing eligible falls short</span><span>—</span></div>'
              }
            </div>
          </section>
        </div>

        <section>
          <div class="sec__title">Every measure we checked</div>
          <div class="whytable">
            ${checks
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
          <p class="nobar">A measure is recommended only when the household is eligible
             and the return clears ${pct(ROI_FLOOR, 0)}.</p>
        </section>

        <section>
          <div class="sec__title">Grid operator note</div>
          <div style="display:flex;gap:9px;align-items:flex-start">
            <span class="tag ${insightTagClass(ins.level)}">${esc(
    ins.level[0].toUpperCase() + ins.level.slice(1)
  )}</span>
            <div>
              <div style="font-size:var(--fs-md);font-weight:var(--fw-bold)">${esc(
                ins.headline
              )}</div>
              <div class="nobar">${esc(ins.detail)}</div>
            </div>
          </div>
        </section>

        <section>
          <div class="sec__title">Why they would say yes</div>
          <div class="benefits">
            <div class="benefit">
              <div class="benefit__label">Return</div>
              <div class="benefit__value">${pct(b.roi.bundleRoi, 0)}</div>
              <div class="benefit__foot">${usd(b.roi.bundleCash)}/yr on ${usd(
    b.roi.bundleCapex
  )} · ${b.roi.bundlePayback?.toFixed(1) ?? '—'} yr</div>
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
              <div class="benefit__value">${b.resilience.backupHours || '0'} h</div>
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
              <div class="benefit__foot">of ${num(home.hoodCount)} in ${esc(
    home.neighborhood
  )} · #${num(home.rank)} territory-wide</div>
            </div>
          </div>
        </section>

        <section>
          <div class="sec__title">Personalised outreach</div>
          <div class="filters__row" id="m-angles">
            ${ANGLES.map(
              (a) =>
                `<button class="chip ${
                  a.id === state.angle ? 'is-on' : ''
                }" data-angle="${a.id}" title="${esc(a.hint)}">${esc(a.label)}</button>`
            ).join('')}
          </div>
          <textarea class="message" id="m-message" rows="10" spellcheck="false"></textarea>
          <div style="display:flex;gap:9px;margin-top:10px;align-items:center">
            <button class="btn" id="m-copy">Copy message</button>
            <span class="card__note" id="m-copied"></span>
          </div>
        </section>
      </div>
    </article>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const shop = modal.querySelector('#m-products');

  const price = (it, cat) =>
    it.perWatt
      ? `$${it.from.toFixed(2)}–$${it.to.toFixed(2)}/W`
      : `${usd(it.from)}–${usd(it.to)}`;

  function showProducts(key) {
    const cat = productsFor(key);
    if (!cat) return;
    const extra = cat.accessories;
    shop.innerHTML = `
      <div class="sec__title">${esc(cat.title)}</div>
      <p class="nobar">${esc(sizingNote(key, home))}</p>
      <div class="prodlist">
        ${cat.items
          .map(
            (it) => `
          <div class="prod">
            <div class="prod__main">
              <div class="prod__name">${esc(it.brand)} · ${esc(it.model)}</div>
              <div class="prod__spec">${esc(it.spec)}</div>
              ${it.note ? `<div class="prod__note">${esc(it.note)}</div>` : ''}
            </div>
            <div class="prod__price">${price(it, cat)}<small>${esc(
              cat.unit
            )}</small></div>
          </div>`
          )
          .join('')}
      </div>
      ${
        extra
          ? `<div class="sec__title" style="margin-top:16px">${esc(extra.title)}</div>
             <div class="prodlist">
               ${extra.items
                 .map(
                   (it) => `
                 <div class="prod">
                   <div class="prod__main">
                     <div class="prod__name">${esc(it.brand)} · ${esc(it.model)}</div>
                     <div class="prod__spec">${esc(it.spec)}</div>
                   </div>
                   <div class="prod__price">${usd(it.from)}–${usd(
                     it.to
                   )}<small>hardware</small></div>
                 </div>`
                 )
                 .join('')}
             </div>`
          : ''
      }
      <p class="nobar">Manufacturers and product lines are real; prices are indicative
         installed ranges for the Bay Area, not quotes. Confirm sizing and price with an
         installer before committing.
         <button class="chip" id="m-shop-close">Hide products</button></p>
    `;
    shop.querySelector('#m-shop-close').onclick = () => {
      shop.innerHTML = '';
    };
    shop.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  modal.querySelectorAll('[data-products]').forEach((b) => {
    b.onclick = () => showProducts(b.dataset.products);
  });

  const msg = modal.querySelector('#m-message');
  msg.value = composeMessage(home, state.angle);
  modal.querySelectorAll('#m-angles .chip').forEach((chip) => {
    chip.onclick = () => {
      state.angle = chip.dataset.angle;
      modal
        .querySelectorAll('#m-angles .chip')
        .forEach((c) => c.classList.toggle('is-on', c === chip));
      msg.value = composeMessage(home, state.angle);
    };
  });
  modal.querySelector('#m-copy').onclick = async () => {
    const flag = modal.querySelector('#m-copied');
    try {
      await navigator.clipboard.writeText(msg.value);
      flag.textContent = 'Copied to clipboard';
    } catch {
      msg.select();
      flag.textContent = 'Selected — press ⌘C';
    }
    setTimeout(() => (flag.textContent = ''), 2600);
  };

  modal.querySelector('.dossier__close').onclick = closeCustomer;
  modal.onclick = (e) => {
    if (e.target === modal) closeCustomer();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') closeCustomer();
  };
  document.addEventListener('keydown', onKey);
  cardCleanup = () => {
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
