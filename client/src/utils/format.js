/**
 * Stable creator identifier for compare/save actions across pages:
 * discovery items have `user` populated as a doc, the public profile returns it
 * as a raw ObjectId. Both paths resolve to the influencer's User _id.
 */
export function creatorKey(creator) {
  if (!creator) return null;
  const u = creator.user;
  if (u?._id) return String(u._id);
  if (u) return String(u);
  return String(creator._id);
}

export function formatFollowers(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

export function formatMoney(n, currency = 'INR') {
  if (n == null || n === '') return '—';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  if (n >= 1000 && n % 1000 === 0) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n.toLocaleString()}`;
}

/** Audience metrics carry their origin — show it plainly, never blur API vs self-reported. */
export function sourceLabel(src) {
  if (src === 'meta_api') return { text: 'API', tone: 'success', title: 'Synced from Meta Instagram API' };
  return { text: 'Self-reported', tone: 'neutral', title: 'Entered by the creator — not API-verified' };
}

export function availabilityLabel(a) {
  const map = {
    available: { text: 'Available', tone: 'success' },
    limited: { text: 'Limited slots', tone: 'warning' },
    booked: { text: 'Booked', tone: 'neutral' },
    paused: { text: 'Paused', tone: 'danger' }
  };
  return map[a] || map.available;
}

export function rateFor(rates, format = 'reel') {
  const r = (rates || []).find((r) => r.format === format);
  if (!r) return null;
  return formatMoney(r.amount, r.currency);
}
