import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { BrowserWindow } from "electron";
import { exportTransactionalHandoff } from "../electron/handoff.js";
import { atomicWrite } from "../electron/host-storage.js";
import { assertStudyDocument } from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";

async function temporaryDirectory(context: test.TestContext): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "font-previewer-durability-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
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
    targetDirectory,
    sourcePaths: new Map<string, string>(),
    includeSources: false,
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
