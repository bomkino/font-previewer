import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { BoundedProcessError, runBoundedProcess } from "../electron/bounded-process.js";

test("bounded child supervision accepts success and normalizes failures", async () => {
  assert.equal(await runBoundedProcess({
    executable: process.execPath,
    args: ["-e", "process.stdout.write('ok')"],
    timeoutMilliseconds: 1_000,
    maximumOutputBytes: 64,
  }), "ok");

  await assert.rejects(runBoundedProcess({
    executable: process.execPath,
    args: ["-e", "process.exit(17)"],
    timeoutMilliseconds: 1_000,
    maximumOutputBytes: 64,
  }), (error) => error instanceof BoundedProcessError && error.failure === "exit");

  await assert.rejects(runBoundedProcess({
    executable: `${process.execPath}-does-not-exist`,
    args: [],
    timeoutMilliseconds: 1_000,
    maximumOutputBytes: 64,
  }), (error) => error instanceof BoundedProcessError && error.failure === "spawn");
});

test("bounded child supervision kills hangs and rejects oversized output", async () => {
  const started = performance.now();
  await assert.rejects(runBoundedProcess({
    executable: process.execPath,
    args: ["-e", "setInterval(()=>{}, 1000)"],
    timeoutMilliseconds: 100,
    maximumOutputBytes: 64,
  }), (error) => error instanceof BoundedProcessError && error.failure === "timeout");
  assert.ok(performance.now() - started < 2_000);

  await assert.rejects(runBoundedProcess({
    executable: process.execPath,
    args: ["-e", "process.stdout.write('x'.repeat(4096))"],
    timeoutMilliseconds: 1_000,
    maximumOutputBytes: 64,
  }), (error) => error instanceof BoundedProcessError && error.failure === "output");
});
