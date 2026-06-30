/**
 * AUTO-GENERATED from Red Leaf Kernel 🍁
 * Source: scripts/generate-kernel-routes.js — do not edit manually.
 * Regenerate: npm run generate-routes
 */
import { Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Aspects from '../pages/Aspects';
import Automations from '../pages/Automations';
import Codex from '../pages/Codex';
import Daily from '../pages/Daily';
import Dashboard from '../pages/Dashboard';
import Forge from '../pages/Forge';
import Fusions from '../pages/Fusions';
import Goals from '../pages/Goals';
import GrokOrigin from '../pages/GrokOrigin';
import Identity from '../pages/Identity';
import Insights from '../pages/Insights';
import Journal from '../pages/Journal';
import Lore from '../pages/Lore';
import MathPage from '../pages/MathPage';
import Personas from '../pages/Personas';
import RedLeafKernel from '../pages/RedLeafKernel';
import SearchPage from '../pages/SearchPage';
import SpiralEngine from '../pages/SpiralEngine';
import Techniques from '../pages/Techniques';
import Visualizations from '../pages/Visualizations';

export interface KernelRouteEntry {
  id: string;
  path: string;
  page: string;
  layout: 'shell' | 'fullscreen';
  label: string;
  symbol: string;
  branch: string;
  testHeading: string;
  end: boolean;
}

export const KERNEL_ROUTE_MANIFEST: KernelRouteEntry[] = [
  { id: 'dashboard', path: '/', page: 'Dashboard', layout: 'shell', label: "Dashboard", symbol: "🍁⌂", branch: 'seed', testHeading: 'Welcome|Test Forger', end: true },
  { id: 'codex', path: '/codex', page: 'Codex', layout: 'shell', label: "Codex", symbol: "🍁AFS📖", branch: 'optimize', testHeading: 'AFS Codex', end: false },
  { id: 'lore', path: '/lore', page: 'Lore', layout: 'shell', label: "Lore", symbol: "🍁🍁✨", branch: 'reframe', testHeading: 'Lore & Alchemy', end: false },
  { id: 'aspects', path: '/aspects', page: 'Aspects', layout: 'shell', label: "Aspects", symbol: "🍁🍁💎", branch: 'reframe', testHeading: 'Aspect Registry', end: false },
  { id: 'forge', path: '/forge', page: 'Forge', layout: 'shell', label: "Forge", symbol: "🍁AFS⚒️", branch: 'optimize', testHeading: 'Aspect Forge Protocol', end: false },
  { id: 'daily', path: '/daily', page: 'Daily', layout: 'shell', label: "DFR / DKR", symbol: "🍁AFS📅", branch: 'optimize', testHeading: 'Daily Forge Runs', end: false },
  { id: 'goals', path: '/goals', page: 'Goals', layout: 'shell', label: "Goals", symbol: "🍁AFS🎯", branch: 'optimize', testHeading: 'Goals & Achievements', end: false },
  { id: 'personas', path: '/personas', page: 'Personas', layout: 'shell', label: "Personas", symbol: "🍁AFS👤", branch: 'optimize', testHeading: '^Personas$', end: false },
  { id: 'insights', path: '/insights', page: 'Insights', layout: 'shell', label: "Insights", symbol: "🍁🍁💡", branch: 'reframe', testHeading: '^Insights$', end: false },
  { id: 'grok', path: '/grok', page: 'GrokOrigin', layout: 'shell', label: "Grok Origin", symbol: "🍁♾️🌀📜", branch: 'transform', testHeading: 'Grok Origin', end: false },
  { id: 'journal', path: '/journal', page: 'Journal', layout: 'shell', label: "Journal", symbol: "🍁🍁📓", branch: 'reframe', testHeading: '^Journal$', end: false },
  { id: 'visualizations', path: '/visualizations', page: 'Visualizations', layout: 'shell', label: "Visuals", symbol: "🍁♾️🌀🎬", branch: 'transform', testHeading: '^Visualizations$', end: false },
  { id: 'spiral', path: '/spiral', page: 'SpiralEngine', layout: 'fullscreen', label: "Spiral Engine", symbol: "🍁♾️🌀∞", branch: 'transform', testHeading: 'Recursive Spiral Engine', end: false },
  { id: 'kernel', path: '/kernel', page: 'RedLeafKernel', layout: 'shell', label: "Red Leaf Kernel", symbol: "🍁🍁", branch: 'seed', testHeading: 'Red Leaf Kernel', end: false },
  { id: 'math', path: '/math', page: 'MathPage', layout: 'shell', label: "Mathematics", symbol: "🍁♾️🌀∑", branch: 'transform', testHeading: '^Mathematics$', end: false },
  { id: 'techniques', path: '/techniques', page: 'Techniques', layout: 'shell', label: "Techniques", symbol: "🍁AFS🧠", branch: 'optimize', testHeading: '^Techniques$', end: false },
  { id: 'fusions', path: '/fusions', page: 'Fusions', layout: 'shell', label: "Fusions", symbol: "🍁♾️🌀⚗️", branch: 'transform', testHeading: 'Alchemy Fusions & Synergies', end: false },
  { id: 'automations', path: '/automations', page: 'Automations', layout: 'shell', label: "Automations", symbol: "🍁AFS⚡", branch: 'optimize', testHeading: '^Automations$', end: false },
  { id: 'identity', path: '/identity', page: 'Identity', layout: 'shell', label: "Identity", symbol: "🍁🍁🪞", branch: 'reframe', testHeading: 'Current Identity', end: false },
  { id: 'search', path: '/search', page: 'SearchPage', layout: 'shell', label: "Search", symbol: "🍁AFS🔍", branch: 'optimize', testHeading: 'Search Directory', end: false },
];

/** Route tree unfolded from 🍁 — pass directly as child of <Routes> */
export const kernelRouteElements = (
  <>
      <Route path="/spiral" element={<SpiralEngine />} />
    <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/codex" element={<Codex />} />
        <Route path="/lore" element={<Lore />} />
        <Route path="/aspects" element={<Aspects />} />
        <Route path="/forge" element={<Forge />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/grok" element={<GrokOrigin />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/visualizations" element={<Visualizations />} />
        <Route path="/kernel" element={<RedLeafKernel />} />
        <Route path="/math" element={<MathPage />} />
        <Route path="/techniques" element={<Techniques />} />
        <Route path="/fusions" element={<Fusions />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/identity" element={<Identity />} />
        <Route path="/search" element={<SearchPage />} />
    </Route>
  </>
);
