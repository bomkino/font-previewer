import { createHash } from "node:crypto";
import { lstat, open, readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// pitchdog-type-system v13, pinned to commit
// 786b4a2b671182319320f922b8de8f927ea3a002. Vite may rename emitted
// files, so packaged identity is enforced by location, byte size, and digest.
export const APPROVED_UI_FONTS = Object.freeze([
  Object.freeze({
    source: "assets/fonts/pd-head.woff2",
    bytes: 270_176,
    sha256: "528dd6d9d5d79265f4e3589523a250cd652110d1380e87a0252bca9489da50e9",
  }),
  Object.freeze({
    source: "assets/fonts/pd-head-alt.woff2",
    bytes: 276_308,
    sha256: "bf4db03493580a52e3e01cb6aec2fe791da8e7293d6083e2c567c3bb3f0b927a",
  }),
  Object.freeze({
    source: "assets/fonts/pd-body-roman.woff2",
    bytes: 171_820,
    sha256: "433a1b69a8e8a903478b978c198b879824541dc9eb62db959058ae37a250819f",
  }),
  Object.freeze({
    source: "assets/fonts/pd-body-italic.woff2",
    bytes: 218_976,
    sha256: "6bd35c9ad364e585ca5667c1df74f892eebbe32237005ba926b54ffa61df8a78",
  }),
  Object.freeze({
    source: "assets/fonts/pd-body-alt-roman.woff2",
    bytes: 169_540,
    sha256: "4ae6044273de9010d1a9660001319c34a4a8ece764279bb7f1e0f81f01dca85b",
  }),
  Object.freeze({
    source: "assets/fonts/pd-body-alt-italic.woff2",
    bytes: 179_020,
    sha256: "9f59a7f058ba824e0b3e2760204c0c70b7cfb2f61956a460b730e486b1209285",
  }),
  Object.freeze({
    source: "assets/fonts/pd-eyebrow-site.woff2",
    bytes: 916_908,
    sha256: "24aeaf1bfb45a874fe807c8138fc0d815b499b1834e8291c2dc46bb5fc32b7a3",
  }),
]);

const FONT_EXTENSIONS = new Set([".dfont", ".otc", ".otf", ".ttc", ".ttf", ".woff", ".woff2"]);
const EXPECTED_TOTAL_BYTES = APPROVED_UI_FONTS.reduce((sum, font) => sum + font.bytes, 0);
const APPROVED_BY_DIGEST = new Map(APPROVED_UI_FONTS.map((font) => [font.sha256, font]));

const PROFILES = Object.freeze({
  renderer: /^assets\/[^/]+\.woff2$/u,
  "linux-package": /^resources\/app\/dist\/renderer\/assets\/[^/]+\.woff2$/u,
  "linux-deb": /^opt\/font-previewer\/resources\/app\/dist\/renderer\/assets\/[^/]+\.woff2$/u,
  "macos-app": /^Contents\/Resources\/Studio\/assets\/[^/]+\.woff2$/u,
});

function repositoryPath(root, path) {
  return relative(root, path).split(sep).join("/");
}

function isFontPath(path) {
  return FONT_EXTENSIONS.has(extname(path).toLocaleLowerCase());
}

async function hasFontMagic(path) {
  const handle = await open(path, "r");
  try {
    const signature = Buffer.alloc(4);
    const { bytesRead } = await handle.read(signature, 0, signature.byteLength, 0);
    if (bytesRead !== signature.byteLength) return false;
    return (
      signature.equals(Buffer.from([0x00, 0x01, 0x00, 0x00])) ||
      ["OTTO", "true", "typ1", "ttcf", "wOFF", "wOF2"].includes(signature.toString("latin1"))
    );
  } finally {
    await handle.close();
  }
}

async function findFontFiles(root) {
  const files = [];
  const queue = [root];
  while (queue.length) {
    const directory = queue.pop();
    if (!directory) break;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const packagePath = repositoryPath(root, path);
      if (entry.isSymbolicLink()) {
        if (isFontPath(packagePath)) throw new Error(`Refusing non-regular packaged font path: ${packagePath}`);
        continue;
      }
      if (entry.isDirectory()) {
        queue.push(path);
        continue;
      }
      if (!entry.isFile()) {
        if (isFontPath(packagePath)) throw new Error(`Refusing non-regular packaged font path: ${packagePath}`);
        continue;
      }
      if (isFontPath(packagePath) || await hasFontMagic(path)) files.push({ path, packagePath });
    }
  }
  return files.sort((left, right) => left.packagePath.localeCompare(right.packagePath));
}

export async function auditApprovedFontBinaries(rootArgument, profileName) {
  const allowedPath = PROFILES[profileName];
  if (!allowedPath) throw new Error(`Unknown font-audit profile: ${profileName}`);
  if (!rootArgument) throw new Error("A narrow font-audit root is required.");

  const root = resolve(rootArgument);
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error(`Font-audit root must be a regular directory: ${root}`);

  const candidates = await findFontFiles(root);
  const seen = new Map();
  let totalBytes = 0;
  for (const candidate of candidates) {
    if (!allowedPath.test(candidate.packagePath)) {
      throw new Error(`Refusing font binary outside the approved renderer assets directory: ${candidate.packagePath}`);
    }

    const data = await readFile(candidate.path);
    const sha256 = createHash("sha256").update(data).digest("hex");
    const approved = APPROVED_BY_DIGEST.get(sha256);
    if (!approved) throw new Error(`Refusing unapproved font binary: ${candidate.packagePath} (${sha256})`);
    if (data.byteLength !== approved.bytes) {
      throw new Error(`Approved font byte-size mismatch: ${candidate.packagePath} (${data.byteLength} != ${approved.bytes})`);
    }
    if (seen.has(sha256)) {
      throw new Error(`Refusing duplicate approved font binary: ${candidate.packagePath} duplicates ${seen.get(sha256)}`);
    }
    seen.set(sha256, candidate.packagePath);
    totalBytes += data.byteLength;
  }

  const missing = APPROVED_UI_FONTS.filter((font) => !seen.has(font.sha256));
  if (missing.length) throw new Error(`Missing approved UI font binaries: ${missing.map((font) => font.source).join(", ")}`);
  if (candidates.length !== APPROVED_UI_FONTS.length) {
    throw new Error(`Unexpected packaged font count: ${candidates.length} != ${APPROVED_UI_FONTS.length}`);
  }
  if (totalBytes !== EXPECTED_TOTAL_BYTES) {
    throw new Error(`Unexpected packaged font bytes: ${totalBytes} != ${EXPECTED_TOTAL_BYTES}`);
  }

  return Object.freeze({
    count: candidates.length,
    totalBytes,
    paths: Object.freeze(candidates.map((candidate) => candidate.packagePath)),
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const [profileName, root] = process.argv.slice(2);
  if (!profileName || !root || process.argv.length !== 4) {
    process.stderr.write("Usage: node audit-font-binaries.mjs <renderer|linux-package|linux-deb|macos-app> <root>\n");
    process.exitCode = 64;
  } else {
    const result = await auditApprovedFontBinaries(root, profileName);
    process.stdout.write(`Approved UI font audit passed: ${result.count} WOFF2 files, ${result.totalBytes} bytes, profile ${profileName}.\n`);
  }
}
