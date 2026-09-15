// Display formatters. USD only — this demo has no non-dollar currency.

const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const usd = (n) => usdFmt.format(Math.round(n || 0));

/** $4.2M / $850k / $940 — for headline numbers that need to stay short. */
export function usdShort(n) {
  const v = Math.abs(n || 0);
  const sign = n < 0 ? '-' : '';
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M`;
  if (v >= 1_000) return `${sign}$${Math.round(v / 1_000)}k`;
  return `${sign}$${Math.round(v)}`;
}

export const num = (n, digits = 0) =>
  (n || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const pct = (n, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Minutes past midnight -> "14:15", for the 15-minute interval axis. */
export function clock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Escapes text before it goes into an innerHTML template. */
export function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
