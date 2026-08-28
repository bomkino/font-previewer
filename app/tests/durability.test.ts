import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";
import type { BrowserWindow } from "electron";
import { exportTransactionalHandoff } from "../electron/handoff.js";
import { atomicWrite } from "../electron/host-storage.js";
import { parseRecoveryDisk } from "../electron/recovery.js";
import { assertStudyDocument } from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";

async function temporaryDirectory(context: test.TestContext): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "font-previewer-durability-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data = Buffer.alloc(0)): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function simpleBoardPng(): Buffer {
  const width = 5_152;
  const height = 2_160;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels, { level: 1 })),
    pngChunk("IEND"),
  ]);
}

test("atomic save preserves the intentional file and removes its sidecar when commit fails", async (context) => {
  const directory = await temporaryDirectory(context);
  const target = join(directory, "decision.pitchfontstudy");
  const intentional = Buffer.from("last intentional save\n");
  await writeFile(target, intentional, { mode: 0o600 });

  await assert.rejects(
    atomicWrite(target, "uncommitted replacement\n", 0o600, async () => { throw new Error("injected rename failure"); }),
    /injected rename failure/,
  );

  assert.deepEqual(await readFile(target), intentional);
  assert.deepEqual(await readdir(directory), ["decision.pitchfontstudy"]);
});

test("transactional Handoff leaves the prior export byte-identical and cleans failed staging", async (context) => {
  const targetDirectory = await temporaryDirectory(context);
  const fixture = createFixtureSession();
  const document = assertStudyDocument({
    ...fixture.document,
    title: "Durability Evidence",
    handoff: { profile: "technical", outputs: ["summary", "json", "csv"], includeSources: false },
  });
  const window = {
    webContents: {
      executeJavaScript: async () => "Handoff",
    },
  } as unknown as BrowserWindow;
  const options = {
    window,
    document,
    preferences: document.handoff,
    targetDirectory,
    sourcePaths: new Map<string, string>(),
    sourcePermissionAcknowledged: false,
  };

  const committed = await exportTransactionalHandoff(options);
  const priorManifestPath = join(targetDirectory, committed.displayName, "manifest.json");
  const priorManifest = await readFile(priorManifestPath);
  await assert.rejects(
    exportTransactionalHandoff(options, async () => { throw new Error("injected Handoff commit failure"); }),
    /injected Handoff commit failure/,
  );

  assert.deepEqual(await readFile(priorManifestPath), priorManifest);
  assert.deepEqual(await readdir(targetDirectory), [committed.displayName]);
  assert.equal((await readdir(targetDirectory)).some((name) => name.includes(".staging-")), false);
});

test("Simple Handoff writes verified 5152 × 2160 board and index PNGs", async (context) => {
  const targetDirectory = await temporaryDirectory(context);
  const fixture = createFixtureSession();
  const document = assertStudyDocument({
    ...fixture.document,
    title: "Simple Board Evidence",
    candidates: fixture.document.candidates.map((candidate, index) => ({ ...candidate, reviewState: index === 0 ? "keep" : "reject" })),
    handoff: { profile: "internal", outputs: ["summary", "json", "csv"], includeSources: false },
  });
  const png = simpleBoardPng();
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  const window = {
    webContents: {
      executeJavaScript: async (script: string) => {
        if (script.includes("runtime.manifest")) return { width: 5_152, height: 2_160, pageMode: "boards", boardCount: 1, bodyCount: 0, indexCount: 1, fontCount: 1, includeIndex: true };
        if (script.includes(".render(")) return dataUrl;
        throw new Error(`Unexpected renderer script: ${script}`);
      },
    },
  } as unknown as BrowserWindow;
  const exported = await exportTransactionalHandoff({
    window,
    document,
    preferences: document.handoff,
    targetDirectory,
    sourcePaths: new Map<string, string>(),
    sourcePermissionAcknowledged: false,
  });
  const root = join(targetDirectory, exported.displayName);
  assert.deepEqual(await readFile(join(root, "Boards", "Board_01.png")), png);
  assert.deepEqual(await readFile(join(root, "Index", "Index_01.png")), png);
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as { files: { path: string }[] };
  assert.deepEqual(manifest.files.map((entry) => entry.path), ["Boards/Board_01.png", "Index/Index_01.png", "README.md", "candidates.csv", "study.pitchfontstudy"]);
});

test("Simple Body Copy Handoff writes one verified page per included font", async (context) => {
  const targetDirectory = await temporaryDirectory(context);
  const fixture = createFixtureSession();
  const document = assertStudyDocument({
    ...fixture.document,
    title: "Simple Body Copy Evidence",
    candidates: fixture.document.candidates.map((candidate, index) => ({ ...candidate, reviewState: index < 2 ? "keep" : "reject" })),
    handoff: { profile: "internal", outputs: ["summary", "json", "csv"], includeSources: false },
  });
  const png = simpleBoardPng();
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  const rendered: string[] = [];
  const window = {
    webContents: {
      executeJavaScript: async (script: string) => {
        if (script.includes("runtime.manifest")) return { width: 5_152, height: 2_160, pageMode: "body", boardCount: 0, bodyCount: 2, indexCount: 0, fontCount: 2, includeIndex: false };
        if (script.includes(".render(")) {
          rendered.push(script);
          return dataUrl;
        }
        throw new Error(`Unexpected renderer script: ${script}`);
      },
    },
  } as unknown as BrowserWindow;
  const exported = await exportTransactionalHandoff({
    window,
    document,
    preferences: document.handoff,
    targetDirectory,
    sourcePaths: new Map<string, string>(),
    sourcePermissionAcknowledged: false,
  });
  const root = join(targetDirectory, exported.displayName);
  assert.deepEqual(await readFile(join(root, "Body Copy", "Body_01.png")), png);
  assert.deepEqual(await readFile(join(root, "Body Copy", "Body_02.png")), png);
  assert.equal(rendered.length, 2);
  assert.ok(rendered.every((script) => script.includes('render("body"')));
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as { files: { path: string }[] };
  assert.deepEqual(manifest.files.map((entry) => entry.path), ["Body Copy/Body_01.png", "Body Copy/Body_02.png", "README.md", "candidates.csv", "study.pitchfontstudy"]);
});

test("Simple Handoff refuses a mixed or impossible Body Copy manifest", async (context) => {
  const targetDirectory = await temporaryDirectory(context);
  const fixture = createFixtureSession();
  const document = assertStudyDocument({
    ...fixture.document,
    candidates: fixture.document.candidates.map((candidate, index) => ({ ...candidate, reviewState: index === 0 ? "keep" : "reject" })),
  });
  const window = {
    webContents: {
      executeJavaScript: async (script: string) => {
        if (script.includes("runtime.manifest")) return { width: 5_152, height: 2_160, pageMode: "body", boardCount: 1, bodyCount: 1, indexCount: 0, fontCount: 1, includeIndex: false };
        throw new Error(`Unexpected renderer script: ${script}`);
      },
    },
  } as unknown as BrowserWindow;
  await assert.rejects(exportTransactionalHandoff({
    window,
    document,
    preferences: document.handoff,
    targetDirectory,
    sourcePaths: new Map<string, string>(),
    sourcePermissionAcknowledged: false,
  }), /Body Copy count does not match its fonts/);
  assert.deepEqual(await readdir(targetDirectory), []);
});

test("corrupt, future, and impossible recovery envelopes cannot replace valid state", () => {
  const fixture = createFixtureSession();
  const valid = parseRecoveryDisk(JSON.stringify({
    version: 1,
    document: fixture.document,
    workspace: fixture.workspace,
    revision: 8,
    intentionallySavedRevision: 20,
  }));
  assert.equal(valid.revision, 8);
  assert.equal(valid.intentionallySavedRevision, 8);
  assert.equal(valid.document.id, fixture.document.id);

  for (const invalid of [
    "{",
    JSON.stringify({ version: 2, document: fixture.document, workspace: fixture.workspace, revision: 8, intentionallySavedRevision: 3 }),
    JSON.stringify({ version: 1, document: fixture.document, workspace: fixture.workspace, revision: -1, intentionallySavedRevision: 0 }),
    JSON.stringify({ version: 1, document: { ...fixture.document, schemaVersion: 999 }, workspace: fixture.workspace, revision: 1, intentionallySavedRevision: 0 }),
  ]) assert.throws(() => parseRecoveryDisk(invalid));
});

test("interrupted Handoff rendering removes staging and commits nothing", async (context) => {
  const targetDirectory = await temporaryDirectory(context);
  const fixture = createFixtureSession();
  const document = assertStudyDocument({
    ...fixture.document,
    title: "Interrupted Handoff",
    handoff: { profile: "technical", outputs: ["summary", "review-png"], includeSources: false },
  });
  const window = {
    webContents: {
      executeJavaScript: async () => { throw new Error("injected renderer termination"); },
    },
  } as unknown as BrowserWindow;

  await assert.rejects(exportTransactionalHandoff({
    window,
    document,
    preferences: document.handoff,
    targetDirectory,
    sourcePaths: new Map<string, string>(),
    sourcePermissionAcknowledged: false,
  }), /injected renderer termination/);
  assert.deepEqual(await readdir(targetDirectory), []);
});
