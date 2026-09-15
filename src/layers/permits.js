// Layer 1 · Permits
//
// Building permits are public, cheap and almost entirely noise. The pipeline
// here is the part that matters: filter the feed down to the two classes that
// carry electrification signal, identify what equipment the scope text
// describes, then pull structured attributes out of free text.

import { PERMITS, PERMIT_RULES, permitStats } from '../data/permits.js';
import { HOMES, PORTFOLIO } from '../data/homes.js';
import { usd, num, pct, shortDate, esc } from '../format.js';

const STAGE_MS = 620; // dwell per stage
const ROW_MS = 130; // stagger between rows inside a stage

/**
 * Renders the animated three-stage extraction pipeline for one permit.
 * Returns a cancel function so callers can tear down timers on unmount.
 */
export function runPipeline(container, permit) {
  const timers = [];
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));

  const stage1Rows = PERMIT_RULES.map((rule) => {
    const isThis = rule.type === permit.type;
    return {
      ok: rule.keep,
      text: `${rule.type} — ${rule.note}`,
      drop: !rule.keep,
      mark: isThis ? (rule.keep ? 'this permit' : 'this permit · dropped') : '',
    };
  });

  container.innerHTML = `
    <div class="sec__title">Extraction pipeline</div>
    <div class="pipeline">
      <div class="stage" data-stage="1">
        <div class="stage__head">
          <span class="stage__idx">1</span>
          <span class="stage__name">Permit filtering</span>
          <span class="stage__status">queued</span>
        </div>
        <div class="stage__body"></div>
      </div>
      <div class="stage" data-stage="2">
        <div class="stage__head">
          <span class="stage__idx">2</span>
          <span class="stage__name">Technology identification</span>
          <span class="stage__status">queued</span>
        </div>
        <div class="stage__body"></div>
      </div>
      <div class="stage" data-stage="3">
        <div class="stage__head">
          <span class="stage__idx">3</span>
          <span class="stage__name">Attribute extraction</span>
          <span class="stage__status">queued</span>
        </div>
        <div class="stage__body"></div>
      </div>
    </div>
  `;

  const stages = [1, 2, 3].map((n) =>
    container.querySelector(`.stage[data-stage="${n}"]`)
  );

  function rowHtml(r, i) {
    return `<div class="row ${r.drop ? 'row--drop' : ''}" style="animation-delay:${
      i * ROW_MS
    }ms">
      <span class="row__mark ${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✕'}</span>
      <span class="row__text">${esc(r.text)}</span>
      ${r.mark ? `<span class="row__val">${esc(r.mark)}</span>` : ''}
      ${r.value ? `<span class="row__val">${esc(r.value)}</span>` : ''}
    </div>`;
  }

  function play(idx, rows, doneLabel, emptyNote) {
    const stage = stages[idx];
    stage.classList.add('is-live');
    stage.querySelector('.stage__status').textContent = 'running';
    const body = stage.querySelector('.stage__body');
    body.innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : `<div class="scan-note">${esc(emptyNote)}</div>`;
    const settle = STAGE_MS + rows.length * ROW_MS;
    after(settle, () => {
      stage.classList.remove('is-live');
      stage.classList.add('is-done');
      stage.querySelector('.stage__status').textContent = doneLabel;
    });
    return settle;
  }

  // Stage 1 always runs; stages 2 and 3 only run if the permit survived it.
  const t1 = play(
    0,
    stage1Rows,
    `${permit.type} · ${permit.relevant ? 'kept' : 'dropped'}`,
    ''
  );

  after(t1 + 140, () => {
    if (!permit.relevant) {
      for (const s of stages.slice(1)) {
        s.classList.add('is-done');
        s.style.opacity = '0.45';
        s.querySelector('.stage__status').textContent = 'skipped';
        s.querySelector('.stage__body').innerHTML =
          '<div class="scan-note">Permit did not pass filtering — nothing to extract.</div>';
      }
      return;
    }

    const rows2 = permit.technologies.map((t) => ({
      ok: t.confidence >= 0.8,
      text: t.label,
      value: pct(t.confidence, 0),
    }));
    const t2 = play(1, rows2, `${rows2.filter((r) => r.ok).length} identified`, '');

    after(t2 + 140, () => {
      const rows3 = permit.attributes.map((a) => ({
        ok: true,
        text: a.label,
        value: a.value,
      }));
      play(2, rows3, `${rows3.length} attributes`, '');
    });
  });

  return () => timers.forEach(clearTimeout);
}

export function renderPermitsTab(root) {
  const stats = permitStats();
  const homesWithPermit = HOMES.filter((h) => h.hasPermit).length;

  root.innerHTML = `
    <div class="page">
      <header class="page__head">
        <div class="page__eyebrow">Permits</div>
        <h1 class="page__title">Building permit extraction</h1>
        <p class="page__sub">Select a permit to run the pipeline against it.</p>
      </header>

      <div class="grid grid--4" style="margin-bottom:16px">
        ${[
          ['Permits in feed', num(stats.total), ''],
          ['Passed filtering', num(stats.relevant), `${stats.hvac} HVAC · ${stats.electrical} electrical`],
          ['Dropped', num(stats.dropped), ''],
          ['Addresses covered', num(stats.homesCovered), `of ${num(PORTFOLIO.count)} homes`],
        ]
          .map(
            ([label, value, foot]) => `
          <div class="card"><div class="card__body">
            <div class="stat__label">${label}</div>
            <div class="stat__value">${value}</div>
          </div></div>`
          )
          .join('')}
      </div>

      <div class="two-col">
        <section class="card">
          <div class="card__head">
            <span class="card__title">Permit feed</span>
            <span class="card__note">newest first</span>
          </div>
          <div class="feed" id="permit-feed">
            ${PERMITS.map(
              (p) => `
              <button class="feed__row" data-id="${p.id}">
                <div class="feed__top">
                  <span class="feed__no">${esc(p.number)}</span>
                  <span class="feed__date">${esc(shortDate(p.date))}</span>
                </div>
                <div class="feed__addr">${esc(p.address)}</div>
                <div class="feed__desc">${esc(p.description)}</div>
                <div style="margin-top:5px">
                  <span class="tag ${p.relevant ? 'tag--p1' : 'tag--muted'}">${esc(p.type)}</span>
                </div>
              </button>`
            ).join('')}
          </div>
        </section>

        <div style="display:grid;gap:16px">
          <section class="card">
            <div class="card__head">
              <span class="card__title">Selected permit</span>
              <span class="synthetic">Synthetic records</span>
            </div>
            <div class="card__body" id="permit-detail"></div>
          </section>

          <section class="card">
            <div class="card__head"><span class="card__title">Attribute coverage</span></div>
            <div class="card__body">
              <div class="cov">
                ${[
          ['Permit-derived attributes (P1)', homesWithPermit, ''],
          ['Solar imagery (P2)', PORTFOLIO.count, ''],
          ['Smart meter intervals (P3)', PORTFOLIO.amiCount, ''],
                ]
                  .map(
                    ([label, count, cls]) => `
                  <div class="cov__row">
                    <div class="cov__top">
                      <b>${label}</b>
                      <span class="cov__pct">${num(count)} / ${num(PORTFOLIO.count)} · ${pct(
                      count / PORTFOLIO.count,
                      0
                    )}</span>
                    </div>
                    <div class="bar"><div class="bar__fill bar__fill--${cls}" style="width:${
                      (count / PORTFOLIO.count) * 100
                    }%"></div></div>
                  </div>`
                  )
                  .join('')}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  const detail = root.querySelector('#permit-detail');
  let cancel = null;

  function show(permit) {
    cancel?.();
    root
      .querySelectorAll('.feed__row')
      .forEach((b) => b.classList.toggle('is-sel', b.dataset.id === permit.id));
    detail.innerHTML = `
      <div class="permit-card">
        <div class="permit-card__top">
          <span class="permit-card__no">${esc(permit.number)}</span>
          <span class="permit-card__date">${esc(shortDate(permit.date))} · ${esc(
      permit.type
    )} · ${usd(permit.valuation)}</span>
        </div>
        <div class="permit-card__addr">${esc(permit.address)} · ${esc(permit.neighborhood)}</div>
        <div class="permit-card__desc">${esc(permit.description)}</div>
      </div>
      <div style="height:14px"></div>
      <div id="tab-pipeline"></div>
    `;
    cancel = runPipeline(detail.querySelector('#tab-pipeline'), permit);
  }

  root.querySelectorAll('.feed__row').forEach((btn) => {
    btn.onclick = () => show(PERMITS.find((p) => p.id === btn.dataset.id));
  });

  show(PERMITS.find((p) => p.relevant) || PERMITS[0]);

  return () => cancel?.();
}
