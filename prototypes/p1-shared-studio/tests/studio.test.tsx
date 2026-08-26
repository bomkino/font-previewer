import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App.js";
import type { HostPort } from "../src/protocol.js";

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

const inertHost: HostPort = {
  async request(request) {
    return request.type === "probe"
      ? { type: "probe-result", serial: request.serial, host: "browser" }
      : request.type === "open-import"
        ? { type: "import-result", sources: [] }
        : { type: "ack", action: request.type };
  },
  onMenuCommand() {
    return () => undefined;
  },
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    fontPreviewerHost: inertHost,
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  } as unknown as Window & typeof globalThis,
});

test("shared Studio renders the canonical task surface at its public seam", () => {
  const html = renderToStaticMarkup(<App />);

  assert.match(html, /Study <span>24<\/span>/);
  assert.match(html, /Sources <span>4<\/span>/);
  assert.match(html, /Review/);
  assert.match(html, /Compare/);
  assert.match(html, /System/);
  assert.match(html, /Handoff/);
  assert.match(html, /Import Fonts…/);
  assert.match(html, /Next unreviewed/);
  assert.match(html, /Comparison tray/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-pressed="false"/);
  assert.equal((html.match(/<main/g) ?? []).length, 1);
  assert.equal((html.match(/<aside/g) ?? []).length, 2);
  assert.equal((html.match(/<nav/g) ?? []).length, 1);
  assert.equal((html.match(/<footer/g) ?? []).length, 1);
  assert.doesNotMatch(html, /(?:file:\/\/|\/Users\/|\/home\/)/);
});
