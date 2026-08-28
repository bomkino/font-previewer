import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rendererRoot = join(applicationRoot, "dist", "renderer");
const html = await readFile(join(rendererRoot, "index.html"), "utf8");
if (!html.includes("Content-Security-Policy")) throw new Error("Built Studio is missing its Content Security Policy.");
if (/https?:\/\//u.test(html)) throw new Error("Built Studio contains a remote URL.");
for (const required of [
  'name="color-scheme" content="dark"',
  'href="./favicon.ico"',
  'href="./font-previewer-icon-32.png"',
  'href="./font-previewer-icon-16.png"',
  'href="./font-previewer-icon-180.png"',
  'href="./site.webmanifest"',
]) {
  if (!html.includes(required)) throw new Error(`Built Studio is missing icon/dark-mode surface: ${required}`);
}
for (const file of ["favicon.ico", "font-previewer-icon-16.png", "font-previewer-icon-32.png", "font-previewer-icon-64.png", "font-previewer-icon-180.png", "font-previewer-icon-192.png", "font-previewer-icon-512.png", "site.webmanifest"]) {
  if (!(await readdir(rendererRoot)).includes(file)) throw new Error(`Built Studio is missing ${file}.`);
}
const files = await readdir(join(rendererRoot, "assets"));
if (files.some((name) => name.endsWith(".map"))) throw new Error("Built Studio contains source maps.");
const cssFiles = files.filter((name) => name.endsWith(".css"));
if (cssFiles.length !== 1) throw new Error("Built Studio CSS inventory is unexpected.");
const css = await readFile(join(rendererRoot, "assets", cssFiles[0]), "utf8");
for (const required of ["prefers-reduced-motion:reduce", "forced-colors:active"]) {
  if (!css.replaceAll(" ", "").includes(required)) throw new Error(`Built Studio is missing ${required}.`);
}
for (const required of ["color-scheme:dark", "background:#0b0b0f", "--paper:#111116"]) {
  if (!css.replaceAll(" ", "").includes(required)) throw new Error(`Built Studio is missing dark default: ${required}.`);
}
process.stdout.write(`Audited built Studio: ${files.length + 9} files; CSP/locality/icons/dark-default/motion/forced-colors pass.\n`);
