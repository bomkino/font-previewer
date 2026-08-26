import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStudyCommand,
  DomainError,
  parseRecoverySnapshot,
  serializeRecoverySnapshot,
} from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";

test("canonical P1 fixture preserves the decision pressure", () => {
  const study = createFixtureSession();
  assert.equal(study.candidates.length, 24);
  assert.equal(new Set(study.faces.map((face) => face.family)).size, 4);
  assert.equal(study.recipes.length, 3);
  assert.equal(study.bindings.filter((binding) => binding.state === "missing").length, 1);
  assert.ok(study.candidates.some((candidate) => candidate.reviewState !== "unreviewed"));
  assert.equal(study.fontUses.length, 2);
  assert.equal(study.trayIds.length, 3);

  const variableFaceIds = study.candidates
    .filter((candidate) => candidate.axes.length > 0)
    .map((candidate) => candidate.faceId);
  assert.ok(new Set(variableFaceIds).size < variableFaceIds.length);
});

test("review decision and next-Unreviewed navigation use one semantic command path", () => {
  const fixture = createFixtureSession();
  const kept = applyStudyCommand(fixture, {
    type: "set-review-state",
    candidateId: fixture.selectedCandidateId,
    reviewState: "keep",
  });
  const next = applyStudyCommand(kept, { type: "select-next-unreviewed" });

  assert.equal(kept.candidates[0].reviewState, "keep");
  assert.notEqual(next.selectedCandidateId, fixture.selectedCandidateId);
  assert.equal(
    next.candidates.find((candidate) => candidate.id === next.selectedCandidateId)?.reviewState,
    "unreviewed",
  );
  assert.equal(next.stage, "review");
  assert.equal(next.revision, 2);
  assert.equal(
    applyStudyCommand(kept, {
      type: "set-review-state",
      candidateId: fixture.selectedCandidateId,
      reviewState: "keep",
    }),
    kept,
  );
});

test("Compare set is unique, removable, and bounded to four Candidates", () => {
  let study = createFixtureSession();
  for (const candidateId of ["candidate:1:1", "candidate:1:3", "candidate:1:4"]) {
    study = applyStudyCommand(study, { type: "toggle-tray", candidateId });
  }
  assert.equal(study.trayIds.length, 4);
  assert.deepEqual(study.trayIds, [
    "candidate:3:4",
    "candidate:1:1",
    "candidate:1:3",
    "candidate:1:4",
  ]);

  study = applyStudyCommand(study, { type: "toggle-tray", candidateId: "candidate:1:3" });
  assert.equal(study.trayIds.length, 3);
  assert.ok(!study.trayIds.includes("candidate:1:3"));
});

test("Display Role creates a distinct Font Use from its Candidate and Face", () => {
  const fixture = createFixtureSession();
  const assigned = applyStudyCommand(fixture, {
    type: "assign-role",
    candidateId: "candidate:1:6",
    role: "display",
  });
  const candidate = assigned.candidates.find((item) => item.id === "candidate:1:6");
  const sibling = assigned.candidates.find((item) => item.id === "candidate:1:5");
  const fontUse = assigned.fontUses.find((item) => item.role === "display");

  assert.equal(fontUse?.originatingCandidateId, candidate?.id);
  assert.equal(fontUse?.faceId, candidate?.faceId);
  assert.notEqual(fontUse?.id, candidate?.id);
  assert.equal(candidate?.faceId, sibling?.faceId);
  assert.equal(
    applyStudyCommand(assigned, {
      type: "assign-role",
      candidateId: "candidate:1:6",
      role: "display",
    }),
    assigned,
  );
});

test("Host import adds a Source and an Unreviewed Candidate without a path", () => {
  const fixture = createFixtureSession();
  const imported = applyStudyCommand(fixture, {
    type: "ingest-sources",
    sources: [{ id: "source:opaque-token", displayName: "New Sans", state: "available" }],
  });

  assert.equal(imported.sources.length, fixture.sources.length + 1);
  assert.equal(imported.bindings.length, fixture.bindings.length + 1);
  assert.equal(imported.faces.length, fixture.faces.length + 1);
  assert.equal(imported.candidates.length, fixture.candidates.length + 1);
  assert.equal(imported.selectedCandidateId, "candidate:source:opaque-token");
  assert.equal(imported.candidates.at(-1)?.reviewState, "unreviewed");
  assert.ok(!serializeRecoverySnapshot(imported).includes("/Users/"));

  const deduplicated = applyStudyCommand(imported, {
    type: "ingest-sources",
    sources: [{ id: "source:opaque-token", displayName: "New Sans", state: "available" }],
  });
  assert.equal(deduplicated, imported);
});

test("serialized recovery round-trips and rejects corrupt references", () => {
  const fixture = createFixtureSession();
  assert.deepEqual(parseRecoverySnapshot(serializeRecoverySnapshot(fixture)), fixture);

  const corrupt = JSON.parse(serializeRecoverySnapshot(fixture)) as Record<string, unknown>;
  corrupt.selectedCandidateId = "candidate:absent";
  assert.throws(() => parseRecoverySnapshot(JSON.stringify(corrupt)), DomainError);
  assert.throws(() => parseRecoverySnapshot("{"), DomainError);
  assert.throws(() => parseRecoverySnapshot("x".repeat(2_000_001)), DomainError);
});
