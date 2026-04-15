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

// ── Multi-provider AI proxy ────────────────────────────────────────────────
// Routes API calls through the main process to avoid CORS restrictions.
// API keys never leave the user's machine.
ipcMain.handle('ai-request', async (_event, { provider, body, apiKey }) => {
  if (!apiKey || !apiKey.trim()) {
    return { error: { message: `No API key for ${provider}. Open Settings to add your key.` } };
  }

  let url, headers;

  if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    };
  } else if (provider === 'perplexity') {
    url = 'https://api.perplexity.ai/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    };
  } else {
    return { error: { message: `Unknown provider: ${provider}` } };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: { message: `API returned non-JSON (HTTP ${response.status}): ${text.slice(0, 200)}` } };
    }
  } catch (err) {
    return { error: { message: err.message || 'Network error reaching API' } };
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
