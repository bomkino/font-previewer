# Font Previewer QA

## Automated release-candidate gate

`npm run verify` must pass:

1. strict Studio types;
2. public-seam domain, grouping, protocol, Host-utility, and rendered-surface tests;
3. production Studio bundle;
4. Electron main and sandboxed preload compilation;
5. CycloneDX SBOM generation;
6. high-severity npm audit.

The cross-Host workflow additionally requires:

- a real displayed Electron run under Xvfb and isolated D-Bus;
- a real displayed AppKit/WKWebView run on macOS;
- native menu and panel routes;
- semantic undo/redo and keyboard-collision checks;
- named interactive controls, no duplicate IDs, no page overflow, and no Inspector-help collision;
- malformed/path-bearing bridge-request rejection;
- actual installed Catalog discovery and font loading through an opaque URL;
- no Study mutation from Catalog browsing;
- transactional Handoff and durable recovery;
- reload with review decision and workspace focus restored;
- six non-empty screenshots/snapshots per Host, including the installed Catalog, and a Chromium AX tree;
- packaged licence/notices, checksums, signature/package structure, and Linux sandbox ownership.

## Current automated result

- Remote code commit: `704be6e94939b867323f735609d692c1e5c6ad67`
- Workflow: [33023567900](https://github.com/bomkino/font-previewer/actions/runs/33023567900)
- Tests: 19/19
- Audit: zero known vulnerabilities
- Mac and Linux displayed/package jobs: pass

Hosted-runner measurements are diagnostic, not universal performance claims.

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

The following remain release blockers until measured on reference hardware:

- 10,000-entry Catalog query at the provisional ≤75 ms search budget after indexing;
- responsive 500-Face import and 100 visible review cards;
- bounded memory over a long Review/Compare session;
- cancellation and rebuild without stale results;
- malformed-font failure containment;
- induced WKWebView content-process termination and recovery;
- no per-frame font-file reads or unbounded watcher/token growth.

## Distribution gate

- Install, launch, Save, recover, export, and uninstall the `.deb` on a clean supported Linux image.
- Extract and launch the portable archive without changing its sandbox-helper guarantees.
- Build Mac arm64 and any promised x86_64/universal artifact; sign with Developer ID, enable hardened runtime, notarize, staple, and verify with Gatekeeper.
- Decide and test RPM if included in V1.
- Verify notices/SBOM/checksums against the exact source SHA.
- Owner reviews the draft PR and explicitly authorizes merge and release.

No source font, Study, recovery file, Handoff, absolute client path, signing secret, or notarization credential may enter Git or CI artifacts.
