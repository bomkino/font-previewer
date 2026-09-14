import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { applyStudyCommand, type StudySession } from "../src/domain.js";
import { createFixtureSession } from "../src/fixture.js";
import { canPreviewFace, candidateFontFamily, createFontRegistry, fittedTextSize, type FontState } from "../src/font-runtime.js";

function fontEnvironment(context: TestContext) {
  const frames = new Map<number, FrameRequestCallback>();
  const created: TestFont[] = [];
  const registered = new Set<TestFont>();
  let nextFrame = 1;
  let removed = 0;
  let cleanup = () => {};
  context.after(() => cleanup());
  class TestFont {
    readonly promise: Promise<TestFont>;
    resolve!: (font: TestFont) => void;
    reject!: (error: Error) => void;
    constructor(readonly family: string, readonly source: string) {
      this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
      created.push(this);
    }
    load() { return this.promise; }
  }
  const globals = {
    FontFace: TestFont,
    document: { fonts: {
      add(font: TestFont) { registered.add(font); },
      delete(font: TestFont) { removed += 1; return registered.delete(font); },
    } },
    requestAnimationFrame(callback: FrameRequestCallback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    context.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  return {
    created,
    registered,
    onCleanup(callback: () => void) { cleanup = callback; },
    get removed() { return removed; },
    get queuedFrames() { return frames.size; },
    flush() {
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(0); }
    },
    async settle() { await new Promise((resolve) => setImmediate(resolve)); },
  };
}

function previewSession(): StudySession {
  const session = createFixtureSession();
  return {
    ...session,
    bindings: session.bindings.map((binding, index) => ({
      ...binding,
      previewUrl: `pitch-font://asset/test-${index}`,
      rendererSupport: "full",
    })),
  };
}

test("font resources survive edits and duplicate Candidates; readiness is published once per frame", async (context) => {
  const environment = fontEnvironment(context);
  const snapshots: ReadonlyMap<string, FontState>[] = [];
  const registry = createFontRegistry((states) => snapshots.push(states));
  environment.onCleanup(() => registry.dispose());
  let session = previewSession();
  const availableFaces = session.document.faces.filter((face) => face.faceIndex === 0);
  registry.update(session);
  assert.equal(environment.created.length, availableFaces.length);
  assert.equal(snapshots.length, 1);
  for (const font of environment.created) font.resolve(font);
  await environment.settle();
  assert.equal(environment.queuedFrames, 1);
  assert.equal(snapshots.length, 1);
  environment.flush();
  assert.equal(snapshots.length, 2);
  assert.equal(environment.registered.size, availableFaces.length);

  for (let index = 0; index < 100; index += 1) {
    session = applyStudyCommand(session, {
      type: "edit-candidate", candidateId: session.document.candidates[0]!.id, patch: { notes: `Edit ${index}` },
    });
    registry.update(session);
  }
  session = applyStudyCommand(session, { type: "duplicate-candidate", candidateId: session.document.candidates[0]!.id });
  registry.update(session);
  registry.update({ ...session, bindings: structuredClone(session.bindings) });
  assert.equal(environment.created.length, availableFaces.length, "editing decisions cannot reload font files");
  assert.equal(environment.removed, 0);
  assert.equal(snapshots.length, 2, "unchanged font states cannot rerender every specimen");
  assert.equal(environment.queuedFrames, 0);
  context.diagnostic(`${availableFaces.length} initial font loads, 100 semantic edits and one duplication: 0 reloads, 0 resource removals, 2 total state publications.`);
});

test("font relinks replace only their Sources and stale or disposed loads never register", async (context) => {
  const environment = fontEnvironment(context);
  let states: ReadonlyMap<string, FontState> = new Map();
  const registry = createFontRegistry((next) => { states = next; });
  environment.onCleanup(() => registry.dispose());
  const session = previewSession();
  const changedSource = session.document.faces[0]!.sourceId;
  registry.update(session);
  const originalCount = environment.created.length;
  const obsolete = environment.created[0]!;
  const changed = {
    ...session,
    bindings: session.bindings.map((binding) => binding.sourceId === changedSource ? { ...binding, previewUrl: "pitch-font://asset/relinked" } : binding),
  };
  registry.update(changed);
  assert.equal(environment.created.length, originalCount, "relink waits for an occupied decode slot");
  obsolete.resolve(obsolete);
  await environment.settle();
  assert.equal(environment.created.length, originalCount + 1);
  assert.equal(environment.registered.has(obsolete), false);
  const replacement = environment.created.at(-1)!;
  replacement.resolve(replacement);
  await environment.settle();
  environment.flush();
  assert.equal(states.get(session.document.faces[0]!.id), "ready");
  assert.equal(environment.registered.has(replacement), true);

  registry.update({ ...changed, document: { ...changed.document, faces: changed.document.faces.slice(1) } });
  assert.equal(environment.registered.has(replacement), false);
  assert.equal(states.has(session.document.faces[0]!.id), false);
  registry.dispose();
  for (const font of environment.created) font.resolve(font);
  await environment.settle();
  environment.flush();
  assert.equal(environment.registered.size, 0);
  assert.equal(environment.queuedFrames, 0);
});

test("failed and unsupported previews remain explicit until their capability changes", async (context) => {
  const environment = fontEnvironment(context);
  let states: ReadonlyMap<string, FontState> = new Map();
  const registry = createFontRegistry((next) => { states = next; });
  environment.onCleanup(() => registry.dispose());
  const session = previewSession();
  registry.update(session);
  environment.created[0]!.reject(new Error("font cannot decode"));
  await environment.settle();
  environment.flush();
  const face = session.document.faces[0]!;
  assert.equal(states.get(face.id), "failed");
  assert.ok([...states.values()].includes("unavailable"), "collection faces retain their metadata-only state");
  const count = environment.created.length;
  registry.update(structuredClone(session));
  assert.equal(environment.created.length, count);
  assert.equal(states.get(face.id), "failed");
  registry.update({ ...session, bindings: session.bindings.filter((binding) => binding.sourceId !== face.sourceId) });
  assert.equal(states.get(face.id), "unavailable");
});

test("text fitting uses bounded tenth-pixel probes and never exceeds the fitting threshold", () => {
  for (const maximum of [34, 36, 72, 84, 96]) {
    for (const threshold of [12, 17.31, 29.99, maximum - 0.01, maximum]) {
      let probes = 0;
      const size = fittedTextSize(7, maximum, (value) => { probes += 1; return value <= threshold; });
      assert.ok(size <= threshold);
      assert.ok(Math.min(threshold, maximum) - size < 0.101);
      assert.ok(probes <= 11, `${probes} layout probes exceeded the bounded search`);
      if (threshold >= maximum) assert.equal(probes, 1);
    }
  }
});

test("visible font resources load four at a time and leaving a page evicts its fonts", async (context) => {
  const environment = fontEnvironment(context);
  let states: ReadonlyMap<string, FontState> = new Map();
  const registry = createFontRegistry((next) => { states = next; });
  environment.onCleanup(() => registry.dispose());
  const fixture = previewSession();
  const sources = Array.from({ length: 10 }, (_, index) => ({ ...fixture.document.sources[0]!, id: `source:visible:${index}` }));
  const faces = sources.map((source, index) => ({ ...fixture.document.faces[0]!, id: `face:visible:${index}`, sourceId: source.id }));
  const session = { ...fixture, document: { ...fixture.document, sources, faces }, bindings: sources.map((source, index) => ({
    ...fixture.bindings[0]!, sourceId: source.id, previewUrl: `pitch-font://asset/visible-${index}`,
  })) };
  registry.update(session, new Set(faces.slice(0, 6).map((face) => face.id)));
  assert.equal(environment.created.length, 4);
  assert.equal(states.size, 6);
  // A page change cannot start another burst while obsolete decodes still occupy the four slots.
  registry.update(session, new Set(faces.slice(8).map((face) => face.id)));
  assert.equal(environment.created.length, 4);
  for (const font of environment.created) font.resolve(font);
  await environment.settle();
  assert.equal(environment.created.length, 6);
  assert.equal(environment.registered.size, 0);
  for (const font of environment.created.slice(4)) font.resolve(font);
  await environment.settle();
  environment.flush();
  assert.equal(environment.registered.size, 2);
  assert.deepEqual([...states.keys()], faces.slice(8).map((face) => face.id));
  assert.deepEqual([...states.values()], ["ready", "ready"]);
  registry.update(session, new Set());
  assert.equal(states.size, 0);
  assert.equal(environment.registered.size, 0);
  assert.equal(environment.queuedFrames, 0);
});

test("historical named variable Faces share one Source resource without changing identity or axes", async (context) => {
  const environment = fontEnvironment(context);
  let states: ReadonlyMap<string, FontState> = new Map();
  const registry = createFontRegistry((next) => { states = next; });
  environment.onCleanup(() => registry.dispose());
  const fixture = previewSession();
  const face = fixture.document.faces[0]!;
  const source = fixture.document.sources.find((item) => item.id === face.sourceId)!;
  const binding = fixture.bindings.find((item) => item.sourceId === source.id)!;
  const historical = { ...face, id: "face:historical-variable", faceIndex: 5, style: "Heavy" };
  for (const format of ["OTF", "TTF", "WOFF", "WOFF2", "woff2"]) {
    assert.equal(canPreviewFace(historical, { ...source, hint: { ...source.hint, format } }, binding), true);
  }
  for (const format of ["TTC", "OTC", "DFONT"]) {
    assert.equal(canPreviewFace(historical, { ...source, hint: { ...source.hint, format } }, binding), false);
  }
  assert.equal(canPreviewFace({ ...historical, axes: [] }, source, binding), false);
  assert.equal(canPreviewFace(historical, source, { ...binding, rendererSupport: "metadata-only" }), false);
  const session = { ...fixture, document: { ...fixture.document, faces: [face, historical] } };
  registry.update(session);
  assert.equal(environment.created.length, 1);
  environment.created[0]!.resolve(environment.created[0]!);
  await environment.settle();
  environment.flush();
  assert.deepEqual([...states], [[face.id, "ready"], [historical.id, "ready"]]);
  const candidate = fixture.document.candidates[0]!;
  const duplicate = { ...candidate, id: "candidate:historical", faceId: historical.id, axes: [{ tag: "wght", value: 900 }] };
  assert.equal(candidateFontFamily(session.document, candidate, "ready"), candidateFontFamily(session.document, duplicate, "ready"));
  assert.equal(duplicate.axes[0]!.value, 900);
  registry.update(session, new Set([historical.id]));
  assert.equal(environment.created.length, 1);
  assert.equal(environment.registered.size, 1);
});
