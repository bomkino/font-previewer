import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App.js";
import type { HostPort } from "../src/protocol.js";

const inertHost: HostPort = {
  async request(request) {
    if (request.type === "get-launch-state") return {
      type: "launch-state",
      capabilities: { host: "browser", platform: "browser", importFiles: true, importFolders: false, installedCatalog: false, nativeSave: false, transactionalHandoff: false, sourceRelink: false, sourceReveal: false, renderProfile: "Test", fullFormats: ["OTF"], metadataOnlyFormats: ["TTC"] },
      recentDocuments: [],
    };
    if (request.type === "probe") return { type: "probe-result", serial: request.serial, host: "browser" };
    if (request.type === "open-import" || request.type === "scan-installed") return { type: "import-result", imports: [], rejected: 0, truncated: false };
    if (request.type === "mirror-study") return { type: "mirror-ack", revision: request.revision, recoveryPersisted: false };
    if (request.type === "save-study") return { type: "save-result", revision: request.revision, displayName: "Test.pitchfontstudy", saved: true };
    if (request.type === "export-handoff") return { type: "export-result", displayName: "Test Handoff", exported: true, fileCount: 4 };
    if (request.type === "relink-source") return { type: "relink-result", relinked: false };
    return { type: "ack", action: request.type as "native-undo" | "reload-studio" | "reveal-source" };
  },
  onMenuCommand() { return () => undefined; },
  onHostEvent() { return () => undefined; },
};

Object.defineProperty(globalThis, "location", { configurable: true, value: { search: "?fixture=1" } });
Object.defineProperty(globalThis, "window", { configurable: true, value: { fontPreviewerHost: inertHost } });

test("shared Studio renders the complete Review-to-Handoff product seam", () => {
  const html = renderToStaticMarkup(<App />);
  assert.match(html, /Study <span>24<\/span>/);
  assert.match(html, /Sources <span>4<\/span>/);
  assert.match(html, /Sets <span>1<\/span>/);
  assert.match(html, /Review/);
  assert.match(html, /Compare/);
  assert.match(html, /System/);
  assert.match(html, /Handoff/);
  assert.match(html, /Import/);
  assert.match(html, /Contact Sheet/);
  assert.match(html, /Comparison tray/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-current="step"/);
  assert.equal((html.match(/<main/g) ?? []).length, 1);
  assert.equal((html.match(/<aside/g) ?? []).length, 2);
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
  assert.equal((html.match(/<footer/g) ?? []).length, 1);
  assert.doesNotMatch(html, /(?:file:\/\/|\/Users\/|\/home\/)/);
});
