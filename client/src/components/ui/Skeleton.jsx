export default function Skeleton({ className = '' }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-neutral-200/70 ${className}`} />;
}
