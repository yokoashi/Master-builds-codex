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
  CLAUDE_API_KEY?: string;
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
    const placeholder: AppConfig = { PERPLEXITY_API_KEY: "", CLAUDE_API_KEY: "" };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(placeholder, null, 2) + "\n", "utf-8");
  } catch { /* ignore write errors */ }
  return {};
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// ── Start Express server ─────────────────────────────────────────────────────
function startServer(apiKey: string, claudeKey = ""): Promise<void> {
  return new Promise((resolve, reject) => {
    // DB lives next to the exe so user data persists across updates.
    // We must pass this explicitly — process.cwd() inside the spawned
    // Node process is unpredictable in a packaged Electron app.
    const dbPath = isPackaged
      ? path.join(path.dirname(app.getPath("exe")), "codex.db")
      : path.join(process.cwd(), "dev.db");

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(SERVER_PORT),
      PERPLEXITY_API_KEY: apiKey,
      CLAUDE_API_KEY: claudeKey,
      DB_PATH: dbPath,
      CONFIG_PATH: CONFIG_PATH,
    };

    serverProcess = spawn("node", [SERVER_ENTRY], { env, stdio: "pipe" });

    // Accumulate stderr so we can show the real crash reason in the dialog
    let stderrBuf = "";
    serverProcess.stdout?.on("data", (d: Buffer) =>
      console.log("[server]", d.toString().trim())
    );
    serverProcess.stderr?.on("data", (d: Buffer) => {
      const line = d.toString();
      stderrBuf += line;
      console.error("[server]", line.trim());
    });

    // If the server process dies before we connect, reject immediately
    // with the actual crash output — don't wait the full 15 seconds.
    serverProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        clearInterval(poll);
        const detail = stderrBuf.trim().slice(-1500) || `Exit code ${code}`;
        reject(new Error(`Server exited with code ${code}:\n\n${detail}`));
      }
    });

    serverProcess.on("error", (err) => {
      clearInterval(poll);
      reject(err);
    });

    // Poll until server responds (up to 30 s)
    const start = Date.now();
    const poll = setInterval(() => {
      http
        .get(SERVER_URL, (res) => {
          clearInterval(poll);
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > 30_000) {
            clearInterval(poll);
            const detail = stderrBuf.trim().slice(-1500);
            reject(new Error(
              `Server did not respond within 30 seconds.${
                detail ? `\n\nServer output:\n${detail}` : ""
              }`
            ));
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
      preload: path.join(__dirname, "preload.cjs"),
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

  const claudeKey = config.CLAUDE_API_KEY ?? process.env.CLAUDE_API_KEY ?? "";
  // Keys may be empty on first launch — the in-app setup screen handles it.

  try {
    await startServer(apiKey, config.CLAUDE_API_KEY ?? process.env.CLAUDE_API_KEY ?? "");
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
