# P1 Variant A Report

## Result

Variant A now exists as a full shared-Studio prototype with a narrow Electron Host. Its type, domain, protocol, server-rendered surface, production bundle, dependency, static security, and automated displayed-Linux gates pass.

D01 is not decided. GitHub Actions supplied an Xvfb/D-Bus Linux session and removed major unknowns around focus, reload, undo, latency, accessibility semantics, and visual composition. Actual OS-menu/dialog operation, interactive Orca, a WKWebView Host, macOS shared-Studio quality, and VoiceOver remain open. Missing evidence is not a pass and is not a veto.

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
| Find Unreviewed Candidate | `select-next-unreviewed` reducer test; native command item installed | Actual OS menu item not clicked | Partial |
| Mark Keep | Semantic reducer test and Host command path | Trace records revision 0 → 1 and Unreviewed → Keep; actual OS menu item not clicked | Pass with limit |
| Edit copy | Controlled editor and native undo path | 20 input-to-frame samples; undo restored exact copy | Pass |
| Create Compare Set | Unique, removable, four-item bound test | Four-up equal-cell screenshot inspected | Pass |
| Assign Display Role | Test proves distinct Font Use, Candidate, and Face identities | Runtime interaction and System screenshot inspected | Pass |
| Open native Import | Electron `dialog.showOpenDialog` route, path redaction, and protocol validation compile | Dialog/focus restoration not observed | Partial |
| Undo through native menu | Standard Electron Undo role is installed; Host undo primitive restores copy | Actual OS menu item not clicked | Partial |
| Kill/reload web process | Recovery snapshot round-trip, bounds, and corrupt-reference rejection | Reload completed in 217.722 ms with stage, revision, and workspace focus preserved | Pass |
| Navigate with screen reader | 608-node accessibility tree; named landmarks; zero unnamed interactive nodes | Orca and VoiceOver not run | Partial |

## Architecture evidence

Mutable UI/domain authority count is one: the renderer-owned `StudySession`. Electron retains only privileged Source ID → canonical path bindings. It does not mirror selection, stage, copy, review state, Compare Set, Recipes, or Font Uses.

`localStorage` holds a validated prototype reload checkpoint. It is a durable copy, not a second mutable authority, an intentional Save, or an accepted recovery design. D03 must replace it before production.

The HostBridge has four renderer requests: import, native undo, reload, and probe. Native menu events carry five semantic commands. Both directions reject extra fields and unknown variants at runtime. Import responses reject path-bearing objects.

Electron uses sandboxing, context isolation, no Node integration, local bundled content, denied window creation, denied navigation, denied permissions, and a preload-only bridge. Following [Electron's ESM guidance](https://www.electronjs.org/docs/latest/tutorial/esm), Vite bundles the sandboxed preload and protocol validators into one 2.62 kB CommonJS artifact while the main process remains ESM. These controls are prototype evidence, not a completed threat model or process-isolated font engine.

## Code surface

| Surface | Lines |
|---|---:|
| Shared Studio, domain, fixture, protocol, styles | 2,759 |
| Electron main and preload | 262 |
| Runtime total | 3,021 |
| Tests, evidence harness, SBOM generator | 542 |
| Total P1 source | 3,563 |

The 826-line prototype `App.tsx` and 1,095-line stylesheet are deliberate throwaway evidence surfaces. They must not become the production module boundary by inertia. Configuration and documentation are excluded from this count.

## Fresh verification

Final native run: GitHub Actions `33010127784`, Ubuntu 24.04 x64, Node.js 24.18.1, Electron 44.0.0, Chromium 152.0.7977.54. Local verification used Node.js 24.19.0 and npm 11.9.0.

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

- 10/10 tests passed in 133.101 ms in the final CI run;
- renderer strict typecheck passed;
- Electron main/preload strict typecheck passed;
- sandboxed CommonJS preload bundle passed with no residual ESM import and `electron` as its only external;
- Vite production build passed;
- renderer JavaScript: 219.059 kB raw, 67.59 kB gzip;
- renderer CSS: 15.31 kB raw, 3.69 kB gzip;
- preload bundle: 2.62 kB raw, 0.87 kB gzip;
- CycloneDX 1.6 SBOM: 81 resolved name/version components;
- npm audit: zero info/low/moderate/high/critical vulnerabilities;
- npm outdated: only `@types/node` reported newer; `24.13.3` is deliberately aligned with the Node 24 runtime rather than latest `26.3.0`.
- 40 HostBridge round trips: 0.2 ms median, 0.3 ms p95, 1.0 ms maximum;
- 20 input-to-frame samples: 16.6 ms median, 17.3 ms p95, 17.5 ms maximum;
- reload/recovery: 217.722 ms with stage, revision, and focus preserved;
- five 1440 × 960 screenshots inspected across Review, Compare, System, Handoff, and recovered Handoff;
- Chromium accessibility tree: 608 nodes, named primary landmarks, zero unnamed interactive nodes.

These are hosted-runner diagnostics, not universal product-performance claims. Fixture names are architectural test data; P1 does not prove font-rendering fidelity.

## Native evidence and remaining environment limits

The local managed workspace has no display server, D-Bus session, Orca, Swift, macOS, WKWebView, or VoiceOver. The SHA-pinned GitHub workflow provisioned Xvfb and an isolated D-Bus session and completed the Electron harness.

The repair loop found three real defects rather than weakening the gate: Electron's SUID sandbox helper lacked runner permissions; an ESM top-level `await app.whenReady()` deadlocked startup; reload restored state but initially dropped keyboard focus. The final run uses the configured Chromium sandbox and hard-asserts focus, stage, and revision recovery.

Final evidence is committed under `evidence/P1/2026-08-27/linux-electron-run-33010127784/`. GitHub artifact `9622173630` has digest `sha256:86af413d98ccf3c0fa420d259947909c0c4bc16df25bf31664f87e7d0878248c`.

Remaining gaps: actual native Import and OS-menu clicks, attended Linux visual review, interactive Orca traversal, WKWebView parity, macOS shared-Studio review, and VoiceOver.

## Veto review and decision

| Full-Studio veto | Current result |
|---|---|
| Focus is unreliable | No Linux veto observed; stage changes and reload end on `workspace-heading` |
| Screen-reader path is materially broken | No semantic-tree veto observed; interactive Orca and VoiceOver remain unknown |
| Mac workspace cannot feel credible | Unknown; WKWebView harness absent |
| Bridge mirrors most UI state | Not observed; 0.3 ms p95 bridge remains narrow and privileged-only |
| Reload cannot recover | Not observed; actual reload preserves stage, revision, local state, and focus |
| Platform forks spread through Studio | Not observed in the current single Studio; Mac integration still absent |

No ADR is accepted or rejected. Linux evidence materially strengthens Variant A because its domain locality, bridge boundary, focus, recovery, and composition hold. D01 stays open until Mac shared-Studio and assistive-technology vetoes are tested.

## Next experiment

1. Run the same fixture interactively on displayed Linux; click native Import and OS menu items, then traverse the whole task with Orca.
2. Build the thinnest WKWebView Host harness using the same fixture and protocol; run keyboard and VoiceOver paths and critique it against the verified native reference.
3. Capture equivalent bridge, input, reload, focus, accessibility, and screenshot evidence on Mac.
4. If Variant A hits a veto, build rough Variant B with native navigation/Inspector and a shared stage. Do not build B merely for symmetry.
5. Accept or reject D01 only after the remaining evidence matrix is complete.
