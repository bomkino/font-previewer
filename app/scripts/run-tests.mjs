import { spawnSync } from "node:child_process";
import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const applicationRoot = resolve(import.meta.dirname, "..");
const outputRoot = join(applicationRoot, ".test-dist");
if (!outputRoot.startsWith(`${applicationRoot}${sep}`) || outputRoot !== join(applicationRoot, ".test-dist")) {
  throw new Error(`Refusing unsafe test-output path: ${outputRoot}`);
}

const staleArtifact = join(outputRoot, "tests", "__stale-artifact.test.js");
await mkdir(join(outputRoot, "tests"), { recursive: true });
await writeFile(staleArtifact, "throw new Error('stale compiled test executed');\n", "utf8");
await rm(outputRoot, { recursive: true, force: true });
try {
  await access(staleArtifact);
  throw new Error("Stale test output survived the clean barrier.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { cwd: applicationRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [join(applicationRoot, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.test.json"]);

async function testFilesWithin(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await testFilesWithin(path));
    else if (entry.isFile() && entry.name.endsWith(".test.js")) files.push(path);
  }
  return files;
}

const testFiles = (await testFilesWithin(join(outputRoot, "tests"))).sort();
if (testFiles.length === 0) throw new Error("The test compiler emitted no test files.");
run(process.execPath, ["--test", ...testFiles]);

