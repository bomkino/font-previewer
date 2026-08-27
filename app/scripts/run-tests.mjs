import { spawnSync } from "node:child_process";
import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

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

function runTests(arguments_) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: applicationRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout ?? "";
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
// Node 26 treats absolute test paths as glob patterns. Workspace names may
// legitimately contain glob metacharacters such as `[` and `]`, causing a
// false-green run with zero discovered tests. Paths relative to the fixed cwd
// contain only repository-controlled segments and identify every emitted file.
const relativeTestFiles = testFiles.map((file) => `./${relative(applicationRoot, file)}`);
const testOutput = runTests(["--test", "--test-reporter=tap", ...relativeTestFiles]);
const summary = /(?:^|\n)# tests (\d+)(?:\n|$)/u.exec(testOutput);
const executedTests = summary ? Number(summary[1]) : 0;
if (!Number.isSafeInteger(executedTests) || executedTests < testFiles.length) {
  throw new Error(`Test runner executed ${executedTests} tests from ${testFiles.length} emitted files.`);
}
