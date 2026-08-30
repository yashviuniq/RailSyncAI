import type { ReactNode } from 'react';

export function Panel({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`g-card p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#e8f0fe] text-google-blue shrink-0">
                {icon}
              </span>
            )}
            <div>
              {title && (
                <h2 className="text-[15px] font-medium text-google-ink flex items-center gap-2">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[13px] text-google-gray mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-google-softline bg-google-white p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-google-muted font-medium">
        {label}
      </p>
      <p className="text-2xl font-medium mt-1" style={{ color: accent ?? '#202124' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-google-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <p className="text-sm text-google-muted py-2">{message}</p>;
}