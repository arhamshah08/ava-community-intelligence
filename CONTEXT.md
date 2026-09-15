# Ava Community Intelligence — CONTEXT

**Canonical folder:** `~/ava-community-intelligence`
**Status:** active · live at https://ava-community-intelligence.vercel.app · dev on `localhost:5174`
**Last meaningful work:** 2026-09-15 — rebuilt the accelerator presentation as a 15-slide, image-first 1920×1080 PNG sequence in `deck-png/`; all layouts are native, with reference-slide crops used only for photos, the map, and news imagery.

## What it is

Standalone hackathon demo for Ava Community Energy (Oakland CCA) under
**ReliAdapt / Planetary Intelligence** branding. Shows how data centre flexibility can
fund community electrification. Vite vanilla JS + Leaflet + Chart.js. No build framework,
no backend, all data generated from fixed seeds.

**No kWh branding anywhere. USD only. Never edit `~/kwh-forecasting` from this project.**

## Current state

Seven tabs, Community (dashboard) is the landing screen:
Community · Map (designer ⇄ community toggle) · Customers · Permits · Solar imagery ·
Smart meter data · About. The old Site detail / Data Centers tab was deleted.

Verified working: designer Calculate → peak/capacity/frequency/value; community map hover
card (capacity, utilisation, asset icons); double-click dossier with asset register and
install dates; permit pipeline animation; solar detection sweep (8 detections, 17.4% block
adoption); interval disaggregation; customer recommendations with per-household ROI;
message generator across five benefit angles; leaderboard.

Presentation deliverable: `deck-png/slide-01.png` through `slide-15.png`, plus the
packaged `ava-community-intelligence-deck-png.zip`. The earlier HTML-deck draft was
removed after the output direction changed to standalone slide images.

## Decisions worth remembering

-1. **The programme toggle is the demo.** Every measure splits into `baseCash` (own-bill
   saving) and `flexKw` (controllable load, which only earns while a data centre buys it).
   `setDcProgram()` clears the memo cache and reprices everything, dashboard and Customers
   alike. Existing devices earn too — that is where most of the uplift comes from.
   Without: $1,215/household, 171 homes with a paying upgrade, 4 batteries financeable.
   With: $2,033, 250, 37.

-0.5. **Recommendations are eligibility-gated with a 6% ROI floor.** No EV charger as a
   recommendation. EV needs enough solar first; battery needs an existing EV; the heat pump
   swap needs an ageing unit; solar needs a suitable roof (`roofSuitable`, 62%). Measures
   that fail the floor are shown in a "not justified on return" list, not hidden — the
   gas-to-heat-pump swap usually lands there and that is the honest answer.

-0.25. **No occupant names anywhere in the UI.** The field still exists in the data but is
   never rendered; outreach opens "Hello,".

0. **The Community dashboard is a roll-up, never a parallel calculation.** `communityRollup()`
   sums `benefitsFor(home)` across the same homes the Customers tab reads, so the aggregate
   and the drill-down can never disagree. `benefitsFor` is memoised because the roll-up
   walks all 255 homes. Drill-down routes via `#/customers/<homeId>`.

1. **The 255 homes are a surveyed sample, not the territory.** A 34 MW campus needs ~2,300
   ready households; 255 homes can never cover that. The designer scales the sample's
   readiness and flexibility rates to ~169,000 Oakland households and shows both the
   sampled evidence and the scaled estimate. `SAMPLE_SCALE` in `src/data/homes.js`.
2. **Measure economics are per-household**, not global constants — otherwise every customer
   row showed an identical ROI and the ranking carried no information. `measuresFor(home)`
   re-costs the catalogue against floor area, annual mileage, roof size, occupancy and TOU
   capture.
3. **Double-click uses a class toggle, not `setIcon()`.** `setIcon` replaces the marker DOM
   node, so the second click of a double-click landed on a new element and `dblclick` never
   fired. Leaflet's `doubleClickZoom` is also disabled — double-click is the dossier gesture.
4. **Space heating shows a real bill increase** (−$11/mo) on California rates. The demo
   reports it rather than hiding it; net savings come from the gas meter charge, water
   heating, EV fuelling and the flexibility credit.
5. **Typography is locked** to three sizes (30/16/14), two weights (600/400), one family
   (DM Sans), one ink (`#111111`). No uppercase, no letter-spacing, no faded text. Leaflet's
   own control styles are overridden to match. Audited clean across all seven tabs.
6. Port **5174**, because 5173 is the Stanford Class Planner.
7. **Density pass done 2026-09-15**: Site detail 8 spec tiles → 4; Customers dropped the
   redundant "Assets on file" card and shows the top 3 alternatives rather than all;
   designer merged two note strips into one and moved the sampling caveat to fineprint;
   About and the layer tabs lost their trailing explainer paragraphs. Keep it this lean.

## Repo

**https://github.com/arhamshah08/ava-community-intelligence** (public). Branch `main`.

## Deploy

Public on Vercel (no gate): **https://ava-community-intelligence.vercel.app**
Redeploy with `vercel --prod --yes` from the project root. Account `arhamshah08`.

## Next step

Review or revise the 15-slide PNG deck in `deck-png/`. Repo is public, site is live and
unguarded (Arham confirmed no password needed).

Open question Arham has not answered: the heat pump only reaches the recommended list
because of two added assumptions — a $6,500 stacked CA incentive (TECH + BayREN + 25C)
and a $3,000 capex credit where an ageing AC would have been replaced anyway. Without
them it sits at ~2% ROI and never surfaces. Confirm those are defensible before pitching.
