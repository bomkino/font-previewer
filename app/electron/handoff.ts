import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { inflateSync } from "node:zlib";
import type { BrowserWindow } from "electron";
import { activeTypographySystem, faceForCandidate, sourceForCandidate, type HandoffPreferences, type StudyDocument } from "../src/domain.js";
import { csvCell, safeFileStem } from "./host-storage.js";

interface HandoffOptions {
  readonly window: BrowserWindow;
  readonly document: StudyDocument;
  readonly preferences: HandoffPreferences;
  readonly targetDirectory: string;
  readonly sourcePaths: ReadonlyMap<string, string>;
  readonly sourcePermissionAcknowledged: boolean;
}

interface ManifestEntry {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

interface SimpleExportManifest {
  readonly width: 5_152;
  readonly height: 2_160;
  readonly boardCount: number;
  readonly indexCount: number;
  readonly fontCount: number;
  readonly includeIndex: boolean;
}

const simpleBoardWidth = 5_152;
const simpleBoardHeight = 2_160;
const maximumSimpleFonts = 8_192;
const maximumPngBytes = 96 * 1024 * 1024;
const maximumPngDataUrlCharacters = 128 * 1024 * 1024;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let crcTable: Uint32Array | undefined;

function pngCrc32(data: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      crcTable[index] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngBuffer(dataUrl: unknown): Buffer {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) throw new Error("Simple board renderer returned an invalid PNG payload.");
  if (dataUrl.length > maximumPngDataUrlCharacters) throw new Error("Simple board PNG exceeded the export size limit.");
  const encoded = dataUrl.slice("data:image/png;base64,".length);
  if (!encoded.length || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Simple board renderer returned malformed base64 data.");
  const png = Buffer.from(encoded, "base64");
  if (!png.length || png.length > maximumPngBytes) throw new Error("Simple board PNG exceeded the export size limit.");
  if (!png.subarray(0, pngSignature.length).equals(pngSignature)) throw new Error("Simple board renderer returned a non-PNG file.");

  let offset = pngSignature.length;
  let width = 0;
  let height = 0;
  let sawHeader = false;
  let sawEnd = false;
  const imageData: Buffer[] = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > png.length) throw new Error("Simple board PNG contains a truncated chunk.");
    const type = png.toString("ascii", typeStart, dataStart);
    const expectedCrc = png.readUInt32BE(dataEnd);
    if (pngCrc32(png.subarray(typeStart, dataEnd)) !== expectedCrc) throw new Error(`Simple board PNG failed ${type || "chunk"} integrity verification.`);
    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13) throw new Error("Simple board PNG is missing its header.");
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      if (png[dataStart + 8] !== 8 || png[dataStart + 9] !== 6 || png[dataStart + 10] !== 0 || png[dataStart + 11] !== 0 || png[dataStart + 12] !== 0) {
        throw new Error("Simple board PNG uses an unexpected pixel format.");
      }
      sawHeader = true;
    } else if (type === "IHDR") {
      throw new Error("Simple board PNG contains a duplicate header.");
    }
    if (type === "IDAT") imageData.push(png.subarray(dataStart, dataEnd));
    if (type === "IEND") {
      if (length !== 0 || chunkEnd !== png.length) throw new Error("Simple board PNG has an invalid end marker.");
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
  }
  if (!sawHeader || !sawEnd || !imageData.length || width !== simpleBoardWidth || height !== simpleBoardHeight) {
    throw new Error(`Simple board PNG must decode to ${simpleBoardWidth} × ${simpleBoardHeight}.`);
  }
  const scanlineBytes = simpleBoardWidth * 4 + 1;
  const expectedInflatedBytes = scanlineBytes * simpleBoardHeight;
  const pixels = inflateSync(Buffer.concat(imageData), { maxOutputLength: expectedInflatedBytes });
  if (pixels.length !== expectedInflatedBytes) throw new Error("Simple board PNG contains an incomplete pixel surface.");
  for (let row = 0; row < simpleBoardHeight; row += 1) {
    if (pixels[row * scanlineBytes]! > 4) throw new Error("Simple board PNG contains an invalid scanline filter.");
  }
  return png;
}

function integerField(value: unknown, name: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`Simple export manifest has an invalid ${name}.`);
  return value as number;
}

async function simpleExportManifest(window: BrowserWindow, document: StudyDocument): Promise<SimpleExportManifest | undefined> {
  const raw = await window.webContents.executeJavaScript(`(() => {
    const shell = document.querySelector('.app-shell[data-interface-mode="simple"]');
    const runtime = window.__fontPreviewerSimpleExport;
    return shell && runtime ? runtime.manifest() : null;
  })()`, true) as unknown;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const width = integerField(value.width, "width");
  const height = integerField(value.height, "height");
  const fontCount = integerField(value.fontCount, "font count");
  const boardCount = integerField(value.boardCount, "board count");
  const indexCount = integerField(value.indexCount, "index count");
  if (value.includeIndex !== true && value.includeIndex !== false) throw new Error("Simple export manifest has an invalid index setting.");
  if (width !== simpleBoardWidth || height !== simpleBoardHeight) throw new Error(`Simple boards must be ${simpleBoardWidth} × ${simpleBoardHeight}.`);
  if (fontCount < 1 || fontCount > maximumSimpleFonts) throw new Error("Simple export font count is outside the Study limit.");
  if (fontCount !== document.candidates.filter((candidate) => candidate.reviewState !== "reject").length) throw new Error("Simple export font count does not match the mirrored Study.");
  if (boardCount !== Math.ceil(fontCount / 4)) throw new Error("Simple export board count does not match its fonts.");
  if (indexCount !== (value.includeIndex ? Math.ceil(fontCount / 12) : 0)) throw new Error("Simple export index count does not match its fonts.");
  return { width: simpleBoardWidth, height: simpleBoardHeight, fontCount, boardCount, indexCount, includeIndex: value.includeIndex };
}

async function renderSimplePages(window: BrowserWindow, stagingPath: string, manifest: SimpleExportManifest): Promise<void> {
  for (const [kind, count, directoryName, fileStem] of [
    ["board", manifest.boardCount, "Boards", "Board"],
    ["index", manifest.indexCount, "Index", "Index"],
  ] as const) {
    if (!count) continue;
    const directory = join(stagingPath, directoryName);
    await mkdir(directory, { mode: 0o700 });
    const digits = Math.max(2, String(count).length);
    for (let index = 0; index < count; index += 1) {
      const dataUrl = await window.webContents.executeJavaScript(`window.__fontPreviewerSimpleExport.render(${JSON.stringify(kind)}, ${index})`, true) as unknown;
      await writeFile(join(directory, `${fileStem}_${String(index + 1).padStart(digits, "0")}.png`), pngBuffer(dataUrl), { mode: 0o600 });
    }
  }
}

export type HandoffCommit = (stagingPath: string, finalPath: string) => Promise<void>;

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function summary(document: StudyDocument): string {
  const system = activeTypographySystem(document);
  const decisionCounts = Object.fromEntries(["unreviewed", "keep", "maybe", "reject"].map((state) => [state, document.candidates.filter((candidate) => candidate.reviewState === state).length]));
  const roles = system.fontUses.map((use) => {
    const candidate = use.originatingCandidateId
      ? document.candidates.find((item) => item.id === use.originatingCandidateId)
      : undefined;
    const face = document.faces.find((item) => item.id === use.faceId);
    return `| ${use.role} | ${face?.family ?? "Missing Face"} | ${candidate?.label ?? "Independent Font Use"} | ${use.rationale || "—"} |`;
  });
  return `# ${document.title}\n\nGenerated by Font Previewer. This Handoff records typography decisions; it does not grant font redistribution rights.\n\n## Decision status\n\n- Keep: ${decisionCounts.keep}\n- Maybe: ${decisionCounts.maybe}\n- Reject: ${decisionCounts.reject}\n- Unreviewed: ${decisionCounts.unreviewed}\n\n## Typography System — ${system.name}\n\n| Role | Family | Candidate | Rationale |\n| --- | --- | --- | --- |\n${roles.join("\n") || "| — | — | — | No Roles assigned |"}\n\n## Sources\n\n${document.sources.map((source) => `- ${source.displayName} — ${source.hint.format}; last known ${source.lastKnownState}`).join("\n") || "No Sources recorded."}\n`;
}

function candidateCsv(document: StudyDocument): string {
  const rows = [["candidate_id", "family", "style", "label", "review_state", "axes", "features", "tags", "notes", "rationale"]];
  for (const candidate of document.candidates) {
    const face = faceForCandidate(document, candidate);
    rows.push([
      candidate.id,
      face.family,
      face.style,
      candidate.label,
      candidate.reviewState,
      candidate.axes.map((axis) => `${axis.tag}=${axis.value}`).join(";"),
      candidate.features.map((feature) => `${feature.tag}=${feature.enabled ? 1 : 0}`).join(";"),
      candidate.tags.join(";"),
      candidate.notes,
      candidate.rationale,
    ]);
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

async function captureStage(window: BrowserWindow, stage: "Review" | "Compare" | "System", path: string): Promise<void> {
  await window.webContents.executeJavaScript(`(() => {
    const button = [...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes(${JSON.stringify(stage)}));
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing ${stage} stage');
    button.click();
  })()`, true);
  await new Promise((resolve) => setTimeout(resolve, 120));
  const image = await window.webContents.capturePage();
  await writeFile(path, image.toPNG(), { mode: 0o600 });
}

async function uniqueFinalPath(targetDirectory: string, requestedStem: string): Promise<string> {
  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const name = suffix === 0 ? `${requestedStem} Handoff` : `${requestedStem} Handoff ${suffix + 1}`;
    const candidate = join(targetDirectory, name);
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("Could not choose a unique Handoff folder name.");
}

export async function exportTransactionalHandoff(options: HandoffOptions, commit: HandoffCommit = rename): Promise<{ readonly displayName: string; readonly fileCount: number }> {
  if (options.preferences.includeSources && !options.sourcePermissionAcknowledged) {
    throw new Error("Source-copy permission was not acknowledged.");
  }
  const requestedStem = safeFileStem(options.document.title, "Font Previewer");
  const finalPath = await uniqueFinalPath(options.targetDirectory, requestedStem);
  const stagingPath = join(options.targetDirectory, `.${basename(finalPath)}.staging-${randomUUID()}`);
  if (dirname(stagingPath) !== options.targetDirectory || !basename(stagingPath).includes(".staging-")) {
    throw new Error("Invalid Handoff staging path.");
  }
  await mkdir(stagingPath, { recursive: false, mode: 0o700 });
  try {
    const outputs = new Set(options.preferences.outputs);
    if (outputs.has("json")) await writeFile(join(stagingPath, "study.pitchfontstudy"), `${JSON.stringify(options.document, null, 2)}\n`, { mode: 0o600 });
    if (outputs.has("summary")) await writeFile(join(stagingPath, "README.md"), summary(options.document), { mode: 0o600 });
    if (outputs.has("csv")) await writeFile(join(stagingPath, "candidates.csv"), candidateCsv(options.document), { mode: 0o600 });

    const simpleManifest = await simpleExportManifest(options.window, options.document);
    const activeStage = simpleManifest
      ? undefined
      : await options.window.webContents.executeJavaScript(`document.querySelector('.stage-nav [aria-current="step"]')?.textContent ?? 'Handoff'`, true) as string;
    if (simpleManifest) await renderSimplePages(options.window, stagingPath, simpleManifest);
    if (!simpleManifest && outputs.has("review-png")) await captureStage(options.window, "Review", join(stagingPath, "review.png"));
    if (!simpleManifest && outputs.has("compare-png")) await captureStage(options.window, "Compare", join(stagingPath, "compare.png"));
    if (!simpleManifest && outputs.has("system-png")) await captureStage(options.window, "System", join(stagingPath, "system.png"));
    if (outputs.has("pdf")) {
      const pdf = await options.window.webContents.printToPDF({ printBackground: true, pageSize: "A4", landscape: true, preferCSSPageSize: true });
      await writeFile(join(stagingPath, "study.pdf"), pdf, { mode: 0o600 });
    }
    const originalStage = activeStage && ["Review", "Compare", "System", "Handoff"].find((stage) => activeStage.includes(stage));
    if (originalStage) {
      await options.window.webContents.executeJavaScript(`([...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes(${JSON.stringify(originalStage)})))?.click()`, true);
    }

    if (options.preferences.includeSources) {
      const sourcesDirectory = join(stagingPath, "Sources");
      await mkdir(sourcesDirectory, { mode: 0o700 });
      const usedNames = new Set<string>();
      for (const source of options.document.sources) {
        const sourcePath = options.sourcePaths.get(source.id);
        if (!sourcePath) continue;
        const extension = extname(sourcePath);
        const base = safeFileStem(source.displayName, "Source");
        let name = `${base}${extension}`;
        for (let suffix = 2; usedNames.has(name.toLocaleLowerCase()); suffix += 1) name = `${base} ${suffix}${extension}`;
        usedNames.add(name.toLocaleLowerCase());
        await copyFile(sourcePath, join(sourcesDirectory, name));
      }
    }

    const relativeFiles = (await readdir(stagingPath, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath.slice(stagingPath.length + 1), entry.name))
      .sort();
    const entries: ManifestEntry[] = [];
    for (const relativePath of relativeFiles) {
      const path = join(stagingPath, relativePath);
      const metadata = await stat(path);
      if (!metadata.isFile() || metadata.size === 0) throw new Error(`Handoff output is empty: ${relativePath}`);
      entries.push({ path: relativePath, bytes: metadata.size, sha256: await sha256(path) });
    }
    const manifest = {
      manifestVersion: 1,
      generatedAt: new Date().toISOString(),
      product: "Font Previewer",
      studyId: options.document.id,
      schemaVersion: options.document.schemaVersion,
      sourcesIncluded: options.preferences.includeSources,
      redistributionPermissionAcknowledged: options.preferences.includeSources && options.sourcePermissionAcknowledged,
      files: entries,
    };
    await writeFile(join(stagingPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await writeFile(join(stagingPath, "checksums.sha256"), `${entries.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`, { mode: 0o600 });
    for (const entry of entries) {
      if (await sha256(join(stagingPath, entry.path)) !== entry.sha256) throw new Error(`Handoff verification failed: ${entry.path}`);
    }
    await commit(stagingPath, finalPath);
    return { displayName: basename(finalPath), fileCount: entries.length + 2 };
  } catch (error) {
    await rm(stagingPath, { recursive: true, force: true });
    throw error;
  }
}
