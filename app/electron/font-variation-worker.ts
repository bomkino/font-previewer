import * as fontkit from "fontkit";
import type { Font, FontCollection } from "fontkit";

interface FontWithNamedVariations extends Font {
  readonly namedVariations: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

function isCollection(value: Font | FontCollection): value is FontCollection {
  return value.type === "TTC" || value.type === "DFont";
}

function boundedText(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.normalize("NFC").trim() : "";
  return text && text.length <= 512 && !/[\u0000-\u001f\u007f]/u.test(text) ? text : fallback;
}

function inspectFont(font: Font, faceIndex: number) {
  const axes = Object.entries(font.variationAxes ?? {}).flatMap(([rawTag, axis]) => {
    if (!axis) return [];
    const tag = rawTag.trim();
    if (!/^[\x20-\x7e]{4}$/u.test(tag)) throw new Error("Variable axis tag is invalid.");
    const values = [axis.min, axis.default, axis.max];
    if (!values.every(Number.isFinite) || axis.min > axis.default || axis.default > axis.max) {
      throw new Error("Variable axis range is invalid.");
    }
    return [{
      tag,
      name: boundedText(axis.name, tag),
      minimum: axis.min,
      defaultValue: axis.default,
      maximum: axis.max,
    }];
  });
  if (axes.length > 64) throw new Error("Variable font exceeds the axis limit.");
  const knownTags = new Set(axes.map((axis) => axis.tag));
  const rawInstances = (font as FontWithNamedVariations).namedVariations ?? {};
  const namedInstances = Object.entries(rawInstances).slice(0, 256).map(([rawName, rawCoordinates]) => ({
    name: boundedText(rawName, "Instance"),
    coordinates: Object.entries(rawCoordinates).filter(([tag, value]) => knownTags.has(tag) && Number.isFinite(value)).map(([tag, value]) => ({ tag, value })),
  }));
  return { faceIndex, axes, namedInstances };
}

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Font path is required.");
const opened = fontkit.openSync(sourcePath);
const fonts = isCollection(opened) ? opened.fonts : [opened];
if (fonts.length === 0 || fonts.length > 256) throw new Error("Font source has an invalid face count.");
process.stdout.write(`${JSON.stringify(fonts.map(inspectFont))}\n`);
