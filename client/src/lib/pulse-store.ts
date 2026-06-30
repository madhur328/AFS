/** Client-side pulse persistence for static/offline mode (Iteration 3). */

import { RED_LEAF_SEED } from './red-leaf-kernel';
import type { PulseTrace } from './red-leaf-kernel';

export interface PulseEvent {
  id: string;
  seed: string;
  at: string;
  origin: string;
  originSymbol: string;
  payload?: unknown;
  meta?: { action?: string; [key: string]: unknown };
  reach: number;
  hops: number;
  trace: PulseTrace[];
  paradox: string;
}

const STORAGE_KEY = 'afs-red-leaf-pulses';
const MAX_LOCAL = 80;

function readStore(): PulseEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PulseEvent[]) : [];
  } catch {
    return [];
  }
}

function writeStore(pulses: PulseEvent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pulses.slice(0, MAX_LOCAL)));
}

export function getLocalPulses(since?: string, limit = 50): PulseEvent[] {
  let list = readStore();
  if (since) list = list.filter((p) => p.at > since);
  return list.slice(0, limit);
}

export function appendLocalPulse(event: PulseEvent) {
  const list = readStore();
  list.unshift(event);
  writeStore(list);
}

export function mergePulses(seed: PulseEvent[], local: PulseEvent[]): PulseEvent[] {
  const seen = new Set<string>();
  const merged: PulseEvent[] = [];
  for (const p of [...local, ...seed]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, MAX_LOCAL);
}

let seq = 0;
export function createLocalPulse(
  origin: string,
  originSymbol: string,
  payload: unknown,
  meta: Record<string, unknown>,
  trace: PulseTrace[],
  reach: number,
  hops: number,
): PulseEvent {
  seq += 1;
  return {
    id: `local-${Date.now()}-${seq}`,
    seed: RED_LEAF_SEED,
    at: new Date().toISOString(),
    origin,
    originSymbol,
    payload,
    meta,
    reach,
    hops,
    trace: trace ?? [],
    paradox: '🍁(pulse) = Reframe(network)',
  };
}