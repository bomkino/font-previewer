import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Navigator,
  Tray,
  type AppActions,
  type InstalledCatalogView,
  type NavigatorMode,
} from "../src/components.js";
import type { StudyCommand } from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";

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
const catalog: InstalledCatalogView = {
  query: "",
  cursor: 0,
  imports: [],
  indexed: 0,
  total: 0,
  rejected: 0,
  truncated: false,
};

function renderNavigator(mode: NavigatorMode, blindIdentityHidden: boolean): string {
  const session = createFixtureSession();
  return renderToStaticMarkup(
    <Navigator
      session={session}
      index={{
        faceById: new Map(session.document.faces.map((face) => [face.id, face])),
        candidateById: new Map(session.document.candidates.map((candidate) => [candidate.id, candidate])),
      }}
      dispatch={(_command: StudyCommand) => undefined}
      actions={actions}
      mode={mode}
      onModeChange={noOp}
      catalog={catalog}
      catalogBusy={false}
      blindIdentityHidden={blindIdentityHidden}
    />,
  );
}

test("blind comparison redacts every Navigator mode and anonymizes tray actions", () => {
  const session = createFixtureSession();
  const navigatorMarkup = (["study", "catalog", "sources", "sets"] as const)
    .map((mode) => renderNavigator(mode, true))
    .join("\n");
  const trayMarkup = renderToStaticMarkup(
    <Tray
      session={session}
      dispatch={(_command: StudyCommand) => undefined}
      blindIdentityHidden
    />,
  );
  const markup = `${navigatorMarkup}\n${trayMarkup}`;

  assert.equal((navigatorMarkup.match(/Navigator hidden/gu) ?? []).length, 4);
  assert.match(trayMarkup, /Candidate A/);
  assert.match(trayMarkup, /Candidate B/);
  assert.match(trayMarkup, /Candidate C/);
  assert.match(trayMarkup, /aria-label="Remove Candidate A from comparison"/);
  assert.equal((trayMarkup.match(/Identity hidden/gu) ?? []).length, 3);
  for (const identity of ["Aperture Sans", "Ledger Serif", "Vector Grotesk", "Signal Mono", "aperture.ttf", "ledger.ttf", "vector.ttf", "signal.ttf"]) {
    assert.doesNotMatch(markup, new RegExp(identity.replace(".", "\\."), "u"));
  }
});

test("revealed comparison restores Navigator and tray identities", () => {
  const session = createFixtureSession();
  const markup = `${renderNavigator("study", false)}\n${renderToStaticMarkup(
    <Tray
      session={session}
      dispatch={(_command: StudyCommand) => undefined}
      blindIdentityHidden={false}
    />,
  )}`;

  assert.match(markup, /Aperture Sans/);
  assert.match(markup, /Ledger Serif/);
  assert.match(markup, /Vector Grotesk/);
  assert.doesNotMatch(markup, /Navigator hidden/);
});
