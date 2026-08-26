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
- Its current reference SHA fails macOS CI before tests or packaging run.

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
- reference CI repair is a prerequisite for treating Mac output as an oracle, but it must not mutate the old domain into the new one by stealth.

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

Environment limits:

- Linux x86_64 workspace is available.
- Node.js 24.19.0, npm 11.9.0, and pnpm 11.19.0 are available.
- Swift, Rust, CMake, Ninja, Electron, and a local macOS runtime are unavailable.
- Mac build, WKWebView, VoiceOver, signing, and visual claims require external macOS evidence.

## Decision discipline

- Facts are gathered before owner questions.
- Reversible prototype details do not require owner interruption.
- Product taste trade-offs, scope changes, licence changes, merge, and publication remain owner-visible.
- A prototype working does not accept its ADR. Evidence and veto reasoning do.
