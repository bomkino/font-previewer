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
}): ImportedSource {
  const { canonicalPath, sourceId, byteLength, modifiedAt, previewUrl } = options;
  const extension = extname(canonicalPath).toLocaleLowerCase();
  const support = rendererSupportForPath(canonicalPath);
  const { family, style } = inferFontNames(canonicalPath);
  const faceId = `face:${sourceId}:0`;
  return {
    source: {
      id: sourceId,
      displayName: family,
      hint: {
        fileName: basename(canonicalPath),
        format: extension.slice(1).toLocaleUpperCase(),
        fileSize: byteLength,
        faceCount: 1,
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
    faces: [{
      id: faceId,
      sourceId,
      family,
      style,
      postScriptName: `${family.replaceAll(" ", "")}-${style.replaceAll(" ", "")}`,
      faceIndex: 0,
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
    }],
  };
}
