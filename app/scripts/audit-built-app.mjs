import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rendererRoot = join(applicationRoot, "dist", "renderer");
const html = await readFile(join(rendererRoot, "index.html"), "utf8");
if (!html.includes("Content-Security-Policy")) throw new Error("Built Studio is missing its Content Security Policy.");
if (/https?:\/\//u.test(html)) throw new Error("Built Studio contains a remote URL.");
const files = await readdir(join(rendererRoot, "assets"));
if (files.some((name) => name.endsWith(".map"))) throw new Error("Built Studio contains source maps.");
const cssFiles = files.filter((name) => name.endsWith(".css"));
if (cssFiles.length !== 1) throw new Error("Built Studio CSS inventory is unexpected.");
const css = await readFile(join(rendererRoot, "assets", cssFiles[0]), "utf8");
for (const required of ["prefers-reduced-motion:reduce", "forced-colors:active"]) {
  if (!css.replaceAll(" ", "").includes(required)) throw new Error(`Built Studio is missing ${required}.`);
}
process.stdout.write(`Audited built Studio: ${files.length + 1} files; CSP/locality/motion/forced-colors pass.\n`);
