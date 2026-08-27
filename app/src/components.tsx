import {
  memo,
  useDeferredValue,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type RefObject,
} from "react";
import {
  FIT_POLICIES,
  REVIEW_STATES,
  SYSTEM_ROLES,
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
  readonly scanInstalled: (query?: string, refresh?: boolean, cursor?: number) => void;
  readonly cancelCatalog: () => void;
  readonly addCatalogSources: (sourceIds: readonly string[]) => void;
  readonly openStudy: () => void;
  readonly saveStudy: (saveAs: boolean) => void;
  readonly exportHandoff: (sourcePermissionAcknowledged: boolean) => void;
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
        <p className="section-kicker">Local typography decisions</p>
        <h1 id="welcome-heading">Find the voice.<br />Keep the evidence.</h1>
        <p>
          Review local font Sources, compare exact Candidates, build a deck system, and hand it off without
          installing a thing.
        </p>
        <div className="welcome-actions">
          <button type="button" className="primary-button" onClick={actions.importSources}>Import Sources</button>
          {capabilities?.installedCatalog ? <button type="button" className="quiet-button" onClick={() => actions.scanInstalled()}>Browse Installed</button> : null}
          <button type="button" className="quiet-button" onClick={actions.newStudy}>New Study</button>
          <button type="button" className="quiet-button" onClick={actions.openStudy}>Open Study</button>
        </div>
        <button type="button" className="text-button" onClick={actions.loadSample}>Explore a sample Study</button>
      </div>
      <aside className="welcome-proof" aria-label="Product privacy and format summary">
        <span className="proof-number">01</span>
        <strong>Fonts stay local.</strong>
        <p>Sources you choose are read on this computer. No account, upload, analytics, or required network.</p>
        <dl>
          <div><dt>Interactive profile</dt><dd>{capabilities?.renderProfile ?? "Loading Host…"}</dd></div>
          <div><dt>Full formats</dt><dd>{capabilities?.fullFormats.join(" · ") || "TTF · OTF · WOFF · WOFF2"}</dd></div>
          <div><dt>Product path</dt><dd>Review · Compare · System · Handoff</dd></div>
        </dl>
      </aside>
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
  const studySourceIds = useMemo(() => new Set(session.document.sources.map((source) => source.id)), [session.document.sources]);

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
          <form className="catalog-tools catalog-search" onSubmit={(event) => { event.preventDefault(); actions.scanInstalled(catalogSearch); }}>
            <label><span className="sr-only">Search installed fonts</span><input type="search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search installed fonts" /></label>
            <div><button type="submit" className="quiet-button">Search</button><button type="button" className="text-button" onClick={() => actions.scanInstalled(catalogSearch, true)}>Rebuild</button>{catalogBusy ? <button type="button" className="text-button" onClick={actions.cancelCatalog}>Cancel</button> : null}</div>
          </form>
          <p className="catalog-summary" role="status">{catalog.total} {catalog.total === 1 ? "match" : "matches"} · {catalog.indexed} indexed{catalog.truncated ? " · 10,000 limit" : ""}</p>
          <div className="catalog-results" aria-label="Installed font Catalog">
            {catalogGroups.map((group) => {
              const family = group.label;
              const imports = group.items;
              const available = imports.filter((item) => !studySourceIds.has(item.source.id));
              return <section className="catalog-family" aria-label={`${family} installed family`} key={group.key}>
                <div className="catalog-family-heading"><span><strong>{family}</strong><small>{imports.reduce((count, item) => count + item.faces.length, 0)} Faces · {group.confidence === "exact-metadata" ? "exact metadata" : "normalized metadata"}</small></span><button type="button" className="quiet-button" aria-label={`Add ${family} family to Study`} disabled={!available.length} onClick={() => actions.addCatalogSources(available.map((item) => item.source.id))}>Add family</button></div>
                {imports.map((item) => {
                  const added = studySourceIds.has(item.source.id);
                  const styles = item.faces.map((face) => face.style).slice(0, 3).join(" · ");
                  return <article className="catalog-source" key={item.source.id}><span><strong>{item.source.displayName}</strong><small>{styles || item.source.hint.format}{item.faces.some((face) => face.axes.length) ? " · Variable" : " · Static"}</small></span><button type="button" disabled={added} aria-label={`${added ? "In Study" : "Add"} ${item.source.displayName}`} onClick={() => actions.addCatalogSources([item.source.id])}>{added ? "Added" : "Add"}</button></article>;
                })}
              </section>;
            })}
            {!catalog.indexed ? <p className="empty-note">Open the Host-local Catalog to index installed fonts.</p> : catalogGroups.length === 0 ? <p className="empty-note">No installed fonts match this search.</p> : null}
          </div>
          <div className="catalog-pagination"><button type="button" className="quiet-button" disabled={catalog.cursor === 0} onClick={() => actions.scanInstalled(catalog.query, false, Math.max(0, catalog.cursor - 80))}>Previous</button><span>{catalog.total ? `${catalog.cursor + 1}–${Math.min(catalog.cursor + catalog.imports.length, catalog.total)} of ${catalog.total}` : "0 results"}</span><button type="button" className="quiet-button" disabled={catalog.nextCursor === undefined} onClick={() => actions.scanInstalled(catalog.query, false, catalog.nextCursor)}>Next</button></div>
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
                  {REVIEW_STATES.map((reviewState) => <button type="button" key={reviewState} className={candidate.reviewState === reviewState ? "is-active" : ""} aria-label={`${reviewLabels[reviewState]} ${candidateFace.family} ${candidate.label}`} aria-pressed={candidate.reviewState === reviewState} onClick={() => dispatch({ type: "set-review-state", candidateIds: [candidate.id], reviewState })}>{reviewGlyphs[reviewState]}</button>)}
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

function fittedSize(recipe: Recipe, copy: string): number {
  if (!copy.trim()) return recipe.size;
  const longestLine = Math.max(...copy.split("\n").map((line) => line.length));
  return Math.max(12, Math.min(recipe.size, 780 / Math.max(6, longestLine * 0.52)));
}

function CompareWorkspace({ session, dispatch, fontStates, headingRef }: WorkspaceProps) {
  const recipe = activeRecipe(session);
  const activeSet = session.workspace.activeComparisonId
    ? session.document.comparisonSets.find((set) => set.id === session.workspace.activeComparisonId)
    : undefined;
  const [policy, setPolicy] = useState<FitPolicy>(activeSet?.policy ?? "nominal");
  const [blind, setBlind] = useState(activeSet?.blind ?? false);
  const [revealed, setRevealed] = useState(activeSet?.revealed ?? false);
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
          {FIT_POLICIES.map((item) => <label key={item}><input type="radio" name="fit-policy" value={item} checked={policy === item} onChange={() => setPolicy(item)} /><span><strong>{policyLabels[item].label}</strong><small>{policyLabels[item].detail}</small></span></label>)}
        </div>
        <label className="blind-toggle"><input type="checkbox" checked={blind} onChange={(event) => { setBlind(event.target.checked); setRevealed(false); }} />Blind comparison</label>
        {blind ? <button type="button" className="quiet-button" onClick={() => setRevealed(true)} disabled={revealed}>{revealed ? "Revealed" : "Reveal identity"}</button> : null}
      </div>
      {candidates.length >= 2 ? (
        <div className={`compare-grid compare-${candidates.length}`}>
          {candidates.map((candidate, index) => {
            const face = faceForCandidate(session.document, candidate);
            const hidden = blind && !revealed;
            const size = policy === "fit" ? fittedSize(recipe, copy) : recipe.size;
            return (
              <article className="compare-card" key={candidate.id}>
                <div className="compare-meta"><strong>{hidden ? `Candidate ${String.fromCharCode(65 + index)}` : face.family}</strong><span>{hidden ? "Identity hidden" : candidate.label}</span></div>
                <Specimen className="compare-copy" session={session} candidate={candidate} recipe={recipe} fontStates={fontStates} fittedSize={size} label={`${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`}. ${policyLabels[policy].label}. ${Math.round(size)} pixels.`} />
                <div className="compare-footer"><span>{Math.round(size)} px · {policyLabels[policy].label}</span><span className="reorder-buttons"><button type="button" aria-label={`Move ${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`} left`} onClick={() => move(index, -1)} disabled={index === 0}>←</button><button type="button" aria-label={`Move ${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`} right`} onClick={() => move(index, 1)} disabled={index === candidates.length - 1}>→</button><button type="button" aria-label={`Remove ${hidden ? `Candidate ${String.fromCharCode(65 + index)}` : `${face.family} ${candidate.label}`} from comparison`} onClick={() => dispatch({ type: "toggle-tray", candidateId: candidate.id })}>Remove</button></span></div>
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
  const [sourcePermission, setSourcePermission] = useState(false);
  const system = activeTypographySystem(session.document);
  const missingRoles = ["display", "body"].filter((role) => !system.fontUses.some((fontUse) => fontUse.role === role));
  const missingSources = session.document.sources.filter((source) => bindingForSource(session, source.id)?.state !== "readable");
  const preferences = session.document.handoff;
  const update = (patch: Partial<HandoffPreferences>) => dispatch({ type: "set-handoff", handoff: { ...preferences, ...patch } });
  const toggleOutput = (output: HandoffPreferences["outputs"][number]) => update({ outputs: preferences.outputs.includes(output) ? preferences.outputs.filter((item) => item !== output) : [...preferences.outputs, output] });
  const blockers = missingRoles.length + (!capabilities?.transactionalHandoff ? 1 : 0);
  return (
    <main className="workspace handoff-workspace" id="workspace" aria-labelledby="workspace-heading">
      <div className="workspace-heading-row"><div><p className="section-kicker">Preflight · {blockers} blockers · {missingSources.length} cautions</p><h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>A handoff that can stand alone</h1></div><button type="button" className="primary-button" disabled={blockers > 0 || preferences.outputs.length === 0 || (preferences.includeSources && !sourcePermission)} onClick={() => actions.exportHandoff(sourcePermission)}>Export Handoff</button></div>
      <div className="handoff-columns">
        <section className="handoff-panel"><p className="section-kicker">1 · Profile</p><label className="field-label"><span>Audience</span><select value={preferences.profile} onChange={(event) => update({ profile: event.target.value as HandoffPreferences["profile"] })}><option value="internal">Internal review</option><option value="client">Client review</option><option value="designer">Designer handoff</option><option value="technical">Technical proof</option></select></label><p className="handoff-note">Profile changes required evidence. It never changes your typography decisions.</p></section>
        <section className="handoff-panel"><p className="section-kicker">2 · Preflight</p><div className="handoff-list"><article><span className={`check-mark ${missingRoles.length ? "" : "is-ready"}`}>{missingRoles.length ? "!" : "✓"}</span><div><h2>Required Roles</h2><p>{missingRoles.length ? `Assign ${missingRoles.map((role) => roleLabels[role as SystemRole]).join(" and ")}.` : "Display and Body are assigned."}</p></div></article><article><span className={`check-mark ${missingSources.length ? "" : "is-ready"}`}>{missingSources.length ? "!" : "✓"}</span><div><h2>Source health</h2><p>{missingSources.length ? `${missingSources.length} Sources are missing or limited. Decisions remain intact.` : "All Sources are locally bound."}</p></div></article><article><span className={`check-mark ${capabilities?.transactionalHandoff ? "is-ready" : ""}`}>{capabilities?.transactionalHandoff ? "✓" : "!"}</span><div><h2>Transactional export</h2><p>{capabilities?.transactionalHandoff ? "Host will stage, verify, checksum, then commit." : "Browser development mode cannot produce the full bundle."}</p></div></article></div></section>
        <section className="handoff-panel"><p className="section-kicker">3 · Outputs</p><div className="output-grid">{(["review-png", "compare-png", "system-png", "pdf", "summary", "json", "csv"] as const).map((output) => <label key={output}><input type="checkbox" checked={preferences.outputs.includes(output)} onChange={() => toggleOutput(output)} /><span>{output.replaceAll("-", " ")}</span></label>)}</div></section>
        <section className="handoff-panel source-permission"><p className="section-kicker">4 · Source copies</p><label><input type="checkbox" checked={preferences.includeSources} onChange={(event) => { update({ includeSources: event.target.checked }); if (!event.target.checked) setSourcePermission(false); }} />Include original Source files</label>{preferences.includeSources ? <label className="permission-check"><input type="checkbox" checked={sourcePermission} onChange={(event) => setSourcePermission(event.target.checked)} />I have permission to copy the selected font files into this handoff.</label> : <p>Off by default. Metadata is not a licence.</p>}</section>
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
      <label className="field-label"><span>Casing</span><select value={candidate.casing} onChange={(event) => dispatch({ type: "edit-candidate", candidateId: candidate.id, patch: { casing: event.target.value as Candidate["casing"] } })}><option value="exact">Exact</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option><option value="title">Title Case</option></select></label>
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
