# v0.1 release-candidate hardening report

## Result

The isolated autonomous hardening slice is complete and exact-head cross-Host evidence is green.

- Release-candidate base: `codex/v1-release-candidate` at `a31777e2b2bd30bc76c49a540c19715068d8e6b7`
- Isolated branch: `codex/v1-release-candidate-hardening-02`
- Draft PR: [#2](https://github.com/bomkino/font-previewer/pull/2)
- Verified product/evidence commit: [`a5dd924`](https://github.com/bomkino/font-previewer/commit/a5dd924265d85ec37d8022732b923ccc89cedad4)
- Verified tree: `73f865a661f6b05d6f5fad67d9af6a823c532f37`
- Exact-head automated run: [33040027604](https://github.com/bomkino/font-previewer/actions/runs/33040027604)

No merge, public release, deployment, production signing, notarization, attended accessibility claim, or architecture ADR acceptance occurred.

## Hardening delivered

- The test command removes all compiled test output, proves a planted stale failure cannot survive, and invokes only explicitly discovered fresh test files.
- Catalog indexing/search is independently bounded to 10,000 normalized entries. A 10,050-entry corpus verifies truncation and 100 warm searches record diagnostic p95 latency.
- Both Hosts support explicit Catalog cancellation, invalidate obsolete generations, and reject stale results. Linux also terminates an active `fc-list` child process.
- Protocol progress rejects impossible values. One thousand deterministic malformed messages and 250 seeded corrupt Study documents are rejected without state corruption.
- Atomic Study writes clean their temporary sidecar on every failure. Injected commit failures preserve the previous intentional save byte-for-byte.
- Transactional Handoff commit failures preserve the prior export, remove staging, and leave no failed final directory; Mac displayed evidence exercises this path.
- The extracted Mac ZIP, extracted Linux archive, and installed Linux `.deb` each run the displayed critical journey. The Linux test then removes the package and asserts its symlink, application tree, desktop entry, and icon are absent.

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
| Public-seam tests | 25/25 pass; stale compiled output rejected |
| Renderer production bundle | 288.6 kB raw / 86.1 kB gzip |
| Electron main and sandboxed CJS preload | Pass |
| Mac Host compiler | Pass with zero warnings |
| CycloneDX SBOM | 81 components |
| npm audit | 0 known vulnerabilities |
| Synthetic Catalog | 10,000-entry bound; 100 warm searches; p95 0.477 ms Linux / 0.906 ms Mac on hosted runners |
| Linux displayed app | Native menu, semantic undo/redo, 6 screenshots, AX tree, layout, security, actual installed-font load, Catalog/Study separation, 3.9 ms cancellation, transactional Handoff, reload/focus pass |
| macOS displayed app | AppKit menu, real panel open/cancel, 6 snapshots, layout, security, CoreText Catalog, actual installed-font load, Catalog/Study separation, 15 ms cancellation, Handoff fault recovery, reload/focus pass |
| Linux packages | `.deb` and portable archive, SHA-256, root-owned mode-4755 sandbox helper, displayed journeys, install/removal/residue assertions, desktop entry, symlink, licence/notices pass |
| Mac package | App build, ad-hoc signature integrity, strict verification, ZIP/checksum, extracted displayed journey, removal, licence/notices pass |

The CI gates use real fonts already installed on each runner but never commit or upload font binaries. Bridge responses are checked for `file://`, home-directory, user-directory, and drive-path leakage; preview URLs must use opaque `pitch-font://asset/` tokens and load through `FontFace`. Hosted timings and disposable-runner package journeys are diagnostic evidence, not reference-hardware or independent clean-machine claims.

## Security and durability

- Electron uses sandboxing, context isolation, no Node integration, bundled local content, denied navigation/popups/permissions, and a narrow preload.
- WKWebView uses a nonpersistent store, bounded read-only Studio/font schemes, a named content world, denied external navigation/popups, and exact request parsing.
- Protocol v2 accepts a closed request/response vocabulary, exact keys, bounded strings, safe integers, and Catalog pages no larger than 200.
- Protocol and Study corruption corpora are deterministic, bounded, and exercise 1,250 invalid documents/messages without preserving rejected state.
- Portable Studies contain no path or Binding. Host-local bindings persist separately; Mac accepts an installed-font path fallback only when the path is rediscovered through CoreText.
- Recovery and intentional Save remain distinct. Both Hosts reject stale mirror revisions and require the exact mirrored revision before Save or Handoff. Injected write-commit failure leaves the prior intentional save byte-identical and cleans the temporary sidecar.
- Handoff is staged and verified before the final directory move. Injected commit failure leaves the prior export byte-identical and removes staging. Source copying is off by default and requires an explicit redistribution acknowledgement.

## Remaining release gates

These remain outside the proven slice and require attended testing, independent reference hardware/machines or corpora, owner decisions, or signing credentials:

1. Traverse the packaged Mac app with VoiceOver and the packaged Linux app with Orca.
2. Review full native window/menu quality and typography with 20–50 legally held production fonts, including variable, collection, missing-glyph, and complex-script cases.
3. Induce WKWebView content-process termination and inspect recovery; automated reload is already proven.
4. Run 500-Face/100-card, long-session memory, hostile-font containment, and reference-hardware budgets. The bounded 10,000-entry hosted diagnostic and basic corrupt-input corpora already pass.
5. Repeat Mac and Linux install/launch/uninstall on independent clean supported machines. Disposable hosted-runner ZIP/archive/`.deb` round trips already pass.
6. Decide the production renderer/format tiers and accept or reject the leading workspace/durability ADRs.
7. Supply Developer ID credentials for hardened signing, notarization, and stapling; decide whether RPM and additional Mac architectures are V1 requirements.
8. Owner reviews the draft PR and separately authorizes merge and public release.

Until those gates close, the artifacts are release candidates and evidence—not a supported public release.
