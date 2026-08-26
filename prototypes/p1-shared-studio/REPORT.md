# P1 Variant A Report

## Result

Variant A now exists as a full shared-Studio prototype with a narrow Electron Host. Its type, domain, protocol, server-rendered surface, production bundle, dependency, and static security gates pass.

D01 is not decided. This workspace cannot supply a displayed Linux session, Orca, macOS, WKWebView, or VoiceOver, so the native menu/dialog, focus, reload, screen-reader, input-latency, and platform-quality acceptance criteria remain open. Missing evidence is not a pass and is not a veto.

## Branch and boundary

- branch: `prototype/p1-full-shared-studio`
- base: `c707590` (`codex/d00-reconciliation`)
- kind: throwaway R0 prototype
- product source changed: no; preserved `macos/` reference is untouched
- merge/release/deploy: none

The prototype owns Sources/Study navigation, Review/Compare/System/Handoff, the Inspector, and the Compare tray. The Host owns source bindings, native menus, native file selection, undo, and renderer reload.

## Domain correction

The first implementation pass repeated the reference model’s collapse by attaching Role to Candidate and binding state to Source. The gauntlet rejected it before commit.

The corrected `StudySession` has separate:

- Sources;
- Host-local Source Binding summaries;
- Faces with exact Face index;
- Candidates referencing Faces;
- Font Uses referencing a Face and originating Candidate;
- Recipes;
- renderer workspace state and monotonic revision.

New imports receive random durable Source IDs. The Host canonicalizes the selected path, bounds a batch to 64 Sources and each Source to 512 MiB, keeps paths in the main process, and returns only opaque IDs and display names. A Source ID is not derived from a path, digest, name, or provider identifier.

## Canonical task fixture

| Requirement | Prototype evidence |
|---|---|
| 24 Candidates | Fixture assertion passes |
| Four Families | Explicit Face assertion passes |
| Variable Candidate duplicates | Multiple Candidates share each variable Face ID with distinct axes |
| One missing Source | One Host-local Binding is missing; portable Source remains distinct |
| Existing decisions | Keep, Maybe, Reject, and Unreviewed are present |
| Three Recipes | Fixture assertion passes |
| Comparison tray | Three initial Candidate IDs; reducer enforces unique maximum of four |
| Existing system choices | Text and Mono are separate Font Uses |

## Task evidence

| P1 task | Automated evidence | Native exploratory evidence | Status |
|---|---|---|---|
| Find Unreviewed Candidate | `select-next-unreviewed` reducer test | Not run | Partial |
| Mark Keep | Semantic reducer test; native-menu command uses the same reducer path | OS menu not clicked | Partial |
| Edit copy | Controlled editor compiles and renders at the Studio seam | Input latency and native undo not observed | Partial |
| Create Compare Set | Unique, removable, four-item bound test; Compare stage renders | Visual density not observed | Partial |
| Assign Display Role | Test proves distinct Font Use, Candidate, and Face identities | Interaction not observed | Partial |
| Open native Import | Electron `dialog.showOpenDialog` route, path redaction, and protocol validation compile | Dialog/focus restoration not observed | Partial |
| Undo through native menu | Standard Electron Undo role is installed; Host undo route compiles | Menu behavior not observed | Open |
| Kill/reload web process | Recovery snapshot round-trip, bounds, corrupt-reference rejection, and reload route compile | Actual renderer termination/reload not observed | Partial |
| Navigate with screen reader | Landmarks, headings, live region, skip link, and keyboard-edit suppression render at the public seam | Orca and VoiceOver not run | Open |

## Architecture evidence

Mutable UI/domain authority count is one: the renderer-owned `StudySession`. Electron retains only privileged Source ID → canonical path bindings. It does not mirror selection, stage, copy, review state, Compare Set, Recipes, or Font Uses.

`localStorage` holds a validated prototype reload checkpoint. It is a durable copy, not a second mutable authority, an intentional Save, or an accepted recovery design. D03 must replace it before production.

The HostBridge has four renderer requests: import, native undo, reload, and probe. Native menu events carry five semantic commands. Both directions reject extra fields and unknown variants at runtime. Import responses reject path-bearing objects.

Electron uses sandboxing, context isolation, no Node integration, local bundled content, denied window creation, denied navigation, denied permissions, and a preload-only bridge. Following [Electron's ESM guidance](https://www.electronjs.org/docs/latest/tutorial/esm), Vite bundles the sandboxed preload and protocol validators into one 2.62 kB CommonJS artifact while the main process remains ESM. These controls are prototype evidence, not a completed threat model or process-isolated font engine.

## Code surface

| Surface | Lines |
|---|---:|
| Shared Studio, domain, fixture, protocol, styles | 2,758 |
| Electron main and preload | 261 |
| Runtime total | 3,019 |
| Tests, evidence harness, SBOM generator | 544 |
| Total P1 source | 3,563 |

The 825-line prototype `App.tsx` and 1,095-line stylesheet are deliberate throwaway evidence surfaces. They must not become the production module boundary by inertia. Configuration and documentation are excluded from this count.

## Fresh verification

Run on 2026-08-27 with Node.js 24.19.0 and npm 11.9.0:

```text
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsc -p tsconfig.test.json
node --test .test-dist/tests/*.test.js
./node_modules/.bin/vite build
./node_modules/.bin/tsc -p tsconfig.electron.json
./node_modules/.bin/vite build --config vite.preload.config.ts
node scripts/build-sbom.mjs
npm audit --json --audit-level=moderate
npm outdated --json
```

Results:

- 10/10 tests passed in 116 ms on the last recorded run;
- renderer strict typecheck passed;
- Electron main/preload strict typecheck passed;
- sandboxed CommonJS preload bundle passed with no residual ESM import and `electron` as its only external;
- Vite production build passed in 385 ms on the last recorded run;
- renderer JavaScript: 219.00 kB raw, 67.58 kB gzip;
- renderer CSS: 15.31 kB raw, 3.69 kB gzip;
- preload bundle: 2.62 kB raw, 0.87 kB gzip;
- CycloneDX 1.6 SBOM: 81 resolved name/version components;
- npm audit: zero info/low/moderate/high/critical vulnerabilities;
- npm outdated: only `@types/node` reported newer; `24.13.3` is deliberately aligned with the Node 24 runtime rather than latest `26.3.0`.

The test and build times are machine-local diagnostics, not product performance claims. No valid bridge-latency or input-to-frame measurement exists yet.

## Environment failures

Electron 44.0.0 resolved and linked on Linux x86_64. The main process starts, but `app.whenReady()` cannot complete in the managed workspace because there is no display server and D-Bus socket creation is denied. Headless and offscreen attempts therefore produced no screenshots or native traces. The workspace also has no Orca, Swift, macOS, WKWebView, or VoiceOver.

An isolated Chromium download for renderer-only visual evidence returned a truncated zero-size archive through the restricted network. The temporary dependency and script were removed; no unused browser dependency remains.

Exact environment evidence is in `evidence/P1/2026-08-27/environment.json`.

The branch includes a manually dispatched, SHA-pinned `p1-linux-evidence.yml` workflow that provisions Xvfb and D-Bus, runs this same Electron evidence harness, and uploads screenshots, the accessibility tree, and the structured trace. It has not run because the standalone GitHub repository does not yet exist; workflow presence is readiness, not evidence.

## Veto review and decision

| Full-Studio veto | Current result |
|---|---|
| Focus is unreliable | Unknown; native focus loop not run |
| Screen-reader path is materially broken | Unknown; semantic surface exists, readers not run |
| Mac workspace cannot feel credible | Unknown; WKWebView harness absent |
| Bridge mirrors most UI state | Not observed; bridge is narrow and Host state is privileged-only |
| Reload cannot recover | Validation path passes; actual web-process reload unknown |
| Platform forks spread through Studio | Not observed in the current single Studio; Mac integration still absent |

No ADR is accepted or rejected. Variant A remains the leading hypothesis because its domain locality and bridge boundary hold under automated checks, but D01 stays blocked on native evidence.

## Next experiment

1. Create the standalone GitHub repository, push this exact branch, and manually dispatch `p1-linux-evidence.yml`; inspect every uploaded artifact rather than treating a green job as sufficient.
2. Run the same fixture interactively on displayed Linux; exercise native Import, Edit → Undo, semantic menu commands, reload, focus return, and the full task path with Orca.
3. Build the thinnest WKWebView Host harness that uses the same fixture and protocol; run the task path with keyboard and VoiceOver and record a Mac visual critique against the native reference.
4. Capture bridge p50/p95, input-to-frame p50/p95, reload time, focus transitions, accessibility trees, and screenshots on both Hosts.
5. If Variant A hits a veto, build rough Variant B with native navigation/Inspector and a shared stage. Do not build B merely for symmetry.
6. Accept or reject D01 only after the evidence matrix is complete.
