import { useState } from 'react';
import Button from '../ui/Button.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import { formatFollowers, formatMoney } from '../../utils/format.js';

function metricRows(creators) {
  const rate = (c) => {
    const r = (c.rates || []).find((r) => r.format === 'reel') || (c.rates || [])[0];
    return r ? formatMoney(r.amount, r.currency) : '—';
  };
  return [
    ['Followers', (c) => formatFollowers(c.audience?.followers)],
    ['Engagement', (c) => (c.audience?.engagementRate != null ? `${c.audience.engagementRate}%` : '—')],
    ['Followers source', (c) => (c.audience?.followersSource === 'meta_api' ? 'API' : 'Self-reported')],
    ['Niche', (c) => c.niche || '—'],
    ['Location', (c) => [c.location?.city, c.location?.country].filter(Boolean).join(', ') || '—'],
    ['Budget from', (c) => formatMoney(c.minBudget)],
    ['Budget to', (c) => (c.maxBudget > 0 ? formatMoney(c.maxBudget) : '—')],
    ['Reel rate', rate]
  ];
}

export default function CompareTray() {
  const compare = useCompare();
  const [open, setOpen] = useState(false);
  if (compare.items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-200 bg-brand-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-brand-700">Compare ({compare.items.length}/{compare.max})</p>
        <div className="flex flex-wrap gap-2">
          {compare.items.map((c) => (
            <span key={c._id} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-brand-200">
              {c.displayName}
              <button aria-label={`Remove ${c.displayName} from compare`} className="text-neutral-400 hover:text-red-600"
                onClick={() => compare.toggle(c)}>✕</button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={compare.clear}>Clear</Button>
          <Button size="sm" disabled={compare.items.length < 2} onClick={() => setOpen(true)}>Compare side by side</Button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold">Side-by-side comparison</h2>
              <button className="text-neutral-400 hover:text-neutral-700" onClick={() => setOpen(false)}>✕</button>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr>
                  <th className="w-40" />
                  {compare.items.map((c) => (
                    <th key={c._id} className="p-2 text-left align-top">
                      <p className="font-semibold">{c.displayName}</p>
                      <p className="text-xs font-normal text-neutral-500">{c.user?.instagram?.username ? `@${c.user.instagram.username}` : ''}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRows(compare.items).map(([label, get]) => (
                  <tr key={label} className="border-t border-neutral-100">
                    <td className="p-2 text-xs font-semibold text-neutral-500">{label}</td>
                    {compare.items.map((c) => <td key={c._id} className="p-2">{get(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
