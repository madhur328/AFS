import {
  Home, BookOpen, Gem, Hammer, Calendar, Target, Users, Lightbulb,
  Image, Sigma, Zap, Search, Layers, FlaskConical, Brain, ScrollText,
  NotebookPen, Sparkles, Infinity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import kernelSnapshot from './red-leaf-kernel-snapshot.json';
import type { KernelNavItem } from './red-leaf-kernel';

const ICON_BY_MODULE: Record<string, LucideIcon> = {
  dashboard: Home,
  codex: BookOpen,
  lore: Sparkles,
  aspects: Gem,
  forge: Hammer,
  daily: Calendar,
  goals: Target,
  personas: Users,
  insights: Lightbulb,
  grok: ScrollText,
  journal: NotebookPen,
  visualizations: Image,
  spiral: Infinity,
  kernel: Layers,
  math: Sigma,
  techniques: Brain,
  fusions: FlaskConical,
  automations: Zap,
  identity: Layers,
  search: Search,
};

export const KERNEL_NAV: KernelNavItem[] = kernelSnapshot.nav as KernelNavItem[];

export function kernelNavWithIcons() {
  return KERNEL_NAV.map((item) => ({
    ...item,
    icon: ICON_BY_MODULE[item.id] ?? Layers,
  }));
}