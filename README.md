# Font Previewer

Font Previewer is a local typography-decision product for pitch-deck designers. It is being built as one product with two desktop clients:

- a native Apple-silicon Mac Host using SwiftUI, AppKit, and WKWebView;
- a first-class Linux Host using Electron;
- one shared Studio and one portable `.pitchfontstudy` contract.

The product journey is **Review → Compare → System → Handoff**. It imports local font sources without installing them, preserves exact Face and Candidate decisions, tests typography in deck contexts, and produces reconstructable handoffs.

## Status

Current milestone: **R0 — evidence and architecture decisions**.

No release is ready. The preserved macOS reference now passes its tests, native smoke run, packaging, re-extraction, property-list, and ad-hoc signature checks in macOS CI. The isolated Variant A branch also passes its automated displayed-Linux Electron evidence flow. Neither result completes the two-client product model: D01 remains open for native-control use, assistive-technology traversal, and a Mac shared-Studio experiment, and production work remains blocked until the required R0 decisions and Contract Freeze A are complete.

Start here:

- [`docs/programme/STATUS.md`](docs/programme/STATUS.md) — current truth and frontier
- [`docs/programme/RECONCILIATION.md`](docs/programme/RECONCILIATION.md) — reference audit
- [`docs/programme/WAYFINDER.md`](docs/programme/WAYFINDER.md) — decision map
- [`docs/programme/handover/00_MASTER_HANDOFF.md`](docs/programme/handover/00_MASTER_HANDOFF.md) — product authority
- [`AGENTS.md`](AGENTS.md) — repository working rules

Current prototype:

- [`prototypes/p1-shared-studio/README.md`](prototypes/p1-shared-studio/README.md) — Variant A implementation for D01 workspace ownership
- [`prototypes/p1-shared-studio/REPORT.md`](prototypes/p1-shared-studio/REPORT.md) — verified evidence, remaining limits, and next experiment

## Preserved reference

`macos/` contains the native CoreText reference extracted from [`bomkino/pitch-deck-tools`](https://github.com/bomkino/pitch-deck-tools) at:

```text
branch: codex/native-macos-font-lab
commit: be77221cb7cb809fdf119945f3fee3d2e1e72ed6
```

It demonstrates valuable implementation ideas:

- CoreText Face enumeration and collection indices;
- variable axes and feature selectors;
- shared live/export CoreText rendering;
- source watching and relinking;
- atomic staged exports;
- a Foundation-only core package.

It also contains model and architecture conflicts documented in `RECONCILIATION.md`. Treat it as an oracle and engine seed, not current product authority.

## Reference build

On macOS with Apple command-line developer tools:

```bash
swift test --package-path macos
./build-font-previewer-app.command --no-install
```

On non-macOS systems, only the Foundation-only Swift target is intended to compile. This workspace currently has no Swift toolchain, so no local Swift result is claimed.

## Product boundaries

- Local-only V1. No account, analytics, upload, or required network.
- No font installation, activation, mutation, moving, or deletion.
- No taste score or automatic winner.
- No paid, client, or mystery font binaries in Git.
- No fake Figma integration.
- No Mac/Linux pixel-parity claim; renderer differences must be declared.
- No merge, release, or deployment by inference.

## Repository provenance

This repository preserves the Font Previewer subdirectory history from `pitch-deck-tools`; the source repository and its reference branch remain unchanged. See [`docs/PROVENANCE.md`](docs/PROVENANCE.md).

## Licence

MIT. See [`LICENSE`](LICENSE).
