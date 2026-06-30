/**
 * Red Leaf Pulse Bus — Iteration 3
 * Live propagation of 🍁 signals through the kernel flow graph.
 */
const { routePulse, SEED, unfoldModule } = require('./red-leaf-kernel');
const { propagateSpiral } = require('./kernel-spiral');

const MAX_PULSES = 250;
const pulses = [];
const subscribers = new Set();

let seq = 0;

function nextId() {
  seq += 1;
  return `pulse-${Date.now()}-${seq}`;
}

function emitPulse(originId, payload = {}, meta = {}) {
  const origin = unfoldModule(originId);
  const routed = routePulse(originId, payload);
  const spiral = routed.ok ? propagateSpiral({ origin: originId, meta, trace: routed.trace }, routed) : null;
  const event = {
    id: nextId(),
    seed: SEED,
    at: new Date().toISOString(),
    origin: originId,
    originSymbol: origin?.symbol ?? SEED,
    payload,
    meta,
    reach: routed.ok ? routed.reach : 0,
    hops: routed.ok ? routed.hops : 0,
    trace: routed.ok ? routed.trace : [],
    spiral,
    paradox: routed.paradox ?? '🍁(pulse) = Reframe(network)',
  };
  pulses.unshift(event);
  if (pulses.length > MAX_PULSES) pulses.length = MAX_PULSES;

  for (const fn of subscribers) {
    try {
      fn(event);
    } catch (_) {
      /* ignore subscriber errors */
    }
  }
  return event;
}

function getPulses({ since, limit = 50, origin } = {}) {
  let list = [...pulses];
  if (since) list = list.filter((p) => p.at > since);
  if (origin) list = list.filter((p) => p.origin === origin);
  return list.slice(0, Math.min(limit, 100));
}

function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function pulseStats() {
  const byOrigin = {};
  for (const p of pulses) {
    byOrigin[p.origin] = (byOrigin[p.origin] || 0) + 1;
  }
  return {
    seed: SEED,
    total: pulses.length,
    capacity: MAX_PULSES,
    subscribers: subscribers.size,
    byOrigin,
    latest: pulses[0]?.at ?? null,
  };
}

function seedBootPulse() {
  if (pulses.length) return pulses[0];
  return emitPulse('kernel', { boot: true }, { action: 'kernel.boot', note: 'Red Leaf pulse bus online' });
}

module.exports = {
  emitPulse,
  getPulses,
  subscribe,
  pulseStats,
  seedBootPulse,
  MAX_PULSES,
};