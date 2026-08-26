import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const lock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));
const packagesByIdentity = new Map();
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path.startsWith("node_modules/") || !entry.version) continue;
  const name = path.split("node_modules/").at(-1);
  if (!name) continue;
  const identity = `${name}@${entry.version}`;
  if (!packagesByIdentity.has(identity)) {
    const purlName = name.startsWith("@") ? `%40${name.slice(1)}` : name;
    packagesByIdentity.set(identity, {
      type: "library",
      name,
      version: entry.version,
      purl: `pkg:npm/${purlName}@${entry.version}`,
      licenses: entry.license ? [{ license: { id: entry.license } }] : undefined,
      hashes: entry.integrity
        ? [
            {
              alg: "SHA-512",
              content: Buffer.from(entry.integrity.replace(/^sha512-/, ""), "base64").toString(
                "hex",
              ),
            },
          ]
        : undefined,
      properties: [
        { name: "font-previewer:development", value: String(Boolean(entry.dev)) },
        { name: "font-previewer:optional", value: String(Boolean(entry.optional)) },
      ],
    });
  }
}
const packages = [...packagesByIdentity.values()].sort((left, right) =>
  left.name.localeCompare(right.name),
);

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: "urn:uuid:41e41173-23a8-4a64-bf4a-0d2e8b8e6251",
  version: 1,
  metadata: {
    component: {
      type: "application",
      name: "@font-previewer/p1-shared-studio",
      version: "0.0.0",
    },
  },
  components: packages,
};

await writeFile(resolve(root, "sbom.cdx.json"), `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
