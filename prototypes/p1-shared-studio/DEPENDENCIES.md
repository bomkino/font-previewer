# P1 Dependency Ledger

Checked against the npm registry on 2026-08-27. Every direct dependency is exact-pinned in `package.json` and transitively locked in `package-lock.json`. `npm outdated --json` reported only `@types/node`: `24.13.3` is deliberately held to the Node 24 runtime while `26.3.0` is latest. `npm audit --audit-level=moderate` reported zero known vulnerabilities across 81 resolved components.

| Package | Version | Licence | Scope and product need | Seam | Removal plan |
|---|---:|---|---|---|---|
| React | 19.2.8 | MIT | Shared Studio component and state runtime | `src/main.tsx` root and semantic reducer dispatch | Replace the Studio renderer; no Host contract change required |
| React DOM | 19.2.8 | MIT | DOM and server-rendered public-surface test | Browser root and `react-dom/server` test | Replace with the chosen renderer adapter |
| Electron | 44.0.0 | MIT | Linux native Host prototype | `electron/main.ts` and sandboxed `electron/preload.ts` | Replace the Linux Host; Studio protocol remains the seam |
| TypeScript | 7.0.2 | Apache-2.0 | Compile-time contract checking | `tsconfig*.json`; emits no runtime library | Compile or migrate source to another typed language |
| Vite | 8.2.2 | MIT | Local Studio development, deterministic renderer bundle, and sandbox-compatible CommonJS preload bundle | `vite*.config.ts`, `dist/renderer`, and `dist-electron/electron/preload.cjs` | Replace build adapter without changing Studio semantics |
| Vite React plugin | 6.1.0 | MIT | React transform for Vite | `vite.config.ts` only | Remove with Vite or React |
| React type declarations | 19.2.18 | MIT | Development-only React types | TypeScript compiler | Remove with React or TypeScript |
| React DOM type declarations | 19.2.5 | MIT | Development-only DOM renderer types | TypeScript compiler | Remove with React DOM or TypeScript |
| Node type declarations | 24.13.3 | MIT | Development-only Host and test types aligned with the Node 24 runtime | Electron/test TypeScript configs | Remove with TypeScript or Node Host tooling |

The resolved graph uses only MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, and MPL-2.0 packages. MPL-2.0 appears only in Lightning CSS and its platform binaries, pulled by the Vite development/build path. No GPL-family dependency is present.

The generated CycloneDX 1.6 `sbom.cdx.json` records all 81 name/version identities, integrity hashes where present, licences, and development/optional classification. Optional platform binaries remain in the SBOM because they are part of the locked resolution even when not installed on Linux x86_64.

This prototype is not packaged or distributed. A production packaging ticket must generate third-party notices, pin the Electron binary checksum/cache path, rerun vulnerability and maintenance checks, and decide whether build-only MPL notices ship with artifacts.

## Workflow dependencies

The unexecuted `.github/workflows/p1-linux-evidence.yml` workflow uses three MIT-licensed GitHub Actions pinned to immutable commit SHAs:

| Action | Release | Commit |
|---|---:|---|
| `actions/checkout` | 6.1.0 | `d23441a48e516b6c34aea4fa41551a30e30af803` |
| `actions/setup-node` | 7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/upload-artifact` | 6.0.0 | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` |

Their exact tags, commits, and repository licence files were checked on 2026-08-27. They are CI-only and do not enter the product or npm SBOM. Removal means replacing checkout/runtime/artifact transport in the workflow; no product seam changes.
