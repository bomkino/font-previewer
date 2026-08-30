import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App.js";
import type { HostPort } from "../src/protocol.js";

const inertHost: HostPort = {
  async request(request) {
    if (request.type === "get-launch-state") return {
      type: "launch-state",
      capabilities: { host: "browser", platform: "browser", importFiles: true, importFolders: false, installedCatalog: true, nativeSave: false, transactionalHandoff: false, sourceRelink: false, sourceReveal: false, renderProfile: "Test", fullFormats: ["OTF"], metadataOnlyFormats: ["TTC"] },
      recentDocuments: [],
    };
    if (request.type === "probe") return { type: "probe-result", serial: request.serial, host: "browser" };
    if (request.type === "open-import") return { type: "import-result", imports: [], rejected: 0, truncated: false };
    if (request.type === "scan-installed") return { type: "catalog-result", imports: [], indexed: 0, total: 0, rejected: 0, truncated: false, cancelled: false };
    if (request.type === "cancel-catalog") return { type: "ack", action: "cancel-catalog" };
    if (request.type === "mirror-study") return { type: "mirror-ack", revision: request.revision, recoveryPersisted: false };
    if (request.type === "finish-terminate") return { type: "ack", action: "finish-terminate" };
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
  assert.match(html, /Catalog <span>0<\/span>/);
  assert.match(html, /Sets <span>1<\/span>/);
  assert.match(html, /Review/);
  assert.match(html, /Compare/);
  assert.match(html, /System/);
  assert.match(html, /Handoff/);
  assert.match(html, /Add Fonts/);
  assert.match(html, /Contact Sheet/);
  assert.match(html, /Comparison tray/);
  assert.match(html, /Family Group/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /class="skip-link" href="#workspace-heading">Skip to main content/);
  assert.equal((html.match(/<main/g) ?? []).length, 1);
  assert.equal((html.match(/<aside/g) ?? []).length, 2);
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
  assert.equal((html.match(/<footer/g) ?? []).length, 1);
  assert.doesNotMatch(html, /(?:file:\/\/|\/Users\/|\/home\/)/);
});

test("brand mark source stays renderer-relative for packaged hosts", () => {
  const html = renderToStaticMarkup(<App />);
  const source = /<img class="brand-mark" src="([^"]+)"/.exec(html)?.[1];
  assert.equal(source, "./font-previewer-icon-64.png");
});

test("Studio controls use centered Phosphor carets and stable disclosure shells", () => {
  const html = renderToStaticMarkup(<App />);
  const selects = html.match(/<select/g) ?? [];
  const selectShells = html.match(/class="select-control"/g) ?? [];
  const selectCarets = html.match(/interface-icon-caret-down/g) ?? [];
  const disclosureTriggers = html.match(/class="inspector-disclosure-trigger"/g) ?? [];
  assert.ok(selects.length >= 3);
  assert.equal(selectShells.length, selects.length);
  assert.equal(selectCarets.length, selects.length);
  assert.equal(disclosureTriggers.length, 2);
  assert.equal((html.match(/interface-icon-caret-right/g) ?? []).length, 2);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="inspector-details-content" aria-hidden="true" inert=""/);
  assert.doesNotMatch(html, /<(?:details|summary)[ >]/);
});

test("Simple mode restores the original font-to-four-up-board pipeline", () => {
  globalThis.location.search = "?fixture=1&mode=simple";
  let html = "";
  try {
    html = renderToStaticMarkup(<App />);
  } finally {
    globalThis.location.search = "?fixture=1";
  }
  assert.match(html, /data-interface-mode="simple"/);
  assert.match(html, /Stress test/);
  assert.match(html, /aria-label="Simple sections"/);
  assert.match(html, /Same size/);
  assert.match(html, /Fit each/);
  assert.match(html, /Lock line breaks/);
  assert.match(html, /Tune 24 fonts/);
  assert.match(html, /Your boards\. Already made\./);
  assert.match(html, /Board 01/);
  assert.match(html, /Index 1 \/ 2/);
  assert.match(html, /5152 × 2160 export/);
  assert.equal((html.match(/class="simple-font-card(?: |")/gu) ?? []).length, 0);
  assert.equal((html.match(/<main/g) ?? []).length, 1);
  assert.equal((html.match(/<aside/g) ?? []).length, 0);
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
  assert.doesNotMatch(html, /(?:file:\/\/|\/Users\/|\/home\/)/);
});

test("Simple Body Copy makes one complete reading page per included font", () => {
  globalThis.location.search = "?fixture=1&mode=simple&page=body";
  let html = "";
  try {
    html = renderToStaticMarkup(<App />);
  } finally {
    globalThis.location.search = "?fixture=1";
  }
  assert.match(html, /data-simple-page-mode="body"/);
  assert.match(html, /Body Copy/);
  assert.match(html, /Before the city wakes/);
  assert.match(html, /The useful quiet/);
  assert.match(html, /After the first rain/);
  assert.match(html, /One font\. One reading page\./);
  assert.match(html, /Matched reading size/);
  assert.match(html, /Edit once here; the same copy, casing, font order, styles, and variable axes stay with the Study in Studio\./);
  assert.match(html, /Good body type rarely asks to be admired\./);
  assert.equal((html.match(/class="simple-page-wrap simple-body-page-wrap"/gu) ?? []).length, 20);
  assert.equal((html.match(/class="simple-body-reading-copy simple-fitted-copy simple-fitted-body"/gu) ?? []).length, 20);
  assert.equal((html.match(/5152 × 2160 export/gu) ?? []).length, 20);
  assert.equal((html.match(/<main/g) ?? []).length, 1);
  assert.equal((html.match(/<aside/g) ?? []).length, 0);
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Stress test/);
  assert.doesNotMatch(html, /(?:file:\/\/|\/Users\/|\/home\/)/);
});

test("welcome skip link has a focusable destination", () => {
  globalThis.location.search = "";
  let html = "";
  try {
    html = renderToStaticMarkup(<App />);
  } finally {
    globalThis.location.search = "?fixture=1";
  }
  assert.match(html, /class="skip-link" href="#welcome-heading">Skip to main content/);
  assert.match(html, /<h1 id="welcome-heading" tabindex="-1">/);
});
