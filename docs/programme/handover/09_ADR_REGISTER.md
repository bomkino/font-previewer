# ADR Register

Statuses:

- **Accepted** — build authority unless explicitly reopened by its veto.
- **Leading hypothesis** — prototype first; not production authority.
- **Open** — no preferred decision or several viable paths.
- **Deferred** — outside current destination.
- **Rejected** — do not reintroduce without new evidence.

## Accepted

### ADR-001 — One product, two Hosts

Share Study semantics, Studio, Scenes, Recipes, commands, and Handoff.

Adapt native shell, bindings, renderers, packaging, and desktop conventions.

### ADR-002 — Mac reference, Linux first-class

Mac sets product-quality benchmark.

Linux completes every V1 journey.

### ADR-003 — Four canonical stages

Review, Compare, System, Handoff.

Inspect is contextual.

### ADR-004 — Catalog separate from Study

Catalog is Host-local.

Study contains selected Sources/Faces/Candidates only.

### ADR-005 — Source, Face, Candidate, Font Use are distinct

A Candidate is one configured audition of a Face.

A Font Use is one exact Role assignment.

### ADR-006 — Durable IDs are not paths or names

SourceID, FaceID, CandidateID travel.

Paths and provider IDs remain Host-local bindings.

### ADR-007 — New Candidates are Unreviewed

Maybe is deliberate.

Legacy Maybe is preserved with provenance and optional explicit reset.

### ADR-008 — Semantic parity, not raster parity

Study and Scene meaning must match.

Pixels may differ by declared Render Profile.

### ADR-009 — V1 is local-only

No account, analytics, cloud processing, or required network.

### ADR-010 — Font Previewer does not mutate font installation

No install, activation, deactivation, move, trash, or delete.

### ADR-011 — Expand–contract migration

Build beside the reference implementation.

Remove only after replacement evidence.

### ADR-012 — Risk-led public-seam testing

Test count is not a target.

Packaged applications and human gates matter.

### ADR-013 — Owner-controlled irreversible actions

No merge, public release, deploy, updater, or third-party delivery without explicit approval.

### ADR-014 — Shared Studio is the V1 semantic authority

The React/TypeScript Studio owns portable Study semantics. AppKit/WKWebView and Electron remain narrow native Hosts.

### ADR-015 — Host recovery plus explicit Save is the V1 durability model

The Host mirrors acknowledged revisions for crash recovery. Intentional Save remains a separate user action and portable-file boundary.

### ADR-016 — V1 renderer parity is semantic

WKWebView/CoreText and Chromium render locally with declared platform differences. A shared HarfBuzz/FreeType raster profile is deferred until a measured corpus justifies it.

### ADR-017 — V1 font format tiers

`.otf`, `.ttf`, `.woff`, and `.woff2` receive full preview support. `.ttc`, `.otc`, and `.dfont` are metadata-only. Linux variable axes and named instances are extracted in a bounded child process.

### ADR-018 — V1 distribution is free GitHub download

macOS 13+ arm64 is distributed as an ad-hoc signed, hardened-runtime ZIP without App Sandbox, Developer ID, notarization, or updater. Linux x64 is distributed as `.deb` and portable tarball for X11 and Wayland. RPM and arm64 Linux are deferred.

### ADR-019 — Internal Handoffs copy Sources by default

New Studies include locally bound Source files in transactional Handoffs by default. The user can opt out. The product warns that internal policy is not a font licence.

### ADR-020 — V1 remains local and integration-light

No accounts, analytics, cloud processing, updater, or live Figma integration. JSON/CSV reference output is the supported Figma seam.

### ADR-021 — Public v0.1 prerelease before stable V1

The owner authorized integration into the isolated release-candidate branch and a public GitHub prerelease after exact-head automated gates pass. Human accessibility, typography, reconstruction, and independent-machine evidence remain explicit limitations and are required before a supported `v1.0.0` claim.

## Leading hypotheses

### ADR-H01 — Full shared Studio workspace (accepted as ADR-014)

A full React/TypeScript workspace runs inside WKWebView/Electron.

P1 vetoes it if Mac quality, accessibility, focus, recovery, or bridge locality fails.

### ADR-H02 — Native rendered assets as primary interactive path

Mac CoreText/Quartz and Linux native render service produce live/export assets.

P2 vetoes it if interaction thresholds fail.

### ADR-H03 — Optimistic Studio authority with asynchronous Host mirror (accepted as ADR-015)

P3 vetoes it if recovery guarantees, Host validation, or reconciliation become unacceptably weak.

### ADR-H04 — Mac CoreText engine in one XPC helper

P2/P6 decide whether process isolation justifies latency and packaging cost.

### ADR-H05 — Linux HarfBuzz/FreeType stack

Drawing backend and implementation language remain open.

### ADR-H06 — macOS 14 minimum

P6 and real-device inventory decide.

### ADR-H07 — Developer ID direct distribution without updater (replaced by ADR-018)

Sandbox status remains open.

### ADR-H08 — Linux deb and rpm first (replaced by ADR-018)

P7 may promote/demote AppImage or Flatpak.

## Open

### ADR-O01 — Interactive render path (closed by ADR-016)

- native assets;
- browser direct;
- hybrid.

### ADR-O02 — Study durability authority (closed by ADR-015)

- optimistic Studio;
- synchronous two-phase;
- Host shared core.

### ADR-O03 — Linux drawing/PDF backend

- Cairo/Pango;
- Skia;
- Rust stack;
- another measured candidate.

### ADR-O04 — Mac App Sandbox (closed by ADR-018 for V1)

Hardened runtime without sandbox versus sandbox + bookmarks.

### ADR-O05 — Mac document architecture

`NSDocument` versus custom/SwiftUI document coordinator.

### ADR-O06 — Exact V1 format tiers (closed by ADR-017)

Full, metadata-only, deferred.

### ADR-O07 — Visible stage labels

Domain stays fixed; labels tested.

### ADR-O08 — Browser Render Profile

Whether it appears in V1.1 or later.

### ADR-O09 — Source private digest policy

Local relink aid versus privacy/complexity.

### ADR-O10 — Multiple document windows on Linux

Required experience versus release complexity.

## Deferred

- updater;
- Flatpak;
- Linux arm64;
- Figma plugin/API;
- plugin system;
- arbitrary Scene editor;
- shared Rust core rewrite;
- Mac HarfBuzz profile;
- cloud review;
- Windows;
- font editing;
- UFO/Designspace/TTX.

## Rejected

### Separate Mac and Linux product UIs as default

Rejected because it creates duplicated product semantics and permanent drift.

May be reopened only if P1 hard-vetoes shared Studio.

### Electron on Mac

Rejected by product brief and native-quality goal.

### Browser direct rendering accepted without bake-off

Rejected.

### Host-native image rendering accepted without interaction proof

Rejected.

### Synchronous commit accepted merely because it sounds safer

Rejected.

### Path or PostScript name as portable identity

Rejected.

### Family as identity

Rejected.

### Maybe as import default

Rejected.

### Big-bang rewrite

Rejected.

### Test-count quality metric

Rejected.
