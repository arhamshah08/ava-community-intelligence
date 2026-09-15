// Candidate data centre sites inside or adjacent to Ava Community Energy
// territory. Sites, load shapes and feeder headroom are synthetic, sized to be
// plausible for Oakland industrial land rather than drawn from a real queue.

// Hourly load factor for a mixed AI training / inference campus. Training is
// close to flat; the inference and cooling components ride the ambient curve,
// so the shape has a shallow afternoon crest rather than an office peak.
export const TRAINING_HEAVY = [
  0.88, 0.88, 0.87, 0.87, 0.87, 0.88, 0.89, 0.9, 0.91, 0.92, 0.93, 0.94,
  0.95, 0.96, 0.97, 0.98, 0.99, 1.0, 0.99, 0.96, 0.94, 0.92, 0.9, 0.89,
];

// Colocation / logistics compute: more diurnal, driven by business-hours
// inference demand and a bigger cooling swing on a hot afternoon.
export const INFERENCE_HEAVY = [
  0.62, 0.6, 0.59, 0.58, 0.58, 0.6, 0.66, 0.74, 0.82, 0.88, 0.92, 0.95,
  0.97, 0.99, 1.0, 1.0, 0.99, 0.97, 0.93, 0.87, 0.8, 0.74, 0.69, 0.65,
];

export const DATA_CENTERS = [
  {
    id: 'dc-army-base',
    name: 'Oakland Gateway Compute Campus',
    shortName: 'Oakland Gateway',
    siteNote: 'Former Oakland Army Base logistics parcel, West Oakland',
    status: 'Interconnection study',
    capacityMW: 48, // total site electrical capacity
    itLoadMW: 34.8, // critical IT load
    pue: 1.28,
    interconnectMW: 42, // contracted interconnection
    coincidentPeakMW: 39.6, // site demand at the feeder's own peak hour
    feederHeadroomMW: 27.5, // what the existing feeder can actually carry
    feeder: 'Grand Ave 12 kV / Bank 3',
    profile: TRAINING_HEAVY,
    color: '#7c3aed',
    // Purple polygon drawn on the map.
    polygon: [
      [37.8188, -122.3172],
      [37.8206, -122.3118],
      [37.8168, -122.3072],
      [37.8148, -122.3128],
    ],
    labelAt: [37.8178, -122.3122],
    defaults: { eventsPerYear: 42, eventHours: 3 },
  },
  {
    id: 'dc-coliseum',
    name: 'Coliseum Logistics Compute Park',
    shortName: 'Coliseum Park',
    siteNote: 'Industrial parcel off Hegenberger, East Oakland',
    status: 'Pre-application',
    capacityMW: 26,
    itLoadMW: 18.6,
    pue: 1.32,
    interconnectMW: 22,
    coincidentPeakMW: 21.4,
    feederHeadroomMW: 16.2,
    feeder: 'Hegenberger 12 kV / Bank 1',
    profile: INFERENCE_HEAVY,
    color: '#7c3aed',
    polygon: [
      [37.7512, -122.2018],
      [37.7529, -122.1966],
      [37.7497, -122.1932],
      [37.748, -122.1984],
    ],
    labelAt: [37.7504, -122.1974],
    defaults: { eventsPerYear: 30, eventHours: 4 },
  },
];

// A mixed campus: a training base load with an inference crest on top.
export const MIXED = TRAINING_HEAVY.map(
  (v, i) => Math.round((v * 0.62 + INFERENCE_HEAVY[i] * 0.38) * 100) / 100
);

/**
 * Workload archetypes for the designer. `designUtilisation` is the share of
 * installed site capacity the campus actually reaches at its own peak — no
 * operator runs at nameplate.
 */
export const WORKLOADS = [
  {
    id: 'training',
    label: 'AI training',
    pue: 1.28,
    designUtilisation: 0.83,
    profile: TRAINING_HEAVY,
    note: 'Near-flat around the clock at high utilisation. Constrains a feeder on almost every day of the year.',
  },
  {
    id: 'mixed',
    label: 'Mixed campus',
    pue: 1.3,
    designUtilisation: 0.79,
    profile: MIXED,
    note: 'Training base load with an inference crest. Binds on warm afternoons and through the evening.',
  },
  {
    id: 'inference',
    label: 'Inference / colo',
    pue: 1.32,
    designUtilisation: 0.76,
    profile: INFERENCE_HEAVY,
    note: 'Business-hours crest with a large cooling swing. Only binds on hot afternoons, which suits flexibility best.',
  },
];

// A household on a standard demand-response tariff will accept a bounded
// number of called events a year before opt-out rates become a problem.
export const HOUSEHOLD_EVENT_CAP = 60;

/**
 * Sizes a campus from the designer inputs, then works out how often the
 * feeder constraint actually binds and how much of that flexibility can cover.
 */
export function designCampus({ itLoadMW, workloadId, headroomMW }) {
  const workload = WORKLOADS.find((w) => w.id === workloadId) || WORKLOADS[0];
  const siteCapacityMW = itLoadMW * workload.pue;
  const peakMW = siteCapacityMW * workload.designUtilisation;

  // Hourly demand, and the hours of a binding day spent above headroom.
  const hourly = workload.profile.map((f) => f * peakMW);
  const hoursAbove = hourly.filter((mw) => mw > headroomMW).length;
  const gapMW = Math.max(0, peakMW - headroomMW);

  // Days a year the constraint binds. A flat training profile sits above the
  // limit nearly every day; a peaky inference profile only on hot afternoons.
  // 300 rather than 365 leaves room for planned maintenance windows.
  const shareAbove = hoursAbove / 24;
  const bindingDays = Math.min(300, Math.round(365 * Math.min(1, shareAbove * 1.35)));

  // Flexibility can only be called within the tariff's event budget.
  const eventsPossible = Math.min(HOUSEHOLD_EVENT_CAP, bindingDays);
  const coverage = bindingDays > 0 ? eventsPossible / bindingDays : 1;

  return {
    workload,
    itLoadMW,
    siteCapacityMW,
    peakMW,
    headroomMW,
    gapMW,
    gapKW: gapMW * 1000,
    hourly,
    hoursAbove,
    eventHours: Math.max(1, hoursAbove),
    bindingDays,
    eventsPossible,
    coverage,
    loadFactor: siteCapacityMW > 0 ? peakMW / siteCapacityMW : 0,
  };
}

// Valuation constants, fixed by the build brief.
export const ECON = {
  avgFlexKwPerHome: 3.2, // coincident, diversified
  capacityPerKwYr: 120, // $/kW-yr resource adequacy + local capacity
  energyPerKwh: 0.22, // $/kWh avoided during a called event
  deferredUpgradePerMW: 1_100_000, // $/MW of distribution upgrade deferred
  communityInvestmentPerHome: 7400, // $ per household electrified
  fixedChargeRate: 0.12, // annualises the wire capital cost for comparison
};

/**
 * The whole argument of the demo in one function: a data centre that peaks
 * above its feeder's headroom has a gap, and the gap can be closed either by
 * rebuilding the wire or by buying flexibility from electrified households.
 */
export function evaluate(dc, inputs) {
  const capacityMW = inputs.capacityMW ?? dc.capacityMW;
  const peakMW = inputs.peakMW ?? dc.coincidentPeakMW;
  const headroomMW = inputs.headroomMW ?? dc.feederHeadroomMW;
  const eventsPerYear = inputs.eventsPerYear ?? dc.defaults.eventsPerYear;
  const eventHours = inputs.eventHours ?? dc.defaults.eventHours;

  const gapMW = Math.max(0, peakMW - headroomMW);
  const gapKW = gapMW * 1000;

  const homesNeeded = Math.ceil(gapKW / ECON.avgFlexKwPerHome);
  const capacityValue = gapKW * ECON.capacityPerKwYr;
  const energyValue = gapKW * eventHours * eventsPerYear * ECON.energyPerKwh;
  const deferredUpgrade = gapMW * ECON.deferredUpgradePerMW;
  const communityInvestment = homesNeeded * ECON.communityInvestmentPerHome;

  const annualValue = capacityValue + energyValue;
  const paybackYears = annualValue > 0 ? communityInvestment / annualValue : null;

  // Like-for-like: annual cost of flexibility vs the annualised cost of the
  // wire it displaces, both per kW of gap closed.
  const flexPerKwYr = gapKW > 0 ? annualValue / gapKW : 0;
  const wireCapexPerKw = gapKW > 0 ? deferredUpgrade / gapKW : 0;
  const wirePerKwYr = wireCapexPerKw * ECON.fixedChargeRate;

  const loadFactor = capacityMW > 0 ? peakMW / capacityMW : 0;
  const avgProfile =
    dc.profile.reduce((s, v) => s + v, 0) / dc.profile.length;

  return {
    capacityMW,
    peakMW,
    headroomMW,
    eventsPerYear,
    eventHours,
    gapMW,
    gapKW,
    homesNeeded,
    capacityValue,
    energyValue,
    annualValue,
    deferredUpgrade,
    communityInvestment,
    paybackYears,
    flexPerKwYr,
    wireCapexPerKw,
    wirePerKwYr,
    loadFactor,
    avgLoadFactor: avgProfile,
    eventEnergyMWh: gapMW * eventHours * eventsPerYear,
  };
}
