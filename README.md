# Font Previewer

Font Previewer is a local desktop decision tool for choosing typography for pitch decks. One shared Studio runs inside a native AppKit/WKWebView Host on macOS and a sandboxed Electron Host on Linux. Both use the same portable `.pitchfontstudy` v4 document and the same workflow:

**Review → Compare → System → Handoff**

## Release-candidate status

The v0.1 implementation is isolated on [`codex/v1-release-candidate`](https://github.com/bomkino/font-previewer/tree/codex/v1-release-candidate) with a [draft pull request](https://github.com/bomkino/font-previewer/pull/1). Automated macOS and Linux gates build and launch the production desktop Hosts, exercise displayed UI, native menus and dialogs, recovery, accessibility semantics, the installed-font Catalog, and transactional Handoff, then inspect the package candidates and artifact integrity.

This is not a public release. The remaining release blockers require a person or distribution credentials: attended VoiceOver and Orca journeys, typography review with legally held production fonts, clean-machine install/uninstall checks, Developer ID signing/notarization, and the owner’s merge/release decision.

## What works

- Host-local file/folder import without font installation or upload.
- A searchable, paginated installed-font Catalog indexing up to 10,000 entries; Catalog results enter a Study only through an explicit Add action.
- Separate Source, local Binding, Face, Candidate, Recipe, Comparison Set, Font Use, Typography System, and Handoff entities.
- Exact Face indices, variable axes, named instances, OpenType features, casing, tags, notes, rationale, and review decisions.
- Family Groups with normalized-name confidence, static/variable disclosure, bulk add, Candidate duplication, and family-to-Compare actions.
- Contact Sheet, Focus, Waterfall, blind comparison, fit policies, deck scenes, Role assignment, and preflighted Handoff.
- Host-owned recovery distinct from intentional Save, with stale-revision rejection and reload/focus restoration.
- Transactional Handoff staging, checksums, privacy-safe manifests, and an explicit permission gate before copying font Sources.
- Native menus, native panels, source reveal/relink, semantic undo/redo, and a bounded path-free HostBridge.

## Platforms and artifacts

| Platform | Host | Current artifact |
|---|---|---|
| macOS 13+ | AppKit + WKWebView + CoreText discovery | Current-architecture ad-hoc signed `.app` ZIP |
| Ubuntu/Debian x64 | Electron 44 + Fontconfig discovery | `.deb` and portable `.tar.gz` |
| Browser | Development fallback only | No native Catalog, durable recovery, or transactional Handoff |

CI artifacts are attached to the release-candidate workflow runs; they are evidence builds, not endorsed downloads.

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

The Mac builder requires Apple command-line developer tools and signs ad hoc. It does not use a Developer ID identity or notarize.

## Architecture and evidence

- [`app/README.md`](app/README.md) — application development and packaging
- [`app/REPORT.md`](app/REPORT.md) — exact release-candidate evidence and open gates
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — authority, HostBridge, persistence, and security boundaries
- [`docs/QA.md`](docs/QA.md) — automated and human release gates
- [`docs/programme/STATUS.md`](docs/programme/STATUS.md) — current programme truth
- [`app/DEPENDENCIES.md`](app/DEPENDENCIES.md), [`app/sbom.cdx.json`](app/sbom.cdx.json), and [`app/THIRD_PARTY_NOTICES.md`](app/THIRD_PARTY_NOTICES.md) — supply-chain record

## Preserved reference

`macos/` is the original native CoreText reference extracted from `bomkino/pitch-deck-tools` at commit `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`. It remains an oracle and implementation seed, not the release-candidate application. See [`docs/PROVENANCE.md`](docs/PROVENANCE.md).

## Product boundaries

- Local-only V1: no account, analytics, upload, or required network.
- No font installation, activation, mutation, moving, or deletion.
- No automatic winner or taste score.
- No paid, client, system, or mystery font binaries in Git.
- No raster-parity claim between CoreText/WebKit and Chromium.
- No merge, release, signing-identity use, or deployment by inference.

MIT licensed. See [`LICENSE`](LICENSE).
