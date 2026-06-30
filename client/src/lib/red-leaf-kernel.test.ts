import { describe, it, expect } from 'vitest';
import kernelSnapshot from './red-leaf-kernel-snapshot.json';
import { RED_LEAF_SEED } from './red-leaf-kernel';
import { KERNEL_NAV } from './kernel-nav';

describe('Red Leaf Kernel snapshot', () => {
  it('unfolds from single 🍁 seed', () => {
    expect(kernelSnapshot.meta.seed).toBe(RED_LEAF_SEED);
    expect(kernelSnapshot.kernel.seed).toBe(RED_LEAF_SEED);
  });

  it('generates all app modules from seed', () => {
    expect(kernelSnapshot.kernel.topology.nodeCount).toBeGreaterThanOrEqual(18);
    expect(kernelSnapshot.kernel.invariant.allSymbolsContainSeed).toBe(true);
  });

  it('nav matches unfolded modules', () => {
    expect(KERNEL_NAV.length).toBe(kernelSnapshot.kernel.topology.nodeCount);
    expect(KERNEL_NAV.every((n) => n.symbol.includes(RED_LEAF_SEED) || n.id === 'kernel')).toBe(true);
  });

  it('has data-flow edges for networking', () => {
    expect(kernelSnapshot.flow.edgeCount).toBeGreaterThan(20);
    expect(kernelSnapshot.flow.edges.every((e) => e.from && e.to)).toBe(true);
  });

  it('includes three operator branches', () => {
    const branchIds = kernelSnapshot.kernel.topology.branches.map((b) => b.id);
    expect(branchIds).toContain('reframe');
    expect(branchIds).toContain('transform');
    expect(branchIds).toContain('optimize');
  });

  it('includes route manifest for codegen', () => {
    const routes = (kernelSnapshot as { routes?: { id: string; path: string; page: string; layout?: string }[] }).routes;
    expect(routes?.length).toBe(kernelSnapshot.kernel.topology.nodeCount);
    expect(routes?.find((r) => r.id === 'spiral')?.layout).toBe('fullscreen');
  });
});