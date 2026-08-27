export const STUDY_SCHEMA_VERSION = 4 as const;

export const STAGES = ["review", "compare", "system", "handoff"] as const;
export type Stage = (typeof STAGES)[number];

export const REVIEW_STATES = ["unreviewed", "keep", "maybe", "reject"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const SYSTEM_ROLES = [
  "display",
  "body",
  "data",
  "caption",
  "legal",
  "utility",
  "fallback",
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const SOURCE_STATES = [
  "pending",
  "readable",
  "metadata-only",
  "unsupported",
  "missing",
  "changed",
  "ambiguous",
  "quarantined",
] as const;
export type SourceState = (typeof SOURCE_STATES)[number];

export const FIT_POLICIES = ["nominal", "fit", "locked-lines"] as const;
export type FitPolicy = (typeof FIT_POLICIES)[number];

export const RECIPE_PACKS = ["film-tv", "advertising", "business", "blank"] as const;
export type RecipePack = (typeof RECIPE_PACKS)[number];

export const TEXT_CASINGS = ["exact", "uppercase", "lowercase", "title"] as const;
export type TextCasing = (typeof TEXT_CASINGS)[number];

export const TEXT_DIRECTIONS = ["auto", "ltr", "rtl"] as const;
export type TextDirection = (typeof TEXT_DIRECTIONS)[number];

export interface PortableSourceHint {
  readonly fileName: string;
  readonly format: string;
  readonly fileSize?: number;
  readonly faceCount?: number;
}

export interface SourceSummary {
  readonly id: string;
  readonly displayName: string;
  readonly hint: PortableSourceHint;
  readonly lastKnownState: SourceState;
}

export interface SourceBindingSummary {
  readonly sourceId: string;
  readonly state: SourceState;
  readonly previewUrl?: string;
  readonly modifiedAt?: string;
  readonly rendererSupport: "full" | "metadata-only" | "unsupported";
}

export interface AxisDefinition {
  readonly tag: string;
  readonly name: string;
  readonly minimum: number;
  readonly defaultValue: number;
  readonly maximum: number;
}

export interface AxisValue {
  readonly tag: string;
  readonly value: number;
}

export interface NamedInstance {
  readonly name: string;
  readonly coordinates: readonly AxisValue[];
}

export interface FeatureDefinition {
  readonly tag: string;
  readonly name: string;
  readonly group: "case" | "figures" | "ligatures" | "stylistic" | "language" | "other";
  readonly defaultEnabled: boolean;
}

export interface FeatureSetting {
  readonly tag: string;
  readonly enabled: boolean;
}

export interface CoverageEvidence {
  readonly supportedCodePointCount: number;
  readonly scripts: readonly string[];
  readonly colorFormats: readonly string[];
  readonly evidenceLevel: "unknown" | "metadata" | "shaped";
}

export interface Face {
  readonly id: string;
  readonly sourceId: string;
  readonly family: string;
  readonly style: string;
  readonly postScriptName?: string;
  readonly faceIndex: number;
  readonly axes: readonly AxisDefinition[];
  readonly namedInstances: readonly NamedInstance[];
  readonly features: readonly FeatureDefinition[];
  readonly coverage: CoverageEvidence;
}

export interface CandidateProvenance {
  readonly kind: "import" | "duplicate" | "legacy" | "catalog";
  readonly fromCandidateId?: string;
  readonly legacyReviewState?: ReviewState;
}

export interface Candidate {
  readonly id: string;
  readonly faceId: string;
  readonly label: string;
  readonly reviewState: ReviewState;
  readonly axes: readonly AxisValue[];
  readonly features: readonly FeatureSetting[];
  readonly casing: TextCasing;
  readonly tags: readonly string[];
  readonly notes: string;
  readonly rationale: string;
  readonly provenance: CandidateProvenance;
}

export interface Recipe {
  readonly id: string;
  readonly pack: RecipePack;
  readonly name: string;
  readonly copy: string;
  readonly language: string;
  readonly direction: TextDirection;
  readonly casing: TextCasing;
  readonly sizePolicy: "fixed" | "fit";
  readonly size: number;
  readonly lineHeight: number;
  readonly tracking: number;
  readonly alignment: "leading" | "center" | "trailing" | "justified";
  readonly background: "paper" | "ink" | "split";
  readonly lineLimit?: number;
}

export interface ComparisonSet {
  readonly id: string;
  readonly name: string;
  readonly candidateIds: readonly string[];
  readonly recipeId: string;
  readonly policy: FitPolicy;
  readonly blind: boolean;
  readonly blindSeed: string;
  readonly revealed: boolean;
  readonly rationale: string;
}

export interface FontUse {
  readonly id: string;
  readonly role: SystemRole;
  readonly faceId: string;
  readonly originatingCandidateId?: string;
  readonly axes: readonly AxisValue[];
  readonly features: readonly FeatureSetting[];
  readonly casing: TextCasing;
  readonly tracking: number;
  readonly language: string;
  readonly direction: TextDirection;
  readonly rationale: string;
}

export interface TypographySystem {
  readonly id: string;
  readonly name: string;
  readonly rationale: string;
  readonly fontUses: readonly FontUse[];
}

export interface HandoffPreferences {
  readonly profile: "internal" | "client" | "designer" | "technical";
  readonly outputs: readonly (
    | "review-png"
    | "compare-png"
    | "system-png"
    | "pdf"
    | "summary"
    | "json"
    | "csv"
  )[];
  readonly includeSources: boolean;
}

export interface StudyDocument {
  readonly schemaVersion: typeof STUDY_SCHEMA_VERSION;
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sources: readonly SourceSummary[];
  readonly faces: readonly Face[];
  readonly candidates: readonly Candidate[];
  readonly recipes: readonly Recipe[];
  readonly comparisonSets: readonly ComparisonSet[];
  readonly typographySystems: readonly TypographySystem[];
  readonly activeSystemId: string;
  readonly handoff: HandoffPreferences;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface WorkspaceState {
  readonly stage: Stage;
  readonly selectedCandidateId?: string;
  readonly activeRecipeId: string;
  readonly activeComparisonId?: string;
  readonly trayIds: readonly string[];
  readonly copyOverride?: string;
  readonly reviewLayout: "contact-sheet" | "focus" | "waterfall";
  readonly search: string;
  readonly reviewFilter: ReviewState | "all";
  readonly activeScene: "title" | "logline" | "body" | "data" | "legal";
}

export interface StudySession {
  readonly document: StudyDocument;
  readonly workspace: WorkspaceState;
  readonly bindings: readonly SourceBindingSummary[];
  readonly revision: number;
  readonly acknowledgedRevision: number;
  readonly intentionallySavedRevision: number;
}

export interface ImportedSource {
  readonly source: SourceSummary;
  readonly binding: SourceBindingSummary;
  readonly faces: readonly Face[];
}

export type StudyCommand =
  | { readonly type: "set-stage"; readonly stage: Stage }
  | { readonly type: "select-candidate"; readonly candidateId?: string }
  | { readonly type: "select-next-unreviewed" }
  | { readonly type: "set-review-state"; readonly candidateIds: readonly string[]; readonly reviewState: ReviewState }
  | { readonly type: "set-copy-override"; readonly copy?: string }
  | { readonly type: "select-recipe"; readonly recipeId: string }
  | { readonly type: "toggle-tray"; readonly candidateId: string }
  | { readonly type: "set-tray"; readonly candidateIds: readonly string[] }
  | { readonly type: "set-review-layout"; readonly layout: WorkspaceState["reviewLayout"] }
  | { readonly type: "set-search"; readonly search: string }
  | { readonly type: "set-review-filter"; readonly filter: WorkspaceState["reviewFilter"] }
  | { readonly type: "set-scene"; readonly scene: WorkspaceState["activeScene"] }
  | { readonly type: "ingest-sources"; readonly imports: readonly ImportedSource[] }
  | { readonly type: "replace-bindings"; readonly bindings: readonly SourceBindingSummary[] }
  | { readonly type: "rename-study"; readonly title: string }
  | { readonly type: "edit-candidate"; readonly candidateId: string; readonly patch: Partial<Pick<Candidate, "label" | "casing" | "notes" | "rationale" | "tags">> }
  | { readonly type: "set-axis"; readonly candidateId: string; readonly tag: string; readonly value: number }
  | { readonly type: "set-feature"; readonly candidateId: string; readonly tag: string; readonly enabled: boolean }
  | { readonly type: "duplicate-candidate"; readonly candidateId: string; readonly label?: string; readonly copyDecision?: boolean }
  | { readonly type: "upsert-recipe"; readonly recipe: Recipe }
  | { readonly type: "delete-recipe"; readonly recipeId: string }
  | { readonly type: "upsert-comparison"; readonly comparison: ComparisonSet }
  | { readonly type: "select-comparison"; readonly comparisonId?: string }
  | { readonly type: "assign-role"; readonly candidateId: string; readonly role?: SystemRole }
  | { readonly type: "edit-system"; readonly name?: string; readonly rationale?: string }
  | { readonly type: "set-handoff"; readonly handoff: HandoffPreferences }
  | { readonly type: "update-source-state"; readonly sourceId: string; readonly state: SourceState }
  | { readonly type: "acknowledge-revision"; readonly revision: number }
  | { readonly type: "mark-intentionally-saved"; readonly revision: number };

const MAX_DOCUMENT_BYTES = 8_000_000;
const MAX_SOURCES = 2_048;
const MAX_FACES = 8_192;
const MAX_CANDIDATES = 8_192;
const MAX_RECIPES = 256;
const MAX_COMPARISONS = 256;
const MAX_COPY_LENGTH = 20_000;
const MAX_TRAY_SIZE = 4;
export const STUDY_LIMITS = Object.freeze({ sources: MAX_SOURCES, faces: MAX_FACES, candidates: MAX_CANDIDATES });

export class DomainError extends Error {
  override readonly name = "DomainError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maximum = 512): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isNonEmptyString(value: unknown, maximum = 512): value is string {
  return isString(value, maximum) && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function oneOf<const T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function safeDate(value: unknown, fallback = new Date(0).toISOString()): string {
  if (!isNonEmptyString(value)) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function newID(kind: string): string {
  return `${kind}:${globalThis.crypto.randomUUID()}`;
}

function parsePortableHint(value: unknown): PortableSourceHint {
  if (!isRecord(value) || !isNonEmptyString(value.fileName) || !isNonEmptyString(value.format, 32)) {
    throw new DomainError("Invalid portable Source hint");
  }
  if (value.fileSize !== undefined && !isInteger(value.fileSize)) throw new DomainError("Invalid Source size");
  if (value.faceCount !== undefined && !isInteger(value.faceCount, 1)) throw new DomainError("Invalid Face count");
  return {
    fileName: value.fileName,
    format: value.format,
    ...(value.fileSize === undefined ? {} : { fileSize: value.fileSize as number }),
    ...(value.faceCount === undefined ? {} : { faceCount: value.faceCount as number }),
  };
}

function parseSource(value: unknown): SourceSummary {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.displayName) ||
    !oneOf(value.lastKnownState, SOURCE_STATES)
  ) {
    throw new DomainError("Invalid Source");
  }
  return {
    id: value.id,
    displayName: value.displayName,
    hint: parsePortableHint(value.hint),
    lastKnownState: value.lastKnownState,
  };
}

function parseAxisDefinition(value: unknown): AxisDefinition {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.tag, 4) ||
    value.tag.length !== 4 ||
    !isNonEmptyString(value.name) ||
    !isFiniteNumber(value.minimum) ||
    !isFiniteNumber(value.defaultValue) ||
    !isFiniteNumber(value.maximum) ||
    value.minimum > value.defaultValue ||
    value.defaultValue > value.maximum
  ) {
    throw new DomainError("Invalid axis definition");
  }
  return {
    tag: value.tag,
    name: value.name,
    minimum: value.minimum,
    defaultValue: value.defaultValue,
    maximum: value.maximum,
  };
}

function parseAxisValue(value: unknown): AxisValue {
  if (!isRecord(value) || !isNonEmptyString(value.tag, 4) || value.tag.length !== 4 || !isFiniteNumber(value.value)) {
    throw new DomainError("Invalid axis value");
  }
  return { tag: value.tag, value: value.value };
}

function parseFeatureDefinition(value: unknown): FeatureDefinition {
  const groups = ["case", "figures", "ligatures", "stylistic", "language", "other"] as const;
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.tag, 4) ||
    value.tag.length !== 4 ||
    !isNonEmptyString(value.name) ||
    !oneOf(value.group, groups) ||
    typeof value.defaultEnabled !== "boolean"
  ) {
    throw new DomainError("Invalid feature definition");
  }
  return { tag: value.tag, name: value.name, group: value.group, defaultEnabled: value.defaultEnabled };
}

function parseFeatureSetting(value: unknown): FeatureSetting {
  if (!isRecord(value) || !isNonEmptyString(value.tag, 4) || value.tag.length !== 4 || typeof value.enabled !== "boolean") {
    throw new DomainError("Invalid feature setting");
  }
  return { tag: value.tag, enabled: value.enabled };
}

function parseFace(value: unknown): Face {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sourceId) ||
    !isNonEmptyString(value.family) ||
    !isNonEmptyString(value.style) ||
    (value.postScriptName !== undefined && !isString(value.postScriptName)) ||
    !isInteger(value.faceIndex) ||
    !Array.isArray(value.axes) ||
    !Array.isArray(value.namedInstances) ||
    !Array.isArray(value.features) ||
    !isRecord(value.coverage)
  ) {
    throw new DomainError("Invalid Face");
  }
  const coverage = value.coverage;
  if (
    !isInteger(coverage.supportedCodePointCount) ||
    !Array.isArray(coverage.scripts) ||
    !coverage.scripts.every((script) => isNonEmptyString(script, 64)) ||
    !Array.isArray(coverage.colorFormats) ||
    !coverage.colorFormats.every((format) => isNonEmptyString(format, 32)) ||
    !oneOf(coverage.evidenceLevel, ["unknown", "metadata", "shaped"] as const)
  ) {
    throw new DomainError("Invalid coverage evidence");
  }
  const axes = value.axes.map(parseAxisDefinition);
  const namedInstances = value.namedInstances.map((instance): NamedInstance => {
    if (!isRecord(instance) || !isNonEmptyString(instance.name) || !Array.isArray(instance.coordinates)) {
      throw new DomainError("Invalid named instance");
    }
    return { name: instance.name, coordinates: instance.coordinates.map(parseAxisValue) };
  });
  return {
    id: value.id,
    sourceId: value.sourceId,
    family: value.family,
    style: value.style,
    ...(value.postScriptName === undefined ? {} : { postScriptName: value.postScriptName as string }),
    faceIndex: value.faceIndex as number,
    axes,
    namedInstances,
    features: value.features.map(parseFeatureDefinition),
    coverage: {
      supportedCodePointCount: coverage.supportedCodePointCount as number,
      scripts: coverage.scripts as string[],
      colorFormats: coverage.colorFormats as string[],
      evidenceLevel: coverage.evidenceLevel,
    },
  };
}

function parseCandidate(value: unknown): Candidate {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.faceId) ||
    !isNonEmptyString(value.label) ||
    !oneOf(value.reviewState, REVIEW_STATES) ||
    !Array.isArray(value.axes) ||
    !Array.isArray(value.features) ||
    !oneOf(value.casing, TEXT_CASINGS) ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => isNonEmptyString(tag, 64)) ||
    !isString(value.notes, MAX_COPY_LENGTH) ||
    !isString(value.rationale, MAX_COPY_LENGTH) ||
    !isRecord(value.provenance) ||
    !oneOf(value.provenance.kind, ["import", "duplicate", "legacy", "catalog"] as const)
  ) {
    throw new DomainError("Invalid Candidate");
  }
  return {
    id: value.id,
    faceId: value.faceId,
    label: value.label,
    reviewState: value.reviewState,
    axes: value.axes.map(parseAxisValue),
    features: value.features.map(parseFeatureSetting),
    casing: value.casing,
    tags: [...new Set(value.tags as string[])],
    notes: value.notes,
    rationale: value.rationale,
    provenance: {
      kind: value.provenance.kind,
      ...(isNonEmptyString(value.provenance.fromCandidateId) ? { fromCandidateId: value.provenance.fromCandidateId } : {}),
      ...(oneOf(value.provenance.legacyReviewState, REVIEW_STATES)
        ? { legacyReviewState: value.provenance.legacyReviewState }
        : {}),
    },
  };
}

function parseRecipe(value: unknown): Recipe {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !oneOf(value.pack, RECIPE_PACKS) ||
    !isNonEmptyString(value.name) ||
    !isString(value.copy, MAX_COPY_LENGTH) ||
    !isString(value.language, 64) ||
    !oneOf(value.direction, TEXT_DIRECTIONS) ||
    !oneOf(value.casing, TEXT_CASINGS) ||
    !oneOf(value.sizePolicy, ["fixed", "fit"] as const) ||
    !isFiniteNumber(value.size) ||
    value.size < 4 ||
    value.size > 600 ||
    !isFiniteNumber(value.lineHeight) ||
    value.lineHeight < 0.5 ||
    value.lineHeight > 4 ||
    !isFiniteNumber(value.tracking) ||
    value.tracking < -0.25 ||
    value.tracking > 1 ||
    !oneOf(value.alignment, ["leading", "center", "trailing", "justified"] as const) ||
    !oneOf(value.background, ["paper", "ink", "split"] as const) ||
    (value.lineLimit !== undefined && !isInteger(value.lineLimit, 1))
  ) {
    throw new DomainError("Invalid Recipe");
  }
  return {
    id: value.id,
    pack: value.pack,
    name: value.name,
    copy: value.copy,
    language: value.language,
    direction: value.direction,
    casing: value.casing,
    sizePolicy: value.sizePolicy,
    size: value.size,
    lineHeight: value.lineHeight,
    tracking: value.tracking,
    alignment: value.alignment,
    background: value.background,
    ...(value.lineLimit === undefined ? {} : { lineLimit: value.lineLimit as number }),
  };
}

function parseComparison(value: unknown): ComparisonSet {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !Array.isArray(value.candidateIds) ||
    value.candidateIds.length < 2 ||
    value.candidateIds.length > 4 ||
    !value.candidateIds.every((candidateId) => isNonEmptyString(candidateId)) ||
    !isNonEmptyString(value.recipeId) ||
    !oneOf(value.policy, FIT_POLICIES) ||
    typeof value.blind !== "boolean" ||
    !isNonEmptyString(value.blindSeed) ||
    typeof value.revealed !== "boolean" ||
    !isString(value.rationale, MAX_COPY_LENGTH)
  ) {
    throw new DomainError("Invalid Comparison Set");
  }
  return {
    id: value.id,
    name: value.name,
    candidateIds: value.candidateIds as string[],
    recipeId: value.recipeId,
    policy: value.policy,
    blind: value.blind,
    blindSeed: value.blindSeed,
    revealed: value.revealed,
    rationale: value.rationale,
  };
}

function parseFontUse(value: unknown): FontUse {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !oneOf(value.role, SYSTEM_ROLES) ||
    !isNonEmptyString(value.faceId) ||
    (value.originatingCandidateId !== undefined && !isNonEmptyString(value.originatingCandidateId)) ||
    !Array.isArray(value.axes) ||
    !Array.isArray(value.features) ||
    !oneOf(value.casing, TEXT_CASINGS) ||
    !isFiniteNumber(value.tracking) ||
    !isString(value.language, 64) ||
    !oneOf(value.direction, TEXT_DIRECTIONS) ||
    !isString(value.rationale, MAX_COPY_LENGTH)
  ) {
    throw new DomainError("Invalid Font Use");
  }
  return {
    id: value.id,
    role: value.role,
    faceId: value.faceId,
    ...(value.originatingCandidateId === undefined ? {} : { originatingCandidateId: value.originatingCandidateId as string }),
    axes: value.axes.map(parseAxisValue),
    features: value.features.map(parseFeatureSetting),
    casing: value.casing,
    tracking: value.tracking,
    language: value.language,
    direction: value.direction,
    rationale: value.rationale,
  };
}

function parseSystem(value: unknown): TypographySystem {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isString(value.rationale, MAX_COPY_LENGTH) ||
    !Array.isArray(value.fontUses) ||
    value.fontUses.length > SYSTEM_ROLES.length
  ) {
    throw new DomainError("Invalid Typography System");
  }
  return { id: value.id, name: value.name, rationale: value.rationale, fontUses: value.fontUses.map(parseFontUse) };
}

function parseHandoff(value: unknown): HandoffPreferences {
  const profiles = ["internal", "client", "designer", "technical"] as const;
  const outputs = ["review-png", "compare-png", "system-png", "pdf", "summary", "json", "csv"] as const;
  if (
    !isRecord(value) ||
    !oneOf(value.profile, profiles) ||
    !Array.isArray(value.outputs) ||
    !value.outputs.every((output) => oneOf(output, outputs)) ||
    typeof value.includeSources !== "boolean"
  ) {
    throw new DomainError("Invalid Handoff preferences");
  }
  return {
    profile: value.profile,
    outputs: [...new Set(value.outputs as HandoffPreferences["outputs"])],
    includeSources: value.includeSources,
  };
}

export function assertStudyDocument(value: unknown): StudyDocument {
  if (!isRecord(value)) throw new DomainError("Study is not an object");
  if (typeof value.schemaVersion === "number" && value.schemaVersion > STUDY_SCHEMA_VERSION) {
    throw new DomainError(`Study schema ${value.schemaVersion} is newer than supported schema ${STUDY_SCHEMA_VERSION}`);
  }
  if (
    value.schemaVersion !== STUDY_SCHEMA_VERSION ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    !Array.isArray(value.sources) ||
    value.sources.length > MAX_SOURCES ||
    !Array.isArray(value.faces) ||
    value.faces.length > MAX_FACES ||
    !Array.isArray(value.candidates) ||
    value.candidates.length > MAX_CANDIDATES ||
    !Array.isArray(value.recipes) ||
    value.recipes.length === 0 ||
    value.recipes.length > MAX_RECIPES ||
    !Array.isArray(value.comparisonSets) ||
    value.comparisonSets.length > MAX_COMPARISONS ||
    !Array.isArray(value.typographySystems) ||
    value.typographySystems.length === 0 ||
    value.typographySystems.length > 16 ||
    !isNonEmptyString(value.activeSystemId) ||
    (value.extensions !== undefined && !isRecord(value.extensions))
  ) {
    throw new DomainError("Invalid Study v4 envelope");
  }
  const document: StudyDocument = {
    schemaVersion: STUDY_SCHEMA_VERSION,
    id: value.id,
    title: value.title,
    createdAt: safeDate(value.createdAt),
    updatedAt: safeDate(value.updatedAt),
    sources: value.sources.map(parseSource),
    faces: value.faces.map(parseFace),
    candidates: value.candidates.map(parseCandidate),
    recipes: value.recipes.map(parseRecipe),
    comparisonSets: value.comparisonSets.map(parseComparison),
    typographySystems: value.typographySystems.map(parseSystem),
    activeSystemId: value.activeSystemId,
    handoff: parseHandoff(value.handoff),
    ...(value.extensions === undefined ? {} : { extensions: value.extensions }),
  };
  const sourceIds = document.sources.map((source) => source.id);
  const faceIds = document.faces.map((face) => face.id);
  const candidateIds = document.candidates.map((candidate) => candidate.id);
  const recipeIds = document.recipes.map((recipe) => recipe.id);
  const comparisonIds = document.comparisonSets.map((comparison) => comparison.id);
  const systemIds = document.typographySystems.map((system) => system.id);
  if (![sourceIds, faceIds, candidateIds, recipeIds, comparisonIds, systemIds].every(unique)) {
    throw new DomainError("Study entity IDs must be unique within their type");
  }
  if (!document.faces.every((face) => sourceIds.includes(face.sourceId))) throw new DomainError("Face references missing Source");
  if (!document.candidates.every((candidate) => faceIds.includes(candidate.faceId))) throw new DomainError("Candidate references missing Face");
  if (
    !document.comparisonSets.every(
      (comparison) =>
        unique(comparison.candidateIds) &&
        comparison.candidateIds.every((id) => candidateIds.includes(id)) &&
        recipeIds.includes(comparison.recipeId),
    )
  ) {
    throw new DomainError("Comparison Set references are inconsistent");
  }
  for (const system of document.typographySystems) {
    if (!unique(system.fontUses.map((fontUse) => fontUse.id)) || !unique(system.fontUses.map((fontUse) => fontUse.role))) {
      throw new DomainError("Typography System roles and Font Use IDs must be unique");
    }
    for (const fontUse of system.fontUses) {
      if (!faceIds.includes(fontUse.faceId)) throw new DomainError("Font Use references missing Face");
      if (fontUse.originatingCandidateId) {
        const candidate = document.candidates.find((item) => item.id === fontUse.originatingCandidateId);
        if (!candidate || candidate.faceId !== fontUse.faceId) throw new DomainError("Font Use Candidate and Face disagree");
      }
    }
  }
  if (!systemIds.includes(document.activeSystemId)) throw new DomainError("Active Typography System does not exist");
  return document;
}

function parseBinding(value: unknown): SourceBindingSummary {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.sourceId) ||
    !oneOf(value.state, SOURCE_STATES) ||
    (value.previewUrl !== undefined && !isNonEmptyString(value.previewUrl, 2_048)) ||
    (value.modifiedAt !== undefined && !isNonEmptyString(value.modifiedAt)) ||
    !oneOf(value.rendererSupport, ["full", "metadata-only", "unsupported"] as const)
  ) {
    throw new DomainError("Invalid Source Binding summary");
  }
  return {
    sourceId: value.sourceId,
    state: value.state,
    ...(value.previewUrl === undefined ? {} : { previewUrl: value.previewUrl as string }),
    ...(value.modifiedAt === undefined ? {} : { modifiedAt: safeDate(value.modifiedAt) }),
    rendererSupport: value.rendererSupport,
  };
}

export function createSession(
  document: StudyDocument,
  bindings: readonly SourceBindingSummary[] = [],
  workspace?: Partial<WorkspaceState>,
  revision = 0,
): StudySession {
  const checked = assertStudyDocument(document);
  const bindingList = bindings.map(parseBinding).filter((binding) => checked.sources.some((source) => source.id === binding.sourceId));
  const defaultRecipeId = checked.recipes[0].id;
  const defaultCandidateId = checked.candidates[0]?.id;
  const requestedActiveRecipeId = workspace?.activeRecipeId;
  const activeRecipeId =
    requestedActiveRecipeId && checked.recipes.some((recipe) => recipe.id === requestedActiveRecipeId)
      ? requestedActiveRecipeId
      : defaultRecipeId;
  const requestedCandidateId = workspace?.selectedCandidateId;
  const selectedCandidateId =
    requestedCandidateId && checked.candidates.some((candidate) => candidate.id === requestedCandidateId)
      ? requestedCandidateId
      : defaultCandidateId;
  const requestedTrayIds = workspace?.trayIds ?? [];
  const trayIds = requestedTrayIds
    .filter(
      (id, index) =>
        checked.candidates.some((candidate) => candidate.id === id) && requestedTrayIds.indexOf(id) === index,
    )
    .slice(0, MAX_TRAY_SIZE);
  const requestedComparisonId = workspace?.activeComparisonId;
  const activeComparisonId =
    requestedComparisonId && checked.comparisonSets.some((comparison) => comparison.id === requestedComparisonId)
      ? requestedComparisonId
      : undefined;
  const state: WorkspaceState = {
    stage: workspace?.stage && STAGES.includes(workspace.stage) ? workspace.stage : "review",
    ...(selectedCandidateId ? { selectedCandidateId } : {}),
    activeRecipeId,
    ...(activeComparisonId ? { activeComparisonId } : {}),
    trayIds,
    ...(typeof workspace?.copyOverride === "string"
      ? { copyOverride: workspace.copyOverride.slice(0, MAX_COPY_LENGTH) }
      : {}),
    reviewLayout:
      workspace?.reviewLayout && ["contact-sheet", "focus", "waterfall"].includes(workspace.reviewLayout)
        ? workspace.reviewLayout
        : "contact-sheet",
    search: typeof workspace?.search === "string" ? workspace.search.slice(0, 200) : "",
    reviewFilter:
      workspace?.reviewFilter && ["all", ...REVIEW_STATES].includes(workspace.reviewFilter)
        ? workspace.reviewFilter
        : "all",
    activeScene:
      workspace?.activeScene && ["title", "logline", "body", "data", "legal"].includes(workspace.activeScene)
        ? workspace.activeScene
        : "title",
  };
  return {
    document: checked,
    workspace: state,
    bindings: bindingList,
    revision,
    acknowledgedRevision: revision,
    intentionallySavedRevision: 0,
  };
}

function updateWorkspace(session: StudySession, patch: Partial<WorkspaceState>): StudySession {
  return { ...session, workspace: { ...session.workspace, ...patch } };
}

function updateDocument(session: StudySession, patch: Partial<StudyDocument>): StudySession {
  return {
    ...session,
    document: assertStudyDocument({ ...session.document, ...patch, updatedAt: new Date().toISOString() }),
    revision: session.revision + 1,
  };
}

function candidateById(document: StudyDocument, candidateId: string): Candidate {
  const candidate = document.candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new DomainError(`Candidate does not exist: ${candidateId}`);
  return candidate;
}

function activeSystem(document: StudyDocument): TypographySystem {
  const system = document.typographySystems.find((item) => item.id === document.activeSystemId);
  if (!system) throw new DomainError("Active Typography System does not exist");
  return system;
}

function unreachable(value: never): never {
  throw new DomainError(`Unknown Study command: ${JSON.stringify(value)}`);
}

export function isSemanticCommand(command: StudyCommand): boolean {
  return ![
    "set-stage",
    "select-candidate",
    "select-next-unreviewed",
    "set-copy-override",
    "select-recipe",
    "toggle-tray",
    "set-tray",
    "set-review-layout",
    "set-search",
    "set-review-filter",
    "set-scene",
    "replace-bindings",
    "select-comparison",
    "acknowledge-revision",
    "mark-intentionally-saved",
  ].includes(command.type);
}

export function applyStudyCommand(session: StudySession, command: StudyCommand): StudySession {
  const { document, workspace } = session;
  switch (command.type) {
    case "set-stage":
      return workspace.stage === command.stage ? session : updateWorkspace(session, { stage: command.stage });
    case "select-candidate":
      if (command.candidateId) candidateById(document, command.candidateId);
      return updateWorkspace(session, { selectedCandidateId: command.candidateId });
    case "select-next-unreviewed": {
      const current = document.candidates.findIndex((candidate) => candidate.id === workspace.selectedCandidateId);
      const ordered = [...document.candidates.slice(current + 1), ...document.candidates.slice(0, current + 1)];
      const next = ordered.find((candidate) => candidate.reviewState === "unreviewed");
      return next ? updateWorkspace(session, { selectedCandidateId: next.id, stage: "review" }) : session;
    }
    case "set-review-state": {
      const ids = new Set(command.candidateIds);
      command.candidateIds.forEach((id) => candidateById(document, id));
      if (!document.candidates.some((candidate) => ids.has(candidate.id) && candidate.reviewState !== command.reviewState)) return session;
      return updateDocument(session, {
        candidates: document.candidates.map((candidate) =>
          ids.has(candidate.id) ? { ...candidate, reviewState: command.reviewState } : candidate,
        ),
      });
    }
    case "set-copy-override":
      return updateWorkspace(session, { copyOverride: command.copy?.slice(0, MAX_COPY_LENGTH) });
    case "select-recipe":
      if (!document.recipes.some((recipe) => recipe.id === command.recipeId)) throw new DomainError("Recipe does not exist");
      return updateWorkspace(session, { activeRecipeId: command.recipeId, copyOverride: undefined });
    case "toggle-tray": {
      candidateById(document, command.candidateId);
      const trayIds = workspace.trayIds.includes(command.candidateId)
        ? workspace.trayIds.filter((id) => id !== command.candidateId)
        : [...workspace.trayIds, command.candidateId].slice(-MAX_TRAY_SIZE);
      return updateWorkspace(session, { trayIds });
    }
    case "set-tray": {
      if (
        command.candidateIds.length > MAX_TRAY_SIZE ||
        !unique(command.candidateIds) ||
        !command.candidateIds.every((id) => document.candidates.some((candidate) => candidate.id === id))
      ) {
        throw new DomainError("Invalid comparison tray order");
      }
      return updateWorkspace(session, { trayIds: command.candidateIds });
    }
    case "set-review-layout":
      return updateWorkspace(session, { reviewLayout: command.layout });
    case "set-search":
      return updateWorkspace(session, { search: command.search.slice(0, 200) });
    case "set-review-filter":
      return updateWorkspace(session, { reviewFilter: command.filter });
    case "set-scene":
      return updateWorkspace(session, { activeScene: command.scene });
    case "replace-bindings":
      return { ...session, bindings: command.bindings.map(parseBinding) };
    case "ingest-sources": {
      const existingSources = new Set(document.sources.map((source) => source.id));
      const seen = new Set(existingSources);
      const fresh: ImportedSource[] = [];
      let sourceCount = document.sources.length;
      let faceCount = document.faces.length;
      let candidateCount = document.candidates.length;
      for (const item of command.imports) {
        if (seen.has(item.source.id)) continue;
        seen.add(item.source.id);
        if (
          sourceCount + 1 > MAX_SOURCES ||
          faceCount + item.faces.length > MAX_FACES ||
          candidateCount + item.faces.length > MAX_CANDIDATES
        ) continue;
        fresh.push(item);
        sourceCount += 1;
        faceCount += item.faces.length;
        candidateCount += item.faces.length;
      }
      const acceptedIds = new Set([...existingSources, ...fresh.map((item) => item.source.id)]);
      const mergedBindings = new Map(session.bindings.map((binding) => [binding.sourceId, binding]));
      command.imports.filter((item) => acceptedIds.has(item.source.id)).forEach((item) => mergedBindings.set(item.binding.sourceId, parseBinding(item.binding)));
      if (fresh.length === 0) return { ...session, bindings: [...mergedBindings.values()] };
      const newFaces = fresh.flatMap((item) => item.faces.map(parseFace));
      const newCandidates: Candidate[] = newFaces.map((face) => ({
        id: newID("candidate"),
        faceId: face.id,
        label: face.style || "Regular",
        reviewState: "unreviewed",
        axes: face.axes.map((axis) => ({ tag: axis.tag, value: axis.defaultValue })),
        features: face.features.filter((feature) => feature.defaultEnabled).map((feature) => ({ tag: feature.tag, enabled: true })),
        casing: "exact",
        tags: [],
        notes: "",
        rationale: "",
        provenance: { kind: "import" },
      }));
      const updated = updateDocument(session, {
        sources: [...document.sources, ...fresh.map((item) => parseSource(item.source))],
        faces: [...document.faces, ...newFaces],
        candidates: [...document.candidates, ...newCandidates],
      });
      return {
        ...updated,
        bindings: [...mergedBindings.values()],
        workspace: {
          ...updated.workspace,
          stage: "review",
          selectedCandidateId: newCandidates[0]?.id ?? workspace.selectedCandidateId,
        },
      };
    }
    case "rename-study": {
      const title = command.title.trim().slice(0, 200);
      return title && title !== document.title ? updateDocument(session, { title }) : session;
    }
    case "edit-candidate": {
      const current = candidateById(document, command.candidateId);
      const patch: Partial<Candidate> = {
        ...(command.patch.label === undefined
          ? {}
          : { label: command.patch.label.trim().slice(0, 200) || current.label }),
        ...(command.patch.casing === undefined ? {} : { casing: command.patch.casing }),
        ...(command.patch.notes === undefined ? {} : { notes: command.patch.notes.slice(0, MAX_COPY_LENGTH) }),
        ...(command.patch.rationale === undefined
          ? {}
          : { rationale: command.patch.rationale.slice(0, MAX_COPY_LENGTH) }),
        ...(command.patch.tags === undefined
          ? {}
          : {
              tags: [...new Set(command.patch.tags.map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))].slice(
                0,
                64,
              ),
            }),
      };
      return updateDocument(session, {
        candidates: document.candidates.map((candidate) => (candidate.id === current.id ? { ...candidate, ...patch } : candidate)),
      });
    }
    case "set-axis": {
      const current = candidateById(document, command.candidateId);
      const definition = faceForCandidate(document, current).axes.find((axis) => axis.tag === command.tag);
      if (!definition) throw new DomainError(`Axis does not exist: ${command.tag}`);
      const value = Math.min(definition.maximum, Math.max(definition.minimum, command.value));
      const axes = [...current.axes.filter((axis) => axis.tag !== command.tag), { tag: command.tag, value }];
      return updateDocument(session, {
        candidates: document.candidates.map((candidate) => (candidate.id === current.id ? { ...candidate, axes } : candidate)),
      });
    }
    case "set-feature": {
      const current = candidateById(document, command.candidateId);
      if (!faceForCandidate(document, current).features.some((feature) => feature.tag === command.tag)) {
        throw new DomainError(`Feature does not exist: ${command.tag}`);
      }
      const features = [...current.features.filter((feature) => feature.tag !== command.tag), { tag: command.tag, enabled: command.enabled }];
      return updateDocument(session, {
        candidates: document.candidates.map((candidate) => (candidate.id === current.id ? { ...candidate, features } : candidate)),
      });
    }
    case "duplicate-candidate": {
      const current = candidateById(document, command.candidateId);
      const duplicate: Candidate = {
        ...current,
        id: newID("candidate"),
        label: command.label?.trim().slice(0, 200) || `${current.label} copy`,
        reviewState: command.copyDecision ? current.reviewState : "unreviewed",
        rationale: command.copyDecision ? current.rationale : "",
        provenance: { kind: "duplicate", fromCandidateId: current.id },
      };
      const updated = updateDocument(session, { candidates: [...document.candidates, duplicate] });
      return { ...updated, workspace: { ...updated.workspace, selectedCandidateId: duplicate.id, stage: "review" } };
    }
    case "upsert-recipe": {
      const recipe = parseRecipe(command.recipe);
      const exists = document.recipes.some((item) => item.id === recipe.id);
      return updateDocument(session, {
        recipes: exists ? document.recipes.map((item) => (item.id === recipe.id ? recipe : item)) : [...document.recipes, recipe],
      });
    }
    case "delete-recipe": {
      if (document.recipes.length === 1) throw new DomainError("A Study must retain one Recipe");
      if (document.comparisonSets.some((comparison) => comparison.recipeId === command.recipeId)) {
        throw new DomainError("Recipe is used by a saved Comparison Set");
      }
      const recipes = document.recipes.filter((recipe) => recipe.id !== command.recipeId);
      const updated = updateDocument(session, { recipes });
      return {
        ...updated,
        workspace: {
          ...updated.workspace,
          activeRecipeId: workspace.activeRecipeId === command.recipeId ? recipes[0].id : workspace.activeRecipeId,
        },
      };
    }
    case "upsert-comparison": {
      const comparison = parseComparison(command.comparison);
      const exists = document.comparisonSets.some((item) => item.id === comparison.id);
      const updated = updateDocument(session, {
        comparisonSets: exists
          ? document.comparisonSets.map((item) => (item.id === comparison.id ? comparison : item))
          : [...document.comparisonSets, comparison],
      });
      return {
        ...updated,
        workspace: {
          ...updated.workspace,
          activeComparisonId: comparison.id,
          trayIds: comparison.candidateIds,
          stage: "compare",
        },
      };
    }
    case "select-comparison": {
      const comparison = command.comparisonId
        ? document.comparisonSets.find((item) => item.id === command.comparisonId)
        : undefined;
      if (command.comparisonId && !comparison) throw new DomainError("Comparison Set does not exist");
      return updateWorkspace(session, {
        activeComparisonId: command.comparisonId,
        ...(comparison ? { trayIds: comparison.candidateIds, activeRecipeId: comparison.recipeId } : {}),
      });
    }
    case "assign-role": {
      const candidate = candidateById(document, command.candidateId);
      const system = activeSystem(document);
      const retained = system.fontUses.filter(
        (fontUse) => fontUse.role !== command.role && fontUse.originatingCandidateId !== candidate.id,
      );
      const fontUses: FontUse[] = command.role
        ? [
            ...retained,
            {
              id: newID("font-use"),
              role: command.role,
              faceId: candidate.faceId,
              originatingCandidateId: candidate.id,
              axes: candidate.axes,
              features: candidate.features,
              casing: candidate.casing,
              tracking: 0,
              language: "",
              direction: "auto",
              rationale: candidate.rationale,
            },
          ]
        : system.fontUses.filter((fontUse) => fontUse.originatingCandidateId !== candidate.id);
      return updateDocument(session, {
        typographySystems: document.typographySystems.map((item) => (item.id === system.id ? { ...item, fontUses } : item)),
      });
    }
    case "edit-system": {
      const system = activeSystem(document);
      const name = command.name === undefined ? system.name : command.name.trim().slice(0, 200) || system.name;
      const rationale = command.rationale === undefined ? system.rationale : command.rationale.slice(0, MAX_COPY_LENGTH);
      return updateDocument(session, {
        typographySystems: document.typographySystems.map((item) =>
          item.id === system.id ? { ...item, name, rationale } : item,
        ),
      });
    }
    case "set-handoff":
      return updateDocument(session, { handoff: parseHandoff(command.handoff) });
    case "update-source-state":
      return updateDocument(session, {
        sources: document.sources.map((source) =>
          source.id === command.sourceId ? { ...source, lastKnownState: command.state } : source,
        ),
      });
    case "acknowledge-revision":
      return command.revision <= session.revision && command.revision > session.acknowledgedRevision
        ? { ...session, acknowledgedRevision: command.revision }
        : session;
    case "mark-intentionally-saved":
      return command.revision <= session.acknowledgedRevision && command.revision > session.intentionallySavedRevision
        ? { ...session, intentionallySavedRevision: command.revision }
        : session;
    default:
      return unreachable(command);
  }
}

export function faceForCandidate(document: StudyDocument, candidate: Candidate): Face {
  const face = document.faces.find((item) => item.id === candidate.faceId);
  if (!face) throw new DomainError(`Candidate Face does not exist: ${candidate.faceId}`);
  return face;
}

export function sourceForCandidate(document: StudyDocument, candidate: Candidate): SourceSummary {
  const face = faceForCandidate(document, candidate);
  const source = document.sources.find((item) => item.id === face.sourceId);
  if (!source) throw new DomainError(`Face Source does not exist: ${face.sourceId}`);
  return source;
}

export function bindingForSource(session: StudySession, sourceId: string): SourceBindingSummary | undefined {
  return session.bindings.find((binding) => binding.sourceId === sourceId);
}

export function activeRecipe(session: StudySession): Recipe {
  const recipe = session.document.recipes.find((item) => item.id === session.workspace.activeRecipeId);
  if (!recipe) throw new DomainError("Active Recipe does not exist");
  return recipe;
}

export function activeTypographySystem(document: StudyDocument): TypographySystem {
  return activeSystem(document);
}

export function serializeStudyDocument(document: StudyDocument): string {
  return `${JSON.stringify(assertStudyDocument(document), null, 2)}\n`;
}

export interface MigrationResult {
  readonly document: StudyDocument;
  readonly fromVersion: number;
  readonly warnings: readonly string[];
}

export function migrateLegacyStudy(value: Record<string, unknown>): MigrationResult {
  const version = typeof value.schemaVersion === "number" ? value.schemaVersion : 1;
  if (version > STUDY_SCHEMA_VERSION) throw new DomainError(`Study schema ${version} is newer than supported schema ${STUDY_SCHEMA_VERSION}`);
  if (version === STUDY_SCHEMA_VERSION) {
    return { document: assertStudyDocument(value), fromVersion: version, warnings: [] };
  }
  if (![1, 2, 3].includes(version) || !Array.isArray(value.records)) {
    throw new DomainError(`Unsupported legacy Study schema ${version}`);
  }
  const warnings = [
    "Legacy Maybe decisions were preserved deliberately.",
    "Legacy source paths were removed from portable Study data.",
  ];
  const sources: SourceSummary[] = [];
  const faces: Face[] = [];
  const candidates: Candidate[] = [];
  const fontUses: FontUse[] = [];
  const candidateByLegacyRecord = new Map<string, string>();
  const roleMap: Record<string, SystemRole | undefined> = {
    display: "display",
    body: "body",
    accent: "utility",
    data: "data",
    micro: "caption",
  };
  for (const [index, raw] of value.records.entries()) {
    if (!isRecord(raw)) continue;
    const legacyId = isNonEmptyString(raw.id) ? raw.id : String(index);
    const sourceId = `source:legacy:${legacyId}`;
    const faceId = `face:legacy:${legacyId}`;
    const candidateId = `candidate:legacy:${legacyId}`;
    const fileName = isNonEmptyString(raw.fileName) ? raw.fileName : `Legacy source ${index + 1}`;
    const family = isNonEmptyString(raw.familyName) ? raw.familyName : fileName;
    const style = isNonEmptyString(raw.styleName) ? raw.styleName : "Regular";
    const format = isNonEmptyString(raw.format, 32) ? raw.format : "FONT";
    const axes: AxisDefinition[] = Array.isArray(raw.axes)
      ? raw.axes.flatMap((axis) => {
          if (!isRecord(axis) || !isNonEmptyString(axis.tag, 4) || axis.tag.length !== 4) return [];
          const minimum = isFiniteNumber(axis.minimum) ? axis.minimum : 0;
          const maximum = isFiniteNumber(axis.maximum) ? axis.maximum : 1_000;
          const defaultValue = isFiniteNumber(axis.defaultValue)
            ? axis.defaultValue
            : Math.min(maximum, Math.max(minimum, 400));
          return [
            {
              tag: axis.tag,
              name: isNonEmptyString(axis.name) ? axis.name : axis.tag,
              minimum,
              defaultValue,
              maximum,
            },
          ];
        })
      : [];
    const reviewState = oneOf(raw.status, ["keep", "maybe", "reject"] as const) ? raw.status : "maybe";
    sources.push({
      id: sourceId,
      displayName: fileName,
      hint: {
        fileName,
        format,
        ...(isInteger(raw.fileSize) ? { fileSize: raw.fileSize as number } : {}),
        faceCount: 1,
      },
      lastKnownState: "missing",
    });
    faces.push({
      id: faceId,
      sourceId,
      family,
      style,
      ...(isNonEmptyString(raw.postScriptName) ? { postScriptName: raw.postScriptName } : {}),
      faceIndex: isInteger(raw.faceIndex) ? (raw.faceIndex as number) : 0,
      axes,
      namedInstances: [],
      features: [],
      coverage: { supportedCodePointCount: 0, scripts: [], colorFormats: [], evidenceLevel: "unknown" },
    });
    candidates.push({
      id: candidateId,
      faceId,
      label: style,
      reviewState,
      axes: axes.map((axis) => ({ tag: axis.tag, value: axis.defaultValue })),
      features: [],
      casing: oneOf(raw.casing, TEXT_CASINGS) ? raw.casing : "exact",
      tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => isNonEmptyString(tag, 64)) : [],
      notes: isString(raw.notes, MAX_COPY_LENGTH) ? raw.notes : "",
      rationale: "",
      provenance: { kind: "legacy", legacyReviewState: reviewState },
    });
    candidateByLegacyRecord.set(legacyId, candidateId);
    const role = typeof raw.role === "string" ? roleMap[raw.role] : undefined;
    if (role && !fontUses.some((fontUse) => fontUse.role === role)) {
      fontUses.push({
        id: `font-use:legacy:${legacyId}`,
        role,
        faceId,
        originatingCandidateId: candidateId,
        axes: axes.map((axis) => ({ tag: axis.tag, value: axis.defaultValue })),
        features: [],
        casing: oneOf(raw.casing, TEXT_CASINGS) ? raw.casing : "exact",
        tracking: 0,
        language: "",
        direction: "auto",
        rationale: "Migrated from legacy Role assignment.",
      });
    }
  }
  const now = new Date().toISOString();
  const recipe: Recipe = {
    id: "recipe:legacy:sample",
    pack: "blank",
    name: "Migrated sample",
    copy: isString(value.sampleText, MAX_COPY_LENGTH)
      ? value.sampleText
      : "Type carries the argument before a word is read.",
    language: "",
    direction: "auto",
    casing: "exact",
    sizePolicy: "fixed",
    size: 72,
    lineHeight: isFiniteNumber(value.lineHeight) ? value.lineHeight : 1.08,
    tracking: isFiniteNumber(value.tracking) ? value.tracking : -0.015,
    alignment: oneOf(value.alignment, ["leading", "center", "trailing", "justified"] as const)
      ? value.alignment
      : "leading",
    background: value.background === "light" ? "paper" : value.background === "dark" ? "ink" : "split",
  };
  const comparisonIds = Array.isArray(value.comparisonIDs)
    ? value.comparisonIDs
        .map(String)
        .map((id) => candidateByLegacyRecord.get(id))
        .filter((id): id is string => Boolean(id))
        .slice(0, 4)
    : [];
  const document = assertStudyDocument({
    schemaVersion: STUDY_SCHEMA_VERSION,
    id: isNonEmptyString(value.id) ? `study:${value.id}` : newID("study"),
    title: isNonEmptyString(value.title) ? value.title : "Migrated font study",
    createdAt: safeDate(value.createdAt, now),
    updatedAt: safeDate(value.updatedAt, now),
    sources,
    faces,
    candidates,
    recipes: [recipe],
    comparisonSets:
      comparisonIds.length >= 2
        ? [
            {
              id: newID("comparison"),
              name: "Migrated comparison",
              candidateIds: comparisonIds,
              recipeId: recipe.id,
              policy: "nominal",
              blind: false,
              blindSeed: "legacy",
              revealed: true,
              rationale: "",
            },
          ]
        : [],
    typographySystems: [{ id: "system:primary", name: "Primary system", rationale: "", fontUses }],
    activeSystemId: "system:primary",
    handoff: { profile: "designer", outputs: ["pdf", "summary", "json", "csv"], includeSources: true },
    extensions: { migratedFromSchema: version },
  });
  return { document, fromVersion: version, warnings };
}

export function parseStudyDocument(serialized: string): StudyDocument {
  if (new TextEncoder().encode(serialized).byteLength > MAX_DOCUMENT_BYTES) {
    throw new DomainError("Study exceeds 8 MB safety limit");
  }
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    throw new DomainError("Study is not valid JSON");
  }
  if (isRecord(value) && value.schemaVersion !== STUDY_SCHEMA_VERSION) return migrateLegacyStudy(value).document;
  return assertStudyDocument(value);
}

export function serializeRecoverySnapshot(session: StudySession): string {
  const serialized = JSON.stringify({
    recoveryVersion: 1,
    study: assertStudyDocument(session.document),
    workspace: session.workspace,
    revision: session.revision,
    acknowledgedRevision: session.acknowledgedRevision,
    intentionallySavedRevision: session.intentionallySavedRevision,
  });
  if (serialized.length > MAX_DOCUMENT_BYTES * 2) throw new DomainError("Recovery snapshot exceeds safety limit");
  return serialized;
}

export function parseRecoverySnapshot(serialized: string): StudySession {
  if (serialized.length > MAX_DOCUMENT_BYTES * 2) throw new DomainError("Recovery snapshot exceeds safety limit");
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    throw new DomainError("Recovery snapshot is not valid JSON");
  }
  if (!isRecord(value) || value.recoveryVersion !== 1 || !isRecord(value.workspace) || !isInteger(value.revision)) {
    throw new DomainError("Invalid recovery envelope");
  }
  const document = assertStudyDocument(value.study);
  const workspace = value.workspace;
  const session = createSession(
    document,
    [],
    {
      stage: oneOf(workspace.stage, STAGES) ? workspace.stage : "review",
      selectedCandidateId: isNonEmptyString(workspace.selectedCandidateId) ? workspace.selectedCandidateId : undefined,
      activeRecipeId: isNonEmptyString(workspace.activeRecipeId) ? workspace.activeRecipeId : document.recipes[0].id,
      activeComparisonId: isNonEmptyString(workspace.activeComparisonId) ? workspace.activeComparisonId : undefined,
      trayIds: Array.isArray(workspace.trayIds)
        ? workspace.trayIds.filter((candidateId) => isNonEmptyString(candidateId)).slice(0, 4)
        : [],
      copyOverride: isString(workspace.copyOverride, MAX_COPY_LENGTH) ? workspace.copyOverride : undefined,
      reviewLayout: oneOf(workspace.reviewLayout, ["contact-sheet", "focus", "waterfall"] as const)
        ? workspace.reviewLayout
        : "contact-sheet",
      search: isString(workspace.search, 200) ? workspace.search : "",
      reviewFilter: oneOf(workspace.reviewFilter, [...REVIEW_STATES, "all"] as const)
        ? workspace.reviewFilter
        : "all",
      activeScene: oneOf(workspace.activeScene, ["title", "logline", "body", "data", "legal"] as const)
        ? workspace.activeScene
        : "title",
    },
    value.revision,
  );
  return {
    ...session,
    acknowledgedRevision: isInteger(value.acknowledgedRevision)
      ? Math.min(value.acknowledgedRevision, value.revision)
      : 0,
    intentionallySavedRevision: isInteger(value.intentionallySavedRevision)
      ? Math.min(value.intentionallySavedRevision, value.revision)
      : 0,
  };
}

export function documentSemanticSnapshot(document: StudyDocument): string {
  return JSON.stringify(assertStudyDocument(document));
}

export function cssVariationSettings(candidate: Candidate): string {
  return candidate.axes.map((axis) => `'${axis.tag}' ${axis.value}`).join(", ");
}

export function cssFeatureSettings(candidate: Candidate): string {
  return candidate.features.map((feature) => `'${feature.tag}' ${feature.enabled ? 1 : 0}`).join(", ");
}

export function transformedCopy(copy: string, casing: TextCasing): string {
  switch (casing) {
    case "uppercase":
      return copy.toLocaleUpperCase();
    case "lowercase":
      return copy.toLocaleLowerCase();
    case "title":
      return copy.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
    case "exact":
      return copy;
  }
}
