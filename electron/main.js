const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3847;
let mainWindow;

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
  process.env.PORT = String(PORT);
}

async function bootServer() {
  ensureUserData();
  const { start } = require(path.join(__dirname, '..', 'server', 'index.js'));
  await start();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 640,
    title: 'AFS Platform',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await bootServer();
    createWindow();
  } catch (err) {
    console.error('Failed to launch AFS Platform:', err);
    app.exit(1);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});