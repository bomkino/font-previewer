import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fromRoot = (...parts) => resolve(root, ...parts);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, predicate = () => true) {
  const results = [];
  if (!(await exists(directory))) return results;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const repoPath = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (predicate(repoPath, true)) results.push(...(await walk(path, predicate)));
    } else if (predicate(repoPath, false)) {
      results.push(path);
    }
  }
  return results;
}

const rootMarkdown = [
  "README.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
].map((path) => fromRoot(path));
const appMarkdown = [
  "app/README.md",
  "app/INSTALL.md",
  "app/REPORT.md",
  "app/DEPENDENCIES.md",
  "app/THIRD_PARTY_NOTICES.md",
].map((path) => fromRoot(path));
const docsMarkdown = await walk(fromRoot("docs"), (repoPath, isDirectory) => {
  if (repoPath === "docs/archive" || repoPath.startsWith("docs/archive/")) return false;
  if (repoPath === "docs/programme/handover" || repoPath.startsWith("docs/programme/handover/")) return false;
  return isDirectory || extname(repoPath).toLowerCase() === ".md";
});
const currentMarkdown = [...rootMarkdown, ...appMarkdown, ...docsMarkdown];

for (const path of currentMarkdown) {
  assert.ok(await exists(path), `Missing current document: ${relative(root, path)}`);
}

const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;
const referenceLink = /^\s*\[[^\]]+\]:\s*(\S+)/gm;
const brokenLinks = [];
for (const path of currentMarkdown) {
  const text = await readFile(path, "utf8");
  const destinations = [
    ...[...text.matchAll(markdownLink)].map((match) => match[1]),
    ...[...text.matchAll(referenceLink)].map((match) => match[1]),
  ];
  for (const rawDestination of destinations) {
    let destination = rawDestination.trim().replace(/^<|>$/g, "");
    if (!destination || destination.startsWith("#") || /^(https?:|mailto:|data:)/i.test(destination)) continue;
    destination = destination.split("#", 1)[0].split("?", 1)[0];
    if (!destination || destination.startsWith("/")) continue;
    try {
      destination = decodeURIComponent(destination);
    } catch {
      brokenLinks.push(`${relative(root, path)}: invalid URI ${rawDestination}`);
      continue;
    }
    const target = resolve(dirname(path), destination);
    if (!(await exists(target))) brokenLinks.push(`${relative(root, path)} -> ${rawDestination}`);
  }
}
assert.deepEqual(brokenLinks, [], `Broken local Markdown links:\n${brokenLinks.join("\n")}`);

const workflowFiles = await walk(fromRoot(".github", "workflows"), (repoPath, isDirectory) =>
  isDirectory || [".yml", ".yaml"].includes(extname(repoPath).toLowerCase()),
);
assert.ok(workflowFiles.length >= 3, "Expected permanent verification, reference, and release workflows");
for (const path of workflowFiles) {
  const text = await readFile(path, "utf8");
  assert.match(text, /^permissions:/m, `${relative(root, path)} must declare permissions`);
  for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+)/gm)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    assert.match(action, /@[0-9a-f]{40}$/, `${relative(root, path)} has a mutable action reference: ${action}`);
  }
}

assert.equal(await exists(fromRoot(".github", "workflows", "release-candidate.yml")), false, "Obsolete release-candidate workflow remains active");
const releaseWorkflow = await readFile(fromRoot(".github", "workflows", "release.yml"), "utf8");
for (const required of [
  "workflow_dispatch:",
  "target_sha:",
  "verification_run_id:",
  "publish:",
  "confirmation:",
  'RELEASE_NOTES_PATH="docs/releases/$TAG.md"',
  'head_sha == $sha',
  '.path == ".github/workflows/verify.yml"',
  "Refusing to reuse existing tag",
  "Refusing to overwrite existing release",
  "SOURCE_SHA",
  "--prerelease",
]) {
  assert.ok(releaseWorkflow.includes(required), `Release guard missing: ${required}`);
}
assert.equal(releaseWorkflow.includes("docs/releases/v0.1.0-rc.2.md"), false, "Release workflow hard-codes one candidate note file");

const activeTruthFiles = currentMarkdown.filter((path) => !path.endsWith("docs/maintenance/REPOSITORY_CLEANUP_2026-08-27.md"));
const forbiddenCurrentReferences = [
  "codex/v1-release-candidate",
  "codex/v1-release-candidate-hardening-02",
  "codex/v0.2-pre-mac",
  "codex/publish-v0.1.0-rc.1",
  "chore/canonicalise-font-previewer-2026-08-27",
  ".github/workflows/release-candidate.yml",
];
for (const path of activeTruthFiles) {
  const text = await readFile(path, "utf8");
  for (const stale of forbiddenCurrentReferences) {
    assert.equal(text.includes(stale), false, `${relative(root, path)} presents stale repository machinery: ${stale}`);
  }
  assert.equal(text.includes("hello@pitch.dog"), false, `${relative(root, path)} exposes the studio email`);
}

for (const archiveName of [
  "APP_REPORT_RC_EVIDENCE.md",
  "PROGRAMME_STATUS_PRE_MAIN.md",
  "RELEASE_DECISION_PACKET_PRE_MAIN.md",
]) {
  const path = fromRoot("docs", "archive", "2026-08-27", archiveName);
  assert.ok(await exists(path), `Missing historical snapshot: ${archiveName}`);
}

for (const path of currentMarkdown) {
  const info = await stat(path);
  assert.ok(info.isFile(), `Expected a regular document: ${relative(root, path)}`);
}

process.stdout.write(
  `Repository truth verified: ${currentMarkdown.length} current Markdown files, ${workflowFiles.length} workflows, no broken local links or stale active branch instructions.\n`,
);
