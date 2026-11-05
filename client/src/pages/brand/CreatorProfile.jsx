import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { CreatorAvatar } from '../../components/creators/CreatorCard.jsx';
import ShortlistSaveButton from '../../components/creators/ShortlistSaveButton.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import { formatFollowers, formatMoney, sourceLabel, availabilityLabel } from '../../utils/format.js';

const FORMAT_LABELS = { post: 'Post', reel: 'Reel', story: 'Story', video: 'Video', custom: 'Custom' };
const SOCIAL_STATUS = {
  connected: { text: 'Verified via platform API', tone: 'success' },
  self_reported: { text: 'Self-reported (not API-verified)', tone: 'neutral' },
  unavailable: { text: 'Unavailable', tone: 'danger' }
};
const AVAIL_TONES = { available: 'success', limited: 'warning', booked: 'neutral', paused: 'danger' };

export default function CreatorProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const compare = useCompare();

  useEffect(() => {
    api.get(`/influencers/${id}`)
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <p className="text-lg font-semibold">Could not load this creator</p>
      <p className="mt-1 text-sm text-neutral-500">{err}</p>
      <Button className="mt-4" variant="secondary" to="/brand/discovery">Back to discovery</Button>
    </div>
  );
  if (!data) return <p className="p-10 text-center text-sm text-neutral-500">Loading…</p>;

  const { profile, socialAccounts } = data;
  const audience = profile.audience || {};
  const folSrc = sourceLabel(audience.followersSource);
  const engSrc = sourceLabel(audience.engagementSource);
  const avail = availabilityLabel(profile.availability);
  // Normalize so compare keys match discovery cards (list vs raw-ObjectId user),
  // and so save-to-shortlist always gets the influencer User id.
  const normalized = { ...profile, user: profile.user?._id ? profile.user : { _id: profile.user } };
  const selected = compare.has(normalized);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/brand/discovery" className="text-sm text-brand-600 hover:text-brand-700">← Back to discovery</Link>

      {/* Header */}
      <Card className="mt-3 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <CreatorAvatar creator={profile} size="h-16 w-16 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{profile.displayName}</h1>
              <Badge tone={AVAIL_TONES[profile.availability] || 'neutral'}>{avail.text}</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {profile.username ? `@${profile.username}` : ''} · {profile.niche}
              {profile.location?.city || profile.location?.country
                ? ` · ${[profile.location?.city, profile.location?.country].filter(Boolean).join(', ')}`
                : ''}
              {profile.languages?.length ? ` · ${profile.languages.join(', ')}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShortlistSaveButton influencerId={normalized.user._id} />
            <Button
              size="sm"
              variant={selected ? 'primary' : 'secondary'}
              disabled={!selected && compare.isFull()}
              onClick={() => compare.toggle(normalized)}
            >
              {selected ? '✓ In compare' : 'Compare'}
            </Button>
          </div>
        </div>

        {profile.bio && <p className="mt-4 whitespace-pre-line text-sm text-neutral-700">{profile.bio}</p>}
      </Card>

      {/* Audience — each number labeled with its origin, plainly */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Followers</p>
          <p className="mt-1 text-2xl font-bold">{formatFollowers(audience.followers)}</p>
          <p title={folSrc.title} className="mt-2 text-xs">
            <Badge tone={folSrc.tone}>{folSrc.text}</Badge>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Engagement rate</p>
          <p className="mt-1 text-2xl font-bold">{audience.engagementRate != null ? `${audience.engagementRate}%` : '—'}</p>
          <p title={engSrc.title} className="mt-2 text-xs">
            <Badge tone={engSrc.tone}>{engSrc.text}</Badge>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Budget range</p>
          <p className="mt-1 text-2xl font-bold">
            {profile.minBudget > 0 || profile.maxBudget > 0
              ? `${formatMoney(profile.minBudget)}–${profile.maxBudget > 0 ? formatMoney(profile.maxBudget) : 'open'}`
              : '—'}
          </p>
          <p className="mt-2 text-xs text-neutral-500">As entered by the creator</p>
        </Card>
      </div>

      {/* Rates */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Packages & rates</h2>
        {profile.rates?.length ? (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr><th className="py-1">Format</th><th className="py-1">Price</th></tr>
            </thead>
            <tbody>
              {profile.rates.map((r, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="py-2">{FORMAT_LABELS[r.format] || r.format}</td>
                  <td className="py-2">{formatMoney(r.amount, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No packages published yet — reach out during the campaign phase.</p>
        )}
      </Card>

      {/* Social accounts — connection status stated honestly */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Social accounts</h2>
        {socialAccounts?.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {socialAccounts.map((s) => {
              const st = SOCIAL_STATUS[s.status] || SOCIAL_STATUS.self_reported;
              return (
                <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 py-2 first:border-0">
                  <span className="font-medium capitalize">{s.platform}{s.username ? ` · @${s.username}` : ''}</span>
                  <span className="flex items-center gap-3">
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-xs text-brand-600 hover:underline">open ↗</a>
                    <Badge tone={st.tone}>{st.text}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No additional profiles listed.</p>
        )}
      </Card>

      {/* Portfolio */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Portfolio</h2>
        {profile.portfolio?.length ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {profile.portfolio.map((p) => (
              <a key={p._id} href={p.mediaUrl} target="_blank" rel="noreferrer noopener" className="group block overflow-hidden rounded-xl border border-neutral-200">
                {p.thumbnailUrl || p.mediaUrl.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                  <img src={p.thumbnailUrl || p.mediaUrl} alt={p.title || 'Portfolio item'} className="h-36 w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-neutral-100 text-sm text-neutral-500">View work ↗</div>
                )}
                {p.title && <p className="p-3 text-sm font-medium">{p.title}</p>}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No portfolio items yet.</p>
        )}
      </Card>
    </div>
  );
}
