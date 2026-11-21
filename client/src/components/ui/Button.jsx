import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-linear-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.22)_inset,0_10px_22px_-14px_var(--color-brand-600)] hover:to-brand-700 hover:shadow-[0_1px_0_rgb(255_255_255/0.22)_inset,0_14px_26px_-14px_var(--color-brand-600)] focus-visible:outline-brand-600',
  secondary: 'bg-(--color-surface) text-(--color-ink) ring-1 ring-inset ring-(--color-line) hover:bg-(--color-elevated) hover:ring-brand-500/40 focus-visible:outline-brand-600',
  ghost: 'text-brand-600 dark:text-brand-300 hover:bg-(--color-elevated) focus-visible:outline-brand-600',
  danger: 'bg-linear-to-b from-red-500 to-red-600 text-white hover:to-red-700 focus-visible:outline-red-600'
};

const sizes = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

export default function Button({ variant = 'primary', size = 'md', to, children, className = '', ...props }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold
    transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out
    hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
    motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100
    disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
  if (to) {
    return <Link to={to} className={cls} {...props}>{children}</Link>;
  }
  return <button className={cls} {...props}>{children}</button>;
}
