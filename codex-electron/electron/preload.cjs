const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, narrow API to the renderer process.
// The renderer never has direct access to Node.js or Electron APIs.
contextBridge.exposeInMainWorld('electronAPI', {
  // Proxy any AI provider call through the main process (avoids CORS)
  callAI: (provider, body, apiKey) =>
    ipcRenderer.invoke('ai-request', { provider, body, apiKey }),
  // Fetch a URL through the main process (bypasses renderer CSP + CORS)
  fetchUrl: (url) =>
    ipcRenderer.invoke('fetch-url', { url }),
});
