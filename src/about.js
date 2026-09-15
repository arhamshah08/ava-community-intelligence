// About — the pitch in one screen.

import { DATA_CENTERS, ECON, evaluate } from './data/datacenters.js';
import { PORTFOLIO } from './data/homes.js';
import { permitStats } from './data/permits.js';
import { usd, usdShort, num, pct } from './format.js';

export function renderAbout(root) {
  const totals = DATA_CENTERS.map((dc) => evaluate(dc, {}));
  const gapMW = totals.reduce((s, r) => s + r.gapMW, 0);
  const homesNeeded = totals.reduce((s, r) => s + r.homesNeeded, 0);
  const annualValue = totals.reduce((s, r) => s + r.annualValue, 0);
  const investment = totals.reduce((s, r) => s + r.communityInvestment, 0);
  const stats = permitStats();

  root.innerHTML = `
    <div class="page">
      <header class="page__head">
        <div class="page__eyebrow">About</div>
        <h1 class="page__title">Data centre load is the only new source of capital big enough to electrify Oakland's housing stock</h1>
      </header>

      <div class="two-col">
        <div class="prose">
          <p>
            Two things are true in Ava Community Energy's territory at once. Thousands of
            homes cannot electrify because a 60–100 A panel has no room left for a heat
            pump, and data centre developers cannot energise because the feeders they want
            are already at their limit.
          </p>
          <p>
            These are the same problem from two ends. A campus that peaks
            <strong>${num(gapMW, 1)} MW</strong> above its feeder must either rebuild the
            wire or find load that will move. Electrified households are that load — and
            the equipment is exactly what they cannot afford to install.
          </p>

          <h3>The co-benefit</h3>
          <p>
            Paying <strong>${num(homesNeeded)} households</strong> to electrify costs
            <strong>${usdShort(investment)}</strong> and returns
            <strong>${usdShort(annualValue)} a year</strong>. The same spend buys the
            community lower bills, warmer homes and <strong>${num(
              PORTFOLIO.co2Tons
            )} tonnes</strong> of avoided carbon a year. The data centre gets an
            interconnection it could not otherwise get. Nobody rebuilds the feeder.
          </p>

          <h3>Why three layers</h3>
          <p>
            A flexibility offer is only credible if you know what is behind each meter, and
            no single dataset knows. Permits are the highest confidence and sparsest
            (${num(stats.homesCovered)} addresses). Imagery covers every rooftop, so it
            sets the denominator. Smart meter data shows behaviour rather than equipment,
            for the ${pct(
              PORTFOLIO.amiCount / PORTFOLIO.count,
              0
            )} of homes that have authorised it.
          </p>

          <h3>What the map shows</h3>
          <p>
            Readiness is panel arithmetic, not a score. A home is an orange star when its
            existing service has room for a heat pump, a heat pump water heater and a
            managed EV circuit under a simplified NEC 220.83 check. It is a blue dot when
            it does not, and the service upgrade has to come first.
          </p>
        </div>

        <div style="display:grid;gap:16px">
          <section class="card">
            <div class="card__head"><span class="card__title">Both sites, at default settings</span></div>
            <div class="card__body">
              <div class="ledger">
                <div class="ledger__row"><span>Combined gap above headroom</span><span>${num(
                  gapMW,
                  1
                )} MW</span></div>
                <div class="ledger__row"><span>Homes to electrify</span><span>${num(
                  homesNeeded
                )}</span></div>
                <div class="ledger__row"><span>Community investment</span><span>${usd(
                  investment
                )}</span></div>
                <div class="ledger__row is-total"><span>Annual flexibility value</span><span>${usd(
                  annualValue
                )}</span></div>
                <div class="ledger__row"><span>Simple payback</span><span>${(
                  investment / annualValue
                ).toFixed(1)} yr</span></div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card__head"><span class="card__title">Territory at a glance</span></div>
            <div class="card__body">
              <div class="ledger">
                <div class="ledger__row"><span>Homes mapped</span><span>${num(
                  PORTFOLIO.count
                )}</span></div>
                <div class="ledger__row"><span>Can electrify today</span><span>${num(
                  PORTFOLIO.readyCount
                )} · ${pct(PORTFOLIO.readyCount / PORTFOLIO.count, 0)}</span></div>
                <div class="ledger__row"><span>Need a panel upgrade first</span><span>${num(
                  PORTFOLIO.upgradeCount
                )}</span></div>
                <div class="ledger__row"><span>Rooftop solar detected</span><span>${pct(
                  PORTFOLIO.solarCount / PORTFOLIO.count,
                  1
                )}</span></div>
                <div class="ledger__row"><span>Full retrofit cost</span><span>${usdShort(
                  PORTFOLIO.retrofitCost
                )}</span></div>
                <div class="ledger__row"><span>Avg. bill impact</span><span>${usd(
                  PORTFOLIO.avgBillSavings
                )}/mo</span></div>
                <div class="ledger__row is-total"><span>Coincident flexibility</span><span>${num(
                  PORTFOLIO.flexKw
                )} kW</span></div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card__head"><span class="card__title">Honest limits</span></div>
            <div class="card__body" style="font-size:var(--fs-sm);color:var(--ink);line-height:var(--lh-body)">
              <p style="margin-bottom:9px">
                Every home, permit, rooftop and interval in this demo is generated from a fixed
                seed. No real address, occupant, meter or interconnection queue position is
                represented. The two data centre sites are plausible Oakland industrial parcels,
                not announced projects.
              </p>
              <p style="margin-bottom:9px">
                Space heating shows a genuine bill <em>increase</em> on California electric rates.
                The demo reports that rather than hiding it; net savings come from the gas meter
                charge, water heating, EV fuelling and the flexibility credit.
              </p>
              <p>
                The ${ECON.avgFlexKwPerHome} kW per home used in the valuation is a coincident,
                diversified figure — nameplate flexible load per home is roughly twice that.
              </p>
              <div style="margin-top:12px"><span class="synthetic">Synthetic demonstration data</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  return null;
}
