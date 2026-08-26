import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BrowserWindow, Menu } from "electron";
import type { MenuCommand } from "../src/protocol.js";

interface EvidenceOptions {
  readonly window: BrowserWindow;
  readonly outputDirectory: string;
  readonly sendMenuCommand: (command: MenuCommand) => void;
}

async function withTimeout<T>(
  label: string,
  operation: Promise<T>,
  milliseconds = 10_000,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`[p1 evidence] ${label} timed out after ${milliseconds} ms`)),
      milliseconds,
    );
  });
  try {
    return await Promise.race([operation, expired]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function settle(window: BrowserWindow, milliseconds = 80): Promise<void> {
  await withTimeout(
    "renderer settle",
    window.webContents.executeJavaScript(
      `new Promise((resolve) => window.setTimeout(resolve, ${milliseconds}))`,
      true,
    ),
    milliseconds + 5_000,
  );
}

async function capture(window: BrowserWindow, path: string): Promise<void> {
  console.error(`[p1 evidence] capture ${path}`);
  await settle(window);
  const image = await withTimeout("page capture", window.webContents.capturePage());
  await writeFile(path, image.toPNG());
}

async function inspectWorkspace(window: BrowserWindow): Promise<Record<string, unknown>> {
  return withTimeout(
    "workspace inspection",
    window.webContents.executeJavaScript(
      `(() => {
      const selected = document.querySelector('.candidate-row[aria-current="true"]');
      const heading = document.querySelector('#workspace-heading');
      const revision = document.querySelector('.document-title span:last-child');
      const state = document.querySelector('.state-pill');
      return {
        heading: heading?.textContent?.trim() ?? null,
        selected: selected?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
        revision: revision?.textContent?.trim() ?? null,
        reviewState: state?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
        activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
        stage: document.querySelector('.stage-nav [aria-current="page"]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
        storedBytes: localStorage.getItem('font-previewer:p1:study')?.length ?? 0,
      };
      })()`,
      true,
    ),
  );
}

async function collectAccessibilityTree(window: BrowserWindow): Promise<unknown> {
  window.webContents.debugger.attach("1.3");
  try {
    await withTimeout(
      "accessibility enable",
      window.webContents.debugger.sendCommand("Accessibility.enable"),
    );
    return await withTimeout(
      "accessibility tree",
      window.webContents.debugger.sendCommand("Accessibility.getFullAXTree", { depth: 12 }),
      15_000,
    );
  } finally {
    window.webContents.debugger.detach();
  }
}

async function measureBridge(window: BrowserWindow): Promise<readonly number[]> {
  return withTimeout(
    "bridge measurement",
    window.webContents.executeJavaScript(
      `(async () => {
      const values = [];
      for (let serial = 0; serial < 40; serial += 1) {
        const started = performance.now();
        const result = await window.fontPreviewerHost.request({ type: 'probe', serial });
        if (result.type !== 'probe-result' || result.serial !== serial) throw new Error('Probe mismatch');
        values.push(performance.now() - started);
      }
      return values;
      })()`,
      true,
    ),
  );
}

async function measureInput(window: BrowserWindow): Promise<readonly number[]> {
  return withTimeout(
    "input measurement",
    window.webContents.executeJavaScript(
      `(async () => {
      const textarea = document.querySelector('.field-label textarea');
      if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Missing specimen editor');
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setValue) throw new Error('Missing textarea value setter');
      const original = textarea.value;
      const values = [];
      for (let index = 0; index < 20; index += 1) {
        const started = performance.now();
        setValue.call(textarea, original + ' ' + index);
        textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(index), inputType: 'insertText' }));
        await Promise.race([
          new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))),
          new Promise((resolve) => setTimeout(resolve, 50)),
        ]);
        values.push(performance.now() - started);
      }
      setValue.call(textarea, original);
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'historyUndo' }));
      return values;
      })()`,
      true,
    ),
  );
}

function percentile(values: readonly number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return Number(sorted[index].toFixed(3));
}

function summarize(values: readonly number[]): Record<string, number> {
  return {
    samples: values.length,
    minimumMs: Number(Math.min(...values).toFixed(3)),
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maximumMs: Number(Math.max(...values).toFixed(3)),
  };
}

export async function runEvidenceFlow({
  window,
  outputDirectory,
  sendMenuCommand,
}: EvidenceOptions): Promise<void> {
  const output = resolve(outputDirectory);
  console.error(`[p1 evidence] start ${output}`);
  await mkdir(output, { recursive: true });
  await settle(window, 160);

  const trace: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    versions: process.versions,
    initial: await inspectWorkspace(window),
    nativeMenu: {
      installed: Boolean(Menu.getApplicationMenu()),
      undoRolePresent: Menu.getApplicationMenu()?.items
        .flatMap((item) => item.submenu?.items ?? [])
        .some((item) => item.role === "undo"),
      importItemPresent: Boolean(Menu.getApplicationMenu()?.getMenuItemById("p1-import")),
      semanticKeepItemPresent: Boolean(Menu.getApplicationMenu()?.getMenuItemById("p1-mark-keep")),
    },
  };

  await capture(window, join(output, "01-review.png"));

  console.error("[p1 evidence] native menu command");
  sendMenuCommand({ type: "mark-keep" });
  await settle(window);
  trace.afterNativeMenuCommand = await inspectWorkspace(window);

  console.error("[p1 evidence] latency");
  trace.bridgeRoundTrip = summarize(await measureBridge(window));
  trace.inputToFrame = summarize(await measureInput(window));

  console.error("[p1 evidence] edit and undo");
  trace.editAndUndo = await withTimeout(
    "undo preparation",
    window.webContents.executeJavaScript(
      `(() => {
      const textarea = document.querySelector('.field-label textarea');
      if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Missing specimen editor');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      return { before: textarea.value };
      })()`,
      true,
    ),
  );
  window.webContents.insertText(" undo-probe");
  await settle(window);
  const afterInsert = await withTimeout(
    "insert inspection",
    window.webContents.executeJavaScript(
      `document.querySelector('.field-label textarea')?.value ?? null`,
      true,
    ),
  );
  window.webContents.undo();
  await settle(window);
  const afterUndo = await withTimeout(
    "undo inspection",
    window.webContents.executeJavaScript(
      `document.querySelector('.field-label textarea')?.value ?? null`,
      true,
    ),
  );
  trace.editAndUndo = { ...(trace.editAndUndo as object), afterInsert, afterUndo };

  console.error("[p1 evidence] compare task");
  await withTimeout(
    "compare task",
    window.webContents.executeJavaScript(
      `(() => {
      const select = [...document.querySelectorAll('.field-label select')].at(-1);
      if (!(select instanceof HTMLSelectElement)) throw new Error('Missing role selector');
      const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setValue?.call(select, 'display');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const add = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Add to set'));
      add?.click();
      const compare = [...document.querySelectorAll('.stage-nav button')].find((button) => button.textContent?.includes('Compare'));
      compare?.click();
      })()`,
      true,
    ),
  );
  await settle(window);
  trace.compare = await inspectWorkspace(window);
  await capture(window, join(output, "02-compare.png"));

  console.error("[p1 evidence] system task");
  await withTimeout(
    "system task",
    window.webContents.executeJavaScript(
      `[...document.querySelectorAll('.stage-nav button')].find((button) => button.textContent?.includes('System'))?.click()`,
      true,
    ),
  );
  await settle(window);
  trace.focusAfterStageChange = await inspectWorkspace(window);
  await capture(window, join(output, "03-system.png"));

  console.error("[p1 evidence] handoff task");
  await withTimeout(
    "handoff task",
    window.webContents.executeJavaScript(
      `[...document.querySelectorAll('.stage-nav button')].find((button) => button.textContent?.includes('Handoff'))?.click()`,
      true,
    ),
  );
  await settle(window);
  await capture(window, join(output, "04-handoff.png"));

  console.error("[p1 evidence] reload task");
  const beforeReload = await inspectWorkspace(window);
  const reloaded = new Promise<void>((resolveLoad) => window.webContents.once("did-finish-load", () => resolveLoad()));
  const reloadStarted = performance.now();
  const reloadTriggered = await withTimeout<boolean>(
    "reload trigger",
    window.webContents.executeJavaScript(
      `(() => {
        const button = document.querySelector('button[aria-label="Reload Studio"]');
        if (!(button instanceof HTMLButtonElement)) return false;
        button.click();
        return true;
      })()`,
      true,
    ),
  );
  if (!reloadTriggered) throw new Error("[p1 evidence] Reload Studio button is missing");
  await withTimeout("reload navigation", reloaded, 15_000);
  await settle(window, 160);
  const afterReload = await inspectWorkspace(window);
  trace.reload = {
    durationMs: Number((performance.now() - reloadStarted).toFixed(3)),
    before: beforeReload,
    after: afterReload,
  };
  if (
    afterReload.stage !== beforeReload.stage ||
    afterReload.revision !== beforeReload.revision
  ) {
    throw new Error("[p1 evidence] Reload did not preserve stage and revision");
  }
  if (afterReload.activeElement !== "workspace-heading") {
    throw new Error("[p1 evidence] Reload did not restore workspace focus");
  }
  await capture(window, join(output, "05-recovered.png"));

  console.error("[p1 evidence] accessibility tree");
  const accessibilityTree = await collectAccessibilityTree(window);
  await writeFile(
    join(output, "accessibility-tree.json"),
    `${JSON.stringify(accessibilityTree, null, 2)}\n`,
    "utf8",
  );
  await writeFile(join(output, "run.json"), `${JSON.stringify(trace, null, 2)}\n`, "utf8");
  console.error("[p1 evidence] complete");
}
