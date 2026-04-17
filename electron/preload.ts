// Minimal secure preload — contextIsolation is on, nodeIntegration is off.
// The web app communicates with the server via fetch() over localhost,
// so no IPC bridges are needed here.
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("__ELECTRON__", {
  platform: process.platform,
});
