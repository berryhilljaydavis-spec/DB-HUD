import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  badge?: string;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, badge, className = '', children }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <span className="panel-corner tl" />
      <span className="panel-corner tr" />
      <span className="panel-corner bl" />
      <span className="panel-corner br" />
      <header className="panel-head">
        <h2>{title}</h2>
        {badge ? <span className="panel-badge">{badge}</span> : null}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
