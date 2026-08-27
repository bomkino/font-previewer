import {
  SOURCE_STATES,
  STAGES,
  assertStudyDocument,
  type HandoffPreferences,
  type ImportedSource,
  type SourceBindingSummary,
  type Stage,
  type StudyDocument,
  type WorkspaceState,
} from "./domain.js";

export const HOST_PROTOCOL_VERSION = 2 as const;
export const CATALOG_PAGE_SIZE = 80 as const;
export const MAX_CATALOG_PAGE_SIZE = 200 as const;

export interface HostCapabilities {
  readonly host: "browser" | "electron" | "wkwebview";
  readonly platform: "browser" | "linux" | "macos";
  readonly importFiles: boolean;
  readonly importFolders: boolean;
  readonly installedCatalog: boolean;
  readonly nativeSave: boolean;
  readonly transactionalHandoff: boolean;
  readonly sourceRelink: boolean;
  readonly sourceReveal: boolean;
  readonly renderProfile: string;
  readonly fullFormats: readonly string[];
  readonly metadataOnlyFormats: readonly string[];
}

export type MenuCommand =
  | { readonly type: "new-study" }
  | { readonly type: "open-study" }
  | { readonly type: "open-import" }
  | { readonly type: "scan-installed" }
  | { readonly type: "save-study" }
  | { readonly type: "save-study-as" }
  | { readonly type: "export-handoff" }
  | { readonly type: "undo-study" }
  | { readonly type: "redo-study" }
  | { readonly type: "mark-keep" }
  | { readonly type: "next-unreviewed" }
  | { readonly type: "set-stage"; readonly stage: Stage }
  | { readonly type: "flush-recovery" }
  | { readonly type: "reload-studio" };

export type HostEvent =
  | { readonly type: "source-state"; readonly sourceId: string; readonly state: (typeof SOURCE_STATES)[number] }
  | { readonly type: "mirror-warning"; readonly message: string }
  | { readonly type: "task-progress"; readonly task: "import" | "export" | "catalog"; readonly completed: number; readonly total?: number };

export interface RecoveryEnvelope {
  readonly document: StudyDocument;
  readonly workspace: WorkspaceState;
  readonly bindings: readonly SourceBindingSummary[];
  readonly revision: number;
  readonly intentionallySavedRevision: number;
}

export type HostRequest =
  | { readonly type: "get-launch-state" }
  | { readonly type: "open-import" }
  | {
      readonly type: "scan-installed";
      readonly query: string;
      readonly cursor: number;
      readonly limit: number;
      readonly refresh: boolean;
    }
  | { readonly type: "cancel-catalog" }
  | { readonly type: "open-study" }
  | {
      readonly type: "mirror-study";
      readonly document: StudyDocument;
      readonly workspace: WorkspaceState;
      readonly revision: number;
    }
  | { readonly type: "save-study"; readonly document: StudyDocument; readonly revision: number; readonly saveAs: boolean }
  | {
      readonly type: "export-handoff";
      readonly document: StudyDocument;
      readonly revision: number;
      readonly preferences: HandoffPreferences;
      readonly sourcePermissionAcknowledged: boolean;
    }
  | { readonly type: "relink-source"; readonly sourceId: string }
  | { readonly type: "reveal-source"; readonly sourceId: string }
  | { readonly type: "native-undo" }
  | { readonly type: "finish-terminate"; readonly revision: number; readonly recoveryPersisted: boolean }
  | { readonly type: "reload-studio" }
  | { readonly type: "probe"; readonly serial: number };

export type HostResponse =
  | {
      readonly type: "launch-state";
      readonly capabilities: HostCapabilities;
      readonly recovery?: RecoveryEnvelope;
      readonly recentDocuments: readonly string[];
    }
  | {
      readonly type: "import-result";
      readonly imports: readonly ImportedSource[];
      readonly rejected: number;
      readonly truncated: boolean;
    }
  | {
      readonly type: "catalog-result";
      readonly imports: readonly ImportedSource[];
      readonly indexed: number;
      readonly total: number;
      readonly rejected: number;
      readonly truncated: boolean;
      readonly cancelled: boolean;
      readonly nextCursor?: number;
    }
  | {
      readonly type: "study-opened";
      readonly document: StudyDocument;
      readonly bindings: readonly SourceBindingSummary[];
      readonly migratedFrom?: number;
      readonly warnings: readonly string[];
    }
  | { readonly type: "mirror-ack"; readonly revision: number; readonly recoveryPersisted: boolean }
  | { readonly type: "save-result"; readonly revision: number; readonly displayName: string; readonly saved: boolean }
  | { readonly type: "export-result"; readonly displayName: string; readonly exported: boolean; readonly fileCount: number }
  | { readonly type: "relink-result"; readonly import?: ImportedSource; readonly relinked: boolean }
  | { readonly type: "ack"; readonly action: "native-undo" | "finish-terminate" | "reload-studio" | "reveal-source" | "cancel-catalog" }
  | {
      readonly type: "probe-result";
      readonly serial: number;
      readonly host: "browser" | "electron" | "wkwebview";
    };

export interface HostPort {
  request(request: HostRequest): Promise<HostResponse>;
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
  onHostEvent(listener: (event: HostEvent) => void): () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function allowedKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && Object.keys(value).every((key) => allowed.has(key));
}

function isString(value: unknown, maximum = 2_048): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isInteger(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function validWorkspace(value: unknown): value is WorkspaceState {
  if (!isRecord(value)) return false;
  return (
    typeof value.stage === "string" &&
    STAGES.includes(value.stage as Stage) &&
    (value.selectedCandidateId === undefined || isString(value.selectedCandidateId)) &&
    isString(value.activeRecipeId) &&
    (value.activeComparisonId === undefined || isString(value.activeComparisonId)) &&
    Array.isArray(value.trayIds) &&
    value.trayIds.length <= 4 &&
    value.trayIds.every((candidateId) => isString(candidateId)) &&
    (value.copyOverride === undefined || typeof value.copyOverride === "string") &&
    ["contact-sheet", "focus", "waterfall"].includes(String(value.reviewLayout)) &&
    typeof value.search === "string" &&
    ["all", "unreviewed", "keep", "maybe", "reject"].includes(String(value.reviewFilter)) &&
    ["title", "logline", "body", "data", "legal"].includes(String(value.activeScene))
  );
}

function validHandoff(value: unknown): value is HandoffPreferences {
  if (!isRecord(value)) return false;
  return (
    ["internal", "client", "designer", "technical"].includes(String(value.profile)) &&
    Array.isArray(value.outputs) &&
    value.outputs.every((output) =>
      ["review-png", "compare-png", "system-png", "pdf", "summary", "json", "csv"].includes(String(output)),
    ) &&
    typeof value.includeSources === "boolean"
  );
}

function validBinding(value: unknown): value is SourceBindingSummary {
  if (!isRecord(value)) return false;
  return (
    allowedKeys(value, ["sourceId", "state", "rendererSupport"], ["previewUrl", "modifiedAt"]) &&
    isString(value.sourceId) &&
    typeof value.state === "string" &&
    SOURCE_STATES.includes(value.state as SourceBindingSummary["state"]) &&
    (value.previewUrl === undefined || (isString(value.previewUrl) && !value.previewUrl.startsWith("file:"))) &&
    (value.modifiedAt === undefined || isString(value.modifiedAt)) &&
    ["full", "metadata-only", "unsupported"].includes(String(value.rendererSupport))
  );
}

function validImportedSource(value: unknown): value is ImportedSource {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["source", "binding", "faces"]) ||
    !isRecord(value.source) ||
    !allowedKeys(value.source, ["id", "displayName", "hint", "lastKnownState"]) ||
    !isRecord(value.source.hint) ||
    !allowedKeys(value.source.hint, ["fileName", "format"], ["fileSize", "faceCount"]) ||
    !validBinding(value.binding) ||
    !Array.isArray(value.faces)
  ) return false;
  const source = value.source;
  if (!value.faces.every((face) => {
    if (
      !isRecord(face) ||
      !allowedKeys(face, ["id", "sourceId", "family", "style", "faceIndex", "axes", "namedInstances", "features", "coverage"], ["postScriptName"]) ||
      !Array.isArray(face.axes) ||
      !face.axes.every((axis) => isRecord(axis) && exactKeys(axis, ["tag", "name", "minimum", "defaultValue", "maximum"])) ||
      !Array.isArray(face.namedInstances) ||
      !face.namedInstances.every((instance) =>
        isRecord(instance) &&
        exactKeys(instance, ["name", "coordinates"]) &&
        Array.isArray(instance.coordinates) &&
        instance.coordinates.every((coordinate) => isRecord(coordinate) && exactKeys(coordinate, ["tag", "value"]))) ||
      !Array.isArray(face.features) ||
      !face.features.every((feature) => isRecord(feature) && exactKeys(feature, ["tag", "name", "group", "defaultEnabled"])) ||
      !isRecord(face.coverage) ||
      !exactKeys(face.coverage, ["supportedCodePointCount", "scripts", "colorFormats", "evidenceLevel"])
    ) return false;
    return true;
  })) return false;
  try {
    const now = new Date().toISOString();
    assertStudyDocument({
      schemaVersion: 4,
      id: "study:protocol-validation",
      title: "Protocol validation",
      createdAt: now,
      updatedAt: now,
      sources: [value.source],
      faces: value.faces,
      candidates: [],
      recipes: [
        {
          id: "recipe:validation",
          pack: "blank",
          name: "Validation",
          copy: "",
          language: "",
          direction: "auto",
          casing: "exact",
          sizePolicy: "fixed",
          size: 12,
          lineHeight: 1,
          tracking: 0,
          alignment: "leading",
          background: "paper",
        },
      ],
      comparisonSets: [],
      typographySystems: [{ id: "system:validation", name: "Validation", rationale: "", fontUses: [] }],
      activeSystemId: "system:validation",
      handoff: { profile: "internal", outputs: ["json"], includeSources: false },
    });
    return value.binding.sourceId === source.id && value.faces.every((face) => isRecord(face) && face.sourceId === source.id);
  } catch {
    return false;
  }
}

function validDocument(value: unknown): value is StudyDocument {
  try {
    assertStudyDocument(value);
    return true;
  } catch {
    return false;
  }
}

export function isHostRequest(value: unknown): value is HostRequest {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (["get-launch-state", "open-import", "open-study", "native-undo", "reload-studio", "cancel-catalog"].includes(value.type)) {
    return exactKeys(value, ["type"]);
  }
  if (value.type === "scan-installed") {
    return (
      exactKeys(value, ["type", "query", "cursor", "limit", "refresh"]) &&
      typeof value.query === "string" &&
      value.query.length <= 200 &&
      isInteger(value.cursor) &&
      isInteger(value.limit, 1) &&
      value.limit <= MAX_CATALOG_PAGE_SIZE &&
      typeof value.refresh === "boolean"
    );
  }
  if (value.type === "probe") return exactKeys(value, ["type", "serial"]) && isInteger(value.serial);
  if (value.type === "finish-terminate") {
    return exactKeys(value, ["type", "revision", "recoveryPersisted"]) && isInteger(value.revision) && typeof value.recoveryPersisted === "boolean";
  }
  if (value.type === "mirror-study") {
    return (
      exactKeys(value, ["type", "document", "workspace", "revision"]) &&
      validDocument(value.document) &&
      validWorkspace(value.workspace) &&
      isInteger(value.revision)
    );
  }
  if (value.type === "save-study") {
    return (
      exactKeys(value, ["type", "document", "revision", "saveAs"]) &&
      validDocument(value.document) &&
      isInteger(value.revision) &&
      typeof value.saveAs === "boolean"
    );
  }
  if (value.type === "export-handoff") {
    return (
      exactKeys(value, ["type", "document", "revision", "preferences", "sourcePermissionAcknowledged"]) &&
      validDocument(value.document) &&
      isInteger(value.revision) &&
      validHandoff(value.preferences) &&
      typeof value.sourcePermissionAcknowledged === "boolean" &&
      (!value.preferences.includeSources || value.sourcePermissionAcknowledged)
    );
  }
  if (value.type === "relink-source" || value.type === "reveal-source") {
    return exactKeys(value, ["type", "sourceId"]) && isString(value.sourceId);
  }
  return false;
}

export function isMenuCommand(value: unknown): value is MenuCommand {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (
    [
      "new-study",
      "open-study",
      "open-import",
      "scan-installed",
      "save-study",
      "save-study-as",
      "export-handoff",
      "undo-study",
      "redo-study",
      "mark-keep",
      "next-unreviewed",
      "flush-recovery",
      "reload-studio",
    ].includes(value.type)
  ) {
    return exactKeys(value, ["type"]);
  }
  return value.type === "set-stage" && exactKeys(value, ["type", "stage"]) && STAGES.includes(value.stage as Stage);
}

export function isHostEvent(value: unknown): value is HostEvent {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "source-state") {
    return (
      exactKeys(value, ["type", "sourceId", "state"]) &&
      isString(value.sourceId) &&
      typeof value.state === "string" &&
      SOURCE_STATES.includes(value.state as SourceBindingSummary["state"])
    );
  }
  if (value.type === "mirror-warning") return exactKeys(value, ["type", "message"]) && isString(value.message, 1_024);
  return (
    value.type === "task-progress" &&
    allowedKeys(value, ["type", "task", "completed"], ["total"]) &&
    ["import", "export", "catalog"].includes(String(value.task)) &&
    isInteger(value.completed) &&
    (value.total === undefined || (isInteger(value.total) && value.completed <= value.total))
  );
}

export function isHostResponse(value: unknown): value is HostResponse {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "probe-result") {
    return exactKeys(value, ["type", "serial", "host"]) && isInteger(value.serial) && ["browser", "electron", "wkwebview"].includes(String(value.host));
  }
  if (value.type === "ack") {
    return exactKeys(value, ["type", "action"]) && ["native-undo", "finish-terminate", "reload-studio", "reveal-source", "cancel-catalog"].includes(String(value.action));
  }
  if (value.type === "mirror-ack") return exactKeys(value, ["type", "revision", "recoveryPersisted"]) && isInteger(value.revision) && typeof value.recoveryPersisted === "boolean";
  if (value.type === "save-result") {
    return exactKeys(value, ["type", "revision", "displayName", "saved"]) && isInteger(value.revision) && isString(value.displayName) && typeof value.saved === "boolean";
  }
  if (value.type === "export-result") {
    return exactKeys(value, ["type", "displayName", "exported", "fileCount"]) && isString(value.displayName) && typeof value.exported === "boolean" && isInteger(value.fileCount);
  }
  if (value.type === "import-result") {
    return (
      exactKeys(value, ["type", "imports", "rejected", "truncated"]) &&
      Array.isArray(value.imports) &&
      value.imports.length <= 2_048 &&
      value.imports.every(validImportedSource) &&
      isInteger(value.rejected) &&
      typeof value.truncated === "boolean"
    );
  }
  if (value.type === "catalog-result") {
    if (
      !allowedKeys(value, ["type", "imports", "indexed", "total", "rejected", "truncated", "cancelled"], ["nextCursor"]) ||
      !Array.isArray(value.imports) ||
      value.imports.length > MAX_CATALOG_PAGE_SIZE ||
      !value.imports.every(validImportedSource) ||
      !isInteger(value.indexed) ||
      !isInteger(value.total) ||
      value.total > value.indexed ||
      !isInteger(value.rejected) ||
      typeof value.truncated !== "boolean" ||
      typeof value.cancelled !== "boolean" ||
      (value.nextCursor !== undefined && (!isInteger(value.nextCursor, 1) || value.nextCursor > value.total))
    ) return false;
    return true;
  }
  if (value.type === "study-opened") {
    return (
      allowedKeys(value, ["type", "document", "bindings", "warnings"], ["migratedFrom"]) &&
      validDocument(value.document) &&
      Array.isArray(value.bindings) &&
      value.bindings.every(validBinding) &&
      (value.migratedFrom === undefined || isInteger(value.migratedFrom, 1)) &&
      Array.isArray(value.warnings) &&
      value.warnings.every((warning) => isString(warning, 1_024))
    );
  }
  if (value.type === "relink-result") {
    return allowedKeys(value, ["type", "relinked"], ["import"]) && typeof value.relinked === "boolean" && (value.import === undefined || validImportedSource(value.import));
  }
  if (value.type === "launch-state") {
    if (!allowedKeys(value, ["type", "capabilities", "recentDocuments"], ["recovery"]) || !isRecord(value.capabilities) || !Array.isArray(value.recentDocuments)) return false;
    const capabilities = value.capabilities;
    const validCapabilities =
      exactKeys(capabilities, ["host", "platform", "importFiles", "importFolders", "installedCatalog", "nativeSave", "transactionalHandoff", "sourceRelink", "sourceReveal", "renderProfile", "fullFormats", "metadataOnlyFormats"]) &&
      ["browser", "electron", "wkwebview"].includes(String(capabilities.host)) &&
      ["browser", "linux", "macos"].includes(String(capabilities.platform)) &&
      ["importFiles", "importFolders", "installedCatalog", "nativeSave", "transactionalHandoff", "sourceRelink", "sourceReveal"].every(
        (key) => typeof capabilities[key] === "boolean",
      ) &&
      isString(capabilities.renderProfile) &&
      Array.isArray(capabilities.fullFormats) &&
      capabilities.fullFormats.every((format) => isString(format)) &&
      Array.isArray(capabilities.metadataOnlyFormats) &&
      capabilities.metadataOnlyFormats.every((format) => isString(format));
    if (!validCapabilities || !value.recentDocuments.every((documentName) => isString(documentName))) return false;
    if (value.recovery === undefined) return true;
    if (!isRecord(value.recovery) || !exactKeys(value.recovery, ["document", "workspace", "bindings", "revision", "intentionallySavedRevision"])) return false;
    return (
      validDocument(value.recovery.document) &&
      validWorkspace(value.recovery.workspace) &&
      Array.isArray(value.recovery.bindings) &&
      value.recovery.bindings.every(validBinding) &&
      isInteger(value.recovery.revision) &&
      isInteger(value.recovery.intentionallySavedRevision)
    );
  }
  return false;
}
