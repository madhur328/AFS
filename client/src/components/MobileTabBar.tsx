import { NavLink } from 'react-router-dom';
import { Home, Gem, Hammer, Sparkles, Menu } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/aspects', icon: Gem, label: 'Aspects' },
  { to: '/forge', icon: Hammer, label: 'Forge' },
  { to: '/lore', icon: Sparkles, label: 'Lore' },
] as const;

interface Props {
  onOpenMenu: () => void;
}

export default function MobileTabBar({ onOpenMenu }: Props) {
  return (
    <nav
      className="afs-mobile-tabbar fixed inset-x-0 bottom-0 z-50 border-t border-forge-border/80 bg-forge-bg/95 backdrop-blur-md md:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {tabs.map(({ to, icon: Icon, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            {...('end' in rest ? { end: rest.end } : {})}
            className={({ isActive }) =>
              `flex min-h-[3.25rem] min-w-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-forge-cyan' : 'text-forge-muted active:text-white'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-h-[3.25rem] min-w-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-forge-muted transition-colors active:text-forge-cyan"
          aria-label="Open full menu"
        >
          <Menu size={20} strokeWidth={2} aria-hidden />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}