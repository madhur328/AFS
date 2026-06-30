import { NavLink, Outlet } from 'react-router-dom';
import { Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { isStaticMode, isStaticMobileMode } from '../lib/staticApi';
import { kernelNavWithIcons } from '../lib/kernel-nav';
import MobileTabBar from './MobileTabBar';

/** Navigation unfolded from 🍁 — Red Leaf Kernel iteration 1 */
const nav = kernelNavWithIcons();

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const staticMode = isStaticMode();
  const mobileStatic = isStaticMobileMode();

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={`forge-bg flex min-h-screen ${mobileStatic ? 'afs-mobile-static' : ''}`}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`glass-panel fixed left-0 top-0 z-40 flex h-full flex-col border-r border-forge-border transition-all duration-300 ${
          collapsed ? 'md:w-[68px]' : 'md:w-[220px]'
        } w-[min(280px,85vw)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="border-b border-forge-border p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚒️</span>
            {!collapsed && (
              <div>
                <h1 className="font-display text-sm font-bold tracking-widest text-forge-cyan glow-text">AFS</h1>
                <p className="font-mono text-[10px] text-forge-muted">Aspect Forge System</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {nav.map(({ to, icon: Icon, label, symbol }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={symbol}
              onClick={closeMobile}
              className={({ isActive }) =>
                `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-forge-cyan/10 text-forge-cyan shadow-glow'
                    : 'text-forge-muted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden border-t border-forge-border p-3 text-forge-muted hover:text-forge-cyan md:block"
        >
          <Settings size={16} className="mx-auto" />
        </button>
      </aside>

      <main className={`ml-0 flex-1 transition-all ${collapsed ? 'md:ml-[68px]' : 'md:ml-[220px]'}`}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-forge-leaf/5 blur-3xl" />
          <div className="absolute -left-20 bottom-20 h-80 w-80 rounded-full bg-forge-cyan/5 blur-3xl" />
        </div>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-forge-border/60 bg-forge-bg/90 px-4 py-3 backdrop-blur md:hidden [padding-top:max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-forge-muted hover:bg-white/5 hover:text-forge-cyan"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚒️</span>
            <span className="font-display text-sm font-bold tracking-widest text-forge-cyan">AFS</span>
          </div>
          {staticMode && (
            <span className="ml-auto rounded-full bg-forge-leaf/15 px-2 py-0.5 font-mono text-[10px] text-forge-leaf">
              {mobileStatic ? 'Mobile' : 'Static'}
            </span>
          )}
          {mobileOpen && (
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMobile}
              className="ml-auto rounded-lg p-2 text-forge-muted hover:text-forge-cyan"
            >
              <X size={20} />
            </button>
          )}
        </header>
        {staticMode && (
          <div className="hidden border-b border-forge-leaf/20 bg-forge-leaf/5 px-4 py-2 text-center font-mono text-xs text-forge-leaf md:block">
            Offline snapshot — open this file in any browser, no server required
          </div>
        )}
        <div className={`relative p-4 sm:p-6 lg:p-8 ${mobileStatic ? 'pb-24' : ''}`}>
          <Outlet />
        </div>
      </main>
      {mobileStatic && <MobileTabBar onOpenMenu={() => setMobileOpen(true)} />}
    </div>
  );
}