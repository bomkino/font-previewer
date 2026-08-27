# Programme status

> **Current-status pointer — 2026-08-28**
>
> The implementation programme has completed its merge into canonical `main`. This file no longer maintains an independent branch or milestone truth. Use [`../maintenance/REPOSITORY_STATE.md`](../maintenance/REPOSITORY_STATE.md) for current repository status, [`../../app/REPORT.md`](../../app/REPORT.md) for the current implementation report, and [`../QA.md`](../QA.md) for reproducible gates.

## Current summary

- Canonical branch: `main`
- Source version: `0.1.0`
- Latest published prerelease: `v0.1.0-rc.2`
- Current source: the exact source named by that release's `SOURCE_SHA`
- RC, hardening, and pre-Mac implementation: merged into `main`
- Active product: shared Studio plus macOS AppKit/WKWebView Host and Linux Electron Host
- Preserved reference: root `macos/` SwiftUI/CoreText application
- Permanent automated gate: `.github/workflows/verify.yml`
- Public stable release: not claimed

## Remaining gates

- attended VoiceOver and Orca;
- human typography, native-interface, and competent complex-script review;
- independent clean-machine reconstruction and broader reference-hardware measurements;
- hostile cross-format font containment beyond current automated fixtures;
- induced WKWebView content-process termination;
- optional Developer ID signing/notarisation only if a future paid distribution path is deliberately adopted;
- explicit authorization for any future public release after `v0.1.0-rc.2`.

Historical status before canonicalisation is preserved at [`../archive/2026-08-27/PROGRAMME_STATUS_PRE_MAIN.md`](../archive/2026-08-27/PROGRAMME_STATUS_PRE_MAIN.md). Old ticket and handover documents remain evidence, not current merge or release instructions.
