export const STAGES = ["review", "compare", "system", "handoff"] as const;
export type Stage = (typeof STAGES)[number];

export const REVIEW_STATES = ["unreviewed", "keep", "maybe", "reject"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const SYSTEM_ROLES = ["display", "text", "caption", "mono"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export interface SourceSummary {
  readonly id: string;
  readonly displayName: string;
}

export interface ImportedSource extends SourceSummary {
  readonly state: "available" | "missing";
}

export interface SourceBindingSummary {
  readonly sourceId: string;
  readonly state: "available" | "missing";
}

export interface Face {
  readonly id: string;
  readonly sourceId: string;
  readonly family: string;
  readonly style: string;
  readonly faceIndex: number;
}

export interface AxisValue {
  readonly tag: string;
  readonly value: number;
}

export interface Candidate {
  readonly id: string;
  readonly faceId: string;
  readonly label: string;
  readonly reviewState: ReviewState;
  readonly axes: readonly AxisValue[];
  readonly tags: readonly string[];
}

export interface FontUse {
  readonly id: string;
  readonly role: SystemRole;
  readonly faceId: string;
  readonly originatingCandidateId: string;
  readonly axes: readonly AxisValue[];
}

export interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly copy: string;
  readonly size: number;
  readonly tracking: number;
}

export interface StudySession {
  readonly schemaVersion: 0;
  readonly id: string;
  readonly title: string;
  readonly stage: Stage;
  readonly sources: readonly SourceSummary[];
  readonly bindings: readonly SourceBindingSummary[];
  readonly faces: readonly Face[];
  readonly candidates: readonly Candidate[];
  readonly fontUses: readonly FontUse[];
  readonly recipes: readonly Recipe[];
  readonly activeRecipeId: string;
  readonly selectedCandidateId: string;
  readonly trayIds: readonly string[];
  readonly copy: string;
  readonly revision: number;
}

export type StudyCommand =
  | { readonly type: "set-stage"; readonly stage: Stage }
  | { readonly type: "select-candidate"; readonly candidateId: string }
  | { readonly type: "select-next-unreviewed" }
  | {
      readonly type: "set-review-state";
      readonly candidateId: string;
      readonly reviewState: ReviewState;
    }
  | { readonly type: "set-copy"; readonly copy: string }
  | { readonly type: "select-recipe"; readonly recipeId: string }
  | { readonly type: "toggle-tray"; readonly candidateId: string }
  | {
      readonly type: "assign-role";
      readonly candidateId: string;
      readonly role?: SystemRole;
    }
  | { readonly type: "ingest-sources"; readonly sources: readonly ImportedSource[] };

const MAX_COPY_LENGTH = 240;
const MAX_TRAY_SIZE = 4;
const MAX_SOURCES = 512;
const MAX_CANDIDATES = 4_096;

export class DomainError extends Error {
  override readonly name = "DomainError";
}

function unreachable(value: never): never {
  throw new DomainError(`Unknown Study command: ${JSON.stringify(value)}`);
}

function candidateById(study: StudySession, candidateId: string): Candidate {
  const candidate = study.candidates.find((item) => item.id === candidateId);
  if (!candidate) {
    throw new DomainError(`Candidate does not exist: ${candidateId}`);
  }
  return candidate;
}

function withRevision(
  study: StudySession,
  update: Omit<Partial<StudySession>, "revision">,
): StudySession {
  return assertStudySession({ ...study, ...update, revision: study.revision + 1 });
}

export function applyStudyCommand(study: StudySession, command: StudyCommand): StudySession {
  switch (command.type) {
    case "set-stage":
      return study.stage === command.stage
        ? study
        : withRevision(study, { stage: command.stage });

    case "select-candidate":
      candidateById(study, command.candidateId);
      return study.selectedCandidateId === command.candidateId
        ? study
        : withRevision(study, { selectedCandidateId: command.candidateId });

    case "select-next-unreviewed": {
      const currentIndex = study.candidates.findIndex(
        (candidate) => candidate.id === study.selectedCandidateId,
      );
      const ordered = [
        ...study.candidates.slice(currentIndex + 1),
        ...study.candidates.slice(0, currentIndex + 1),
      ];
      const next = ordered.find((candidate) => candidate.reviewState === "unreviewed");
      return next
        ? withRevision(study, { selectedCandidateId: next.id, stage: "review" })
        : study;
    }

    case "set-review-state": {
      const reviewedCandidate = candidateById(study, command.candidateId);
      if (reviewedCandidate.reviewState === command.reviewState) return study;
      return withRevision(study, {
        candidates: study.candidates.map((candidate) =>
          candidate.id === command.candidateId
            ? { ...candidate, reviewState: command.reviewState }
            : candidate,
        ),
      });
    }

    case "set-copy": {
      const copy = command.copy.slice(0, MAX_COPY_LENGTH);
      return study.copy === copy ? study : withRevision(study, { copy });
    }

    case "select-recipe": {
      const recipe = study.recipes.find((item) => item.id === command.recipeId);
      if (!recipe) {
        throw new DomainError(`Recipe does not exist: ${command.recipeId}`);
      }
      return withRevision(study, {
        activeRecipeId: recipe.id,
        copy: recipe.copy,
      });
    }

    case "toggle-tray": {
      candidateById(study, command.candidateId);
      const isPresent = study.trayIds.includes(command.candidateId);
      const trayIds = isPresent
        ? study.trayIds.filter((id) => id !== command.candidateId)
        : [...study.trayIds, command.candidateId].slice(-MAX_TRAY_SIZE);
      return withRevision(study, { trayIds });
    }

    case "assign-role": {
      const roleCandidate = candidateById(study, command.candidateId);
      const existingUse = study.fontUses.find(
        (fontUse) => fontUse.originatingCandidateId === command.candidateId,
      );
      if (
        (command.role === undefined && !existingUse) ||
        (existingUse?.role === command.role &&
          study.fontUses.find((fontUse) => fontUse.role === command.role) === existingUse)
      ) {
        return study;
      }
      return withRevision(study, {
        fontUses: command.role
          ? [
              ...study.fontUses.filter(
                (fontUse) =>
                  fontUse.role !== command.role &&
                  fontUse.originatingCandidateId !== command.candidateId,
              ),
              {
                id: `font-use:${command.role}`,
                role: command.role,
                faceId: roleCandidate.faceId,
                originatingCandidateId: roleCandidate.id,
                axes: roleCandidate.axes,
              },
            ]
          : study.fontUses.filter(
              (fontUse) => fontUse.originatingCandidateId !== command.candidateId,
            ),
      });
    }

    case "ingest-sources": {
      const newSources = command.sources.filter(
        (source, index, sources) =>
          !study.sources.some((item) => item.id === source.id) &&
          sources.findIndex((item) => item.id === source.id) === index,
      );
      if (newSources.length === 0) return study;
      const faces: Face[] = newSources.map((source) => ({
        id: `face:${source.id}:0`,
        sourceId: source.id,
        family: source.displayName,
        style: "Regular",
        faceIndex: 0,
      }));
      const candidates: Candidate[] = newSources.map((source) => ({
        id: `candidate:${source.id}`,
        faceId: `face:${source.id}:0`,
        label: "Regular",
        reviewState: "unreviewed",
        axes: [],
        tags: ["imported"],
      }));
      return withRevision(study, {
        sources: [
          ...study.sources,
          ...newSources.map(({ id, displayName }) => ({ id, displayName })),
        ],
        bindings: [
          ...study.bindings,
          ...newSources.map(({ id, state }) => ({ sourceId: id, state })),
        ],
        faces: [...study.faces, ...faces],
        candidates: [...study.candidates, ...candidates],
        selectedCandidateId: candidates[0].id,
        stage: "review",
      });
    }

    default:
      return unreachable(command);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && STAGES.includes(value as Stage);
}

function isReviewState(value: unknown): value is ReviewState {
  return typeof value === "string" && REVIEW_STATES.includes(value as ReviewState);
}

function isSystemRole(value: unknown): value is SystemRole {
  return typeof value === "string" && SYSTEM_ROLES.includes(value as SystemRole);
}

function parseSource(value: unknown): SourceSummary {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.displayName)
  ) {
    throw new DomainError("Invalid Source summary");
  }
  return { id: value.id, displayName: value.displayName };
}

function parseBinding(value: unknown): SourceBindingSummary {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.sourceId) ||
    (value.state !== "available" && value.state !== "missing")
  ) {
    throw new DomainError("Invalid Source Binding summary");
  }
  return { sourceId: value.sourceId, state: value.state };
}

function parseFace(value: unknown): Face {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sourceId) ||
    !isNonEmptyString(value.family) ||
    !isNonEmptyString(value.style) ||
    !Number.isSafeInteger(value.faceIndex) ||
    (value.faceIndex as number) < 0
  ) {
    throw new DomainError("Invalid Face");
  }
  return {
    id: value.id,
    sourceId: value.sourceId,
    family: value.family,
    style: value.style,
    faceIndex: value.faceIndex as number,
  };
}

function parseAxis(value: unknown): AxisValue {
  if (
    !isRecord(value) ||
    typeof value.tag !== "string" ||
    !/^[ -~]{4}$/.test(value.tag) ||
    typeof value.value !== "number" ||
    !Number.isFinite(value.value)
  ) {
    throw new DomainError("Invalid axis value");
  }
  return { tag: value.tag, value: value.value };
}

function parseCandidate(value: unknown): Candidate {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.faceId) ||
    !isNonEmptyString(value.label) ||
    !isReviewState(value.reviewState) ||
    !Array.isArray(value.axes) ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === "string" && tag.length <= 64)
  ) {
    throw new DomainError("Invalid Candidate");
  }
  return {
    id: value.id,
    faceId: value.faceId,
    label: value.label,
    reviewState: value.reviewState,
    axes: value.axes.map(parseAxis),
    tags: value.tags,
  };
}

function parseFontUse(value: unknown): FontUse {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isSystemRole(value.role) ||
    !isNonEmptyString(value.faceId) ||
    !isNonEmptyString(value.originatingCandidateId) ||
    !Array.isArray(value.axes)
  ) {
    throw new DomainError("Invalid Font Use");
  }
  return {
    id: value.id,
    role: value.role,
    faceId: value.faceId,
    originatingCandidateId: value.originatingCandidateId,
    axes: value.axes.map(parseAxis),
  };
}

function parseRecipe(value: unknown): Recipe {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    typeof value.copy !== "string" ||
    value.copy.length > MAX_COPY_LENGTH ||
    typeof value.size !== "number" ||
    !Number.isFinite(value.size) ||
    typeof value.tracking !== "number" ||
    !Number.isFinite(value.tracking)
  ) {
    throw new DomainError("Invalid Recipe");
  }
  return {
    id: value.id,
    name: value.name,
    copy: value.copy,
    size: value.size,
    tracking: value.tracking,
  };
}

export function assertStudySession(value: unknown): StudySession {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 0 ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    !isStage(value.stage) ||
    !Array.isArray(value.sources) ||
    value.sources.length > MAX_SOURCES ||
    !Array.isArray(value.bindings) ||
    value.bindings.length > MAX_SOURCES ||
    !Array.isArray(value.faces) ||
    value.faces.length > MAX_CANDIDATES ||
    !Array.isArray(value.candidates) ||
    value.candidates.length === 0 ||
    value.candidates.length > MAX_CANDIDATES ||
    !Array.isArray(value.fontUses) ||
    value.fontUses.length > SYSTEM_ROLES.length ||
    !Array.isArray(value.recipes) ||
    value.recipes.length === 0 ||
    !isNonEmptyString(value.activeRecipeId) ||
    !isNonEmptyString(value.selectedCandidateId) ||
    !Array.isArray(value.trayIds) ||
    value.trayIds.length > MAX_TRAY_SIZE ||
    !value.trayIds.every(isNonEmptyString) ||
    typeof value.copy !== "string" ||
    value.copy.length > MAX_COPY_LENGTH ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    throw new DomainError("Invalid StudySession envelope");
  }

  const study: StudySession = {
    schemaVersion: 0,
    id: value.id,
    title: value.title,
    stage: value.stage,
    sources: value.sources.map(parseSource),
    bindings: value.bindings.map(parseBinding),
    faces: value.faces.map(parseFace),
    candidates: value.candidates.map(parseCandidate),
    fontUses: value.fontUses.map(parseFontUse),
    recipes: value.recipes.map(parseRecipe),
    activeRecipeId: value.activeRecipeId,
    selectedCandidateId: value.selectedCandidateId,
    trayIds: value.trayIds,
    copy: value.copy,
    revision: value.revision as number,
  };

  const unique = (items: readonly string[]) => new Set(items).size === items.length;
  const sourceIds = study.sources.map((source) => source.id);
  const faceIds = study.faces.map((face) => face.id);
  const candidateIds = study.candidates.map((candidate) => candidate.id);
  const fontUseIds = study.fontUses.map((fontUse) => fontUse.id);
  const recipeIds = study.recipes.map((recipe) => recipe.id);
  if (
    !unique(sourceIds) ||
    !unique(study.bindings.map((binding) => binding.sourceId)) ||
    !unique(faceIds) ||
    !unique(candidateIds) ||
    !unique(fontUseIds) ||
    !unique(study.fontUses.map((fontUse) => fontUse.role)) ||
    !unique(recipeIds)
  ) {
    throw new DomainError("StudySession IDs must be unique within their entity type");
  }
  if (!study.bindings.every((binding) => sourceIds.includes(binding.sourceId))) {
    throw new DomainError("Every Source Binding must reference a Source");
  }
  if (!study.faces.every((face) => sourceIds.includes(face.sourceId))) {
    throw new DomainError("Every Face must reference a Source");
  }
  if (!study.candidates.every((candidate) => faceIds.includes(candidate.faceId))) {
    throw new DomainError("Every Candidate must reference a Face");
  }
  if (
    !study.fontUses.every(
      (fontUse) =>
        faceIds.includes(fontUse.faceId) &&
        candidateIds.includes(fontUse.originatingCandidateId) &&
        study.candidates.find((candidate) => candidate.id === fontUse.originatingCandidateId)
          ?.faceId === fontUse.faceId,
    )
  ) {
    throw new DomainError("Every Font Use must reference a consistent Face and Candidate");
  }
  if (!candidateIds.includes(study.selectedCandidateId)) {
    throw new DomainError("Selected Candidate must exist");
  }
  if (!study.trayIds.every((id) => candidateIds.includes(id)) || !unique(study.trayIds)) {
    throw new DomainError("Tray Candidate IDs must exist and be unique");
  }
  if (!recipeIds.includes(study.activeRecipeId)) {
    throw new DomainError("Active Recipe must exist");
  }
  return study;
}

export function serializeRecoverySnapshot(study: StudySession): string {
  return JSON.stringify(assertStudySession(study));
}

export function parseRecoverySnapshot(serialized: string): StudySession {
  if (serialized.length > 2_000_000) {
    throw new DomainError("StudySession exceeds prototype recovery limit");
  }
  try {
    return assertStudySession(JSON.parse(serialized) as unknown);
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("StudySession is not valid JSON");
  }
}

export function faceForCandidate(study: StudySession, candidate: Candidate): Face {
  const face = study.faces.find((item) => item.id === candidate.faceId);
  if (!face) throw new DomainError(`Candidate Face does not exist: ${candidate.faceId}`);
  return face;
}

export function sourceForCandidate(study: StudySession, candidate: Candidate): SourceSummary {
  const face = faceForCandidate(study, candidate);
  const source = study.sources.find((item) => item.id === face.sourceId);
  if (!source) throw new DomainError(`Face Source does not exist: ${face.sourceId}`);
  return source;
}

export function bindingForSource(
  study: StudySession,
  sourceId: string,
): SourceBindingSummary | undefined {
  return study.bindings.find((binding) => binding.sourceId === sourceId);
}
