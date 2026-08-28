import {
  faceForCandidate,
  sourceForCandidate,
  transformedCopy,
  type Candidate,
  type FitPolicy,
  type StudySession,
} from "./domain.js";
import { candidateFontFamily } from "./font-runtime.js";

export const SIMPLE_STRESS_COPY = "Aa Ee Rr 0123456789 $ ₹ € £ % & @ # ! ? * — • © ™ \" '";
export const SIMPLE_BOARD_WIDTH = 5_152;
export const SIMPLE_BOARD_HEIGHT = 2_160;
export const SIMPLE_INDEX_PAGE_SIZE = 12;

export const SIMPLE_QUADRANTS = [
  { text: "#30a46c", background: "#121b17" },
  { text: "#e5484d", background: "#201314" },
  { text: "#0090ff", background: "#111927" },
  { text: "#f76b15", background: "#1e160f" },
] as const;

export interface SimpleExportManifest {
  readonly width: number;
  readonly height: number;
  readonly boardCount: number;
  readonly indexCount: number;
  readonly fontCount: number;
  readonly includeIndex: boolean;
}

export interface SimpleExportRuntime {
  readonly manifest: () => SimpleExportManifest;
  readonly render: (kind: "board" | "index", index: number) => Promise<string>;
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
  const recipe = session.document.recipes.find((item) => item.id === session.workspace.activeRecipeId)
    ?? session.document.recipes[0];
  const copy = stressTest ? SIMPLE_STRESS_COPY : (session.workspace.copyOverride ?? recipe?.copy ?? "Your Headline");
  return transformedCopy(copy || "Your Headline", candidate.casing);
}

function candidateFont(session: StudySession, candidate: Candidate, size: number): string {
  const face = faceForCandidate(session.document, candidate);
  const state = session.bindings.find((binding) => binding.sourceId === face.sourceId)?.rendererSupport === "full"
    ? "ready"
    : "unavailable";
  const family = candidateFontFamily(session.document, candidate, state);
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
): number {
  let low = 24;
  let high = Math.min(1_600, maximumHeight * 0.92);
  for (let iteration = 0; iteration < 14; iteration += 1) {
    const size = (low + high) / 2;
    context.font = candidateFont(session, candidate, size);
    const width = Math.max(...lines.map((line) => context.measureText(line).width));
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
): void {
  const quadrantWidth = SIMPLE_BOARD_WIDTH / 2;
  const quadrantHeight = SIMPLE_BOARD_HEIGHT / 2;
  context.fillStyle = "#08080b";
  context.fillRect(0, 0, SIMPLE_BOARD_WIDTH, SIMPLE_BOARD_HEIGHT);
  const prepared = candidates.map((candidate) => {
    const lines = boardLines(simpleDisplayCopy(session, candidate, stressTest), policy);
    const size = fitLines(context, session, candidate, lines, quadrantWidth * 0.84, quadrantHeight * 0.62);
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
    context.font = candidateFont(session, candidate, size);
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
    context.font = `40px ui-monospace, "SF Mono", Menlo, Monaco, monospace`;
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
    context.font = `29px ui-monospace, "SF Mono", Menlo, Monaco, monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(`${displayId} · ${source.hint.fileName || `${face.family} ${face.style}`}`, x + 64, y + 68, cellWidth - 128);
    const lines = [simpleDisplayCopy(session, candidate, stressTest).replace(/\s*\r?\n\s*/gu, " ")];
    const size = fitLines(context, session, candidate, lines, cellWidth * 0.82, cellHeight * 0.48);
    context.font = candidateFont(session, candidate, size);
    context.fillStyle = "#ebebed";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(lines[0]!, x + cellWidth / 2, y + cellHeight * 0.60, cellWidth * 0.82);
  });
  context.fillStyle = "#74747e";
  context.font = `28px ui-monospace, "SF Mono", Menlo, Monaco, monospace`;
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.fillText(`Index · ${pageIndex + 1} / ${pageCount} · ${session.document.title}`, SIMPLE_BOARD_WIDTH - 54, SIMPLE_BOARD_HEIGHT - 44);
}

export function createSimpleExportRuntime(
  session: StudySession,
  stressTest: boolean,
  includeIndex: boolean,
  fitPolicy: FitPolicy = "fit",
): SimpleExportRuntime {
  const candidates = includedCandidates(session);
  const boards = chunked(candidates, 4);
  const indexes = includeIndex ? chunked(candidates, SIMPLE_INDEX_PAGE_SIZE) : [];
  const manifest = (): SimpleExportManifest => ({
    width: SIMPLE_BOARD_WIDTH,
    height: SIMPLE_BOARD_HEIGHT,
    boardCount: boards.length,
    indexCount: indexes.length,
    fontCount: candidates.length,
    includeIndex,
  });
  return {
    manifest,
    async render(kind, index) {
      if (!Number.isInteger(index) || index < 0) throw new RangeError("Invalid board index");
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      canvas.width = SIMPLE_BOARD_WIDTH;
      canvas.height = SIMPLE_BOARD_HEIGHT;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D rendering is unavailable");
      if (kind === "board") {
        const candidatesForBoard = boards[index];
        if (!candidatesForBoard) throw new RangeError("Board index is out of range");
        drawBoard(context, session, candidatesForBoard, stressTest, index * 4, fitPolicy);
      } else {
        const candidatesForIndex = indexes[index];
        if (!candidatesForIndex) throw new RangeError("Index page is out of range");
        drawIndex(context, session, candidatesForIndex, stressTest, index * SIMPLE_INDEX_PAGE_SIZE, index, indexes.length);
      }
      return canvas.toDataURL("image/png");
    },
  };
}
