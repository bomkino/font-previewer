# Font Previewer

Font Previewer is a local desktop decision tool for choosing typography for pitch decks. One shared Studio runs inside a native AppKit/WKWebView Host on macOS and a sandboxed Electron Host on Linux. Both use the same portable `.pitchfontstudy` v4 document and the same workflow:

**Review → Compare → System → Handoff**

## Public prerelease status

The owner approved the current v0.1 candidate for a free GitHub prerelease after exact-head CI. [PR #2](https://github.com/bomkino/font-previewer/pull/2) integrates the isolated hardening branch into `codex/v1-release-candidate`; it does not merge to `main`. Automated macOS and Linux gates build and launch the desktop Hosts, exercise displayed UI, native menus and dialogs, recovery, accessibility semantics, the installed-font Catalog, variable-font metadata, and transactional Handoff, then inspect package integrity.

The macOS archive is ad-hoc signed with hardened runtime, not Developer-ID signed or notarized. macOS may warn or block a normal first launch; Control-click the app and choose **Open** only if you trust this repository. Attended VoiceOver/Orca, typography review, independent reconstruction, hostile-font corpus testing, and independent clean-machine evidence remain unverified. Those are disclosed prerelease limitations, not completed claims.

## What works

- Host-local file/folder import without font installation or upload.
- A searchable, paginated installed-font Catalog indexing up to 10,000 entries; Catalog results enter a Study only through an explicit Add action.
- Separate Source, local Binding, Face, Candidate, Recipe, Comparison Set, Font Use, Typography System, and Handoff entities.
- Exact Face indices and Host-reported metadata, plus independent Candidate settings, casing, tags, notes, rationale, and review decisions. CoreText supplies variable axes on Mac; Linux uses a timeout/output-bounded parser child for axes and named instances.
- Family Groups with normalized-name confidence, static/variable disclosure, bulk add, Candidate duplication, and family-to-Compare actions.
- Contact Sheet, Focus, Waterfall, blind comparison, fit policies, deck scenes, Role assignment, and preflighted Handoff.
- Host-owned recovery distinct from intentional Save, with stale-revision rejection and reload/focus restoration.
- Transactional Handoff staging, checksums, privacy-safe manifests, and Source copies enabled by default for the internal workflow with an opt-out.
- Native menus, native panels, source reveal/relink, semantic undo/redo, and a bounded path-free HostBridge.

## Platforms and artifacts

| Platform | Host | Current artifact |
|---|---|---|
| macOS 13+ arm64 | AppKit + WKWebView + CoreText discovery | Hardened-runtime, ad-hoc signed `.app` ZIP; not notarized |
| Ubuntu/Debian x64 | Electron 44 + Fontconfig discovery | `.deb` and portable `.tar.gz` |
| Browser | Development fallback only | No native Catalog, durable recovery, or transactional Handoff |

Verified prerelease downloads are published on [GitHub Releases](https://github.com/bomkino/font-previewer/releases). CI artifacts remain exact-SHA evidence.

Installation and first-launch details—including the unsigned Mac warning and Linux sandbox requirements—are in [`app/INSTALL.md`](app/INSTALL.md).

## Build and run

Use Node.js 24 or newer.

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

Linux:

```bash
npm run electron
npm run package:linux
```

macOS:

```bash
./scripts/build-macos-host.sh
open "output/macos-host/Font Previewer.app"
```

The Mac builder requires Apple command-line developer tools, enables hardened runtime, and signs ad hoc. It does not use a Developer ID identity or notarize.

## Architecture and evidence

- [`app/README.md`](app/README.md) — application development and packaging
- [`app/REPORT.md`](app/REPORT.md) — exact release-candidate evidence and open gates
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — authority, HostBridge, persistence, and security boundaries
- [`docs/QA.md`](docs/QA.md) — automated and human release gates
- [`docs/programme/STATUS.md`](docs/programme/STATUS.md) — current programme truth
- [`docs/programme/CAPABILITY_PARITY.md`](docs/programme/CAPABILITY_PARITY.md) — reference/Host parity and migration disposition
- [`docs/programme/RELEASE_DECISION_PACKET.md`](docs/programme/RELEASE_DECISION_PACKET.md) — owner choices, limitations, and release notes
- [`app/DEPENDENCIES.md`](app/DEPENDENCIES.md), [`app/sbom.cdx.json`](app/sbom.cdx.json), and [`app/THIRD_PARTY_NOTICES.md`](app/THIRD_PARTY_NOTICES.md) — supply-chain record

## Preserved reference

`macos/` is the original native CoreText reference extracted from `bomkino/pitch-deck-tools` at commit `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`. It remains an oracle and implementation seed, not the release-candidate application. See [`docs/PROVENANCE.md`](docs/PROVENANCE.md).

## Product boundaries

- Local-only V1: no account, analytics, upload, or required network.
- No font installation, activation, mutation, moving, or deletion.
- No automatic winner or taste score.
- No paid, client, system, or mystery font binaries in Git.
- No raster-parity claim between CoreText/WebKit and Chromium.
- Public v0.1 prereleases are GitHub-only; stable `v1.0.0` remains separately gated.

MIT licensed. See [`LICENSE`](LICENSE).
