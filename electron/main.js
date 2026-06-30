const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DEFAULT_PORT = Number(process.env.PORT) || 3847;
let mainWindow;
let activePort = DEFAULT_PORT;
let ownedServer = null;

function bundledDataDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'data');
  return path.join(__dirname, '..', 'data');
}

function ensureUserData() {
  const userData = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });

  const bundled = bundledDataDir();
  if (!fs.existsSync(bundled)) {
    process.env.AFS_DATA_DIR = userData;
    return;
  }

  for (const entry of fs.readdirSync(bundled)) {
    const src = path.join(bundled, entry);
    const dst = path.join(userData, entry);
    if (fs.existsSync(dst)) continue;
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  process.env.AFS_DATA_DIR = userData;
}

function probeHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: '/api/health',
        timeout: 2000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function loadingHtml() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>AFS Platform</title></head>
  <body style="margin:0;background:#0a0a0f;color:#e8e4dc;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center;max-width:20rem;padding:1rem">
      <div style="font-size:2.5rem;margin-bottom:1rem">⚒️</div>
      <div style="font-size:1.1rem">Starting AFS Platform…</div>
      <div style="opacity:.55;font-size:.85rem;margin-top:.75rem;line-height:1.4">
        First launch can take up to a minute while the database and face index load.
      </div>
    </div>
  </body>
</html>`)}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 640,
    title: 'AFS Platform',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(loadingHtml());
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    if (url.startsWith('data:')) return;
    dialog.showErrorBox(
      'AFS Platform could not load',
      `${description} (${code})\n\nThe API may still be starting — wait a moment and relaunch.\nURL: ${url}`,
    );
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadApp(port) {
  if (!mainWindow) createWindow();
  activePort = port;
  mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

async function findOrStartServer() {
  ensureUserData();

  if (await probeHealth(DEFAULT_PORT)) {
    activePort = DEFAULT_PORT;
    return;
  }

  const serverEntry = path.join(__dirname, '..', 'server', 'index.js');
  const { start } = require(serverEntry);

  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 10; port += 1) {
    process.env.PORT = String(port);
    try {
      ownedServer = await start();
      activePort = port;
      return;
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') continue;
      throw err;
    }
  }

  throw new Error(
    `Ports ${DEFAULT_PORT}–${DEFAULT_PORT + 9} are already in use.\n` +
      'Close other AFS or dev-server instances (npm run dev) and try again.',
  );
}

function showFatal(err) {
  const msg = err?.message || String(err);
  console.error('Failed to launch AFS Platform:', err);
  dialog.showErrorBox(
    'AFS Platform could not start',
    `${msg}\n\nIf npm run dev is already running, open http://localhost:3847 in your browser instead.`,
  );
  app.exit(1);
}

app.whenReady().then(async () => {
  createWindow();
  try {
    await findOrStartServer();
    loadApp(activePort);
  } catch (err) {
    showFatal(err);
  }
});

app.on('window-all-closed', () => {
  if (ownedServer && typeof ownedServer.close === 'function') {
    ownedServer.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
    loadApp(activePort);
  }
});