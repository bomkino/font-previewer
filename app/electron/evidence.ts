import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BrowserWindow, Menu } from "electron";
import type { MenuCommand } from "../src/protocol.js";

interface EvidenceOptions {
  readonly window: BrowserWindow;
  readonly outputDirectory: string;
  readonly sendMenuCommand: (command: MenuCommand) => void;
  readonly verifyDurability?: () => Promise<Record<string, unknown>>;
  readonly exportHandoff?: () => Promise<Record<string, unknown>>;
}

async function withTimeout<T>(label: string, operation: Promise<T>, milliseconds = 15_000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds} ms`)), milliseconds);
  });
  try {
    return await Promise.race([operation, expired]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function settle(window: BrowserWindow, milliseconds = 100): Promise<void> {
  await withTimeout("renderer settle", window.webContents.executeJavaScript(`new Promise((resolve) => setTimeout(resolve, ${milliseconds}))`, true), milliseconds + 5_000);
}

async function waitFor(window: BrowserWindow, label: string, expression: string, milliseconds = 15_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < milliseconds) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`, true) as boolean) return;
    await settle(window, 80);
  }
  throw new Error(`${label} did not become true within ${milliseconds} ms`);
}

async function loadInterfaceFonts(window: BrowserWindow): Promise<Record<string, unknown>> {
  const result = await withTimeout("interface font readiness", window.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    const specs = [
      '400 16px "PD Body"',
      'italic 400 16px "PD Body"',
      '500 48px "PD Head"',
      '500 12px "PD Eyebrow"',
    ];
    const loaded = [];
    for (const spec of specs) {
      const faces = await document.fonts.load(spec, 'Hamburgefontsiv');
      if (!faces.length || faces.some((face) => face.status !== 'loaded')) throw new Error('UI font not loaded: ' + spec);
      loaded.push({ spec, faces: faces.length });
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { status: document.fonts.status, loaded };
  })()`, true), 20_000) as Record<string, unknown>;
  if (result.status !== "loaded") throw new Error("Interface fonts did not reach the loaded state.");
  return result;
}

async function capture(window: BrowserWindow, outputPath: string): Promise<void> {
  await settle(window, 140);
  const image = await withTimeout("page capture", window.webContents.capturePage());
  await writeFile(outputPath, image.toPNG(), { mode: 0o600 });
}

async function inspectWorkspace(window: BrowserWindow): Promise<Record<string, unknown>> {
  return withTimeout("workspace inspection", window.webContents.executeJavaScript(`(() => {
    const selected = document.querySelector('.candidate-row[aria-current="true"]');
    return {
      heading: document.querySelector('#workspace-heading')?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
      selected: selected?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
      reviewState: selected?.dataset.reviewState?.replace(/^./, (character) => character.toUpperCase()) ?? null,
      stage: document.querySelector('.stage-nav [aria-current="step"]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
      durability: document.querySelector('.document-title > span:last-child')?.textContent?.trim() ?? null,
      recoveryCheckpoint: document.querySelector('.app-shell')?.dataset.recoveryCheckpoint ?? null,
      activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
      host: document.querySelector('.host-probe')?.textContent?.trim() ?? null,
      candidates: document.querySelectorAll('.candidate-row').length,
      sources: document.querySelectorAll('.source-row').length,
    };
  })()`, true));
}

async function clickStage(window: BrowserWindow, stage: "Review" | "Compare" | "System" | "Handoff"): Promise<void> {
  await window.webContents.executeJavaScript(`(() => {
    const button = [...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes(${JSON.stringify(stage)}));
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing ${stage} stage');
    button.click();
  })()`, true);
  await waitFor(window, `${stage} stage`, `document.querySelector('.stage-nav [aria-current="step"]')?.textContent?.includes(${JSON.stringify(stage)})`);
}

async function collectAccessibilityTree(window: BrowserWindow): Promise<unknown> {
  window.webContents.debugger.attach("1.3");
  try {
    await withTimeout("accessibility enable", window.webContents.debugger.sendCommand("Accessibility.enable"));
    return await withTimeout("accessibility tree", window.webContents.debugger.sendCommand("Accessibility.getFullAXTree", { depth: 16 }), 20_000);
  } finally {
    window.webContents.debugger.detach();
  }
}

function percentile(values: readonly number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)].toFixed(3));
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

async function measureBridge(window: BrowserWindow): Promise<Record<string, number>> {
  const values = await withTimeout("bridge latency", window.webContents.executeJavaScript(`(async () => {
    const values = [];
    for (let serial = 0; serial < 50; serial += 1) {
      const started = performance.now();
      const response = await window.fontPreviewerHost.request({ type: 'probe', serial });
      if (response.type !== 'probe-result' || response.serial !== serial || response.host !== 'electron') throw new Error('Probe mismatch');
      values.push(performance.now() - started);
    }
    return values;
  })()`, true)) as number[];
  return summarize(values);
}

async function measureInput(window: BrowserWindow): Promise<Record<string, number>> {
  const values = await withTimeout("input latency", window.webContents.executeJavaScript(`(async () => {
    const input = document.querySelector('.catalog-tools input[type="search"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Missing Candidate search');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('Missing input setter');
    const values = [];
    for (let index = 0; index < 30; index += 1) {
      const started = performance.now();
      setter.call(input, index % 2 ? '' : 'sans');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 's' }));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      values.push(performance.now() - started);
    }
    setter.call(input, '');
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
    return values;
  })()`, true)) as number[];
  return summarize(values);
}

async function semanticAudit(window: BrowserWindow): Promise<Record<string, unknown>> {
  return withTimeout("semantic audit", window.webContents.executeJavaScript(`(() => {
    const controls = [...document.querySelectorAll('button,input,select,textarea')];
    const roleLabel = [...document.querySelectorAll('.field-label')].find((label) => label.querySelector(':scope > span')?.textContent?.trim() === 'Role');
    const roleSelect = roleLabel?.querySelector('select');
    const roleHelp = roleLabel?.querySelector(':scope > small');
    const roleSelectRect = roleSelect?.getBoundingClientRect();
    const roleHelpRect = roleHelp?.getBoundingClientRect();
    const name = (control) => {
      const aria = control.getAttribute('aria-label') || control.getAttribute('aria-labelledby');
      if (aria) return aria;
      if (control.id) {
        const label = document.querySelector('label[for="' + CSS.escape(control.id) + '"]');
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      const wrapping = control.closest('label');
      return wrapping?.textContent?.trim() || control.textContent?.trim() || '';
    };
    const unnamed = controls.filter((control) => !name(control)).map((control) => control.outerHTML.slice(0, 160));
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const measuredControls = controls.filter((control) => {
      if (!visible(control)) return false;
      if (control instanceof HTMLInputElement && ['checkbox', 'radio', 'range'].includes(control.type)) return false;
      return true;
    });
    const iconOnlyButtons = controls.filter((control) => {
      if (!(control instanceof HTMLButtonElement) || !visible(control)) return false;
      return Boolean(control.querySelector(':scope > .interface-icon')) && !control.textContent?.trim();
    });
    const iconCenterDeltas = iconOnlyButtons.map((button) => {
      const icon = button.querySelector(':scope > .interface-icon');
      const buttonRect = button.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      return {
        label: name(button),
        x: Math.abs((buttonRect.left + buttonRect.width / 2) - (iconRect.left + iconRect.width / 2)),
        y: Math.abs((buttonRect.top + buttonRect.height / 2) - (iconRect.top + iconRect.height / 2)),
      };
    });
    const selectCaretDeltas = [...document.querySelectorAll('.select-control')].filter(visible).map((shell) => {
      const select = shell.querySelector('select');
      const caret = shell.querySelector(':scope > .interface-icon-caret-down');
      const selectRect = select?.getBoundingClientRect();
      const caretRect = caret?.getBoundingClientRect();
      return {
        complete: Boolean(selectRect && caretRect),
        y: selectRect && caretRect ? Math.abs((selectRect.top + selectRect.height / 2) - (caretRect.top + caretRect.height / 2)) : 999,
        trailingSpace: selectRect && caretRect ? selectRect.right - caretRect.right : 0,
      };
    });
    const panelElements = ['.catalog', '.workspace', '.inspector'].map((selector) => document.querySelector(selector));
    const panelRects = panelElements.map((element) => element?.getBoundingClientRect()).filter(Boolean);
    const trayRect = document.querySelector('.tray')?.getBoundingClientRect();
    const panelTopSpread = panelRects.length ? Math.max(...panelRects.map((rect) => rect.top)) - Math.min(...panelRects.map((rect) => rect.top)) : 999;
    const panelBottomSpread = panelRects.length ? Math.max(...panelRects.map((rect) => rect.bottom)) - Math.min(...panelRects.map((rect) => rect.bottom)) : 999;
    const panelTrayGap = trayRect && panelRects.length ? Math.max(...panelRects.map((rect) => Math.abs(rect.bottom - trayRect.top))) : 999;
    const horizontalOverflows = [...document.querySelectorAll('.catalog,.workspace,.inspector')]
      .filter(visible)
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.className);
    return {
      controls: controls.length,
      unnamed,
      landmarks: {
        main: document.querySelectorAll('main').length,
        navigation: document.querySelectorAll('nav').length,
        complementary: document.querySelectorAll('aside').length,
        contentinfo: document.querySelectorAll('footer').length,
      },
      duplicateIds: [...document.querySelectorAll('[id]')].map((item) => item.id).filter((id, index, ids) => ids.indexOf(id) !== index),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      roleHelpSeparated: Boolean(roleSelectRect && roleHelpRect && roleSelectRect.bottom <= roleHelpRect.top),
      layout: {
        minControlHeight: measuredControls.length ? Math.min(...measuredControls.map((control) => control.getBoundingClientRect().height)) : 0,
        iconOnlyButtons: iconCenterDeltas.length,
        iconCentersAligned: iconCenterDeltas.every((delta) => delta.x <= 1 && delta.y <= 1),
        selectCarets: selectCaretDeltas.length,
        selectCaretsComplete: selectCaretDeltas.length > 0 && selectCaretDeltas.every((caret) => caret.complete),
        selectCaretsCentered: selectCaretDeltas.length > 0 && selectCaretDeltas.every((caret) => caret.y <= 1),
        selectCaretInset: selectCaretDeltas.length ? Math.min(...selectCaretDeltas.map((caret) => caret.trailingSpace)) : 0,
        panelTopSpread,
        panelBottomSpread,
        panelTrayGap,
        horizontalOverflows,
      },
    };
  })()`, true));
}

async function disclosureMotionAudit(window: BrowserWindow): Promise<Record<string, unknown>> {
  return withTimeout("disclosure motion audit", window.webContents.executeJavaScript(`(async () => {
    const disclosure = document.querySelector('.inspector-details');
    const trigger = disclosure?.querySelector('.inspector-disclosure-trigger');
    const content = disclosure?.querySelector('.inspector-details-content');
    const caret = trigger?.querySelector('.interface-icon-caret-right');
    if (!(disclosure instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement) || !(content instanceof HTMLElement) || !(caret instanceof SVGElement)) throw new Error('Missing disclosure motion surface');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settleFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const measure = () => ({
      height: disclosure.getBoundingClientRect().height,
      expanded: trigger.getAttribute('aria-expanded') === 'true',
      inert: content.inert,
      hidden: content.getAttribute('aria-hidden') === 'true',
      caret: getComputedStyle(caret).transform,
    });
    const collapsed = measure();
    trigger.click();
    await settleFrames();
    await wait(60);
    const opening = measure();
    await wait(180);
    const expanded = measure();
    trigger.click();
    await settleFrames();
    await wait(60);
    const closing = measure();
    await wait(180);
    const closed = measure();
    const openIntermediate = reducedMotion || (opening.height > collapsed.height + 1 && opening.height < expanded.height - 1);
    const closeIntermediate = reducedMotion || (closing.height < expanded.height - 1 && closing.height > closed.height + 1);
    return {
      reducedMotion,
      expanded: expanded.height > collapsed.height + 20 && expanded.expanded && !expanded.inert && !expanded.hidden,
      collapsed: Math.abs(closed.height - collapsed.height) <= 1 && !closed.expanded && closed.inert && closed.hidden,
      openIntermediate,
      closeIntermediate,
      caretRotates: expanded.caret !== collapsed.caret && closed.caret === collapsed.caret,
      transitionDuration: getComputedStyle(content).transitionDuration,
      samples: { collapsed, opening, expanded, closing, closed },
    };
  })()`, true), 10_000);
}

async function keyboardAccessibilityAudit(window: BrowserWindow, sendMenuCommand: (command: MenuCommand) => void): Promise<Record<string, unknown>> {
  await window.webContents.executeJavaScript(`(() => {
    const trigger = document.querySelector('#import-fonts-button');
    if (!(trigger instanceof HTMLButtonElement)) throw new Error('Missing modal return target');
    trigger.focus();
  })()`, true);
  sendMenuCommand({ type: "new-study" });
  await waitFor(window, "New Study dialog", `document.querySelector('.new-study-dialog') && document.activeElement?.closest('.new-study-dialog')`);
  const trap = await window.webContents.executeJavaScript(`(() => {
    const dialog = document.querySelector('.new-study-dialog');
    if (!(dialog instanceof HTMLElement)) throw new Error('Missing New Study dialog');
    const focusable = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) throw new Error('Dialog has no focus path');
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    const forwardWrap = document.activeElement === first;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    return { forwardWrap, backwardWrap: document.activeElement === last };
  })()`, true) as Record<string, unknown>;
  await window.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))`, true);
  await waitFor(window, "New Study close", `!document.querySelector('.new-study-dialog') && document.activeElement?.id === 'import-fonts-button'`);
  const collision = await window.webContents.executeJavaScript(`(async () => {
    const stage = document.querySelector('.stage-nav [aria-current="step"]');
    if (!(stage instanceof HTMLButtonElement)) throw new Error('Missing active stage');
    const beforeCandidate = document.querySelector('.candidate-row[aria-current="true"]')?.textContent;
    const beforeTray = document.querySelectorAll('.tray-item').length;
    stage.focus();
    stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    stage.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    return {
      candidateUnchanged: beforeCandidate === document.querySelector('.candidate-row[aria-current="true"]')?.textContent,
      trayUnchanged: beforeTray === document.querySelectorAll('.tray-item').length,
      returnFocus: document.activeElement === stage,
    };
  })()`, true) as Record<string, unknown>;
  return { ...trap, ...collision };
}

async function securityAudit(window: BrowserWindow): Promise<Record<string, unknown>> {
  return withTimeout("security audit", window.webContents.executeJavaScript(`(async () => {
    const invalid = [
      { type: 'open-import', path: '/private/font.otf' },
      { type: 'probe', serial: -1 },
      { type: 'read-file', path: '/etc/passwd' },
      { type: 'export-handoff', path: '/tmp' },
      { type: 'scan-installed' },
      { type: 'scan-installed', query: '', cursor: 0, limit: 10000, refresh: false },
    ];
    let rejected = 0;
    for (const request of invalid) {
      try { await window.fontPreviewerHost.request(request); } catch { rejected += 1; }
    }
    return {
      invalidRequests: invalid.length,
      rejected,
      popupDenied: window.open('https://example.com') === null,
      nodeUnavailable: typeof window.require === 'undefined' && typeof window.process === 'undefined',
      hostKeys: Object.keys(window.fontPreviewerHost).sort(),
    };
  })()`, true));
}

async function installedCatalogAudit(window: BrowserWindow): Promise<Record<string, unknown>> {
  return withTimeout("installed font catalog", window.webContents.executeJavaScript(`(async () => {
    const studyCount = () => Number([...document.querySelectorAll('.catalog-switcher button')].find((item) => item.textContent?.trim().startsWith('Study'))?.querySelector('span')?.textContent ?? -1);
    const beforeStudy = studyCount();
    [...document.querySelectorAll('.catalog-switcher button')].find((item) => item.textContent?.trim().startsWith('Catalog'))?.click();
    const deadline = performance.now() + 30000;
    while (!document.querySelector('.catalog-results .catalog-source') && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    const afterStudy = studyCount();
    const response = await window.fontPreviewerHost.request({ type: 'scan-installed', query: '', cursor: 0, limit: 40, refresh: false });
    if (response.type !== 'catalog-result') throw new Error('Installed catalog returned the wrong response');
    const serialized = JSON.stringify(response);
    const preview = response.imports.find((item) => item.binding.previewUrl)?.binding.previewUrl;
    let fontLoaded = false;
    if (preview) {
      const face = new FontFace('Font Previewer Evidence', 'url("' + preview + '")');
      await face.load();
      fontLoaded = face.status === 'loaded';
    }
    const obsolete = window.fontPreviewerHost.request({ type: 'scan-installed', query: '', cursor: 0, limit: 200, refresh: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const cancelStarted = performance.now();
    const cancelAck = await window.fontPreviewerHost.request({ type: 'cancel-catalog' });
    const cancelDurationMs = performance.now() - cancelStarted;
    const obsoleteResult = await obsolete;
    return {
      count: response.imports.length,
      indexed: response.indexed,
      total: response.total,
      rejected: response.rejected,
      truncated: response.truncated,
      pageBounded: response.imports.length <= 40,
      studyUnchanged: beforeStudy >= 0 && beforeStudy === afterStudy,
      rendered: document.querySelectorAll('.catalog-results .catalog-source').length,
      pathLeak: serialized.includes('file://') || serialized.includes('/home/') || serialized.includes('/Users/') || /[A-Za-z]:\\\\/.test(serialized),
      opaquePreviewUrls: response.imports.every((item) => !item.binding.previewUrl || item.binding.previewUrl.startsWith('pitch-font://asset/')),
      previewAvailable: Boolean(preview),
      fontLoaded,
      cancellation: {
        acknowledged: cancelAck.type === 'ack' && cancelAck.action === 'cancel-catalog',
        durationMs: cancelDurationMs,
        obsoleteResultCancelled: obsoleteResult.type === 'catalog-result' && obsoleteResult.cancelled === true,
      },
    };
  })()`, true), 60_000);
}

async function simpleBodyCopyAudit(window: BrowserWindow, output: string): Promise<Record<string, unknown>> {
  await window.webContents.executeJavaScript(`(async () => {
    [...document.querySelectorAll('.interface-switch button')].find((item) => item.textContent?.trim() === 'Simple')?.click();
    const deadline = performance.now() + 10000;
    while (!document.querySelector('.simple-page-mode-choices') && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
    [...document.querySelectorAll('.simple-page-mode-choices button')].find((item) => item.textContent?.includes('Body Copy'))?.click();
    while (!document.querySelector('.simple-body-page-list') && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
    [...document.querySelectorAll('.simple-body-samples button')][1]?.click();
    while (
      (!document.querySelector('.simple-body-reading-copy')?.textContent?.startsWith('The workshop is quiet')
        || [...document.querySelectorAll('.simple-body-reading-copy')].some((item) => !item.dataset.naturalFit))
      && performance.now() < deadline
    ) await new Promise((resolve) => setTimeout(resolve, 25));
    document.querySelector('.simple-body-page-wrap')?.scrollIntoView({ block: 'start' });
    await new Promise((resolve) => setTimeout(resolve, 80));
  })()`, true);
  await capture(window, join(output, "07-simple-body-copy.png"));
  const metrics = await withTimeout("Simple Body Copy audit", window.webContents.executeJavaScript(`(() => {
    const pages = [...document.querySelectorAll('.simple-body-page-wrap')];
    const copies = pages.map((page) => page.querySelector('.simple-body-reading-copy'));
    const frames = pages.map((page) => page.querySelector('.simple-body-reading'));
    const expected = document.querySelector('#simple-body-copy')?.value ?? '';
    const sizes = copies.map((item) => Number.parseFloat(getComputedStyle(item).fontSize));
    const manifest = window.__fontPreviewerSimpleExport?.manifest();
    const touch = [...document.querySelectorAll('.simple-page-mode-choices button,.simple-body-samples button')]
      .map((item) => item.getBoundingClientRect().height)
      .filter((value) => value > 0);
    return {
      pageCount: pages.length,
      sampleCount: document.querySelectorAll('.simple-body-samples button').length,
      fullText: copies.every((item) => item?.textContent === expected),
      twoParagraphs: expected.includes('\\n\\n') && copies.every((item) => item?.textContent?.includes('\\n\\n')),
      sharedSize: sizes.length === pages.length && new Set(sizes.map((value) => value.toFixed(3))).size === 1,
      withinFrames: copies.every((item, index) => {
        const copy = item?.getBoundingClientRect();
        const frame = frames[index]?.getBoundingClientRect();
        return Boolean(copy && frame && copy.left >= frame.left - 1 && copy.right <= frame.right + 1 && copy.top >= frame.top - 1 && copy.bottom <= frame.bottom + 1);
      }),
      noEllipsis: copies.every((item) => getComputedStyle(item).textOverflow !== 'ellipsis'),
      minTouchHeight: Math.min(...touch),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      manifest,
    };
  })()`, true)) as Record<string, unknown>;
  await window.webContents.executeJavaScript(`[...document.querySelectorAll('.interface-switch button')].find((item) => item.textContent?.trim() === 'Studio')?.click()`, true);
  await waitFor(window, "Body Copy shared with Studio", `document.querySelector('.stage-nav') && document.querySelector('.specimen-select p')?.textContent?.startsWith('The workshop is quiet in the useful way')`);
  return { ...metrics, studioShared: true };
}

async function checksumEvidence(output: string): Promise<void> {
  const files = (await readdir(output, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name !== "checksums.sha256")
    .map((entry) => join(entry.parentPath.slice(output.length + 1), entry.name))
    .sort();
  const lines: string[] = [];
  for (const relativePath of files) {
    const digest = createHash("sha256").update(await readFile(join(output, relativePath))).digest("hex");
    lines.push(`${digest}  ${relativePath}`);
  }
  await writeFile(join(output, "checksums.sha256"), `${lines.join("\n")}\n`, { mode: 0o600 });
}

export async function runEvidenceFlow(options: EvidenceOptions): Promise<void> {
  const output = resolve(options.outputDirectory);
  await mkdir(output, { recursive: true, mode: 0o700 });
  await waitFor(options.window, "Studio bootstrap", `window.fontPreviewerHost && document.querySelector('#workspace-heading') && document.querySelector('.host-probe')?.textContent?.includes('electron')`, 25_000);
  await waitFor(options.window, "brand mark", `document.querySelector('.brand-mark')?.complete && document.querySelector('.brand-mark')?.naturalWidth > 0`);
  const interfaceFonts = await loadInterfaceFonts(options.window);
  await settle(options.window, 180);

  const trace: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    versions: process.versions,
    initial: await inspectWorkspace(options.window),
    interfaceFonts,
    nativeMenu: {
      installed: Boolean(Menu.getApplicationMenu()),
      import: Boolean(Menu.getApplicationMenu()?.getMenuItemById("font-previewer-import")),
      undo: Boolean(Menu.getApplicationMenu()?.getMenuItemById("font-previewer-undo")),
      semanticKeep: Boolean(Menu.getApplicationMenu()?.getMenuItemById("font-previewer-keep")),
    },
  };

  await capture(options.window, join(output, "01-review.png"));
  trace.keyboardAccessibility = await keyboardAccessibilityAudit(options.window, options.sendMenuCommand);
  options.sendMenuCommand({ type: "mark-keep" });
  await waitFor(options.window, "native Keep command", `document.querySelector('.candidate-row[aria-current="true"]')?.dataset.reviewState === 'keep'`);
  trace.afterNativeKeep = await inspectWorkspace(options.window);
  options.sendMenuCommand({ type: "undo-study" });
  await waitFor(options.window, "native semantic undo", `document.querySelector('.candidate-row[aria-current="true"]')?.dataset.reviewState === 'unreviewed'`);
  options.sendMenuCommand({ type: "redo-study" });
  await waitFor(options.window, "native semantic redo", `document.querySelector('.candidate-row[aria-current="true"]')?.dataset.reviewState === 'keep'`);
  trace.afterUndoRedo = await inspectWorkspace(options.window);

  trace.bridgeRoundTrip = await measureBridge(options.window);
  trace.inputToFrame = await measureInput(options.window);

  await clickStage(options.window, "Compare");
  trace.compare = await inspectWorkspace(options.window);
  await capture(options.window, join(output, "02-compare.png"));

  await clickStage(options.window, "System");
  trace.system = await inspectWorkspace(options.window);
  await capture(options.window, join(output, "03-system.png"));

  await clickStage(options.window, "Review");
  await options.window.webContents.executeJavaScript(`(() => {
    const role = [...document.querySelectorAll('.field-label')].find((label) => label.querySelector(':scope > span')?.textContent?.trim() === 'Role')?.querySelector('select');
    if (!(role instanceof HTMLSelectElement)) throw new Error('Missing Role control');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(role, 'display');
    role.dispatchEvent(new Event('change', { bubbles: true }));
  })()`, true);
  await clickStage(options.window, "Handoff");
  await waitFor(options.window, "Handoff preflight", `document.querySelector('.handoff-workspace') && !document.querySelector('.handoff-workspace .primary-button')?.disabled`);
  trace.handoff = await inspectWorkspace(options.window);
  await capture(options.window, join(output, "04-handoff.png"));
  await clickStage(options.window, "Review");
  await waitFor(options.window, "Review semantics", `document.querySelector('.candidate-row[aria-current="true"]')?.dataset.reviewState === 'keep'`);
  trace.semanticAudit = await semanticAudit(options.window);
  trace.disclosureMotion = await disclosureMotionAudit(options.window);
  trace.simpleBodyCopy = await simpleBodyCopyAudit(options.window, output);
  trace.securityAudit = await securityAudit(options.window);
  trace.installedCatalog = await installedCatalogAudit(options.window);
  await capture(options.window, join(output, "06-catalog.png"));
  await clickStage(options.window, "Handoff");
  await waitFor(options.window, "restored Handoff preflight", `document.querySelector('.handoff-workspace') && !document.querySelector('.handoff-workspace .primary-button')?.disabled`);

  await waitFor(options.window, "durable recovery", `document.querySelector('.app-shell')?.dataset.recoveryCheckpoint === 'ready'`, 20_000);
  if (options.verifyDurability) trace.durabilityArtifact = await options.verifyDurability();
  if (options.exportHandoff) trace.transactionalHandoff = await options.exportHandoff();
  await waitFor(options.window, "post-export Handoff restoration", `document.querySelector('.stage-nav [aria-current="step"]')?.textContent?.includes('Handoff') && document.querySelector('.handoff-workspace')`, 20_000);
  await waitFor(options.window, "post-export workspace recovery", `document.querySelector('.app-shell')?.dataset.recoveryCheckpoint === 'ready'`, 20_000);

  const beforeCrash = await inspectWorkspace(options.window);
  await writeFile(join(output, "renderer-crash-before.json"), `${JSON.stringify(beforeCrash, null, 2)}\n`, { mode: 0o600 });
  const crashGone = new Promise<Record<string, unknown>>((resolveGone) => options.window.webContents.once("render-process-gone", (_event, details) => resolveGone({ reason: details.reason, exitCode: details.exitCode })));
  const crashReloaded = new Promise<void>((resolveLoaded) => options.window.webContents.once("did-finish-load", () => resolveLoaded()));
  options.window.webContents.forcefullyCrashRenderer();
  const crashDetails = await withTimeout("forced renderer termination", crashGone, 20_000);
  await writeFile(join(output, "renderer-crash-gone.json"), `${JSON.stringify(crashDetails, null, 2)}\n`, { mode: 0o600 });
  await withTimeout("forced renderer crash recovery", crashReloaded, 20_000);
  await settle(options.window, 750);
  const crashLoad = await inspectWorkspace(options.window);
  await writeFile(join(output, "renderer-crash-load.json"), `${JSON.stringify(crashLoad, null, 2)}\n`, { mode: 0o600 });
  await waitFor(options.window, "recovered workspace after renderer crash", `document.querySelector('#workspace-heading') && document.querySelector('.host-probe')?.textContent?.includes('electron') && document.activeElement?.id === 'workspace-heading'`, 20_000);
  const crashBoot = await inspectWorkspace(options.window);
  await writeFile(join(output, "renderer-crash-boot.json"), `${JSON.stringify(crashBoot, null, 2)}\n`, { mode: 0o600 });
  if (crashBoot.stage !== beforeCrash.stage) throw new Error("Forced renderer crash did not restore the active stage.");
  await clickStage(options.window, "Review");
  await waitFor(options.window, "recovered Review decision after renderer crash", `document.activeElement?.id === 'workspace-heading' && document.querySelector('.candidate-row[aria-current="true"]')?.dataset.reviewState === 'keep'`, 20_000);
  await waitFor(options.window, "post-crash recovery checkpoint", `document.querySelector('.app-shell')?.dataset.recoveryCheckpoint === 'ready'`, 20_000);
  const afterCrash = await inspectWorkspace(options.window);
  trace.rendererCrashRecovery = { forced: true, details: crashDetails, before: beforeCrash, boot: crashBoot, after: afterCrash };

  const beforeReload = await inspectWorkspace(options.window);
  const loaded = new Promise<void>((resolveLoaded) => options.window.webContents.once("did-finish-load", () => resolveLoaded()));
  options.window.webContents.reload();
  await withTimeout("recovery reload", loaded, 20_000);
  await settle(options.window, 500);
  trace.reloadBoot = await inspectWorkspace(options.window);
  await writeFile(join(output, "reload-boot.json"), `${JSON.stringify(trace.reloadBoot, null, 2)}\n`, { mode: 0o600 });
  await waitFor(options.window, "recovered Studio", `document.querySelector('#workspace-heading') && document.querySelector('.host-probe')?.textContent?.includes('electron') && document.activeElement?.id === 'workspace-heading'`, 20_000);
  const afterReload = await inspectWorkspace(options.window);
  if (afterReload.stage !== beforeReload.stage) throw new Error("Reload did not restore the active stage.");
  trace.reloadRecovery = { before: beforeReload, after: afterReload };
  await capture(options.window, join(output, "05-recovered.png"));

  const accessibilityTree = await collectAccessibilityTree(options.window);
  await writeFile(join(output, "accessibility-tree.json"), `${JSON.stringify(accessibilityTree, null, 2)}\n`, { mode: 0o600 });
  await writeFile(join(output, "trace.json"), `${JSON.stringify(trace, null, 2)}\n`, { mode: 0o600 });
  const metadata = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    versions: process.versions,
    viewport: options.window.getContentBounds(),
    files: (await readdir(output, { recursive: true })).length,
  };
  await writeFile(join(output, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });

  const audit = trace.semanticAudit as { unnamed?: unknown[]; duplicateIds?: unknown[]; horizontalOverflow?: boolean; roleHelpSeparated?: boolean; layout?: { minControlHeight?: number; iconOnlyButtons?: number; iconCentersAligned?: boolean; selectCarets?: number; selectCaretsComplete?: boolean; selectCaretsCentered?: boolean; selectCaretInset?: number; panelTopSpread?: number; panelBottomSpread?: number; panelTrayGap?: number; horizontalOverflows?: unknown[] } };
  const disclosure = trace.disclosureMotion as { expanded?: boolean; collapsed?: boolean; openIntermediate?: boolean; closeIntermediate?: boolean; caretRotates?: boolean };
  const security = trace.securityAudit as { invalidRequests?: number; rejected?: number; nodeUnavailable?: boolean };
  const keyboard = trace.keyboardAccessibility as Record<string, boolean>;
  const catalog = trace.installedCatalog as { count?: number; indexed?: number; pathLeak?: boolean; opaquePreviewUrls?: boolean; previewAvailable?: boolean; fontLoaded?: boolean; pageBounded?: boolean; studyUnchanged?: boolean; cancellation?: { acknowledged?: boolean; durationMs?: number; obsoleteResultCancelled?: boolean } };
  const body = trace.simpleBodyCopy as { pageCount?: number; sampleCount?: number; fullText?: boolean; twoParagraphs?: boolean; sharedSize?: boolean; withinFrames?: boolean; noEllipsis?: boolean; minTouchHeight?: number; horizontalOverflow?: boolean; studioShared?: boolean; manifest?: { pageMode?: string; boardCount?: number; bodyCount?: number; indexCount?: number; fontCount?: number; includeIndex?: boolean } };
  if (audit.unnamed?.length || audit.duplicateIds?.length || audit.horizontalOverflow || !audit.roleHelpSeparated) throw new Error("Semantic accessibility or layout audit failed.");
  if ((audit.layout?.minControlHeight ?? 0) < 44 || !audit.layout?.iconOnlyButtons || !audit.layout.iconCentersAligned || (audit.layout.selectCarets ?? 0) < 3 || !audit.layout.selectCaretsComplete || !audit.layout.selectCaretsCentered || (audit.layout.selectCaretInset ?? 0) < 14 || (audit.layout.panelTopSpread ?? 999) > 1 || (audit.layout.panelBottomSpread ?? 999) > 1 || (audit.layout.panelTrayGap ?? 999) > 1 || audit.layout.horizontalOverflows?.length) throw new Error("Control or panel geometry audit failed.");
  if (!disclosure.expanded || !disclosure.collapsed || !disclosure.openIntermediate || !disclosure.closeIntermediate || !disclosure.caretRotates) throw new Error("Disclosure motion audit failed.");
  if (security.invalidRequests !== security.rejected || !security.nodeUnavailable) throw new Error("Host security audit failed.");
  if (!catalog.count || !catalog.indexed || catalog.pathLeak || !catalog.opaquePreviewUrls || !catalog.previewAvailable || !catalog.fontLoaded || !catalog.pageBounded || !catalog.studyUnchanged || !catalog.cancellation?.acknowledged || !catalog.cancellation.obsoleteResultCancelled || catalog.cancellation.durationMs === undefined || catalog.cancellation.durationMs > 100) throw new Error("Installed font catalog audit failed.");
  if (!keyboard.forwardWrap || !keyboard.backwardWrap || !keyboard.candidateUnchanged || !keyboard.trayUnchanged || !keyboard.returnFocus) throw new Error("Keyboard accessibility audit failed.");
  if (!body.pageCount || body.pageCount !== body.manifest?.fontCount || body.pageCount !== body.manifest?.bodyCount || body.sampleCount !== 3 || !body.fullText || !body.twoParagraphs || !body.sharedSize || !body.withinFrames || !body.noEllipsis || (body.minTouchHeight ?? 0) < 44 || body.horizontalOverflow || !body.studioShared || body.manifest?.pageMode !== "body" || body.manifest.boardCount !== 0 || body.manifest.indexCount !== 0 || body.manifest.includeIndex !== false) throw new Error("Simple Body Copy audit failed.");
  if ((trace.rendererCrashRecovery as { after?: { activeElement?: string; reviewState?: string } }).after?.activeElement !== "workspace-heading" || (trace.rendererCrashRecovery as { after?: { activeElement?: string; reviewState?: string } }).after?.reviewState !== "Keep") throw new Error("Forced renderer crash recovery failed.");
  if (afterReload.activeElement !== "workspace-heading" || afterReload.reviewState !== "Keep") throw new Error("Reload recovery or focus restoration failed.");
  await checksumEvidence(output);
}
