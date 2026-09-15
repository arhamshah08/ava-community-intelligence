// Small inline glyphs for household assets. Kept to a 16x16 box with a single
// stroke weight so a row of them reads as one set.

const box = (inner, stroke) =>
  `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const PATHS = {
  panel: '<rect x="3.2" y="2.2" width="9.6" height="11.6" rx="1.2"/><path d="M6 5.4h4M6 8h4M6 10.6h4"/>',
  heatPump:
    '<circle cx="8" cy="8" r="5.4"/><path d="M8 8c0-2 .9-3.4 2.6-3.4M8 8c1.7 1 2.2 2.6 1.3 4.1M8 8c-1.7-1-2.2-2.6-1.3-4.1"/>',
  waterHeater:
    '<rect x="4.4" y="2.6" width="7.2" height="10.8" rx="3.2"/><path d="M8 6.2v3.4"/>',
  solar:
    '<path d="M2.4 11.2 4.6 4.4h6.8l2.2 6.8z"/><path d="M3.4 8h9.2M8 4.4v6.8"/>',
  ev: '<path d="M6 2.4v3.2M10 2.4v3.2"/><path d="M4.6 5.6h6.8v2.6a3.4 3.4 0 0 1-3.4 3.4A3.4 3.4 0 0 1 4.6 8.2z"/><path d="M8 11.6v2"/>',
  battery:
    '<rect x="2.4" y="4.8" width="10.2" height="6.4" rx="1.2"/><path d="M13.8 7.2v1.6"/><path d="M5.2 7.2v1.6M7.6 7.2v1.6"/>',
};

export const ASSET_META = {
  panel: { label: 'Panel' },
  heatPump: { label: 'Heat pump' },
  waterHeater: { label: 'HPWH' },
  solar: { label: 'Solar' },
  ev: { label: 'EV' },
  battery: { label: 'Battery' },
};

export function icon(key, on = true) {
  return box(PATHS[key] || '', on ? '#12161c' : '#c2cad4');
}

/** Which of the six facets this household actually has. */
export function assetFlags(home) {
  return {
    panel: home.panelAmps >= 200,
    heatPump: home.hasHeatPump,
    waterHeater: home.waterHeater === 'heat-pump',
    solar: home.hasSolar,
    ev: home.hasEV,
    battery: home.hasBattery,
  };
}

/** A row of glyphs: present in ink, absent in a light grey. */
export function assetStrip(home) {
  const flags = assetFlags(home);
  return Object.keys(ASSET_META)
    .map(
      (k) =>
        `<span class="facet ${flags[k] ? 'is-on' : ''}" title="${ASSET_META[k].label}">${icon(
          k,
          flags[k]
        )}</span>`
    )
    .join('');
}
