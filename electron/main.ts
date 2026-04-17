import { app, BrowserWindow, shell, dialog, ipcMain } from "electron";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import http from "http";
import fs from "fs";

// ── Config ──────────────────────────────────────────────────────────────────
const SERVER_PORT = 5000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// In a packaged build, resources are at process.resourcesPath.
// We bundle dist/ into resources/app/dist/ via extraResources.
const isPackaged = app.isPackaged;
const SERVER_ENTRY = isPackaged
  ? path.join(process.resourcesPath, "app", "dist", "index.cjs")
  : path.join(__dirname, "..", "dist", "index.cjs");

// Config file lives next to the .exe so the user can edit it.
// In dev mode it lives in the project root.
const CONFIG_PATH = isPackaged
  ? path.join(path.dirname(app.getPath("exe")), "config.json")
  : path.join(process.cwd(), "config.json");

interface AppConfig {
  PERPLEXITY_API_KEY?: string;
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {
    // Ignore parse errors — treat as empty config
  }
  return {};
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// ── Start Express server ─────────────────────────────────────────────────────
function startServer(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(SERVER_PORT),
      PERPLEXITY_API_KEY: apiKey,
    };

    serverProcess = spawn("node", [SERVER_ENTRY], { env, stdio: "pipe" });

    serverProcess.stdout?.on("data", (d: Buffer) =>
      console.log("[server]", d.toString().trim())
    );
    serverProcess.stderr?.on("data", (d: Buffer) =>
      console.error("[server]", d.toString().trim())
    );

    serverProcess.on("error", (err) => {
      dialog.showErrorBox("Server failed to start", err.message);
      reject(err);
    });

    // Poll until server responds (up to 15 s)
    const start = Date.now();
    const poll = setInterval(() => {
      http
        .get(SERVER_URL, (res) => {
          clearInterval(poll);
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > 15_000) {
            clearInterval(poll);
            reject(new Error("Server did not start within 15 seconds."));
          }
        });
    }, 300);
  });
}

// ── Create window ─────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: "Master Build Codex",
    backgroundColor: "#0f0e0c",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(SERVER_URL);

  // Open external links in the OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const config = loadConfig();
  const apiKey = config.PERPLEXITY_API_KEY ?? process.env.PERPLEXITY_API_KEY ?? "";

  if (!apiKey) {
    const result = dialog.showMessageBoxSync({
      type: "warning",
      title: "API Key Missing",
      message:
        "No Perplexity API key found.\n\n" +
        `Please add your key to:\n${CONFIG_PATH}\n\n` +
        'Example:\n{ "PERPLEXITY_API_KEY": "pplx-xxxx..." }\n\n' +
        "The app will open but AI build generation will not work until the key is set.",
      buttons: ["Open Anyway", "Quit"],
    });
    if (result === 1) {
      app.quit();
      return;
    }
  }

  try {
    await startServer(apiKey);
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      "Master Build Codex — Startup Error",
      err instanceof Error ? err.message : String(err)
    );
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
