# Font Previewer Status

## Baseline

- source repository: `bomkino/pitch-deck-tools`
- reference branch: `codex/native-macos-font-lab`
- reference SHA: `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`
- standalone extracted SHA: `f89cde8c3e6e347e29829e5bcd7ee59160d7b3ad`
- working branches: `prototype/p1-full-shared-studio` (Linux) and `prototype/p1-macos-shared-studio` (Mac)
- latest verified Linux shared-runtime SHA: `0623d98c3f9895be30c596dd7dcc988b73dce7bf`
- latest verified Mac shared-runtime SHA: `f6acb4451f4fbe7946b492cf0f9c90adea32c595`
- latest verified Mac reference SHA: `d0d3cf9a4b1e6839021f562c6ec88e99f8f0b302`
- latest verified Linux run: `33010127784`; displayed Electron evidence is green
- latest verified Mac shared-Studio run: `33013245969`; AppKit/WKWebView evidence is green

## Current milestone

R0 — evidence and architecture decisions.

## Current frontier

- D00 / P0 reconciliation: complete at `c707590`.
- D01 / P1 workspace ownership: Variant A passes automated displayed-Linux and macOS WKWebView evidence; attended native-window, assistive-technology, real-source-selection, and WebKit-termination evidence remain incomplete.
- D02 / P2 rendering research may proceed independently, but no renderer decision is accepted.

## Claimed work

- Primary agent claims D01 / P1 on `prototype/p1-full-shared-studio` and `prototype/p1-macos-shared-studio`.
- Scope: Variant A, a full shared Studio, using the canonical 24-Candidate fixture with narrow Electron and AppKit/WKWebView Hosts.
- Implemented evidence: explicit Source/Binding/Face/Candidate/Font Use model, semantic command tests, recovery validation, runtime-validated bridges, secure local shells, native menu/dialog routes, four-stage Studio, and dependency SBOM.
- Linux automation now records native menu structure, semantic commands, undo, Compare/System/Handoff composition, bridge and input latency, actual reload recovery, focus restoration, screenshots, and the Chromium accessibility tree.
- Mac automation now records AppKit menu dispatch, a real automatically-cancelled `NSOpenPanel`, undo, the same composition, bridge and input latency, reload/focus recovery, screenshots, web semantics, basic native accessibility hosting, and bridge-security rejections.
- Decision remains open until attended native-control and window critique, real source selection, interactive Orca/VoiceOver, and induced WebKit content-process termination are recorded.

## Open decisions

- D01 — full shared Studio versus narrowed shared stage versus separate UIs.
- D02 — interactive renderer, reference renderer, Linux backend, and format tiers.
- D03 — Study authority, mirror, recovery, and Save barrier.
- D04 — Study v4 and migration.
- D05 — UX composition and visible stage labels.
- D06 — Mac documents, sandbox, engine isolation, and minimum OS.
- D07 — Linux process transport and package set.
- D08 — cross-platform accessibility and security contract.
- D09 — tracer contract freeze.

## Accepted ADRs

- ADR-001 — one product, two Hosts.
- ADR-002 — Mac reference, Linux first-class.
- ADR-003 — Review, Compare, System, Handoff.
- ADR-004 — Catalog separate from Study.
- ADR-005 — Source, Face, Candidate, Font Use are distinct.
- ADR-006 — portable IDs are not paths or names.
- ADR-007 — new Candidates are Unreviewed.
- ADR-008 — semantic parity, not raster parity.
- ADR-009 — local-only V1.
- ADR-010 — no font installation mutation.
- ADR-011 — expand–contract migration.
- ADR-012 — risk-led public-seam testing.
- ADR-013 — owner controls irreversible actions.

## Evidence

- `docs/programme/RECONCILIATION.md`
- `evidence/D00/2026-08-26/fixture-manifest.json`
- `evidence/D00/2026-08-26/reference-output-index.json`
- `evidence/D00/2026-08-26/repository-inventory.json`
- GitHub Actions run `33008885071`: Mac reference tests, smoke, packaging, re-extraction, plist, signature, and artifacts pass.
- GitHub Actions run `33010127784`: P1 Linux typecheck, 10 tests, builds, displayed Electron task flow, recovery, accessibility tree, and artifact upload pass.
- GitHub Actions run `33013245969`: P1 Mac typecheck, tests, bundle, ad-hoc app build/signing, AppKit/WKWebView task flow, native panel, reload/focus recovery, semantic-accessibility checks, screenshots, and artifact uploads pass.
- Source equivalence check: extracted `macos/` tree matches the reference subtree.
- `prototypes/p1-shared-studio/REPORT.md`
- `evidence/P1/2026-08-27/environment.json`
- `evidence/P1/2026-08-27/verification.json`
- `evidence/P1/2026-08-27/linux-electron-run-33010127784/` preserves five screenshots, the 608-node accessibility tree, structured trace, metadata, and checksums.
- `evidence/P1/2026-08-27/macos-wkwebview-run-33013245969/` preserves five snapshots, structured trace, Host log, artifact metadata, and checksums.
- 10 public-seam/domain/protocol tests pass; renderer and Electron TypeScript builds pass.
- CycloneDX 1.6 SBOM contains 81 resolved components; npm audit reports zero known vulnerabilities.

## Risks changed

- Reduced: reference Swift 6 compile failures are repaired; Mac CI now produces verified app and smoke artifacts.
- Reduced: displayed Linux evidence now covers composition, latency, undo, reload, focus, and accessibility semantics.
- Reduced: macOS WKWebView evidence now covers shared-Studio bootstrap, AppKit menu routing, real panel focus restoration, composition, latency, undo, reload, and web semantics.
- Clarified: current schema collapses Source, Face, Candidate, and Font Use and defaults imports to Maybe.
- Clarified: current autosave writes the intentional document; it is not crash recovery.
- Reduced: standalone history extraction preserves the reference implementation without changing the source repository.
- Reduced: P1 does not repeat the reference domain collapse; Font Use and Source Binding are explicit and separately validated.
- Reduced: Electron renderer has no Node access, uses context isolation and sandboxing, and receives no source path.
- Increased: the first Linux evidence run exposed an Electron ESM ready deadlock; fixed without weakening the product sandbox.
- Increased then reduced: reload initially lost keyboard focus; the final run hard-asserts restored workspace focus.
- Increased then reduced: the Mac ES-module Studio failed to bootstrap reliably under `file:`; a bounded read-only custom scheme now serves only bundled resources.
- Remaining: attended OS-menu/window critique, real source selection, interactive Orca and VoiceOver, complete native-chrome capture, and induced WebKit content-process termination remain unproven.
- Clarified: renderer `localStorage` is a prototype reload checkpoint, not the accepted D03 recovery architecture.

## Packages

- Mac: verified ad-hoc app ZIP and native smoke artifacts from run `33008885071`; this is CI evidence, not a public release.
- Mac P1: verified ad-hoc AppKit/WKWebView prototype ZIP and evidence artifacts from run `33013245969`; this is architecture evidence, not a package candidate.
- Linux: Electron `44.0.0` P1 evidence build verified under Ubuntu 24.04, Xvfb, and isolated D-Bus; this is a prototype, not a package candidate.

## Owner gates

- Standalone repository is public at `bomkino/font-previewer`.
- No merge, public release, deployment, signing identity use, or source-font delivery authorized.
- P1 remains isolated on `prototype/p1-full-shared-studio` and `prototype/p1-macos-shared-studio`; no D01 ADR has been accepted.

## Latest update

- date: 2026-08-27
- author: primary agent
- summary: standalone repository is live; Mac reference CI plus automated Linux Electron and Mac WKWebView P1 evidence are green. Variant A survives automated cross-Host bridge, focus, recovery, latency, composition, native-route, and semantic-accessibility gates. D01 stays open for attended controls/window quality, real source selection, Orca, VoiceOver, and WebKit process termination.
