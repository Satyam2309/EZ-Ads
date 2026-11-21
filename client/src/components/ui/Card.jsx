const VARIANTS = {
  default: 'border-(--color-line) bg-(--color-surface)',
  glass: 'border-white/50 bg-(--color-surface)/70 backdrop-blur-xl dark:border-white/10 dark:bg-(--color-surface)/55',
  inset: 'border-(--color-line) bg-(--color-elevated)/60'
};

/** The one card recipe: hairline border, layered shadow, and an optional lift
    that scales a hair on hover so the surface answers the pointer. */
export default function Card({ children, className = '', hover = false, variant = 'default' }) {
  return (
    <div
      className={`relative rounded-(--radius-card) border shadow-(--shadow-card) ${VARIANTS[variant]}
        ${hover ? 'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-brand-500/35 hover:shadow-(--shadow-card-hover)' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
