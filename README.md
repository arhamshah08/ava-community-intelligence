# Ava Community Intelligence

**ReliAdapt · Planetary Intelligence** — a spatial-intelligence demo for Ava Community
Energy (Oakland CCA), showing how data centre flexibility can fund household
electrification.

Every home, permit, rooftop and interval in this app is generated from a fixed seed.
No real address, occupant, meter or interconnection queue position is represented.

## Run

```bash
npm install
npm run dev -- --port 5174
```

Then open the printed localhost URL. Port 5173 is usually taken by another project on
this machine, hence 5174.

## Information architecture

| Tab | What it does |
|---|---|
| **Map** | Toggle. **Design a data centre**: size a campus, press Calculate, get peak demand, the flexible capacity available nearby, how often it can be called, and what those services are worth. **Community**: the Oakland map — hover a home for capacity, utilisation and asset icons; double-click for the full dossier. |
| **Community** (landing) | Aggregate dashboard: what a household earns, what the community earns, outage cover, carbon. Rolled up from the per-customer numbers, with drill-down into any household. |
| **Customers** | Per-household next-best measure with ROI, the grid-operator note, the five benefit categories, a personalised outreach message, and a sustainability leaderboard. |
| **Permits** | Building-permit feed and the three-stage extraction pipeline (filter → identify → extract). |
| **Solar imagery** | Imagery sweep over a West Oakland block; detected arrays shaded red with confidence. |
| **Smart meter data** | 15-minute interval curve, disaggregated into EV / heat pump / water heater / fridge / base. |
| **About** | The argument, the limits, and the assumptions. |

## The data centre programme toggle

The dashboard's toggle is the core of the demo. Every measure carries two numbers:
`baseCash` (what the household saves on its own bills) and `flexKw` (controllable load).
Flexibility only earns while a data centre is buying it, so switching the programme off
strips that revenue out and reprices the whole community — including devices the
household already owns, which earn under the programme without any new capital.

|  | Without | With |
|---|---|---|
| A household earns | $1,215/yr | $2,033/yr |
| The community earns | $310k/yr | $518k/yr |
| Homes with an upgrade that pays | 171 | 250 |
| Homes gaining outage cover | 4 | 37 |

## Recommendations

A measure is offered only when the household is **eligible** and the **return justifies
it** (6% floor). An EV *charger* is never a recommendation on its own — it is part of the
vehicle. Eligibility:

- **5-star inverter AC** — an old fixed-speed unit is installed
- **Heat pump** — replaces a gas furnace, or an installed unit old enough to be inefficient
- **Rooftop solar** — roof is suitable (shading, orientation, tenure)
- **EV** — only once the roof generates enough to fuel it
- **Battery** — only alongside an existing EV
- **Panel upgrade** — a prerequisite, not an earner

Anything eligible that misses the return floor is shown in a "not justified on return
today" list rather than hidden. A gas-to-heat-pump swap usually lands there on California
rates, which is the honest answer.

## How the numbers work

**Readiness** is panel arithmetic, not a score. A simplified NEC 220.83 existing-dwelling
check: a home is *ready* (orange star) when 80% of its service minus existing calculated
load covers a heat pump, a heat pump water heater and a managed EV circuit. Otherwise it
is a blue dot and needs a service upgrade first. 147 of 255 homes are ready.

**Flexibility** is quoted two ways. Nameplate flexible load per home is ~5.9 kW; the
planning figure is the coincident, diversified 3.2 kW/home used in the valuation.

**The sample is scaled, and the UI says so.** The 255 mapped homes are a surveyed sample.
When the designer sizes a catchment it applies the sample's readiness and flexibility
rates to the ~169,000 Oakland households in Ava's territory, and prints the sampled
evidence alongside the scaled estimate.

**Bill savings are honest.** Space heating is a genuine *loss* on California electric
rates (about −$11/mo); net savings come from the avoided gas meter charge, water heating,
EV fuelling and the flexibility enrolment credit. The dossier itemises all of it.

**Valuation constants** live in `src/data/datacenters.js` (`ECON`): $120/kW-yr capacity,
$0.22/kWh called energy, $1.1M/MW deferred upgrade, $7,400 per household electrified.

## Design system

Three font sizes (30 / 16 / 14 px), two weights (600 / 400), one family (DM Sans), and a
single ink (`#111111`). Hierarchy comes from size, weight, spacing and alignment — never
from greyed-out or letter-spaced text. Tokens are defined at the top of `src/styles.css`.
White text appears only on solid dark fills (primary buttons, selected controls, map
labels) where contrast requires it.

## Files

```
index.html
src/main.js              app shell, nav, hash routing
src/styles.css           design system + typography tokens
src/format.js            USD / number / date formatters
src/icons.js             asset facet glyphs
src/map.js               Map tab shell + community Leaflet map
src/designer.js          data centre designer
src/dashboard.js         Community dashboard (aggregate + drill-down)
src/customers.js         Customers tab
src/dossier.js           home dossier modal
src/about.js             About tab
src/data/homes.js        255 synthetic homes, measures, insights, leaderboard
src/data/datacenters.js  sites, workloads, campus sizing, valuation
src/data/permits.js      synthetic permit feed
src/layers/permits.js    Layer 1 + the shared extraction pipeline
src/layers/solar.js      Layer 2
src/layers/greenbutton.js Layer 3
```

`src/format.js`, `src/icons.js`, `src/designer.js`, `src/customers.js` and `src/about.js`
are additions beyond the original BUILD.md file list.
