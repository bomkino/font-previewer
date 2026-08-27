# Font Previewer QA

## Automated release-candidate gate

`npm run verify` must pass:

1. strict Studio types;
2. public-seam domain, grouping, protocol, Host-utility, and rendered-surface tests;
3. production Studio bundle;
4. Electron main and sandboxed preload compilation;
5. CycloneDX SBOM generation;
6. high-severity npm audit.

The test runner removes the compiled test directory before every run, plants a deliberately failing stale artifact, and proves that no stale output survives before it discovers the freshly emitted tests explicitly.

The cross-Host workflow additionally requires:

- a real displayed Electron run under Xvfb and isolated D-Bus;
- a real displayed AppKit/WKWebView run on macOS;
- native menu and panel routes;
- semantic undo/redo and keyboard-collision checks;
- named interactive controls, no duplicate IDs, no page overflow, and no Inspector-help collision;
- malformed/path-bearing bridge-request rejection;
- deterministic malformed-input corpora: 1,000 bridge messages and 250 corrupt Study documents;
- actual installed Catalog discovery and font loading through an opaque URL;
- no Study mutation from Catalog browsing;
- explicit Catalog cancellation with acknowledgement within 100 ms and obsolete-result rejection;
- a bounded 10,000-entry synthetic Catalog workload with a provisional 75 ms search budget;
- transactional Handoff and durable recovery;
- injected atomic-save and Handoff-commit failures that preserve prior data and remove staging residue;
- reload with review decision and workspace focus restored;
- six non-empty screenshots/snapshots per Host, including the installed Catalog, and a Chromium AX tree;
- packaged licence/notices, checksums, ad-hoc Mac signature integrity, package structure, and Linux sandbox ownership;
- a displayed journey from the extracted Mac ZIP, extracted Linux archive, and installed Linux `.deb`, followed by package/file removal assertions.

## Current automated result

- Remote product/evidence commit: `a5dd924265d85ec37d8022732b923ccc89cedad4`
- Exact tree: `73f865a661f6b05d6f5fad67d9af6a823c532f37`
- Exact-head workflow: [33040027604](https://github.com/bomkino/font-previewer/actions/runs/33040027604)
- Tests: 25/25
- Audit: zero known vulnerabilities
- Mac and Linux displayed/package jobs: pass
- 10,000-entry warm-search p95: 0.477 ms on hosted Linux; 0.906 ms on hosted Mac
- Catalog cancellation: 3.9 ms in the primary hosted Linux journey; 15 ms in the primary hosted Mac journey
- Package smoke artifacts: [Linux](https://github.com/bomkino/font-previewer/actions/runs/33040027604) and [Mac](https://github.com/bomkino/font-previewer/actions/runs/33040027604), retained with exact-SHA names

Hosted-runner measurements are diagnostic, not universal performance claims. The package round trips use disposable hosted runners; they do not replace an independent clean-machine matrix.

## Human release matrix

Automation cannot judge typography, screen-reader usability, native feel, or redistribution rights. Before release, use legally held fonts covering:

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
- search and page a large Catalog, rebuild, and cancel/leave during work;
- add one Source and one visible Family Group;
- duplicate a variable Candidate and prove settings/decisions stay independent;
- Review, Compare, assign Roles, Save, quit/recover, reopen on the other Host, relink, and export;
- cancel every native panel and Handoff;
- include Sources once without permission and once with explicit permission;
- compare live Review/Compare/System with PNG/PDF outputs.

## Accessibility gate

- Traverse the packaged Mac app with VoiceOver and Linux app with Orca.
- Confirm Family, style, decision, Role, grouping confidence, and source state are understandable.
- Operate all decisions, comparison, Role assignment, Save, and Handoff without a pointer.
- Confirm modal focus trap, Escape close, return focus, stage focus, and native-panel return focus.
- Test increased contrast, reduced transparency, keyboard repeat, and minimum window size.
- Record findings; semantic labels alone are not a screen-reader pass.

## Performance and stability gate

The 10,000-entry search and cancellation budgets pass on hosted CI. The following remain release blockers until measured on reference hardware or with the required corpus:

- responsive 500-Face import and 100 visible review cards;
- bounded memory over a long Review/Compare session;
- malformed-font failure containment;
- induced WKWebView content-process termination and recovery;
- no per-frame font-file reads or unbounded watcher/token growth.

## Distribution gate

- Repeat install, launch, Save, recover, export, and uninstall on independent clean supported Linux images; the disposable Ubuntu 24.04 hosted-runner round trip is already green.
- Repeat portable extraction and launch on an independent machine; the hosted-runner archive preserves the root-owned mode-4755 sandbox helper and completes the displayed journey.
- Build Mac arm64 and any promised x86_64/universal artifact; sign with Developer ID, enable hardened runtime, notarize, staple, and verify with Gatekeeper.
- Decide and test RPM if included in V1.
- Verify notices/SBOM/checksums against the exact source SHA.
- Owner reviews the draft PR and explicitly authorizes merge and release.

No source font, Study, recovery file, Handoff, absolute client path, signing secret, or notarization credential may enter Git or CI artifacts.
