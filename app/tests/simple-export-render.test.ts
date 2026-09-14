import assert from "node:assert/strict";
import test from "node:test";
import { createFixtureSession } from "../src/fixture.js";
import { createSimpleExportRuntime } from "../src/simple-boards.js";

test("Simple export centers index ink, preserves axes, releases fonts, and fits Body Copy once", async (testContext) => {
  const registered = new Set<FontFace>();
  const descriptors: FontFaceDescriptors[] = [];
  const drawings: { copy: string; x: number; y: number; font: string; variation: string; features: string }[] = [];
  const attached = new Set<HTMLCanvasElement>();
  let peakAttached = 0;
  let measurements = 0;
  let peakRegistered = 0;
  let failEncoding = false;
  const context = {
    canvas: undefined as unknown as HTMLCanvasElement,
    font: "",
    fillStyle: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    measureText(copy: string) {
      assert.ok(attached.has(this.canvas), "WebKit needs a connected canvas to inherit font variation settings");
      measurements += 1;
      const size = Number(/([\d.]+)px/u.exec(this.font)?.[1] ?? 12);
      return { width: copy.length * size * 0.5, actualBoundingBoxLeft: 8, actualBoundingBoxRight: copy.length * size * 0.5 - 2, actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 };
    },
    fillText(copy: string, x: number, y: number) { drawings.push({ copy, x, y, font: this.font, variation: this.canvas.style.fontVariationSettings, features: this.canvas.style.fontFeatureSettings }); },
  };
  const canvases: { width: number; height: number }[] = [];
  const globals = {
    document: {
      body: { append(canvas: HTMLCanvasElement) { attached.add(canvas); peakAttached = Math.max(peakAttached, attached.size); } },
      fonts: { ready: Promise.resolve(), add(font: FontFace) { registered.add(font); peakRegistered = Math.max(peakRegistered, registered.size); }, delete: (font: FontFace) => registered.delete(font) },
      createElement() {
        const canvas = {
          width: 0, height: 0,
          style: { cssText: "", fontVariationSettings: "", fontFeatureSettings: "" },
          setAttribute() {},
          remove() { attached.delete(canvas as unknown as HTMLCanvasElement); },
          getContext() { context.canvas = canvas as unknown as HTMLCanvasElement; return context; },
          toDataURL() { if (failEncoding) throw new Error("PNG encoding failed"); return "data:image/png;base64,proof"; },
        };
        canvases.push(canvas);
        return canvas;
      },
    },
    FontFace: class {
      constructor(readonly family: string, _source: string, descriptor: FontFaceDescriptors) { descriptors.push(descriptor); }
      async load() { return this; }
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    testContext.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }

  const fixture = createFixtureSession();
  const original = fixture.document.candidates[0]!;
  const candidates = Array.from({ length: 12 }, (_,index) => ({ ...original, id: `export:${index}`, reviewState: "keep" as const,
    axes: [{ tag: "wght", value: 500 }, { tag: "wdth", value: index % 2 ? 100 : 87.5 }, { tag: "ital", value: 1 }],
  }));
  const session = { ...fixture, document: { ...fixture.document, candidates }, workspace: { ...fixture.workspace, copyOverride: "Agjy" },
    bindings: [{ ...fixture.bindings[0]!, previewUrl: "pitch-font://asset/export-proof" }],
  };
  const runtime = createSimpleExportRuntime(session, false, true);
  await runtime.render("index", 0);
  assert.equal(descriptors.length, 2, "identical instances share one temporary face per page");
  assert.ok(descriptors.some((descriptor) => /['"]wdth['"] 87\.5/u.test(descriptor.variationSettings ?? "")));
  assert.ok(descriptors.every((descriptor) => /['"]ital['"] 1/u.test(descriptor.variationSettings ?? "")));
  const specimens = drawings.filter((drawing) => drawing.copy === "Agjy");
  assert.equal(specimens.length, 12);
  for (const [slot, drawing] of specimens.entries()) {
    assert.match(drawing.variation, slot % 2 ? /['"]wdth['"] 100/u : /['"]wdth['"] 87\.5/u);
    const size = Number(/([\d.]+)px/u.exec(drawing.font)![1]);
    const left = drawing.x - 8;
    const right = drawing.x + 4 * size * 0.5 - 2;
    const top = drawing.y - size * 0.8;
    const bottom = drawing.y + size * 0.2;
    assert.ok(Math.abs((left + right) / 2 - ((slot % 4) * 1_288 + 644)) < 0.001);
    assert.ok(Math.abs((top + bottom) / 2 - (Math.floor(slot / 4) * 720 + 360)) < 0.001);
  }
  assert.equal(registered.size, 0);
  assert.equal(attached.size, 0);
  assert.ok(drawings.filter((drawing) => drawing.copy !== "Agjy").every((drawing) => drawing.variation === "normal" && drawing.features === "normal"), "Candidate settings must not leak into page labels");
  assert.deepEqual(canvases.map(({ width, height }) => [width, height]), [[1, 1]]);

  const body = createSimpleExportRuntime(session, false, false, "fit", "body");
  measurements = 0;
  peakRegistered = 0;
  await body.render("body", 0);
  const firstPageMeasurements = measurements;
  measurements = 0;
  await body.render("body", 1);
  assert.ok(firstPageMeasurements > measurements * 10, "later body pages must reuse the shared fit instead of refitting the full set");
  assert.equal(registered.size, 0);
  assert.equal(peakRegistered, 1, "fitting large body sets must keep only one temporary font resident");

  failEncoding = true;
  await assert.rejects(runtime.render("index", 0), /PNG encoding failed/u);
  assert.equal(registered.size, 0, "encoding failures release every temporary font");
  assert.equal(attached.size, 0, "success and failure remove connected export canvases");
  assert.equal(peakAttached, 1, "only one export canvas is attached at a time");
  assert.ok(canvases.every((canvas) => canvas.width === 1 && canvas.height === 1), "success and failure release full-resolution canvas backing stores");
});
