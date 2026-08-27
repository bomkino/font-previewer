import { createHash } from "node:crypto";
import { cp, chmod, lstat, mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const applicationRoot = resolve(scriptDirectory, "..");
const releaseRoot = join(applicationRoot, "release");
const unpacked = join(releaseRoot, "linux-unpacked");
const debRoot = join(releaseRoot, "deb-root");
const version = "0.1.0";
const architecture = process.arch === "x64" ? "amd64" : process.arch === "arm64" ? "arm64" : undefined;
if (process.platform !== "linux" || !architecture) throw new Error(`Unsupported package target: ${process.platform}/${process.arch}`);
for (const path of [releaseRoot, unpacked, debRoot]) {
  if (!path.startsWith(`${applicationRoot}${sep}`)) throw new Error(`Refusing unsafe package path: ${path}`);
}
for (const required of [
  join(applicationRoot, "dist", "renderer", "index.html"),
  join(applicationRoot, "dist-electron", "electron", "main.js"),
  join(applicationRoot, "dist-electron", "electron", "preload.cjs"),
  join(applicationRoot, "dist-electron", "electron", "font-variation-worker.js"),
  join(applicationRoot, "node_modules", "electron", "dist", "electron"),
  join(applicationRoot, "node_modules", "fontkit", "package.json"),
  join(applicationRoot, "THIRD_PARTY_NOTICES.md"),
  join(applicationRoot, "..", "LICENSE"),
]) {
  if (!(await lstat(required)).isFile()) throw new Error(`Missing build input: ${relative(applicationRoot, required)}`);
}

await mkdir(releaseRoot, { recursive: true });
await Promise.all([rm(unpacked, { recursive: true, force: true }), rm(debRoot, { recursive: true, force: true })]);
await cp(join(applicationRoot, "node_modules", "electron", "dist"), unpacked, { recursive: true, preserveTimestamps: true });
await rename(join(unpacked, "electron"), join(unpacked, "font-previewer"));
await chmod(join(unpacked, "font-previewer"), 0o755);
await chmod(join(unpacked, "chrome-sandbox"), 0o4755);
const packagedApplication = join(unpacked, "resources", "app");
await mkdir(packagedApplication, { recursive: true });
await Promise.all([
  cp(join(applicationRoot, "dist"), join(packagedApplication, "dist"), { recursive: true }),
  cp(join(applicationRoot, "dist-electron"), join(packagedApplication, "dist-electron"), { recursive: true }),
  cp(join(applicationRoot, "THIRD_PARTY_NOTICES.md"), join(packagedApplication, "THIRD_PARTY_NOTICES.md")),
  cp(join(applicationRoot, "..", "LICENSE"), join(packagedApplication, "LICENSE.txt")),
]);
const lock = JSON.parse(await readFile(join(applicationRoot, "package-lock.json"), "utf8"));
for (const [packagePath, metadata] of Object.entries(lock.packages)) {
  if (!packagePath.startsWith("node_modules/") || metadata.dev === true || metadata.optional === true) continue;
  const source = join(applicationRoot, packagePath);
  try {
    if (!(await lstat(source)).isDirectory()) continue;
  } catch {
    continue;
  }
  await cp(source, join(packagedApplication, packagePath), { recursive: true, preserveTimestamps: true });
}
await writeFile(join(packagedApplication, "package.json"), `${JSON.stringify({ name: "font-previewer", productName: "Font Previewer", version, private: true, type: "module", main: "dist-electron/electron/main.js" }, null, 2)}\n`);

const portableName = `Font-Previewer-${version}-linux-${process.arch}.tar.gz`;
const portablePath = join(releaseRoot, portableName);
await rm(portablePath, { force: true });
await run("tar", ["--owner=0", "--group=0", "--numeric-owner", "-C", releaseRoot, "-czf", portablePath, "linux-unpacked"]);

const installRoot = join(debRoot, "opt", "font-previewer");
await mkdir(installRoot, { recursive: true });
await cp(unpacked, installRoot, { recursive: true, preserveTimestamps: true });
await mkdir(join(debRoot, "DEBIAN"), { recursive: true });
await mkdir(join(debRoot, "usr", "bin"), { recursive: true });
await mkdir(join(debRoot, "usr", "share", "applications"), { recursive: true });
await mkdir(join(debRoot, "usr", "share", "icons", "hicolor", "scalable", "apps"), { recursive: true });
await symlink("../../opt/font-previewer/font-previewer", join(debRoot, "usr", "bin", "font-previewer"));
await cp(join(applicationRoot, "assets", "font-previewer.svg"), join(debRoot, "usr", "share", "icons", "hicolor", "scalable", "apps", "font-previewer.svg"));
await writeFile(join(debRoot, "DEBIAN", "control"), `Package: font-previewer\nVersion: ${version}\nSection: graphics\nPriority: optional\nArchitecture: ${architecture}\nMaintainer: pitch.dog contributors\nDepends: libgtk-3-0, libnss3, libasound2, libgbm1\nDescription: Local typography decision Studio\n Review local font Sources, compare Candidates, build a typography System, and export a decision Handoff.\n`);
await writeFile(join(debRoot, "usr", "share", "applications", "font-previewer.desktop"), `[Desktop Entry]\nName=Font Previewer\nComment=Local typography decision Studio\nExec=/opt/font-previewer/font-previewer %U\nIcon=font-previewer\nTerminal=false\nType=Application\nCategories=Graphics;Office;\nStartupWMClass=Font Previewer\nMimeType=application/x-font-previewer-study;\n`);
await chmod(join(debRoot, "opt", "font-previewer", "chrome-sandbox"), 0o4755);
const debName = `font-previewer_${version}_${architecture}.deb`;
const debPath = join(releaseRoot, debName);
await rm(debPath, { force: true });
await run("dpkg-deb", ["--build", "--root-owner-group", debRoot, debPath]);

const artifacts = [portablePath, debPath];
const checksumLines = [];
for (const path of artifacts) {
  const digest = createHash("sha256").update(await readFile(path)).digest("hex");
  checksumLines.push(`${digest}  ${relative(releaseRoot, path)}`);
}
await writeFile(join(releaseRoot, "checksums.sha256"), `${checksumLines.join("\n")}\n`);
for (const path of artifacts) process.stdout.write(`${path}\n`);
