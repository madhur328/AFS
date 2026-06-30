/**
 * Unified dev launcher — API + client + journal bot (+ optional slash/ngrok).
 * Usage: npm run dev
 */
require('./load-env');

const { killDevProcesses, pidsOnPort } = require('./kill-dev-processes');
const { acquireDevLock, releaseLock, isDevHandoff } = require('./dev-lock');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const clientRoot = path.join(root, 'client');
const slashRoot = path.join(root, 'projects', 'discord-bot-setup');
const isWin = process.platform === 'win32';

const children = [];
let shuttingDown = false;

function resolveNgrok() {
  if (process.env.NGROK_PATH && fs.existsSync(process.env.NGROK_PATH)) {
    return process.env.NGROK_PATH;
  }
  const candidates = [
    path.join(process.env.USERPROFILE || '', 'Downloads', 'Compressed', 'ngrok.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'ngrok', 'ngrok.exe'),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const CHILD_PORTS = {
  api: () => Number(process.env.PORT) || 3847,
  client: () => 5173,
};

function wasPortReplaced(label, childPid) {
  const portFor = CHILD_PORTS[label];
  if (!portFor || !childPid) return false;
  const listeners = pidsOnPort(portFor());
  return listeners.length > 0 && !listeners.includes(childPid);
}

function shouldHandoff(label, childPid) {
  return isDevHandoff() || wasPortReplaced(label, childPid);
}

function run(label, cmd, args, cwd, { optional = false, env: extraEnv = {} } = {}) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: isWin,
    env: { ...process.env, ...extraEnv },
  });

  child.on('exit', (code) => {
    if (shuttingDown) return;
    if (code && !optional) {
      const childPid = child.pid;
      const handoff = () => {
        if (shuttingDown) return true;
        if (!shouldHandoff(label, childPid)) return false;
        console.log(`[dev] handing off to fresh dev session — shutting down`);
        shutdown(0);
        return true;
      };
      if (handoff()) return;
      // Lock/port may settle after Windows taskkill (exit code 1).
      for (const delay of [150, 500, 1000]) {
        setTimeout(() => {
          if (handoff()) return;
          if (delay === 1000) {
            console.error(`[${label}] exited with code ${code}`);
            shutdown(code || 1);
          }
        }, delay);
      }
    } else if (code && optional) {
      console.warn(`[${label}] stopped (code ${code}) — dev continues`);
    }
  });

  children.push({ label, child, optional });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    try {
      child.kill();
    } catch (_) {
      /* ignore */
    }
  }
  releaseLock();
  process.exit(code);
}

const { previous } = acquireDevLock();
if (previous) {
  console.log(`[dev] superseding previous dev session (PID ${previous})`);
}

console.log('[dev] stopping previous dev launcher, ngrok, and port listeners…');
const stopped = killDevProcesses();
if (!stopped.length) {
  console.log('[dev] no stale dev processes found');
}

// --- Core AFS app ---
run('api', 'node', ['server/index.js'], root);
run('client', 'node', ['node_modules/vite/bin/vite.js', '--port', '5173'], clientRoot);

// --- Journal sync (required for #journal → AFS) ---
// Uses discord.js gateway — does NOT need ngrok.
if (process.env.DISCORD_BOT_TOKEN) {
  run('journal', 'node', ['scripts/discord-bot.js'], root, { optional: true });
  console.log('[journal] Discord journal archiver starting (backfill + live sync)');
} else {
  console.warn('[journal] skipped — add DISCORD_BOT_TOKEN to .env for #journal sync');
}

// --- Slash commands (/test) — optional, needs ngrok tunnel ---
const enableSlash = process.env.DISCORD_ENABLE_SLASH !== '0';
const slashPort = process.env.DISCORD_SLASH_PORT || '3001';
const ngrokBin = resolveNgrok();

if (enableSlash && fs.existsSync(path.join(slashRoot, 'app.js'))) {
  run('slash', 'node', ['app.js'], slashRoot, { optional: true, env: { PORT: slashPort } });

  if (ngrokBin) {
    run('ngrok', ngrokBin, ['http', slashPort, '--log=stdout', '--log-level=info'], root, {
      optional: true,
    });
    console.log(`[slash] Interactions app :${slashPort} + ngrok (for /test hello world)`);
  } else {
    console.warn('[ngrok] not found — slash /test needs a tunnel. Set NGROK_PATH in .env');
  }
} else if (!enableSlash) {
  console.log('[slash] disabled (DISCORD_ENABLE_SLASH=0)');
}

console.log('');
console.log('⚒️  AFS dev');
console.log('   App     → http://localhost:5173  (API :3847)');
console.log('   Journal → needs [journal] bot above (not ngrok)');
if (enableSlash && ngrokBin) {
  console.log('   /test   → needs [slash] + [ngrok] (separate from journal sync)');
}
console.log('');

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', releaseLock);