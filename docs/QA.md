# Font Previewer QA

## Reproducible local gate

From a fresh checkout with Node.js 24:

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

`npm run verify` must pass:

1. source/package/version consistency;
2. strict Studio types;
3. public-seam domain, migration, grouping, protocol, Host-utility, accessibility, and rendered-surface tests;
4. production Studio bundle;
5. Electron main and sandboxed preload compilation;
6. bundle inventory and private-data audit;
7. CycloneDX SBOM generation;
8. high-severity npm audit.

The test runner removes compiled output before every run, plants a deliberately failing stale artifact, and proves that only newly emitted test files execute.

## Exact-head hosted gate

`.github/workflows/verify.yml` checks the exact pull-request head or push SHA. A successful run on another commit is not evidence for the candidate.

### Linux Host

- Install the locked Node/Electron dependencies on Ubuntu 24.04.
- Run the complete verification suite and prove tracked source remains unchanged.
- Run a retained 500-Face, 2,000-operation, 100-recovery-round-trip diagnostic.
- Launch the displayed Electron Host under Xvfb and isolated D-Bus.
- Reject malformed and path-bearing bridge messages; prove Node is unavailable in the renderer.
- Exercise keyboard wrap, return focus, semantic labels, duplicate-ID checks, overflow checks, and Inspector/help separation.
- Discover and page the installed Catalog; prove opaque preview URLs, actual font loading, bounded results, cancellation acknowledgement, obsolete-result rejection, and no implicit Study mutation.
- Save/recover and perform transactional Handoff.
- Force Electron renderer termination and prove automatic reload, decision preservation, and focus restoration.
- Capture seven non-empty displayed states, including Simple Body Copy, and verify evidence checksums.
- Launch the native Wayland/Ozone path under a headless compositor with `DISPLAY` absent and prove a rendered Studio state.
- Build `.deb` and portable packages twice; require byte-identical checksum manifests.
- Audit package inventory, local/private paths, credential markers, source maps, licences, notices, SBOM, and font binaries.
- Extract and launch the portable package.
- Install, launch, exercise, remove, and residue-check the Debian package.
- Verify root-owned mode-4755 Chromium sandbox helper and package checksums.
- Add `SOURCE_SHA` to the exact-SHA package artifact.

### macOS Host

- Install locked Studio dependencies without downloading Electron.
- Verify the shared Simple + Studio renderer and prove tracked source remains unchanged.
- Run the retained 500-Face long-session diagnostic.
- Build the AppKit/WKWebView Host and embed the production Studio, licence, notices, SBOM, and installation guidance.
- Enable hardened runtime, sign ad hoc, and verify the signature deeply and strictly.
- Run the displayed Host, native menu/panel routes, installed Catalog, opaque font loading, cancellation, keyboard/focus/semantic checks, recovery, and transactional Handoff fault injection.
- Exercise Simple file/folder and installed-family/style intake, four-up and index boards, one-font Body Copy pages, authored and custom long copy, four colour quadrants, stress characters, five casing controls, variable axes, include/skip, and full-size preview.
- Export Body Copy transactionally, decode every page at 5,152 × 2,160, prove full text and one shared fitted size, reject mixed manifests, and prove the copy remains available after switching to Studio.
- Prove Simple-added Candidates and the active comparison sizing policy appear unchanged in Studio.
- Exercise Studio Review, Compare, System, and Handoff with contextual panes, full-width Handoff, no title/candidate truncation, and no unwanted tray on System/Handoff.
- Measure every 80–140% scale step; require no horizontal overflow and a minimum 44 px visible control at the smallest scale.
- Label the termination-callback recovery exercise as a simulation; do not claim a real induced WebKit content-process crash.
- Capture twenty-two non-empty displayed states spanning both modes, family/style dialogs, scale extremes, four-up Boards, Body Copy composition and pages, long copy, locked lines, tuning, and stage layouts.
- Extract the packaged ZIP, reverify signature, run the package journey, and remove the extracted app.
- Verify package ZIP checksum and add `SOURCE_SHA` to the exact-SHA artifact.

## Automated evidence boundaries

Hosted-runner measurements are diagnostic, not universal performance claims. Xvfb, headless Weston, and hosted macOS cannot prove independent hardware, every compositor/driver, native feel, or attended accessibility. Automated semantic labels cannot stand in for VoiceOver or Orca.

The exact final verified commit, run links, job results, package names, and checksums are recorded in [`maintenance/REPOSITORY_STATE.md`](maintenance/REPOSITORY_STATE.md) and [`maintenance/REPOSITORY_CLEANUP_2026-08-27.md`](maintenance/REPOSITORY_CLEANUP_2026-08-27.md). Historical RC evidence remains under [`archive/2026-08-27/`](archive/2026-08-27/).

## Human stable-v1 matrix

Automation cannot judge typography, screen-reader usability, native feel, or redistribution rights. Before a supported stable `v1.0.0`, use legally held fonts covering:

- static CFF OTF and TrueType;
- one-axis and multi-axis variable families;
- TTC/OTC collections with multiple Faces;
- ligatures and stylistic sets;
- missing currency, punctuation, accented Latin, and emoji/color behavior;
- Arabic, Devanagari, Hebrew, Thai, Japanese, or Korean with a competent reader;
- colliding names and noisy `VF`/`Variable` family names;
- malformed, oversized, replaced, deleted, and relinked Sources.

Run the complete journey:

- browse Catalog without changing the Study;
- search, page, rebuild, cancel, and leave during Catalog work;
- add one Source and one visible Family Group;
- duplicate a variable Candidate and prove settings/decisions remain independent;
- Review, Compare, assign Roles, Save, quit/recover, reopen on the other Host, relink, and export;
- cancel every native panel and Handoff;
- attempt Source copying without rights acknowledgement, then repeat with explicit acknowledgement and a legally redistributable font;
- compare live Review/Compare/System with PNG/PDF outputs;
- reconstruct the Handoff independently from its manifest and checksums.

## Accessibility gate

- Traverse the packaged Mac app with VoiceOver and Linux app with Orca.
- Confirm Family, style, decision, Role, grouping confidence, and Source state are understandable.
- Operate all decisions, comparison, Role assignment, Save, and Handoff without a pointer.
- Confirm modal focus trap, Escape close, return focus, stage focus, and native-panel return focus.
- Test increased contrast, reduced transparency, forced colours, reduced motion, keyboard repeat, and minimum window size.
- Record findings and exact package SHA. Semantic labels alone are not a screen-reader pass.

## Performance and containment gate

The synthetic 10,000-entry Catalog workload, cancellation contract, semantic 500-Face soak, malformed protocol/Study corpora, and synthetic hostile headers are automated. Stable `v1.0.0` still requires:

- responsive 500-Face import and 100 visible review cards on reference hardware;
- bounded memory over a displayed long Review/Compare session;
- genuine adversarial multi-format font containment beyond synthetic headers;
- induced WKWebView content-process termination and recovery;
- no per-frame font-file reads or unbounded watcher/token growth.

## Distribution gate

- Repeat install, launch, Save, recover, export, and uninstall on independent clean supported Linux images.
- Repeat portable extraction and launch on an independent machine while preserving sandbox ownership safely.
- Repeat the packaged macOS journey on an independent compatible Mac.
- Verify notices, SBOM, checksums, package contents, and `SOURCE_SHA` against the exact intended commit.
- Adopt Developer ID signing, notarisation, stapling, and Gatekeeper verification only if that future distribution model is deliberately chosen and credentials are supplied.
- Obtain explicit owner authorization before any public release.

No source font, Study, recovery file, Handoff, absolute client path, username, email address, signing secret, notarisation credential, or internal handover payload may enter Git or CI artifacts.
