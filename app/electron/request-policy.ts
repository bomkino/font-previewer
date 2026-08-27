import { sep } from "node:path";
import { fileURLToPath } from "node:url";

export function rendererRequestAllowed(rawURL: string, rendererRoot: string, developmentURL?: string): boolean {
  try {
    const url = new URL(rawURL);
    if (url.protocol === "pitch-font:") return url.hostname === "asset" && /^\/[0-9a-f-]{36}$/iu.test(url.pathname) && !url.search && !url.hash;
    if (url.protocol === "file:") {
      const path = fileURLToPath(url);
      return path.startsWith(`${rendererRoot}${sep}`);
    }
    if (!developmentURL) return false;
    const development = new URL(developmentURL);
    return ["127.0.0.1", "localhost"].includes(development.hostname) && url.origin === development.origin;
  } catch {
    return false;
  }
}
