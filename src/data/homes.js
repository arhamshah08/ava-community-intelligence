// Synthetic housing stock for the Ava Community Energy service territory.
//
// Everything here is generated from a fixed seed, so the demo draws the same
// map every time. No real address, occupant or meter is represented.
//
// Homes sit on a rotated street lattice per neighbourhood, because Oakland's
// residential grid runs roughly 30-38 degrees off north and an axis-aligned
// lattice reads as obviously fake on satellite imagery.

const SEED = 0x5ea17e;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M_PER_DEG_LAT = 111320;

// The Oakland Estuary runs NW->SE. Everything on the far side is the City of
// Alameda, which runs its own municipal utility and is not Ava territory.
const ESTUARY = { lat: 37.7965, lng: -122.299, dLat: -0.0485, dLng: 0.089 };

function inAvaTerritory(lat, lng) {
  const side =
    ESTUARY.dLng * (lat - ESTUARY.lat) - ESTUARY.dLat * (lng - ESTUARY.lng);
  return side > 0.0004 && lng > -122.3015;
}

export const NEIGHBORHOODS = [
  {
    id: 'west-oakland',
    name: 'West Oakland',
    center: { lat: 37.81, lng: -122.2895 },
    extent: { u: 1000, v: 760 },
    angle: 32,
    target: 68,
    addressBase: 1400,
    streets: [
      'Peralta St', 'Chestnut St', 'Willow St', 'Campbell St', 'Filbert St',
      'Myrtle St', 'Union St', 'Poplar St', 'Adeline St', 'Pine St',
    ],
    // Pre-1940 stock, small services, low rooftop solar uptake.
    panelMix: [[60, 0.19], [100, 0.47], [125, 0.20], [200, 0.14]],
    solarRate: 0.1,
    evRate: 0.11,
    heatPumpRate: 0.09,
    amiRate: 0.72,
    permitRate: 0.17,
    sizeFactor: 0.85,
  },
  {
    id: 'north-oakland',
    name: 'North Oakland',
    center: { lat: 37.8355, lng: -122.27 },
    extent: { u: 1100, v: 780 },
    angle: 4,
    target: 56,
    addressBase: 5600,
    streets: [
      'Dover St', 'Genoa St', 'Colby St', 'Aileen St', 'Vernon St',
      '61st St', 'Shafter Ave', 'Ocean View Dr',
    ],
    // Higher incomes, more retrofit activity already on the ground.
    panelMix: [[60, 0.08], [100, 0.34], [125, 0.26], [200, 0.32]],
    solarRate: 0.27,
    evRate: 0.31,
    heatPumpRate: 0.22,
    amiRate: 0.79,
    permitRate: 0.3,
    sizeFactor: 1.15,
  },
  {
    id: 'fruitvale',
    name: 'Fruitvale',
    center: { lat: 37.7815, lng: -122.2245 },
    extent: { u: 1080, v: 680 },
    angle: 38,
    target: 66,
    addressBase: 2600,
    streets: [
      'Coolidge Ave', 'Maxwell Ave', 'Bond St', 'Nicol Ave', 'Rosedale Ave',
      'E 21st St', 'Fruitvale Ave', 'Excelsior Ave', 'Miller Ave',
    ],
    panelMix: [[60, 0.16], [100, 0.46], [125, 0.22], [200, 0.16]],
    solarRate: 0.13,
    evRate: 0.14,
    heatPumpRate: 0.11,
    amiRate: 0.7,
    permitRate: 0.19,
    sizeFactor: 0.95,
  },
  {
    id: 'east-oakland',
    name: 'East Oakland',
    center: { lat: 37.7615, lng: -122.18 },
    extent: { u: 1320, v: 840 },
    angle: 38,
    target: 65,
    addressBase: 7200,
    streets: [
      'Bancroft Ave', 'Plymouth St', 'Church St', 'Hillside St', 'Ney Ave',
      'Sunnymere Ave', 'Holly St', 'Camden St', 'Havenscourt Blvd',
    ],
    panelMix: [[60, 0.21], [100, 0.48], [125, 0.19], [200, 0.12]],
    solarRate: 0.09,
    evRate: 0.09,
    heatPumpRate: 0.07,
    amiRate: 0.66,
    permitRate: 0.14,
    sizeFactor: 0.9,
  },
];

const FIRST = [
  'Aaliyah', 'Marcus', 'Sofia', 'Darnell', 'Imani', 'Rosa', 'Terrence', 'Mei',
  'Jamal', 'Lucia', 'Andre', 'Keisha', 'Miguel', 'Yolanda', 'Devon', 'Priya',
  'Rashida', 'Hector', 'Tanya', 'Kenji', 'Alicia', 'Malik', 'Guadalupe',
  'Trevor', 'Nadia', 'Elias', 'Camille', 'Reginald', 'Xiomara', 'Bilal',
  'Danielle', 'Oscar',
];
const LAST = [
  'Whitfield', 'Alvarez', 'Nguyen', 'Brooks', 'Okafor', 'Ramirez', 'Coleman',
  'Tran', 'Washington', 'Delgado', 'Bradley', 'Chen', 'Jefferson', 'Herrera',
  'Simmons', 'Pham', 'Carrillo', 'Dorsey', 'Marshall', 'Vargas', 'Osei', 'Le',
  'Stevenson', 'Mendoza', 'Boone', 'Wong', 'Gaines', 'Ibarra', 'Fletcher',
  'Diallo', 'Salazar', 'Pierce',
];

// ── panel arithmetic ────────────────────────────────────────────────────────
// Simplified NEC 220.83 style existing-dwelling check: a 200 A panel is not
// required if the remaining 80% continuous headroom covers the new loads.

export const AMPS = {
  base: 38, // range, dryer, lighting, receptacles
  heatPump: 24,
  waterHeater: 15,
  evse: 32, // unmanaged Level 2
};

// A load-management system (NEC 750.30) lets an EV circuit share existing
// capacity, so it contributes nothing to the calculated load.
export const MEASURE_COST = {
  heatPump: 14200,
  hpwh: 4800,
  evse: 1900,
  ems: 1400,
  panel: 4600,
};

export const RATES = {
  therm: 2.15, // $/therm delivered gas
  kwh: 0.32, // $/kWh Ava residential blended
  gasFixedMonthly: 16.5, // meter charge avoided on full disconnection
  capacityPerKwYr: 120, // $/kW-yr flexibility capacity payment
  // Capacity plus called energy (3 h x 42 events x $0.22), which is what a
  // household actually receives per kW enrolled in the programme.
  flexPerKwYr: 148,
  kgCo2PerTherm: 5.3,
  kgCo2PerKwh: 0.09, // Ava Bright Choice supply mix
  spaceHeatTherms: 265,
  waterHeatTherms: 158,
  heatPumpKwh: 2350,
  hpwhKwh: 1150,
};

// Nameplate flexible load, and the diversity factor that turns a portfolio of
// nameplate kW into load you can actually count on at a single event hour.
export const FLEX_KW = { heatPump: 2.2, waterHeater: 1.2, managedEv: 4.4 };
export const COINCIDENCE = 0.54;

function weightedPick(mix, r) {
  let acc = 0;
  for (const [value, w] of mix) {
    acc += w;
    if (r <= acc) return value;
  }
  return mix[mix.length - 1][0];
}

function rotate(u, v, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: u * Math.cos(a) - v * Math.sin(a),
    y: u * Math.sin(a) + v * Math.cos(a),
  };
}

function toLatLng(center, x, y) {
  return {
    lat: center.lat + y / M_PER_DEG_LAT,
    lng:
      center.lng +
      x / (M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180)),
  };
}

const STREET_SPACING_M = 150; // block depth
const PARCEL_SPACING_M = 70; // frontage per parcel
const SETBACK_M = 18; // house sits back off the street centreline

function latticeSites(hood, rand) {
  const sites = [];
  let streetIdx = 0;
  for (let v = -hood.extent.v; v <= hood.extent.v; v += STREET_SPACING_M) {
    let parcelIdx = 0;
    for (let u = -hood.extent.u; u <= hood.extent.u; u += PARCEL_SPACING_M) {
      for (const side of [-1, 1]) {
        const jitterU = (rand() - 0.5) * 9;
        const jitterV = (rand() - 0.5) * 5;
        const p = rotate(u + jitterU, v + side * SETBACK_M + jitterV, hood.angle);
        const ll = toLatLng(hood.center, p.x, p.y);
        if (!inAvaTerritory(ll.lat, ll.lng)) continue;
        sites.push({ ...ll, streetIdx, parcelIdx, side });
      }
      parcelIdx++;
    }
    streetIdx++;
  }
  return sites;
}

function buildHome(site, hood, rand, seq) {
  const street = hood.streets[site.streetIdx % hood.streets.length];
  const number =
    hood.addressBase +
    site.streetIdx * 100 +
    site.parcelIdx * 2 +
    (site.side > 0 ? 1 : 0);
  const occupant = `${FIRST[Math.floor(rand() * FIRST.length)]} ${
    LAST[Math.floor(rand() * LAST.length)]
  }`;

  const panelAmps = weightedPick(hood.panelMix, rand());
  const hasSolar = rand() < hood.solarRate;
  const hasEV = rand() < hood.evRate;
  const hasHeatPump = rand() < hood.heatPumpRate;
  const waterHeater =
    rand() < hood.heatPumpRate * 0.6
      ? 'heat-pump'
      : rand() < 0.12
      ? 'electric-resistance'
      : 'gas';
  const hasAmi = rand() < hood.amiRate;
  const usesEms = rand() < 0.58; // willing + able to run a load-management system
  const gasRange = rand() < 0.62;
  const yearBuilt = 1905 + Math.floor(rand() * 78);
  const sqft = Math.round(
    (980 + rand() * 900) * hood.sizeFactor
  );

  // Existing calculated load vs. what full electrification still has to add.
  const existingAmps =
    AMPS.base +
    (hasHeatPump ? AMPS.heatPump : 0) +
    (waterHeater === 'heat-pump' ? AMPS.waterHeater : 0) +
    (hasEV ? (usesEms ? 0 : AMPS.evse) : 0);
  const plannedAmps =
    (hasHeatPump ? 0 : AMPS.heatPump) +
    (waterHeater === 'heat-pump' ? 0 : AMPS.waterHeater) +
    (hasEV ? 0 : usesEms ? 0 : AMPS.evse);
  const headroomAmps = Math.round(panelAmps * 0.8 - existingAmps);
  const ready = headroomAmps >= plannedAmps;

  // Retrofit scope and cost.
  const measures = [];
  if (!hasHeatPump)
    measures.push({ key: 'heatPump', label: 'Ducted heat pump', cost: MEASURE_COST.heatPump });
  if (waterHeater !== 'heat-pump')
    measures.push({ key: 'hpwh', label: 'Heat pump water heater', cost: MEASURE_COST.hpwh });
  if (!hasEV)
    measures.push({ key: 'evse', label: 'Level 2 EV circuit', cost: MEASURE_COST.evse });
  if (!ready)
    measures.push({
      key: 'panel',
      label: `Service upgrade ${panelAmps}A → 200A`,
      cost: MEASURE_COST.panel,
    });
  else if (usesEms)
    measures.push({ key: 'ems', label: 'Circuit-sharing load management', cost: MEASURE_COST.ems });
  const retrofitCost = measures.reduce((s, m) => s + m.cost, 0);

  // Carbon: therms displaced net of the electricity the new equipment draws.
  // Space conditioning scales with this house's own floor area, not the
  // neighbourhood average, so two identically-equipped homes still differ.
  const sizeRatio = sqft / 1300;
  const thermsDisplaced =
    (hasHeatPump ? 0 : RATES.spaceHeatTherms * sizeRatio) +
    (waterHeater === 'gas' ? RATES.waterHeatTherms : 0);
  const addedKwh =
    (hasHeatPump ? 0 : RATES.heatPumpKwh * sizeRatio) +
    (waterHeater === 'heat-pump' ? 0 : RATES.hpwhKwh);
  const co2TonsPerYear =
    Math.round(
      ((thermsDisplaced * RATES.kgCo2PerTherm - addedKwh * RATES.kgCo2PerKwh) /
        1000) *
        100
    ) / 100;

  // Flexible load after the retrofit.
  const flexKwNameplate =
    FLEX_KW.heatPump +
    FLEX_KW.waterHeater +
    (usesEms ? FLEX_KW.managedEv : 0);
  const flexKw = Math.round(flexKwNameplate * COINCIDENCE * 10) / 10;

  // Bill impact, itemised. Space heat is genuinely a small loss on California
  // rates; the demo shows that rather than hiding it.
  const fullyOffGas = waterHeater !== 'electric-resistance' && !gasRange;
  const parts = [
    { label: 'Gas meter charge avoided', value: fullyOffGas ? RATES.gasFixedMonthly : 0 },
    { label: 'Water heating (HPWH vs gas)', value: waterHeater === 'gas' ? 7 : 0 },
    { label: 'Space heating (heat pump vs gas)', value: hasHeatPump ? 0 : -11 },
    { label: 'EV fuelling vs gasoline', value: hasEV ? 88 : 0 },
    {
      label: 'Flexibility enrolment credit',
      value: Math.round((flexKw * RATES.capacityPerKwYr) / 12),
    },
  ].filter((p) => p.value !== 0);
  const billSavingsMonthly = Math.round(parts.reduce((s, p) => s + p.value, 0));

  // ── customer-facing intelligence ────────────────────────────────────────
  // Drawn from a per-home stream so adding fields here never shifts the
  // values above, which the map and the layer tabs already depend on.
  const rand2 = mulberry32((SEED ^ (seq * 2654435761)) >>> 0);

  const hasBattery = rand2() < (hasSolar ? 0.22 : 0.03);

  // Cooling: inland Oakland runs hot, the flats much less so. An old
  // fixed-speed unit is what makes a 5-star inverter swap worth quoting.
  const coolingKwh = Math.round(
    (380 + rand2() * 900) * (hood.id === 'east-oakland' ? 1.35 : 1)
  );
  const acVintage = rand2() < 0.46 ? 1996 + Math.floor(rand2() * 22) : null;
  const hasOldAC = acVintage !== null && acVintage <= 2012;

  // Shading, orientation, roof condition and tenure. Without this almost every
  // home returns the same recommendation, which is not what a survey finds.
  const roofSuitable = rand2() < 0.62;

  // Equipment vintages, for the asset register in the dossier.
  const yr = (from, span) => from + Math.floor(rand2() * span);
  const installs = {
    panel: panelAmps >= 200 ? yr(2004, 21) : yr(1958, 34),
    heatPump: hasHeatPump ? yr(2016, 9) : null,
    waterHeater: waterHeater === 'heat-pump' ? yr(2018, 7) : yr(2009, 14),
    solar: hasSolar ? yr(2011, 14) : null,
    ev: hasEV ? yr(2018, 7) : null,
    battery: hasBattery ? yr(2020, 5) : null,
  };

  // Service capacity and how much of it is spoken for, now and after a full
  // retrofit. Both use the same amps model as the readiness check.
  // Drivers of this household's own measure economics: how far they drive, how
  // much unshaded roof they have, how many people draw hot water, and how much
  // of the time-of-use spread they can actually capture.
  const factors = {
    miles: Math.round((0.7 + rand2() * 0.68) * 100) / 100,
    roofKw: Math.round((3.4 + (sqft / 1300) * 2.6 + rand2() * 1.4) * 10) / 10,
    occupancy: Math.round((0.8 + rand2() * 0.55) * 100) / 100,
    tou: Math.round((0.85 + rand2() * 0.4) * 100) / 100,
  };

  // Annual consumption from the end uses actually present, net of anything
  // the roof generates. This is what sizes the value bar per household.
  const solarKwh = hasSolar ? Math.round(factors.roofKw * 1450) : 0;
  const annualKwh = Math.round(
    3600 +
      (hasHeatPump ? 2350 * (sqft / 1300) : 0) +
      (waterHeater === 'heat-pump' ? 1150 : waterHeater === 'electric-resistance' ? 2900 : 0) +
      (hasEV ? 3800 * factors.miles : 0) +
      (acVintage ? coolingKwh : 0)
  );
  const netKwh = Math.max(600, annualKwh - solarKwh);

  const serviceKw = Math.round((panelAmps * 240) / 100) / 10;
  const usableAmps = panelAmps * 0.8;
  const utilNow = existingAmps / usableAmps;
  const utilProjected = (existingAmps + plannedAmps) / usableAmps;

  return {
    id: `H-${String(seq).padStart(4, '0')}`,
    lat: site.lat,
    lng: site.lng,
    hasBattery,
    coolingKwh,
    acVintage,
    annualKwh,
    solarKwh,
    netKwh,
    hasOldAC,
    roofSuitable,
    installs,
    factors,
    serviceKw,
    usableAmps: Math.round(usableAmps),
    utilNow: Math.round(utilNow * 100) / 100,
    utilProjected: Math.round(utilProjected * 100) / 100,
    address: `${number} ${street}`,
    occupant,
    neighborhood: hood.name,
    neighborhoodId: hood.id,
    yearBuilt,
    sqft,
    panelAmps,
    hasSolar,
    hasEV,
    hasHeatPump,
    waterHeater,
    gasRange,
    hasAmi,
    usesEms,
    existingAmps,
    plannedAmps,
    headroomAmps,
    ready,
    status: ready ? 'ready' : 'upgrade',
    measures,
    retrofitCost,
    co2TonsPerYear,
    flexKwNameplate: Math.round(flexKwNameplate * 10) / 10,
    flexKw,
    billSavingsMonthly,
    billSavingsParts: parts,
    hasPermit: false, // set below, once permit coverage is drawn
  };
}

function generate() {
  const rand = mulberry32(SEED);
  const homes = [];
  let seq = 1;

  for (const hood of NEIGHBORHOODS) {
    const sites = latticeSites(hood, rand);
    // Walk the lattice with a fixed stride so coverage stays even instead of
    // clumping the way a random sample would.
    const stride = Math.max(1, Math.floor(sites.length / hood.target));
    let added = 0;
    for (let i = 0; i < sites.length && added < hood.target; i += stride) {
      homes.push(buildHome(sites[i], hood, rand, seq));
      seq++;
      added++;
    }
  }

  // Permit coverage: a permit is far likelier where work has already happened.
  for (const home of homes) {
    const hood = NEIGHBORHOODS.find((n) => n.id === home.neighborhoodId);
    const lift = home.hasHeatPump || home.panelAmps >= 200 ? 2.6 : 1;
    home.hasPermit = rand() < hood.permitRate * lift;
  }

  // Leaderboard: rank every household on electrification progress, and record
  // its standing inside its own neighbourhood as well as territory-wide.
  for (const home of homes) home.score = sustainabilityScore(home);

  const byScore = [...homes].sort((a, b) => b.score - a.score);
  byScore.forEach((home, i) => {
    home.rank = i + 1;
    home.percentile = Math.round(((homes.length - i) / homes.length) * 100);
  });

  for (const hood of NEIGHBORHOODS) {
    const local = byScore.filter((h) => h.neighborhoodId === hood.id);
    local.forEach((home, i) => {
      home.hoodRank = i + 1;
      home.hoodCount = local.length;
    });
  }

  return homes;
}

// ── measure catalogue ───────────────────────────────────────────────────────
// Net capex is after the incentive a California household can actually stack
// (TECH Clean CA, IRA 25C/25D, SGIP). Annual cash is bill impact plus the
// flexibility enrolment credit — space heating is a real loss on CA rates and
// is carried at its true negative value.

// ── measure catalogue ───────────────────────────────────────────────────────
//
// A measure is only recommended when the household is actually eligible for it
// and the return justifies it. Net capex is after the incentives a California
// household can stack (TECH Clean CA, IRA 25C/25D/30D, SGIP).
//
// Two of these numbers matter to the whole app:
//   baseCash — what the household saves on its own bills, programme or not
//   flexKw   — controllable load, which only earns once a data centre is buying
// So `cash` is baseCash with the flexibility revenue added only when the
// programme is switched on. That split is what the dashboard's before/after
// toggle reads.

/** A household on a standard DR tariff will not accept unlimited called events. */
export const ROI_FLOOR = 0.06; // below this, a measure is not "recommended"

// ── programmes ──────────────────────────────────────────────────────────────
//
// A single controllable kW can be sold into more than one programme, and a
// single retrofit can draw on more than one incentive. Which programmes are
// running changes what every household is worth, so the whole app reads this
// one registry.

export const PROGRAM_RATES = {
  flexPerKwYr: 148, // local capacity + called energy from the data centre
  drPerKwYr: 45, // statewide CAISO events
  // The same kW cannot be sold twice at full value: if it is already committed
  // to the data centre, only part of it is free for wholesale dispatch.
  drHaircut: 0.6,
  eeIncentiveUplift: 0.25, // utility efficiency rebate, on top of the base
  sgipBattery: 3000, // storage resilience incentive
  lcfsPerEvYr: 130, // clean fuel credits, per EV
};

export const PROGRAMS = [
  {
    id: 'flex',
    name: 'Data centre flexibility',
    pays: 'revenue',
    unit: `$${PROGRAM_RATES.flexPerKwYr}/kW-yr`,
    blurb:
      'A data centre pays for controllable load on its own feeder, so it can energise without rebuilding the wire.',
    defaultOn: true,
  },
  {
    id: 'dr',
    name: 'Wholesale demand response',
    pays: 'revenue',
    unit: `$${PROGRAM_RATES.drPerKwYr}/kW-yr`,
    blurb:
      'Statewide CAISO events. Stacks on the same kW, but at a discount once that kW is already committed locally.',
    defaultOn: false,
  },
  {
    id: 'lcfs',
    name: 'Clean fuel credits',
    pays: 'revenue',
    unit: `$${PROGRAM_RATES.lcfsPerEvYr}/yr per EV`,
    blurb:
      'LCFS credits for charging an electric vehicle on California electricity. Needs an EV on the property.',
    defaultOn: false,
  },
  {
    id: 'ee',
    name: 'Energy efficiency rebates',
    pays: 'capex',
    unit: `+${Math.round(PROGRAM_RATES.eeIncentiveUplift * 100)}% incentive`,
    blurb:
      'Utility efficiency rebates on qualifying equipment. Does not pay a household anything a year — it lowers what they have to put in.',
    defaultOn: false,
  },
  {
    id: 'sgip',
    name: 'Resilience incentive',
    pays: 'capex',
    unit: `+$${PROGRAM_RATES.sgipBattery.toLocaleString()} on storage`,
    blurb:
      'SGIP storage incentive. Only touches batteries, but it is large enough to decide whether one pencils at all.',
    defaultOn: false,
  },
];

const programState = new Map(PROGRAMS.map((p) => [p.id, p.defaultOn]));

export function programOn(id) {
  return !!programState.get(id);
}
export function setProgram(id, on) {
  programState.set(id, !!on);
  _benefitCache.clear();
}
export function activePrograms() {
  return PROGRAMS.filter((p) => programOn(p.id));
}

/** Blended $/kW-yr across whichever revenue programmes are running. */
export function flexRatePerKwYr() {
  const flex = programOn('flex') ? PROGRAM_RATES.flexPerKwYr : 0;
  const dr = programOn('dr')
    ? PROGRAM_RATES.drPerKwYr * (programOn('flex') ? PROGRAM_RATES.drHaircut : 1)
    : 0;
  return flex + dr;
}

/** Incentive multiplier and any measure-specific adder from capex programmes. */
function incentiveFor(spec) {
  const uplift = programOn('ee') ? 1 + PROGRAM_RATES.eeIncentiveUplift : 1;
  const sgip =
    spec.key === 'battery' && programOn('sgip') ? PROGRAM_RATES.sgipBattery : 0;
  return Math.round(spec.incentive * uplift) + sgip;
}

// The dashboard's headline toggle is the data centre programme.
export function setDcProgram(on) {
  setProgram('flex', on);
}
export function dcProgramEnabled() {
  return programOn('flex');
}

export const MEASURES = {
  panel: {
    key: 'panel',
    label: 'Service upgrade to 200 A',
    short: 'Panel upgrade',
    phrase: 'service upgrade',
    capex: 4600,
    incentive: 2100,
    flexKw: 0,
    enabler: true,
    why: 'Nothing else can be installed until the service has room for it.',
  },
  ac5star: {
    key: 'ac5star',
    label: '5-star inverter air conditioner',
    short: '5-star AC',
    phrase: '5-star inverter air conditioner',
    capex: 5600,
    incentive: 600,
    flexKw: 1.8,
    why: 'The existing unit is a fixed-speed relic. An inverter unit uses about half the electricity and, unlike the old one, can be turned down on request instead of off.',
  },
  heatPump: {
    key: 'heatPump',
    label: 'Ducted heat pump',
    short: 'Heat pump',
    phrase: 'ducted heat pump',
    capex: 14200,
    incentive: 6500, // TECH Clean CA + BayREN + federal 25C, stacked
    flexKw: 2.2,
    why: 'The largest carbon measure on the property. Cash return is thin on California rates; the case is carbon, comfort and cooling.',
  },
  heatPumpReplace: {
    key: 'heatPumpReplace',
    label: 'Replace ageing heat pump',
    short: 'Heat pump swap',
    phrase: 'heat pump replacement',
    capex: 12800,
    incentive: 4000,
    flexKw: 2.2,
    why: 'The installed unit is old enough to be running at roughly half a current unit\u2019s efficiency, and it has no usable controls.',
  },
  hpwh: {
    key: 'hpwh',
    label: 'Heat pump water heater',
    short: 'Water heater',
    phrase: 'heat pump water heater',
    capex: 4800,
    incentive: 1700,
    flexKw: 1.2,
    why: 'The cheapest way off gas, and the tank itself is thermal storage the grid can lean on.',
  },
  solar: {
    key: 'solar',
    label: 'Rooftop solar',
    short: 'Rooftop solar',
    phrase: 'rooftop solar array',
    capex: 18000,
    incentive: 5400,
    flexKw: 0,
    why: 'Cuts the volumetric bill directly, and it is the precondition for an EV that fuels itself.',
  },
  ev: {
    key: 'ev',
    label: 'Electric vehicle',
    short: 'EV',
    phrase: 'electric vehicle',
    capex: 12000,
    incentive: 7500,
    flexKw: 4.4,
    why: 'Only worth recommending once the roof generates enough to fuel it. Costed as the premium over a comparable petrol car, not the whole vehicle.',
  },
  battery: {
    key: 'battery',
    label: 'Home battery, 13.5 kWh',
    short: 'Battery',
    phrase: 'home battery',
    capex: 13500,
    incentive: 5000,
    flexKw: 5,
    resilienceHours: 18,
    why: 'Pairs with an EV: the two together shift far more load than either alone, and the battery is the only measure that keeps the lights on in an outage.',
  },
};

export function netCapex(m) {
  return m.capex - m.incentive;
}
export function roiOf(m) {
  const net = netCapex(m);
  return net > 0 ? m.cash / net : 0;
}
export function paybackOf(m) {
  return m.cash > 0 ? netCapex(m) / m.cash : null;
}

/** Flexibility revenue only exists while a data centre is buying it. */
function priced(base, m, over = {}) {
  const spec = { ...base, ...over };
  const flexKw = spec.flexKw ?? 0;
  const flexCash = Math.round(flexKw * flexRatePerKwYr());
  const baseCash = Math.round(spec.baseCash ?? 0);
  // Clean fuel credits ride on the vehicle, not on controllable load.
  const creditCash =
    spec.key === 'ev' && programOn('lcfs') ? PROGRAM_RATES.lcfsPerEvYr : 0;
  return {
    ...spec,
    incentive: incentiveFor(spec),
    baseCash,
    flexCash,
    creditCash,
    cash: baseCash + flexCash + creditCash,
    resilienceHours: spec.resilienceHours ?? 0,
    co2: spec.co2 ?? 0,
  };
}

/**
 * The catalogue priced for one household. A 900 sq ft bungalow and a 2,000
 * sq ft Victorian do not get the same heat pump quote, and a household that
 * drives 15,000 miles a year does not get the same EV case as one that drives
 * 7,000 — so every measure is re-costed against the home's own drivers.
 */
export function measuresFor(home) {
  const f = home.factors;
  const size = home.sqft / 1300;
  const solarCapex = Math.round(f.roofKw * 3333);

  return {
    panel: priced(MEASURES.panel, MEASURES.panel, { baseCash: 0 }),

    // Half the cooling electricity of a fixed-speed unit.
    ac5star: priced(MEASURES.ac5star, MEASURES.ac5star, {
      baseCash: home.coolingKwh * 0.45 * RATES.kwh,
      co2: Math.round(home.coolingKwh * 0.45 * RATES.kgCo2PerKwh) / 1000,
    }),

    heatPump: priced(MEASURES.heatPump, MEASURES.heatPump, {
      // A dying AC would have been replaced anyway; one machine does both, so
      // that avoided spend comes off the heat pump's capex.
      capex: Math.round(14200 * (0.8 + 0.35 * size)) - (home.hasOldAC ? 3000 : 0),
      baseCash:
        -132 * size +
        (home.hasOldAC ? home.coolingKwh * 0.45 * RATES.kwh : 0) +
        120, // gas line maintenance no longer carried
      co2: Math.round((1.5 * size + (home.hasOldAC ? 0.2 : 0)) * 10) / 10,
    }),

    // An old unit runs near half a current unit's efficiency.
    heatPumpReplace: priced(MEASURES.heatPumpReplace, MEASURES.heatPumpReplace, {
      baseCash: 900 * size * RATES.kwh,
      co2: Math.round(0.4 * size * 10) / 10,
    }),

    hpwh: priced(MEASURES.hpwh, MEASURES.hpwh, {
      baseCash: 84 * f.occupancy,
      co2: 0.8,
    }),

    solar: priced(MEASURES.solar, MEASURES.solar, {
      label: `Rooftop solar, ${f.roofKw} kW`,
      capex: solarCapex,
      incentive: Math.round(solarCapex * 0.3),
      baseCash: f.roofKw * 268 * f.tou,
      co2: Math.round(f.roofKw * 0.35 * 10) / 10,
    }),

    // Solar-fuelled miles are cheaper than grid-charged ones.
    ev: priced(MEASURES.ev, MEASURES.ev, {
      baseCash: 1320 * f.miles,
      co2: Math.round(2.1 * f.miles * 10) / 10,
    }),

    battery: priced(MEASURES.battery, MEASURES.battery, {
      baseCash: (home.hasSolar ? 620 : 400) * f.tou,
      co2: 0.3,
    }),
  };
}

/**
 * Eligibility, before any question of return.
 *
 * An EV is only sensible once the roof can fuel it; a battery is only sensible
 * once there is an EV to pair it with; a heat pump swap only applies to a unit
 * old enough to be worth replacing. An EV *charger* is never a recommendation
 * on its own — it is part of the vehicle.
 */
export function applicableMeasures(home) {
  const m = measuresFor(home);
  const out = [];

  if (!home.ready) out.push(m.panel);

  if (home.hasHeatPump) {
    if (home.installs.heatPump && home.installs.heatPump <= 2018)
      out.push(m.heatPumpReplace);
  } else {
    out.push(m.heatPump);
    if (home.hasOldAC) out.push(m.ac5star);
  }

  if (home.waterHeater !== 'heat-pump') out.push(m.hpwh);
  if (!home.hasSolar && home.roofSuitable) out.push(m.solar);

  // Enough roof to actually fuel a car.
  if (!home.hasEV && home.hasSolar && home.factors.roofKw >= 5) out.push(m.ev);

  // A battery earns its keep alongside an EV.
  if (!home.hasBattery && home.hasEV) out.push(m.battery);

  return out;
}

/**
 * Splits eligible measures into those whose return justifies them and those
 * that do not clear the bar today. The second list is shown, not hidden — a
 * heat pump that loses money on California rates is worth saying out loud.
 */
export function rankMeasures(home) {
  const applicable = applicableMeasures(home);
  const earning = applicable.filter((m) => !m.enabler);
  const ranked = earning
    .filter((m) => roiOf(m) >= ROI_FLOOR)
    .sort((a, b) => roiOf(b) - roiOf(a));
  const belowBar = earning
    .filter((m) => roiOf(m) < ROI_FLOOR)
    .sort((a, b) => roiOf(b) - roiOf(a));
  const prerequisite = applicable.find((m) => m.enabler) || null;
  return { ranked, belowBar, prerequisite, top: ranked[0] || null };
}


// ── grid operator insights ──────────────────────────────────────────────────

export function operatorInsight(home) {
  if (home.utilProjected > 1) {
    return {
      level: 'blocked',
      headline: 'Service exceeded after electrification',
      detail: `Projected load is ${Math.round(
        home.utilProjected * 100
      )}% of the usable ${home.usableAmps} A. The ${home.panelAmps} A service has to be upgraded before this household can be enrolled.`,
    };
  }
  if (home.panelAmps <= 60 && home.yearBuilt < 1950) {
    return {
      level: 'inspect',
      headline: 'Pre-1950 stock on 60 A service',
      detail:
        'Likely knob-and-tube or cloth-insulated branch wiring. Inspect before quoting an upgrade — rewiring can double the job cost.',
    };
  }
  if (home.hasSolar && !home.hasBattery) {
    return {
      level: 'opportunity',
      headline: 'Solar with no storage',
      detail:
        'Exports at midday and contributes nothing at the evening peak. Adding storage converts an existing asset into dispatchable evening capacity.',
    };
  }
  if (home.hasEV && !home.usesEms) {
    return {
      level: 'opportunity',
      headline: 'Unmanaged EV charging',
      detail: `${(6.6).toFixed(
        1
      )} kW of uncontrolled load on a constrained feeder. A managed charger converts it to ${
        FLEX_KW.managedEv
      } kW of dispatchable flexibility at almost no capital cost.`,
    };
  }
  if (home.ready) {
    return {
      level: 'ready',
      headline: 'Enrol now',
      detail: `${home.headroomAmps} A spare on a ${home.panelAmps} A service and ${home.flexKw} kW of coincident flexibility once retrofitted. No wire work required.`,
    };
  }
  return {
    level: 'watch',
    headline: 'No constraint identified',
    detail: 'Service has headroom and no equipment flags. Standard outreach.',
  };
}

// ── the five benefit categories ─────────────────────────────────────────────

export const CARBON_PRICE = 51; // $/tonne, EPA social cost of carbon

/**
 * Controllable load the household already owns. Under the programme these
 * earn alongside anything newly installed — the equipment is already on the
 * wall, it just has nobody paying it to move.
 */
export function existingFlex(home) {
  let kw = 0;
  if (home.hasHeatPump) kw += FLEX_KW.heatPump;
  if (home.waterHeater === 'heat-pump') kw += FLEX_KW.waterHeater;
  if (home.hasEV) kw += FLEX_KW.managedEv;
  if (home.hasBattery) kw += 5;
  const credits =
    home.hasEV && programOn('lcfs') ? PROGRAM_RATES.lcfsPerEvYr : 0;
  return {
    kw: Math.round(kw * 10) / 10,
    cash: Math.round(kw * flexRatePerKwYr()) + credits,
    credits,
  };
}

/**
 * The value stack as a ladder: what this household already earns, what it can
 * unlock next, and what stands in the way. Order is the order a household
 * actually climbs it — you cannot sell flexibility you do not have, and you
 * cannot store for an EV you have not bought.
 */
export function ladderFor(home) {
  const { ranked } = rankMeasures(home);
  const stack = stackFor(home);
  const amount = (id) => stack.annual.find((r) => r.id === id)?.amount || 0;
  const willHaveEv = home.hasEV || ranked.some((m) => m.key === 'ev');
  const willHaveBattery = home.hasBattery || ranked.some((m) => m.key === 'battery');

  // A rung is judged on the household first: whether the property can supply
  // what the programme buys. Only once it can does the programme switch matter.
  const rung = (id, label, amount, ok, need, capexOnly) => ({
    id,
    label,
    amount,
    capexOnly: !!capexOnly,
    available: ok && programOn(id),
    blockedBy: !ok ? 'household' : programOn(id) ? null : 'programme',
    blocked: !ok ? need : programOn(id) ? null : 'Programme is switched off',
  });

  const steps = [
    {
      id: 'bills',
      label: 'Bill savings',
      amount: amount('bills'),
      available: ranked.length > 0,
      blockedBy: ranked.length ? null : 'household',
      blocked: ranked.length
        ? null
        : 'No upgrade on this property clears the return floor yet',
    },
    rung(
      'flex',
      'Data centre flexibility',
      amount('flex'),
      stack.flexKw > 0,
      'Nothing controllable on the property yet — the heat pump or water heater is what creates it'
    ),
    rung(
      'dr',
      'Wholesale demand response',
      amount('dr'),
      stack.flexKw > 0,
      'Needs controllable load first'
    ),
    rung(
      'lcfs',
      'Clean fuel credits',
      amount('lcfs'),
      willHaveEv,
      home.hasSolar
        ? 'Needs an electric vehicle'
        : 'Needs solar first, then an electric vehicle to fuel from it'
    ),
    rung(
      'sgip',
      'Resilience incentive',
      0,
      willHaveBattery,
      home.hasEV
        ? 'Needs storage, which now pencils because there is an EV'
        : 'Needs an EV before storage pays',
      true
    ),
  ];

  for (const st of steps) {
    st.state = st.amount > 0 || (st.capexOnly && st.available)
      ? 'earned'
      : st.available
      ? 'ready'
      : 'locked';
  }
  // "Next" should be something this household can act on. A programme that is
  // simply switched off is an operator decision, not a customer one, so it is
  // only offered as the next rung when nothing household-side is outstanding.
  const pending = steps.filter((st) => st.state !== 'earned');
  const next =
    pending.find((st) => st.blockedBy !== 'programme') || pending[0] || null;
  if (next) next.isNext = true;

  return { steps, next, total: stack.total, flexKw: stack.flexKw };
}

/**
 * Why a household got the recommendation it got — every measure in the
 * catalogue, whether it was eligible, and the reason either way. This is the
 * audit trail behind the Recommend column.
 */
export function explainFor(home) {
  const cat = measuresFor(home);
  const { ranked, belowBar } = rankMeasures(home);
  const rankedKeys = new Set(ranked.map((m) => m.key));
  const belowKeys = new Set(belowBar.map((m) => m.key));
  const hpYear = home.installs.heatPump;

  const checks = [
    {
      key: 'ac5star',
      eligible: !home.hasHeatPump && home.hasOldAC,
      yes: home.acVintage
        ? `Fixed-speed unit from ${home.acVintage} on file, and no heat pump to replace it`
        : 'Old fixed-speed cooling on file',
      no: home.hasHeatPump
        ? 'Already has a heat pump, which does the cooling'
        : home.acVintage
        ? `Cooling unit from ${home.acVintage} is recent enough to keep`
        : 'No cooling equipment on file',
    },
    {
      key: 'heatPump',
      eligible: !home.hasHeatPump,
      yes: 'Heats with gas today, so the whole heating load can move to electricity',
      no: `Heat pump already installed${hpYear ? ` in ${hpYear}` : ''}`,
    },
    {
      key: 'heatPumpReplace',
      eligible: home.hasHeatPump && hpYear && hpYear <= 2018,
      yes: `Installed in ${hpYear}, running at roughly half a current unit's efficiency`,
      no: home.hasHeatPump
        ? `Installed in ${hpYear}, too new to be worth replacing`
        : 'No heat pump to replace',
    },
    {
      key: 'hpwh',
      eligible: home.waterHeater !== 'heat-pump',
      yes: 'Water heating is still the cheapest end use to get off gas',
      no: 'Heat pump water heater already installed',
    },
    {
      key: 'solar',
      eligible: !home.hasSolar && home.roofSuitable,
      yes: `Roof is unshaded and correctly oriented — about ${home.factors.roofKw} kW fits`,
      no: home.hasSolar
        ? `Array already detected from imagery${
            home.installs.solar ? ` (${home.installs.solar})` : ''
          }`
        : 'Roof is shaded, poorly oriented or not the household\u2019s to alter',
    },
    {
      key: 'ev',
      eligible: !home.hasEV && home.hasSolar && home.factors.roofKw >= 5,
      yes: `Roof already generates ${home.factors.roofKw} kW, enough to fuel the car it would charge`,
      no: home.hasEV
        ? 'Already has an electric vehicle'
        : !home.hasSolar
        ? 'No rooftop solar yet — the array comes first, so the miles are self-fuelled'
        : `Array is only ${home.factors.roofKw} kW, short of the 5 kW that makes it self-fuelling`,
    },
    {
      key: 'battery',
      eligible: !home.hasBattery && home.hasEV,
      yes: 'An EV is already on the property, and the two together shift far more load than either alone',
      no: home.hasBattery
        ? 'Storage already installed'
        : 'No EV on the property — storage pairs with one before it pays',
    },
  ];

  return checks.map((c) => {
    const m = cat[c.key];
    const roi = roiOf(m);
    let verdict = 'not eligible';
    if (c.eligible) {
      if (rankedKeys.has(c.key)) verdict = 'recommended';
      else if (belowKeys.has(c.key)) verdict = 'below the return floor';
      else verdict = 'eligible';
    }
    return {
      key: c.key,
      label: m.label,
      short: m.short,
      eligible: c.eligible,
      reason: c.eligible ? c.yes : c.no,
      verdict,
      roi,
      net: netCapex(m),
      cash: m.cash,
      baseCash: m.baseCash,
      flexCash: m.flexCash,
      payback: paybackOf(m),
    };
  });
}

/**
 * Decomposes a household's annual value by programme, so the stack adds up to
 * exactly the same total the Customers tab reports.
 */
export function stackFor(home) {
  const { ranked } = rankMeasures(home);
  const ex = existingFlex(home);
  const newFlexKw = ranked.reduce((s, m) => s + (m.flexKw || 0), 0);
  const flexKw = Math.round((newFlexKw + ex.kw) * 10) / 10;
  const bills = ranked.reduce((s, m) => s + m.baseCash, 0);
  const evCredits =
    ranked.reduce((s, m) => s + (m.creditCash || 0), 0) + ex.credits;

  const drRate = programOn('dr')
    ? PROGRAM_RATES.drPerKwYr * (programOn('flex') ? PROGRAM_RATES.drHaircut : 1)
    : 0;

  const annual = [
    { id: 'bills', label: 'Bill savings', amount: Math.round(bills) },
  ];
  if (programOn('flex'))
    annual.push({
      id: 'flex',
      label: 'Data centre flexibility',
      amount: Math.round(flexKw * PROGRAM_RATES.flexPerKwYr),
      note: `${flexKw} kW enrolled`,
    });
  if (programOn('dr'))
    annual.push({
      id: 'dr',
      label: 'Wholesale demand response',
      amount: Math.round(flexKw * drRate),
      note: programOn('flex') ? 'discounted, kW already committed' : `${flexKw} kW`,
    });
  if (programOn('lcfs') && evCredits)
    annual.push({ id: 'lcfs', label: 'Clean fuel credits', amount: evCredits });

  // Capex-side programmes lower what the household has to put in.
  const capex = [];
  const baseIncentive = ranked.reduce(
    (s, m) => s + (MEASURES[m.key]?.incentive ?? 0),
    0
  );
  const actualIncentive = ranked.reduce((s, m) => s + m.incentive, 0);
  if (actualIncentive > baseIncentive)
    capex.push({
      id: 'stacked',
      label: 'Extra incentive from programmes',
      amount: Math.round(actualIncentive - baseIncentive),
    });

  return {
    annual,
    capex,
    flexKw,
    total: annual.reduce((s, r) => s + r.amount, 0),
  };
}

const _benefitCache = new Map();

/** Memoised: the roll-up walks all 255 homes and every call re-prices a catalogue. */
export function benefitsFor(home) {
  const hit = _benefitCache.get(home.id);
  if (hit) return hit;
  const out = computeBenefits(home);
  _benefitCache.set(home.id, out);
  return out;
}

function computeBenefits(home) {
  const { ranked, belowBar, prerequisite, top } = rankMeasures(home);
  const existing = existingFlex(home);
  const bundleCapex =
    ranked.reduce((s, m) => s + netCapex(m), 0) +
    (prerequisite ? netCapex(prerequisite) : 0);
  const bundleCash = ranked.reduce((s, m) => s + m.cash, 0);
  const bundleCo2 = ranked.reduce((s, m) => s + m.co2, 0);
  const resilience = ranked.reduce((s, m) => s + m.resilienceHours, 0);
  const flex = ranked.reduce((s, m) => s + m.flexKw, 0);

  return {
    belowBar,
    existing,
    // What the household receives in a year: the recommended measures plus the
    // devices it already owns earning under the programme.
    totalCash: bundleCash + existing.cash,
    roi: {
      topMeasure: top,
      topRoi: top ? roiOf(top) : 0,
      topPayback: top ? paybackOf(top) : null,
      bundleCapex,
      bundleCash,
      bundleRoi: bundleCapex > 0 ? bundleCash / bundleCapex : 0,
      bundlePayback: bundleCash > 0 ? bundleCapex / bundleCash : null,
    },
    environmental: {
      co2TonsPerYear: Math.round(bundleCo2 * 10) / 10,
      carbonValue: Math.round(bundleCo2 * CARBON_PRICE),
      thermsOffGas: home.hasHeatPump ? 158 : 423,
    },
    resilience: {
      backupHours: resilience,
      critical: resilience > 0,
      note: resilience
        ? `${resilience} h of essential loads through a PSPS or storm outage.`
        : 'No backup today. A battery is the only measure that adds outage cover.',
    },
    community: {
      // Local-hire share of installed cost, plus the flexibility revenue that
      // stays in the neighbourhood rather than going to a wire contractor.
      localLabour: Math.round(bundleCapex * 0.42),
      flexRevenueYr: Math.round(flex * RATES.capacityPerKwYr),
      flexKw: Math.round(flex * 10) / 10,
    },
  };
}

/** 0-100 electrification progress, used for the leaderboard. */
export function sustainabilityScore(home) {
  let s = 0;
  if (home.hasHeatPump) s += 26;
  if (home.waterHeater === 'heat-pump') s += 16;
  else if (home.waterHeater === 'electric-resistance') s += 4;
  if (home.hasSolar) s += 20;
  if (home.hasEV) s += 18;
  if (home.hasBattery) s += 12;
  if (home.ready) s += 8;
  return s;
}

export const HOMES = generate();

export const HOMES_BY_ID = new Map(HOMES.map((h) => [h.id, h]));

// Which layer each attribute came from, for the provenance chips.
export function attributeSources(home) {
  const rows = [
    {
      key: 'panel',
      label: 'Main panel',
      value: `${home.panelAmps} A`,
      source: home.hasPermit ? 'P1' : home.hasAmi ? 'P3' : null,
    },
    {
      key: 'heatPump',
      label: 'Space heating',
      value: home.hasHeatPump ? 'Heat pump' : 'Gas furnace',
      source: home.hasPermit && home.hasHeatPump ? 'P1' : home.hasAmi ? 'P3' : null,
    },
    {
      key: 'waterHeater',
      label: 'Water heating',
      value:
        home.waterHeater === 'heat-pump'
          ? 'Heat pump water heater'
          : home.waterHeater === 'electric-resistance'
          ? 'Electric resistance'
          : 'Gas storage',
      source: home.hasAmi ? 'P3' : home.hasPermit ? 'P1' : null,
    },
    {
      key: 'solar',
      label: 'Rooftop solar',
      value: home.hasSolar ? 'Detected' : 'None detected',
      source: 'P2',
    },
    {
      key: 'ev',
      label: 'EV charging',
      value: home.hasEV ? 'Level 2 present' : 'None',
      source: home.hasAmi ? 'P3' : null,
    },
  ];
  return rows;
}

export function provenanceFor(home) {
  const set = [];
  if (home.hasPermit) set.push('P1');
  set.push('P2'); // imagery covers every rooftop in the territory
  if (home.hasAmi) set.push('P3');
  return set;
}

export const PROVENANCE_LABELS = {
  P1: 'Permits',
  P2: 'Imagery',
  P3: 'Meter data',
};

export function portfolio(homes = HOMES) {
  const ready = homes.filter((h) => h.ready);
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  return {
    count: homes.length,
    readyCount: ready.length,
    upgradeCount: homes.length - ready.length,
    retrofitCost: sum(homes, (h) => h.retrofitCost),
    co2Tons: Math.round(sum(homes, (h) => h.co2TonsPerYear)),
    avgBillSavings: homes.length
      ? Math.round(sum(homes, (h) => h.billSavingsMonthly) / homes.length)
      : 0,
    flexKw: Math.round(sum(homes, (h) => h.flexKw) * 10) / 10,
    avgFlexKw: homes.length
      ? Math.round((sum(homes, (h) => h.flexKw) / homes.length) * 100) / 100
      : 0,
    solarCount: homes.filter((h) => h.hasSolar).length,
    permitCount: homes.filter((h) => h.hasPermit).length,
    amiCount: homes.filter((h) => h.hasAmi).length,
  };
}

export const PORTFOLIO = portfolio(HOMES);

// The mapped homes are a surveyed sample, not the whole territory. Oakland has
// roughly this many occupied housing units inside Ava's service area, so the
// sample's readiness and flexibility rates scale by this factor when sizing a
// catchment against a data centre. Every scaled figure in the UI says so.

/**
 * Community roll-up. Every figure here is the sum of the per-household numbers
 * on the Customers tab, so the dashboard and the drill-down can never disagree.
 */
export function communityRollup(homes = HOMES) {
  const t = {
    homes: homes.length,
    ready: 0,
    blocked: 0,
    earnings: 0,
    capex: 0,
    co2: 0,
    backupHours: 0,
    gainsBackup: 0,
    alreadyCovered: 0,
    flexKw: 0,
    flexRevenue: 0,
    localLabour: 0,
    billSavings: 0,
    withOffer: 0,
  };

  for (const h of homes) {
    const b = benefitsFor(h);
    if (b.roi.topMeasure) t.withOffer += 1;
    if (h.ready) t.ready += 1;
    else t.blocked += 1;
    t.earnings += b.totalCash;
    t.capex += b.roi.bundleCapex;
    t.co2 += b.environmental.co2TonsPerYear;
    t.backupHours += b.resilience.backupHours;
    if (b.resilience.backupHours > 0) t.gainsBackup += 1;
    else t.alreadyCovered += 1;
    t.flexKw += b.community.flexKw;
    t.flexRevenue += b.community.flexRevenueYr;
    t.localLabour += b.community.localLabour;
    t.billSavings += h.billSavingsMonthly * 12;
  }

  const n = homes.length || 1;
  return {
    ...t,
    co2: Math.round(t.co2),
    flexKw: Math.round(t.flexKw),
    avgEarnings: Math.round(t.earnings / n),
    avgCapex: Math.round(t.capex / n),
    avgBackup: Math.round(t.backupHours / n),
    avgCo2: Math.round((t.co2 / n) * 10) / 10,
    payback: t.earnings > 0 ? t.capex / t.earnings : null,
    readyShare: t.ready / n,
    // What the household is actually paid, split by source.
    flexShare: t.earnings > 0 ? t.flexRevenue / t.earnings : 0,
  };
}

/** Per-neighbourhood roll-up, for the comparison rows on the dashboard. */
export function rollupByNeighborhood(homes = HOMES) {
  return NEIGHBORHOODS.map((n) => ({
    id: n.id,
    name: n.name,
    ...communityRollup(homes.filter((h) => h.neighborhoodId === n.id)),
  }));
}

/** Households ranked by what they would earn a year. */
export function topEarners(homes = HOMES, limit = 6) {
  return [...homes]
    .sort((a, b) => benefitsFor(b).totalCash - benefitsFor(a).totalCash)
    .slice(0, limit);
}

export const TERRITORY_HOUSEHOLDS = 169000;
export const SAMPLE_SCALE = TERRITORY_HOUSEHOLDS / HOMES.length;
