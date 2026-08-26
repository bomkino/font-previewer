export interface EnvelopeBase {
  protocolVersion: 1;
  sessionID: string;
}

export interface HostRequest extends EnvelopeBase {
  requestID: string;
  method: HostMethod;
  params: unknown;
}

export type HostResponse =
  | (EnvelopeBase & {
      requestID: string;
      ok: true;
      result: unknown;
    })
  | (EnvelopeBase & {
      requestID: string;
      ok: false;
      error: HostError;
    });

export interface HostEvent extends EnvelopeBase {
  eventID: string;
  event: HostEventName;
  payload: unknown;
}

export type HostMethod =
  | "host.getCapabilities"
  | "document.mirrorRevision"
  | "document.flush"
  | "document.save"
  | "document.saveAs"
  | "document.getRecovery"
  | "source.pick"
  | "source.discover"
  | "source.searchCatalog"
  | "source.bind"
  | "source.relink"
  | "source.reveal"
  | "source.cancelTask"
  | "render.inspectFace"
  | "render.request"
  | "render.cancel"
  | "render.release"
  | "handoff.chooseDestination"
  | "handoff.run"
  | "handoff.cancel"
  | "clipboard.writeText"
  | "app.showHelp";

export type HostEventName =
  | "host.ready"
  | "document.opened"
  | "document.mirrorAcknowledged"
  | "document.mirrorFailed"
  | "document.saved"
  | "document.recoveryAvailable"
  | "source.discoveryProgress"
  | "source.discovered"
  | "source.changed"
  | "source.missing"
  | "source.reconciled"
  | "render.ready"
  | "render.failed"
  | "task.progress"
  | "task.completed"
  | "task.failed"
  | "app.command"
  | "app.themeChanged"
  | "app.willClose";

export interface HostError {
  code:
    | "invalid_request"
    | "unsupported_protocol"
    | "unauthorized_capability"
    | "stale_revision"
    | "cancelled"
    | "not_found"
    | "unsupported_format"
    | "engine_unavailable"
    | "engine_quarantined"
    | "io_failure"
    | "validation_failure"
    | "durability_failure"
    | "unknown";
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface MirrorRevisionParams {
  studyID: string;
  baseRevision: number;
  nextRevision: number;
  snapshot: unknown;
  commandType: string;
}

export interface MirrorRevisionResult {
  acknowledgedRevision: number;
  recoveryPersistence: "scheduled" | "persisted" | "unavailable";
}

export interface HostCapabilities {
  platform: "mac" | "linux";
  appVersion: string;
  protocolVersions: number[];
  studySchemaVersions: number[];
  renderProfiles: Array<{
    id: string;
    engine: string;
    engineVersion?: string;
    supportedFormats: string[];
  }>;
  features: {
    installedCatalog: boolean;
    multipleWindows: boolean;
    sourceWatching: boolean;
    sourceCopies: boolean;
  };
}
