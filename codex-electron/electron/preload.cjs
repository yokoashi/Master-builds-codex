const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, narrow API to the renderer process.
// The renderer never has direct access to Node.js or Electron APIs.
contextBridge.exposeInMainWorld('electronAPI', {
  // Proxy any AI provider call through the main process (avoids CORS)
  callAI: (provider, body, apiKey) =>
    ipcRenderer.invoke('ai-request', { provider, body, apiKey }),
});
