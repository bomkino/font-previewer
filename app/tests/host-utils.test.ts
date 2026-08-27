import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildImportedSource,
  inferFontNames,
  inspectFontFile,
  parseFontconfigQuery,
  rendererSupportForPath,
} from "../electron/font-inspection.js";
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
    faces: [{ faceIndex: 0, family: "Quiet Sans", style: "Semibold", postScriptName: "QuietSans-Semibold" }],
  });
  assert.equal(imported.source.id, imported.binding.sourceId);
  assert.equal(imported.faces[0].sourceId, imported.source.id);
  assert.equal(imported.faces[0].family, "Quiet Sans");
  assert.equal(imported.binding.previewUrl, "pitch-font://asset/token");
  assert.doesNotMatch(JSON.stringify(imported.source), /\/private\/fonts/);
});

test("Fontconfig inspection preserves exact collection face identity", () => {
  const inspected = parseFontconfigQuery(
    "0\u001fExample Sans\u001fRegular\u001fExampleSans-Regular\u001fFalse\u001e" +
    "1\u001fExample Sans\u001fBold\u001fExampleSans-Bold\u001fFalse\u001e",
  );
  const imported = buildImportedSource({
    canonicalPath: "/private/fonts/Example.ttc",
    sourceId: "source:collection",
    byteLength: 84_000,
    modifiedAt: "2026-08-27T00:00:00.000Z",
    faces: inspected,
  });
  assert.equal(imported.source.hint.faceCount, 2);
  assert.deepEqual(imported.faces.map((face) => [face.faceIndex, face.id, face.style]), [
    [0, "face:source:collection:0", "Regular"],
    [1, "face:source:collection:1", "Bold"],
  ]);
  assert.equal(imported.binding.rendererSupport, "metadata-only");
});

test("imported Linux metadata preserves variable axes and named instances", () => {
  const imported = buildImportedSource({
    canonicalPath: "/private/fonts/Variable.ttf",
    sourceId: "source:variable",
    byteLength: 42_000,
    modifiedAt: "2026-08-27T00:00:00.000Z",
    faces: [{
      faceIndex: 0,
      family: "Variable Sans",
      style: "Regular",
      axes: [{ tag: "wght", name: "Weight", minimum: 100, defaultValue: 400, maximum: 900 }],
      namedInstances: [{ name: "Bold", coordinates: [{ tag: "wght", value: 700 }] }],
    }],
  });
  assert.deepEqual(imported.faces[0].axes, [{ tag: "wght", name: "Weight", minimum: 100, defaultValue: 400, maximum: 900 }]);
  assert.deepEqual(imported.faces[0].namedInstances, [{ name: "Bold", coordinates: [{ tag: "wght", value: 700 }] }]);
});

test("Linux variable-font worker discovers real axes", {
  skip: process.platform !== "linux" || !existsSync("/usr/bin/fc-list"),
}, async (context) => {
  const variablePath = execFileSync("/usr/bin/fc-list", ["--format", "%{file}\n", ":variable=true"], { encoding: "utf8" })
    .split("\n")
    .find((path) => /\.(?:otf|ttf|woff|woff2)$/iu.test(path));
  if (!variablePath) return context.skip("No variable font is installed.");
  const faces = await inspectFontFile(variablePath);
  assert.ok(faces.some((face) => face.axes?.some((axis) => axis.tag === "wght" || axis.maximum > axis.minimum)));
});

test("Fontconfig inspection rejects malformed, truncated, and duplicate-face metadata", () => {
  assert.throws(() => parseFontconfigQuery(""), /empty/);
  assert.throws(() => parseFontconfigQuery("0\u001fFamily\u001fRegular\u001fName\u001fFalse"), /truncated/);
  assert.throws(
    () => parseFontconfigQuery("0\u001fFamily\u001fRegular\u001fOne\u001fFalse\u001e0\u001fFamily\u001fBold\u001fTwo\u001fFalse\u001e"),
    /duplicate/,
  );
  assert.throws(() => parseFontconfigQuery("0\u001fFamily\nInjected\u001fRegular\u001fName\u001fFalse\u001e"), /invalid family/);
});

test("Fontconfig collapses named-instance records only for one variable Face", () => {
  const inspected = parseFontconfigQuery(
    "0\u001fInter\u001f\u001f\u001fTrue\u001e" +
    "0\u001fInter\u001fBold\u001fInter-Bold\u001fTrue\u001e",
  );
  assert.equal(inspected.length, 1);
  assert.equal(inspected[0].variable, true);
  assert.equal(inspected[0].style, "Variable");
  assert.throws(
    () => parseFontconfigQuery(
      "0\u001fInter\u001fRegular\u001fInter-Regular\u001fTrue\u001e" +
      "0\u001fOther\u001fBold\u001fOther-Bold\u001fTrue\u001e",
    ),
    /duplicate/,
  );
});

test("Linux font inspection rejects a malformed font file before import", {
  skip: process.platform !== "linux" || !existsSync("/usr/bin/fc-query"),
}, async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "font-previewer-malformed-"));
  const malformedPath = join(temporaryRoot, "truncated.ttf");
  try {
    await writeFile(malformedPath, Buffer.from([0x00, 0x01, 0x00, 0x00, 0xff]));
    await assert.rejects(inspectFontFile(malformedPath), /inspection failed|metadata is empty/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("Handoff filenames and CSV cells neutralize platform and spreadsheet hazards", () => {
  assert.equal(safeFileStem("  Client / Pitch: Final?  "), "Client Pitch Final");
  assert.equal(safeFileStem("..."), "Font Previewer");
  assert.equal(csvCell("=HYPERLINK(\"bad\")"), "\"'=HYPERLINK(\"\"bad\"\")\"");
  assert.equal(csvCell("quiet, editorial"), "\"quiet, editorial\"");
});
