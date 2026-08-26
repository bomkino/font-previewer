import { randomUUID } from "node:crypto";
import { realpath, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions,
} from "electron";
import { isHostRequest, type HostRequest, type HostResponse, type MenuCommand } from "../src/protocol.js";
import { runEvidenceFlow } from "./evidence.js";

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const prototypeRoot = join(currentDirectory, "..", "..");
const rendererPath = join(prototypeRoot, "dist", "renderer", "index.html");
const preloadPath = join(currentDirectory, "preload.cjs");
const allowedExtensions = new Set([".otf", ".ttf", ".ttc", ".otc", ".dfont", ".woff", ".woff2"]);
const sourceBindings = new Map<string, string>();
const sourceIdsByCanonicalPath = new Map<string, string>();
const maximumSourceBytes = 512 * 1024 * 1024;

let mainWindow: BrowserWindow | undefined;
const evidenceDirectory = process.env.P1_EVIDENCE_DIR;

if (evidenceDirectory) {
  app.disableHardwareAcceleration();
  console.error("[p1 evidence] waiting for Electron ready");
}

function trustedSender(event: IpcMainInvokeEvent): boolean {
  try {
    if (!event.senderFrame) return false;
    const sender = new URL(event.senderFrame.url);
    if (sender.protocol === "file:") return sender.pathname.endsWith("/dist/renderer/index.html");
    const developmentURL = process.env.P1_DEV_SERVER_URL;
    return Boolean(developmentURL && sender.origin === new URL(developmentURL).origin);
  } catch {
    return false;
  }
}

function sendMenuCommand(command: MenuCommand): void {
  mainWindow?.webContents.send("host:menu-command", command);
}

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [];
  if (process.platform === "darwin") template.push({ role: "appMenu" });
  template.push(
    {
      label: "File",
      submenu: [
        {
          id: "p1-import",
          label: "Import Fonts…",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => sendMenuCommand({ type: "open-import" }),
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          id: "p1-mark-keep",
          label: "Mark Candidate Keep",
          accelerator: "CmdOrCtrl+Shift+K",
          click: () => sendMenuCommand({ type: "mark-keep" }),
        },
        {
          label: "Next Unreviewed Candidate",
          accelerator: "CmdOrCtrl+Shift+U",
          click: () => sendMenuCommand({ type: "next-unreviewed" }),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        ...(["review", "compare", "system", "handoff"] as const).map((stage, index) => ({
          label: `${index + 1} — ${stage[0].toUpperCase()}${stage.slice(1)}`,
          accelerator: `CmdOrCtrl+${index + 1}`,
          click: () => sendMenuCommand({ type: "set-stage", stage }),
        })),
        { type: "separator" as const },
        {
          label: "Reload Studio Safely",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => sendMenuCommand({ type: "reload-studio" }),
        },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  );
  return Menu.buildFromTemplate(template);
}

async function handleHostRequest(
  event: IpcMainInvokeEvent,
  rawRequest: unknown,
): Promise<HostResponse> {
  if (!trustedSender(event)) throw new Error("Rejected HostBridge request from an untrusted sender");
  if (!isHostRequest(rawRequest)) throw new Error("Rejected invalid HostBridge request");
  const request: HostRequest = rawRequest;

  switch (request.type) {
    case "open-import": {
      if (!mainWindow) return { type: "import-result", sources: [] };
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Import font Sources",
        buttonLabel: "Import",
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Fonts",
            extensions: ["otf", "ttf", "ttc", "otc", "dfont", "woff", "woff2"],
          },
        ],
      });
      if (result.canceled) return { type: "import-result", sources: [] };
      const sources = [];
      for (const selectedPath of result.filePaths.slice(0, 64)) {
        try {
          const canonicalPath = await realpath(selectedPath);
          if (!allowedExtensions.has(extname(canonicalPath).toLocaleLowerCase())) continue;
          const sourceStat = await stat(canonicalPath);
          if (!sourceStat.isFile() || sourceStat.size > maximumSourceBytes) continue;
          const id = sourceIdsByCanonicalPath.get(canonicalPath) ?? `source:${randomUUID()}`;
          sourceIdsByCanonicalPath.set(canonicalPath, id);
          sourceBindings.set(id, canonicalPath);
          sources.push({
            id,
            displayName: basename(canonicalPath, extname(canonicalPath)).slice(0, 256),
            state: "available" as const,
          });
        } catch {
          // A selected Source can disappear or become unreadable before the dialog returns.
        }
      }
      return { type: "import-result", sources };
    }
    case "native-undo":
      mainWindow?.webContents.undo();
      return { type: "ack", action: "native-undo" };
    case "reload-studio":
      setTimeout(() => mainWindow?.webContents.reload(), 25);
      return { type: "ack", action: "reload-studio" };
    case "probe":
      return { type: "probe-result", serial: request.serial, host: "electron" };
  }
}

async function createWindow(): Promise<BrowserWindow> {
  const evidenceMode = Boolean(process.env.P1_EVIDENCE_DIR);
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#f5f2eb",
    title: "Font Previewer — P1",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: !evidenceMode,
      offscreen: evidenceMode,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault();
  });
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  if (!evidenceMode) mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  const developmentURL = process.env.P1_DEV_SERVER_URL;
  if (developmentURL) await mainWindow.loadURL(developmentURL);
  else await mainWindow.loadFile(rendererPath);
  return mainWindow;
}

ipcMain.handle("host:request", handleHostRequest);

// Electron's ESM loader can deadlock when app.whenReady() is awaited at module top level.
// Keep lifecycle startup on the promise continuation so the first event-loop tick can finish.
void app.whenReady().then(async () => {
  if (evidenceDirectory) console.error("[p1 evidence] Electron ready");
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(buildMenu());
  const firstWindow = await createWindow();
  if (evidenceDirectory) {
    await runEvidenceFlow({
      window: firstWindow,
      outputDirectory: evidenceDirectory,
      sendMenuCommand,
    });
    app.exit(0);
  }
}).catch((error: unknown) => {
  console.error(error);
  app.exit(1);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
