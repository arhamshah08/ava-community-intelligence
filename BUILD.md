# Ava Community Intelligence — build brief for Claude

## One-liner for Claude

> Read and fully implement `/Users/arhamshomefolder/ava-community-intelligence/BUILD.md`, then run `npm run dev` and give me the localhost link.

---

## Context (already done — do not redo)

- Folder exists: `/Users/arhamshomefolder/ava-community-intelligence`
- Vite vanilla template + `leaflet` + `chart.js` are installed
- `src/data/` and `src/layers/` folders exist (empty)
- Community Value was **removed** from `/Users/arhamshomefolder/kwh-forecasting` — **never edit that repo again**

## Mission

Standalone spatial-intelligence demo for Ava Community Energy (Oakland CCA) showing how data centers can fund community electrification. Hackathon project: **ReliAdapt / Planetary Intelligence** branding. **No kWh branding**, no Grid Intelligence chrome, no INR, no Indian DISCOM UI.

## Product IA (left nav tabs)

1. **Map** (default) — Oakland satellite grid, homes everywhere, DC sites
2. **Data Centers** — specs + load factors
3. **Layer 1 · Permits** — building permit extraction pipeline
4. **Layer 2 · Solar** — imagery detection with red shaded rooftops
5. **Layer 3 · Green Button** — AMI load disaggregation
6. **About** — short pitch (community needs + capacity co-benefits)

## Map tab (first screen)

- Leaflet + ArcGIS World Imagery, centered on Oakland (~37.8044, -122.2712)
- Dense synthetic home markers across West Oakland, Fruitvale, East Oakland, North Oakland (Ava territory; exclude City of Alameda)
- ~240+ homes on a street lattice
- Orange star = can electrify today; blue dot = needs panel upgrade first
- Purple polygon + MW label for 1–2 candidate data center sites in/near Ava territory
- Click home → floating scorecard; **double-click → dossier modal**
- Green callout: retrofit $, tons CO₂/yr, avg $/mo bill savings (computed)

## Home dossier (double-click)

- Address, occupant, readiness status
- Assets / intelligence present (panel amps, heat pump, solar, EV, water heater)
- Provenance chips: P1 = permits, P2 = solar imagery, P3 = Green Button
- If permit exists: cream “Building permit” card (date/address/description) + animated 3-stage pipeline:
  1. Permit filtering (HVAC ✓ Electrical ✓; others ✕)
  2. Technology identification (heat pump; main panel; branch circuits)
  3. Attribute extraction (brand, capacity BTU, amps_new, circuits)

## Data Centers tab

- Per site: MW capacity, IT load, PUE, interconnect MW, coincident peak, feeder headroom, load factor
- Hourly load-factor chart (Chart.js)
- Inputs: capacity, peak, events/yr, duration, headroom → dollar math:
  - `gapMW = max(0, peak − headroom)`
  - `homesNeeded = gapMW×1000 / avgFlexKwPerHome` (~3.2)
  - `capacityValue = gapMW×1000×$120/kW-yr`
  - `energyValue = gapMW×1000×duration×events×$0.22/kWh`
  - `deferredUpgrade = gapMW×$1.1M/MW`
  - `communityInvestment = homesNeeded×$7400`
  - Show annual value, payback, $/kW-yr flex vs wire

## Layer 1 tab

- Scrollable permit feed; click row → run pipeline on that permit
- Coverage stats (how many homes have permit-derived attrs)

## Layer 2 tab

- Satellite map of Oakland block
- “Run detection” sweeps and draws **red shaded polygons** on rooftops with solar + confidence labels
- Tally vs Ava ~14% solar adoption

## Layer 3 tab

- 15-min Green Button interval load curve
- “Disaggregate” → stacked EV / heat pump / water heater / fridge / base
- Annotate signatures (overnight 6.6 kW = EV; thermostatic cycling = HP)

## Files to create

```
index.html
src/main.js
src/styles.css
src/data/homes.js
src/data/datacenters.js
src/data/permits.js
src/map.js
src/dossier.js
src/datacenters.js
src/layers/permits.js
src/layers/solar.js
src/layers/greenbutton.js
README.md
```

## Design

- Fresh design system (not kWh greens cloned wholesale). Clean utility aesthetic: DM Sans or similar, clear ink hierarchy, white cards, sat map as hero.
- USD only (`$`)
- Demo data labeled as synthetic where needed

## Git + GitHub

```bash
cd /Users/arhamshomefolder/ava-community-intelligence
git init
git add .
git commit -m "Initial ReliAdapt Ava Community Intelligence demo"
gh repo create ava-community-intelligence --public --source=. --remote=origin --push
```

## Run

```bash
npm run dev -- --host --port 5173
```

Give the localhost URL when done. Verify: Map loads, dblclick opens dossier, all other tabs work, Layer 2 draws red polygons, Layer 3 disaggregates.

**Do NOT touch** `/Users/arhamshomefolder/kwh-forecasting`.
