import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

const packageRoot = resolve(process.argv[2] ?? "");
if (!process.argv[2] || packageRoot === resolve(sep)) throw new Error("A narrow package root is required.");
const applicationRoot = join(packageRoot, "resources", "app");
const required = [
  "DEPENDENCIES.md",
  "INSTALL.md",
  "LICENSE.txt",
  "THIRD_PARTY_NOTICES.md",
  "assets",
  "dist",
  "dist-electron",
  "node_modules",
  "package.json",
  "sbom.cdx.json",
];
const topLevel = (await readdir(applicationRoot)).sort();
if (JSON.stringify(topLevel) !== JSON.stringify(required)) throw new Error(`Unexpected packaged application inventory: ${topLevel.join(", ")}`);

const forbiddenName = /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|.*\.(?:key|pem|p12|pfx|mobileprovision))$/iu;
const privatePath = /(?:\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)/u;
const secretMarker = /(?:BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/u;
const inspectText = new Set([".css", ".html", ".js", ".json", ".md", ".txt"]);
let files = 0;
const queue = [applicationRoot];
while (queue.length) {
  const directory = queue.pop();
  if (!directory) break;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const rel = relative(applicationRoot, path).split(sep).join("/");
    if (forbiddenName.test(`/${rel}`)) throw new Error(`Forbidden packaged file: ${rel}`);
    if (!rel.startsWith("node_modules/") && rel.endsWith(".map")) throw new Error(`Application source map in package: ${rel}`);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected packaged symlink: ${rel}`);
    if (entry.isDirectory()) { queue.push(path); continue; }
    if (!entry.isFile()) throw new Error(`Unexpected packaged entry: ${rel}`);
    files += 1;
    const extension = entry.name.includes(".") ? `.${entry.name.split(".").at(-1)?.toLocaleLowerCase()}` : "";
    if (!rel.startsWith("node_modules/") && inspectText.has(extension) && (await lstat(path)).size <= 2_000_000) {
      const text = await readFile(path, "utf8");
      if (privatePath.test(text)) throw new Error(`Private absolute path in packaged text: ${rel}`);
      if (secretMarker.test(text)) throw new Error(`Credential-like content in packaged text: ${rel}`);
    }
  }
}
if (files < 10) throw new Error("Packaged application inventory is implausibly small.");
process.stdout.write(`Audited ${basename(packageRoot)}: ${files} regular files; inventory/secrets/paths/application-source-maps pass.\n`);
