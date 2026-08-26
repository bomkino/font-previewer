import assert from "node:assert/strict";
import test from "node:test";
import { isHostRequest, isHostResponse, isMenuCommand } from "../src/protocol.js";

test("HostBridge accepts only narrow request envelopes", () => {
  assert.equal(isHostRequest({ type: "open-import" }), true);
  assert.equal(isHostRequest({ type: "probe", serial: 12 }), true);
  assert.equal(isHostRequest({ type: "probe", serial: -1 }), false);
  assert.equal(isHostRequest({ type: "open-import", path: "/private/font.otf" }), false);
  assert.equal(isHostRequest({ type: "read-file", path: "/private/font.otf" }), false);
});

test("HostBridge never accepts path-bearing import responses", () => {
  assert.equal(
    isHostResponse({
      type: "import-result",
      sources: [{ id: "source:opaque", displayName: "Example", state: "available" }],
    }),
    true,
  );
  assert.equal(
    isHostResponse({
      type: "import-result",
      sources: [
        {
          id: "source:opaque",
          displayName: "Example",
          state: "available",
          path: "/private/font.otf",
        },
      ],
    }),
    false,
  );
});

test("native menu commands are runtime validated", () => {
  assert.equal(isMenuCommand({ type: "mark-keep" }), true);
  assert.equal(isMenuCommand({ type: "set-stage", stage: "handoff" }), true);
  assert.equal(isMenuCommand({ type: "set-stage", stage: "inspect" }), false);
  assert.equal(isMenuCommand({ type: "open-import", path: "/tmp/font.otf" }), false);
});
