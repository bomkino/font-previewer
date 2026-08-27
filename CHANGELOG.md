# Changelog

## Pre-Mac hardening

- Added bounded subprocess supervision for Linux font metadata and variation inspection, with forced termination, output ceilings, and normalized failures.
- Added synthetic hostile headers across every supported font extension, strict recovery-envelope parsing, interrupted-Handoff cleanup, and real forced Electron renderer-crash recovery.
- Denied renderer requests outside the bundled Studio, opaque font capabilities, and an explicit local development origin.
- Added forced-colors support while retaining reduced-motion behavior.
- Removed production source maps and added bundle/package inventory, private-path, credential-marker, and application-source-map audits.
- Embedded installation guidance, SBOM, dependency inventory, licence, and notices in package candidates.
- Made Linux tar/deb packaging reproducible from `SOURCE_DATE_EPOCH`; repeated local package builds produce identical checksums.
- Added a hosted native Wayland/Ozone displayed-evidence path alongside X11 and labelled the Mac termination-callback simulation honestly.

## 0.1.0 — Release candidate

### Added

- One shared Review → Compare → System → Handoff Studio across macOS AppKit/WKWebView and Linux Electron Hosts.
- Portable Study v4 with distinct Source, Binding, Face, Candidate, Recipe, Comparison Set, Font Use, Typography System, and Handoff concepts.
- Host-local recovery separate from intentional Save and guarded by monotonic revisions.
- Native menus, native file panels, relink/reveal, semantic undo/redo, reload recovery, and focus restoration.
- File/folder import with bounded canonical traversal and opaque font preview capabilities.
- CoreText and Fontconfig installed-font Catalogs with server-side search, 10,000-entry bound, pagination, bounded metadata cache, rebuild, and explicit Add-to-Study.
- Family Groups with normalized naming confidence, static/variable disclosure, bulk visible-family add, Candidate duplication, and Compare-family action.
- Contact Sheet, Focus, Waterfall, fit policies, blind Compare, saved sets, deck scenes, system Roles, and contextual inspection.
- Transactional Handoff with PNG/PDF/summary/JSON/CSV options, staging, manifest, checksums, and permission-gated Source copying.
- Sandboxed Electron preload and bounded WKWebView content-world bridge.
- Linux `.deb` and portable archive plus an ad-hoc signed Mac app ZIP.
- CycloneDX SBOM, third-party notices, immutable CI action pins, displayed cross-Host evidence, accessibility semantics, and package-integrity gates.

### Fixed during evidence

- Preserved Source, Binding, Face, Candidate, and Font Use as separate entities.
- Removed implicit installed-Catalog ingestion into a Study.
- Replaced Electron ESM top-level ready waiting that deadlocked startup.
- Bundled the sandboxed preload as CommonJS.
- Served Mac Studio resources through a bounded custom scheme instead of unreliable `file:` module loading.
- Restored workspace focus after reload and native panel cancellation.
- Closed modal focus, shortcut-collision, native-menu, asynchronous WebKit-evaluation, path-audit, and cross-browser Inspector-overlap defects found by CI and artifact review.
- Removed the obsolete P1 Mac evidence Host after the release-candidate Host superseded it.

### Release blockers

- Human VoiceOver/Orca and typography review.
- Reference-hardware performance, malformed-font, long-session, and clean-install evidence.
- Production renderer/format ADRs.
- Developer ID signing/notarization/stapling and owner merge/release approval.

## 0.3.0 — Preserved native macOS reference

The historical SwiftUI/CoreText lab under `macos/` predates the standalone cross-platform product. Its native renderer, source watching, collections, variable controls, and transactional export remain an oracle; its schema and application are not the v0.1 release candidate.
