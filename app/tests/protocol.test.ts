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
  assert.equal(isHostRequest({ type: "scan-installed", query: "sans", cursor: 0, limit: 80, refresh: false }), true);
  assert.equal(isHostRequest({ type: "cancel-catalog" }), true);
  assert.equal(isHostRequest({ type: "scan-installed" }), false);
  assert.equal(isHostRequest({ type: "scan-installed", query: "", cursor: 0, limit: 201, refresh: false }), false);
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

test("installed Catalog responses are independently bounded and paginated", () => {
  const result = { type: "catalog-result", imports: [validImport()], indexed: 10_000, total: 320, rejected: 0, truncated: false, cancelled: false, nextCursor: 80 };
  assert.equal(isHostResponse(result), true);
  assert.equal(isHostResponse({ ...result, nextCursor: 321 }), false);
  assert.equal(isHostResponse({ ...result, total: 10_001 }), false);
  assert.equal(isHostResponse({ ...result, cancelled: "no" }), false);
  assert.equal(isHostResponse({ ...result, imports: [{ ...validImport(), binding: { ...validImport().binding, previewUrl: "file:///private/font.otf" } }] }), false);
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

test("HostBridge validators contain a deterministic malformed-message corpus", () => {
  let state = 0x6d2b79f5;
  const next = () => {
    state = (Math.imul(state ^ state >>> 15, 1 | state) + 0x6d2b79f5) | 0;
    return (state >>> 0) / 4_294_967_296;
  };
  const atom = () => [null, true, false, "", "x".repeat(2_049), -1, Number.MAX_SAFE_INTEGER + 1, 1.5][Math.floor(next() * 8)];
  const types = ["scan-installed", "mirror-study", "export-handoff", "probe", "task-progress", "catalog-result", "set-stage", "read-file"];
  const validators = [isHostRequest, isHostResponse, isHostEvent, isMenuCommand];

  for (let index = 0; index < 1_000; index += 1) {
    const value = {
      type: types[Math.floor(next() * types.length)],
      query: atom(),
      cursor: atom(),
      limit: atom(),
      refresh: atom(),
      document: { schemaVersion: atom(), nested: [atom(), { value: atom() }] },
      payload: Array.from({ length: Math.floor(next() * 8) }, atom),
      unexpected: true,
    };
    for (const validate of validators) {
      assert.doesNotThrow(() => validate(value));
      assert.equal(validate(value), false);
    }
  }

  const edgeCases = [
    { type: "scan-installed", query: "", cursor: Number.MAX_SAFE_INTEGER + 1, limit: 80, refresh: false },
    { type: "scan-installed", query: "x".repeat(201), cursor: 0, limit: 80, refresh: false },
    { type: "cancel-catalog", task: "catalog" },
    { type: "ack", action: "cancel-catalog", path: "/private/font.otf" },
    { type: "catalog-result", imports: [], indexed: 0, total: 0, rejected: 0, truncated: false, cancelled: false, nextCursor: 1 },
    { type: "task-progress", task: "catalog", completed: 2, total: 1 },
  ];
  for (const value of edgeCases) {
    for (const validate of validators) assert.doesNotThrow(() => validate(value));
  }
  assert.equal(isHostRequest(edgeCases[0]), false);
  assert.equal(isHostRequest(edgeCases[1]), false);
  assert.equal(isHostRequest(edgeCases[2]), false);
  assert.equal(isHostResponse(edgeCases[3]), false);
  assert.equal(isHostResponse(edgeCases[4]), false);
  assert.equal(isHostEvent(edgeCases[5]), false);
});
