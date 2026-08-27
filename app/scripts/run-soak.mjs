import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  applyStudyCommand,
  parseRecoverySnapshot,
  serializeRecoverySnapshot,
  serializeStudyDocument,
} from "../.test-dist/src/domain.js";
import { createNewStudy } from "../.test-dist/src/fixture.js";

const faceCount = 500;
const iterations = 2_000;
const recoveryInterval = 20;
const outputPath = process.env.FONT_PREVIEWER_SOAK_OUTPUT ?? join(tmpdir(), "font-previewer-soak.json");

function importedSource(index) {
  const sourceId = `source:soak:${index}`;
  return {
    source: {
      id: sourceId,
      displayName: `Soak Family ${index}`,
      hint: { fileName: `soak-${index}.otf`, format: "OTF", fileSize: 42_000 + index, faceCount: 1 },
      lastKnownState: "readable",
    },
    binding: {
      sourceId,
      state: "readable",
      previewUrl: `pitch-font://asset/soak-${index}`,
      rendererSupport: "full",
    },
    faces: [{
      id: `face:soak:${index}:0`,
      sourceId,
      family: `Soak Family ${index}`,
      style: "Regular",
      postScriptName: `SoakFamily${index}-Regular`,
      faceIndex: 0,
      axes: [],
      namedInstances: [],
      features: [{ tag: "liga", name: "Standard ligatures", group: "ligatures", defaultEnabled: true }],
      coverage: { supportedCodePointCount: 0, scripts: [], colorFormats: [], evidenceLevel: "unknown" },
    }],
  };
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return { rss: usage.rss, heapTotal: usage.heapTotal, heapUsed: usage.heapUsed, external: usage.external };
}

function percentile(sorted, percentileValue) {
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)];
}

if (typeof globalThis.gc !== "function") throw new Error("Soak evidence requires Node --expose-gc.");

let session = createNewStudy("film-tv", "500-face soak study");
session = applyStudyCommand(session, {
  type: "ingest-sources",
  imports: Array.from({ length: faceCount }, (_, index) => importedSource(index)),
});
assert.equal(session.document.sources.length, faceCount);
assert.equal(session.document.faces.length, faceCount);
assert.equal(session.document.candidates.length, faceCount);

globalThis.gc();
const baselineMemory = memorySnapshot();
let peakMemory = baselineMemory;
let recoveryRoundTrips = 0;
const samples = [];
const started = performance.now();

for (let index = 0; index < iterations; index += 1) {
  const operationStarted = performance.now();
  const candidate = session.document.candidates[index % faceCount];
  session = applyStudyCommand(session, { type: "set-search", search: `family ${index % 37}` });
  session = applyStudyCommand(session, { type: "select-candidate", candidateId: candidate.id });
  if (index % recoveryInterval === 0) {
    session = applyStudyCommand(session, {
      type: "set-review-state",
      candidateIds: [candidate.id],
      reviewState: index % (recoveryInterval * 2) === 0 ? "keep" : "maybe",
    });
    session = parseRecoverySnapshot(serializeRecoverySnapshot(session));
    recoveryRoundTrips += 1;
  }
  samples.push(performance.now() - operationStarted);
  if (index % 50 === 0) {
    const observed = memorySnapshot();
    if (observed.rss > peakMemory.rss) peakMemory = observed;
  }
}

const totalMilliseconds = performance.now() - started;
const portableStudy = serializeStudyDocument(session.document);
assert.doesNotMatch(portableStudy, /pitch-font:|file:\/\/|previewUrl|binding/i);
assert.equal(session.document.sources.length, faceCount);
assert.equal(session.document.faces.length, faceCount);
assert.equal(session.document.candidates.length, faceCount);
assert.equal(recoveryRoundTrips, iterations / recoveryInterval);

globalThis.gc();
const finalMemory = memorySnapshot();
const sortedSamples = [...samples].sort((left, right) => left - right);
const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  runtime: { platform: process.platform, architecture: process.arch, node: process.version },
  workload: { sources: faceCount, faces: faceCount, candidates: faceCount, iterations, recoveryRoundTrips },
  integrity: {
    entityCountsStable: true,
    recoveryRoundTripsPassed: true,
    portableStudyPathFree: true,
    finalRevision: session.revision,
    serializedStudyBytes: Buffer.byteLength(portableStudy, "utf8"),
  },
  timingMilliseconds: {
    total: Number(totalMilliseconds.toFixed(3)),
    p50: Number(percentile(sortedSamples, 0.5).toFixed(3)),
    p95: Number(percentile(sortedSamples, 0.95).toFixed(3)),
    maximum: Number(sortedSamples.at(-1).toFixed(3)),
  },
  memoryBytes: {
    baselineAfterGc: baselineMemory,
    peakObserved: peakMemory,
    finalAfterGc: finalMemory,
    finalHeapGrowth: finalMemory.heapUsed - baselineMemory.heapUsed,
  },
  interpretation: "Hosted diagnostic only; no universal memory or latency ceiling is claimed.",
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`500-face soak evidence: ${outputPath}`);
console.log(JSON.stringify(evidence));
