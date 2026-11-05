import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600 shadow-sm',
  secondary: 'bg-(--color-surface) text-(--color-ink) ring-1 ring-inset ring-(--color-line) hover:bg-(--color-elevated) focus-visible:outline-brand-600',
  ghost: 'text-brand-600 dark:text-brand-300 hover:bg-(--color-elevated) focus-visible:outline-brand-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600'
};

const sizes = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

export default function Button({ variant = 'primary', size = 'md', to, children, className = '', ...props }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-colors
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
    disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
  if (to) {
    return <Link to={to} className={cls} {...props}>{children}</Link>;
  }
  return <button className={cls} {...props}>{children}</button>;
}
