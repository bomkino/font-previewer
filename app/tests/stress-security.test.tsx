import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Workspace, type AppActions } from "../src/components.js";
import { applyStudyCommand, type ImportedSource, type StudyCommand } from "../src/domain.js";
import { createNewStudy } from "../src/fixture.js";

function importedSource(index: number): ImportedSource {
  const sourceId = `source:review-stress:${index}`;
  return {
    source: {
      id: sourceId,
      displayName: `Review Stress ${index}`,
      hint: { fileName: `review-stress-${index}.otf`, format: "OTF", fileSize: 42_000, faceCount: 1 },
      lastKnownState: "readable",
    },
    binding: {
      sourceId,
      state: "readable",
      previewUrl: `pitch-font://asset/review-stress-${index}`,
      rendererSupport: "full",
    },
    faces: [{
      id: `face:review-stress:${index}:0`,
      sourceId,
      family: `Review Stress ${index}`,
      style: "Regular",
      faceIndex: 0,
      axes: [],
      namedInstances: [],
      features: [],
      coverage: { supportedCodePointCount: 0, scripts: [], colorFormats: [], evidenceLevel: "unknown" },
    }],
  };
}

const noOp = () => undefined;
const actions: AppActions = {
  importSources: noOp,
  scanInstalled: noOp,
  cancelCatalog: noOp,
  addCatalogSources: noOp,
  openStudy: noOp,
  saveStudy: noOp,
  exportHandoff: noOp,
  exportBoards: noOp,
  relinkSource: noOp,
  revealSource: noOp,
  newStudy: noOp,
  loadSample: noOp,
};

test("100-card Review surface remains path-free and structurally complete", (context) => {
  let session = createNewStudy("film-tv", "100-card Review stress");
  session = applyStudyCommand(session, {
    type: "ingest-sources",
    imports: Array.from({ length: 100 }, (_, index) => importedSource(index)),
  });
  session = applyStudyCommand(session, { type: "set-review-layout", layout: "contact-sheet" });

  const render = () => renderToStaticMarkup(
    <Workspace
      session={session}
      index={{
        faceById: new Map(session.document.faces.map((face) => [face.id, face])),
        candidateById: new Map(session.document.candidates.map((candidate) => [candidate.id, candidate])),
      }}
      dispatch={(_command: StudyCommand) => undefined}
      fontStates={new Map()}
      headingRef={{ current: null }}
      actions={actions}
      comparisonPolicy="fit"
      onComparisonPolicyChange={noOp}
    />,
  );

  render();
  const samples = Array.from({ length: 20 }, () => {
    const started = performance.now();
    const markup = render();
    return { duration: performance.now() - started, markup };
  });
  const markup = samples.at(-1)?.markup ?? "";
  const sortedDurations = samples.map((sample) => sample.duration).sort((left, right) => left - right);
  const p50 = sortedDurations[Math.ceil(sortedDurations.length * 0.5) - 1];
  const p95 = sortedDurations[Math.ceil(sortedDurations.length * 0.95) - 1];

  assert.equal((markup.match(/class="specimen-card(?: |")/gu) ?? []).length, 100);
  assert.equal((markup.match(/class="specimen-select"/gu) ?? []).length, 100);
  assert.equal((markup.match(/class="card-actions"/gu) ?? []).length, 100);
  assert.doesNotMatch(markup, /(?:file:\/\/|\/Users\/|\/home\/|previewUrl|pitch-font:)/u);
  context.diagnostic(`100-card server-render diagnostic: p50 ${p50.toFixed(3)} ms; p95 ${p95.toFixed(3)} ms; ${Buffer.byteLength(markup, "utf8")} bytes`);
});
