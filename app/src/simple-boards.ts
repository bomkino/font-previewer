import {
  activeRecipe,
  candidatesInSimpleSet,
  simpleFontSets,
  DEFAULT_BODY_COPY,
  bindingForSource,
  cssFeatureSettings,
  cssVariationSettings,
  faceForCandidate,
  sourceForCandidate,
  transformedCopy,
  type Candidate,
  type FitPolicy,
  type StudySession,
} from "./domain.js";
import { candidateFontFamily, canPreviewFace } from "./font-runtime.js";

export const SIMPLE_STRESS_COPY = "Aa Ee Rr 0123456789 $ ₹ € £ % & @ # ! ? * — • © ™ \" '";
export const SIMPLE_BOARD_WIDTH = 5_152;
export const SIMPLE_BOARD_HEIGHT = 2_160;
export const SIMPLE_INDEX_PAGE_SIZE = 12;
export const SIMPLE_PREVIEW_PAGE_SIZE = 12;
export const SIMPLE_BODY_COPY_LIMIT = 1_200;

export type SimplePageMode = "boards" | "body";
export type SimpleExportScope = SimplePageMode | "both";

export interface SimpleBodyCopySample {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly copy: string;
}

export const SIMPLE_BODY_COPY_SAMPLES: readonly SimpleBodyCopySample[] = [
  {
    id: "before-the-city-wakes",
    label: "Before the city wakes",
    detail: "Narrative · two paragraphs",
    copy: DEFAULT_BODY_COPY,
  },
  {
    id: "the-useful-quiet",
    label: "The useful quiet",
    detail: "Essay · texture and rhythm",
    copy: "The workshop is quiet in the useful way: not empty, but attentive. Paper shifts against the table. A pencil rolls, stops, and leaves behind a small grey decision. Nobody is rushing to make the work look finished before it has become clear.\n\nClarity has a physical life. It lives in the width of a line, the shape of a pause, the distance between one thought and the next. When those choices are right, reading feels less like decoding and more like being led somewhere worth going.",
  },
  {
    id: "after-the-first-rain",
    label: "After the first rain",
    detail: "Field note · punctuation and colour",
    copy: "After the first rain, the neighbourhood changes register. Dust darkens to umber; leaves turn glossy; scooters draw brief silver lines through the water. At the tea stall, six people make room for eight without discussing it. Someone counts ₹42 in coins, and someone else laughs before the story has reached its end.\n\nBy evening the heat will return, but for now every surface holds a little weather. Windows stay open. The road smells newly made. Even familiar words seem to arrive with cleaner edges.",
  },
] as const;

export const DEFAULT_SIMPLE_BODY_COPY_SAMPLE_ID = SIMPLE_BODY_COPY_SAMPLES[0]!.id;

export const SIMPLE_QUADRANTS = [
  { text: "#30a46c", background: "#121b17" },
  { text: "#e5484d", background: "#201314" },
  { text: "#0090ff", background: "#111927" },
  { text: "#f76b15", background: "#1e160f" },
] as const;

export interface SimpleExportManifest {
  readonly width: number;
  readonly height: number;
  readonly pageMode: SimpleExportScope;
  readonly boardCount: number;
  readonly bodyCount: number;
  readonly indexCount: number;
  readonly fontCount: number;
  readonly includeIndex: boolean;
}

export interface SimpleExportRuntime {
  readonly manifest: () => SimpleExportManifest;
  readonly render: (kind: "board" | "body" | "index", index: number) => Promise<string>;
}

declare global {
  interface Window {
    __fontPreviewerSimpleExport?: SimpleExportRuntime;
  }
}

export function chunked<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError("Chunk size must be a positive integer");
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export function includedCandidates(session: StudySession): Candidate[] {
  return session.document.candidates.filter((candidate) => candidate.reviewState !== "reject");
}

export function simpleDisplayCopy(session: StudySession, candidate: Candidate, stressTest: boolean): string {
  const recipe = activeRecipe(session);
  const copy = stressTest ? SIMPLE_STRESS_COPY : (session.workspace.copyOverride ?? recipe?.copy ?? "Your Headline");
  return transformedCopy(copy || "Your Headline", candidate.casing);
}

export function simpleBodyCopySample(sampleId: string): SimpleBodyCopySample {
  return SIMPLE_BODY_COPY_SAMPLES.find((sample) => sample.id === sampleId) ?? SIMPLE_BODY_COPY_SAMPLES[0]!;
}

export function simpleBodyDisplayCopy(session: StudySession, candidate: Candidate, sampleId: string): string {
  const copy = session.workspace.copyOverride ?? (session.workspace.simpleSet === "body" ? simpleFontSets(session.document).body.copy : simpleBodyCopySample(sampleId).copy);
  return transformedCopy(copy, candidate.casing);
}

export function simpleBodyCopyLabel(session: StudySession, sampleId: string): string {
  const copy = session.workspace.copyOverride ?? (session.workspace.simpleSet === "body" ? simpleFontSets(session.document).body.copy : simpleBodyCopySample(sampleId).copy);
  return SIMPLE_BODY_COPY_SAMPLES.find((sample) => sample.copy === copy)?.label ?? "Custom copy";
}

type CanvasFontFamilies = ReadonlyMap<string, string>;
let canvasFontRun = 0;
const canvasFontSettings = new WeakMap<HTMLCanvasElement, string>();

function setCanvasFont(context: CanvasRenderingContext2D, font: string, candidate?: Candidate): void {
  const variation = candidate ? cssVariationSettings(candidate) || "normal" : "normal";
  const features = candidate ? cssFeatureSettings(candidate) || "normal" : "normal";
  const key = JSON.stringify([variation, features]);
  if (canvasFontSettings.get(context.canvas) !== key) {
    // WebKit ignores FontFace.variationSettings, but inherits these properties
    // from a connected canvas. Reset its cached font before changing instances.
    context.canvas.style.fontVariationSettings = variation;
    context.canvas.style.fontFeatureSettings = features;
    context.font = "10px sans-serif";
    canvasFontSettings.set(context.canvas, key);
  }
  context.font = font;
}

async function withCanvasFonts<T>(
  session: StudySession,
  candidates: readonly Candidate[],
  render: (families: CanvasFontFamilies) => T,
): Promise<T> {
  const families = new Map<string, string>();
  const prepared = new Map<string, string>();
  const loaded: FontFace[] = [];
  const run = ++canvasFontRun;
  try {
    for (const candidate of candidates) {
      const face = faceForCandidate(session.document, candidate);
      const binding = bindingForSource(session, face.sourceId);
      if (!canPreviewFace(face, sourceForCandidate(session.document, candidate), binding)) continue;
      const variationSettings = cssVariationSettings(candidate) || "normal";
      const featureSettings = cssFeatureSettings(candidate) || "normal";
      const key = JSON.stringify([face.sourceId, variationSettings, featureSettings]);
      let family = prepared.get(key);
      if (!family) {
        family = `FontPreviewerExport_${run}_${prepared.size}`;
        // Private faces carry exact defaults in Chromium. Connected-canvas CSS
        // supplies the same settings in WebKit without synthesizing font styles.
        const font = new FontFace(family, `url("${binding!.previewUrl!.replaceAll('"', "%22")}")`, { variationSettings, featureSettings });
        const ready = await font.load();
        document.fonts.add(ready);
        loaded.push(ready);
        prepared.set(key, family);
      }
      families.set(candidate.id, family);
    }
    return render(families);
  } finally {
    loaded.forEach((font) => document.fonts.delete(font));
  }
}

function candidateFont(session: StudySession, candidate: Candidate, size: number, families: CanvasFontFamilies): string {
  const prepared = families.get(candidate.id);
  if (prepared) return `${size}px "${prepared}"`;
  const family = candidateFontFamily(session.document, candidate, "unavailable");
  const weight = Math.round(candidate.axes.find((axis) => axis.tag === "wght")?.value ?? 400);
  const italic = (candidate.axes.find((axis) => axis.tag === "ital")?.value ?? 0) >= 0.5
    || (candidate.axes.find((axis) => axis.tag === "slnt")?.value ?? 0) !== 0;
  return `${italic ? "italic " : ""}${Math.min(1_000, Math.max(1, weight))} ${size}px ${family}`;
}

function boardLines(copy: string, policy: FitPolicy): string[] {
  if (policy !== "locked-lines") return [copy.replace(/\s*\r?\n\s*/gu, " ")];
  const lines = copy.split(/\r?\n/gu).map((line) => line || " ");
  return lines.length ? lines : [" "];
}

function fitLines(
  context: CanvasRenderingContext2D,
  session: StudySession,
  candidate: Candidate,
  lines: readonly string[],
  maximumWidth: number,
  maximumHeight: number,
  families: CanvasFontFamilies,
): number {
  let low = 24;
  let high = Math.min(1_600, maximumHeight * 0.92);
  for (let iteration = 0; iteration < 14; iteration += 1) {
    const size = (low + high) / 2;
    setCanvasFont(context, candidateFont(session, candidate, size, families), candidate);
    const width = Math.max(...lines.map((line) => {
      const metrics = context.measureText(line);
      return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    }));
    const height = lines.length * size * 1.08;
    if (width <= maximumWidth && height <= maximumHeight) low = size;
    else high = size;
  }
  return Math.floor(low * 10) / 10;
}

function drawBoard(
  context: CanvasRenderingContext2D,
  session: StudySession,
  candidates: readonly Candidate[],
  stressTest: boolean,
  displayOffset: number,
  policy: FitPolicy,
  families: CanvasFontFamilies,
): void {
  const quadrantWidth = SIMPLE_BOARD_WIDTH / 2;
  const quadrantHeight = SIMPLE_BOARD_HEIGHT / 2;
  context.fillStyle = "#08080b";
  context.fillRect(0, 0, SIMPLE_BOARD_WIDTH, SIMPLE_BOARD_HEIGHT);
  const prepared = candidates.map((candidate) => {
    const lines = boardLines(simpleDisplayCopy(session, candidate, stressTest), policy);
    const size = fitLines(context, session, candidate, lines, quadrantWidth * 0.84, quadrantHeight * 0.62, families);
    return { candidate, lines, size };
  });
  const sharedSize = policy === "fit" ? undefined : Math.min(...prepared.map((item) => item.size));
  for (let slot = 0; slot < 4; slot += 1) {
    const x = (slot % 2) * quadrantWidth;
    const y = Math.floor(slot / 2) * quadrantHeight;
    const palette = SIMPLE_QUADRANTS[slot];
    context.fillStyle = palette.background;
    context.fillRect(x, y, quadrantWidth, quadrantHeight);
    const item = prepared[slot];
    if (!item) continue;
    const { candidate, lines } = item;
    const size = sharedSize ?? item.size;
    setCanvasFont(context, candidateFont(session, candidate, size, families), candidate);
    context.fillStyle = palette.text;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const lineHeight = size * 1.08;
    const firstLineY = y + quadrantHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, lineIndex) => context.fillText(line, x + quadrantWidth / 2, firstLineY + lineIndex * lineHeight, quadrantWidth * 0.84));

    const face = faceForCandidate(session.document, candidate);
    const source = sourceForCandidate(session.document, candidate);
    const displayId = String(displayOffset + slot + 1).padStart(2, "0");
    const weight = candidate.axes.find((axis) => axis.tag === "wght")?.value;
    setCanvasFont(context, `40px ui-monospace, "SF Mono", Menlo, Monaco, monospace`);
    context.fillStyle = `${palette.text}88`;
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText(
      `${displayId} · ${source.hint.fileName || `${face.family} ${face.style}`}${weight === undefined ? "" : ` · wght ${Math.round(weight)}`}`,
      x + 60,
      y + quadrantHeight - 56,
      quadrantWidth - 120,
    );
  }
}

function drawIndex(
  context: CanvasRenderingContext2D,
  session: StudySession,
  candidates: readonly Candidate[],
  stressTest: boolean,
  displayOffset: number,
  pageIndex: number,
  pageCount: number,
  families: CanvasFontFamilies,
): void {
  const columns = 4;
  const rows = 3;
  const cellWidth = SIMPLE_BOARD_WIDTH / columns;
  const cellHeight = SIMPLE_BOARD_HEIGHT / rows;
  context.fillStyle = "#0c0c0e";
  context.fillRect(0, 0, SIMPLE_BOARD_WIDTH, SIMPLE_BOARD_HEIGHT);
  context.strokeStyle = "rgba(255,255,255,0.07)";
  context.lineWidth = 2;
  for (let column = 1; column < columns; column += 1) {
    context.beginPath();
    context.moveTo(column * cellWidth, 0);
    context.lineTo(column * cellWidth, SIMPLE_BOARD_HEIGHT);
    context.stroke();
  }
  for (let row = 1; row < rows; row += 1) {
    context.beginPath();
    context.moveTo(0, row * cellHeight);
    context.lineTo(SIMPLE_BOARD_WIDTH, row * cellHeight);
    context.stroke();
  }
  candidates.forEach((candidate, slot) => {
    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const x = column * cellWidth;
    const y = row * cellHeight;
    const face = faceForCandidate(session.document, candidate);
    const source = sourceForCandidate(session.document, candidate);
    const displayId = String(displayOffset + slot + 1).padStart(2, "0");
    context.fillStyle = "#74747e";
    setCanvasFont(context, `29px ui-monospace, "SF Mono", Menlo, Monaco, monospace`);
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(`${displayId} · ${source.hint.fileName || `${face.family} ${face.style}`}`, x + 64, y + 68, cellWidth - 128);
    const lines = [simpleDisplayCopy(session, candidate, stressTest).replace(/\s*\r?\n\s*/gu, " ")];
    const size = fitLines(context, session, candidate, lines, cellWidth * 0.82, cellHeight * 0.48, families);
    setCanvasFont(context, candidateFont(session, candidate, size, families), candidate);
    context.fillStyle = "#ebebed";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    const metrics = context.measureText(lines[0]!);
    // Center visible ink, including italic overhangs and descenders, in the whole
    // cell. Metadata is an overlay and must not push the specimen down.
    const inkX = (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
    const inkY = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    const width = Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    const scale = width > 0 ? Math.min(1, cellWidth * 0.82 / width) : 1;
    context.fillText(lines[0]!, x + cellWidth / 2 + inkX * scale, y + cellHeight / 2 + inkY, metrics.width * scale);
  });
  context.fillStyle = "#74747e";
  setCanvasFont(context, `28px ui-monospace, "SF Mono", Menlo, Monaco, monospace`);
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.fillText(`Index · ${pageIndex + 1} / ${pageCount} · ${session.document.title}`, SIMPLE_BOARD_WIDTH - 54, SIMPLE_BOARD_HEIGHT - 44);
}

function wrappedBodyLines(context: CanvasRenderingContext2D, copy: string, maximumWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = copy.trim().split(/\n\s*\n/gu);
  for (const [paragraphIndex, rawParagraph] of paragraphs.entries()) {
    const words = rawParagraph.replace(/\s+/gu, " ").trim().split(" ").filter(Boolean);
    let line = "";
    for (const word of words) {
      const proposal = line ? `${line} ${word}` : word;
      if (context.measureText(proposal).width <= maximumWidth) {
        line = proposal;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (context.measureText(word).width <= maximumWidth) {
        line = word;
        continue;
      }
      let fragment = "";
      for (const character of [...word]) {
        const next = `${fragment}${character}`;
        if (fragment && context.measureText(next).width > maximumWidth) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment = next;
        }
      }
      line = fragment;
    }
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push("");
  }
  return lines.length ? lines : [" "];
}

function bodyLinesHeight(lines: readonly string[], size: number): number {
  return lines.reduce((height, line) => height + size * (line ? 1.48 : 0.7), 0);
}

async function fittedBodySize(
  context: CanvasRenderingContext2D,
  session: StudySession,
  candidates: readonly Candidate[],
  sampleId: string,
  maximumWidth: number,
  maximumHeight: number,
): Promise<number> {
  let shared = 120;
  const measured = new Set<string>();
  for (const candidate of candidates) {
    const copy = simpleBodyDisplayCopy(session, candidate, sampleId);
    const face = faceForCandidate(session.document, candidate);
    const identity = canPreviewFace(face, sourceForCandidate(session.document, candidate), bindingForSource(session, face.sourceId)) ? face.sourceId : face.id;
    const key = JSON.stringify([identity, candidate.axes, candidate.features, copy]);
    if (measured.has(key)) continue;
    measured.add(key);
    const fitted = await withCanvasFonts(session, [candidate], (families) => {
      let low = 12;
      let high = 120;
      for (let iteration = 0; iteration < 14; iteration += 1) {
        const size = (low + high) / 2;
        setCanvasFont(context, candidateFont(session, candidate, size, families), candidate);
        const lines = wrappedBodyLines(context, copy, maximumWidth);
        if (bodyLinesHeight(lines, size) <= maximumHeight) low = size;
        else high = size;
      }
      return Math.floor(low * 10) / 10;
    });
    shared = Math.min(shared, fitted);
    // Keep only one temporary instance resident, and let input/paint run during
    // large sets even when every font resource is already cached.
    if (measured.size % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return shared;
}

function drawBodyPage(
  context: CanvasRenderingContext2D,
  session: StudySession,
  candidates: readonly Candidate[],
  candidate: Candidate,
  sampleId: string,
  pageIndex: number,
  size: number,
  families: CanvasFontFamilies,
): void {
  const sampleLabel = simpleBodyCopyLabel(session, sampleId);
  const face = faceForCandidate(session.document, candidate);
  const source = sourceForCandidate(session.document, candidate);
  const bodyX = 1_330;
  const bodyY = 510;
  const bodyWidth = 3_330;
  const copy = simpleBodyDisplayCopy(session, candidate, sampleId);

  context.fillStyle = "#f2eee6";
  context.fillRect(0, 0, SIMPLE_BOARD_WIDTH, SIMPLE_BOARD_HEIGHT);
  context.fillStyle = "#ff5f45";
  context.fillRect(0, 0, 34, SIMPLE_BOARD_HEIGHT);
  context.strokeStyle = "rgba(22, 21, 20, 0.16)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(250, 330);
  context.lineTo(SIMPLE_BOARD_WIDTH - 250, 330);
  context.stroke();

  context.fillStyle = "#6c6861";
  setCanvasFont(context, `38px ui-monospace, "SF Mono", Menlo, Monaco, monospace`);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText(`BODY COPY · ${String(pageIndex + 1).padStart(2, "0")} / ${String(candidates.length).padStart(2, "0")}`, 250, 230);
  context.textAlign = "right";
  context.fillText(`${sampleLabel.toLocaleUpperCase()} · 5152 × 2160`, SIMPLE_BOARD_WIDTH - 250, 230);

  context.textAlign = "left";
  context.fillStyle = "#171614";
  setCanvasFont(context, candidateFont(session, candidate, 168, families), candidate);
  context.fillText(face.family, 250, 610, 830);
  context.fillStyle = "#6c6861";
  setCanvasFont(context, `38px ui-monospace, "SF Mono", Menlo, Monaco, monospace`);
  context.fillText(candidate.label, 250, 700, 830);
  context.fillText(source.hint.fileName || face.style, 250, 760, 830);
  context.fillText(`${Math.round(size)} px · 1.48 leading`, 250, 1_850, 830);

  setCanvasFont(context, candidateFont(session, candidate, size, families), candidate);
  context.fillStyle = "#171614";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const lines = wrappedBodyLines(context, copy, bodyWidth);
  let cursorY = bodyY + size;
  for (const line of lines) {
    if (line) context.fillText(line, bodyX, cursorY, bodyWidth);
    cursorY += size * (line ? 1.48 : 0.7);
  }

  context.fillStyle = "#6c6861";
  setCanvasFont(context, `34px ui-monospace, "SF Mono", Menlo, Monaco, monospace`);
  context.textAlign = "right";
  context.fillText(`${session.document.title} · ${face.style}`, SIMPLE_BOARD_WIDTH - 250, 2_005);
}

export function createSimpleExportRuntime(
  session: StudySession,
  stressTest: boolean,
  includeIndex: boolean,
  fitPolicy: FitPolicy = "fit",
  pageMode: SimplePageMode = "boards",
  bodySampleId: string = DEFAULT_SIMPLE_BODY_COPY_SAMPLE_ID,
): SimpleExportRuntime {
  const candidates = includedCandidates(session);
  const boards = chunked(candidates, 4);
  const indexes = pageMode === "boards" && includeIndex ? chunked(candidates, SIMPLE_INDEX_PAGE_SIZE) : [];
  let bodySize: number | undefined;
  const manifest = (): SimpleExportManifest => {
    if (pageMode === "body" && candidates.length > 0) {
      const copy = simpleBodyDisplayCopy(session, candidates[0]!, bodySampleId);
      if (!copy.trim()) throw new RangeError("Body copy cannot be empty");
      if (copy.length > SIMPLE_BODY_COPY_LIMIT) {
        throw new RangeError(`Body copy must be ${SIMPLE_BODY_COPY_LIMIT.toLocaleString("en-US")} characters or fewer`);
      }
    }
    return {
      width: SIMPLE_BOARD_WIDTH,
      height: SIMPLE_BOARD_HEIGHT,
      pageMode,
      boardCount: pageMode === "boards" ? boards.length : 0,
      bodyCount: pageMode === "body" ? candidates.length : 0,
      indexCount: indexes.length,
      fontCount: candidates.length,
      includeIndex: pageMode === "boards" && includeIndex,
    };
  };
  return {
    manifest,
    async render(kind, index) {
      if (!Number.isInteger(index) || index < 0) throw new RangeError("Invalid page index");
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      canvas.width = SIMPLE_BOARD_WIDTH;
      canvas.height = SIMPLE_BOARD_HEIGHT;
      const context = canvas.getContext("2d", { alpha: false });
      try {
        if (!context) throw new Error("Canvas 2D rendering is unavailable");
        canvas.setAttribute("aria-hidden", "true");
        canvas.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none;font-synthesis:none";
        document.body.append(canvas);
        if (kind === "board") {
          if (pageMode !== "boards") throw new RangeError("Board pages are unavailable in Body Copy mode");
          const candidatesForBoard = boards[index];
          if (!candidatesForBoard) throw new RangeError("Board index is out of range");
          return await withCanvasFonts(session, candidatesForBoard, (families) => {
            drawBoard(context, session, candidatesForBoard, stressTest, index * 4, fitPolicy, families);
            return canvas.toDataURL("image/png");
          });
        } else if (kind === "index") {
          if (pageMode !== "boards") throw new RangeError("Index pages are unavailable in Body Copy mode");
          const candidatesForIndex = indexes[index];
          if (!candidatesForIndex) throw new RangeError("Index page is out of range");
          return await withCanvasFonts(session, candidatesForIndex, (families) => {
            drawIndex(context, session, candidatesForIndex, stressTest, index * SIMPLE_INDEX_PAGE_SIZE, index, indexes.length, families);
            return canvas.toDataURL("image/png");
          });
        } else {
          if (pageMode !== "body") throw new RangeError("Body Copy pages are unavailable in Boards mode");
          const candidate = candidates[index];
          if (!candidate) throw new RangeError("Body Copy page index is out of range");
          // Fit the set once per immutable export runtime, not again for every page.
          bodySize ??= await fittedBodySize(context, session, candidates, bodySampleId, 3_330, 1_330);
          const size = bodySize;
          return await withCanvasFonts(session, [candidate], (families) => {
            drawBodyPage(context, session, candidates, candidate, bodySampleId, index, size, families);
            return canvas.toDataURL("image/png");
          });
        }
      } finally {
        canvas.remove();
        canvas.width = 1;
        canvas.height = 1;
      }
    },
  };
}

/** Both page formats share the Study; each export view selects only its own candidates and copy. */
export function createSimpleSetsExportRuntime(
  session: StudySession,
  stressTest: boolean,
  includeIndex: boolean,
  scope: SimpleExportScope,
  bodySampleId = DEFAULT_SIMPLE_BODY_COPY_SAMPLE_ID,
): SimpleExportRuntime {
  const sets = simpleFontSets(session.document);
  const view = (setId: "headlines" | "body"): StudySession => ({
    ...session,
    document: { ...session.document, candidates: candidatesInSimpleSet(session.document, setId) },
    workspace: { ...session.workspace, simpleSet: setId, copyOverride: undefined },
  });
  const headline = createSimpleExportRuntime(view("headlines"), stressTest, includeIndex, sets.headlines.fitPolicy, "boards", bodySampleId);
  const body = createSimpleExportRuntime(view("body"), false, false, sets.body.fitPolicy, "body", bodySampleId);
  return {
    manifest() {
      if (scope === "boards") return headline.manifest();
      if (scope === "body") return body.manifest();
      const head = headline.manifest();
      const reading = body.manifest();
      return { ...head, pageMode: "both", bodyCount: reading.bodyCount, fontCount: head.fontCount + reading.fontCount };
    },
    render(kind, index) {
      if (kind === "body") {
        if (scope === "boards") return Promise.reject(new RangeError("Body Copy is outside this export"));
        return body.render(kind, index);
      }
      if (scope === "body") return Promise.reject(new RangeError("Headlines are outside this export"));
      return headline.render(kind, index);
    },
  };
}
