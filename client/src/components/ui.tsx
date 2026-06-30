import { type MouseEvent, ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Panel({ children, className = '', title, subtitle, action }: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`glass-panel rounded-2xl p-5 shadow-glow ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && <h2 className="font-display text-lg font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-forge-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function CollapsiblePanel({
  children,
  className = '',
  title,
  subtitle,
  badge,
  defaultOpen = false,
}: {
  children: ReactNode;
  className?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`glass-panel rounded-2xl shadow-glow ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-forge-muted">{subtitle}</p>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`mt-0.5 shrink-0 text-forge-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && <div className="border-t border-forge-border/60 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

export function QualityBadge({ quality }: { quality: 'basic' | 'diamond' | 'resonant' | 'infinite' }) {
  const styles: Record<string, string> = {
    basic: 'bg-white/5 text-forge-muted border-forge-border',
    diamond: 'bg-forge-cyan/15 text-forge-cyan border-forge-cyan/35',
    resonant: 'bg-forge-violet/15 text-forge-violet border-forge-violet/35',
    infinite: 'bg-forge-gold/15 text-forge-gold border-forge-gold/40',
  };
  const labels: Record<string, string> = {
    basic: 'Basic',
    diamond: 'Diamond',
    resonant: 'Resonant',
    infinite: 'Infinite',
  };
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${styles[quality] || styles.basic}`}>
      {labels[quality] || quality}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    S: 'bg-forge-gold/20 text-forge-gold border-forge-gold/40',
    A: 'bg-forge-cyan/20 text-forge-cyan border-forge-cyan/40',
    B: 'bg-forge-violet/20 text-forge-violet border-forge-violet/40',
    C: 'bg-forge-muted/20 text-forge-muted border-forge-muted/40',
    D: 'bg-white/5 text-forge-muted border-forge-border',
  };
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-xs font-bold ${colors[tier] || colors.D}`}>
      {tier}
    </span>
  );
}

export function ProgressBar({ value, color = 'cyan' }: { value: number; color?: string }) {
  const c = color === 'gold' ? 'bg-forge-gold' : color === 'ember' ? 'bg-forge-ember' : color === 'leaf' ? 'bg-forge-leaf' : 'bg-forge-cyan';
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-forge-border">
      <div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

export function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon?: ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-forge-muted">{label}</p>
        {icon}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-forge-muted">{sub}</p>}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', disabled, className = '' }: {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'ghost' | 'ember' | 'leaf';
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-forge-cyan/20 text-forge-cyan border-forge-cyan/40 hover:bg-forge-cyan/30',
    ghost: 'bg-white/5 text-forge-muted border-forge-border hover:text-white',
    ember: 'bg-forge-ember/20 text-forge-ember border-forge-ember/40 hover:bg-forge-ember/30',
    leaf: 'bg-forge-leaf/20 text-forge-leaf border-forge-leaf/40 hover:bg-forge-leaf/30',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}