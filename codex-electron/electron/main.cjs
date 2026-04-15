const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Master Build Codex',
    backgroundColor: '#0b0a08',
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  // Open external links in the OS browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ── Anthropic API proxy ────────────────────────────────────────────────────
// Routes API calls through the main process to avoid CORS restrictions.
// The API key never leaves the user's machine.
ipcMain.handle('anthropic-request', async (_event, { body, apiKey, useSearch }) => {
  if (!apiKey || !apiKey.trim()) {
    return { error: { message: 'No API key provided. Open Settings to add your Anthropic API key.' } };
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey.trim(),
    'anthropic-version': '2023-06-01',
  };


  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: { message: `API returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 200)}` } };
    }
  } catch (err) {
    return { error: { message: err.message || 'Network error reaching Anthropic API' } };
  }
});

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
