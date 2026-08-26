# v0.1 release-candidate report

## Result

The autonomous implementation slice is complete and cross-Host automated evidence is green.

- Branch: `codex/v1-release-candidate`
- Draft PR: [#1](https://github.com/bomkino/font-previewer/pull/1)
- Verified remote code commit: [`704be6e`](https://github.com/bomkino/font-previewer/commit/704be6e94939b867323f735609d692c1e5c6ad67)
- Verified tree: `98ae42c9a5da2f61ba6df304d66cb0c400cbb97a`
- Automated run: [33023567900](https://github.com/bomkino/font-previewer/actions/runs/33023567900)
- Local equivalent commit: `2b9b719` (same tree; local and connector histories have different commit objects)

No merge, public release, deployment, notarization, or architecture ADR acceptance occurred.

## User journey delivered

The same Studio now completes Review, Compare, System, and Handoff in AppKit/WKWebView on macOS and sandboxed Electron on Linux.

The product includes:

- New/Open/Save/Save As with Host-owned recovery and a revision barrier before intentional Save.
- Local file/folder import, Source health, relink, reveal, opaque previews, and bounded traversal.
- A Host-local installed-font Catalog with server-side search over at most 10,000 entries, 80-entry UI pages, a 400-entry metadata cache, rebuild, next/previous navigation, and explicit Add-to-Study.
- Family Groups that repair common `VF`/`Variable` naming noise, expose confidence and static/variable relationships, add a visible family in bulk, and place up to four family Candidates into Compare.
- Independent Candidate duplication, axes, features, labels, decisions, notes, rationale, tags, and Font Uses.
- Contact Sheet, Focus, Waterfall, exact-size/fit/locked-line comparison, blind reveal, saved Comparison Sets, deck scenes, and Role assignment.
- Handoff preflight, selectable outputs, permission-gated Source copying, hidden staging, checksums, manifest, and atomic commit.
- Native menus, panels, undo/redo, semantic commands, reload recovery, focus restoration, and accessible web semantics.

Catalog discovery no longer mutates a Study. Only an explicit Add dispatches `ingest-sources`; evidence asserts the Study Candidate count is unchanged after browsing the real installed Catalog.

## Verification

| Gate | Result |
|---|---|
| Strict renderer types | Pass |
| Public-seam tests | 19/19 pass |
| Renderer production bundle | 287.8 kB raw / 85.9 kB gzip in CI |
| Electron main and sandboxed CJS preload | Pass |
| Mac Host compiler | Pass with zero warnings |
| CycloneDX SBOM | 81 components |
| npm audit | 0 known vulnerabilities |
| Linux displayed app | Native menu, semantic undo/redo, 6 screenshots, AX tree, layout, security, actual installed-font load, Catalog/Study separation, transactional Handoff, reload/focus pass |
| macOS displayed app | AppKit menu, real panel open/cancel, 6 snapshots, layout, security, CoreText Catalog, actual installed-font load, Catalog/Study separation, reload/focus pass |
| Linux packages | `.deb` and portable archive, SHA-256, root-owned mode-4755 sandbox helper, desktop entry, symlink, licence/notices pass |
| Mac package | App build, ad-hoc signature, strict verification, ZIP, checksum, licence/notices pass |

The CI gates use real fonts already installed on each runner but never commit or upload font binaries. Bridge responses are checked for `file://`, home-directory, user-directory, and drive-path leakage; preview URLs must use opaque `pitch-font://asset/` tokens and load through `FontFace`.

## Security and durability

- Electron uses sandboxing, context isolation, no Node integration, bundled local content, denied navigation/popups/permissions, and a narrow preload.
- WKWebView uses a nonpersistent store, bounded read-only Studio/font schemes, a named content world, denied external navigation/popups, and exact request parsing.
- Protocol v2 accepts a closed request/response vocabulary, exact keys, bounded strings, safe integers, and Catalog pages no larger than 200.
- Portable Studies contain no path or Binding. Host-local bindings persist separately; Mac accepts an installed-font path fallback only when the path is rediscovered through CoreText.
- Recovery and intentional Save remain distinct. Both Hosts reject stale mirror revisions and require the exact mirrored revision before Save or Handoff.
- Handoff is staged and verified before the final directory move. Source copying is off by default and requires an explicit redistribution acknowledgement.

## Remaining release gates

These remain outside the proven slice and require attended testing, reference hardware/corpora, owner decisions, or signing credentials:

1. Traverse the packaged Mac app with VoiceOver and the packaged Linux app with Orca.
2. Review full native window/menu quality and typography with 20–50 legally held production fonts, including variable, collection, missing-glyph, and complex-script cases.
3. Induce WKWebView content-process termination and inspect recovery; automated reload is already proven.
4. Run long-session, malformed-font containment, 10,000-entry synthetic performance, and clean-machine install/uninstall matrices.
5. Decide the production renderer/format tiers and accept or reject the leading workspace/durability ADRs.
6. Supply Developer ID credentials for hardened signing, notarization, and stapling; decide whether RPM is a V1 release requirement.
7. Owner reviews the draft PR and separately authorizes merge and public release.

Until those gates close, the artifacts are release candidates and evidence—not a supported public release.
