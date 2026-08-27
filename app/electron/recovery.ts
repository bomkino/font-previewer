import { createSession, parseStudyDocument, type StudyDocument, type WorkspaceState } from "../src/domain.js";

export interface RecoveryDisk {
  readonly version: 1;
  readonly document: StudyDocument;
  readonly workspace: WorkspaceState;
  readonly revision: number;
  readonly intentionallySavedRevision: number;
}

export function parseRecoveryDisk(text: string): RecoveryDisk {
  const raw: unknown = JSON.parse(text);
  if (!raw || typeof raw !== "object") throw new Error("Recovery envelope is malformed.");
  const value = raw as Record<string, unknown>;
  if (
    value.version !== 1 ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Number.isSafeInteger(value.intentionallySavedRevision) ||
    (value.intentionallySavedRevision as number) < 0 ||
    !value.document ||
    !value.workspace ||
    typeof value.workspace !== "object"
  ) throw new Error("Recovery envelope is malformed.");
  const document = parseStudyDocument(JSON.stringify(value.document));
  const revision = value.revision as number;
  const session = createSession(document, [], value.workspace as Partial<WorkspaceState>, revision);
  return {
    version: 1,
    document: session.document,
    workspace: session.workspace,
    revision,
    intentionallySavedRevision: Math.min(value.intentionallySavedRevision as number, revision),
  };
}
