import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  bindingForSource,
  cssFeatureSettings,
  cssVariationSettings,
  faceForCandidate,
  transformedCopy,
  type Candidate,
  type Face,
  type Recipe,
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

function cssFamily(faceId: string): string {
  let hash = 2_166_136_261;
  for (const character of faceId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return `FontPreviewer_${(hash >>> 0).toString(36)}`;
}

function fallbackFamily(face: Face): string {
  const label = `${face.family} ${face.style}`.toLocaleLowerCase();
  if (label.includes("mono")) return "ui-monospace, SFMono-Regular, Consolas, monospace";
  if (label.includes("serif") || label.includes("ledger")) return "Iowan Old Style, Georgia, serif";
  if (label.includes("display") || label.includes("vector")) return "Impact, Haettenschweiler, sans-serif";
  return "Inter, Helvetica Neue, Arial, sans-serif";
}

export function useFontRegistry(session: StudySession): ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable"> {
  const [states, setStates] = useState<ReadonlyMap<string, "loading" | "ready" | "failed" | "unavailable">>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    const loaded: FontFace[] = [];
    const next = new Map<string, "loading" | "ready" | "failed" | "unavailable">();
    const tasks: Promise<void>[] = [];
    for (const face of session.document.faces) {
      const binding = bindingForSource(session, face.sourceId);
      if (!binding?.previewUrl || binding.rendererSupport !== "full" || face.faceIndex !== 0) {
        next.set(face.id, "unavailable");
        continue;
      }
      next.set(face.id, "loading");
      const font = new FontFace(cssFamily(face.id), `url("${binding.previewUrl.replaceAll('"', "%22")}")`);
      tasks.push(
        font
          .load()
          .then((ready) => {
            if (cancelled) return;
            document.fonts.add(ready);
            loaded.push(ready);
            next.set(face.id, "ready");
            setStates(new Map(next));
          })
          .catch(() => {
            if (cancelled) return;
            next.set(face.id, "failed");
            setStates(new Map(next));
          }),
      );
    }
    setStates(next);
    void Promise.allSettled(tasks);
    return () => {
      cancelled = true;
      loaded.forEach((font) => document.fonts.delete(font));
    };
  }, [session.bindings, session.document.faces]);

  return states;
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
    fontFamily: fontState === "ready" ? cssFamily(face.id) : fallbackFamily(face),
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
