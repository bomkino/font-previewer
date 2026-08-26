import assert from "node:assert/strict";
import test from "node:test";
import { familyGroupKey, groupByFamily } from "../src/family-groups.js";

test("Family Groups repair common variable-font naming noise without collapsing distinct families", () => {
  const inputs = ["Acme Sans", "Acme-Sans VF", "Acme Sans Variable", "Acme Serif"];
  const groups = groupByFamily(inputs, (family) => family);
  assert.equal(familyGroupKey(" Acme_Sans VF "), "acme sans");
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].items, inputs.slice(0, 3));
  assert.equal(groups[0].confidence, "normalized-metadata");
  assert.equal(groups[1].confidence, "exact-metadata");
});
