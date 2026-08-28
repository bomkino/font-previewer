import assert from "node:assert/strict";
import test from "node:test";
import { applyStudyCommand } from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";
import {
  SIMPLE_BODY_COPY_LIMIT,
  SIMPLE_BODY_COPY_SAMPLES,
  createSimpleExportRuntime,
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
