/**
 * Single dev-session lock — lets a superseded launcher exit cleanly (code 0).
 */
const fs = require('fs');
const path = require('path');

const LOCK_PATH = path.join(__dirname, '..', 'data', '.dev-lock.json');

function isProcessAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeLock() {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.writeFileSync(
    LOCK_PATH,
    JSON.stringify({ pid: process.pid, startedAt: Date.now() }, null, 0),
  );
}

function releaseLock() {
  const lock = readLock();
  if (lock?.pid === process.pid) {
    try {
      fs.unlinkSync(LOCK_PATH);
    } catch {
      /* ignore */
    }
  }
}

/** Claim this dev session before killing stale processes. */
function acquireDevLock() {
  const existing = readLock();
  let previous = null;
  if (existing?.pid && existing.pid !== process.pid && isProcessAlive(existing.pid)) {
    previous = existing.pid;
    // Mark handoff on the old lock before we overwrite — avoids a brief crash exit.
    fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
    fs.writeFileSync(LOCK_PATH, JSON.stringify({ ...existing, restarting: true }));
  }
  writeLock();
  return { previous };
}

/** True when a newer `npm run dev` has taken over. */
function isSuperseded() {
  const lock = readLock();
  return Boolean(lock && lock.pid !== process.pid && isProcessAlive(lock.pid));
}

/** Signal an intentional restart (`dev:kill` or a fresh `npm run dev`). */
function markDevRestart() {
  const lock = readLock();
  if (!lock?.pid || lock.pid === process.pid || !isProcessAlive(lock.pid)) return false;
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify({ ...lock, restarting: true }));
  return true;
}

/** True when this session is being replaced or torn down on purpose. */
function isDevHandoff() {
  if (isSuperseded()) return true;
  const lock = readLock();
  return Boolean(lock?.restarting && lock.pid === process.pid);
}

module.exports = {
  LOCK_PATH,
  acquireDevLock,
  releaseLock,
  isSuperseded,
  isDevHandoff,
  markDevRestart,
  readLock,
  isProcessAlive,
};