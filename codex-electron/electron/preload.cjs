const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, narrow API to the renderer process.
// The renderer never has direct access to Node.js or Electron APIs.
contextBridge.exposeInMainWorld('electronAPI', {
  // Proxy an Anthropic API call through the main process (avoids CORS)
  callAnthropic: (body, apiKey, useSearch) =>
    ipcRenderer.invoke('anthropic-request', { body, apiKey, useSearch }),
});
