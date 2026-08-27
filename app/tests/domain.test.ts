import assert from "node:assert/strict";
import test from "node:test";
import { createNewStudy } from "../src/fixture.js";
import {
  DomainError,
  activeTypographySystem,
  applyStudyCommand,
  assertStudyDocument,
  createSession,
  migrateLegacyStudy,
  parseRecoverySnapshot,
  parseStudyDocument,
  serializeRecoverySnapshot,
  serializeStudyDocument,
  type ImportedSource,
} from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";

function importedSource(): ImportedSource {
  return {
    source: {
      id: "source:opaque:new-sans",
      displayName: "New Sans",
      hint: { fileName: "new-sans.otf", format: "OTF", fileSize: 42_000, faceCount: 1 },
      lastKnownState: "readable",
    },
    binding: {
      sourceId: "source:opaque:new-sans",
      state: "readable",
      previewUrl: "pitch-font://asset/token-17",
      rendererSupport: "full",
    },
    faces: [{
      id: "face:opaque:new-sans:0",
      sourceId: "source:opaque:new-sans",
      family: "New Sans",
      style: "Regular",
      postScriptName: "NewSans-Regular",
      faceIndex: 0,
      axes: [],
      namedInstances: [],
      features: [{ tag: "liga", name: "Standard ligatures", group: "ligatures", defaultEnabled: true }],
      coverage: { supportedCodePointCount: 480, scripts: ["Latin"], colorFormats: [], evidenceLevel: "metadata" },
    }],
  };
}

test("canonical fixture keeps Source, Face, Candidate, Font Use, Recipe, and Binding distinct", () => {
  const session = createFixtureSession();
  assert.equal(session.document.sources.length, 4);
  assert.equal(session.document.candidates.length, 24);
  assert.equal(new Set(session.document.faces.map((face) => face.family)).size, 4);
  assert.equal(session.document.recipes.length, 6);
  assert.equal(session.bindings.filter((binding) => binding.state === "missing").length, 1);
  assert.equal(activeTypographySystem(session.document).fontUses.length, 2);
  assert.equal(session.workspace.trayIds.length, 3);
  const variableCandidates = session.document.candidates.filter((candidate) => candidate.axes.length > 0);
  assert.ok(variableCandidates.length > new Set(variableCandidates.map((candidate) => candidate.faceId)).size);
});

test("Review decisions are semantic; navigation and tray changes are workspace-only", () => {
  const fixture = createFixtureSession();
  const selected = fixture.workspace.selectedCandidateId;
  assert.ok(selected);
  const kept = applyStudyCommand(fixture, { type: "set-review-state", candidateIds: [selected], reviewState: "keep" });
  const next = applyStudyCommand(kept, { type: "select-next-unreviewed" });
  const tray = applyStudyCommand(next, { type: "toggle-tray", candidateId: selected });

  assert.equal(kept.document.candidates.find((candidate) => candidate.id === selected)?.reviewState, "keep");
  assert.equal(kept.revision, fixture.revision + 1);
  assert.notEqual(next.workspace.selectedCandidateId, selected);
  assert.equal(next.revision, kept.revision);
  assert.equal(tray.revision, next.revision);
  assert.ok(tray.workspace.trayIds.includes(selected));
  assert.equal(applyStudyCommand(kept, { type: "set-review-state", candidateIds: [selected], reviewState: "keep" }), kept);
});

test("Host import creates Unreviewed Candidates while the portable Study stays path-free", () => {
  const fixture = createFixtureSession();
  const added = applyStudyCommand(fixture, { type: "ingest-sources", imports: [importedSource()] });
  const candidate = added.document.candidates.at(-1);

  assert.equal(added.document.sources.length, fixture.document.sources.length + 1);
  assert.equal(added.document.faces.length, fixture.document.faces.length + 1);
  assert.equal(candidate?.reviewState, "unreviewed");
  assert.equal(added.workspace.selectedCandidateId, candidate?.id);
  assert.equal(added.bindings.at(-1)?.previewUrl, "pitch-font://asset/token-17");
  const portable = serializeStudyDocument(added.document);
  assert.doesNotMatch(portable, /pitch-font:|file:\/\/|\/Users\/|\/home\//);
  assert.doesNotMatch(portable, /previewUrl|binding/i);

  const deduplicated = applyStudyCommand(added, { type: "ingest-sources", imports: [importedSource()] });
  assert.equal(deduplicated.document.sources.length, added.document.sources.length);
  assert.equal(deduplicated.document.candidates.length, added.document.candidates.length);
});

test("Study capacity rejects excess Catalog Sources without corrupting the document", () => {
  const fixture = createFixtureSession();
  const filler = Array.from({ length: 2_048 - fixture.document.sources.length }, (_, index) => ({
    id: `source:capacity:${index}`,
    displayName: `Capacity ${index}`,
    hint: { fileName: `capacity-${index}.otf`, format: "OTF", faceCount: 1 },
    lastKnownState: "missing" as const,
  }));
  const saturated = createSession(assertStudyDocument({ ...fixture.document, sources: [...fixture.document.sources, ...filler] }), fixture.bindings);
  const unchanged = applyStudyCommand(saturated, { type: "ingest-sources", imports: [importedSource()] });
  assert.equal(unchanged.document.sources.length, 2_048);
  assert.equal(unchanged.document.candidates.length, saturated.document.candidates.length);
  assert.equal(unchanged.bindings.some((binding) => binding.sourceId === "source:opaque:new-sans"), false);
});

test("Role assignment creates a Font Use without collapsing Candidate or Face identity", () => {
  const fixture = createFixtureSession();
  const candidateId = "candidate:fixture:vector:4";
  const candidate = fixture.document.candidates.find((item) => item.id === candidateId);
  assert.ok(candidate);
  const assigned = applyStudyCommand(fixture, { type: "assign-role", candidateId, role: "display" });
  const use = activeTypographySystem(assigned.document).fontUses.find((item) => item.role === "display");

  assert.ok(use);
  assert.notEqual(use.id, candidate.id);
  assert.equal(use.faceId, candidate.faceId);
  assert.equal(use.originatingCandidateId, candidate.id);
  assert.notEqual(use.axes, candidate.axes);
});

test("duplicated family Candidates keep independent decisions and variable settings", () => {
  const fixture = createFixtureSession();
  const original = fixture.document.candidates.find((candidate) => candidate.axes.length > 0);
  assert.ok(original);
  const duplicated = applyStudyCommand(fixture, { type: "duplicate-candidate", candidateId: original.id, label: "Family alternate" });
  const duplicate = duplicated.document.candidates.at(-1);
  assert.ok(duplicate);
  assert.equal(duplicate.faceId, original.faceId);
  assert.equal(duplicate.reviewState, "unreviewed");
  const axis = duplicate.axes[0];
  assert.ok(axis);
  const adjusted = applyStudyCommand(duplicated, { type: "set-axis", candidateId: duplicate.id, tag: axis.tag, value: axis.value + 1 });
  const decided = applyStudyCommand(adjusted, { type: "set-review-state", candidateIds: [duplicate.id], reviewState: "keep" });
  assert.equal(decided.document.candidates.find((candidate) => candidate.id === original.id)?.reviewState, original.reviewState);
  assert.equal(decided.document.candidates.find((candidate) => candidate.id === original.id)?.axes[0]?.value, original.axes[0]?.value);
  assert.equal(decided.document.candidates.find((candidate) => candidate.id === duplicate.id)?.reviewState, "keep");
  assert.notEqual(decided.document.candidates.find((candidate) => candidate.id === duplicate.id)?.axes[0]?.value, original.axes[0]?.value);
});

test("recovery round-trips document/workspace/revisions but never Host-local bindings", () => {
  let session = createFixtureSession();
  session = applyStudyCommand(session, { type: "set-stage", stage: "system" });
  session = applyStudyCommand(session, { type: "set-review-state", candidateIds: [session.document.candidates[0].id], reviewState: "keep" });
  const serialized = serializeRecoverySnapshot(session);
  const restored = parseRecoverySnapshot(serialized);

  assert.deepEqual(restored.document, session.document);
  assert.deepEqual(restored.workspace, session.workspace);
  assert.equal(restored.revision, session.revision);
  assert.deepEqual(restored.bindings, []);
  assert.doesNotMatch(serialized, /previewUrl|pitch-font:|file:\/\//);
  assert.throws(() => parseRecoverySnapshot("{"), DomainError);
  assert.throws(() => parseRecoverySnapshot("x".repeat(16_000_001)), DomainError);
});

test("every supported legacy schema preserves Maybe evidence and strips source paths", () => {
  for (const schemaVersion of [1, 2, 3]) {
    const migrated = migrateLegacyStudy({
      schemaVersion,
      id: `legacy-${schemaVersion}`,
      title: `Legacy Study ${schemaVersion}`,
      records: [{ id: "one", fileName: "Family-Regular.otf", path: "/Users/person/Fonts/Family-Regular.otf", familyName: "Family", styleName: "Regular", status: "maybe", role: "display" }],
    });
    assert.equal(migrated.fromVersion, schemaVersion);
    assert.equal(migrated.document.schemaVersion, 4);
    assert.equal(migrated.document.candidates[0].reviewState, "maybe");
    assert.deepEqual(migrated.document.candidates[0].provenance, { kind: "legacy", legacyReviewState: "maybe" });
    assert.equal(activeTypographySystem(migrated.document).fontUses[0].role, "display");
    assert.doesNotMatch(serializeStudyDocument(migrated.document), /\/Users\/person/);
    assert.ok(migrated.warnings.some((warning) => warning.includes("paths")));
  }
});

test("validation rejects corrupt references, oversized input, and future schemas", () => {
  const fixture = createFixtureSession();
  const corrupt = JSON.parse(serializeStudyDocument(fixture.document)) as Record<string, unknown>;
  const candidates = corrupt.candidates as Array<Record<string, unknown>>;
  candidates[0].faceId = "face:absent";
  assert.throws(() => assertStudyDocument(corrupt), DomainError);
  assert.throws(() => parseStudyDocument("{"), DomainError);
  assert.throws(() => parseStudyDocument(" ".repeat(8_000_001)), DomainError);
  assert.throws(() => parseStudyDocument(JSON.stringify({ schemaVersion: 99 })), DomainError);
});

test("createSession repairs invalid workspace references instead of reviving stale IDs", () => {
  const fixture = createFixtureSession();
  const repaired = createSession(fixture.document, fixture.bindings, {
    selectedCandidateId: "candidate:absent",
    activeRecipeId: "recipe:absent",
    activeComparisonId: "comparison:absent",
    trayIds: ["candidate:absent", fixture.document.candidates[2].id],
    stage: "compare",
  });
  assert.equal(repaired.workspace.selectedCandidateId, fixture.document.candidates[0].id);
  assert.equal(repaired.workspace.activeRecipeId, fixture.document.recipes[0].id);
  assert.deepEqual(repaired.workspace.trayIds, [fixture.document.candidates[2].id]);
});

test("Study parser contains seeded corruption at the portable document seam", () => {
  const serialized = serializeStudyDocument(createFixtureSession().document);
  const corruptions: Array<(document: Record<string, any>) => void> = [
    (document) => { document.schemaVersion = 99; },
    (document) => { document.sources[1].id = document.sources[0].id; },
    (document) => { document.sources[0].hint.fileSize = Number.MAX_SAFE_INTEGER + 1; },
    (document) => { document.faces[0].coverage.supportedCodePointCount = -1; },
    (document) => { document.candidates[0].faceId = "face:absent"; },
    (document) => { document.candidates[0].reviewState = "approved"; },
    (document) => { document.recipes[0].copy = "x".repeat(20_001); },
    (document) => { document.comparisonSets[0].candidateIds[0] = "candidate:absent"; },
    (document) => { document.typographySystems[0].fontUses[0].role = "not-a-role"; },
    (document) => { document.activeSystemId = "system:absent"; },
  ];
  let state = 0x1a2b3c4d;
  for (let index = 0; index < 250; index += 1) {
    state = (Math.imul(state ^ state >>> 16, 0x45d9f3b) + index) | 0;
    const document = JSON.parse(serialized) as Record<string, any>;
    corruptions[(state >>> 0) % corruptions.length](document);
    assert.throws(() => parseStudyDocument(JSON.stringify(document)), DomainError);
  }
});
test("new internal studies include bound Sources in Handoff by default", () => {
  assert.equal(createNewStudy().document.handoff.includeSources, true);
});
