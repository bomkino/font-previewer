# P1 Variant A Report

## Result

Variant A now exists as a full shared-Studio prototype with narrow Electron and AppKit/WKWebView Hosts. Its type, domain, protocol, server-rendered surface, production bundle, dependency, static security, automated displayed-Linux gates, and automated macOS WKWebView gates pass.

D01 is not decided. GitHub Actions supplied an Xvfb/D-Bus Linux session and a macOS 14 arm64 WKWebView session. Together they remove major unknowns around focus, reload, undo, bridge latency, accessibility semantics, visual composition, native menu routing, and Mac dialog focus restoration. Attended native-window critique, interactive Orca and VoiceOver, real source selection, and actual WKWebView content-process termination remain open. Missing evidence is not a pass and is not a veto.

## Branch and boundary

- Linux branch: `prototype/p1-full-shared-studio`
- Mac branch: `prototype/p1-macos-shared-studio`
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

| P1 task | Linux evidence | Mac evidence | Status |
|---|---|---|---|
| Find Unreviewed Candidate | Reducer test and native command installed | Native semantic command dispatched | Pass with unattended-menu limit |
| Mark Keep | Revision 0 → 1 and Unreviewed → Keep | Same semantic path exercised through `NSMenu` action | Pass with unattended-menu limit |
| Edit copy | 20 frame samples; native undo restored exact copy | 20 frame samples; native undo restored exact copy | Pass |
| Create Compare Set | Four-up equal-cell screenshot inspected | Four-up equal-cell snapshot inspected | Pass |
| Assign Display Role | Distinct Font Use/Candidate/Face identities verified | System state and snapshot verified | Pass |
| Open native Import | Route, redaction, and protocol compile; dialog not shown | Real `NSOpenPanel` shown, automatically cancelled, focus restored | Pass with no-source-selected limit |
| Undo through native menu | Native role and Host undo path exercised | AppKit menu action restored exact copy | Pass with unattended-menu limit |
| Kill/reload web process | Reload completed in 217.722 ms with state/focus preserved | Reload completed in 185.811 ms with state/focus preserved; termination handler not induced | Pass for reload; termination open |
| Navigate with screen reader | Chromium tree: 608 nodes and zero unnamed interactive nodes | 48 interactive elements, zero unnamed, basic `AXGroup` host check | Partial; Orca and VoiceOver not run |

## Architecture evidence

Mutable UI/domain authority count is one: the renderer-owned `StudySession`. Electron retains only privileged Source ID → canonical path bindings. It does not mirror selection, stage, copy, review state, Compare Set, Recipes, or Font Uses.

`localStorage` holds a validated prototype reload checkpoint. It is a durable copy, not a second mutable authority, an intentional Save, or an accepted recovery design. D03 must replace it before production.

The HostBridge has four renderer requests: import, native undo, reload, and probe. Native menu events carry five semantic commands. Both directions reject extra fields and unknown variants at runtime. Import responses reject path-bearing objects.

Electron uses sandboxing, context isolation, no Node integration, local bundled content, denied window creation, denied navigation, denied permissions, and a preload-only bridge. Following [Electron's ESM guidance](https://www.electronjs.org/docs/latest/tutorial/esm), Vite bundles the sandboxed preload and protocol validators into one 2.62 kB CommonJS artifact while the main process remains ESM.

The Mac Host serves only its bundled Studio through a bounded, read-only `font-previewer://studio` scheme, uses a nonpersistent WebKit data store, exposes its reply-based bridge in the named `FontPreviewerHostBridge` content world, denies external navigation and popups, and rejects malformed or path-bearing bridge requests. These controls are prototype evidence, not a completed threat model or process-isolated font engine.

## Code surface

| Surface | Lines |
|---|---:|
| Shared Studio, domain, fixture, protocol, styles | 2,761 |
| Electron main and preload | 262 |
| Mac Host and build harness | 1,104 |
| Runtime and Host total | 4,127 |
| Tests, Linux evidence harness, SBOM generator | 618 |
| Total counted P1 source | 4,745 |

The 828-line prototype `App.tsx`, 1,095-line stylesheet, and 1,033-line all-in-one Mac evidence Host are deliberate throwaway evidence surfaces. They must not become the production module boundary by inertia. The Mac Host includes its evidence runner; configuration, workflows, and documentation are excluded from this count.

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

Final Mac run: GitHub Actions `33013245969`, macOS 14.8.7 (Build 23J520) arm64, direct Swift/AppKit/WKWebView Host build against the same production Studio bundle.

Mac results:

- ad-hoc signed `.app` built, launched, exercised, packaged, and checksummed;
- real `NSMenu` installed with Import, Keep, Undo, and Reload items; three semantic commands dispatched;
- real `NSOpenPanel` opened, automatically cancelled, and restored focus to `import-fonts-button`;
- 40 reply-bridge samples: 1 ms p95 and 1 ms maximum; WebKit's quantized performance timer makes zero-valued median samples unsuitable as literal latency claims;
- 20 input-to-frame samples: 17 ms median, 18 ms p95 and maximum;
- native undo restored specimen copy exactly;
- reload/recovery: 185.811 ms with stage, revision, and `workspace-heading` focus preserved;
- five WKWebView snapshots inspected across Review, Compare, System, Handoff, and recovered Handoff;
- 48 interactive web elements, zero unnamed; expected landmark counts; native web view exposed as an `AXGroup` with one direct child;
- nonpersistent data store, bounded read-only custom scheme, named bridge world, and 3/3 malformed or path-bearing bridge requests rejected.

These are hosted-runner diagnostics, not universal product-performance claims. Fixture names are architectural test data; P1 does not prove font-rendering fidelity.

## Native evidence and remaining environment limits

The local managed workspace has no display server, D-Bus session, Orca, Swift, macOS, WKWebView, or VoiceOver. SHA-pinned GitHub workflows provisioned Xvfb plus isolated D-Bus for Electron and an arm64 macOS runner for the AppKit/WKWebView Host.

The Linux repair loop found three real defects rather than weakening the gate: Electron's SUID sandbox helper lacked runner permissions; an ESM top-level `await app.whenReady()` deadlocked startup; reload restored state but initially dropped keyboard focus. The final run uses the configured Chromium sandbox and hard-asserts focus, stage, and revision recovery.

The Mac repair loop exposed the important bootstrap seam: the production Studio's ES modules did not launch reliably from a `file:` URL. The Host now serves only its bundled assets through a bounded custom scheme. The final false failure also exposed an accessibility-audit bug: implicit HTML labels were not recognized. The audit was corrected without weakening the unnamed-control gate.

Final evidence is committed under both `evidence/P1/2026-08-27/linux-electron-run-33010127784/` and `evidence/P1/2026-08-27/macos-wkwebview-run-33013245969/`. Linux artifact `9622173630` has digest `sha256:86af413d98ccf3c0fa420d259947909c0c4bc16df25bf31664f87e7d0878248c`. Mac evidence artifact `9623417053` has digest `sha256:1ccfdcc74b251783755faa8294858599920b7e70bdaeadafa0d5c48d8bda0acb`; packaged prototype artifact `9623417947` has digest `sha256:c3eb15a345374b3f6787306303573cb96e9a895e77234fa8c3d178f3eac979af`.

Remaining gaps: attended Linux and Mac quality reviews; human OS-menu operation; real source selection; interactive Orca and VoiceOver; full native-window chrome capture; induced WKWebView content-process termination; real font rendering.

## Veto review and decision

| Full-Studio veto | Current result |
|---|---|
| Focus is unreliable | No automated veto on either Host; stage changes and reload end on `workspace-heading`, and Mac dialog cancellation restores the import-button focus |
| Screen-reader path is materially broken | No semantic-tree veto observed; interactive Orca and VoiceOver remain unknown |
| Mac workspace cannot feel credible | No obvious composition failure in five WKWebView snapshots; complete native chrome and attended critique remain unknown |
| Bridge mirrors most UI state | Not observed; both Hosts keep the bridge narrow and privileged-only; p95 is 0.3 ms on Linux and 1 ms on Mac |
| Reload cannot recover | Not observed; actual reload preserves stage, revision, local state, and focus on both Hosts; induced WebKit termination remains open |
| Platform forks spread through Studio | Not observed; both Hosts run the same Studio and protocol, with platform code confined to Host surfaces |

No ADR is accepted or rejected. Automated Linux and Mac evidence now strongly supports Variant A because its domain locality, bridge boundary, native routes, focus, recovery, and composition hold across both Hosts. D01 stays open until the remaining human, assistive-technology, real-source, and process-termination vetoes are tested.

## Next experiment

1. Run the fixture interactively on displayed Linux: click native Import and menu items, then traverse the whole task with Orca.
2. Run it interactively on Mac: capture the complete native window, operate menus, select a redistributable font source, traverse with VoiceOver, and critique shared-Studio quality against the native reference.
3. Induce WKWebView content-process termination and require the same stage, revision, and focus recovery proven for reload.
4. If any remaining veto fires, build rough Variant B with native navigation/Inspector and a shared stage. Do not build B merely for symmetry.
5. Accept or reject D01 only after the remaining evidence matrix is complete.
