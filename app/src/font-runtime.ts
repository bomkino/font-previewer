import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  cssFeatureSettings,
  cssVariationSettings,
  faceForCandidate,
  transformedCopy,
  type Candidate,
  type Face,
  type Recipe,
  type SourceBindingSummary,
  type SourceSummary,
  type StudyDocument,
  type StudySession,
} from "./domain.js";

export interface StudyIndex {
  readonly faceById: ReadonlyMap<string, Face>;
  readonly candidateById: ReadonlyMap<string, Candidate>;
}

export function useStudyIndex(document: StudyDocument): StudyIndex {
  return useMemo(
    () => ({
      faceById: new Map(document.faces.map((face) => [face.id, face])),
      candidateById: new Map(document.candidates.map((candidate) => [candidate.id, candidate])),
    }),
    [document.faces, document.candidates],
  );
}

export function cssFamily(faceId: string): string {
  let hash = 2_166_136_261;
  for (const character of faceId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return `FontPreviewer_${(hash >>> 0).toString(36)}`;
}

export function fallbackFamily(face: Face): string {
  const label = `${face.family} ${face.style}`.toLocaleLowerCase();
  if (label.includes("mono")) return "ui-monospace, SFMono-Regular, Consolas, monospace";
  if (label.includes("serif") || label.includes("ledger")) return "Iowan Old Style, Georgia, serif";
  if (label.includes("display") || label.includes("vector")) return "Impact, Haettenschweiler, sans-serif";
  return "Inter, Helvetica Neue, Arial, sans-serif";
}

export function candidateFontFamily(
  document: StudyDocument,
  candidate: Candidate,
  state: "loading" | "ready" | "failed" | "unavailable" | undefined,
): string {
  const face = faceForCandidate(document, candidate);
  return state === "ready" ? cssFamily(face.sourceId) : fallbackFamily(face);
}

export type FontState = "loading" | "ready" | "failed" | "unavailable";

export function canPreviewFace(face: Face, source: SourceSummary | undefined, binding: SourceBindingSummary | undefined): boolean {
  if (!binding?.previewUrl || binding.rendererSupport !== "full") return false;
  // Older imports incorrectly stored named variable styles as collection indices.
  // Single-face variable formats can render those retained Candidates from the same Source.
  return face.faceIndex === 0 || (face.axes.length > 0 && /^(?:OTF|TTF|WOFF|WOFF2)$/iu.test(source?.hint.format ?? ""));
}

interface RegisteredFont {
  readonly key: string;
  readonly family: string;
  readonly url: string;
  state: FontState;
  started: boolean;
  font?: FontFace;
}

/** Keeps loaded Sources alive through semantic edits and publishes completed loads once per frame. */
export function createFontRegistry(onChange: (states: ReadonlyMap<string, FontState>) => void) {
  let entries = new Map<string, { readonly state: FontState }>();
  const resources = new Map<string, RegisteredFont>();
  let published: ReadonlyMap<string, FontState> = new Map();
  let frame: number | undefined;
  let disposed = false;
  let loading = 0;
  const publish = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    if (disposed) return;
    const next = new Map([...entries].map(([id, entry]) => [id, entry.state]));
    if (next.size === published.size && [...next].every(([id, state]) => published.get(id) === state)) return;
    published = next;
    onChange(next);
  };
  const schedule = () => {
    if (frame === undefined) frame = requestAnimationFrame(publish);
  };
  const remove = (entry: RegisteredFont) => {
    if (entry.font) document.fonts.delete(entry.font);
  };
  const startPending = () => {
    if (disposed) return;
    for (const entry of resources.values()) {
      if (loading >= 4) break;
      if (entry.started) continue;
      entry.started = true;
      loading += 1;
      try {
        const font = new FontFace(entry.family, `url("${entry.url.replaceAll('"', "%22")}")`);
        void font.load().then((ready) => {
          if (disposed || resources.get(entry.key) !== entry) return;
          document.fonts.add(ready);
          entry.font = ready;
          entry.state = "ready";
          schedule();
        }).catch(() => {
          if (disposed || resources.get(entry.key) !== entry) return;
          entry.state = "failed";
          schedule();
        }).finally(() => {
          loading -= 1;
          startPending();
        });
      } catch {
        loading -= 1;
        entry.state = "failed";
        schedule();
      }
    }
  };

  return {
    update(session: StudySession, activeFaceIds?: ReadonlySet<string>) {
      if (disposed) return;
      const bindings = new Map(session.bindings.map((binding) => [binding.sourceId, binding]));
      const sources = new Map(session.document.sources.map((source) => [source.id, source]));
      const requiredResources = new Set<string>();
      const next = new Map<string, { readonly state: FontState }>();
      for (const face of session.document.faces) {
        if (activeFaceIds && !activeFaceIds.has(face.id)) continue;
        const binding = bindings.get(face.sourceId);
        if (!canPreviewFace(face, sources.get(face.sourceId), binding)) {
          next.set(face.id, { state: "unavailable" });
          continue;
        }
        // Validation reconstructs Faces and Bindings. Their object identity is not a font resource change.
        // Historical variable Faces alias this Source resource while retaining independent Candidate axes.
        const key = JSON.stringify([face.sourceId, binding!.previewUrl, binding!.modifiedAt]);
        let entry = resources.get(key);
        if (!entry) {
          entry = { key, family: cssFamily(face.sourceId), url: binding!.previewUrl!, state: "loading", started: false };
          resources.set(key, entry);
        }
        requiredResources.add(key);
        next.set(face.id, entry);
      }
      entries = next;
      for (const [key, entry] of resources) {
        if (requiredResources.has(key)) continue;
        remove(entry);
        resources.delete(key);
      }
      startPending();
      publish();
    },
    dispose() {
      disposed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      resources.forEach(remove);
      resources.clear();
      entries.clear();
    },
  };
}

export function useFontRegistry(session: StudySession, activeFaceIds?: ReadonlySet<string>): ReadonlyMap<string, FontState> {
  const [states, setStates] = useState<ReadonlyMap<string, FontState>>(() => new Map());
  const registry = useRef<ReturnType<typeof createFontRegistry> | null>(null);
  useEffect(() => {
    registry.current = createFontRegistry(setStates);
    return () => {
      registry.current?.dispose();
      registry.current = null;
    };
  }, []);
  useEffect(() => {
    registry.current?.update(session, activeFaceIds);
  }, [session.bindings, session.document.faces, session.document.sources, activeFaceIds]);
  return states;
}

/** Fit at the displayed tenth-pixel precision, without subpixel layout probes that cannot affect output. */
export function fittedTextSize(minimum: number, maximum: number, fits: (size: number) => boolean): number {
  if (fits(maximum)) return maximum;
  let low = Math.floor(minimum * 10);
  let high = Math.floor(maximum * 10);
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (fits(middle / 10)) low = middle;
    else high = middle;
  }
  return low / 10;
}

export function specimenStyle(
  document: StudyDocument,
  candidate: Candidate,
  recipe: Recipe,
  fontState: "loading" | "ready" | "failed" | "unavailable" | undefined,
  options: { fittedSize?: number; compact?: boolean } = {},
): CSSProperties {
  const face = faceForCandidate(document, candidate);
  const size = options.fittedSize ?? recipe.size;
  return {
    fontFamily: candidateFontFamily(document, candidate, fontState),
    fontSize: `${options.compact ? Math.min(size, 44) : size}px`,
    fontVariationSettings: cssVariationSettings(candidate) || undefined,
    fontFeatureSettings: cssFeatureSettings(candidate) || undefined,
    letterSpacing: `${recipe.tracking}em`,
    lineHeight: recipe.lineHeight,
    textAlign:
      recipe.alignment === "leading"
        ? "left"
        : recipe.alignment === "trailing"
          ? "right"
          : recipe.alignment === "justified"
            ? "justify"
            : recipe.alignment,
    direction: recipe.direction === "auto" ? undefined : recipe.direction,
  };
}

export function specimenCopy(candidate: Candidate, recipe: Recipe, override?: string): string {
  return transformedCopy(override ?? recipe.copy, candidate.casing === "exact" ? recipe.casing : candidate.casing);
}

export function rendererStatusLabel(
  state: "loading" | "ready" | "failed" | "unavailable" | undefined,
): string {
  switch (state) {
    case "ready":
      return "Local Source ready";
    case "loading":
      return "Loading local Source";
    case "failed":
      return "Preview failed · metadata retained";
    default:
      return "Source unavailable · fallback preview";
  }
}
