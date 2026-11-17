import { useState } from 'react';
import Icon from './Icon.jsx';

/**
 * PasswordInput — a password field with an eye button to reveal what was typed.
 *
 * Every form passes its own input styling through `inputClassName` so the field
 * keeps looking native to its page; the wrapper only reserves room for the
 * button so the text never runs underneath it.
 */
export default function PasswordInput({ id, inputClassName = '', className = '', ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        id={id}
        type={shown ? 'text' : 'password'}
        className={`${inputClassName} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        aria-controls={id}
        title={shown ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-(--color-ink-soft) transition-colors hover:text-(--color-ink) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <Icon name={shown ? 'eye-off' : 'eye'} size={18} />
      </button>
    </div>
  );
}
