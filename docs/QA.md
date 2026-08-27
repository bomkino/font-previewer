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
- a second displayed Electron run through native Wayland/Ozone under a headless compositor;
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
- exact Linux collection-face metadata and rejection of malformed/truncated metadata plus an actual truncated font file;
- a retained 500-Face, 2,000-operation, 100-recovery-round-trip diagnostic on both runner architectures;
- transactional Handoff and durable recovery;
- injected atomic-save and Handoff-commit failures that preserve prior data and remove staging residue;
- reload with review decision and workspace focus restored;
- forced Electron renderer termination with automatic recovery, preserved decision, and restored focus;
- six non-empty screenshots/snapshots per Host, including the installed Catalog, and a Chromium AX tree;
- packaged licence/notices, checksums, ad-hoc Mac signature integrity, package structure, and Linux sandbox ownership;
- a displayed journey from the extracted Mac ZIP, extracted Linux archive, and installed Linux `.deb`, followed by package/file removal assertions.
- two byte-identical Linux package builds plus payload inventory, private-path, credential-marker, and application-source-map audits.

## Current automated result

- Remote product/evidence commit: `5d368650436bd2b1aca6f7efdf8825087a65d4e3`
- Exact tree: `ebfbce480d26e05d75cdd6f5b2a0a92d24883dd9`
- Exact-head workflow: [33043015559](https://github.com/bomkino/font-previewer/actions/runs/33043015559)
- Tests: Linux 28/28; Mac 27 pass plus one Linux-only skip
- Audit: zero known vulnerabilities
- Mac and Linux displayed/package jobs: pass
- 10,000-entry warm-search p95: 0.408 ms on hosted Linux; 0.253 ms on hosted Mac
- 500-Face soak: stable counts across 2,000 operations/100 recovery round trips; final post-GC heap growth about 1.55 MB on each Host
- Catalog cancellation: 3.9 ms in the primary hosted Linux journey; 15 ms in the primary hosted Mac journey
- Package, displayed, package-smoke, and soak artifacts: [exact-head workflow](https://github.com/bomkino/font-previewer/actions/runs/33043015559), eight retained exact-SHA archives

Hosted-runner measurements are diagnostic, not universal performance claims. The package round trips use disposable hosted runners; they do not replace an independent clean-machine matrix.

## Human stable-v1 matrix

Automation cannot judge typography, screen-reader usability, native feel, or redistribution rights. Before a supported stable v1.0, use legally held fonts covering:

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

The 10,000-entry search/cancellation and the semantic 500-Face long-session diagnostic pass on hosted CI. Synthetic hostile headers now exercise every supported extension through the bounded Linux inspector, and forced Electron renderer termination is an automated evidence gate. The following remain stable-v1 blockers until measured on reference hardware or with the required corpus:

- responsive 500-Face import and 100 visible review cards;
- bounded memory over a displayed long Review/Compare session on reference hardware;
- hostile-font failure containment with a genuine adversarial multi-format corpus beyond synthetic headers;
- induced WKWebView content-process termination and recovery;
- no per-frame font-file reads or unbounded watcher/token growth.

## Distribution gate

- Repeat install, launch, Save, recover, export, and uninstall on independent clean supported Linux images; the disposable Ubuntu 24.04 hosted-runner round trip is already green.
- Repeat portable extraction and launch on an independent machine; the hosted-runner archive preserves the root-owned mode-4755 sandbox helper and completes the displayed journey.
- Build Mac arm64 with hardened runtime. Developer ID signing, notarization, stapling, and Gatekeeper verification apply only if that future distribution model is adopted; v0.1 is explicitly ad-hoc and unnotarized.
- Decide and test RPM if included in V1.
- Verify notices/SBOM/checksums against the exact source SHA.
- Owner authorization is recorded in [`programme/RELEASE_DECISION_PACKET.md`](programme/RELEASE_DECISION_PACKET.md); exact-head CI must still pass before every publication.

No source font, Study, recovery file, Handoff, absolute client path, signing secret, or notarization credential may enter Git or CI artifacts.
