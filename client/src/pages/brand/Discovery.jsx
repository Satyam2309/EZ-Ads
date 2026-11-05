import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import CreatorCard from '../../components/creators/CreatorCard.jsx';
import CompareTray from '../../components/creators/CompareTray.jsx';

const SORTS = [
  ['followers', 'Most followers'],
  ['engagement', 'Highest engagement'],
  ['price_low', 'Lowest starting price'],
  ['price_high', 'Highest starting price'],
  ['relevance', 'Relevance (with search)']
];

const NICHES = ['fashion', 'beauty', 'food', 'tech', 'fitness', 'travel', 'gaming', 'education', 'lifestyle', 'other'];

const initialFilters = {
  q: '', niche: '', city: '', country: '',
  minFollowers: '', maxFollowers: '', minEngagement: '', minBudget: '', maxBudget: '',
  availability: '', sort: 'followers', page: 1
};

export default function Discovery() {
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters); // search box debounces into filters
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // debounce the free-text search
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: draft.q, page: 1 })), 400);
    return () => clearTimeout(t);
  }, [draft.q]);

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, v); });
    setErr('');
    api.get(`/influencers/search?${qs.toString()}`)
      .then((res) => { if (alive) setResult(res.data); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const updateDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    !['page', 'sort', 'q'].includes(k) && v !== '').length;

  const inputCls = 'h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Find creators</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every number is labeled by where it came from: <Badge tone="success">API</Badge> comes from Meta's
            Instagram API, <Badge tone="neutral">Self-reported</Badge> is what the creator entered.
          </p>
        </div>
        <Button variant="secondary" size="sm" to="/brand/shortlists">My shortlists</Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <FilterRail
          filters={filters} set={set} setDraft={updateDraft} draft={draft}
          activeFilterCount={activeFilterCount}
          clear={() => { setFilters({ ...initialFilters, sort: filters.sort }); setDraft({ ...initialFilters, sort: filters.sort }); }}
          inputCls={inputCls}
        />

        <div>
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
          )}
          {loading && !result ? (
            <p className="text-sm text-neutral-500">Searching…</p>
          ) : result ? (
            <>
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>{result.total} creator{result.total === 1 ? '' : 's'} found</span>
                <label className="flex items-center gap-2">
                  Sort
                  <select className="h-9 rounded-lg border border-neutral-200 px-2 text-sm" value={filters.sort}
                    onChange={(e) => set({ sort: e.target.value, page: 1 })}>
                    {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>

              {result.items.length === 0 ? (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
                  No creators match these filters yet. Try widening the range or clearing filters.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {result.items.map((c) => <CreatorCard key={c._id} creator={c} />)}
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-3 text-sm">
                <Button size="sm" variant="secondary" disabled={filters.page <= 1}
                  onClick={() => set({ page: filters.page - 1 })}>← Prev</Button>
                <span className="text-neutral-500">Page {result.page} of {result.pages}</span>
                <Button size="sm" variant="secondary" disabled={result.page >= result.pages}
                  onClick={() => set({ page: filters.page + 1 })}>Next →</Button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <CompareTray />
    </div>
  );
}

function FilterRail({ filters, set, draft, setDraft, clear, activeFilterCount, inputCls }) {
  return (
    <aside className="space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filters</p>
          {activeFilterCount > 0 && (
            <button onClick={clear} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-xs font-semibold text-neutral-500">Search keywords</span>
          <input className={inputCls} placeholder="name, niche, bio…" value={draft.q}
            onChange={(e) => setDraft({ q: e.target.value })} />
        </label>

        <label className="mt-3 block space-y-1">
          <span className="text-xs font-semibold text-neutral-500">Niche</span>
          <select className={inputCls} value={filters.niche} onChange={(e) => set({ niche: e.target.value, page: 1 })}>
            <option value="">Any niche</option>
            {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <p className="mt-3 text-xs font-semibold text-neutral-500">Followers</p>
        <div className="flex items-center gap-2">
          <input className={inputCls + ' text-xs'} inputMode="numeric" placeholder="min" value={filters.minFollowers}
            onChange={(e) => set({ minFollowers: e.target.value, page: 1 })} />
          <span className="text-neutral-400">–</span>
          <input className={inputCls + ' text-xs'} inputMode="numeric" placeholder="max" value={filters.maxFollowers}
            onChange={(e) => set({ maxFollowers: e.target.value, page: 1 })} />
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-xs font-semibold text-neutral-500">Engagement rate ≥ (%)</span>
          <input className={inputCls + ' text-xs'} inputMode="decimal" placeholder="e.g. 3" value={filters.minEngagement}
            onChange={(e) => set({ minEngagement: e.target.value, page: 1 })} />
        </label>

        <p className="mt-3 text-xs font-semibold text-neutral-500">Budget (₹)</p>
        <div className="flex items-center gap-2">
          <input className={inputCls + ' text-xs'} inputMode="numeric" placeholder="min" value={filters.minBudget}
            onChange={(e) => set({ minBudget: e.target.value, page: 1 })} />
          <span className="text-neutral-400">–</span>
          <input className={inputCls + ' text-xs'} inputMode="numeric" placeholder="max" value={filters.maxBudget}
            onChange={(e) => set({ maxBudget: e.target.value, page: 1 })} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-neutral-500">City</span>
            <input className={inputCls + ' text-xs'} placeholder="Mumbai" value={filters.city}
              onChange={(e) => set({ city: e.target.value, page: 1 })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-neutral-500">Country</span>
            <input className={inputCls + ' text-xs'} placeholder="India" value={filters.country}
              onChange={(e) => set({ country: e.target.value, page: 1 })} />
          </label>
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-xs font-semibold text-neutral-500">Availability</span>
          <select className={inputCls} value={filters.availability}
            onChange={(e) => set({ availability: e.target.value, page: 1 })}>
            <option value="">Any</option>
            <option value="available">Available</option>
            <option value="limited">Limited slots</option>
            <option value="booked">Booked</option>
          </select>
        </label>
      </div>
    </aside>
  );
}
