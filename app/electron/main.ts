import { randomUUID } from "node:crypto";
import { constants as fsConstants, watch, type FSWatcher } from "node:fs";
import { access, lstat, mkdir, readdir, realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol as electronProtocol,
  session,
  shell,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions,
} from "electron";
import {
  STUDY_SCHEMA_VERSION,
  createSession,
  parseStudyDocument,
  serializeStudyDocument,
  type ImportedSource,
  type SourceBindingSummary,
  type StudyDocument,
  type WorkspaceState,
} from "../src/domain.js";
import { createNewStudy } from "../src/fixture.js";
import {
  isHostRequest,
  type HostEvent,
  type HostRequest,
  type HostResponse,
  type MenuCommand,
  type RecoveryEnvelope,
} from "../src/protocol.js";
import { runEvidenceFlow } from "./evidence.js";
import { FONT_EXTENSIONS, buildImportedSource, rendererSupportForPath } from "./font-inspection.js";
import { exportTransactionalHandoff } from "./handoff.js";
import { atomicWrite, readBoundedText, safeFileStem } from "./host-storage.js";

electronProtocol.registerSchemesAsPrivileged([{
  scheme: "pitch-font",
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}]);

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const applicationRoot = join(currentDirectory, "..", "..");
const rendererPath = join(applicationRoot, "dist", "renderer", "index.html");
const preloadPath = join(currentDirectory, "preload.cjs");
const evidenceDirectory = process.env.FONT_PREVIEWER_EVIDENCE_DIR ?? process.env.P1_EVIDENCE_DIR;
const maximumStudyBytes = 8_000_000;
const maximumSourceBytes = 512 * 1024 * 1024;
const maximumImportBytes = 2 * 1024 * 1024 * 1024;
const maximumImportFiles = 2_048;
const maximumCatalogEntries = 10_000;
const maximumCatalogCache = 400;
const maximumImportDepth = 12;
const maximumImportMilliseconds = 15_000;

interface PersistedBinding {
  readonly sourceId: string;
  readonly canonicalPath: string;
}

interface LocalStateDisk {
  readonly version: 1;
  readonly bindings: readonly PersistedBinding[];
  readonly recentDocuments: readonly string[];
}

interface RecoveryDisk {
  readonly version: 1;
  readonly document: StudyDocument;
  readonly workspace: WorkspaceState;
  readonly revision: number;
  readonly intentionallySavedRevision: number;
}

let mainWindow: BrowserWindow | undefined;
let currentDocumentPath: string | undefined;
let localStatePath = "";
let recoveryPath = "";
let recentDocuments: string[] = [];
let mirrored: RecoveryDisk | undefined;
const sourceBindings = new Map<string, string>();
const sourceIdsByCanonicalPath = new Map<string, string>();
const sourceTokens = new Map<string, string>();
const pathsByToken = new Map<string, string>();
const sourceWatchers = new Map<string, FSWatcher>();
const catalogSourceIdsByCanonicalPath = new Map<string, string>();
const catalogPathsBySourceId = new Map<string, string>();
const catalogImportCache = new Map<string, ImportedSource>();
let installedCatalogIndex: Array<{ readonly path: string; readonly searchText: string }> = [];
let installedCatalogTruncated = false;

if (evidenceDirectory) app.disableHardwareAcceleration();

function sendMenuCommand(command: MenuCommand): void {
  mainWindow?.webContents.send("host:menu-command", command);
}

function sendHostEvent(event: HostEvent): void {
  mainWindow?.webContents.send("host:event", event);
}

function trustedSender(event: IpcMainInvokeEvent): boolean {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return false;
  try {
    const sender = new URL(event.senderFrame.url);
    if (sender.protocol === "file:") return fileURLToPath(sender) === rendererPath;
    const developmentURL = process.env.FONT_PREVIEWER_DEV_SERVER_URL;
    if (!developmentURL) return false;
    const allowed = new URL(developmentURL);
    return ["127.0.0.1", "localhost"].includes(allowed.hostname) && sender.origin === allowed.origin;
  } catch {
    return false;
  }
}

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [];
  if (process.platform === "darwin") template.push({ role: "appMenu" });
  template.push(
    {
      label: "File",
      submenu: [
        { label: "New Study", accelerator: "CmdOrCtrl+N", click: () => sendMenuCommand({ type: "new-study" }) },
        { label: "Open Study…", accelerator: "CmdOrCtrl+O", click: () => sendMenuCommand({ type: "open-study" }) },
        { type: "separator" },
        { id: "font-previewer-import", label: "Import Sources…", accelerator: "CmdOrCtrl+Shift+I", click: () => sendMenuCommand({ type: "open-import" }) },
        { label: "Browse Installed Fonts", click: () => sendMenuCommand({ type: "scan-installed" }) },
        { type: "separator" },
        { label: "Save Study", accelerator: "CmdOrCtrl+S", click: () => sendMenuCommand({ type: "save-study" }) },
        { label: "Save Study As…", accelerator: "CmdOrCtrl+Shift+S", click: () => sendMenuCommand({ type: "save-study-as" }) },
        { label: "Export Handoff…", accelerator: "CmdOrCtrl+E", click: () => sendMenuCommand({ type: "export-handoff" }) },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { id: "font-previewer-undo", label: "Undo Study Change", accelerator: "CmdOrCtrl+Z", click: () => sendMenuCommand({ type: "undo-study" }) },
        { label: "Redo Study Change", accelerator: "CmdOrCtrl+Shift+Z", click: () => sendMenuCommand({ type: "redo-study" }) },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        { id: "font-previewer-keep", label: "Mark Candidate Keep", accelerator: "CmdOrCtrl+Shift+K", click: () => sendMenuCommand({ type: "mark-keep" }) },
        { label: "Next Unreviewed Candidate", accelerator: "CmdOrCtrl+Shift+U", click: () => sendMenuCommand({ type: "next-unreviewed" }) },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        ...(["review", "compare", "system", "handoff"] as const).map((stage, index) => ({
          label: `${index + 1} — ${stage[0].toUpperCase()}${stage.slice(1)}`,
          accelerator: `CmdOrCtrl+${index + 1}`,
          click: () => sendMenuCommand({ type: "set-stage", stage }),
        })),
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload Studio Safely", accelerator: "CmdOrCtrl+Shift+R", click: () => sendMenuCommand({ type: "reload-studio" }) },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  );
  return Menu.buildFromTemplate(template);
}

async function loadLocalState(): Promise<void> {
  try {
    const value = JSON.parse(await readBoundedText(localStatePath, 2_000_000)) as Partial<LocalStateDisk>;
    if (value.version !== 1 || !Array.isArray(value.bindings) || !Array.isArray(value.recentDocuments)) return;
    for (const binding of value.bindings) {
      if (!binding || typeof binding.sourceId !== "string" || typeof binding.canonicalPath !== "string" || !isAbsolute(binding.canonicalPath)) continue;
      sourceBindings.set(binding.sourceId, binding.canonicalPath);
      sourceIdsByCanonicalPath.set(binding.canonicalPath, binding.sourceId);
    }
    recentDocuments = value.recentDocuments.filter((path): path is string => typeof path === "string" && isAbsolute(path)).slice(0, 10);
  } catch {
    // First launch or corrupt Host-local state. Portable Study data is unaffected.
  }
}

async function persistLocalState(): Promise<void> {
  const disk: LocalStateDisk = {
    version: 1,
    bindings: [...sourceBindings].map(([sourceId, canonicalPath]) => ({ sourceId, canonicalPath })),
    recentDocuments,
  };
  await atomicWrite(localStatePath, `${JSON.stringify(disk, null, 2)}\n`);
}

function previewUrlForSource(sourceId: string, canonicalPath: string): string {
  const prior = sourceTokens.get(sourceId);
  if (prior && pathsByToken.get(prior) === canonicalPath) return `pitch-font://asset/${prior}`;
  if (prior) pathsByToken.delete(prior);
  const token = randomUUID();
  sourceTokens.set(sourceId, token);
  pathsByToken.set(token, canonicalPath);
  return `pitch-font://asset/${token}`;
}

function watchSource(sourceId: string, canonicalPath: string): void {
  sourceWatchers.get(sourceId)?.close();
  try {
    const watcher = watch(canonicalPath, { persistent: false }, (eventType) => {
      if (eventType === "change") {
        sendHostEvent({ type: "source-state", sourceId, state: "changed" });
        return;
      }
      void stat(canonicalPath)
        .then(() => sendHostEvent({ type: "source-state", sourceId, state: "changed" }))
        .catch(() => sendHostEvent({ type: "source-state", sourceId, state: "missing" }));
    });
    watcher.on("error", () => sendHostEvent({ type: "source-state", sourceId, state: "quarantined" }));
    sourceWatchers.set(sourceId, watcher);
  } catch {
    sendHostEvent({ type: "source-state", sourceId, state: "quarantined" });
  }
}

async function inspectFontPath(selectedPath: string, forcedSourceId?: string, catalogOnly = false): Promise<ImportedSource> {
  const selectedMetadata = await lstat(selectedPath);
  if (selectedMetadata.isSymbolicLink() || !selectedMetadata.isFile()) throw new Error("Source must be a regular, non-symbolic-link file.");
  const canonicalPath = await realpath(selectedPath);
  const extension = extname(canonicalPath).toLocaleLowerCase();
  if (!FONT_EXTENSIONS.has(extension)) throw new Error("Unsupported font format.");
  const metadata = await stat(canonicalPath);
  if (!metadata.isFile() || metadata.size <= 0 || metadata.size > maximumSourceBytes) throw new Error("Source is empty or exceeds 512 MB.");
  await access(canonicalPath, fsConstants.R_OK);
  const sourceId = forcedSourceId ?? sourceIdsByCanonicalPath.get(canonicalPath) ?? catalogSourceIdsByCanonicalPath.get(canonicalPath) ?? `source:${randomUUID()}`;
  if (forcedSourceId) {
    const priorPath = sourceBindings.get(forcedSourceId);
    if (priorPath) sourceIdsByCanonicalPath.delete(priorPath);
  }
  if (catalogOnly && !sourceBindings.has(sourceId)) {
    catalogSourceIdsByCanonicalPath.set(canonicalPath, sourceId);
    catalogPathsBySourceId.set(sourceId, canonicalPath);
  } else {
    sourceBindings.set(sourceId, canonicalPath);
    sourceIdsByCanonicalPath.set(canonicalPath, sourceId);
    catalogSourceIdsByCanonicalPath.delete(canonicalPath);
    catalogPathsBySourceId.delete(sourceId);
    watchSource(sourceId, canonicalPath);
  }
  const support = rendererSupportForPath(canonicalPath);
  return buildImportedSource({
    canonicalPath,
    sourceId,
    byteLength: metadata.size,
    modifiedAt: metadata.mtime.toISOString(),
    ...(support === "full" ? { previewUrl: previewUrlForSource(sourceId, canonicalPath) } : {}),
  });
}

async function collectFontPaths(roots: readonly string[]): Promise<{ readonly paths: string[]; readonly rejected: number; readonly truncated: boolean }> {
  const deadline = Date.now() + maximumImportMilliseconds;
  const paths: string[] = [];
  const seen = new Set<string>();
  let rejected = 0;
  let totalBytes = 0;
  let truncated = false;
  const queue = roots.map((path) => ({ path, depth: 0 }));
  while (queue.length) {
    if (Date.now() > deadline || paths.length >= maximumImportFiles || totalBytes >= maximumImportBytes) {
      truncated = true;
      break;
    }
    const item = queue.shift();
    if (!item) break;
    try {
      const metadata = await lstat(item.path);
      if (metadata.isSymbolicLink()) { rejected += 1; continue; }
      if (metadata.isDirectory()) {
        if (item.depth >= maximumImportDepth) { rejected += 1; continue; }
        const entries = await readdir(item.path, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isSymbolicLink()) { rejected += 1; continue; }
          queue.push({ path: join(item.path, entry.name), depth: item.depth + 1 });
        }
        continue;
      }
      if (!metadata.isFile() || !FONT_EXTENSIONS.has(extname(item.path).toLocaleLowerCase()) || metadata.size <= 0 || metadata.size > maximumSourceBytes) {
        rejected += 1;
        continue;
      }
      const canonicalPath = await realpath(item.path);
      if (seen.has(canonicalPath)) continue;
      if (totalBytes + metadata.size > maximumImportBytes) { truncated = true; break; }
      seen.add(canonicalPath);
      totalBytes += metadata.size;
      paths.push(canonicalPath);
    } catch {
      rejected += 1;
    }
  }
  return { paths, rejected, truncated };
}

async function importPaths(roots: readonly string[], task: "import" | "catalog"): Promise<Extract<HostResponse, { type: "import-result" }>> {
  const collected = await collectFontPaths(roots);
  const imports: ImportedSource[] = [];
  let rejected = collected.rejected;
  for (const [index, path] of collected.paths.entries()) {
    try {
      imports.push(await inspectFontPath(path));
    } catch {
      rejected += 1;
    }
    if (index % 25 === 0 || index + 1 === collected.paths.length) sendHostEvent({ type: "task-progress", task, completed: index + 1, total: collected.paths.length });
  }
  await persistLocalState();
  return { type: "import-result", imports, rejected, truncated: collected.truncated };
}

async function rebuildInstalledCatalog(): Promise<void> {
  installedCatalogIndex = [];
  installedCatalogTruncated = false;
  catalogImportCache.clear();
  if (process.platform !== "linux") return;
  const records = await new Promise<string>((resolve) => {
    const child = BunlessExecFile("/usr/bin/fc-list", ["-f", "%{file}\u001f%{family}\u001f%{style}\\n"], { maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
      resolve(error ? "" : stdout);
    });
    const timer = setTimeout(() => { child.kill(); resolve(""); }, maximumImportMilliseconds);
    child.once("exit", () => clearTimeout(timer));
  });
  const byPath = new Map<string, string>();
  for (const line of records.split("\n")) {
    const [pathValue, family = "", style = ""] = line.split("\u001f");
    const path = pathValue?.trim();
    if (!path || !FONT_EXTENSIONS.has(extname(path).toLocaleLowerCase())) continue;
    const search = `${basename(path, extname(path))} ${family} ${style}`.normalize("NFKD").toLocaleLowerCase();
    byPath.set(path, `${byPath.get(path) ?? ""} ${search}`.trim());
    if (byPath.size > maximumCatalogEntries) {
      installedCatalogTruncated = true;
      break;
    }
  }
  installedCatalogIndex = [...byPath]
    .slice(0, maximumCatalogEntries)
    .map(([path, searchText]) => ({ path, searchText }))
    .sort((left, right) => left.searchText.localeCompare(right.searchText));
}

async function installedCatalogPage(request: Extract<HostRequest, { type: "scan-installed" }>): Promise<Extract<HostResponse, { type: "catalog-result" }>> {
  if (request.refresh || installedCatalogIndex.length === 0) await rebuildInstalledCatalog();
  const query = request.query.trim().normalize("NFKD").toLocaleLowerCase();
  const matches = query ? installedCatalogIndex.filter((entry) => entry.searchText.includes(query)) : installedCatalogIndex;
  const page = matches.slice(request.cursor, request.cursor + request.limit);
  const imports: ImportedSource[] = [];
  let rejected = 0;
  for (const [index, entry] of page.entries()) {
    try {
      let imported = catalogImportCache.get(entry.path);
      if (!imported) {
        imported = await inspectFontPath(entry.path, undefined, true);
        catalogImportCache.set(entry.path, imported);
        if (catalogImportCache.size > maximumCatalogCache) catalogImportCache.delete(catalogImportCache.keys().next().value!);
      }
      imports.push(imported);
    } catch {
      rejected += 1;
    }
    if (index % 25 === 0 || index + 1 === page.length) {
      sendHostEvent({ type: "task-progress", task: "catalog", completed: request.cursor + index + 1, total: matches.length });
    }
  }
  const consumed = request.cursor + page.length;
  return {
    type: "catalog-result",
    imports,
    indexed: installedCatalogIndex.length,
    total: matches.length,
    rejected,
    truncated: installedCatalogTruncated,
    ...(consumed < matches.length ? { nextCursor: consumed } : {}),
  };
}

function promoteCatalogBindings(document: StudyDocument): boolean {
  let changed = false;
  for (const source of document.sources) {
    if (sourceBindings.has(source.id)) continue;
    const path = catalogPathsBySourceId.get(source.id);
    if (!path) continue;
    sourceBindings.set(source.id, path);
    sourceIdsByCanonicalPath.set(path, source.id);
    catalogSourceIdsByCanonicalPath.delete(path);
    catalogPathsBySourceId.delete(source.id);
    watchSource(source.id, path);
    changed = true;
  }
  return changed;
}

// Kept behind a tiny wrapper so no shell is ever involved.
import { execFile as BunlessExecFile } from "node:child_process";

async function bindingForSource(sourceId: string): Promise<SourceBindingSummary> {
  const path = sourceBindings.get(sourceId);
  if (!path) return { sourceId, state: "missing", rendererSupport: "unsupported" };
  try {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error("Not a regular file");
    await access(path, fsConstants.R_OK);
    const support = rendererSupportForPath(path);
    watchSource(sourceId, path);
    return {
      sourceId,
      state: support === "full" ? "readable" : support === "metadata-only" ? "metadata-only" : "unsupported",
      ...(support === "full" ? { previewUrl: previewUrlForSource(sourceId, path) } : {}),
      modifiedAt: metadata.mtime.toISOString(),
      rendererSupport: support,
    };
  } catch {
    return { sourceId, state: "missing", rendererSupport: "unsupported" };
  }
}

async function bindingsForDocument(document: StudyDocument): Promise<SourceBindingSummary[]> {
  return Promise.all(document.sources.map((source) => bindingForSource(source.id)));
}

async function writeRecovery(): Promise<void> {
  if (!mirrored) return;
  await atomicWrite(recoveryPath, `${JSON.stringify(mirrored)}\n`);
}

async function loadRecovery(): Promise<RecoveryEnvelope | undefined> {
  try {
    const raw = JSON.parse(await readBoundedText(recoveryPath, maximumStudyBytes * 2)) as Partial<RecoveryDisk>;
    if (raw.version !== 1 || typeof raw.revision !== "number" || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || typeof raw.intentionallySavedRevision !== "number" || !raw.document || !raw.workspace) return undefined;
    const sessionState = createSession(parseStudyDocument(JSON.stringify(raw.document)), [], raw.workspace, raw.revision);
    mirrored = {
      version: 1,
      document: sessionState.document,
      workspace: sessionState.workspace,
      revision: raw.revision,
      intentionallySavedRevision: Math.min(Math.max(0, raw.intentionallySavedRevision), raw.revision),
    };
    return {
      document: mirrored.document,
      workspace: mirrored.workspace,
      bindings: await bindingsForDocument(mirrored.document),
      revision: mirrored.revision,
      intentionallySavedRevision: mirrored.intentionallySavedRevision,
    };
  } catch {
    return undefined;
  }
}

function updateRecentDocument(path: string): void {
  recentDocuments = [path, ...recentDocuments.filter((item) => item !== path)].slice(0, 10);
}

async function handleHostRequest(event: IpcMainInvokeEvent, rawRequest: unknown): Promise<HostResponse> {
  if (!trustedSender(event)) throw new Error("Rejected HostBridge request from an untrusted sender.");
  if (!isHostRequest(rawRequest)) throw new Error("Rejected invalid HostBridge request.");
  const request: HostRequest = rawRequest;
  switch (request.type) {
    case "get-launch-state": {
      const recovery = await loadRecovery();
      const response: Extract<HostResponse, { type: "launch-state" }> = {
        type: "launch-state",
        capabilities: {
          host: "electron",
          platform: "linux",
          importFiles: true,
          importFolders: true,
          installedCatalog: process.platform === "linux",
          nativeSave: true,
          transactionalHandoff: true,
          sourceRelink: true,
          sourceReveal: true,
          renderProfile: `Chromium ${process.versions.chrome} · Electron ${process.versions.electron}`,
          fullFormats: ["TTF", "OTF", "WOFF", "WOFF2"],
          metadataOnlyFormats: ["TTC", "OTC", "DFONT"],
        },
        ...(recovery ? { recovery } : {}),
        recentDocuments: recentDocuments.map((path) => basename(path)),
      };
      return response;
    }
    case "open-import": {
      if (!mainWindow) return { type: "import-result", imports: [], rejected: 0, truncated: false };
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Import font Sources",
        buttonLabel: "Import",
        properties: ["openFile", "openDirectory", "multiSelections"],
        filters: [{ name: "Fonts", extensions: ["otf", "ttf", "ttc", "otc", "dfont", "woff", "woff2"] }],
      });
      return result.canceled ? { type: "import-result", imports: [], rejected: 0, truncated: false } : importPaths(result.filePaths, "import");
    }
    case "scan-installed":
      return installedCatalogPage(request);
    case "open-study": {
      if (!mainWindow) throw new Error("No active window.");
      const result = await dialog.showOpenDialog(mainWindow, { title: "Open Font Previewer Study", properties: ["openFile"], filters: [{ name: "Font Previewer Study", extensions: ["pitchfontstudy", "json"] }] });
      if (result.canceled || !result.filePaths[0]) {
        return { type: "study-opened", document: mirrored?.document ?? createNewStudy().document, bindings: [], warnings: ["Open cancelled."] };
      }
      const selectedPath = result.filePaths[0];
      const serialized = await readBoundedText(selectedPath, maximumStudyBytes);
      const raw = JSON.parse(serialized) as { schemaVersion?: unknown };
      const document = parseStudyDocument(serialized);
      currentDocumentPath = await realpath(selectedPath);
      updateRecentDocument(currentDocumentPath);
      await persistLocalState();
      const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
      return {
        type: "study-opened",
        document,
        bindings: await bindingsForDocument(document),
        ...(version < STUDY_SCHEMA_VERSION ? { migratedFrom: version } : {}),
        warnings: version < STUDY_SCHEMA_VERSION ? ["Legacy Study migrated in memory. Save to commit schema v4."] : [],
      };
    }
    case "mirror-study": {
      if (mirrored?.document.id === request.document.id && request.revision < mirrored.revision) throw new Error("Rejected stale recovery revision.");
      if (promoteCatalogBindings(request.document)) await persistLocalState();
      mirrored = {
        version: 1,
        document: request.document,
        workspace: request.workspace,
        revision: request.revision,
        intentionallySavedRevision: mirrored?.document.id === request.document.id ? Math.min(mirrored.intentionallySavedRevision, request.revision) : 0,
      };
      await writeRecovery();
      return { type: "mirror-ack", revision: request.revision, recoveryPersisted: true };
    }
    case "save-study": {
      if (!mainWindow) throw new Error("No active window.");
      if (!mirrored || mirrored.document.id !== request.document.id || mirrored.revision !== request.revision) throw new Error("Recovery checkpoint must complete before save.");
      let targetPath = request.saveAs ? undefined : currentDocumentPath;
      if (!targetPath) {
        const result = await dialog.showSaveDialog(mainWindow, { title: "Save Font Previewer Study", defaultPath: `${safeFileStem(request.document.title, "Untitled font study")}.pitchfontstudy`, filters: [{ name: "Font Previewer Study", extensions: ["pitchfontstudy"] }] });
        if (result.canceled || !result.filePath) return { type: "save-result", revision: request.revision, displayName: "", saved: false };
        targetPath = result.filePath.endsWith(".pitchfontstudy") ? result.filePath : `${result.filePath}.pitchfontstudy`;
      }
      await atomicWrite(targetPath, serializeStudyDocument(request.document));
      currentDocumentPath = targetPath;
      updateRecentDocument(targetPath);
      mirrored = { ...mirrored, intentionallySavedRevision: request.revision };
      await Promise.all([writeRecovery(), persistLocalState()]);
      return { type: "save-result", revision: request.revision, displayName: basename(targetPath), saved: true };
    }
    case "export-handoff": {
      if (!mainWindow) throw new Error("No active window.");
      if (!mirrored || mirrored.document.id !== request.document.id || mirrored.revision !== request.revision) throw new Error("Recovery checkpoint must complete before export.");
      const result = await dialog.showOpenDialog(mainWindow, { title: "Choose Handoff destination", buttonLabel: "Export Here", properties: ["openDirectory", "createDirectory"] });
      if (result.canceled || !result.filePaths[0]) return { type: "export-result", displayName: "", exported: false, fileCount: 0 };
      const selectedMetadata = await lstat(result.filePaths[0]);
      if (selectedMetadata.isSymbolicLink() || !selectedMetadata.isDirectory()) throw new Error("Handoff destination must be a regular directory.");
      const targetDirectory = await realpath(result.filePaths[0]);
      const exported = await exportTransactionalHandoff({
        window: mainWindow,
        document: request.document,
        targetDirectory,
        sourcePaths: sourceBindings,
        includeSources: request.preferences.includeSources,
        sourcePermissionAcknowledged: request.sourcePermissionAcknowledged,
      });
      return { type: "export-result", displayName: exported.displayName, exported: true, fileCount: exported.fileCount };
    }
    case "relink-source": {
      if (!mainWindow) throw new Error("No active window.");
      const result = await dialog.showOpenDialog(mainWindow, { title: "Relink font Source", properties: ["openFile"], filters: [{ name: "Fonts", extensions: ["otf", "ttf", "ttc", "otc", "dfont", "woff", "woff2"] }] });
      if (result.canceled || !result.filePaths[0]) return { type: "relink-result", relinked: false };
      const imported = await inspectFontPath(result.filePaths[0], request.sourceId);
      await persistLocalState();
      return { type: "relink-result", import: imported, relinked: true };
    }
    case "reveal-source": {
      const path = sourceBindings.get(request.sourceId);
      if (!path) throw new Error("Source is not locally bound.");
      shell.showItemInFolder(path);
      return { type: "ack", action: "reveal-source" };
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
  const evidenceMode = Boolean(evidenceDirectory);
  const window = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#f5f2eb",
    title: "Font Previewer",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
      backgroundThrottling: !evidenceMode,
      offscreen: evidenceMode,
    },
  });
  mainWindow = window;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.session.on("will-download", (event) => event.preventDefault());
  if (!evidenceMode) window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = undefined;
  });
  const developmentURL = process.env.FONT_PREVIEWER_DEV_SERVER_URL;
  if (developmentURL) {
    const url = new URL(developmentURL);
    if (evidenceMode) url.searchParams.set("fixture", "1");
    await window.loadURL(url.toString());
  } else {
    await window.loadFile(rendererPath, evidenceMode ? { query: { fixture: "1" } } : undefined);
  }
  return window;
}

ipcMain.handle("host:request", handleHostRequest);

void app.whenReady().then(async () => {
  const dataDirectory = join(app.getPath("userData"), "Font Previewer");
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  localStatePath = join(dataDirectory, "host-state-v1.json");
  recoveryPath = join(dataDirectory, "recovery-v1.json");
  await loadLocalState();
  electronProtocol.handle("pitch-font", async (request) => {
    try {
      const url = new URL(request.url);
      const token = url.hostname === "asset" ? url.pathname.slice(1) : "";
      const path = /^[0-9a-f-]{36}$/i.test(token) ? pathsByToken.get(token) : undefined;
      if (!path) return new Response(null, { status: 404 });
      return net.fetch(pathToFileURL(path).toString());
    } catch {
      return new Response(null, { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(buildMenu());
  const firstWindow = await createWindow();
  if (evidenceDirectory) {
    await runEvidenceFlow({
      window: firstWindow,
      outputDirectory: evidenceDirectory,
      sendMenuCommand,
      verifyDurability: async () => {
        if (!mirrored) throw new Error("No recovery snapshot available for durability verification.");
        const path = join(evidenceDirectory, "durability.pitchfontstudy");
        await atomicWrite(path, serializeStudyDocument(mirrored.document));
        const restored = parseStudyDocument(await readBoundedText(path, maximumStudyBytes));
        return { path: basename(path), bytes: (await stat(path)).size, studyId: restored.id, schemaVersion: restored.schemaVersion };
      },
      exportHandoff: async () => {
        if (!mirrored) throw new Error("No recovery snapshot available for Handoff verification.");
        const targetDirectory = join(evidenceDirectory, "handoff-target");
        await mkdir(targetDirectory, { recursive: true, mode: 0o700 });
        return exportTransactionalHandoff({
          window: firstWindow,
          document: mirrored.document,
          targetDirectory,
          sourcePaths: sourceBindings,
          includeSources: false,
          sourcePermissionAcknowledged: false,
        });
      },
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

app.on("before-quit", () => {
  sourceWatchers.forEach((watcher) => watcher.close());
});
