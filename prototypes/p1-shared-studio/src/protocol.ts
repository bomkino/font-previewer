import type { ImportedSource, Stage } from "./domain.js";

export type MenuCommand =
  | { readonly type: "open-import" }
  | { readonly type: "mark-keep" }
  | { readonly type: "next-unreviewed" }
  | { readonly type: "set-stage"; readonly stage: Stage }
  | { readonly type: "reload-studio" };

export type HostRequest =
  | { readonly type: "open-import" }
  | { readonly type: "native-undo" }
  | { readonly type: "reload-studio" }
  | { readonly type: "probe"; readonly serial: number };

export type HostResponse =
  | { readonly type: "import-result"; readonly sources: readonly ImportedSource[] }
  | { readonly type: "ack"; readonly action: "native-undo" | "reload-studio" }
  | {
      readonly type: "probe-result";
      readonly serial: number;
      readonly host: "browser" | "electron" | "wkwebview";
    };

export interface HostPort {
  request(request: HostRequest): Promise<HostResponse>;
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isHostRequest(value: unknown): value is HostRequest {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (["open-import", "native-undo", "reload-studio"].includes(value.type)) {
    return Object.keys(value).length === 1;
  }
  return (
    value.type === "probe" &&
    Number.isSafeInteger(value.serial) &&
    (value.serial as number) >= 0 &&
    Object.keys(value).length === 2
  );
}

export function isMenuCommand(value: unknown): value is MenuCommand {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (["open-import", "mark-keep", "next-unreviewed", "reload-studio"].includes(value.type)) {
    return Object.keys(value).length === 1;
  }
  return (
    value.type === "set-stage" &&
    typeof value.stage === "string" &&
    ["review", "compare", "system", "handoff"].includes(value.stage) &&
    Object.keys(value).length === 2
  );
}

export function isHostResponse(value: unknown): value is HostResponse {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "ack") {
    return (
      (value.action === "native-undo" || value.action === "reload-studio") &&
      Object.keys(value).length === 2
    );
  }
  if (value.type === "probe-result") {
    return (
      Number.isSafeInteger(value.serial) &&
      typeof value.host === "string" &&
      ["browser", "electron", "wkwebview"].includes(value.host) &&
      Object.keys(value).length === 3
    );
  }
  if (value.type === "import-result" && Array.isArray(value.sources)) {
    return (
      Object.keys(value).length === 2 &&
      value.sources.length <= 64 &&
      value.sources.every(
        (source) =>
          isRecord(source) &&
          Object.keys(source).length === 3 &&
          typeof source.id === "string" &&
          source.id.length > 0 &&
          source.id.length <= 512 &&
          typeof source.displayName === "string" &&
          source.displayName.length > 0 &&
          source.displayName.length <= 512 &&
          (source.state === "available" || source.state === "missing"),
      )
    );
  }
  return false;
}
