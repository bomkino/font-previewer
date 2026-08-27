import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, type FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

export type AtomicCommit = (temporaryPath: string, targetPath: string) => Promise<void>;

export async function atomicWrite(path: string, content: string | Uint8Array, mode = 0o600, commit: AtomicCommit = rename): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`;
  let handle: FileHandle | undefined;
  try {
    handle = await open(temporaryPath, "wx", mode);
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await commit(temporaryPath, path);
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readBoundedText(path: string, maximumBytes: number): Promise<string> {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > maximumBytes) throw new Error(`File exceeds the ${maximumBytes} byte safety limit.`);
  return readFile(path, "utf8");
}

export function safeFileStem(value: string, fallback = "Font Previewer"): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 100);
  return cleaned || fallback;
}

export function csvCell(value: string | number | boolean): string {
  const raw = String(value);
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replaceAll('"', '""')}"`;
}
