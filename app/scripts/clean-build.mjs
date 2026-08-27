import { rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const name of ["dist", "dist-electron"]) {
  const target = join(applicationRoot, name);
  if (!target.startsWith(`${applicationRoot}${sep}`)) throw new Error(`Refusing unsafe build cleanup: ${target}`);
  await rm(target, { recursive: true, force: true });
}
