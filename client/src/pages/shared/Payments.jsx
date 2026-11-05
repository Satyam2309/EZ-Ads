import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

const TYPE_LABELS = {
  campaign_payment: 'Campaign payment (brand → platform)',
  platform_commission: 'Platform commission',
  influencer_payout: 'Creator payout (platform → creator)'
};
const TYPE_TONES = { campaign_payment: 'brand', platform_commission: 'warning', influencer_payout: 'success' };

const money = (n, c = 'INR') =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function Payments() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/payments')
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments ledger</h1>
        <p className="mt-1 text-sm text-neutral-500">The money trail of your completed agreements.</p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">⚠ SIMULATED — no real money moved.</p>
        <p className="mt-1">
          EZ Ads has no payment provider connected yet. Every row below is a clearly-marked simulation of
          what <em>will</em> happen when real checkout and payouts are wired in a later phase.
        </p>
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      {data === null ? <p className="mt-6 text-sm text-neutral-500">Loading…</p> : data.items.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="font-semibold">No transactions yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Rows appear when an agreement reaches its final “paid” step.
          </p>
          <Button className="mt-4" variant="secondary" to="/brand/campaigns">Go to campaigns</Button>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Counterparty</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t._id} className="border-t border-neutral-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{TYPE_LABELS[t.type] || t.type}</div>
                    {t.commissionPercent != null && <div className="text-xs text-neutral-400">{t.commissionPercent}% rate</div>}
                  </td>
                  <td className="px-4 py-3">{t.campaign?.title || '—'}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {t.brand?.companyName || t.brand?.displayName || '—'} → {t.influencer?.displayName || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(t.amount, t.currency)}</td>
                  <td className="px-4 py-3 text-xs">
                    <Badge tone={TYPE_TONES[t.type] || 'neutral'}>{t.status}</Badge>
                    <div className="mt-1 text-neutral-400">{new Date(t.createdAt).toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
