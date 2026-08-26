import { parseStudyDocument, serializeStudyDocument, type ImportedSource } from "./domain.js";
import { createNewStudy } from "./fixture.js";
import {
  isHostEvent,
  isHostResponse,
  type HostEvent,
  type HostPort,
  type HostRequest,
  type HostResponse,
  type MenuCommand,
} from "./protocol.js";

declare global {
  interface Window {
    fontPreviewerHost?: HostPort;
  }
}

const browserMenuListeners = new Set<(command: MenuCommand) => void>();
const browserEventListeners = new Set<(event: HostEvent) => void>();
let browserDocumentName = "Untitled font study.pitchfontstudy";

function browserCapabilities(): Extract<HostResponse, { type: "launch-state" }> {
  return {
    type: "launch-state",
    capabilities: {
      host: "browser",
      platform: "browser",
      importFiles: true,
      importFolders: false,
      installedCatalog: false,
      nativeSave: false,
      transactionalHandoff: false,
      sourceRelink: false,
      sourceReveal: false,
      renderProfile: "Browser preview · development only",
      fullFormats: ["TTF", "OTF", "WOFF", "WOFF2"],
      metadataOnlyFormats: ["TTC", "OTC", "DFONT"],
    },
    recentDocuments: [],
  };
}

function extensionOf(name: string): string {
  const part = name.split(".").at(-1);
  return part ? part.toLocaleUpperCase() : "FONT";
}

async function chooseFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = "none";
    const finish = () => {
      const files = [...(input.files ?? [])];
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", finish, { once: true });
    window.addEventListener("focus", () => window.setTimeout(() => !input.files?.length && finish(), 500), {
      once: true,
    });
    document.body.append(input);
    input.click();
  });
}

function importedBrowserFile(file: File, existingSourceId?: string): ImportedSource {
  const sourceId = existingSourceId ?? `source:browser:${globalThis.crypto.randomUUID()}`;
  const faceId = `face:${sourceId}:0`;
  const extension = extensionOf(file.name);
  const support = ["TTF", "OTF", "WOFF", "WOFF2"].includes(extension) ? "full" : "metadata-only";
  return {
    source: {
      id: sourceId,
      displayName: file.name.replace(/\.[^.]+$/, ""),
      hint: { fileName: file.name, format: extension, fileSize: file.size, faceCount: 1 },
      lastKnownState: support === "full" ? "readable" : "metadata-only",
    },
    binding: {
      sourceId,
      state: support === "full" ? "readable" : "metadata-only",
      previewUrl: URL.createObjectURL(file),
      modifiedAt: new Date(file.lastModified).toISOString(),
      rendererSupport: support,
    },
    faces: [
      {
        id: faceId,
        sourceId,
        family: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        style: "Regular",
        faceIndex: 0,
        axes: [],
        namedInstances: [],
        features: [],
        coverage: { supportedCodePointCount: 0, scripts: [], colorFormats: [], evidenceLevel: "unknown" },
      },
    ],
  };
}

function downloadText(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

const browserPort: HostPort = {
  async request(request: HostRequest): Promise<HostResponse> {
    switch (request.type) {
      case "get-launch-state":
        return browserCapabilities();
      case "open-import": {
        const files = await chooseFiles(".otf,.ttf,.ttc,.otc,.dfont,.woff,.woff2", true);
        return { type: "import-result", imports: files.slice(0, 64).map((file) => importedBrowserFile(file)), rejected: 0, truncated: files.length > 64 };
      }
      case "scan-installed":
        return { type: "catalog-result", imports: [], indexed: 0, total: 0, rejected: 0, truncated: false };
      case "open-study": {
        const [file] = await chooseFiles(".pitchfontstudy,application/json", false);
        if (!file) {
          return {
            type: "study-opened",
            document: parseStudyDocument(serializeStudyDocument(createNewStudy().document)),
            bindings: [],
            warnings: ["Open cancelled."],
          };
        }
        browserDocumentName = file.name;
        return { type: "study-opened", document: parseStudyDocument(await file.text()), bindings: [], warnings: [] };
      }
      case "mirror-study":
        return { type: "mirror-ack", revision: request.revision, recoveryPersisted: false };
      case "save-study": {
        browserDocumentName = request.saveAs ? `${request.document.title}.pitchfontstudy` : browserDocumentName;
        downloadText(browserDocumentName, serializeStudyDocument(request.document), "application/json");
        return { type: "save-result", revision: request.revision, displayName: browserDocumentName, saved: true };
      }
      case "export-handoff": {
        downloadText(`${request.document.title}-handoff.json`, serializeStudyDocument(request.document), "application/json");
        return { type: "export-result", displayName: `${request.document.title}-handoff.json`, exported: true, fileCount: 1 };
      }
      case "relink-source": {
        const [file] = await chooseFiles(".otf,.ttf,.ttc,.otc,.dfont,.woff,.woff2", false);
        return file ? { type: "relink-result", import: importedBrowserFile(file, request.sourceId), relinked: true } : { type: "relink-result", relinked: false };
      }
      case "reveal-source":
        return { type: "ack", action: "reveal-source" };
      case "native-undo":
        document.execCommand("undo");
        return { type: "ack", action: "native-undo" };
      case "reload-studio":
        window.setTimeout(() => window.location.reload(), 30);
        return { type: "ack", action: "reload-studio" };
      case "probe":
        return { type: "probe-result", serial: request.serial, host: "browser" };
    }
  },
  onMenuCommand(listener) {
    browserMenuListeners.add(listener);
    return () => browserMenuListeners.delete(listener);
  },
  onHostEvent(listener) {
    browserEventListeners.add(listener);
    return () => browserEventListeners.delete(listener);
  },
};

export function getHostPort(): HostPort {
  const rawPort = window.fontPreviewerHost ?? browserPort;
  return {
    async request(request) {
      const response: unknown = await rawPort.request(request);
      if (!isHostResponse(response)) throw new Error("Host returned an invalid response");
      return response;
    },
    onMenuCommand(listener) {
      return rawPort.onMenuCommand((command) => listener(command));
    },
    onHostEvent(listener) {
      return rawPort.onHostEvent((event) => {
        if (isHostEvent(event)) listener(event);
      });
    },
  };
}
