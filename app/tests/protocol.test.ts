import assert from "node:assert/strict";
import test from "node:test";
import { createFixtureSession } from "../src/fixture.js";
import { isHostEvent, isHostRequest, isHostResponse, isMenuCommand } from "../src/protocol.js";

function validImport() {
  return {
    source: { id: "source:opaque", displayName: "Example", hint: { fileName: "example.otf", format: "OTF", faceCount: 1 }, lastKnownState: "readable" },
    binding: { sourceId: "source:opaque", state: "readable", previewUrl: "pitch-font://asset/token", rendererSupport: "full" },
    faces: [{ id: "face:opaque:0", sourceId: "source:opaque", family: "Example", style: "Regular", faceIndex: 0, axes: [], namedInstances: [], features: [], coverage: { supportedCodePointCount: 0, scripts: [], colorFormats: [], evidenceLevel: "unknown" } }],
  };
}

test("HostBridge accepts only the bounded request vocabulary", () => {
  const session = createFixtureSession();
  assert.equal(isHostRequest({ type: "open-import" }), true);
  assert.equal(isHostRequest({ type: "probe", serial: 12 }), true);
  assert.equal(isHostRequest({ type: "probe", serial: -1 }), false);
  assert.equal(isHostRequest({ type: "open-import", path: "/private/font.otf" }), false);
  assert.equal(isHostRequest({ type: "read-file", path: "/private/font.otf" }), false);
  assert.equal(isHostRequest({ type: "mirror-study", document: session.document, workspace: session.workspace, revision: 2 }), true);
  assert.equal(isHostRequest({ type: "export-handoff", document: session.document, revision: 2, preferences: { ...session.document.handoff, includeSources: true }, sourcePermissionAcknowledged: false }), false);
});

test("import responses carry opaque capabilities, never filesystem paths", () => {
  assert.equal(isHostResponse({ type: "import-result", imports: [validImport()], rejected: 0, truncated: false }), true);
  const leaked = validImport() as ReturnType<typeof validImport> & { path?: string };
  leaked.path = "/private/font.otf";
  assert.equal(isHostResponse({ type: "import-result", imports: [leaked], rejected: 0, truncated: false }), false);
  assert.equal(isHostResponse({ type: "import-result", imports: [{ ...validImport(), binding: { ...validImport().binding, previewUrl: "file:///private/font.otf" } }], rejected: 0, truncated: false }), false);
});

test("native commands and Host events are runtime validated", () => {
  assert.equal(isMenuCommand({ type: "mark-keep" }), true);
  assert.equal(isMenuCommand({ type: "scan-installed" }), true);
  assert.equal(isMenuCommand({ type: "undo-study" }), true);
  assert.equal(isMenuCommand({ type: "set-stage", stage: "handoff" }), true);
  assert.equal(isMenuCommand({ type: "set-stage", stage: "inspect" }), false);
  assert.equal(isMenuCommand({ type: "open-import", path: "/tmp/font.otf" }), false);
  assert.equal(isHostEvent({ type: "source-state", sourceId: "source:opaque", state: "missing" }), true);
  assert.equal(isHostEvent({ type: "source-state", sourceId: "source:opaque", state: "available" }), false);
  assert.equal(isHostEvent({ type: "task-progress", task: "export", completed: 4, total: 8 }), true);
});

test("launch recovery envelope validates all portable and Host-local seams", () => {
  const session = createFixtureSession();
  const response = {
    type: "launch-state",
    capabilities: { host: "electron", platform: "linux", importFiles: true, importFolders: true, installedCatalog: true, nativeSave: true, transactionalHandoff: true, sourceRelink: true, sourceReveal: true, renderProfile: "Chromium", fullFormats: ["OTF"], metadataOnlyFormats: ["TTC"] },
    recovery: { document: session.document, workspace: session.workspace, bindings: session.bindings, revision: 4, intentionallySavedRevision: 2 },
    recentDocuments: [],
  } as const;
  assert.equal(isHostResponse(response), true);
  assert.equal(isHostResponse({ ...response, recovery: { ...response.recovery, revision: -1 } }), false);
});
