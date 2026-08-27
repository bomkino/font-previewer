import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(appRoot, "..");
const read = (path) => readFile(path, "utf8");

const [manifestText, lockText, plist, packageScript, sbomText, workflow, appReadme, install, changelog] =
  await Promise.all([
    read(resolve(appRoot, "package.json")),
    read(resolve(appRoot, "package-lock.json")),
    read(resolve(appRoot, "macos", "Info.plist")),
    read(resolve(appRoot, "scripts", "package-linux.mjs")),
    read(resolve(appRoot, "sbom.cdx.json")),
    read(resolve(repoRoot, ".github", "workflows", "verify.yml")),
    read(resolve(appRoot, "README.md")),
    read(resolve(appRoot, "INSTALL.md")),
    read(resolve(repoRoot, "CHANGELOG.md")),
  ]);

const manifest = JSON.parse(manifestText);
const lock = JSON.parse(lockText);
const sbom = JSON.parse(sbomText);
const version = manifest.version;
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

assert.match(version, /^\d+\.\d+\.\d+$/, "package.json must use a three-part source version");
assert.equal(lock.version, version, "package-lock root version drifted");
assert.equal(lock.packages?.[""]?.version, version, "package-lock application version drifted");
assert.equal(sbom.metadata?.component?.version, version, "SBOM application version drifted");

const plistVersion = plist.match(
  /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
)?.[1];
assert.equal(plistVersion, version, "macOS bundle version drifted");

const linuxVersion = packageScript.match(/const version = "([^"]+)";/)?.[1];
assert.equal(linuxVersion, version, "Linux package version drifted");

const requiredVersionedText = [
  [workflow, `Font-Previewer-${version}-linux-x64.tar.gz`, "verification workflow portable name"],
  [workflow, `font-previewer_${version}_amd64.deb`, "verification workflow Debian name"],
  [appReadme, `Font-Previewer-${version}-linux-x64.tar.gz`, "application README portable name"],
  [appReadme, `font-previewer_${version}_amd64.deb`, "application README Debian name"],
  [install, `font-previewer_${version}_amd64.deb`, "installation Debian name"],
];
for (const [text, expected, label] of requiredVersionedText) {
  assert.ok(text.includes(expected), `${label} drifted`);
}
assert.match(changelog, new RegExp(`^## ${escaped}-rc\\.2 — 2026-08-28$`, "m"));

process.stdout.write(`Font Previewer version surfaces agree: ${version}; release candidate v${version}-rc.2.\n`);
