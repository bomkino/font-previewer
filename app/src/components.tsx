import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type RefObject,
} from "react";
import {
  FIT_POLICIES,
  REVIEW_STATES,
  SYSTEM_ROLES,
  TEXT_CASINGS,
  activeRecipe,
  activeTypographySystem,
  bindingForSource,
  faceForCandidate,
  sourceForCandidate,
  type Candidate,
  type ComparisonSet,
  type FitPolicy,
  type HandoffPreferences,
  type ImportedSource,
  type Recipe,
  type ReviewState,
  type Stage,
  type StudyCommand,
  type StudySession,
  type SystemRole,
} from "./domain.js";
import {
  rendererStatusLabel,
  specimenCopy,
  specimenStyle,
  type StudyIndex,
} from "./font-runtime.js";
import { groupByFamily } from "./family-groups.js";
import type { HostCapabilities } from "./protocol.js";
import { InterfaceIcon } from "./icons.js";
import {
  DEFAULT_SIMPLE_BODY_COPY_SAMPLE_ID,
  SIMPLE_BODY_COPY_LIMIT,
  SIMPLE_BODY_COPY_SAMPLES,
  SIMPLE_INDEX_PAGE_SIZE,
  SIMPLE_QUADRANTS,
  SIMPLE_STRESS_COPY,
  chunked,
  includedCandidates,
  simpleBodyCopyLabel,
  simpleBodyCopySample,
  simpleBodyDisplayCopy,
  simpleDisplayCopy,
  type SimplePageMode,
} from "./simple-boards.js";

export const stageLabels: Record<Stage, string> = {
  review: "Review",
  compare: "Compare",
  system: "System",
  handoff: "Handoff",
};

export const roleLabels: Record<SystemRole, string> = {
  display: "Display",
  body: "Body",
  data: "Data",
  caption: "Caption",
  legal: "Legal",
  utility: "Utility",
  fallback: "Fallback",
};

const reviewLabels: Record<ReviewState, string> = {
  unreviewed: "Unreviewed",
  keep: "Keep",
  maybe: "Maybe",
  reject: "Reject",
};

const reviewGlyphs: Record<ReviewState, string> = {
  unreviewed: "○",
  keep: "+",
  maybe: "?",
  reject: "×",
};

const policyLabels: Record<FitPolicy, { label: string; detail: string }> = {
  nominal: { label: "Same size", detail: "Natural scale and width differences remain visible." },
  fit: { label: "Fit each", detail: "Each Candidate fits the same frame independently." },
  "locked-lines": { label: "Lock line breaks", detail: "Authored breaks stay identical across Candidates." },
};

export interface AppActions {
  readonly importSources: () => void;
  readonly scanInstalled: (query?: string, refresh?: boolean, cursor?: number, destination?: "studio" | "simple") => void;
  readonly cancelCatalog: () => void;
  readonly addCatalogSources: (sourceIds: readonly string[]) => void;
  readonly openStudy: () => void;
  readonly saveStudy: (saveAs: boolean) => void;
  readonly exportHandoff: (sourcePermissionAcknowledged: boolean) => void;
  readonly exportBoards: (includeSources: boolean) => void;
  readonly relinkSource: (sourceId: string) => void;
  readonly revealSource: (sourceId: string) => void;
  readonly newStudy: () => void;
  readonly loadSample: () => void;
}

export type NavigatorMode = "study" | "catalog" | "sources" | "sets";

export interface InstalledCatalogView {
  readonly query: string;
  readonly cursor: number;
  readonly imports: readonly ImportedSource[];
  readonly indexed: number;
  readonly total: number;
  readonly rejected: number;
  readonly truncated: boolean;
  readonly nextCursor?: number;
}

interface WelcomeProps {
  readonly actions: AppActions;
  readonly capabilities?: HostCapabilities;
}

export function Welcome({ actions, capabilities }: WelcomeProps) {
  return (
    <main className="welcome" aria-labelledby="welcome-heading">
      <div className="welcome-copy">
        <p className="section-kicker">Simple mode · local by default</p>
        <h1 id="welcome-heading" tabIndex={-1}>Add fonts.<br />Get the boards.</h1>
        <p>
          Four fonts per page. Your copy, your casing, your decisions. Then export the high-resolution boards.
        </p>
        <div className="welcome-actions">
          <button type="button" className="primary-button has-icon" onClick={actions.importSources}><InterfaceIcon name="add" />Add Fonts…</button>
          {capabilities?.installedCatalog ? <button type="button" className="quiet-button has-icon" onClick={() => actions.scanInstalled("", false, 0, "simple")}><InterfaceIcon name="library" />Installed Fonts</button> : null}
          <button type="button" className="quiet-button has-icon" onClick={actions.newStudy}><InterfaceIcon name="add" />New Study</button>
          <button type="button" className="quiet-button has-icon" onClick={actions.openStudy}><InterfaceIcon name="folder" />Open Study</button>
        </div>
        <button type="button" className="text-button" onClick={actions.loadSample}>Try it with a sample</button>
      </div>
      <aside className="welcome-proof" aria-label="Product privacy and format summary">
        <span className="proof-number">01</span>
        <strong>Fonts stay local.</strong>
        <p>Sources you choose are read on this computer. No account, upload, analytics, or required network.</p>
        <dl>
          <div><dt>Interactive profile</dt><dd>{capabilities?.renderProfile ?? "Loading Host…"}</dd></div>
          <div><dt>Full formats</dt><dd>{capabilities?.fullFormats.join(" · ") || "TTF · OTF · WOFF · WOFF2"}</dd></div>
          <div><dt>Simple path</dt><dd>Add · Tune · Export</dd></div>
          <div><dt>Advanced path</dt><dd>Studio remains one click away</dd></div>
        </dl>
      </aside>
    </main>
  );
}

const simpleCasingLabels: Record<Candidate["casing"], string> = {
  exact: "As is",
  uppercase: "UPPER",
  lowercase: "lower",
  title: "Title",
  "ap-title": "AP Title",
};

interface SimpleWorkspaceProps {
  readonly session: StudySession;
  readonly dispatch: Dispatch<StudyCommand>;
  readonly fontStates: ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable">;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly actions: AppActions;
  readonly capabilities?: HostCapabilities;
  readonly stressTest: boolean;
  readonly onStressTestChange: (enabled: boolean) => void;
  readonly pageMode: SimplePageMode;
  readonly onPageModeChange: (mode: SimplePageMode) => void;
  readonly bodySampleId: string;
  readonly onBodySampleChange: (sampleId: string) => void;
  readonly fitPolicy: FitPolicy;
  readonly onFitPolicyChange: (policy: FitPolicy) => void;
  readonly includeIndex: boolean;
  readonly onIncludeIndexChange: (enabled: boolean) => void;
  readonly includeSources: boolean;
  readonly onIncludeSourcesChange: (enabled: boolean) => void;
  readonly catalog: InstalledCatalogView;
  readonly catalogBusy: boolean;
  readonly catalogOpenRequest: number;
}

function SimpleCandidateCopy({
  session,
  candidate,
  fontStates,
  stressTest,
  className,
  fit,
  policy = "fit",
  label,
  displayCopy,
}: {
  readonly session: StudySession;
  readonly candidate: Candidate;
  readonly fontStates: ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable">;
  readonly stressTest: boolean;
  readonly className: string;
  readonly fit: "card" | "board" | "body" | "index" | "focus" | "compare";
  readonly policy?: FitPolicy;
  readonly label?: string;
  readonly displayCopy?: string;
}) {
  const face = faceForCandidate(session.document, candidate);
  const recipe = activeRecipe(session);
  const state = fontStates.get(face.id);
  const elementRef = useRef<HTMLParagraphElement>(null);
  const rawCopy = displayCopy ?? simpleDisplayCopy(session, candidate, stressTest);
  const copy = (fit === "board" || fit === "compare") && policy !== "locked-lines" ? rawCopy.replace(/\s*\r?\n\s*/gu, " ") : rawCopy;
  const axisKey = candidate.axes.map((axis) => `${axis.tag}:${axis.value}`).join(";");

  useEffect(() => {
    const element = elementRef.current;
    const container = element?.parentElement;
    if (!element || !container || fit === "focus") return;
    delete element.dataset.naturalFit;
    const configuration = {
      card: { minimum: 12, maximum: 84, width: 0.86, height: 0.68 },
      board: { minimum: 8, maximum: 72, width: 0.84, height: 0.58 },
      body: { minimum: 9, maximum: 36, width: 0.94, height: 0.9 },
      index: { minimum: 7, maximum: 34, width: 0.82, height: 0.48 },
      compare: { minimum: 10, maximum: 96, width: 0.84, height: 0.64 },
    }[fit];
    let frame = 0;
    let cancelled = false;
    const fitCopy = () => {
      if (cancelled) return;
      // UI scale transforms visual bounds; fitting must use untransformed layout pixels before writing CSS sizes.
      const frameWidth = container.clientWidth;
      const frameHeight = container.clientHeight;
      if (frameWidth <= 0 || frameHeight <= 0) return;
      const maximumWidth = frameWidth * configuration.width;
      const maximumHeight = frameHeight * configuration.height;
      const wrappingFit = fit === "body" || (fit === "compare" && policy === "fit");
      element.style.width = wrappingFit ? `${maximumWidth}px` : "max-content";
      element.style.maxWidth = wrappingFit ? `${maximumWidth}px` : "none";
      element.style.whiteSpace = fit === "body" ? "pre-wrap" : (wrappingFit ? "normal" : "pre");
      element.style.overflow = "visible";
      element.style.textOverflow = "clip";
      element.style.transform = "none";
      element.style.transformOrigin = "center center";
      element.style.justifySelf = fit === "compare" ? "center" : "auto";
      let low = configuration.minimum;
      let high = configuration.maximum;
      for (let iteration = 0; iteration < 15; iteration += 1) {
        const size = (low + high) / 2;
        element.style.fontSize = `${size}px`;
        const widthFits = wrappingFit ? element.scrollWidth <= element.clientWidth + 1 : element.scrollWidth <= maximumWidth;
        if (widthFits && element.scrollHeight <= maximumHeight + 1) low = size;
        else high = size;
      }
      const naturalSize = Math.floor(low * 10) / 10;
      element.style.fontSize = `${naturalSize}px`;
      element.dataset.naturalFit = String(naturalSize);
      element.dataset.fitFrame = `${frameWidth}x${frameHeight}`;
      if (element.scrollWidth > maximumWidth) element.style.transform = `scaleX(${Math.max(0.1, maximumWidth / element.scrollWidth)})`;
      if (fit === "body" || ((fit === "board" || fit === "compare") && policy !== "fit")) {
        const group = element.closest(fit === "body" ? ".simple-body-page-list" : (fit === "board" ? ".simple-board" : ".compare-grid"));
        const members = group ? [...group.querySelectorAll<HTMLElement>(`.simple-fitted-${fit}`)] : [];
        const naturalSizes = members.map((member) => Number(member.dataset.naturalFit)).filter(Number.isFinite);
        if (members.length && naturalSizes.length === members.length) {
          const sharedSize = Math.min(...naturalSizes);
          members.forEach((member) => {
            member.style.fontSize = `${sharedSize}px`;
            member.style.transform = "none";
            member.style.justifySelf = fit === "body" ? "start" : "center";
            member.style.transformOrigin = fit === "body" ? "left top" : "center center";
            if (fit === "body") return;
            const available = (member.parentElement?.clientWidth ?? member.scrollWidth) * configuration.width;
            if (member.scrollWidth > available) member.style.transform = `scaleX(${Math.max(0.1, available / member.scrollWidth)})`;
          });
        }
      }
    };
    const schedule = () => {
      delete element.dataset.naturalFit;
      delete element.dataset.fitFrame;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitCopy);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    schedule();
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, [axisKey, candidate.casing, copy, fit, policy, state]);

  return (
    <p
      ref={elementRef}
      className={`${className} simple-fitted-copy simple-fitted-${fit}`}
      style={specimenStyle(session.document, candidate, recipe, state, { fittedSize: fit === "focus" ? 160 : 96 })}
      lang={recipe.language || undefined}
      dir={recipe.direction === "auto" ? "auto" : recipe.direction}
      aria-label={label}
    >
      {copy}
    </p>
  );
}

export function SimpleWorkspace({
  session,
  dispatch,
  fontStates,
  headingRef,
  actions,
  capabilities,
  stressTest,
  onStressTestChange,
  pageMode,
  onPageModeChange,
  bodySampleId,
  onBodySampleChange,
  fitPolicy,
  onFitPolicyChange,
  includeIndex,
  onIncludeIndexChange,
  includeSources,
  onIncludeSourcesChange,
  catalog,
  catalogBusy,
  catalogOpenRequest,
}: SimpleWorkspaceProps) {
  const [showFontControls, setShowFontControls] = useState(false);
  const [showInstalledCatalog, setShowInstalledCatalog] = useState(false);
  const [installedSearch, setInstalledSearch] = useState("");
  const [selectedInstalledFamilyKey, setSelectedInstalledFamilyKey] = useState<string>();
  const [previewCandidateId, setPreviewCandidateId] = useState<string>();
  const [draggedCandidateId, setDraggedCandidateId] = useState<string>();
  const previewDialogRef = useRef<HTMLElement>(null);
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const previewReturnFocusRef = useRef<HTMLElement | null>(null);
  const installedDialogRef = useRef<HTMLElement>(null);
  const installedFamilyBackRef = useRef<HTMLButtonElement>(null);
  const installedReturnFocusRef = useRef<HTMLElement | null>(null);
  const candidates = session.document.candidates;
  const included = includedCandidates(session);
  const boards = useMemo(() => chunked(included, 4), [included]);
  const indexPages = useMemo(() => includeIndex ? chunked(included, SIMPLE_INDEX_PAGE_SIZE) : [], [includeIndex, included]);
  const recipe = activeRecipe(session);
  const copy = session.workspace.copyOverride ?? recipe.copy;
  const bodySample = simpleBodyCopySample(bodySampleId);
  const bodyCopy = session.workspace.copyOverride ?? bodySample.copy;
  const bodyCopyLabel = simpleBodyCopyLabel(session, bodySampleId);
  const bodyCopyEmpty = !bodyCopy.trim();
  const bodyCopyTooLong = bodyCopy.length > SIMPLE_BODY_COPY_LIMIT;
  const bodyCopyInvalid = bodyCopyEmpty || bodyCopyTooLong;
  const pageCount = pageMode === "body" ? included.length : boards.length + indexPages.length;
  const previewCandidate = candidates.find((candidate) => candidate.id === previewCandidateId);
  const studySourceIds = useMemo(() => new Set(session.document.sources.map((source) => source.id)), [session.document.sources]);
  const installedGroups = useMemo(() => groupByFamily(catalog.imports, (item) => item.faces[0]?.family ?? item.source.displayName), [catalog.imports]);
  const selectedInstalledGroup = installedGroups.find((group) => group.key === selectedInstalledFamilyKey);

  const returnToInstalledFamilies = () => {
    const familyKey = selectedInstalledFamilyKey;
    setSelectedInstalledFamilyKey(undefined);
    setTimeout(() => {
      [...document.querySelectorAll<HTMLButtonElement>(".simple-catalog-family [data-family-key]")]
        .find((button) => button.dataset.familyKey === familyKey)
        ?.focus();
    }, 0);
  };

  useEffect(() => {
    if (!previewCandidateId && !showInstalledCatalog) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (previewCandidateId) setPreviewCandidateId(undefined);
      else if (selectedInstalledFamilyKey) returnToInstalledFamilies();
      else setShowInstalledCatalog(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [previewCandidateId, selectedInstalledFamilyKey, showInstalledCatalog]);

  useEffect(() => {
    if (!previewCandidateId) return;
    const dialog = previewDialogRef.current;
    const returnTarget = previewReturnFocusRef.current;
    const focusable = () => dialog ? [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex='-1'])")] : [];
    const focusTimer = setTimeout(() => previewCloseRef.current?.focus(), 0);
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", trapFocus);
      setTimeout(() => (returnTarget?.isConnected ? returnTarget : headingRef.current)?.focus(), 0);
    };
  }, [headingRef, previewCandidateId]);

  useEffect(() => {
    if (!showInstalledCatalog || !selectedInstalledFamilyKey) return;
    const focusTimer = setTimeout(() => installedFamilyBackRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [selectedInstalledFamilyKey, showInstalledCatalog]);

  useEffect(() => {
    if (catalogOpenRequest > 0) setShowInstalledCatalog(true);
  }, [catalogOpenRequest]);

  useEffect(() => {
    if (!showInstalledCatalog) return;
    const dialog = installedDialogRef.current;
    const returnTarget = installedReturnFocusRef.current;
    const focusable = () => dialog ? [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex='-1'])")] : [];
    const focusTimer = setTimeout(() => dialog?.querySelector<HTMLInputElement>('input[type="search"]')?.focus(), 0);
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", trapFocus);
      setTimeout(() => (returnTarget?.isConnected ? returnTarget : headingRef.current)?.focus(), 0);
    };
  }, [headingRef, showInstalledCatalog]);

  const openInstalledCatalog = () => {
    installedReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowInstalledCatalog(true);
    if (!catalog.indexed) actions.scanInstalled("", false, 0, "simple");
  };

  const openCandidatePreview = (candidateId: string) => {
    previewReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPreviewCandidateId(candidateId);
  };

  const closeCandidatePreview = () => setPreviewCandidateId(undefined);

  const setAll = (reviewState: ReviewState) => {
    if (candidates.length) dispatch({ type: "set-review-state", candidateIds: candidates.map((candidate) => candidate.id), reviewState });
  };

  const changePageMode = (mode: SimplePageMode) => {
    onPageModeChange(mode);
    if (mode === "body" && pageMode !== "body" && session.workspace.copyOverride === undefined) {
      dispatch({ type: "set-copy-override", copy: simpleBodyCopySample(bodySampleId || DEFAULT_SIMPLE_BODY_COPY_SAMPLE_ID).copy });
    }
  };

  const chooseBodySample = (sampleId: string) => {
    const sample = simpleBodyCopySample(sampleId);
    onBodySampleChange(sample.id);
    dispatch({ type: "set-copy-override", copy: sample.copy });
  };

  return (
    <main className="simple-workspace" id="workspace" aria-labelledby="workspace-heading">
      <section className="simple-hero">
        <div>
          <p className="section-kicker">Simple mode</p>
          <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>
            {candidates.length
              ? pageMode === "body"
                ? `${included.length} fonts. ${included.length} reading ${included.length === 1 ? "page" : "pages"}.`
                : `${included.length} fonts. ${boards.length} ${boards.length === 1 ? "board" : "boards"}.`
              : pageMode === "body" ? "Add fonts. Read them." : "Add fonts. Get boards."}
          </h1>
          <p>{candidates.length
            ? pageMode === "body"
              ? "One generous reading page per font. Every page shares the same honest text size."
              : "Tune the fonts once. The four-up pages update immediately."
            : "Drop in a folder or choose font files. Nothing is installed or uploaded."}</p>
          {candidates.length ? (
            <nav className="simple-jump-links" aria-label="Simple sections">
              <a href="#simple-pages-heading"><span>View</span><strong>{pageCount} {pageCount === 1 ? "page" : "pages"} ↓</strong></a>
              <a href="#simple-fonts-heading"><span>Tune</span><strong>{candidates.length} fonts ↓</strong></a>
            </nav>
          ) : null}
        </div>
        <div className="simple-hero-actions">
          <button id="simple-add-fonts" type="button" className="quiet-button has-icon" onClick={actions.importSources}><InterfaceIcon name="add" />Add Fonts…</button>
          {capabilities?.installedCatalog ? <button type="button" className="quiet-button has-icon" onClick={openInstalledCatalog}><InterfaceIcon name="library" />Installed Fonts…</button> : null}
          <button type="button" className="primary-button has-icon" disabled={!included.length || !capabilities?.transactionalHandoff || (pageMode === "body" && bodyCopyInvalid)} onClick={() => actions.exportBoards(includeSources)}><InterfaceIcon name="export" />{pageMode === "body" ? "Export Body Copy…" : "Export Boards…"}</button>
        </div>
      </section>

      <section className="simple-page-mode" aria-labelledby="simple-page-mode-heading">
        <div>
          <p className="section-kicker">Choose the page</p>
          <h2 id="simple-page-mode-heading">What are we making?</h2>
        </div>
        <div className="simple-page-mode-choices" role="group" aria-label="Simple page format">
          <button type="button" className={pageMode === "boards" ? "is-active" : ""} aria-pressed={pageMode === "boards"} onClick={() => changePageMode("boards")}>
            <span aria-hidden="true">4×</span><strong>Boards</strong><small>Four fonts per page. Fast visual comparison.</small>
          </button>
          <button type="button" className={pageMode === "body" ? "is-active" : ""} aria-pressed={pageMode === "body"} onClick={() => changePageMode("body")}>
            <span aria-hidden="true">¶</span><strong>Body Copy</strong><small>One font per page. Real reading texture.</small>
          </button>
        </div>
      </section>

      {pageMode === "boards" ? (
        <section className="simple-compose" aria-label="Board copy and export options">
          <label className="simple-copy-field">
            <span>What should the fonts say?</span>
            <textarea
              value={copy}
              onChange={(event) => dispatch({ type: "set-copy-override", copy: event.target.value })}
              placeholder="Your Headline"
              spellCheck={false}
              rows={2}
            />
          </label>
          <div className="simple-options">
            <label title="Temporarily swaps your copy for characters, numerals, currency, and punctuation.">
              <input type="checkbox" checked={stressTest} onChange={(event) => onStressTestChange(event.target.checked)} />
              <span><strong>Stress test</strong><small>{SIMPLE_STRESS_COPY}</small></span>
            </label>
            <label>
              <input type="checkbox" checked={includeIndex} onChange={(event) => onIncludeIndexChange(event.target.checked)} />
              <span><strong>Index pages</strong><small>12 fonts per page</small></span>
            </label>
            <label title="Copies the original source font files into the export folder.">
              <input type="checkbox" checked={includeSources} onChange={(event) => onIncludeSourcesChange(event.target.checked)} />
              <span><strong>Copy source fonts</strong><small>I have permission to share them</small></span>
            </label>
          </div>
          <div className="simple-fit-policy" role="radiogroup" aria-labelledby="simple-fit-policy-heading">
            <p id="simple-fit-policy-heading">Comparison sizing</p>
            {FIT_POLICIES.map((policy) => (
              <label key={policy}>
                <input type="radio" name="simple-fit-policy" value={policy} checked={fitPolicy === policy} onChange={() => onFitPolicyChange(policy)} />
                <span><strong>{policyLabels[policy].label}</strong><small>{policyLabels[policy].detail}</small></span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className="simple-body-compose" aria-label="Body copy and export options">
          <div className="simple-body-editor">
            <div className="simple-body-editor-heading">
              <label htmlFor="simple-body-copy">Reading copy</label>
              <span id="simple-body-copy-count" className={bodyCopyTooLong ? "is-over" : ""}>{bodyCopy.length.toLocaleString("en-US")} / {SIMPLE_BODY_COPY_LIMIT.toLocaleString("en-US")}</span>
            </div>
            <textarea
              id="simple-body-copy"
              value={bodyCopy}
              onChange={(event) => dispatch({ type: "set-copy-override", copy: event.target.value })}
              aria-invalid={bodyCopyInvalid || undefined}
              aria-describedby="simple-body-copy-note simple-body-copy-count"
              spellCheck
              rows={8}
            />
            <p id="simple-body-copy-note">Edit once here; the same copy, casing, font order, styles, and variable axes stay with the Study in Studio.</p>
            {bodyCopyEmpty ? <p className="simple-body-copy-error" role="alert">Add some reading copy to export.</p> : bodyCopyTooLong ? <p className="simple-body-copy-error" role="alert">Shorten this by {(bodyCopy.length - SIMPLE_BODY_COPY_LIMIT).toLocaleString("en-US")} characters to export.</p> : null}
          </div>
          <div className="simple-body-sample-panel">
            <div><p className="section-kicker">Starting copy</p><h3>Pick a texture.</h3></div>
            <div className="simple-body-samples" role="group" aria-label="Body copy samples">
              {SIMPLE_BODY_COPY_SAMPLES.map((sample, sampleIndex) => (
                <button type="button" key={sample.id} className={bodyCopy === sample.copy ? "is-active" : ""} aria-pressed={bodyCopy === sample.copy} onClick={() => chooseBodySample(sample.id)}>
                  <span>{String(sampleIndex + 1).padStart(2, "0")}</span><strong>{sample.label}</strong><small>{sample.detail}</small>
                </button>
              ))}
            </div>
            <div className="simple-body-export-options">
              <div><strong>Matched reading size</strong><small>All pages use the same fitted size, so differences stay honest.</small></div>
              <label title="Copies the original source font files into the export folder.">
                <input type="checkbox" checked={includeSources} onChange={(event) => onIncludeSourcesChange(event.target.checked)} />
                <span><strong>Copy source fonts</strong><small>I have permission to share them</small></span>
              </label>
            </div>
          </div>
        </section>
      )}

      {!candidates.length ? (
        <button type="button" className="simple-empty-drop" onClick={actions.importSources}>
          <span aria-hidden="true">Aa</span>
          <strong>Add font files or a folder</strong>
          <small>OTF · TTF · WOFF · WOFF2 · collections stay metadata-only</small>
        </button>
      ) : (
        <>
          {pageMode === "boards" ? (
            <section className="simple-pages-section" aria-labelledby="simple-pages-heading">
              <div className="simple-section-heading">
                <div><p className="section-kicker">01 · Boards</p><h2 id="simple-pages-heading">Your boards. Already made.</h2></div>
                <button type="button" className="primary-button has-icon" disabled={!included.length || !capabilities?.transactionalHandoff} onClick={() => actions.exportBoards(includeSources)}><InterfaceIcon name="export" />Export {boards.length + indexPages.length} pages…</button>
              </div>
              <div className="simple-page-list">
                {boards.map((board, boardIndex) => (
                  <article className="simple-page-wrap" key={`board-${boardIndex}`}>
                    <header><strong>Board {String(boardIndex + 1).padStart(2, "0")}</strong><span>{board.map((candidate) => String(included.indexOf(candidate) + 1).padStart(2, "0")).join(" · ")} · 5152 × 2160 export</span></header>
                    <div className="simple-board" aria-label={`Board ${boardIndex + 1}`}>
                      {Array.from({ length: 4 }, (_, slot) => {
                        const candidate = board[slot];
                        const palette = SIMPLE_QUADRANTS[slot];
                        return (
                          <div className="simple-quadrant" key={slot} style={{ "--quadrant-bg": palette.background, "--quadrant-ink": palette.text } as CSSProperties}>
                            {candidate ? (
                              <>
                                <SimpleCandidateCopy session={session} candidate={candidate} fontStates={fontStates} stressTest={stressTest} className="simple-quadrant-copy" fit="board" policy={fitPolicy} />
                                <span>{String(included.indexOf(candidate) + 1).padStart(2, "0")} · {sourceForCandidate(session.document, candidate).hint.fileName}</span>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
                {indexPages.map((page, pageIndex) => (
                  <article className="simple-page-wrap" key={`index-${pageIndex}`}>
                    <header><strong>Index {pageIndex + 1} / {indexPages.length}</strong><span>{page.length} fonts · 5152 × 2160 export</span></header>
                    <div className="simple-index-board" aria-label={`Index page ${pageIndex + 1}`}>
                      {page.map((candidate) => {
                        const face = faceForCandidate(session.document, candidate);
                        return (
                          <div className="simple-index-cell" key={candidate.id}>
                            <span>{String(included.indexOf(candidate) + 1).padStart(2, "0")} · {face.family}</span>
                            <SimpleCandidateCopy session={session} candidate={candidate} fontStates={fontStates} stressTest={stressTest} className="simple-index-copy" fit="index" />
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="simple-pages-section" aria-labelledby="simple-pages-heading">
              <div className="simple-section-heading">
                <div><p className="section-kicker">01 · Body Copy</p><h2 id="simple-pages-heading">One font. One reading page.</h2></div>
                <button type="button" className="primary-button has-icon" disabled={!included.length || !capabilities?.transactionalHandoff || bodyCopyInvalid} onClick={() => actions.exportBoards(includeSources)}><InterfaceIcon name="export" />Export {included.length} {included.length === 1 ? "page" : "pages"}…</button>
              </div>
              {included.length ? (
                <div className="simple-body-page-list">
                  {included.map((candidate, candidateIndex) => {
                    const face = faceForCandidate(session.document, candidate);
                    const source = sourceForCandidate(session.document, candidate);
                    const state = fontStates.get(face.id);
                    return (
                      <article className="simple-page-wrap simple-body-page-wrap" key={`body-${candidate.id}`} data-candidate-id={candidate.id}>
                        <header><strong>Reading Page {String(candidateIndex + 1).padStart(2, "0")}</strong><span>{face.family} · 5152 × 2160 export</span></header>
                        <div className="simple-body-page" aria-label={`Body Copy page ${candidateIndex + 1}: ${face.family}`}>
                          <div className="simple-body-page-topline"><span>Body Copy · {String(candidateIndex + 1).padStart(2, "0")} / {String(included.length).padStart(2, "0")}</span><span>{bodyCopyLabel} · 5152 × 2160</span></div>
                          <div className="simple-body-page-meta">
                            <h3 style={specimenStyle(session.document, candidate, recipe, state, { fittedSize: 112 })}>{face.family}</h3>
                            <p>{candidate.label}</p>
                            <p>{source.hint.fileName || face.style}</p>
                            <small>Matched reading size<br />1.48 leading</small>
                          </div>
                          <div className="simple-body-reading">
                            <SimpleCandidateCopy session={session} candidate={candidate} fontStates={fontStates} stressTest={false} className="simple-body-reading-copy" fit="body" displayCopy={simpleBodyDisplayCopy(session, candidate, bodySampleId)} label={`${face.family} body copy`} />
                          </div>
                          <p className="simple-body-page-footer">{session.document.title} · {face.style}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <p className="simple-pages-empty">Every font is skipped. Include at least one below to make a reading page.</p>}
            </section>
          )}

          <section className="simple-font-section" aria-labelledby="simple-fonts-heading">
            <div className="simple-section-heading">
              <div><p className="section-kicker">02 · Fonts</p><h2 id="simple-fonts-heading">Tune only when you need to.</h2></div>
              <div className="simple-section-actions">
                {showFontControls ? <button type="button" className="quiet-button" onClick={() => setAll("keep")}>Include all</button> : null}
                {showFontControls ? <button type="button" className="quiet-button" onClick={() => setAll("reject")}>Skip all</button> : null}
                <button type="button" className="quiet-button has-icon" aria-expanded={showFontControls} onClick={() => setShowFontControls((current) => !current)}><InterfaceIcon name="tune" />{showFontControls ? "Done tuning" : `Tune ${candidates.length} fonts`}</button>
              </div>
            </div>
            {showFontControls ? (
              <div className="simple-font-grid">
                {candidates.map((candidate, candidateIndex) => {
                  const face = faceForCandidate(session.document, candidate);
                  const source = sourceForCandidate(session.document, candidate);
                  const skipped = candidate.reviewState === "reject";
                  return (
                    <article
                      className={`simple-font-card ${skipped ? "is-skipped" : ""}`}
                      key={candidate.id}
                      draggable
                      onDragStart={() => setDraggedCandidateId(candidate.id)}
                      onDragEnd={() => setDraggedCandidateId(undefined)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (!draggedCandidateId || draggedCandidateId === candidate.id) return;
                        dispatch({ type: "move-candidate", candidateId: draggedCandidateId, toIndex: candidateIndex });
                        setDraggedCandidateId(undefined);
                      }}
                    >
                      <header>
                        <span className="simple-font-number">{String(candidateIndex + 1).padStart(2, "0")}</span>
                        <span><strong>{face.family}</strong><small>{source.hint.fileName} · {candidate.label}</small></span>
                        <span className="simple-drag-label">Drag to reorder</span>
                      </header>
                      <button type="button" className="simple-font-preview" onClick={() => openCandidatePreview(candidate.id)} aria-label={`Preview ${face.family} full size`}>
                        <SimpleCandidateCopy session={session} candidate={candidate} fontStates={fontStates} stressTest={stressTest} className="simple-card-copy" fit="card" />
                        <span>Preview full size</span>
                      </button>
                      <div className="simple-casing" role="group" aria-label={`Casing for ${face.family}`}>
                        {TEXT_CASINGS.map((casing) => (
                          <button
                            type="button"
                            key={casing}
                            className={candidate.casing === casing ? "is-active" : ""}
                            aria-pressed={candidate.casing === casing}
                            onClick={() => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { casing } })}
                          >{simpleCasingLabels[casing]}</button>
                        ))}
                      </div>
                      {face.axes.length ? (
                        <div className="simple-axes">
                          {face.axes.map((axis) => {
                            const value = candidate.axes.find((item) => item.tag === axis.tag)?.value ?? axis.defaultValue;
                            return (
                              <label key={axis.tag}>
                                <span><strong>{axis.tag}</strong><output>{Math.round(value)}</output></span>
                                <input type="range" min={axis.minimum} max={axis.maximum} step={(axis.maximum - axis.minimum) / 200 || 1} value={value} onChange={(event) => dispatch({ type: "set-axis", candidateId: candidate.id, tag: axis.tag, value: Number(event.target.value) })} />
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                      <footer>
                        <div className="simple-decision" role="group" aria-label={`Page inclusion for ${face.family}`}>
                          <button type="button" className={!skipped ? "is-active" : ""} aria-pressed={!skipped} onClick={() => dispatch({ type: "set-review-state", candidateIds: [candidate.id], reviewState: "keep" })}>Include</button>
                          <button type="button" className={skipped ? "is-active is-reject" : ""} aria-pressed={skipped} onClick={() => dispatch({ type: "set-review-state", candidateIds: [candidate.id], reviewState: "reject" })}>Skip</button>
                        </div>
                        <div className="simple-order" role="group" aria-label={`Order ${face.family}`}>
                          <button type="button" disabled={candidateIndex === 0} onClick={() => dispatch({ type: "move-candidate", candidateId: candidate.id, toIndex: candidateIndex - 1 })}>Earlier</button>
                          <button type="button" disabled={candidateIndex === candidates.length - 1} onClick={() => dispatch({ type: "move-candidate", candidateId: candidate.id, toIndex: candidateIndex + 1 })}>Later</button>
                          <button type="button" className="remove-font" onClick={() => dispatch({ type: "remove-candidate", candidateId: candidate.id })}>Remove</button>
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <button type="button" className="simple-font-summary" onClick={() => setShowFontControls(true)}>
                <span>{String(candidates.length).padStart(2, "0")}</span>
                <span><strong>{included.length} included · {candidates.length - included.length} skipped</strong><small>Casing, variable axes, order, and inclusion are tucked away until you ask.</small></span>
                <span>Open controls →</span>
              </button>
            )}
          </section>
        </>
      )}

      {previewCandidate ? (
        <div className="simple-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCandidatePreview(); }}>
          <section ref={previewDialogRef} className="simple-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="simple-preview-heading" tabIndex={-1}>
            <header><span><strong id="simple-preview-heading">{faceForCandidate(session.document, previewCandidate).family}</strong><small>{sourceForCandidate(session.document, previewCandidate).hint.fileName}</small></span><button ref={previewCloseRef} type="button" className="quiet-button" onClick={closeCandidatePreview}>Close</button></header>
            <SimpleCandidateCopy session={session} candidate={previewCandidate} fontStates={fontStates} stressTest={stressTest} className="simple-focus-copy" fit="focus" />
          </section>
        </div>
      ) : null}

      {showInstalledCatalog ? (
        <div className="simple-catalog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedInstalledFamilyKey(undefined); setShowInstalledCatalog(false); } }}>
          <section ref={installedDialogRef} className="simple-catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="simple-catalog-heading">
            <header>
              <div><p className="section-kicker">Local font library</p><h2 id="simple-catalog-heading">Choose installed fonts.</h2><p>{catalog.total} matches · {catalog.indexed} indexed{catalog.truncated ? " · 10,000 limit" : ""}</p></div>
              <button type="button" className="quiet-button" onClick={() => { setSelectedInstalledFamilyKey(undefined); setShowInstalledCatalog(false); }}>Close</button>
            </header>
            <form className="simple-catalog-search" onSubmit={(event) => { event.preventDefault(); setSelectedInstalledFamilyKey(undefined); actions.scanInstalled(installedSearch, false, 0, "simple"); }}>
              <label><span className="sr-only">Search installed fonts</span><input autoFocus type="search" value={installedSearch} onChange={(event) => setInstalledSearch(event.target.value)} placeholder="Search family or style" /></label>
              <button type="submit" className="primary-button">Search</button>
              <button type="button" className="quiet-button" onClick={() => { setSelectedInstalledFamilyKey(undefined); actions.scanInstalled(installedSearch, true, 0, "simple"); }}>Rebuild</button>
              {catalogBusy ? <button type="button" className="quiet-button" onClick={actions.cancelCatalog}>Cancel scan</button> : null}
            </form>
            <div className={`simple-catalog-results ${selectedInstalledGroup ? "is-family-detail" : ""}`} aria-label="Installed fonts">
              {selectedInstalledGroup ? (() => {
                const available = selectedInstalledGroup.items.filter((item) => !studySourceIds.has(item.source.id));
                const styleCount = selectedInstalledGroup.items.reduce((count, item) => count + item.faces.length, 0);
                return (
                  <section className="simple-catalog-family-detail" aria-labelledby="simple-catalog-family-heading">
                    <header>
                      <button ref={installedFamilyBackRef} type="button" className="quiet-button" onClick={returnToInstalledFamilies}>← All families</button>
                      <div><p className="section-kicker">Choose styles</p><h3 id="simple-catalog-family-heading">{selectedInstalledGroup.label}</h3><p>{styleCount} {styleCount === 1 ? "style" : "styles"}</p></div>
                      <button type="button" className="primary-button" disabled={!available.length} onClick={() => actions.addCatalogSources(available.map((item) => item.source.id))}>{available.length ? `Add family · ${available.length}` : "Family added"}</button>
                    </header>
                    <div className="simple-catalog-style-grid">
                      {selectedInstalledGroup.items.map((item) => {
                        const added = studySourceIds.has(item.source.id);
                        const styles = item.faces.map((face) => face.style).join(" · ");
                        return <section key={item.source.id}><span><strong>{item.source.displayName}</strong><small>{styles || item.source.hint.format}</small></span><button type="button" disabled={added} onClick={() => actions.addCatalogSources([item.source.id])}>{added ? "Added" : "Add"}</button></section>;
                      })}
                    </div>
                  </section>
                );
              })() : installedGroups.map((group) => {
                const available = group.items.filter((item) => !studySourceIds.has(item.source.id));
                const styleCount = group.items.reduce((count, item) => count + item.faces.length, 0);
                return (
                  <article className="simple-catalog-family" key={group.key}>
                    <header><span><strong>{group.label}</strong><small>{styleCount} {styleCount === 1 ? "style" : "styles"}</small></span><div><button type="button" className="quiet-button" data-family-key={group.key} onClick={() => setSelectedInstalledFamilyKey(group.key)}>Choose styles</button><button type="button" className="quiet-button" disabled={!available.length} onClick={() => actions.addCatalogSources(available.map((item) => item.source.id))}>{available.length ? `Add family · ${available.length}` : "Added"}</button></div></header>
                  </article>
                );
              })}
              {!catalogBusy && !installedGroups.length ? <p className="simple-catalog-empty">No installed fonts match. Try a broader family or style name.</p> : null}
            </div>
            <footer>
              <button type="button" className="quiet-button" disabled={catalog.cursor === 0} onClick={() => { setSelectedInstalledFamilyKey(undefined); actions.scanInstalled(catalog.query, false, Math.max(0, catalog.cursor - 80), "simple"); }}>Previous</button>
              <span>{catalog.total ? `${catalog.cursor + 1}–${Math.min(catalog.cursor + catalog.imports.length, catalog.total)} of ${catalog.total}` : "0 results"}</span>
              <button type="button" className="quiet-button" disabled={catalog.nextCursor === undefined} onClick={() => { setSelectedInstalledFamilyKey(undefined); actions.scanInstalled(catalog.query, false, catalog.nextCursor, "simple"); }}>Next</button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}

interface NavigatorProps {
  readonly session: StudySession;
  readonly index: StudyIndex;
  readonly dispatch: Dispatch<StudyCommand>;
  readonly actions: AppActions;
  readonly mode: NavigatorMode;
  readonly onModeChange: (mode: NavigatorMode) => void;
  readonly catalog: InstalledCatalogView;
  readonly catalogBusy: boolean;
}

export function Navigator({ session, dispatch, actions, mode, onModeChange, catalog, catalogBusy }: NavigatorProps) {
  const [catalogSearch, setCatalogSearch] = useState(catalog.query);
  const [selectedCatalogFamilyKey, setSelectedCatalogFamilyKey] = useState<string>();
  const catalogFamilyBackRef = useRef<HTMLButtonElement>(null);
  const deferredSearch = useDeferredValue(session.workspace.search.trim().toLocaleLowerCase());
  const visibleCandidates = useMemo(() => {
    const reviewFilter = session.workspace.reviewFilter;
    return session.document.candidates.filter((candidate) => {
      if (reviewFilter !== "all" && candidate.reviewState !== reviewFilter) return false;
      if (!deferredSearch) return true;
      const face = faceForCandidate(session.document, candidate);
      return `${face.family} ${face.style} ${candidate.label} ${candidate.tags.join(" ")} ${candidate.notes}`
        .toLocaleLowerCase()
        .includes(deferredSearch);
    });
  }, [deferredSearch, session.document, session.workspace.reviewFilter]);
  const familyGroups = useMemo(() => {
    return groupByFamily(visibleCandidates, (candidate) => faceForCandidate(session.document, candidate).family);
  }, [session.document, visibleCandidates]);
  const catalogGroups = useMemo(() => {
    return groupByFamily(catalog.imports, (imported) => imported.faces[0]?.family ?? imported.source.displayName);
  }, [catalog.imports]);
  const selectedCatalogGroup = catalogGroups.find((group) => group.key === selectedCatalogFamilyKey);
  const studySourceIds = useMemo(() => new Set(session.document.sources.map((source) => source.id)), [session.document.sources]);

  const returnToCatalogFamilies = () => {
    const familyKey = selectedCatalogFamilyKey;
    setSelectedCatalogFamilyKey(undefined);
    requestAnimationFrame(() => {
      [...document.querySelectorAll<HTMLButtonElement>(".catalog-family-card [data-family-key]")]
        .find((button) => button.dataset.familyKey === familyKey)
        ?.focus();
    });
  };

  useEffect(() => {
    if (mode !== "catalog" || !selectedCatalogFamilyKey) return;
    const focusTimer = setTimeout(() => catalogFamilyBackRef.current?.focus(), 0);
    const closeDetail = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      returnToCatalogFamilies();
    };
    window.addEventListener("keydown", closeDetail);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeDetail);
    };
  }, [mode, selectedCatalogFamilyKey]);

  return (
    <aside className="catalog" aria-label="Study navigation">
      <div className="catalog-switcher" role="group" aria-label="Navigator">
        <button type="button" className={mode === "study" ? "is-active" : ""} aria-pressed={mode === "study"} onClick={() => onModeChange("study")}>Study <span>{session.document.candidates.length}</span></button>
        <button type="button" className={mode === "catalog" ? "is-active" : ""} aria-pressed={mode === "catalog"} onClick={() => { onModeChange("catalog"); if (!catalog.indexed) actions.scanInstalled(); }}>Catalog <span>{catalog.total}</span></button>
        <button type="button" className={mode === "sources" ? "is-active" : ""} aria-pressed={mode === "sources"} onClick={() => onModeChange("sources")}>Sources <span>{session.document.sources.length}</span></button>
        <button type="button" className={mode === "sets" ? "is-active" : ""} aria-pressed={mode === "sets"} onClick={() => onModeChange("sets")}>Sets <span>{session.document.comparisonSets.length}</span></button>
      </div>

      {mode === "study" ? (
        <>
          <div className="catalog-tools">
            <label>
              <span className="sr-only">Find Candidates</span>
              <input type="search" value={session.workspace.search} onChange={(event) => dispatch({ type: "set-search", search: event.target.value })} placeholder="Find Candidates" />
            </label>
            <label className="compact-select">
              <span className="sr-only">Review filter</span>
              <select value={session.workspace.reviewFilter} onChange={(event) => dispatch({ type: "set-review-filter", filter: event.target.value as ReviewState | "all" })}>
                <option value="all">All decisions</option>
                {REVIEW_STATES.map((state) => <option value={state} key={state}>{reviewLabels[state]}</option>)}
              </select>
            </label>
          </div>
          <div className="candidate-list" aria-label="Candidates">
            {familyGroups.map((group) => {
              const family = group.label;
              const candidates = group.items;
              const variableCount = candidates.filter((candidate) => faceForCandidate(session.document, candidate).axes.length > 0).length;
              return <section className="family-group" aria-label={`${family} Family Group`} key={group.key}>
                <div className="family-group-heading"><span><strong>{family}</strong><small>{candidates.length} {candidates.length === 1 ? "Candidate" : "Candidates"} · {group.confidence === "exact-metadata" ? "exact metadata" : "normalized metadata"}{variableCount ? ` · ${variableCount} variable` : " · static"}</small></span><button type="button" aria-label={`Compare ${family} family`} onClick={() => dispatch({ type: "set-tray", candidateIds: candidates.slice(0, 4).map((candidate) => candidate.id) })} disabled={candidates.length < 2}>Compare family</button></div>
                {candidates.map((candidate) => {
                  const face = faceForCandidate(session.document, candidate);
                  const selected = candidate.id === session.workspace.selectedCandidateId;
                  const use = activeTypographySystem(session.document).fontUses.find((fontUse) => fontUse.originatingCandidateId === candidate.id);
                  return (
                    <button type="button" key={candidate.id} className={`candidate-row ${selected ? "is-selected" : ""}`} aria-label={`${family} ${candidate.label}, ${reviewLabels[candidate.reviewState]}`} aria-current={selected ? "true" : undefined} onClick={() => dispatch({ type: "select-candidate", candidateId: candidate.id })}>
                      <span className={`review-glyph review-${candidate.reviewState}`} aria-label={reviewLabels[candidate.reviewState]}>{reviewGlyphs[candidate.reviewState]}</span>
                      <span className="candidate-name"><strong>{face.style}</strong><small>{candidate.label}{face.axes.length ? " · Variable" : " · Static"}</small></span>
                      {use ? <span className="role-tag">{roleLabels[use.role]}</span> : null}
                    </button>
                  );
                })}
              </section>;
            })}
            {visibleCandidates.length === 0 ? <p className="empty-note">No Candidates match this view.</p> : null}
          </div>
        </>
      ) : null}

      {mode === "catalog" ? (
        <div className="installed-catalog">
          <form className="catalog-tools catalog-search" onSubmit={(event) => { event.preventDefault(); setSelectedCatalogFamilyKey(undefined); actions.scanInstalled(catalogSearch); }}>
            <label><span className="sr-only">Search installed fonts</span><input type="search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search installed fonts" /></label>
            <div><button type="submit" className="quiet-button">Search</button><button type="button" className="text-button" onClick={() => { setSelectedCatalogFamilyKey(undefined); actions.scanInstalled(catalogSearch, true); }}>Rebuild</button>{catalogBusy ? <button type="button" className="text-button" onClick={actions.cancelCatalog}>Cancel</button> : null}</div>
          </form>
          <p className="catalog-summary" role="status">{catalog.total} {catalog.total === 1 ? "match" : "matches"} · {catalog.indexed} indexed{catalog.truncated ? " · 10,000 limit" : ""}</p>
          <div className="catalog-results" aria-label="Installed font Catalog">
            {selectedCatalogGroup ? (() => {
              const family = selectedCatalogGroup.label;
              const imports = selectedCatalogGroup.items;
              const available = imports.filter((item) => !studySourceIds.has(item.source.id));
              const styleCount = imports.reduce((count, item) => count + item.faces.length, 0);
              return <section className="catalog-family-detail" aria-label={`${family} installed family styles`}>
                <header><button ref={catalogFamilyBackRef} type="button" className="quiet-button" onClick={returnToCatalogFamilies}>← All families</button><span><strong>{family}</strong><small>{styleCount} {styleCount === 1 ? "style" : "styles"}</small></span><button type="button" className="primary-button" aria-label={`Add ${family} family to Study`} disabled={!available.length} onClick={() => actions.addCatalogSources(available.map((item) => item.source.id))}>{available.length ? `Add family · ${styleCount}` : "Family added"}</button></header>
                <div className="catalog-style-list">{imports.map((item) => {
                  const added = studySourceIds.has(item.source.id);
                  const styles = item.faces.map((face) => face.style).join(" · ");
                  return <article className="catalog-source" key={item.source.id}><span><strong>{item.source.displayName}</strong><small>{styles || item.source.hint.format}{item.faces.some((face) => face.axes.length) ? " · Variable" : " · Static"}</small></span><button type="button" disabled={added} aria-label={`${added ? "In Study" : "Add"} ${item.source.displayName}`} onClick={() => actions.addCatalogSources([item.source.id])}>{added ? "Added" : "Add"}</button></article>;
                })}</div>
              </section>;
            })() : catalogGroups.map((group) => {
              const family = group.label;
              const imports = group.items;
              const available = imports.filter((item) => !studySourceIds.has(item.source.id));
              const styleCount = imports.reduce((count, item) => count + item.faces.length, 0);
              return <section className="catalog-family-card" aria-label={`${family} installed family`} key={group.key}>
                <span><strong>{family}</strong><small>{styleCount} {styleCount === 1 ? "style" : "styles"}</small></span>
                <div><button type="button" className="quiet-button" data-family-key={group.key} onClick={() => setSelectedCatalogFamilyKey(group.key)}>Choose styles</button><button type="button" className="quiet-button" aria-label={`Add ${family} family to Study`} disabled={!available.length} onClick={() => actions.addCatalogSources(available.map((item) => item.source.id))}>{available.length ? `Add family · ${styleCount}` : "Added"}</button></div>
              </section>;
            })}
            {!catalog.indexed ? <p className="empty-note">Open the Host-local Catalog to index installed fonts.</p> : catalogGroups.length === 0 ? <p className="empty-note">No installed fonts match this search.</p> : null}
          </div>
          <div className="catalog-pagination"><button type="button" className="quiet-button" disabled={catalog.cursor === 0} onClick={() => { setSelectedCatalogFamilyKey(undefined); actions.scanInstalled(catalog.query, false, Math.max(0, catalog.cursor - 80)); }}>Previous</button><span>{catalog.total ? `${catalog.cursor + 1}–${Math.min(catalog.cursor + catalog.imports.length, catalog.total)} of ${catalog.total}` : "0 results"}</span><button type="button" className="quiet-button" disabled={catalog.nextCursor === undefined} onClick={() => { setSelectedCatalogFamilyKey(undefined); actions.scanInstalled(catalog.query, false, catalog.nextCursor); }}>Next</button></div>
        </div>
      ) : null}

      {mode === "sources" ? (
        <div className="source-list">
          <div className="source-actions">
            <button type="button" className="quiet-button" onClick={actions.importSources}>Import</button>
            <button type="button" className="quiet-button" onClick={() => actions.scanInstalled()}>Installed Catalog</button>
          </div>
          {session.document.sources.map((source) => {
            const binding = bindingForSource(session, source.id);
            const faceCount = session.document.faces.filter((face) => face.sourceId === source.id).length;
            return (
              <article className={`source-row ${binding?.state === "missing" ? "is-missing" : ""}`} key={source.id}>
                <span className="source-state" aria-hidden="true">{binding?.state === "readable" ? "●" : "!"}</span>
                <span><strong>{source.displayName}</strong><small>{binding?.state ?? source.lastKnownState} · {faceCount} {faceCount === 1 ? "Face" : "Faces"}</small></span>
                <button type="button" className="icon-button" aria-label={`Relink ${source.displayName}`} onClick={() => actions.relinkSource(source.id)}>↻</button>
              </article>
            );
          })}
          {session.document.sources.length === 0 ? <p className="empty-note">No Sources yet. Import files or a folder.</p> : null}
        </div>
      ) : null}

      {mode === "sets" ? (
        <div className="source-list">
          <p className="section-kicker">Saved comparisons</p>
          {session.document.comparisonSets.map((set) => (
            <button type="button" className="source-row" key={set.id} onClick={() => { dispatch({ type: "select-comparison", comparisonId: set.id }); dispatch({ type: "set-stage", stage: "compare" }); }}>
              <span className="source-state" aria-hidden="true">{set.candidateIds.length}</span>
              <span><strong>{set.name}</strong><small>{policyLabels[set.policy].label}{set.blind ? " · Blind" : ""}</small></span>
            </button>
          ))}
          {session.document.comparisonSets.length === 0 ? <p className="empty-note">Shortlist 2–4 Candidates, then save a set.</p> : null}
        </div>
      ) : null}
    </aside>
  );
}

interface SpecimenProps {
  readonly session: StudySession;
  readonly candidate: Candidate;
  readonly recipe: Recipe;
  readonly fontStates: ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable">;
  readonly className?: string;
  readonly fittedSize?: number;
  readonly compact?: boolean;
  readonly label?: string;
}

export const Specimen = memo(function Specimen({ session, candidate, recipe, fontStates, className, fittedSize, compact, label }: SpecimenProps) {
  const face = faceForCandidate(session.document, candidate);
  const state = fontStates.get(face.id);
  return (
    <p className={className} style={specimenStyle(session.document, candidate, recipe, state, { fittedSize, compact })} lang={recipe.language || undefined} dir={recipe.direction === "auto" ? "auto" : recipe.direction} aria-label={label ?? `${face.family} ${candidate.label}. ${reviewLabels[candidate.reviewState]}. ${recipe.name}. ${rendererStatusLabel(state)}`}>
      {specimenCopy(candidate, recipe, session.workspace.copyOverride)}
    </p>
  );
});

interface WorkspaceProps {
  readonly session: StudySession;
  readonly index: StudyIndex;
  readonly dispatch: Dispatch<StudyCommand>;
  readonly fontStates: ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable">;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly actions: AppActions;
  readonly capabilities?: HostCapabilities;
  readonly comparisonPolicy: FitPolicy;
  readonly onComparisonPolicyChange: (policy: FitPolicy) => void;
}

function ReviewWorkspace({ session, dispatch, fontStates, headingRef }: WorkspaceProps) {
  const recipe = activeRecipe(session);
  const selected = session.document.candidates.find((candidate) => candidate.id === session.workspace.selectedCandidateId);
  const [bulkSelection, setBulkSelection] = useState<ReadonlySet<string>>(() => new Set());
  const visible = session.document.candidates.filter((candidate) => {
    if (session.workspace.reviewFilter !== "all" && candidate.reviewState !== session.workspace.reviewFilter) return false;
    const query = session.workspace.search.trim().toLocaleLowerCase();
    if (!query) return true;
    const face = faceForCandidate(session.document, candidate);
    return `${face.family} ${candidate.label} ${candidate.tags.join(" ")}`.toLocaleLowerCase().includes(query);
  });
  const unreviewed = session.document.candidates.filter((candidate) => candidate.reviewState === "unreviewed").length;

  if (!selected) {
    return (
      <main className="workspace workspace-empty" id="workspace" aria-labelledby="workspace-heading">
        <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>Import a Source to begin</h1>
        <p>New Candidates arrive Unreviewed. Nothing is installed or moved.</p>
      </main>
    );
  }
  const face = faceForCandidate(session.document, selected);
  const state = fontStates.get(face.id);
  return (
    <main className={`workspace review-workspace layout-${session.workspace.reviewLayout}`} id="workspace" aria-labelledby="workspace-heading">
      <div className="review-topline">
        <div><p className="section-kicker">{unreviewed} need review · Recipe: {recipe.name}</p><h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>{face.family} <span>{selected.label}</span></h1></div>
        <div className="segmented-control" role="group" aria-label="Review layout">
          {(["contact-sheet", "focus", "waterfall"] as const).map((layout) => <button type="button" key={layout} className={session.workspace.reviewLayout === layout ? "is-active" : ""} aria-pressed={session.workspace.reviewLayout === layout} onClick={() => dispatch({ type: "set-review-layout", layout })}>{layout === "contact-sheet" ? "Sheet" : layout === "focus" ? "Focus" : "Waterfall"}</button>)}
        </div>
      </div>

      {session.workspace.reviewLayout === "contact-sheet" ? (
        <div className="specimen-card-grid" aria-label="Contact Sheet">
          {visible.map((candidate) => {
            const candidateFace = faceForCandidate(session.document, candidate);
            const checked = bulkSelection.has(candidate.id);
            return (
              <article className={`specimen-card ${candidate.id === selected.id ? "is-selected" : ""}`} key={candidate.id}>
                <label className="bulk-check"><input type="checkbox" checked={checked} onChange={() => setBulkSelection((current) => { const next = new Set(current); checked ? next.delete(candidate.id) : next.add(candidate.id); return next; })} /><span className="sr-only">Select {candidateFace.family} {candidate.label} for bulk action</span></label>
                <button type="button" className="specimen-select" onClick={() => dispatch({ type: "select-candidate", candidateId: candidate.id })}>
                  <Specimen session={session} candidate={candidate} recipe={recipe} fontStates={fontStates} compact />
                  <span className="specimen-card-meta"><strong>{candidateFace.family}</strong><small>{candidate.label}</small></span>
                </button>
                <div className="card-actions" role="group" aria-label={`Review ${candidateFace.family} ${candidate.label}`}>
                  {REVIEW_STATES.map((reviewState) => <button type="button" key={reviewState} className={candidate.reviewState === reviewState ? "is-active" : ""} aria-label={`${reviewLabels[reviewState]} ${candidateFace.family} ${candidate.label}`} aria-pressed={candidate.reviewState === reviewState} onClick={() => dispatch({ type: "set-review-state", candidateIds: [candidate.id], reviewState })}><span aria-hidden="true">{reviewGlyphs[reviewState]}</span><small>{reviewLabels[reviewState]}</small></button>)}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {session.workspace.reviewLayout === "focus" ? (
        <section className={`specimen-field background-${recipe.background}`}>
          <Specimen session={session} candidate={selected} recipe={recipe} fontStates={fontStates} />
          <p className="render-profile"><span>{rendererStatusLabel(state)}</span><span>{face.axes.length ? selected.axes.map((axis) => `${axis.tag} ${axis.value}`).join(" · ") : "Static Face"}</span></p>
        </section>
      ) : null}

      {session.workspace.reviewLayout === "waterfall" ? (
        <section className="waterfall" aria-label={`${face.family} size waterfall`}>
          {[96, 72, 48, 32, 24, 16, 11].map((size) => <div key={size}><span>{size}px</span><Specimen session={session} candidate={selected} recipe={recipe} fontStates={fontStates} fittedSize={size} /></div>)}
        </section>
      ) : null}

      {bulkSelection.size ? (
        <div className="bulk-bar" role="region" aria-label="Bulk action preview"><strong>{bulkSelection.size} selected</strong><span>Action applies to selected Candidates. Undo available.</span>{(["keep", "maybe", "reject", "unreviewed"] as const).map((reviewState) => <button type="button" key={reviewState} onClick={() => { dispatch({ type: "set-review-state", candidateIds: [...bulkSelection], reviewState }); setBulkSelection(new Set()); }}>{reviewLabels[reviewState]}</button>)}</div>
      ) : null}

      <div className="review-controls" role="group" aria-label={`Review ${face.family} ${selected.label}`}>
        {REVIEW_STATES.map((reviewState) => <button type="button" key={reviewState} className={selected.reviewState === reviewState ? "is-active" : ""} aria-pressed={selected.reviewState === reviewState} onClick={() => dispatch({ type: "set-review-state", candidateIds: [selected.id], reviewState })}><span>{reviewGlyphs[reviewState]}</span>{reviewLabels[reviewState]}<kbd>{reviewState === "keep" ? "1" : reviewState === "maybe" ? "2" : reviewState === "reject" ? "3" : "0"}</kbd></button>)}
      </div>
    </main>
  );
}

function CompareWorkspace({ session, dispatch, fontStates, headingRef, comparisonPolicy: policy, onComparisonPolicyChange }: WorkspaceProps) {
  const recipe = activeRecipe(session);
  const activeSet = session.workspace.activeComparisonId
    ? session.document.comparisonSets.find((set) => set.id === session.workspace.activeComparisonId)
    : undefined;
  const [blind, setBlind] = useState(activeSet?.blind ?? false);
  const [revealed, setRevealed] = useState(activeSet?.revealed ?? false);
  useEffect(() => {
    setBlind(activeSet?.blind ?? false);
    setRevealed(activeSet?.revealed ?? false);
  }, [activeSet?.blind, activeSet?.id, activeSet?.revealed]);
  const candidates = session.workspace.trayIds.map((id) => session.document.candidates.find((candidate) => candidate.id === id)).filter((candidate): candidate is Candidate => Boolean(candidate));
  const copy = session.workspace.copyOverride ?? recipe.copy;
  const move = (index: number, delta: number) => {
    const next = [...session.workspace.trayIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    dispatch({ type: "set-tray", candidateIds: next });
  };
  const save = () => {
    if (candidates.length < 2) return;
    const comparison: ComparisonSet = {
      id: activeSet?.id ?? `comparison:${globalThis.crypto.randomUUID()}`,
      name: activeSet?.name ?? `Comparison ${session.document.comparisonSets.length + 1}`,
      candidateIds: candidates.map((candidate) => candidate.id),
      recipeId: recipe.id,
      policy,
      blind,
      blindSeed: activeSet?.blindSeed ?? globalThis.crypto.randomUUID(),
      revealed,
      rationale: activeSet?.rationale ?? "",
    };
    dispatch({ type: "upsert-comparison", comparison });
  };
  return (
    <main className="workspace compare-workspace" id="workspace" aria-labelledby="workspace-heading">
      <div className="workspace-heading-row"><div><p className="section-kicker">Decision surface · {candidates.length}/4</p><h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>{activeSet?.name ?? "Unsaved comparison"}</h1></div><button type="button" className="quiet-button" onClick={save} disabled={candidates.length < 2}>Save set</button></div>
      <div className="compare-toolbar">
        <div className="policy-control" role="radiogroup" aria-label="Comparison policy">
          {FIT_POLICIES.map((item) => <label key={item}><input type="radio" name="fit-policy" value={item} checked={policy === item} onChange={() => onComparisonPolicyChange(item)} /><span><strong>{policyLabels[item].label}</strong><small>{policyLabels[item].detail}</small></span></label>)}
        </div>
        <label className="blind-toggle"><input type="checkbox" checked={blind} onChange={(event) => { setBlind(event.target.checked); setRevealed(false); }} />Blind comparison</label>
        {blind ? <button type="button" className="quiet-button" onClick={() => setRevealed(true)} disabled={revealed}>{revealed ? "Revealed" : "Reveal identity"}</button> : null}
      </div>
      {candidates.length >= 2 ? (
        <div className={`compare-grid compare-${candidates.length}`}>
          {candidates.map((candidate, index) => {
            const face = faceForCandidate(session.document, candidate);
            const hidden = blind && !revealed;
            return (
              <article className="compare-card" key={candidate.id}>
                <div className="compare-meta"><strong>{hidden ? `Candidate ${String.fromCharCode(65 + index)}` : face.family}</strong><span>{hidden ? "Identity hidden" : candidate.label}</span></div>
                {policy === "nominal" ? <Specimen className="compare-copy" session={session} candidate={candidate} recipe={recipe} fontStates={fontStates} fittedSize={recipe.size} label={`${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`}. ${policyLabels[policy].label}.`} /> : <SimpleCandidateCopy className="compare-copy" session={session} candidate={candidate} fontStates={fontStates} stressTest={false} fit="compare" policy={policy} label={`${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`}. ${policyLabels[policy].label}.`} />}
                <div className="compare-footer"><span>{policyLabels[policy].label}</span><span className="reorder-buttons"><button type="button" aria-label={`Move ${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`} left`} onClick={() => move(index, -1)} disabled={index === 0}>←</button><button type="button" aria-label={`Move ${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`} right`} onClick={() => move(index, 1)} disabled={index === candidates.length - 1}>→</button><button type="button" aria-label={`Remove ${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`} from comparison`} onClick={() => dispatch({ type: "toggle-tray", candidateId: candidate.id })}>Remove</button></span></div>
              </article>
            );
          })}
        </div>
      ) : <div className="workspace-empty"><h2>Add at least two Candidates</h2><p>Use Space in Review or Add to Compare in Inspector.</p></div>}
    </main>
  );
}

function candidateForRole(session: StudySession, role: SystemRole): Candidate | undefined {
  const use = activeTypographySystem(session.document).fontUses.find((fontUse) => fontUse.role === role);
  return use?.originatingCandidateId ? session.document.candidates.find((candidate) => candidate.id === use.originatingCandidateId) : undefined;
}

function SystemWorkspace({ session, dispatch, fontStates, headingRef }: WorkspaceProps) {
  const system = activeTypographySystem(session.document);
  const recipes = session.document.recipes;
  const sceneRecipe = recipes.find((recipe) => recipe.name.toLocaleLowerCase().includes(session.workspace.activeScene)) ?? activeRecipe(session);
  return (
    <main className="workspace system-workspace" id="workspace" aria-labelledby="workspace-heading">
      <div className="workspace-heading-row"><div><p className="section-kicker">Typography System · {system.fontUses.length}/{SYSTEM_ROLES.length} Roles</p><h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>{system.name}</h1></div><label className="compact-select">Scene <select value={session.workspace.activeScene} onChange={(event) => dispatch({ type: "set-scene", scene: event.target.value as typeof session.workspace.activeScene })}>{["title", "logline", "body", "data", "legal"].map((scene) => <option value={scene} key={scene}>{scene[0].toUpperCase() + scene.slice(1)}</option>)}</select></label></div>
      <section className={`deck-scene scene-${session.workspace.activeScene}`} aria-label={`${session.workspace.activeScene} deck Scene`}>
        {(["display", "body", "data", "caption", "legal", "utility"] as const).map((role) => {
          const candidate = candidateForRole(session, role);
          if (!candidate) return role === "display" || role === "body" ? <div className={`scene-slot role-${role}`} key={role}><span>{roleLabels[role]} unassigned</span></div> : null;
          return <Specimen key={role} className={`scene-slot role-${role}`} session={session} candidate={candidate} recipe={sceneRecipe} fontStates={fontStates} compact={role !== "display"} label={`${roleLabels[role]} Role. ${faceForCandidate(session.document, candidate).family} ${candidate.label}.`} />;
        })}
      </section>
      <div className="role-grid">
        {SYSTEM_ROLES.map((role, index) => {
          const candidate = candidateForRole(session, role);
          const face = candidate ? faceForCandidate(session.document, candidate) : undefined;
          return <article className="role-card" key={role}><span className="role-number">{String(index + 1).padStart(2, "0")}</span><h2>{roleLabels[role]}</h2>{candidate && face ? <><Specimen className="role-specimen" session={session} candidate={candidate} recipe={sceneRecipe} fontStates={fontStates} compact /><p>{face.family} · {candidate.label}</p></> : <p className="empty-note">Select a Candidate, then assign this Role in Inspector.</p>}</article>;
        })}
      </div>
    </main>
  );
}

function HandoffWorkspace({ session, dispatch, headingRef, actions, capabilities }: WorkspaceProps) {
  const system = activeTypographySystem(session.document);
  const missingRoles = ["display", "body"].filter((role) => !system.fontUses.some((fontUse) => fontUse.role === role));
  const missingSources = session.document.sources.filter((source) => bindingForSource(session, source.id)?.state !== "readable");
  const preferences = session.document.handoff;
  const update = (patch: Partial<HandoffPreferences>) => dispatch({ type: "set-handoff", handoff: { ...preferences, ...patch } });
  const toggleOutput = (output: HandoffPreferences["outputs"][number]) => update({ outputs: preferences.outputs.includes(output) ? preferences.outputs.filter((item) => item !== output) : [...preferences.outputs, output] });
  const blockers = missingRoles.length + (!capabilities?.transactionalHandoff ? 1 : 0);
  return (
    <main className="workspace handoff-workspace" id="workspace" aria-labelledby="workspace-heading">
      <div className="workspace-heading-row"><div><p className="section-kicker">Preflight · {blockers} blockers · {missingSources.length} cautions</p><h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>A handoff that can stand alone</h1></div><button type="button" className="primary-button" disabled={blockers > 0 || preferences.outputs.length === 0} onClick={() => actions.exportHandoff(preferences.includeSources)}>Export Handoff</button></div>
      <div className="handoff-columns">
        <section className="handoff-panel"><p className="section-kicker">1 · Profile</p><label className="field-label"><span>Audience</span><select value={preferences.profile} onChange={(event) => update({ profile: event.target.value as HandoffPreferences["profile"] })}><option value="internal">Internal review</option><option value="client">Client review</option><option value="designer">Designer handoff</option><option value="technical">Technical proof</option></select></label><p className="handoff-note">Profile changes required evidence. It never changes your typography decisions.</p></section>
        <section className="handoff-panel"><p className="section-kicker">2 · Preflight</p><div className="handoff-list"><article><span className={`check-mark ${missingRoles.length ? "" : "is-ready"}`}>{missingRoles.length ? "!" : "✓"}</span><div><h2>Required Roles</h2><p>{missingRoles.length ? `Assign ${missingRoles.map((role) => roleLabels[role as SystemRole]).join(" and ")}.` : "Display and Body are assigned."}</p></div></article><article><span className={`check-mark ${missingSources.length ? "" : "is-ready"}`}>{missingSources.length ? "!" : "✓"}</span><div><h2>Source health</h2><p>{missingSources.length ? `${missingSources.length} Sources are missing or limited. Decisions remain intact.` : "All Sources are locally bound."}</p></div></article><article><span className={`check-mark ${capabilities?.transactionalHandoff ? "is-ready" : ""}`}>{capabilities?.transactionalHandoff ? "✓" : "!"}</span><div><h2>Transactional export</h2><p>{capabilities?.transactionalHandoff ? "Host will stage, verify, checksum, then commit." : "Browser development mode cannot produce the full bundle."}</p></div></article></div></section>
        <section className="handoff-panel"><p className="section-kicker">3 · Outputs</p><div className="output-grid">{(["review-png", "compare-png", "system-png", "pdf", "summary", "json", "csv"] as const).map((output) => <label key={output}><input type="checkbox" checked={preferences.outputs.includes(output)} onChange={() => toggleOutput(output)} /><span>{output.replaceAll("-", " ")}</span></label>)}</div></section>
        <section className="handoff-panel source-permission"><p className="section-kicker">4 · Source copies</p><label><input type="checkbox" checked={preferences.includeSources} onChange={(event) => update({ includeSources: event.target.checked })} />Include original Source files</label><p>{preferences.includeSources ? "On by default for this internal tool. Turn it off before sharing outside your licensed team." : "Source files will not be copied."}</p></section>
      </div>
    </main>
  );
}

export function Workspace(props: WorkspaceProps) {
  switch (props.session.workspace.stage) {
    case "review": return <ReviewWorkspace {...props} />;
    case "compare": return <CompareWorkspace {...props} />;
    case "system": return <SystemWorkspace {...props} />;
    case "handoff": return <HandoffWorkspace {...props} />;
  }
}

interface InspectorProps {
  readonly session: StudySession;
  readonly dispatch: Dispatch<StudyCommand>;
  readonly fontStates: ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable">;
  readonly actions: AppActions;
  readonly blindIdentityHidden: boolean;
}

export function Inspector({ session, dispatch, fontStates, actions, blindIdentityHidden }: InspectorProps) {
  const candidate = session.document.candidates.find((item) => item.id === session.workspace.selectedCandidateId);
  if (!candidate) return <aside className="inspector" aria-label="Inspector"><div className="inspector-title"><p className="section-kicker">Inspect</p><h2>No selection</h2><p>Choose a Candidate to see exact settings.</p></div></aside>;
  const face = faceForCandidate(session.document, candidate);
  const source = sourceForCandidate(session.document, candidate);
  const binding = bindingForSource(session, source.id);
  const use = activeTypographySystem(session.document).fontUses.find((fontUse) => fontUse.originatingCandidateId === candidate.id);
  const [notes, setNotes] = useState(candidate.notes);
  const [rationale, setRationale] = useState(candidate.rationale);
  const [tags, setTags] = useState(candidate.tags.join(", "));
  const [probe, setProbe] = useState("Hamburgefontsiv 0123456789");
  if (blindIdentityHidden) {
    return <aside className="inspector" aria-label="Inspector"><div className="inspector-title"><p className="section-kicker">Blind session</p><h2>Identity hidden</h2><p>Reveal the comparison before inspecting Source or Face metadata.</p></div></aside>;
  }
  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="inspector-title"><p className="section-kicker">Candidate</p><h2>{face.family}</h2><p>{candidate.label} · Face {face.faceIndex}</p></div>
      <label className="field-label"><span>Instance label</span><input value={candidate.label} onChange={(event) => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { label: event.target.value } })} /></label>
      <label className="field-label"><span>Role</span><select value={use?.role ?? ""} onChange={(event) => dispatch({ type: "assign-role", candidateId: candidate.id, role: (event.target.value || undefined) as SystemRole | undefined })}><option value="">Unassigned</option>{SYSTEM_ROLES.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select><small>Role creates a distinct Font Use. Candidate remains unchanged.</small></label>
      <div className="inspector-actions"><button type="button" className="quiet-button" onClick={() => dispatch({ type: "toggle-tray", candidateId: candidate.id })}>{session.workspace.trayIds.includes(candidate.id) ? "Remove from Compare" : "Add to Compare"}</button><button type="button" className="quiet-button" onClick={() => dispatch({ type: "duplicate-candidate", candidateId: candidate.id })}>Duplicate instance</button></div>
      {face.namedInstances.length ? <label className="field-label"><span>Named instance</span><select value="" onChange={(event) => { const instance = face.namedInstances.find((item) => item.name === event.target.value); instance?.coordinates.forEach((axis) => dispatch({ type: "set-axis", candidateId: candidate.id, tag: axis.tag, value: axis.value })); }}><option value="">Custom</option>{face.namedInstances.map((instance) => <option key={instance.name}>{instance.name}</option>)}</select></label> : null}
      {face.axes.map((axis) => { const value = candidate.axes.find((item) => item.tag === axis.tag)?.value ?? axis.defaultValue; return <label className="axis-control" key={axis.tag}><span><strong>{axis.name}</strong><code>{axis.tag}</code><output>{Math.round(value * 100) / 100}</output></span><input type="range" min={axis.minimum} max={axis.maximum} step={(axis.maximum - axis.minimum) / 200 || 1} value={value} onChange={(event) => dispatch({ type: "set-axis", candidateId: candidate.id, tag: axis.tag, value: Number(event.target.value) })} /><small>{axis.minimum} · default {axis.defaultValue} · {axis.maximum}</small></label>; })}
      {face.features.length ? <fieldset className="feature-list"><legend>OpenType features</legend>{face.features.map((feature) => { const enabled = candidate.features.find((item) => item.tag === feature.tag)?.enabled ?? feature.defaultEnabled; return <label key={feature.tag}><input type="checkbox" checked={enabled} onChange={(event) => dispatch({ type: "set-feature", candidateId: candidate.id, tag: feature.tag, enabled: event.target.checked })} /><span>{feature.name}<code>{feature.tag}</code></span></label>; })}</fieldset> : null}
      <label className="field-label"><span>Casing</span><select value={candidate.casing} onChange={(event) => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { casing: event.target.value as Candidate["casing"] } })}><option value="exact">Exact</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option><option value="title">Title Case</option><option value="ap-title">AP Title Case</option></select></label>
      <label className="field-label"><span>Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} onBlur={() => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { tags: tags.split(",") } })} placeholder="quiet, editorial" /></label>
      <label className="field-label"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { notes } })} rows={3} /></label>
      <label className="field-label"><span>Rationale</span><textarea value={rationale} onChange={(event) => setRationale(event.target.value)} onBlur={() => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { rationale } })} rows={3} /></label>
      <details className="inspector-details"><summary>Characters & evidence</summary><label className="field-label"><span>Probe text</span><input value={probe} onChange={(event) => setProbe(event.target.value)} /></label><p className="character-probe" style={specimenStyle(session.document, candidate, activeRecipe(session), fontStates.get(face.id), { fittedSize: 28 })}>{probe}</p><p className="evidence-note">{rendererStatusLabel(fontStates.get(face.id))}. Coverage level: {face.coverage.evidenceLevel}. Visible output alone does not prove language support or fallback.</p></details>
      <details className="inspector-details"><summary>Source & Face</summary><dl className="facts"><div><dt>Source</dt><dd>{source.displayName}<small>{source.hint.format} · {source.hint.fileSize ? `${Math.round(source.hint.fileSize / 1_024)} KB` : "size unknown"}</small></dd></div><div><dt>Binding</dt><dd>{binding?.state ?? "missing"}<small>{binding?.rendererSupport ?? "unsupported"}</small></dd></div><div><dt>Face</dt><dd>{face.postScriptName || `${face.family} ${face.style}`}<small>collection index {face.faceIndex}</small></dd></div><div><dt>Scripts</dt><dd>{face.coverage.scripts.join(", ") || "Not inspected"}<small>{face.coverage.supportedCodePointCount || "Unknown"} code points</small></dd></div></dl><p className="evidence-note">Metadata reported by the font. Confirm the actual licence before redistribution.</p><div className="inspector-actions"><button type="button" className="quiet-button" onClick={() => actions.relinkSource(source.id)}>Relink…</button><button type="button" className="quiet-button" onClick={() => actions.revealSource(source.id)}>Show in file manager</button></div></details>
    </aside>
  );
}

interface TrayProps {
  readonly session: StudySession;
  readonly dispatch: Dispatch<StudyCommand>;
}

export function Tray({ session, dispatch }: TrayProps) {
  const candidates = session.workspace.trayIds.map((id) => session.document.candidates.find((candidate) => candidate.id === id)).filter((candidate): candidate is Candidate => Boolean(candidate));
  return (
    <footer className="tray" aria-label="Comparison tray"><div className="tray-label"><span>{candidates.length}/4</span><strong>Compare</strong></div><div className="tray-items">{candidates.map((candidate) => { const face = faceForCandidate(session.document, candidate); return <div className="tray-item" key={candidate.id}><button type="button" className="tray-select" onClick={() => dispatch({ type: "select-candidate", candidateId: candidate.id })}><span aria-hidden="true">{reviewGlyphs[candidate.reviewState]}</span><span><strong>{face.family}</strong><small>{candidate.label}</small></span><span className="sr-only">{reviewLabels[candidate.reviewState]}</span></button><button type="button" className="tray-remove" aria-label={`Remove ${face.family} ${candidate.label} from comparison`} onClick={() => dispatch({ type: "toggle-tray", candidateId: candidate.id })}>×</button></div>; })}{candidates.length === 0 ? <p className="empty-note">Press Space to shortlist selected Candidate.</p> : null}</div><button type="button" className="open-compare" disabled={candidates.length < 2} onClick={() => dispatch({ type: "set-stage", stage: "compare" })}>Open Compare <span aria-hidden="true">↗</span></button></footer>
  );
}
