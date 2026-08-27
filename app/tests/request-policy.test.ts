import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { rendererRequestAllowed } from "../electron/request-policy.js";

test("renderer request policy permits only bundled Studio, opaque fonts, and explicit local development", () => {
  const root = join("/opt", "font-previewer", "resources", "app", "dist", "renderer");
  assert.equal(rendererRequestAllowed(`file://${root}/index.html`, root), true);
  assert.equal(rendererRequestAllowed(`file://${root}/assets/app.js`, root), true);
  assert.equal(rendererRequestAllowed("file:///etc/passwd", root), false);
  assert.equal(rendererRequestAllowed("https://example.com/font.woff2", root), false);
  assert.equal(rendererRequestAllowed("pitch-font://asset/00000000-0000-4000-8000-000000000000", root), true);
  assert.equal(rendererRequestAllowed("pitch-font://asset/../../etc/passwd", root), false);
  assert.equal(rendererRequestAllowed("http://127.0.0.1:5173/src/main.tsx", root, "http://127.0.0.1:5173"), true);
  assert.equal(rendererRequestAllowed("http://127.0.0.1:5174/src/main.tsx", root, "http://127.0.0.1:5173"), false);
});
