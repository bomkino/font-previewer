# Font Previewer

Font Previewer is a local typography decision tool for pitch-deck work. One shared Study now has two views inside a native AppKit/WKWebView Host on macOS and a sandboxed Electron Host on Linux:

- **Simple:** add font files, folders, or installed families; choose styles; see four-up boards immediately; tune; export.
- **Studio:** **Review → Compare → System → Handoff** for deeper decisions and packaging.

Simple and Studio are not separate projects. Fonts, styles, copy, casing, variable-axis values, order, include/skip decisions, and comparison sizing move between them through the same session. Its dark-first interface and coral-loupe mark share one idea: attention reveals character; the tool does not choose a winner for you.

It imports and inspects fonts, maintains portable `.pitchfontstudy` documents, compares Candidates, assembles typography systems, and creates transactional Handoff packages. It does not install, transform, anonymise, slant, interpolate, or repackage fonts. Those are FontBlind concerns; the products share no implementation.

## Repository status

- Canonical branch: `main`
- Source version: `0.1.0`
- Current source target: `v0.1.0-rc.3` prerelease candidate
- Latest published release: [`v0.1.0-rc.2`](https://github.com/bomkino/font-previewer/releases/tag/v0.1.0-rc.2)
- Public stable release: none

`v0.1.0-rc.3` restores the original fast font-to-board journey, adds the family/style picker and high-resolution four-up export, makes interface scaling real, and rebuilds Studio around larger, calmer decision surfaces. Published `rc.1` and `rc.2` history remains intact.

The exact current repository state, automated evidence, and remaining human gates live in [`docs/maintenance/REPOSITORY_STATE.md`](docs/maintenance/REPOSITORY_STATE.md).

## What works

- Simple mode: local file/folder upload or an installed-font picker with family-first style selection.
- Immediate four-font comparison boards, optional 12-font index pages, four-colour quadrants, stress text, five casing modes including AP Title, variable-axis tuning, reordering, include/skip, and full-size previews.
- Shared Simple/Studio state for imported styles, copy, casing, axes, ordering, decisions, and comparison sizing.
- Transactional 5,152 × 2,160 PNG board export with manifest, checksums, Study JSON, CSV, summary, and optional explicitly authorised Source copies.
- Interface scaling from 80–140%, with keyboard shortcuts, at least 44 px measured touch targets, and no title/candidate ellipsis in the verified states.
- Host-local file and folder import without font installation or upload.
- A searchable, paginated installed-font Catalog bounded to 10,000 entries; browsing cannot mutate a Study.
- Separate Source, local Binding, Face, Candidate, Recipe, Comparison Set, Font Use, Typography System, and Handoff entities.
- Exact Face indices, Host-reported metadata, independent Candidate settings, casing, tags, notes, rationale, and review decisions.
- Variable axes and named instances: CoreText on macOS; a bounded child parser on Linux.
- Family Groups, duplicate Candidates, Contact Sheet, Focus, Waterfall, live two-to-four-font comparison, saved comparison sets, the same sizing policies used by Simple, deck scenes, Role assignment, and Handoff preflight.
- Host-owned recovery distinct from intentional Save, with stale-revision rejection and focus restoration.
- Transactional Handoff staging, checksums, privacy-safe manifests, and explicitly acknowledged Source copying.
- Native menus and panels, source reveal/relink, semantic undo/redo, and a closed path-free HostBridge.

## Platforms and artifacts

| Platform | Host | Current package evidence | Boundary |
|---|---|---|---|
| macOS 13+ arm64 | AppKit + WKWebView + CoreText | Ad-hoc signed, hardened-runtime app ZIP | Not Developer-ID signed or notarised |
| Ubuntu/Debian x64 | Electron 44 + Fontconfig | `.deb` and portable `.tar.gz` | Automated hosted X11/Wayland evidence; independent machines pending |
| Browser | Development fallback | Renderer-only development server | No native Catalog, durable recovery, or transactional Handoff |

The Mac package may trigger Gatekeeper warnings. Control-click **Open** only after verifying the release checksum and trusting this repository. No Apple notarisation, stapling, or Gatekeeper acceptance is claimed.

See [`app/INSTALL.md`](app/INSTALL.md) before installing a release asset.

## Build and verify

Use Node.js `24.19.0` or a compatible Node.js 24 release.

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

Linux development and packaging:

```bash
npm run electron
npm run package:linux
```

macOS active Host package without installation:

```bash
cd ..
./build-font-previewer-app.command --no-install
```

Build, verify, install to `/Applications`, and launch:

```bash
./build-font-previewer-app.command
```

`npm run verify` checks version surfaces, strict TypeScript, public-seam tests, production Studio and Host builds, SBOM generation, bundle hygiene, and high-severity npm audit. GitHub Actions adds displayed Host journeys, recovery and Handoff fault injection, accessibility semantics, package round trips, checksums, reproducibility, X11, native Wayland/Ozone smoke, and ad-hoc signature verification.

Permanent verification is defined by [`.github/workflows/verify.yml`](.github/workflows/verify.yml). Release preparation is manual, exact-SHA guarded, dry-run first, and non-overwriting; no release is published automatically.

## Evidence versus claims

Automated CI does not prove:

- attended VoiceOver or Orca usability;
- human typography or native-interface quality;
- competent complex-script review;
- independent clean-machine reconstruction;
- broad hostile-font containment beyond the committed synthetic and malformed-input gates;
- production signing, notarisation, stapling, or Gatekeeper acceptance.

These remain explicit prerelease/stable-release gates. See [`docs/QA.md`](docs/QA.md) and the open GitHub issues.

## Documentation

- [`app/README.md`](app/README.md) — application development and package outputs
- [`app/REPORT.md`](app/REPORT.md) — current implementation report
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — durable product and Host boundaries
- [`docs/QA.md`](docs/QA.md) — reproducible automated and human gates
- [`docs/PROVENANCE.md`](docs/PROVENANCE.md) — preserved native reference provenance
- [`docs/maintenance/REPOSITORY_STATE.md`](docs/maintenance/REPOSITORY_STATE.md) — canonical current truth
- [`docs/maintenance/BRANCH_POLICY.md`](docs/maintenance/BRANCH_POLICY.md) — branch lifecycle
- [`docs/maintenance/RELEASE_POLICY.md`](docs/maintenance/RELEASE_POLICY.md) — release claims and safeguards
- [`app/DEPENDENCIES.md`](app/DEPENDENCIES.md), [`app/sbom.cdx.json`](app/sbom.cdx.json), and [`app/THIRD_PARTY_NOTICES.md`](app/THIRD_PARTY_NOTICES.md) — supply-chain record

## Preserved reference

The root `macos/` SwiftUI/CoreText application is a historical native reference extracted from `bomkino/pitch-deck-tools` at commit `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`. It is an oracle and implementation seed, not the active product or package path.

## Product boundaries

- Local-only: no account, analytics, upload, updater, or required network.
- No font installation, activation, mutation, moving, or deletion.
- No automatic winner, taste score, or fake Figma integration.
- No paid, client, copied system, or mystery font binaries in Git or packages.
- No raster-parity claim between CoreText/WebKit and Chromium.
- Public prereleases are GitHub-only; stable `v1.0.0` remains separately gated.

MIT licensed. See [`LICENSE`](LICENSE).
