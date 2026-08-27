import { execFile } from "node:child_process";
import { basename, extname } from "node:path";
import type { ImportedSource, SourceBindingSummary } from "../src/domain.js";

export const FONT_EXTENSIONS = new Set([".otf", ".ttf", ".ttc", ".otc", ".dfont", ".woff", ".woff2"]);
export const FULL_RENDER_EXTENSIONS = new Set([".otf", ".ttf", ".woff", ".woff2"]);

const STYLE_NAMES = new Set([
  "black",
  "bold",
  "book",
  "condensed",
  "demibold",
  "extralight",
  "hairline",
  "heavy",
  "italic",
  "light",
  "medium",
  "oblique",
  "regular",
  "semibold",
  "thin",
]);

const FIELD_SEPARATOR = "\u001f";
const RECORD_SEPARATOR = "\u001e";
const MAXIMUM_METADATA_OUTPUT = 1024 * 1024;
const MAXIMUM_FACES_PER_SOURCE = 256;
const MAXIMUM_NAME_LENGTH = 512;
const MAXIMUM_INSPECTION_MILLISECONDS = 3_000;

export const FONTCONFIG_QUERY_FORMAT = `%{index}${FIELD_SEPARATOR}%{family[0]}${FIELD_SEPARATOR}%{style[0]}${FIELD_SEPARATOR}%{postscriptname[0]}${RECORD_SEPARATOR}`;

export interface InspectedFaceMetadata {
  readonly faceIndex: number;
  readonly family: string;
  readonly style: string;
  readonly postScriptName?: string;
}

function parseMetadataName(value: string, label: string, allowEmpty = false): string | undefined {
  const normalized = value.normalize("NFC").trim();
  if (!normalized) {
    if (allowEmpty) return undefined;
    throw new Error(`Font metadata is missing ${label}.`);
  }
  if (normalized.length > MAXIMUM_NAME_LENGTH || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new Error(`Font metadata has an invalid ${label}.`);
  }
  return normalized;
}

export function parseFontconfigQuery(output: string): readonly InspectedFaceMetadata[] {
  if (!output || Buffer.byteLength(output, "utf8") > MAXIMUM_METADATA_OUTPUT) {
    throw new Error("Font metadata is empty or exceeds the inspection limit.");
  }
  const records = output.split(RECORD_SEPARATOR);
  if (records.at(-1) !== "") throw new Error("Font metadata output is truncated.");
  records.pop();
  if (records.length === 0 || records.length > MAXIMUM_FACES_PER_SOURCE) {
    throw new Error("Font metadata has an invalid face count.");
  }
  const seenIndexes = new Set<number>();
  return records.map((record) => {
    const fields = record.split(FIELD_SEPARATOR);
    if (fields.length !== 4 || !/^\d{1,6}$/u.test(fields[0])) throw new Error("Font metadata record is malformed.");
    const faceIndex = Number(fields[0]);
    if (!Number.isSafeInteger(faceIndex) || seenIndexes.has(faceIndex)) throw new Error("Font metadata has a duplicate or invalid face index.");
    seenIndexes.add(faceIndex);
    const family = parseMetadataName(fields[1], "family");
    const style = parseMetadataName(fields[2], "style");
    const postScriptName = parseMetadataName(fields[3], "PostScript name", true);
    return {
      faceIndex,
      family: family!,
      style: style!,
      ...(postScriptName ? { postScriptName } : {}),
    };
  });
}

export async function inspectFontFile(canonicalPath: string): Promise<readonly InspectedFaceMetadata[]> {
  if (process.platform !== "linux") throw new Error("Fontconfig inspection is available on Linux only.");
  const output = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const child = execFile(
      "/usr/bin/fc-query",
      ["--format", FONTCONFIG_QUERY_FORMAT, canonicalPath],
      { maxBuffer: MAXIMUM_METADATA_OUTPUT },
      (error, stdout) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (error) reject(new Error("Font metadata inspection failed."));
        else resolve(stdout);
      },
    );
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("Font metadata inspection timed out."));
    }, MAXIMUM_INSPECTION_MILLISECONDS);
  });
  return parseFontconfigQuery(output);
}

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function inferFontNames(path: string): { readonly family: string; readonly style: string } {
  const stem = basename(path, extname(path)).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const parts = stem.split(" ").filter(Boolean);
  const possibleStyle = parts.at(-1)?.toLocaleLowerCase() ?? "";
  const style = STYLE_NAMES.has(possibleStyle) ? titleCase(parts.pop() ?? "Regular") : "Regular";
  return { family: titleCase(parts.join(" ") || stem || "Untitled Font"), style };
}

export function rendererSupportForPath(path: string): SourceBindingSummary["rendererSupport"] {
  const extension = extname(path).toLocaleLowerCase();
  if (FULL_RENDER_EXTENSIONS.has(extension)) return "full";
  return FONT_EXTENSIONS.has(extension) ? "metadata-only" : "unsupported";
}

export function buildImportedSource(options: {
  readonly canonicalPath: string;
  readonly sourceId: string;
  readonly byteLength: number;
  readonly modifiedAt: string;
  readonly previewUrl?: string;
  readonly faces: readonly InspectedFaceMetadata[];
}): ImportedSource {
  const { canonicalPath, sourceId, byteLength, modifiedAt, previewUrl, faces } = options;
  if (faces.length === 0 || faces.length > MAXIMUM_FACES_PER_SOURCE) throw new Error("Font source has an invalid face count.");
  const extension = extname(canonicalPath).toLocaleLowerCase();
  const support = rendererSupportForPath(canonicalPath);
  return {
    source: {
      id: sourceId,
      displayName: faces[0].family,
      hint: {
        fileName: basename(canonicalPath),
        format: extension.slice(1).toLocaleUpperCase(),
        fileSize: byteLength,
        faceCount: faces.length,
      },
      lastKnownState: support === "full" ? "readable" : support === "metadata-only" ? "metadata-only" : "unsupported",
    },
    binding: {
      sourceId,
      state: support === "full" ? "readable" : support === "metadata-only" ? "metadata-only" : "unsupported",
      ...(support === "full" && previewUrl ? { previewUrl } : {}),
      modifiedAt,
      rendererSupport: support,
    },
    faces: faces.map((face) => ({
      id: `face:${sourceId}:${face.faceIndex}`,
      sourceId,
      family: face.family,
      style: face.style,
      ...(face.postScriptName ? { postScriptName: face.postScriptName } : {}),
      faceIndex: face.faceIndex,
      axes: [],
      namedInstances: [],
      features: [
        { tag: "liga", name: "Standard ligatures", group: "ligatures", defaultEnabled: true },
        { tag: "kern", name: "Kerning", group: "other", defaultEnabled: true },
      ],
      coverage: {
        supportedCodePointCount: 0,
        scripts: [],
        colorFormats: [],
        evidenceLevel: "unknown",
      },
    })),
  };
}
