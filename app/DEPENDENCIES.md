# Dependency ledger

Checked on 2026-08-27. Every direct dependency is exact-pinned in `package.json` and every transitive dependency is locked in `package-lock.json`. The generated CycloneDX 1.6 SBOM records 95 resolved components. `npm audit --audit-level=high` reports zero known vulnerabilities.

| Package | Version | Licence | Scope and need | Removal seam |
|---|---:|---|---|---|
| React | 19.2.8 | MIT | Shared semantic Studio and reducer-driven UI | Replace Studio renderer behind HostBridge |
| React DOM | 19.2.8 | MIT | DOM renderer and server-rendered surface test | Replace with Studio renderer |
| Electron | 44.0.0 | MIT | Sandboxed first-class Linux desktop Host | Replace Linux Host without changing Study semantics |
| Fontkit | 2.0.4 | MIT | Variable-axis and named-instance metadata in a bounded Linux child process | Replace the variation worker without changing HostBridge or Study semantics |
| TypeScript | 7.0.2 | Apache-2.0 | Compile-time domain, bridge, Host, and test contracts | Build-only |
| Vite | 8.2.2 | MIT | Deterministic Studio and sandbox-compatible preload bundles | Replace build adapter |
| `@vitejs/plugin-react` | 6.1.0 | MIT | React transform | Remove with Vite/React |
| React type packages | 19.2.18 / 19.2.5 | MIT | Development-only declarations | Remove with React/TypeScript |
| `@types/node` | 24.13.3 | MIT | Node 24 Host/test declarations | Remove with TypeScript/Node tooling |
| `@types/fontkit` | 2.0.9 | MIT | Development-only variation parser declarations | Remove with Fontkit |

The resolved npm graph uses MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, and MPL-2.0 licences. MPL-2.0 occurs in Lightning CSS build tooling and platform binaries. No GPL-family runtime dependency is present.

`THIRD_PARTY_NOTICES.md` ships in Mac and Linux application resources. Linux packages also retain Electron’s `LICENSE` and Chromium’s `LICENSES.chromium.html`. The repository `LICENSE` ships as `LICENSE.txt`.

## Workflow dependencies

The release-candidate workflow uses immutable commits:

| Action | Release | Commit |
|---|---:|---|
| `actions/checkout` | 6.1.0 | `d23441a48e516b6c34aea4fa41551a30e30af803` |
| `actions/setup-node` | 7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/upload-artifact` | 6.0.0 | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` |

These actions are CI-only and do not enter the product or npm SBOM.
