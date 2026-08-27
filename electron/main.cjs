const { app, BrowserWindow, shell } = require("electron");
const { randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const http = require("node:http");

let serverProcess;
let serverPort;

function getAvailablePort(start = 3173) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(start, "127.0.0.1", () => {
      const address = probe.address();
      const port =
        typeof address === "object" && address ? address.port : start;
      probe.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(`http://127.0.0.1:${port}/`, response => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      request.on("error", retry);
      request.setTimeout(1_000, () => request.destroy());
    };
    const retry = () => {
      if (Date.now() >= deadline) {
        reject(
          new Error(
            `Local Osamah IDE server did not become ready on port ${port}.`
          )
        );
        return;
      }
      setTimeout(poll, 250);
    };
    poll();
  });
}

function getPersistentDesktopSecret() {
  const secretPath = path.join(app.getPath("userData"), "session-secret");
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, "utf8").trim();
      if (existing) return existing;
    }
    const generated = randomBytes(32).toString("hex");
    fs.writeFileSync(secretPath, generated, { encoding: "utf8", mode: 0o600 });
    return generated;
  } catch {
    return randomBytes(32).toString("hex");
  }
}

function getPackagedRuntimeRoot(name) {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "third_party", name);
  }
  return path.join(process.resourcesPath, "third_party", name);
}

async function startLocalServer() {
  const port = await getAvailablePort();
  const appPath = app.getAppPath();
  const serverPath = path.join(appPath, "dist", "index.js");
  const environment = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    JWT_SECRET: process.env.JWT_SECRET || getPersistentDesktopSecret(),
    OPENCODE_EMBEDDED_ROOT:
      process.env.OPENCODE_EMBEDDED_ROOT || getPackagedRuntimeRoot("opencode"),
    PRESENTON_EMBEDDED_ROOT:
      process.env.PRESENTON_EMBEDDED_ROOT ||
      getPackagedRuntimeRoot("presenton"),
    OPENCODE_EMBEDDED_AUTOSTART: process.env.OPENCODE_EMBEDDED_AUTOSTART || "0",
  };

  serverPort = port;
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: app.getPath("userData"),
    env: { ...environment, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.on("data", chunk =>
    process.stdout.write(`[server] ${chunk}`)
  );
  serverProcess.stderr.on("data", chunk =>
    process.stderr.write(`[server] ${chunk}`)
  );
  serverProcess.once("exit", (code, signal) => {
    if (code !== 0 && !app.isQuitting) {
      console.error(
        `[server] exited unexpectedly (${code ?? "unknown"}${signal ? `, ${signal}` : ""})`
      );
    }
  });

  await waitForServer(port);
  return port;
}

async function createWindow(port) {
  const window = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#07111f",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  await window.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(async () => {
  try {
    const port = await startLocalServer();
    await createWindow(port);
  } catch (error) {
    console.error("Unable to start Osamah IDE desktop server:", error);
    app.quit();
  }

  app.on("activate", () => {
    if (
      BrowserWindow.getAllWindows().length === 0 &&
      serverProcess &&
      !serverProcess.killed
    ) {
      if (serverPort) void createWindow(serverPort);
    }
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill("SIGTERM");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
