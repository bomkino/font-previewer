# Wayfinder

## Actual goal

Build one trustworthy local typography-decision product—not a larger specimen viewer—through two desktop Hosts that preserve the same Study meaning.

Success means a designer can move from local Sources through Review, Compare, System, and Handoff on Mac or Linux, reopen the Study on the other platform, and understand declared renderer differences without losing decisions or leaking font files.

## Current reality

The reference branch proves useful Mac implementation techniques but not the destination architecture.

- It is a native SwiftUI/AppKit application with no shared Studio or Linux Host.
- Its schema is v3 and collapses Source, Face, Candidate, and Font Use into `FontFaceRecord`.
- It defaults new records to Maybe rather than Unreviewed.
- It stores source paths inside the portable Study.
- It autosaves into the intentional Study file and has no separate recovery mirror.
- It renders and exports through one in-process CoreText renderer.
- Its extracted reference now passes macOS tests, native smoke, packaging, re-extraction, property-list, and ad-hoc signature checks. That validates it as an oracle; it does not resolve the domain and architecture conflicts above.

## Route

1. Preserve the current Mac implementation as an oracle and engine seed.
2. Close D00 with evidence, not optimism.
3. Test the most consequential product seam first: workspace ownership.
4. Run rendering, durability, domain, and UX prototypes as isolated decisions.
5. Freeze only the tracer contracts needed for one cross-platform journey.
6. Build the tracer vertically across Mac and Linux.
7. Expand through Alpha, Beta, and release hardening without deleting reference behavior early.

## Current decision

### D00 — repository reconciliation

Status: complete on the D00 working branch.

Decision outcome:

- standalone repository boundary is correct;
- history-preserving subtree extraction is preferable to copying a snapshot;
- reference source stays intact and explicitly mapped;
- production implementation remains blocked;
- reference CI repair is complete without mutating the old domain into the new one;
- the preserved implementation can now serve as an output oracle and engine seed, not destination architecture.

## Next question

### D01 / P1 — can the full shared Studio own the workspace?

Leading hypothesis:

Use one React/TypeScript Studio for Sources/Study navigation, central stage, Inspector, stage navigation, and tray inside WKWebView and Electron. Keep documents, windows, menus, dialogs, permissions, recovery, and privileged operations in native Hosts.

Prototype must prove:

- review geometry and keyboard decisions remain immediate;
- native menu commands reach one semantic command path;
- native dialogs restore focus;
- web-process reload rehydrates without duplicated mutable state;
- semantic specimen equivalents are navigable;
- Mac does not feel like a browser page;
- Linux does not imitate Mac chrome.

Veto full-Studio ownership when:

- focus is unreliable;
- VoiceOver or Orca paths are materially broken;
- bridge code mirrors most UI state;
- platform forks spread through the Studio;
- Mac interaction quality cannot reach the reference bar.

Environment and evidence:

- Linux x86_64 workspace is available.
- Node.js 24.19.0, npm 11.9.0, and pnpm 11.19.0 are available.
- Swift, Rust, CMake, Ninja, a display server, Orca, and a local macOS runtime are unavailable.
- SHA-pinned GitHub workflows supply displayed Ubuntu 24.04 Electron and macOS 14 arm64 AppKit/WKWebView evidence environments.
- Electron `44.0.0` now completes its displayed evidence flow under Xvfb and isolated D-Bus.
- The Mac Host builds, signs ad hoc, packages, launches, and completes its WKWebView evidence flow in CI.
- Interactive Orca, VoiceOver, attended visual critique, and local platform claims still require human environments.

Current P1 result:

- Variant A exists and passes type, domain, protocol, SSR surface, build, SBOM, npm-audit, displayed-Linux Electron, and macOS WKWebView gates.
- One renderer-owned `StudySession` drives the workspace; the Host retains only privileged Source Bindings and native operations.
- The bridge carries narrow commands and opaque Source IDs, never paths or mirrored UI state.
- Linux automation proves task composition, semantic menu paths, undo, bridge/input latency, reload recovery, focus restoration, and a named Chromium accessibility tree.
- Mac automation proves the same Studio through a bounded bundled-content scheme, AppKit menu dispatch, real panel-open/cancel with focus restoration, undo, bridge/input latency, reload recovery, web semantics, and basic native accessibility hosting.
- No workspace ADR is accepted. Attended native-window quality, human menu use, real source selection, Orca, VoiceOver, and induced WebKit process termination remain mandatory.

## Decision discipline

- Facts are gathered before owner questions.
- Reversible prototype details do not require owner interruption.
- Product taste trade-offs, scope changes, licence changes, merge, and publication remain owner-visible.
- A prototype working does not accept its ADR. Evidence and veto reasoning do.
