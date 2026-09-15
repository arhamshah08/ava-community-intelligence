// Synthetic building-permit feed in the shape of an Oakland permit export.
//
// Municipal permit text is the messiest of the three layers: free-text scope
// descriptions, inconsistent casing, and a long tail of records that say
// nothing at all about electrification. The pipeline in Layer 1 exists to
// throw most of it away and pull four structured attributes out of the rest.

import { HOMES } from './homes.js';

const SEED = 0xb1a7c3;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Only these two permit classes carry electrification signal.
export const PERMIT_RULES = [
  { type: 'HVAC', keep: true, note: 'heating / cooling equipment changeouts' },
  { type: 'Electrical', keep: true, note: 'service panels and branch circuits' },
  { type: 'Plumbing', keep: false, note: 'no equipment class in scope text' },
  { type: 'Roofing', keep: false, note: 'envelope only' },
  { type: 'Demolition', keep: false, note: 'no equipment installed' },
  { type: 'Grading', keep: false, note: 'site work' },
];

const HP_BRANDS = [
  ['Mitsubishi Electric', 'SUZ-KA', 18.2, 9.4],
  ['Daikin', 'DZ6VS', 17.5, 9.1],
  ['Bosch', 'IDS Ultra', 19.0, 9.8],
  ['Carrier', 'Infinity 24', 18.6, 9.5],
  ['Lennox', 'SL22KLV', 20.1, 10.2],
  ['Trane', 'XV18', 17.8, 9.3],
  ['LG', 'Therma V', 18.9, 9.7],
];
const PANEL_BRANDS = ['Square D QO', 'Eaton BR', 'Siemens PL', 'GE PowerMark'];
const BTUS = [18000, 24000, 30000, 36000, 42000, 48000];

const HVAC_TEXT = [
  'Install {BTU} BTU ducted air source heat pump w/ air handler; remove existing gas furnace',
  'Replace gas furnace + AC with {BTU} BTU heat pump system, new lineset & condensate',
  'Changeout: {BTU} BTU heat pump condenser and indoor coil, existing ductwork to remain',
  'Mech: install heat pump {BTU} BTU, seal & test existing duct system per T24',
];
const ELEC_TEXT = [
  'Upgrade main service panel {FROM}A to {TO}A; relocate meter to exterior',
  'Electrical: new {TO}A main panel, add ({N}) 240V branch circuits for heat pump & EV',
  'Service upgrade {FROM}A-{TO}A and ({N}) new dedicated circuits, HPWH + EVSE',
  'Replace fused service w/ {TO}A breaker panel; ({N}) circuits added',
];
// A house already at 200 A does not get a service upgrade — the scope is
// circuits only, and the extracted amps_new has to say so.
const ELEC_TEXT_NO_UPGRADE = [
  'Add ({N}) 240V dedicated circuits for heat pump and EVSE; existing {FROM}A service to remain',
  'Electrical: ({N}) new branch circuits, HPWH + EVSE, no service change',
  'Branch circuit addition ({N}) at existing {FROM}A panel; load calc attached',
];
const NOISE = [
  ['Plumbing', 'Replace water service line from meter to structure, 40 LF'],
  ['Plumbing', 'Repipe (2) bathrooms, no fixture count change'],
  ['Roofing', 'Reroof: tear off existing comp shingle, install Class A assembly'],
  ['Roofing', 'Repair storm damage to rear roof slope, 280 SF'],
  ['Demolition', 'Demolition of detached accessory structure (garage)'],
  ['Demolition', 'Remove non-bearing interior partitions, no MEP'],
  ['Grading', 'Site grading and drainage correction, rear yard'],
  ['Plumbing', 'Sewer lateral compliance replacement per EBMUD'],
  ['Roofing', 'Install new gutters and downspouts'],
  ['Grading', 'Retaining wall repair, 22 LF, no structure'],
];

function isoDate(rand) {
  // Permits drawn from the trailing two years of the feed.
  const start = Date.UTC(2023, 8, 1);
  const end = Date.UTC(2025, 7, 20);
  const t = start + rand() * (end - start);
  return new Date(t).toISOString().slice(0, 10);
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function buildPermits() {
  const rand = mulberry32(SEED);
  const permits = [];
  let seq = 318;

  const permitHomes = HOMES.filter((h) => h.hasPermit);
  const otherHomes = HOMES.filter((h) => !h.hasPermit);

  // Relevant records, split between mechanical and electrical scope.
  const relevantHomes = permitHomes.slice(0, 26);
  relevantHomes.forEach((home, i) => {
    const isHvac = i % 2 === 0;
    const number = `RB24-${String(seq++).padStart(5, '0')}`;
    const date = isoDate(rand);

    if (isHvac) {
      const [brand, model, seer2, hspf2] = pick(HP_BRANDS, rand);
      // Size roughly with the house, the way a load calc would.
      const btu =
        BTUS[Math.min(BTUS.length - 1, Math.floor((home.sqft - 800) / 320))] ||
        30000;
      const circuits = 2;
      permits.push({
        id: `P-${number}`,
        number,
        date,
        type: 'HVAC',
        relevant: true,
        homeId: home.id,
        address: home.address,
        neighborhood: home.neighborhood,
        valuation: 11000 + Math.floor(rand() * 9000),
        description: pick(HVAC_TEXT, rand).replace('{BTU}', String(btu)),
        technologies: [
          { label: 'Air-source heat pump (ducted)', confidence: 0.96 },
          { label: 'Air handler / indoor coil', confidence: 0.91 },
          { label: 'Gas furnace removal', confidence: 0.88 },
        ],
        attributes: [
          { key: 'brand', label: 'brand', value: brand },
          { key: 'model', label: 'model_series', value: model },
          { key: 'capacity_btu', label: 'capacity_btu', value: btu.toLocaleString() },
          { key: 'seer2', label: 'seer2', value: seer2.toFixed(1) },
          { key: 'hspf2', label: 'hspf2', value: hspf2.toFixed(1) },
          { key: 'circuits', label: 'circuits', value: String(circuits) },
        ],
      });
    } else {
      const from = home.panelAmps;
      const upgrades = from < 200;
      const to = 200;
      const circuits = 2 + Math.floor(rand() * 3);
      const panelBrand = pick(PANEL_BRANDS, rand);
      permits.push({
        id: `P-${number}`,
        number,
        date,
        type: 'Electrical',
        relevant: true,
        homeId: home.id,
        address: home.address,
        neighborhood: home.neighborhood,
        valuation: 4200 + Math.floor(rand() * 5200),
        description: pick(upgrades ? ELEC_TEXT : ELEC_TEXT_NO_UPGRADE, rand)
          .replace('{FROM}', String(from))
          .replace('{TO}', String(to))
          .replace('{N}', String(circuits)),
        technologies: upgrades
          ? [
              { label: 'Main service panel', confidence: 0.98 },
              { label: 'Branch circuits (240 V)', confidence: 0.93 },
              { label: 'Meter relocation', confidence: 0.71 },
            ]
          : [
              { label: 'Branch circuits (240 V)', confidence: 0.95 },
              { label: 'Heat pump / EVSE load', confidence: 0.86 },
              { label: 'Main service panel', confidence: 0.42 },
            ],
        attributes: [
          { key: 'brand', label: 'panel_brand', value: panelBrand },
          { key: 'amps_existing', label: 'amps_existing', value: `${from}` },
          {
            key: 'amps_new',
            label: 'amps_new',
            value: upgrades ? `${to}` : `${from} (unchanged)`,
          },
          { key: 'circuits', label: 'circuits', value: String(circuits) },
        ],
      });
    }
  });

  // The long tail the filter has to reject.
  NOISE.forEach(([type, text], i) => {
    const home = otherHomes[(i * 17 + 5) % otherHomes.length];
    const number = `RB24-${String(seq++).padStart(5, '0')}`;
    permits.push({
      id: `P-${number}`,
      number,
      date: isoDate(rand),
      type,
      relevant: false,
      homeId: home.id,
      address: home.address,
      neighborhood: home.neighborhood,
      valuation: 1800 + Math.floor(rand() * 14000),
      description: text,
      technologies: [],
      attributes: [],
    });
  });

  return permits.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const PERMITS = buildPermits();

export const PERMITS_BY_HOME = PERMITS.reduce((map, p) => {
  if (p.relevant) map.set(p.homeId, p);
  return map;
}, new Map());

export function permitStats() {
  const relevant = PERMITS.filter((p) => p.relevant);
  return {
    total: PERMITS.length,
    relevant: relevant.length,
    dropped: PERMITS.length - relevant.length,
    hvac: relevant.filter((p) => p.type === 'HVAC').length,
    electrical: relevant.filter((p) => p.type === 'Electrical').length,
    homesCovered: PERMITS_BY_HOME.size,
  };
}
