import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  MAXIMUM_CATALOG_ENTRIES,
  buildFontconfigCatalog,
  catalogPage,
} from "../electron/catalog-index.js";

const FONT_EXTENSIONS = new Set([".otf", ".ttf"]);

test("Catalog indexes and searches a bounded 10,000-entry workload", (context) => {
  const records = Array.from({ length: MAXIMUM_CATALOG_ENTRIES + 50 }, (_, index) => {
    const family = index % 10 === 0 ? `Needlé Sans ${index}` : `Library Family ${index}`;
    return `/fonts/font-${String(index).padStart(5, "0")}.otf\u001f${family}\u001fRegular`;
  }).join("\n");
  const index = buildFontconfigCatalog(records, FONT_EXTENSIONS);
  assert.equal(index.entries.length, MAXIMUM_CATALOG_ENTRIES);
  assert.equal(index.truncated, true);

  for (let warmup = 0; warmup < 10; warmup += 1) catalogPage(index.entries, "needle", 0, 80);
  const samples = Array.from({ length: 100 }, () => {
    const started = performance.now();
    const result = catalogPage(index.entries, "needle", 0, 80);
    const duration = performance.now() - started;
    assert.equal(result.entries.length, 80);
    assert.equal(result.total, 1_000);
    assert.equal(result.nextCursor, 80);
    assert.ok(result.entries.every((entry) => entry.searchText.includes("needle")));
    return duration;
  }).sort((left, right) => left - right);
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  context.diagnostic(`10,000-entry hosted diagnostic: p95 ${p95.toFixed(3)} ms across ${samples.length} warm searches`);
  assert.ok(p95 < 75, `Hosted diagnostic p95 ${p95.toFixed(3)} ms exceeded the provisional 75 ms budget`);

  const finalPage = catalogPage(index.entries, "needle", 960, 80);
  assert.equal(finalPage.entries.length, 40);
  assert.equal(finalPage.nextCursor, undefined);
});

test("Catalog aggregates collection metadata without duplicating a path", () => {
  const index = buildFontconfigCatalog([
    "/fonts/collection.ttc\u001fCollection Sans\u001fRegular",
    "/fonts/collection.ttc\u001fCollection Serif\u001fBold",
    "/fonts/readme.txt\u001fNot a font\u001fRegular",
  ].join("\n"), new Set([".ttc"]));
  assert.equal(index.entries.length, 1);
  assert.match(index.entries[0].searchText, /collection sans regular/);
  assert.match(index.entries[0].searchText, /collection serif bold/);
});
