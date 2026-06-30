/**
 * Stop leftover AFS dev processes before a fresh `npm run dev`.
 * Kills previous dev launcher, ngrok, and listeners on API/Vite/slash ports.
 */
const { execSync } = require('child_process');
const { markDevRestart } = require('./dev-lock');

const isWin = process.platform === 'win32';

function devPorts() {
  const ports = new Set([
    Number(process.env.PORT) || 3847,
    5173,
    Number(process.env.DISCORD_SLASH_PORT) || 3001,
    3000, // slash app default when PORT is not forwarded to child
  ]);
  return [...ports].filter((p) => Number.isFinite(p) && p > 0);
}

// Orphan processes without a stable port (API/Vite are handled via port kill).
const DEV_SCRIPT_PATTERNS = [/scripts[\\/]discord-bot\.js/i];

function pidsForDevScripts() {
  const self = process.pid;
  const pids = new Set();

  try {
    if (isWin) {
      const out = execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /FORMAT:LIST', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      let commandLine = '';
      for (const line of out.split(/\r?\n/)) {
        if (line.startsWith('CommandLine=')) {
          commandLine = line.slice('CommandLine='.length);
        } else if (line.startsWith('ProcessId=')) {
          const pid = parseInt(line.slice('ProcessId='.length), 10);
          if (
            pid > 0 &&
            pid !== self &&
            DEV_SCRIPT_PATTERNS.some((re) => re.test(commandLine))
          ) {
            pids.add(pid);
          }
          commandLine = '';
        }
      }
      return [...pids];
    }

    for (const pattern of ['scripts/discord-bot.js']) {
      try {
        const out = execSync(`pgrep -f "${pattern}"`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        for (const pid of out.split(/\s+/).map((s) => parseInt(s, 10))) {
          if (pid > 0 && pid !== self) pids.add(pid);
        }
      } catch {
        /* no matches */
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

function pidsForNgrok() {
  try {
    if (isWin) {
      const out = execSync('tasklist /FI "IMAGENAME eq ngrok.exe" /FO CSV /NH', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const pids = [];
      for (const line of out.split(/\r?\n/)) {
        const match = line.match(/"ngrok\.exe","(\d+)"/i);
        if (match) pids.push(parseInt(match[1], 10));
      }
      return pids.filter((pid) => pid > 0 && pid !== process.pid);
    }
    const out = execSync('pgrep -x ngrok', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return out
      .split(/\s+/)
      .map((s) => parseInt(s, 10))
      .filter((pid) => pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }
}

function pidsOnPortWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}" | findstr LISTENING`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      if (pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function pidsOnPortUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return out
      .split(/\s+/)
      .map((s) => parseInt(s, 10))
      .filter((pid) => pid > 0);
  } catch {
    return [];
  }
}

function pidsOnPort(port) {
  return isWin ? pidsOnPortWin(port) : pidsOnPortUnix(port);
}

function killPid(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    if (isWin) {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid, label, killed, seen, quiet) {
  if (!pid || seen.has(pid)) return;
  seen.add(pid);
  if (killPid(pid)) {
    killed.push({ pid, label });
    if (!quiet) console.log(`[dev] stopped PID ${pid} (${label})`);
  }
}

function killDevProcesses({ quiet = false } = {}) {
  const killed = [];
  const seen = new Set();

  if (markDevRestart() && !quiet) {
    console.log('[dev] marking active dev session for restart…');
  }

  // 1) Port listeners — old dev.js sees child exit + dev-lock handoff (clean code 0).
  for (const port of devPorts()) {
    for (const pid of pidsOnPort(port)) {
      stopPid(pid, `port ${port}`, killed, seen, quiet);
    }
  }
  // 2) ngrok tunnels
  for (const pid of pidsForNgrok()) {
    stopPid(pid, 'ngrok', killed, seen, quiet);
  }
  // 3) Journal bot (no listen port)
  for (const pid of pidsForDevScripts()) {
    stopPid(pid, 'previous dev process', killed, seen, quiet);
  }

  if (killed.length) {
    try {
      execSync(isWin ? 'powershell -Command "Start-Sleep -Milliseconds 400"' : 'sleep 0.4');
    } catch {
      /* ignore */
    }
  }

  return killed;
}

if (require.main === module) {
  const killed = killDevProcesses();
  if (!killed.length) console.log('[dev] no previous dev listeners found');
}

module.exports = { killDevProcesses, devPorts, pidsOnPort };