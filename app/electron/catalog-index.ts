import { basename, extname } from "node:path";

export const MAXIMUM_CATALOG_ENTRIES = 10_000;

export interface CatalogIndexEntry {
  readonly path: string;
  readonly searchText: string;
}

export interface CatalogIndex {
  readonly entries: readonly CatalogIndexEntry[];
  readonly truncated: boolean;
}

export interface CatalogPage {
  readonly entries: readonly CatalogIndexEntry[];
  readonly total: number;
  readonly nextCursor?: number;
}

export function normalizeCatalogQuery(value: string): string {
  return value.trim().normalize("NFKD").toLocaleLowerCase();
}

export function buildFontconfigCatalog(
  records: string,
  allowedExtensions: ReadonlySet<string>,
  maximumEntries = MAXIMUM_CATALOG_ENTRIES,
): CatalogIndex {
  const byPath = new Map<string, string>();
  let truncated = false;
  for (const line of records.split("\n")) {
    const [pathValue, family = "", style = ""] = line.split("\u001f");
    const path = pathValue?.trim();
    if (!path || !allowedExtensions.has(extname(path).toLocaleLowerCase())) continue;
    if (!byPath.has(path) && byPath.size >= maximumEntries) {
      truncated = true;
      break;
    }
    const searchable = normalizeCatalogQuery(`${basename(path, extname(path))} ${family} ${style}`);
    byPath.set(path, `${byPath.get(path) ?? ""} ${searchable}`.trim());
  }
  const entries = [...byPath]
    .map(([path, searchText]) => ({ path, searchText }))
    .sort((left, right) => left.searchText.localeCompare(right.searchText) || left.path.localeCompare(right.path));
  return { entries, truncated };
}

export function catalogPage(
  index: readonly CatalogIndexEntry[],
  query: string,
  cursor: number,
  limit: number,
): CatalogPage {
  const normalized = normalizeCatalogQuery(query);
  const matches = normalized ? index.filter((entry) => entry.searchText.includes(normalized)) : index;
  const start = Math.min(Math.max(0, cursor), matches.length);
  const end = Math.min(start + Math.max(0, limit), matches.length);
  return {
    entries: matches.slice(start, end),
    total: matches.length,
    ...(end < matches.length ? { nextCursor: end } : {}),
  };
}
