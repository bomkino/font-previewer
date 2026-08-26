export type FamilyGroupConfidence = "exact-metadata" | "normalized-metadata";

export interface FamilyGroup<T> {
  readonly key: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly confidence: FamilyGroupConfidence;
  readonly items: readonly T[];
}

export function familyGroupKey(family: string): string {
  return family
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/(?:\s|[-_])+(?:variable|vf)$/u, "")
    .replace(/[\s_-]+/gu, " ")
    .trim();
}

export function groupByFamily<T>(items: readonly T[], familyFor: (item: T) => string): readonly FamilyGroup<T>[] {
  const groups = new Map<string, { aliases: string[]; items: T[] }>();
  for (const item of items) {
    const family = familyFor(item).trim() || "Unnamed family";
    const key = familyGroupKey(family) || family.toLocaleLowerCase();
    const group = groups.get(key) ?? { aliases: [], items: [] };
    if (!group.aliases.includes(family)) group.aliases.push(family);
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups]
    .map(([key, group]) => ({
      key,
      label: group.aliases.slice().sort((left, right) => left.length - right.length || left.localeCompare(right))[0],
      aliases: group.aliases,
      confidence: group.aliases.length === 1 ? "exact-metadata" as const : "normalized-metadata" as const,
      items: group.items,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
