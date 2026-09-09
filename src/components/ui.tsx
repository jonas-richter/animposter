'use client';

import { useEffect, type ReactNode } from 'react';

export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="toggle"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      aria-pressed={value}
    >
      <span className="grow">
        <span style={{ display: 'block', fontWeight: 650 }}>{label}</span>
        {hint && (
          <span className="muted" style={{ display: 'block', fontSize: 14, fontWeight: 400 }}>
            {hint}
          </span>
        )}
      </span>
      <span className={`switch${value ? ' on' : ''}`} />
    </button>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sheet">
        <div className="row">
          <h2 className="grow" style={{ margin: 0 }}>
            {title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Banner({ kind, children }: { kind: 'err' | 'info' | 'ok'; children: ReactNode }) {
  return <div className={`banner ${kind}`}>{children}</div>;
}
