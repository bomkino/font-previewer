import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
} from "react";
import {
  applyStudyCommand,
  bindingForSource,
  faceForCandidate,
  parseRecoverySnapshot,
  serializeRecoverySnapshot,
  STAGES,
  SYSTEM_ROLES,
  type Candidate,
  type Stage,
  type StudySession,
  type StudyCommand,
  type SystemRole,
} from "./domain.js";
import { createFixtureSession } from "./fixture.js";
import { getHostPort } from "./host-bridge.js";
import type { HostRequest, HostResponse, MenuCommand } from "./protocol.js";

const RECOVERY_KEY = "font-previewer:p1:study";
const RELOAD_KEY = "font-previewer:p1:reload-pending";

const stageLabels: Record<Stage, string> = {
  review: "Review",
  compare: "Compare",
  system: "System",
  handoff: "Handoff",
};

const roleLabels: Record<SystemRole, string> = {
  display: "Display",
  text: "Text",
  caption: "Caption",
  mono: "Mono",
};

function loadInitialStudy(): { study: StudySession; recovered: boolean } {
  const stored = window.localStorage.getItem(RECOVERY_KEY);
  if (!stored) return { study: createFixtureSession(), recovered: false };
  try {
    return { study: parseRecoverySnapshot(stored), recovered: true };
  } catch {
    window.localStorage.removeItem(RECOVERY_KEY);
    return { study: createFixtureSession(), recovered: false };
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function candidateLabel(study: StudySession, candidate: Candidate): string {
  const face = faceForCandidate(study, candidate);
  return `${face.family} ${candidate.label}`;
}

function reviewGlyph(state: Candidate["reviewState"]): string {
  return { unreviewed: "○", keep: "+", maybe: "?", reject: "×" }[state];
}

interface CatalogProps {
  study: StudySession;
  dispatch: Dispatch<StudyCommand>;
}

function Catalog({ study, dispatch }: CatalogProps) {
  const [mode, setMode] = useState<"study" | "sources">("study");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>();

  const visibleCandidates = study.candidates.filter((candidate) => {
    const face = faceForCandidate(study, candidate);
    const matchesSource = !sourceFilter || face.sourceId === sourceFilter;
    const haystack = `${face.family} ${candidate.label}`.toLocaleLowerCase();
    return matchesSource && haystack.includes(query.trim().toLocaleLowerCase());
  });

  return (
    <aside className="catalog" aria-label="Study and Sources navigation">
      <div className="catalog-switcher" role="group" aria-label="Navigator">
        <button
          type="button"
          className={mode === "study" ? "is-active" : ""}
          aria-pressed={mode === "study"}
          onClick={() => setMode("study")}
        >
          Study <span>{study.candidates.length}</span>
        </button>
        <button
          type="button"
          className={mode === "sources" ? "is-active" : ""}
          aria-pressed={mode === "sources"}
          onClick={() => setMode("sources")}
        >
          Sources <span>{study.sources.length}</span>
        </button>
      </div>

      {mode === "sources" ? (
        <div className="source-list">
          <p className="section-kicker">Host-local bindings</p>
          {study.sources.map((source) => {
            const binding = bindingForSource(study, source.id);
            const count = study.candidates.filter(
              (candidate) => faceForCandidate(study, candidate).sourceId === source.id,
            ).length;
            return (
              <button
                type="button"
                className={`source-row ${binding?.state === "missing" ? "is-missing" : ""}`}
                key={source.id}
                onClick={() => {
                  setSourceFilter(source.id);
                  setMode("study");
                }}
              >
                <span className="source-state" aria-hidden="true">
                  {binding?.state === "missing" ? "!" : "●"}
                </span>
                <span>
                  <strong>{source.displayName}</strong>
                  <small>
                    {binding?.state === "missing" ? "Missing binding" : "Available"} · {count}{" "}
                    Candidates
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="catalog-tools">
            <label>
              <span className="sr-only">Find a Candidate</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a Candidate"
              />
            </label>
            {sourceFilter ? (
              <button type="button" className="clear-filter" onClick={() => setSourceFilter(undefined)}>
                Clear Source filter
              </button>
            ) : null}
          </div>
          <div className="candidate-list" aria-label="Candidates">
            {visibleCandidates.map((candidate) => {
              const face = faceForCandidate(study, candidate);
              const fontUse = study.fontUses.find(
                (item) => item.originatingCandidateId === candidate.id,
              );
              const selected = candidate.id === study.selectedCandidateId;
              return (
                <button
                  type="button"
                  key={candidate.id}
                  className={`candidate-row ${selected ? "is-selected" : ""}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => dispatch({ type: "select-candidate", candidateId: candidate.id })}
                >
                  <span
                    className={`review-glyph review-${candidate.reviewState}`}
                    aria-label={candidate.reviewState}
                  >
                    {reviewGlyph(candidate.reviewState)}
                  </span>
                  <span className="candidate-name">
                    <strong>{face.family}</strong>
                    <small>
                      {candidate.label}
                      {candidate.axes.length ? " · Variable instance" : ""}
                    </small>
                  </span>
                  {fontUse ? (
                    <span className="role-tag">{roleLabels[fontUse.role]}</span>
                  ) : null}
                </button>
              );
            })}
            {visibleCandidates.length === 0 ? (
              <p className="empty-note">No Candidates match this view.</p>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}

interface WorkspaceProps {
  study: StudySession;
  selected: Candidate;
  dispatch: Dispatch<StudyCommand>;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

function Workspace({ study, selected, dispatch, headingRef }: WorkspaceProps) {
  const trayCandidates = study.trayIds
    .map((id) => study.candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Candidate => Boolean(candidate));
  const unreviewedCount = study.candidates.filter(
    (candidate) => candidate.reviewState === "unreviewed",
  ).length;
  const missingCount = study.bindings.filter((binding) => binding.state === "missing").length;
  const assignedRoleCount = SYSTEM_ROLES.filter((role) =>
    study.fontUses.some((fontUse) => fontUse.role === role),
  ).length;

  if (study.stage === "compare") {
    return (
      <main className="workspace compare-workspace" id="workspace" aria-labelledby="workspace-heading">
        <div className="workspace-heading-row">
          <div>
            <p className="section-kicker">Decision surface · {trayCandidates.length}/4</p>
            <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>
              Compare set
            </h1>
          </div>
          <button
            type="button"
            className="quiet-button"
            onClick={() => dispatch({ type: "toggle-tray", candidateId: selected.id })}
          >
            {study.trayIds.includes(selected.id) ? "Remove selected" : "Add selected"}
          </button>
        </div>
        {trayCandidates.length ? (
          <div className="compare-grid">
            {trayCandidates.map((candidate) => (
              <article className="compare-card" key={candidate.id}>
                <div className="compare-meta">
                  <strong>{faceForCandidate(study, candidate).family}</strong>
                  <span>{candidate.label}</span>
                </div>
                <p className="compare-copy">{study.copy}</p>
                <div className="compare-footer">
                  <span>{candidate.axes.map((axis) => `${axis.tag} ${axis.value}`).join(" · ") || "Static"}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${candidateLabel(study, candidate)} from Compare set`}
                    onClick={() => dispatch({ type: "toggle-tray", candidateId: candidate.id })}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <p>Add up to four Candidates from Review.</p>
          </div>
        )}
      </main>
    );
  }

  if (study.stage === "system") {
    return (
      <main className="workspace system-workspace" id="workspace" aria-labelledby="workspace-heading">
        <div className="workspace-heading-row">
          <div>
            <p className="section-kicker">Roles, not files</p>
            <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>
              Type system
            </h1>
          </div>
          <p className="quiet-stat">{assignedRoleCount}/4 roles assigned</p>
        </div>
        <div className="role-grid">
          {SYSTEM_ROLES.map((role) => {
            const fontUse = study.fontUses.find((item) => item.role === role);
            const assigned = fontUse
              ? study.candidates.find(
                  (candidate) => candidate.id === fontUse.originatingCandidateId,
                )
              : undefined;
            return (
              <article className="role-card" key={role}>
                <p className="role-number">0{SYSTEM_ROLES.indexOf(role) + 1}</p>
                <h2>{roleLabels[role]}</h2>
                <p className={`role-specimen role-${role}`}>
                  {role === "display"
                    ? "Attention"
                    : role === "text"
                      ? "A usable system makes hierarchy feel inevitable."
                      : role === "caption"
                        ? "Fig. 01 / material study"
                        : "wght: 600; wdth: 92;"}
                </p>
                <div className="role-assignment">
                  <span>{assigned ? candidateLabel(study, assigned) : "Unassigned"}</span>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "assign-role", candidateId: selected.id, role })
                    }
                  >
                    Use selected
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    );
  }

  if (study.stage === "handoff") {
    const checks = [
      {
        label: "Review decisions",
        detail: unreviewedCount ? `${unreviewedCount} Candidates remain` : "All Candidates decided",
        ready: unreviewedCount === 0,
      },
      {
        label: "Local Source bindings",
        detail: missingCount ? `${missingCount} Source missing` : "All Sources available",
        ready: missingCount === 0,
      },
      {
        label: "System roles",
        detail: `${assignedRoleCount} of 4 assigned`,
        ready: assignedRoleCount === 4,
      },
      {
        label: "Reference render profile",
        detail: "Blocked by D02 renderer decision",
        ready: false,
      },
    ];
    return (
      <main className="workspace handoff-workspace" id="workspace" aria-labelledby="workspace-heading">
        <div className="workspace-heading-row">
          <div>
            <p className="section-kicker">Portable Study · Sources stay local</p>
            <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>
              Handoff readiness
            </h1>
          </div>
          <button type="button" className="primary-button" disabled>
            Build handoff
          </button>
        </div>
        <div className="handoff-list">
          {checks.map((check, index) => (
            <article key={check.label}>
              <span className={`check-mark ${check.ready ? "is-ready" : ""}`} aria-hidden="true">
                {check.ready ? "✓" : index + 1}
              </span>
              <div>
                <h2>{check.label}</h2>
                <p>{check.detail}</p>
              </div>
              <strong>{check.ready ? "Ready" : "Needs attention"}</strong>
            </article>
          ))}
        </div>
        <p className="handoff-note">
          This prototype never copies font binaries. Handoff generation remains deliberately disabled.
        </p>
      </main>
    );
  }

  const selectedIndex = study.candidates.findIndex((candidate) => candidate.id === selected.id) + 1;
  return (
    <main className="workspace review-workspace" id="workspace" aria-labelledby="workspace-heading">
      <div className="review-topline">
        <p className="section-kicker">
          Candidate {selectedIndex} of {study.candidates.length} · {unreviewedCount} unreviewed
        </p>
        <span
          className={`state-pill review-${selected.reviewState}`}
          role="status"
          aria-live="polite"
        >
          {reviewGlyph(selected.reviewState)} {selected.reviewState}
        </span>
      </div>
      <div className="specimen-field">
        <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>
          {study.copy}
        </h1>
        <p>
          {faceForCandidate(study, selected).family} <span>{selected.label}</span>
        </p>
      </div>
      <div className="review-controls" aria-label="Review decision">
        <button
          type="button"
          className={selected.reviewState === "keep" ? "is-active" : ""}
          aria-pressed={selected.reviewState === "keep"}
          aria-keyshortcuts="K"
          onClick={() =>
            dispatch({ type: "set-review-state", candidateId: selected.id, reviewState: "keep" })
          }
        >
          <kbd>K</kbd> Keep
        </button>
        <button
          type="button"
          className={selected.reviewState === "maybe" ? "is-active" : ""}
          aria-pressed={selected.reviewState === "maybe"}
          aria-keyshortcuts="M"
          onClick={() =>
            dispatch({ type: "set-review-state", candidateId: selected.id, reviewState: "maybe" })
          }
        >
          <kbd>M</kbd> Maybe
        </button>
        <button
          type="button"
          className={selected.reviewState === "reject" ? "is-active" : ""}
          aria-pressed={selected.reviewState === "reject"}
          aria-keyshortcuts="R"
          onClick={() =>
            dispatch({ type: "set-review-state", candidateId: selected.id, reviewState: "reject" })
          }
        >
          <kbd>R</kbd> Reject
        </button>
        <button
          type="button"
          aria-keyshortcuts="U"
          onClick={() => dispatch({ type: "select-next-unreviewed" })}
        >
          <kbd>U</kbd> Next unreviewed
        </button>
      </div>
      <div className="candidate-evidence">
        <div>
          <span>Face</span>
          <strong>{selected.faceId.replace("face:", "")}</strong>
        </div>
        <div>
          <span>Variation</span>
          <strong>
            {selected.axes.map((axis) => `${axis.tag} ${axis.value}`).join(" · ") || "Static face"}
          </strong>
        </div>
        <div>
          <span>Compare</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "toggle-tray", candidateId: selected.id })}
          >
            {study.trayIds.includes(selected.id) ? "Remove from set" : "Add to set"}
          </button>
        </div>
      </div>
    </main>
  );
}

interface InspectorProps {
  study: StudySession;
  selected: Candidate;
  dispatch: Dispatch<StudyCommand>;
}

function Inspector({ study, selected, dispatch }: InspectorProps) {
  const face = faceForCandidate(study, selected);
  const source = study.sources.find((item) => item.id === face.sourceId);
  const binding = bindingForSource(study, face.sourceId);
  const fontUse = study.fontUses.find(
    (item) => item.originatingCandidateId === selected.id,
  );
  return (
    <aside className="inspector" aria-labelledby="inspector-heading">
      <div className="inspector-title">
        <p className="section-kicker">Inspect</p>
        <h2 id="inspector-heading">{face.family}</h2>
        <p>{selected.label}</p>
      </div>

      <label className="field-label">
        <span>Specimen copy</span>
        <textarea
          id="specimen-copy-editor"
          value={study.copy}
          maxLength={240}
          rows={4}
          onChange={(event) => dispatch({ type: "set-copy", copy: event.target.value })}
        />
        <small>{study.copy.length}/240</small>
      </label>

      <label className="field-label">
        <span>Recipe</span>
        <select
          value={study.activeRecipeId}
          onChange={(event) => dispatch({ type: "select-recipe", recipeId: event.target.value })}
        >
          {study.recipes.map((recipe) => (
            <option value={recipe.id} key={recipe.id}>
              {recipe.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field-label">
        <span>System role</span>
        <select
          value={fontUse?.role ?? ""}
          onChange={(event) =>
            dispatch({
              type: "assign-role",
              candidateId: selected.id,
              role: (event.target.value || undefined) as SystemRole | undefined,
            })
          }
        >
          <option value="">Unassigned</option>
          {SYSTEM_ROLES.map((role) => (
            <option value={role} key={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
      </label>

      <dl className="facts">
        <div>
          <dt>Source</dt>
          <dd>
            <span className={binding?.state === "missing" ? "warning-text" : ""}>
              {binding?.state === "missing" ? "! Missing" : "● Available"}
            </span>
            <small>{source?.displayName}</small>
          </dd>
        </div>
        <div>
          <dt>Candidate ID</dt>
          <dd>{selected.id}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{selected.tags.join(", ") || "None"}</dd>
        </div>
      </dl>
    </aside>
  );
}

interface TrayProps {
  study: StudySession;
  dispatch: Dispatch<StudyCommand>;
}

function Tray({ study, dispatch }: TrayProps) {
  const candidates = study.trayIds
    .map((id) => study.candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Candidate => Boolean(candidate));
  return (
    <footer className="tray" aria-label="Comparison tray">
      <div className="tray-label">
        <span>Compare set</span>
        <strong>{candidates.length}/4</strong>
      </div>
      <div className="tray-items">
        {candidates.map((candidate) => (
          <div className="tray-item" key={candidate.id}>
            <button
              type="button"
              className="tray-select"
              onClick={() => dispatch({ type: "select-candidate", candidateId: candidate.id })}
            >
              <span>Aa</span>
              <span>
                <strong>{faceForCandidate(study, candidate).family}</strong>
                <small>{candidate.label}</small>
              </span>
            </button>
            <button
              type="button"
              className="tray-remove"
              aria-label={`Remove ${candidateLabel(study, candidate)} from Compare set`}
              onClick={() => dispatch({ type: "toggle-tray", candidateId: candidate.id })}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="open-compare"
        onClick={() => dispatch({ type: "set-stage", stage: "compare" })}
      >
        Open Compare →
      </button>
    </footer>
  );
}

export default function App() {
  const initial = useMemo(loadInitialStudy, []);
  const [study, dispatch] = useReducer(applyStudyCommand, initial.study);
  const [announcement, setAnnouncement] = useState(
    initial.recovered ? `Recovered revision ${initial.study.revision}.` : "Fixture loaded.",
  );
  const [hostName, setHostName] = useState("probing");
  const [bridgeMetric, setBridgeMetric] = useState<number>();
  const [isImporting, setIsImporting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(study.stage);
  const previousSelection = useRef(study.selectedCandidateId);
  const probeSerial = useRef(0);
  const host = useMemo(getHostPort, []);

  const selected =
    study.candidates.find((candidate) => candidate.id === study.selectedCandidateId) ??
    study.candidates[0];

  const requestHost = useCallback(
    async (request: HostRequest): Promise<HostResponse> => {
      const started = performance.now();
      const response = await host.request(request);
      setBridgeMetric(performance.now() - started);
      return response;
    },
    [host],
  );

  const openImport = useCallback(async () => {
    const returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsImporting(true);
    try {
      const response = await requestHost({ type: "open-import" });
      if (response.type === "import-result" && response.sources.length) {
        dispatch({ type: "ingest-sources", sources: response.sources });
        setAnnouncement(`${response.sources.length} Source imported. New Candidate is Unreviewed.`);
      } else {
        setAnnouncement("Import cancelled.");
      }
    } catch (error) {
      setAnnouncement(error instanceof Error ? `Import failed: ${error.message}` : "Import failed.");
    } finally {
      setIsImporting(false);
      window.requestAnimationFrame(() => returnTarget?.focus());
    }
  }, [requestHost]);

  const reloadStudio = useCallback(async () => {
    window.localStorage.setItem(RECOVERY_KEY, serializeRecoverySnapshot(study));
    window.sessionStorage.setItem(RELOAD_KEY, String(study.revision));
    setAnnouncement(`Reloading after checkpointing revision ${study.revision}.`);
    await requestHost({ type: "reload-studio" });
  }, [requestHost, study]);

  const handleMenuCommand = useCallback(
    (command: MenuCommand) => {
      switch (command.type) {
        case "open-import":
          void openImport();
          break;
        case "mark-keep":
          dispatch({ type: "set-review-state", candidateId: selected.id, reviewState: "keep" });
          setAnnouncement(`${candidateLabel(study, selected)} marked Keep from the native menu.`);
          break;
        case "next-unreviewed":
          dispatch({ type: "select-next-unreviewed" });
          break;
        case "set-stage":
          dispatch({ type: "set-stage", stage: command.stage });
          break;
        case "reload-studio":
          void reloadStudio();
          break;
      }
    },
    [openImport, reloadStudio, selected, study],
  );

  useEffect(() => host.onMenuCommand(handleMenuCommand), [handleMenuCommand, host]);

  useEffect(() => {
    probeSerial.current += 1;
    void requestHost({ type: "probe", serial: probeSerial.current })
      .then((response) => {
        if (response.type === "probe-result") setHostName(response.host);
      })
      .catch(() => setHostName("unavailable"));

    const reloadRevision = window.sessionStorage.getItem(RELOAD_KEY);
    if (reloadRevision) {
      window.sessionStorage.removeItem(RELOAD_KEY);
      setAnnouncement(`Studio reloaded. Recovered revision ${reloadRevision}.`);
      window.requestAnimationFrame(() => headingRef.current?.focus());
    }
  }, [requestHost]);

  useEffect(() => {
    window.localStorage.setItem(RECOVERY_KEY, serializeRecoverySnapshot(study));
  }, [study]);

  useEffect(() => {
    if (previousStage.current !== study.stage) {
      previousStage.current = study.stage;
      window.requestAnimationFrame(() => headingRef.current?.focus());
      setAnnouncement(`${stageLabels[study.stage]} stage opened.`);
    }
  }, [study.stage]);

  useEffect(() => {
    if (previousSelection.current !== selected.id) {
      previousSelection.current = selected.id;
      setAnnouncement(
        `${candidateLabel(study, selected)} selected. ${selected.reviewState}.`,
      );
    }
  }, [selected, study]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const stage = STAGES[Number(event.key) - 1];
      if (stage) {
        event.preventDefault();
        dispatch({ type: "set-stage", stage });
        return;
      }
      const key = event.key.toLocaleLowerCase();
      if (key === "k" || key === "m" || key === "r") {
        event.preventDefault();
        dispatch({
          type: "set-review-state",
          candidateId: selected.id,
          reviewState: key === "k" ? "keep" : key === "m" ? "maybe" : "reject",
        });
      } else if (key === "u") {
        event.preventDefault();
        dispatch({ type: "select-next-unreviewed" });
      } else if (key === "c") {
        event.preventDefault();
        dispatch({ type: "toggle-tray", candidateId: selected.id });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected.id]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="titlebar">
        <div className="brand-lockup" aria-label="Font Previewer">
          <span className="brand-mark" aria-hidden="true">Fp</span>
          <div>
            <strong>Font Previewer</strong>
            <span>P1 evidence build</span>
          </div>
        </div>
        <div className="document-title">
          <span className="save-dot" aria-hidden="true">●</span>
          <strong>{study.title}</strong>
          <span>revision {study.revision}</span>
        </div>
        <div className="host-actions">
          <span className="host-probe" title="Last validated HostBridge round trip">
            {hostName}
            {bridgeMetric === undefined ? "" : ` · ${bridgeMetric.toFixed(1)} ms`}
          </span>
          <button
            id="import-fonts-button"
            type="button"
            className="quiet-button"
            onClick={() => void requestHost({ type: "native-undo" })}
          >
            Native undo
          </button>
          <button type="button" className="primary-button" onClick={() => void openImport()} disabled={isImporting}>
            {isImporting ? "Importing…" : "Import Fonts…"}
          </button>
          <button type="button" className="icon-button" onClick={() => void reloadStudio()} aria-label="Reload Studio">
            ↻
          </button>
        </div>
      </header>

      <nav className="stage-nav" aria-label="Study stages">
        {STAGES.map((stage, index) => (
          <button
            type="button"
            key={stage}
            aria-current={study.stage === stage ? "page" : undefined}
            aria-keyshortcuts={String(index + 1)}
            className={study.stage === stage ? "is-active" : ""}
            onClick={() => dispatch({ type: "set-stage", stage })}
          >
            <span>0{index + 1}</span> {stageLabels[stage]}
          </button>
        ))}
      </nav>

      <Catalog study={study} dispatch={dispatch} />
      <Workspace study={study} selected={selected} dispatch={dispatch} headingRef={headingRef} />
      <Inspector study={study} selected={selected} dispatch={dispatch} />
      <Tray study={study} dispatch={dispatch} />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
