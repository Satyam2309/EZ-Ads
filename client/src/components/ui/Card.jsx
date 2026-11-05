export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) shadow-(--shadow-card)
        ${hover ? 'transition-all hover:shadow-(--shadow-card-hover) hover:-translate-y-0.5 hover:border-(--color-line)' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
