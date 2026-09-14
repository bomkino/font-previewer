import assert from "node:assert/strict";
import test from "node:test";
import { applyStudyCommand, candidatesInSimpleSet } from "../src/domain.js";
import { createFixtureSession, createNewStudy } from "../src/fixture.js";
import {
  SIMPLE_BODY_COPY_LIMIT,
  SIMPLE_BODY_COPY_SAMPLES,
  createSimpleExportRuntime,
  createSimpleSetsExportRuntime,
  simpleBodyCopyLabel,
  simpleBodyCopySample,
  simpleBodyDisplayCopy,
} from "../src/simple-boards.js";

test("Body Copy samples are authored, bounded, and paragraph-complete", () => {
  assert.equal(SIMPLE_BODY_COPY_SAMPLES.length, 3);
  assert.equal(new Set(SIMPLE_BODY_COPY_SAMPLES.map((sample) => sample.id)).size, SIMPLE_BODY_COPY_SAMPLES.length);
  for (const sample of SIMPLE_BODY_COPY_SAMPLES) {
    assert.ok(sample.label.length > 8);
    assert.ok(sample.copy.length > 300);
    assert.ok(sample.copy.length <= SIMPLE_BODY_COPY_LIMIT);
    assert.equal(sample.copy.split(/\n\s*\n/gu).length, 2);
    assert.doesNotMatch(sample.copy, /lorem ipsum/iu);
  }
  assert.equal(simpleBodyCopySample("missing-sample").id, SIMPLE_BODY_COPY_SAMPLES[0]!.id);
});

test("Simple set exports select Headlines, Body Copy, or both without dropping unseen pages", async () => {
  const fixture = createFixtureSession();
  const included = fixture.document.candidates.filter((candidate) => candidate.reviewState !== "reject");
  const session = applyStudyCommand(fixture, { type: "copy-to-simple-set", candidateIds: included.map((candidate) => candidate.id), setId: "body" });
  const boards = createSimpleSetsExportRuntime(session, true, true, "boards");
  const body = createSimpleSetsExportRuntime(session, true, true, "body");
  const both = createSimpleSetsExportRuntime(session, true, true, "both");
  assert.deepEqual(boards.manifest(), {
    width: 5_152, height: 2_160, pageMode: "boards", boardCount: 5, bodyCount: 0, indexCount: 2, fontCount: 20, includeIndex: true,
  });
  assert.deepEqual(body.manifest(), {
    width: 5_152, height: 2_160, pageMode: "body", boardCount: 0, bodyCount: 20, indexCount: 0, fontCount: 20, includeIndex: false,
  });
  assert.deepEqual(both.manifest(), {
    width: 5_152, height: 2_160, pageMode: "both", boardCount: 5, bodyCount: 20, indexCount: 2, fontCount: 40, includeIndex: true,
  });
  assert.equal(createSimpleSetsExportRuntime(session, false, false, "both").manifest().indexCount, 0);
  await assert.rejects(boards.render("body", 0), /outside this export/);
  await assert.rejects(body.render("board", 0), /outside this export/);
  await assert.rejects(body.render("index", 0), /outside this export/);
});

test("Simple set manifests handle empty sets and exclude rejected fonts independently", () => {
  const empty = createNewStudy("blank");
  for (const scope of ["boards", "body", "both"] as const) {
    const manifest = createSimpleSetsExportRuntime(empty, false, true, scope).manifest();
    assert.equal(manifest.fontCount, 0);
    assert.equal(manifest.boardCount + manifest.bodyCount + manifest.indexCount, 0);
  }
  const fixture = createFixtureSession();
  assert.equal(createSimpleSetsExportRuntime(fixture, false, true, "body").manifest().fontCount, 0);
  assert.equal(createSimpleSetsExportRuntime(fixture, false, true, "both").manifest().fontCount, 20);
  const included = fixture.document.candidates.filter((candidate) => candidate.reviewState !== "reject");
  let session = applyStudyCommand(fixture, { type: "copy-to-simple-set", candidateIds: included.map((candidate) => candidate.id), setId: "body" });
  const bodyIds = candidatesInSimpleSet(session.document, "body").map((candidate) => candidate.id);
  session = applyStudyCommand(session, { type: "set-review-state", candidateIds: [included[0]!.id, ...bodyIds.slice(0, 2)], reviewState: "reject" });
  assert.deepEqual(createSimpleSetsExportRuntime(session, false, true, "both").manifest(), {
    width: 5_152, height: 2_160, pageMode: "both", boardCount: 5, bodyCount: 18, indexCount: 2, fontCount: 37, includeIndex: true,
  });
  session = applyStudyCommand(session, { type: "set-review-state", candidateIds: included.map((candidate) => candidate.id), reviewState: "reject" });
  const onlyBody = createSimpleSetsExportRuntime(session, false, true, "both").manifest();
  assert.equal(onlyBody.fontCount, 18);
  assert.equal(onlyBody.bodyCount, 18);
  assert.equal(onlyBody.boardCount + onlyBody.indexCount, 0);
});

test("Simple set exports validate their own copy and ignore a stale workspace override", () => {
  const fixture = createFixtureSession();
  let session = applyStudyCommand(fixture, { type: "copy-to-simple-set", candidateIds: [fixture.document.candidates[0]!.id], setId: "body" });
  session = applyStudyCommand(session, { type: "edit-simple-set", setId: "headlines", patch: { copy: "h".repeat(SIMPLE_BODY_COPY_LIMIT + 1) } });
  session = applyStudyCommand(session, { type: "edit-simple-set", setId: "body", patch: { copy: "A complete body paragraph.\n\nA second body paragraph." } });
  session = { ...session, workspace: { ...session.workspace, copyOverride: "   " } };
  const existingExport = createSimpleSetsExportRuntime(session, false, true, "both");
  assert.equal(existingExport.manifest().fontCount, 21);
  assert.equal(createSimpleSetsExportRuntime(session, false, true, "body").manifest().bodyCount, 1);

  const invalidBody = applyStudyCommand(session, { type: "edit-simple-set", setId: "body", patch: { copy: "b".repeat(SIMPLE_BODY_COPY_LIMIT + 1) } });
  assert.equal(createSimpleSetsExportRuntime(invalidBody, false, true, "boards").manifest().fontCount, 20);
  assert.throws(() => createSimpleSetsExportRuntime(invalidBody, false, true, "body").manifest(), /1,200 characters or fewer/);
  assert.throws(() => createSimpleSetsExportRuntime(invalidBody, false, true, "both").manifest(), /1,200 characters or fewer/);
  assert.equal(existingExport.manifest().fontCount, 21, "an existing export retains its own immutable copy");
  const emptyBody = applyStudyCommand(session, { type: "edit-simple-set", setId: "body", patch: { copy: "   " } });
  assert.throws(() => createSimpleSetsExportRuntime(emptyBody, false, true, "both").manifest(), /cannot be empty/);
});

test("Simple export manifests keep Boards and Body Copy mutually exact", () => {
  const session = createFixtureSession();
  assert.deepEqual(createSimpleExportRuntime(session, false, true).manifest(), {
    width: 5_152,
    height: 2_160,
    pageMode: "boards",
    boardCount: 5,
    bodyCount: 0,
    indexCount: 2,
    fontCount: 20,
    includeIndex: true,
  });
  assert.deepEqual(createSimpleExportRuntime(session, false, true, "fit", "body").manifest(), {
    width: 5_152,
    height: 2_160,
    pageMode: "body",
    boardCount: 0,
    bodyCount: 20,
    indexCount: 0,
    fontCount: 20,
    includeIndex: false,
  });
});

test("Body Copy uses the shared Study override and candidate casing without truncation", () => {
  const fixture = createFixtureSession();
  const candidate = { ...fixture.document.candidates[0]!, casing: "uppercase" as const };
  const session = {
    ...applyStudyCommand(fixture, { type: "set-copy-override", copy: "A full paragraph.\n\nA second paragraph." }),
    document: { ...fixture.document, candidates: [candidate, ...fixture.document.candidates.slice(1)] },
  };
  assert.equal(simpleBodyDisplayCopy(session, candidate, SIMPLE_BODY_COPY_SAMPLES[0]!.id), "A FULL PARAGRAPH.\n\nA SECOND PARAGRAPH.");
  assert.equal(simpleBodyCopyLabel(fixture, SIMPLE_BODY_COPY_SAMPLES[0]!.id), SIMPLE_BODY_COPY_SAMPLES[0]!.label);
  assert.equal(simpleBodyCopyLabel(session, SIMPLE_BODY_COPY_SAMPLES[0]!.id), "Custom copy");

  const overLimit = applyStudyCommand(fixture, { type: "set-copy-override", copy: "x".repeat(SIMPLE_BODY_COPY_LIMIT + 1) });
  assert.throws(() => createSimpleExportRuntime(overLimit, false, false, "fit", "body").manifest(), /1,200 characters or fewer/);
  const empty = applyStudyCommand(fixture, { type: "set-copy-override", copy: "   " });
  assert.throws(() => createSimpleExportRuntime(empty, false, false, "fit", "body").manifest(), /cannot be empty/);
});
