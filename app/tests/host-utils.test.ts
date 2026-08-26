import assert from "node:assert/strict";
import test from "node:test";
import { buildImportedSource, inferFontNames, rendererSupportForPath } from "../electron/font-inspection.js";
import { csvCell, safeFileStem } from "../electron/host-storage.js";

test("font inspection derives portable metadata and opaque preview capability", () => {
  assert.deepEqual(inferFontNames("/private/fonts/Quiet_Sans-Semibold.otf"), { family: "Quiet Sans", style: "Semibold" });
  assert.equal(rendererSupportForPath("family.ttc"), "metadata-only");
  const imported = buildImportedSource({
    canonicalPath: "/private/fonts/Quiet_Sans-Semibold.otf",
    sourceId: "source:opaque",
    byteLength: 42_000,
    modifiedAt: "2026-08-27T00:00:00.000Z",
    previewUrl: "pitch-font://asset/token",
  });
  assert.equal(imported.source.id, imported.binding.sourceId);
  assert.equal(imported.faces[0].sourceId, imported.source.id);
  assert.equal(imported.faces[0].family, "Quiet Sans");
  assert.equal(imported.binding.previewUrl, "pitch-font://asset/token");
  assert.doesNotMatch(JSON.stringify(imported.source), /\/private\/fonts/);
});

test("Handoff filenames and CSV cells neutralize platform and spreadsheet hazards", () => {
  assert.equal(safeFileStem("  Client / Pitch: Final?  "), "Client Pitch Final");
  assert.equal(safeFileStem("..."), "Font Previewer");
  assert.equal(csvCell("=HYPERLINK(\"bad\")"), "\"'=HYPERLINK(\"\"bad\"\")\"");
  assert.equal(csvCell("quiet, editorial"), "\"quiet, editorial\"");
});
