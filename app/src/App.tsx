import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type CSSProperties,
} from "react";
import {
  STAGES,
  STUDY_LIMITS,
  applyStudyCommand,
  createSession,
  isSemanticCommand,
  type RecipePack,
  type FitPolicy,
  type HandoffPreferences,
  type ImportedSource,
  type Stage,
  type StudyCommand,
  type StudyDocument,
  type StudySession,
  type WorkspaceState,
} from "./domain.js";
import { createFixtureSession, createNewStudy } from "./fixture.js";
import { useFontRegistry, useStudyIndex } from "./font-runtime.js";
import { getHostPort } from "./host-bridge.js";
import {
  Inspector,
  Navigator,
  SimpleWorkspace,
  Tray,
  Welcome,
  Workspace,
  stageLabels,
  type AppActions,
  type InstalledCatalogView,
  type NavigatorMode,
} from "./components.js";
import { CATALOG_PAGE_SIZE, type HostCapabilities, type MenuCommand } from "./protocol.js";
import { createSimpleExportRuntime } from "./simple-boards.js";
import { InterfaceIcon } from "./icons.js";

interface HistorySnapshot {
  readonly document: StudyDocument;
  readonly workspace: WorkspaceState;
}

interface HistoryState {
  readonly past: readonly HistorySnapshot[];
  readonly present: StudySession;
  readonly future: readonly HistorySnapshot[];
}

type HistoryAction =
  | { readonly type: "command"; readonly command: StudyCommand }
  | { readonly type: "replace"; readonly session: StudySession }
  | { readonly type: "undo" }
  | { readonly type: "redo" };

const HISTORY_LIMIT = 100;
const EMPTY_CATALOG: InstalledCatalogView = { query: "", cursor: 0, imports: [], indexed: 0, total: 0, rejected: 0, truncated: false };
const UI_SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4] as const;
const STAGE_DESCRIPTIONS: Readonly<Record<Stage, string>> = {
  review: "Choose",
  compare: "Pressure-test",
  system: "Assign roles",
  handoff: "Package",
};
type InterfaceMode = "simple" | "studio";

function storedInterfaceMode(fixture: boolean): InterfaceMode {
  const requested = new URLSearchParams(globalThis.location?.search ?? "").get("mode");
  if (requested === "simple" || requested === "studio") return requested;
  if (fixture) return "studio";
  try {
    return globalThis.localStorage?.getItem("font-previewer-interface-mode") === "studio" ? "studio" : "simple";
  } catch {
    return "simple";
  }
}

function storedUIScale(): number {
  try {
    const stored = Number(globalThis.localStorage?.getItem("font-previewer-ui-scale"));
    return UI_SCALES.includes(stored as (typeof UI_SCALES)[number]) ? stored : 1.1;
  } catch {
    return 1.1;
  }
}

function importsWithinStudyLimits(document: StudyDocument, imports: readonly ImportedSource[]): ImportedSource[] {
  const existing = new Set(document.sources.map((source) => source.id));
  const seen = new Set(existing);
  let sources = document.sources.length;
  let faces = document.faces.length;
  let candidates = document.candidates.length;
  const accepted: ImportedSource[] = [];
  for (const imported of imports) {
    if (existing.has(imported.source.id)) {
      if (!accepted.some((item) => item.source.id === imported.source.id)) accepted.push(imported);
      continue;
    }
    if (seen.has(imported.source.id)) continue;
    seen.add(imported.source.id);
    if (sources + 1 > STUDY_LIMITS.sources || faces + imported.faces.length > STUDY_LIMITS.faces || candidates + imported.faces.length > STUDY_LIMITS.candidates) continue;
    accepted.push(imported);
    sources += 1;
    faces += imported.faces.length;
    candidates += imported.faces.length;
  }
  return accepted;
}

function snapshot(session: StudySession): HistorySnapshot {
  return { document: session.document, workspace: session.workspace };
}

function restoreSnapshot(current: StudySession, target: HistorySnapshot): StudySession {
  const document = { ...target.document, updatedAt: new Date().toISOString() };
  const restored = createSession(document, current.bindings, target.workspace, current.revision + 1);
  return {
    ...restored,
    acknowledgedRevision: current.acknowledgedRevision,
    intentionallySavedRevision: current.intentionallySavedRevision,
  };
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "replace") return { past: [], present: action.session, future: [] };
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: restoreSnapshot(state.present, previous),
      future: [snapshot(state.present), ...state.future].slice(0, HISTORY_LIMIT),
    };
  }
  if (action.type === "redo") {
    const next = state.future[0];
    if (!next) return state;
    return {
      past: [...state.past, snapshot(state.present)].slice(-HISTORY_LIMIT),
      present: restoreSnapshot(state.present, next),
      future: state.future.slice(1),
    };
  }
  const next = applyStudyCommand(state.present, action.command);
  if (next === state.present) return state;
  if (!isSemanticCommand(action.command)) return { ...state, present: next };
  return {
    past: [...state.past, snapshot(state.present)].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
}

function fixtureRequested(): boolean {
  return new URLSearchParams(globalThis.location?.search ?? "").get("fixture") === "1";
}

function editableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

function interactiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, summary, [role='button'], [role='radio']"));
}

function statusLabel(session: StudySession, recoveryAvailable: boolean | undefined): string {
  if (session.revision === session.intentionallySavedRevision) return "Saved";
  if (session.revision > session.acknowledgedRevision) return "Saving recovery…";
  return recoveryAvailable === false ? "Unsaved · recovery unavailable" : "Unsaved · recovery ready";
}

export default function App() {
  const fixture = useMemo(fixtureRequested, []);
  const [history, historyDispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: fixture ? createFixtureSession() : createNewStudy(),
    future: [],
  }));
  const session = history.present;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const host = useMemo(getHostPort, []);
  const [capabilities, setCapabilities] = useState<HostCapabilities>();
  const [hostName, setHostName] = useState("connecting");
  const [showWelcome, setShowWelcome] = useState(!fixture);
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(() => storedInterfaceMode(fixture));
  const [uiScale, setUIScale] = useState(storedUIScale);
  const [stressTest, setStressTest] = useState(false);
  const [comparisonFitPolicy, setComparisonFitPolicy] = useState<FitPolicy>("fit");
  const [includeIndex, setIncludeIndex] = useState(true);
  const [includeSources, setIncludeSources] = useState(false);
  const [launchReady, setLaunchReady] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState<boolean>();
  const [busyTask, setBusyTask] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [newStudyOpen, setNewStudyOpen] = useState(false);
  const [newStudyTitle, setNewStudyTitle] = useState("Untitled font study");
  const [newStudyPack, setNewStudyPack] = useState<RecipePack>("film-tv");
  const [navigatorMode, setNavigatorMode] = useState<NavigatorMode>("study");
  const [catalog, setCatalog] = useState<InstalledCatalogView>(EMPTY_CATALOG);
  const [simpleCatalogOpenRequest, setSimpleCatalogOpenRequest] = useState(0);
  const [titleDraft, setTitleDraft] = useState(session.document.title);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingWorkspaceFocusRef = useRef(false);
  const newStudyDialogRef = useRef<HTMLElement>(null);
  const newStudyReturnFocusRef = useRef<HTMLElement | null>(null);
  const catalogRequestRef = useRef(0);
  const index = useStudyIndex(session.document);
  const fontStates = useFontRegistry(session);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem("font-previewer-interface-mode", interfaceMode);
    } catch {
      // Local preference persistence is optional; the Study remains unaffected.
    }
  }, [interfaceMode]);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem("font-previewer-ui-scale", String(uiScale));
    } catch {
      // UI scaling remains active for this launch when preferences are unavailable.
    }
  }, [uiScale]);

  useEffect(() => {
    if (showWelcome || interfaceMode !== "simple") {
      delete window.__fontPreviewerSimpleExport;
      return;
    }
    const runtime = createSimpleExportRuntime(session, stressTest, includeIndex, comparisonFitPolicy);
    window.__fontPreviewerSimpleExport = runtime;
    return () => {
      if (window.__fontPreviewerSimpleExport === runtime) delete window.__fontPreviewerSimpleExport;
    };
  }, [comparisonFitPolicy, includeIndex, interfaceMode, session, showWelcome, stressTest]);

  useEffect(() => setTitleDraft(session.document.title), [session.document.id, session.document.title]);

  const requestWorkspaceFocus = useCallback(() => {
    pendingWorkspaceFocusRef.current = true;
    requestAnimationFrame(() => {
      if (!pendingWorkspaceFocusRef.current || !headingRef.current) return;
      pendingWorkspaceFocusRef.current = false;
      headingRef.current.closest<HTMLElement>(".workspace")?.scrollTo({ left: 0, top: 0 });
      document.documentElement.scrollTo({ left: 0, top: 0 });
      document.body.scrollTo({ left: 0, top: 0 });
      headingRef.current.focus({ preventScroll: true });
    });
  }, []);

  useLayoutEffect(() => {
    if (!pendingWorkspaceFocusRef.current || !headingRef.current) return;
    pendingWorkspaceFocusRef.current = false;
    headingRef.current.closest<HTMLElement>(".workspace")?.scrollTo({ left: 0, top: 0 });
    document.documentElement.scrollTo({ left: 0, top: 0 });
    document.body.scrollTo({ left: 0, top: 0 });
    headingRef.current.focus({ preventScroll: true });
  });

  const dispatch = useCallback<Dispatch<StudyCommand>>((command) => {
    historyDispatch({ type: "command", command });
  }, []);

  const runTask = useCallback(async <T,>(label: string, task: () => Promise<T>): Promise<T | undefined> => {
    setBusyTask(label);
    setError("");
    try {
      return await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${label.toLocaleLowerCase()}.`);
      return undefined;
    } finally {
      setBusyTask(undefined);
    }
  }, []);

  const mirror = useCallback(async (current: StudySession): Promise<boolean> => {
    const response = await host.request({
      type: "mirror-study",
      document: current.document,
      workspace: current.workspace,
      revision: current.revision,
    });
    if (response.type !== "mirror-ack" || response.revision !== current.revision) {
      throw new Error("Host did not confirm the recovery checkpoint.");
    }
    dispatch({ type: "acknowledge-revision", revision: response.revision });
    setRecoveryAvailable(response.recoveryPersisted);
    return response.recoveryPersisted;
  }, [dispatch, host]);

  const importSources = useCallback(() => {
    void runTask("Importing Sources", async () => {
      const response = await host.request({ type: "open-import" });
      if (response.type !== "import-result") throw new Error("Host returned the wrong import response.");
      const accepted = importsWithinStudyLimits(sessionRef.current.document, response.imports);
      if (accepted.length) {
        dispatch({ type: "ingest-sources", imports: accepted });
        setShowWelcome(false);
        const limited = response.imports.length - accepted.length;
        setNotice(`${accepted.length} ${accepted.length === 1 ? "Source" : "Sources"} imported${response.rejected ? ` · ${response.rejected} rejected` : ""}${response.truncated || limited ? " · Study limit reached" : ""}.`);
      } else {
        setNotice(response.rejected ? `${response.rejected} unsupported or unreadable Sources rejected.` : response.imports.length ? "Study capacity reached. No Sources were imported." : "Import cancelled.");
      }
    });
  }, [dispatch, host, runTask]);

  const scanInstalled = useCallback((query = "", refresh = false, cursor = 0, destination: "studio" | "simple" = "studio") => {
    const serial = catalogRequestRef.current + 1;
    catalogRequestRef.current = serial;
    if (destination === "studio") {
      setNavigatorMode("catalog");
      setInterfaceMode("studio");
      setShowWelcome(false);
    } else {
      setInterfaceMode("simple");
      setShowWelcome(false);
      setSimpleCatalogOpenRequest((current) => current + 1);
    }
    setBusyTask("Scanning installed fonts");
    setError("");
    void (async () => {
      try {
        const response = await host.request({ type: "scan-installed", query: query.slice(0, 200), cursor, limit: CATALOG_PAGE_SIZE, refresh });
        if (response.type !== "catalog-result") throw new Error("Host returned the wrong catalog response.");
        if (catalogRequestRef.current !== serial || response.cancelled) return;
        setCatalog({ query: query.slice(0, 200), cursor, imports: response.imports, indexed: response.indexed, total: response.total, rejected: response.rejected, truncated: response.truncated, ...(response.nextCursor === undefined ? {} : { nextCursor: response.nextCursor }) });
        setNotice(response.indexed ? `${response.total} installed ${response.total === 1 ? "Source" : "Sources"} match. Add only what belongs in this Study.` : "Installed-font Catalog is unavailable in this Host.");
      } catch (cause) {
        if (catalogRequestRef.current === serial) setError(cause instanceof Error ? cause.message : "Could not scan installed fonts.");
      } finally {
        if (catalogRequestRef.current === serial) setBusyTask(undefined);
      }
    })();
  }, [host]);

  const cancelCatalog = useCallback(() => {
    catalogRequestRef.current += 1;
    setBusyTask(undefined);
    void host.request({ type: "cancel-catalog" }).then((response) => {
      if (response.type !== "ack" || response.action !== "cancel-catalog") throw new Error("Host did not acknowledge Catalog cancellation.");
      setNotice("Catalog scan cancelled.");
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not cancel the Catalog scan."));
  }, [host]);

  const addCatalogSources = useCallback((sourceIds: readonly string[]) => {
    const current = sessionRef.current.document;
    const requested = catalog.imports.filter((item) => sourceIds.includes(item.source.id) && !current.sources.some((source) => source.id === item.source.id));
    const selected = importsWithinStudyLimits(current, requested);
    if (!selected.length) {
      setNotice(requested.length ? "Study capacity reached. No installed Sources were added." : "Those Sources are already in this Study.");
      return;
    }
    dispatch({ type: "ingest-sources", imports: selected });
    setNotice(`${selected.length} installed ${selected.length === 1 ? "Source" : "Sources"} added explicitly to this Study${selected.length < requested.length ? " · Study capacity reached" : ""}.`);
  }, [catalog.imports, dispatch]);

  const openStudy = useCallback(() => {
    void runTask("Opening Study", async () => {
      const response = await host.request({ type: "open-study" });
      if (response.type !== "study-opened") throw new Error("Host returned the wrong open response.");
      if (response.warnings.includes("Open cancelled.")) {
        setNotice("Open cancelled.");
        return;
      }
      const opened = createSession(response.document, response.bindings);
      pendingWorkspaceFocusRef.current = true;
      historyDispatch({ type: "replace", session: opened });
      setShowWelcome(false);
      setNotice(response.migratedFrom ? `Study migrated from schema v${response.migratedFrom}. Save to commit v4.` : response.warnings[0] ?? "Study opened.");
      requestWorkspaceFocus();
    });
  }, [host, requestWorkspaceFocus, runTask]);

  const saveStudy = useCallback((saveAs: boolean) => {
    void runTask(saveAs ? "Saving Study As" : "Saving Study", async () => {
      const current = sessionRef.current;
      await mirror(current);
      const response = await host.request({ type: "save-study", document: current.document, revision: current.revision, saveAs });
      if (response.type !== "save-result") throw new Error("Host returned the wrong save response.");
      if (!response.saved) {
        setNotice("Save cancelled.");
        return;
      }
      dispatch({ type: "mark-intentionally-saved", revision: response.revision });
      setNotice(`Saved ${response.displayName}.`);
    });
  }, [dispatch, host, mirror, runTask]);

  const saveAfterFocusedEdit = useCallback((saveAs: boolean) => {
    const activeElement = document.activeElement;
    if (editableTarget(activeElement) && activeElement instanceof HTMLElement) {
      activeElement.blur();
      requestAnimationFrame(() => saveStudy(saveAs));
      return;
    }
    saveStudy(saveAs);
  }, [saveStudy]);

  const performExport = useCallback((label: string, preferences: HandoffPreferences, sourcePermissionAcknowledged: boolean) => {
    void runTask(label, async () => {
      const current = sessionRef.current;
      await mirror(current);
      const response = await host.request({
        type: "export-handoff",
        document: current.document,
        revision: current.revision,
        preferences,
        sourcePermissionAcknowledged,
      });
      if (response.type !== "export-result") throw new Error("Host returned the wrong export response.");
      setNotice(response.exported ? `Exported ${response.displayName} · ${response.fileCount} files.` : "Export cancelled. No partial Handoff retained.");
    });
  }, [host, mirror, runTask]);

  const exportHandoff = useCallback((sourcePermissionAcknowledged: boolean) => {
    performExport("Exporting Handoff", sessionRef.current.document.handoff, sourcePermissionAcknowledged);
  }, [performExport]);

  const exportBoards = useCallback((copySources: boolean) => {
    performExport("Exporting Boards", {
      profile: "internal",
      outputs: ["summary", "json", "csv"],
      includeSources: copySources,
    }, copySources);
  }, [performExport]);

  const relinkSource = useCallback((sourceId: string) => {
    void runTask("Relinking Source", async () => {
      const response = await host.request({ type: "relink-source", sourceId });
      if (response.type !== "relink-result") throw new Error("Host returned the wrong relink response.");
      if (!response.relinked || !response.import) {
        setNotice("Relink cancelled. Existing decisions remain intact.");
        return;
      }
      if (response.import.source.id !== sourceId) throw new Error("Host changed Source identity during relink.");
      const retained = sessionRef.current.bindings.filter((binding) => binding.sourceId !== sourceId);
      dispatch({ type: "replace-bindings", bindings: [...retained, response.import.binding] });
      dispatch({ type: "update-source-state", sourceId, state: response.import.binding.state });
      setNotice(`${response.import.source.displayName} relinked.`);
    });
  }, [dispatch, host, runTask]);

  const revealSource = useCallback((sourceId: string) => {
    void runTask("Showing Source", async () => {
      const response = await host.request({ type: "reveal-source", sourceId });
      if (response.type !== "ack") throw new Error("Host could not reveal the Source.");
    });
  }, [host, runTask]);

  const startStudy = useCallback((pack: RecipePack, title?: string) => {
    historyDispatch({ type: "replace", session: createNewStudy(pack, title) });
    setShowWelcome(false);
    setNotice("New Study ready. Import Sources to begin.");
  }, []);

  const closeNewStudy = useCallback(() => setNewStudyOpen(false), []);
  const newStudy = useCallback(() => {
    newStudyReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNewStudyOpen(true);
  }, []);
  const loadSample = useCallback(() => {
    historyDispatch({ type: "replace", session: createFixtureSession() });
    setShowWelcome(false);
    setNotice("Sample Study loaded. Sample faces use system fallbacks until real Sources are relinked.");
  }, []);

  const actions = useMemo<AppActions>(() => ({
    importSources,
    scanInstalled,
    cancelCatalog,
    addCatalogSources,
    openStudy,
    saveStudy,
    exportHandoff,
    exportBoards,
    relinkSource,
    revealSource,
    newStudy,
    loadSample,
  }), [addCatalogSources, cancelCatalog, exportBoards, exportHandoff, importSources, loadSample, newStudy, openStudy, relinkSource, revealSource, saveStudy, scanInstalled]);

  const handleMenu = useCallback((command: MenuCommand) => {
    switch (command.type) {
      case "new-study": newStudy(); break;
      case "open-study": openStudy(); break;
      case "open-import": importSources(); break;
      case "scan-installed": scanInstalled("", false, 0, interfaceMode === "simple" ? "simple" : "studio"); break;
      case "save-study": saveAfterFocusedEdit(false); break;
      case "save-study-as": saveAfterFocusedEdit(true); break;
      case "export-handoff": {
        exportHandoff(sessionRef.current.document.handoff.includeSources);
        break;
      }
      case "undo-study": historyDispatch({ type: "undo" }); break;
      case "redo-study": historyDispatch({ type: "redo" }); break;
      case "mark-keep": {
        const candidateId = sessionRef.current.workspace.selectedCandidateId;
        if (candidateId) dispatch({ type: "set-review-state", candidateIds: [candidateId], reviewState: "keep" });
        break;
      }
      case "next-unreviewed": dispatch({ type: "select-next-unreviewed" }); break;
      case "set-stage": setInterfaceMode("studio"); dispatch({ type: "set-stage", stage: command.stage }); break;
      case "flush-recovery": {
        void (async () => {
          const activeElement = document.activeElement;
          if (editableTarget(activeElement) && activeElement instanceof HTMLElement) {
            activeElement.blur();
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
          const current = sessionRef.current;
          let recoveryPersisted = false;
          try {
            recoveryPersisted = await mirror(current);
          } catch (cause) {
            setRecoveryAvailable(false);
            setError(cause instanceof Error ? cause.message : "Could not confirm the final recovery checkpoint.");
          }
          const response = await host.request({ type: "finish-terminate", revision: current.revision, recoveryPersisted });
          if (response.type !== "ack" || response.action !== "finish-terminate") throw new Error("Host did not finish the quit checkpoint.");
        })().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not finish the quit checkpoint."));
        break;
      }
      case "reload-studio": void host.request({ type: "reload-studio" }); break;
    }
  }, [dispatch, exportHandoff, host, importSources, interfaceMode, mirror, newStudy, openStudy, saveAfterFocusedEdit, scanInstalled]);

  useEffect(() => {
    let active = true;
    void runTask("Starting Host", async () => {
      const response = await host.request({ type: "get-launch-state" });
      if (!active || response.type !== "launch-state") return;
      setCapabilities(response.capabilities);
      setHostName(response.capabilities.host);
      if (response.recovery) {
        const recovered = createSession(response.recovery.document, response.recovery.bindings, response.recovery.workspace, response.recovery.revision);
        historyDispatch({
          type: "replace",
          session: {
            ...recovered,
            intentionallySavedRevision: Math.min(response.recovery.intentionallySavedRevision, response.recovery.revision),
          },
        });
        setRecoveryAvailable(true);
        setShowWelcome(false);
        setNotice(response.recovery.revision > response.recovery.intentionallySavedRevision ? "Recovered unsaved work." : "Recovered last Study state.");
      }
      const probe = await host.request({ type: "probe", serial: 1 });
      if (active && probe.type === "probe-result") setHostName(probe.host);
      if (active) setLaunchReady(true);
    });
    return () => { active = false; };
  }, [host, runTask]);

  useEffect(() => host.onMenuCommand(handleMenu), [handleMenu, host]);

  useEffect(() => host.onHostEvent((event) => {
    if (event.type === "source-state") dispatch({ type: "update-source-state", sourceId: event.sourceId, state: event.state });
    if (event.type === "mirror-warning") {
      setRecoveryAvailable(false);
      setError(event.message);
    }
    if (event.type === "task-progress") setNotice(`${event.task}: ${event.completed}${event.total ? `/${event.total}` : ""}`);
  }), [dispatch, host]);

  useLayoutEffect(() => {
    if (!newStudyOpen) return;
    const dialog = newStudyDialogRef.current;
    const returnTarget = newStudyReturnFocusRef.current;
    if (!dialog) return;
    const focusableSelector = "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNewStudy();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.hidden);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      requestAnimationFrame(() => (returnTarget?.isConnected ? returnTarget : headingRef.current)?.focus());
    };
  }, [closeNewStudy, newStudyOpen]);

  useEffect(() => {
    if (!launchReady || session.revision <= session.acknowledgedRevision) return;
    const timer = window.setTimeout(() => {
      void mirror(session).catch((cause) => {
        setRecoveryAvailable(false);
        setError(cause instanceof Error ? cause.message : "Recovery checkpoint failed.");
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [launchReady, mirror, session]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const primary = event.metaKey || event.ctrlKey;
      if (primary && ["=", "+", "-", "0"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "0") {
          setUIScale(1);
          return;
        }
        setUIScale((current) => {
          const index = UI_SCALES.findIndex((scale) => scale === current);
          const delta = event.key === "-" ? -1 : 1;
          return UI_SCALES[Math.min(UI_SCALES.length - 1, Math.max(0, index + delta))] ?? current;
        });
        return;
      }
      if (primary && event.key.toLocaleLowerCase() === "s") {
        event.preventDefault();
        saveAfterFocusedEdit(event.shiftKey);
        return;
      }
      if (primary && event.key.toLocaleLowerCase() === "z") {
        if (editableTarget(event.target)) return;
        event.preventDefault();
        historyDispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (editableTarget(event.target) || interactiveTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (interfaceMode !== "studio") return;
      const candidateId = sessionRef.current.workspace.selectedCandidateId;
      if (["0", "1", "2", "3"].includes(event.key) && candidateId) {
        const reviewState = ({ "0": "unreviewed", "1": "keep", "2": "maybe", "3": "reject" } as const)[event.key as "0" | "1" | "2" | "3"];
        dispatch({ type: "set-review-state", candidateIds: [candidateId], reviewState });
        return;
      }
      if (event.code === "Space" && candidateId) {
        event.preventDefault();
        dispatch({ type: "toggle-tray", candidateId });
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const candidates = sessionRef.current.document.candidates;
        const index = candidates.findIndex((candidate) => candidate.id === candidateId);
        const next = candidates[(index + 1 + candidates.length) % candidates.length];
        if (next) dispatch({ type: "select-candidate", candidateId: next.id });
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        const candidates = sessionRef.current.document.candidates;
        const index = candidates.findIndex((candidate) => candidate.id === candidateId);
        const previous = candidates[(index - 1 + candidates.length) % candidates.length];
        if (previous) dispatch({ type: "select-candidate", candidateId: previous.id });
      } else if (event.key === "Enter") {
        headingRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, interfaceMode, saveAfterFocusedEdit]);

  const setStage = (stage: Stage) => {
    pendingWorkspaceFocusRef.current = true;
    dispatch({ type: "set-stage", stage });
    requestWorkspaceFocus();
  };
  const activeComparison = session.workspace.activeComparisonId
    ? session.document.comparisonSets.find((comparison) => comparison.id === session.workspace.activeComparisonId)
    : undefined;
  useEffect(() => {
    if (activeComparison) setComparisonFitPolicy(activeComparison.policy);
  }, [activeComparison?.id, activeComparison?.policy]);
  const blindIdentityHidden = session.workspace.stage === "compare" && Boolean(activeComparison?.blind && !activeComparison.revealed);
  const shellStyle = {
    transform: `scale(${uiScale})`,
    width: `${100 / uiScale}%`,
    height: `${100 / uiScale}%`,
  } as CSSProperties;
  const changeScale = (delta: -1 | 1) => {
    setUIScale((current) => {
      const index = UI_SCALES.findIndex((scale) => scale === current);
      return UI_SCALES[Math.min(UI_SCALES.length - 1, Math.max(0, index + delta))] ?? current;
    });
  };

  return (
    <div className={`app-shell ${showWelcome ? "is-welcome" : ""} mode-${interfaceMode} stage-${session.workspace.stage}`} data-interface-mode={interfaceMode} data-ui-scale={Math.round(uiScale * 100)} style={shellStyle}>
      <a className="skip-link" href={showWelcome ? "#welcome-heading" : "#workspace-heading"}>Skip to main content</a>
      <header className="titlebar">
        <div className="brand-lockup"><img className="brand-mark" src="/font-previewer-icon-64.png" alt="" aria-hidden="true" /><div><strong>Font Previewer</strong><span>{interfaceMode === "simple" ? "Type Boards" : "Decision Studio"}</span></div></div>
        <div className="interface-switch" role="group" aria-label="Interface mode">
          <button type="button" className={interfaceMode === "simple" ? "is-active" : ""} aria-pressed={interfaceMode === "simple"} onClick={() => { setInterfaceMode("simple"); if (showWelcome && session.document.candidates.length) setShowWelcome(false); }}>Simple</button>
          <button type="button" className={interfaceMode === "studio" ? "is-active" : ""} aria-pressed={interfaceMode === "studio"} onClick={() => { setInterfaceMode("studio"); setShowWelcome(false); }}>Studio</button>
        </div>
        <label className="document-title"><span className={`save-dot ${session.revision === session.intentionallySavedRevision ? "" : "is-unsaved"}`} aria-hidden="true">●</span><span className="sr-only">Study title</span><input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onBlur={() => dispatch({ type: "rename-study", title: titleDraft })} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="Study title" /><span>{statusLabel(session, recoveryAvailable)}</span></label>
        <div className="ui-scale-control" role="group" aria-label="Interface scale">
          <button type="button" aria-label="Decrease interface scale" disabled={uiScale === UI_SCALES[0]} onClick={() => changeScale(-1)}>−</button>
          <button type="button" className="ui-scale-value" aria-label={`Reset interface scale. Current scale ${Math.round(uiScale * 100)} percent`} onClick={() => setUIScale(1)}>{Math.round(uiScale * 100)}%</button>
          <button type="button" aria-label="Increase interface scale" disabled={uiScale === UI_SCALES.at(-1)} onClick={() => changeScale(1)}>+</button>
        </div>
        <div className="host-actions"><span className="host-probe">{hostName}</span><button type="button" className="quiet-button has-icon" onClick={openStudy}><InterfaceIcon name="folder" />Open</button><button id="import-fonts-button" type="button" className="quiet-button has-icon" onClick={importSources}><InterfaceIcon name="add" />Add Fonts</button><button type="button" className="primary-button has-icon" onClick={() => saveStudy(false)}><InterfaceIcon name="save" />Save</button></div>
      </header>

      {showWelcome ? <Welcome actions={actions} capabilities={capabilities} /> : (
        interfaceMode === "simple" ? (
          <SimpleWorkspace
            session={session}
            dispatch={dispatch}
            fontStates={fontStates}
            headingRef={headingRef}
            actions={actions}
            capabilities={capabilities}
            stressTest={stressTest}
            onStressTestChange={setStressTest}
            fitPolicy={comparisonFitPolicy}
            onFitPolicyChange={setComparisonFitPolicy}
            includeIndex={includeIndex}
            onIncludeIndexChange={setIncludeIndex}
            includeSources={includeSources}
            onIncludeSourcesChange={setIncludeSources}
            catalog={catalog}
            catalogBusy={busyTask === "Scanning installed fonts"}
            catalogOpenRequest={simpleCatalogOpenRequest}
          />
        ) : <>
          <nav className="stage-nav" aria-label="Workflow stages">{STAGES.map((stage, stageIndex) => <button type="button" key={stage} className={session.workspace.stage === stage ? "is-active" : ""} aria-current={session.workspace.stage === stage ? "step" : undefined} onClick={() => setStage(stage)}><span className="stage-number">{String(stageIndex + 1).padStart(2, "0")}</span><span className="stage-copy"><strong>{stageLabels[stage]}</strong><small>{STAGE_DESCRIPTIONS[stage]}</small></span></button>)}</nav>
          {session.workspace.stage !== "handoff" ? <Navigator session={session} index={index} dispatch={dispatch} actions={actions} mode={navigatorMode} onModeChange={setNavigatorMode} catalog={catalog} catalogBusy={busyTask === "Scanning installed fonts"} /> : null}
          <Workspace session={session} index={index} dispatch={dispatch} fontStates={fontStates} headingRef={headingRef} actions={actions} capabilities={capabilities} comparisonPolicy={comparisonFitPolicy} onComparisonPolicyChange={setComparisonFitPolicy} />
          {session.workspace.stage !== "handoff" ? <Inspector key={session.workspace.selectedCandidateId ?? "none"} session={session} dispatch={dispatch} fontStates={fontStates} actions={actions} blindIdentityHidden={blindIdentityHidden} /> : null}
          {session.workspace.stage === "review" || session.workspace.stage === "compare" ? <Tray session={session} dispatch={dispatch} /> : null}
        </>
      )}

      {busyTask ? <div className="task-status" role="status"><span aria-hidden="true" />{busyTask}…</div> : null}
      {error ? <div className="error-banner" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}>×</button></div> : null}
      {newStudyOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNewStudy(); }}>
          <section ref={newStudyDialogRef} className="new-study-dialog" role="dialog" aria-modal="true" aria-labelledby="new-study-heading" aria-describedby="new-study-description" tabIndex={-1}>
            <p className="section-kicker">New Study</p>
            <h2 id="new-study-heading">Choose the pressure first.</h2>
            <p id="new-study-description">Recipes shape the first review pass. They never lock the Study.</p>
            <label className="field-label"><span>Study title</span><input autoFocus value={newStudyTitle} onChange={(event) => setNewStudyTitle(event.target.value)} /></label>
            <fieldset className="recipe-pack-grid"><legend>Recipe pack</legend>{([
              ["film-tv", "Film / TV", "Titles, loglines, bios, captions, legal"],
              ["advertising", "Advertising", "Campaign lines, treatment copy, supers"],
              ["business", "Business", "Value propositions, metrics, team, legal"],
              ["blank", "Blank", "One neutral specimen; build from zero"],
            ] as const).map(([value, label, detail]) => <label key={value}><input type="radio" name="recipe-pack" value={value} checked={newStudyPack === value} onChange={() => setNewStudyPack(value)} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}</fieldset>
            {session.revision > session.intentionallySavedRevision ? <p className="unsaved-warning">The current Study has intentionally unsaved changes. Its latest recovery remains available until this new Study is edited.</p> : null}
            <div className="dialog-actions"><button type="button" className="quiet-button" onClick={closeNewStudy}>Cancel</button><button type="button" className="primary-button" onClick={() => { startStudy(newStudyPack, newStudyTitle.trim() || undefined); closeNewStudy(); }}>Create Study</button></div>
          </section>
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">{notice}</div>
    </div>
  );
}
