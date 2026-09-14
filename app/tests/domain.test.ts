import assert from "node:assert/strict";
import test from "node:test";
import { createNewStudy } from "../src/fixture.js";
import {
  DomainError,
  STUDY_SCHEMA_VERSION,
  activeRecipe,
  activeTypographySystem,
  applyStudyCommand,
  assertStudyDocument,
  createSession,
  candidatesInSimpleSet,
  migrateLegacyStudy,
  parseRecoverySnapshot,
  parseStudyDocument,
  serializeRecoverySnapshot,
  serializeStudyDocument,
  simpleFontSets,
  transformedCopy,
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
  const originalPosition = duplicated.document.candidates.findIndex((candidate) => candidate.id === original.id);
  const duplicate = duplicated.document.candidates[originalPosition + 1];
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
  const longLabel = "A".repeat(512);
  const longNamed = createSession({ ...fixture.document, candidates: fixture.document.candidates.map((candidate) => candidate.id === original.id ? { ...candidate, label: longLabel } : candidate) });
  const longDuplicate = applyStudyCommand(longNamed, { type: "duplicate-candidate", candidateId: original.id });
  assert.equal(longDuplicate.document.candidates.find((candidate) => candidate.id === longDuplicate.workspace.selectedCandidateId)?.label, longLabel, "duplicating a maximum-length imported name must not truncate it or invalidate the Study");
});

test("Simple-mode candidate order, removal, and original casing controls remain semantic and undoable", () => {
  const fixture = createFixtureSession();
  const first = fixture.document.candidates[0];
  const second = fixture.document.candidates[1];
  const moved = applyStudyCommand(fixture, { type: "move-candidate", candidateId: first.id, toIndex: 3 });
  assert.equal(moved.document.candidates[3]?.id, first.id);
  assert.equal(moved.revision, fixture.revision + 1);

  const removed = applyStudyCommand(moved, { type: "remove-candidate", candidateId: second.id });
  assert.equal(removed.document.candidates.some((candidate) => candidate.id === second.id), false);
  assert.equal(removed.workspace.trayIds.includes(second.id), false);
  assert.ok(removed.document.comparisonSets.every((comparison) => comparison.candidateIds.length >= 2));

  assert.equal(transformedCopy("the dog in the night", "exact"), "the dog in the night");
  assert.equal(transformedCopy("the dog in the night", "uppercase"), "THE DOG IN THE NIGHT");
  assert.equal(transformedCopy("THE DOG IN THE NIGHT", "lowercase"), "the dog in the night");
  assert.equal(transformedCopy("THE DOG IN THE NIGHT", "title"), "The Dog In The Night");
  assert.equal(transformedCopy("the dog in the night", "ap-title"), "The Dog in the Night");
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
    assert.equal(migrated.document.schemaVersion, STUDY_SCHEMA_VERSION);
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

test("Simple sets keep independent copy, sizing, casing, and variable choices in one portable Study", () => {
  const fixture = createFixtureSession();
  const headline = fixture.document.candidates[0]!;
  let session = applyStudyCommand(fixture, { type: "copy-to-simple-set", candidateIds: [headline.id], setId: "body" });
  const body = candidatesInSimpleSet(session.document, "body")[0]!;
  assert.notEqual(body.id, headline.id);
  assert.equal(body.faceId, headline.faceId);
  assert.equal(body.reviewState, "unreviewed");
  session = applyStudyCommand(session, { type: "edit-simple-set", setId: "headlines", patch: { copy: "A bold headline", fitPolicy: "locked-lines" } });
  session = applyStudyCommand(session, { type: "edit-simple-set", setId: "body", patch: { copy: "Body copy has its own rhythm.\n\nAnd its own second paragraph.", fitPolicy: "fit" } });
  session = applyStudyCommand(session, { type: "edit-candidate", candidateId: body.id, patch: { casing: "uppercase" } });
  session = applyStudyCommand(session, { type: "set-axis", candidateId: body.id, tag: "wght", value: 900 });
  const duplicate = applyStudyCommand(session, { type: "duplicate-candidate", candidateId: body.id });
  const bodyCopies = candidatesInSimpleSet(duplicate.document, "body");
  assert.equal(bodyCopies.length, 2);
  assert.equal(bodyCopies[1]!.simpleSet, "body");
  assert.equal(candidatesInSimpleSet(duplicate.document, "headlines").length, fixture.document.candidates.length);
  assert.deepEqual(duplicate.document.candidates.find((candidate) => candidate.id === headline.id), headline);
  assert.deepEqual(simpleFontSets(duplicate.document), {
    headlines: { copy: "A bold headline", fitPolicy: "locked-lines" },
    body: { copy: "Body copy has its own rhythm.\n\nAnd its own second paragraph.", fitPolicy: "fit" },
  });
  const selected = applyStudyCommand(duplicate, { type: "select-simple-set", setId: "body" });
  assert.equal(selected.revision, duplicate.revision);
  assert.equal(activeRecipe(selected).copy, simpleFontSets(selected.document).body.copy);
  const recovered = parseRecoverySnapshot(serializeRecoverySnapshot(selected));
  assert.deepEqual(recovered.document, selected.document);
  assert.equal(recovered.workspace.simpleSet, "body");
  assert.equal(activeRecipe(recovered).copy, simpleFontSets(selected.document).body.copy);
  assert.deepEqual(parseStudyDocument(serializeStudyDocument(selected.document)), selected.document);
});

test("selecting a saved Studio comparison restores its Recipe without changing either Simple set", () => {
  const fixture = createFixtureSession();
  const comparison = fixture.document.comparisonSets[0]!;
  const recipe = fixture.document.recipes.find((item) => item.id === comparison.recipeId)!;
  for (const setId of ["headlines", "body"] as const) {
    let session = applyStudyCommand(fixture, { type: "edit-simple-set", setId, patch: { copy: "Independent Simple copy", fitPolicy: "locked-lines" } });
    session = applyStudyCommand(session, { type: "select-simple-set", setId });
    session = applyStudyCommand(session, { type: "set-copy-override", copy: "Temporary override" });
    const selected = applyStudyCommand(session, { type: "select-comparison", comparisonId: comparison.id });
    assert.equal(selected.workspace.simpleSet, undefined);
    assert.equal(selected.workspace.copyOverride, undefined);
    assert.equal(activeRecipe(selected).copy, recipe.copy);
    assert.deepEqual(selected.workspace.trayIds, comparison.candidateIds);
    assert.equal(selected.document, session.document, "selecting a comparison must not overwrite Simple copy or sizing");
    assert.equal(selected.revision, session.revision);
  }
});

test("saving Simple-authored comparison copy snapshots its complete Recipe once without changing shared settings", () => {
  const fixture = createFixtureSession();
  const referenced = activeRecipe(fixture);
  const copy = "My authored campaign headline";
  const differentLayout = { ...referenced, id: "recipe:different-layout", copy, lineLimit: (referenced.lineLimit ?? 0) + 1 };
  let session = createSession({ ...fixture.document, recipes: [...fixture.document.recipes, differentLayout] }, fixture.bindings);
  session = applyStudyCommand(session, { type: "edit-simple-set", setId: "headlines", patch: { copy } });
  session = applyStudyCommand(session, { type: "select-simple-set", setId: "headlines" });
  const command = { type: "upsert-comparison" as const, comparison: { ...session.document.comparisonSets[0]!, id: "comparison:authored", recipeId: referenced.id }, displayedCopy: activeRecipe(session).copy };
  const saved = applyStudyCommand(session, command);
  const comparison = saved.document.comparisonSets.find((item) => item.id === command.comparison.id)!;
  const snapshot = saved.document.recipes.find((recipe) => recipe.id === comparison.recipeId)!;
  assert.notEqual(snapshot.id, referenced.id);
  assert.notEqual(snapshot.id, differentLayout.id, "matching copy with different layout is not a matching Recipe");
  assert.deepEqual(snapshot, { ...referenced, id: snapshot.id, copy });
  assert.equal(saved.revision, session.revision + 1, "the Recipe and comparison form one undoable edit");
  assert.equal(saved.document.recipes.find((recipe) => recipe.id === referenced.id), session.document.recipes.find((recipe) => recipe.id === referenced.id));
  assert.deepEqual(simpleFontSets(saved.document), simpleFontSets(session.document));
  assert.equal(saved.document.recipes.length, session.document.recipes.length + 1);

  const repeated = applyStudyCommand(saved, command);
  assert.equal(repeated.document.recipes.length, saved.document.recipes.length, "repeated save against the original Recipe reuses the snapshot");
  assert.equal(repeated.document.comparisonSets.find((item) => item.id === comparison.id)!.recipeId, snapshot.id);
  const reopened = applyStudyCommand(createSession(parseStudyDocument(serializeStudyDocument(repeated.document)), repeated.bindings), { type: "select-comparison", comparisonId: comparison.id });
  assert.equal(activeRecipe(reopened).copy, copy);
  assert.equal(reopened.workspace.copyOverride, undefined);
  assert.equal(reopened.workspace.simpleSet, undefined);
  const savedAgain = applyStudyCommand(reopened, { type: "upsert-comparison", comparison, displayedCopy: activeRecipe(reopened).copy });
  assert.equal(savedAgain.document.recipes.length, saved.document.recipes.length);
});

test("comparison copy snapshots respect Recipe capacity and fail atomically on invalid input", () => {
  const fixture = createFixtureSession();
  const referenced = activeRecipe(fixture);
  const recipes = [...fixture.document.recipes, ...Array.from({ length: 256 - fixture.document.recipes.length }, (_, index) => ({ ...referenced, id: `recipe:capacity:${index}`, copy: `Existing copy ${index}` }))];
  const session = createSession({ ...fixture.document, recipes }, fixture.bindings);
  const comparison = { ...session.document.comparisonSets[0]!, id: "comparison:capacity", recipeId: referenced.id };
  const before = serializeRecoverySnapshot(session);
  assert.throws(() => applyStudyCommand(session, { type: "upsert-comparison", comparison, displayedCopy: "A new snapshot" }), /Recipe limit reached/);
  assert.throws(() => applyStudyCommand(session, { type: "upsert-comparison", comparison, displayedCopy: "x".repeat(20_001) }), /Invalid Recipe/);
  assert.equal(serializeRecoverySnapshot(session), before);
  const reused = applyStudyCommand(session, { type: "upsert-comparison", comparison, displayedCopy: "Existing copy 0" });
  assert.equal(reused.document.recipes.length, 256);
  assert.equal(reused.document.comparisonSets.find((item) => item.id === comparison.id)!.recipeId, "recipe:capacity:0");
  const invalidReferences = { ...comparison, candidateIds: [comparison.candidateIds[0]!, "candidate:missing"] };
  const fixtureBefore = serializeRecoverySnapshot(fixture);
  assert.throws(() => applyStudyCommand(fixture, { type: "upsert-comparison", comparison: invalidReferences, displayedCopy: "A new snapshot" }), /references are inconsistent/);
  assert.equal(serializeRecoverySnapshot(fixture), fixtureBefore, "failed comparison validation must not append its snapshot Recipe");
});

test("readding a historical variable Source creates one Candidate in the other set and preserves old Faces", () => {
  const fixture = createFixtureSession();
  const face = fixture.document.faces[0]!;
  const source = fixture.document.sources.find((item) => item.id === face.sourceId)!;
  const binding = fixture.bindings.find((item) => item.sourceId === source.id)!;
  const historical = { ...face, id: "face:historical:named-heavy", faceIndex: 6, style: "Heavy" };
  const session = createSession({ ...fixture.document, faces: [...fixture.document.faces, historical] }, fixture.bindings);
  const imported = { source, binding, faces: [face] };
  const added = applyStudyCommand(session, { type: "ingest-sources", simpleSet: "body", imports: [imported] });
  const body = candidatesInSimpleSet(added.document, "body");
  assert.equal(body.length, 1);
  assert.equal(body[0]!.faceId, face.id);
  assert.deepEqual(added.document.faces, session.document.faces);
  assert.deepEqual(candidatesInSimpleSet(added.document, "headlines"), session.document.candidates);
  const repeated = applyStudyCommand(added, { type: "ingest-sources", simpleSet: "body", imports: [imported] });
  assert.equal(candidatesInSimpleSet(repeated.document, "body").length, 1);
  assert.equal(repeated.revision, added.revision);
  const collectionSource = { ...source, hint: { ...source.hint, format: "TTC" } };
  const collection = createSession({ ...session.document, sources: session.document.sources.map((item) => item.id === source.id ? collectionSource : item) }, session.bindings);
  const collectionAdded = applyStudyCommand(collection, { type: "ingest-sources", simpleSet: "body", imports: [{ ...imported, source: collectionSource }] });
  assert.equal(candidatesInSimpleSet(collectionAdded.document, "body").length, 2, "real collection Faces retain separate identity");
});

test("named styles apply all axes in one revision and clamp metadata values to their declared bounds", () => {
  const fixture = createFixtureSession();
  const candidate = fixture.document.candidates[0]!;
  const face = fixture.document.faces.find((item) => item.id === candidate.faceId)!;
  const styledFace = { ...face, namedInstances: [{ name: "Heavy compressed", coordinates: [{ tag: "wght", value: 5_000 }, { tag: "wdth", value: -1 }] }] };
  const session = createSession({ ...fixture.document, faces: fixture.document.faces.map((item) => item.id === face.id ? styledFace : item) }, fixture.bindings);
  const styled = applyStudyCommand(session, { type: "set-named-instance", candidateId: candidate.id, instanceIndex: 0 });
  const result = styled.document.candidates.find((item) => item.id === candidate.id)!;
  assert.equal(result.label, "Heavy compressed");
  assert.deepEqual(result.axes, [{ tag: "wght", value: 900 }, { tag: "wdth", value: 75 }]);
  assert.equal(styled.revision, session.revision + 1);
  assert.deepEqual(session.document.candidates[0], candidate);
  assert.throws(() => applyStudyCommand(session, { type: "set-named-instance", candidateId: candidate.id, instanceIndex: -1 }), DomainError);
  assert.throws(() => applyStudyCommand(session, { type: "set-named-instance", candidateId: candidate.id, instanceIndex: 0.5 }), DomainError);
});

test("schema v4 and its recovery migrate without losing Candidate identity, decisions, or authored copy", () => {
  const fixture = createFixtureSession();
  const legacy = JSON.parse(serializeStudyDocument(fixture.document)) as Record<string, unknown>;
  legacy.schemaVersion = 4;
  delete legacy.simpleSets;
  const migrated = migrateLegacyStudy(legacy);
  assert.equal(migrated.fromVersion, 4);
  assert.equal(migrated.document.schemaVersion, 5);
  assert.deepEqual(migrated.document.candidates, fixture.document.candidates);
  assert.deepEqual(migrated.document.faces, fixture.document.faces);
  const recovery = JSON.parse(serializeRecoverySnapshot(fixture));
  recovery.study = legacy;
  recovery.workspace.copyOverride = "Preserve the original headline.";
  const restored = parseRecoverySnapshot(JSON.stringify(recovery));
  assert.equal(simpleFontSets(restored.document).headlines.copy, "Preserve the original headline.");
  assert.ok(simpleFontSets(restored.document).body.copy.length > 300);
  assert.equal(candidatesInSimpleSet(restored.document, "body").length, 0);
  assert.equal(candidatesInSimpleSet(restored.document, "headlines").length, fixture.document.candidates.length);
  assert.deepEqual(restored.document.candidates, fixture.document.candidates);
  assert.deepEqual(parseStudyDocument(serializeStudyDocument(restored.document)), restored.document);
});

test("semantic edits retain trusted unchanged graphs for bounded undo memory without bypassing validation", () => {
  const fixture = createFixtureSession();
  const copy = applyStudyCommand(fixture, { type: "edit-simple-set", setId: "headlines", patch: { copy: "Another headline" } });
  assert.equal(copy.document.faces, fixture.document.faces);
  assert.equal(copy.document.sources, fixture.document.sources);
  assert.equal(copy.document.candidates, fixture.document.candidates);
  assert.equal(copy.document.recipes, fixture.document.recipes);
  const candidate = fixture.document.candidates[0]!;
  const edited = applyStudyCommand(copy, { type: "edit-candidate", candidateId: candidate.id, patch: { casing: "uppercase" } });
  assert.notEqual(edited.document.candidates[0], candidate);
  assert.equal(edited.document.candidates[1], fixture.document.candidates[1]);
  assert.equal(edited.document.faces, fixture.document.faces);
  assert.equal(fixture.document.candidates[0]!.casing, candidate.casing);
  assert.throws(() => applyStudyCommand(copy, { type: "edit-simple-set", setId: "headlines", patch: { copy: "x".repeat(20_001) } }), DomainError);
  assert.throws(() => assertStudyDocument({ ...copy.document, simpleSets: { headlines: { copy: "Valid", fitPolicy: "fit" } } }), DomainError);
  assert.throws(() => assertStudyDocument({ ...copy.document, simpleSets: { ...simpleFontSets(copy.document), body: { copy: "Valid", fitPolicy: "invalid" } } }), DomainError);
});
