# Build Backlog

Decision tickets answer architecture/product questions. Build tickets are vertical tracer bullets. No ticket is ready while any blocker is open.

## D00 — Reconcile the handover with the native reference

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** None

**User-visible / decision outcome:** A read-only report identifies current capabilities, reusable implementation, schema behavior, oracle artifacts, and plan conflicts.

### Acceptance criteria

- [ ] Reference branch and commit recorded.
- [ ] Current source tree and recent hot spots mapped.
- [ ] Current Study fixtures captured without private fonts.
- [ ] Current render/export evidence captured.
- [ ] Plan conflicts and migration constraints named.
- [ ] No source file moved, deleted, or rewritten.

### Public seam / evidence surface

Repository evidence

### Required evidence

- RECONCILIATION.md
- fixture manifest
- reference output index

### Non-goals

- No product changes.
- No architecture wrapper around existing files.

## D01 — Choose the workspace ownership model

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D00

**User-visible / decision outcome:** P1 selects full shared Studio, narrowed shared stage, or separate UIs using measured native quality, focus, accessibility, recovery, and locality.

### Acceptance criteria

- [ ] Mac and Linux prototype run the same fixture tasks.
- [ ] Native menus/dialogs exercised.
- [ ] Web-process reload demonstrated.
- [ ] Focus and VoiceOver/Orca exploratory findings recorded.
- [ ] Accepted ADR includes veto reasoning.

### Public seam / evidence surface

Host/Studio interface

### Required evidence

- P1 branch
- workspace ADR
- task report

### Non-goals

- No real font engine.
- No final visual polish.

## D02 — Choose interactive and reference rendering

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D00

**User-visible / decision outcome:** P2 selects native assets, browser direct, or controlled hybrid and classifies V1 format support.

### Acceptance criteria

- [ ] Common, variable, collection, complex-script, color, and malformed fixtures run.
- [ ] Mac and Linux candidates measured.
- [ ] Interaction and export tasks run.
- [ ] Renderer and format ADRs accepted.
- [ ] Unsupported/deferred claims explicit.

### Public seam / evidence surface

Render Service

### Required evidence

- engine matrix
- performance results
- renderer ADRs

### Non-goals

- No general font engine rewrite.
- No UI beyond test harness.

## D03 — Choose Study authority and durability

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D00, D01

**User-visible / decision outcome:** P3 selects the smallest authority/mirror model that meets interaction and recovery requirements.

### Acceptance criteria

- [ ] Optimistic, synchronous, and Host-authoritative alternatives compared.
- [ ] Save/close/crash/document-switch scenarios run.
- [ ] Durability vocabulary and guarantee documented.
- [ ] Authority/recovery ADR accepted.

### Public seam / evidence surface

Study Session / Host mirror

### Required evidence

- P3 report
- durability ADR
- recovery artifacts

### Non-goals

- No production database.
- No event-sourcing framework.

## D04 — Lock the domain and Study v4 migration

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D00, D03

**User-visible / decision outcome:** P4 proves Source, Face, Candidate, Font Use, portable IDs, local bindings, and legacy migration.

### Acceptance criteria

- [ ] Runtime schema and canonical fixtures exist.
- [ ] v2/v3 migration preserves legacy Maybe with provenance.
- [ ] Same-Face multiple Candidates work.
- [ ] Same-Face multiple Font Uses work.
- [ ] Mac/Linux prototype round trip is semantic.
- [ ] Future schema refuses safely.

### Public seam / evidence surface

Study Session open/migrate/save

### Required evidence

- schema fixtures
- migration report
- domain ADRs

### Non-goals

- No Catalog in Study.
- No path identity.

## D05 — Choose the UX direction and visible labels

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D00, D01, D02

**User-visible / decision outcome:** P5 selects the tested Contact Sheet / Editorial Lab / Deck Stage composition and stage labels.

### Acceptance criteria

- [ ] Three directions use same fixture and tasks.
- [ ] Review, Compare, System, and Inspect tasks complete.
- [ ] Vocabulary comprehension recorded.
- [ ] Mac/Linux visual critiques recorded.
- [ ] DESIGN.md accepted.

### Public seam / evidence surface

Human task journey

### Required evidence

- three prototypes
- task report
- DESIGN.md

### Non-goals

- No component library extraction.
- No final animation.

## D06 — Choose Mac document, sandbox, and engine isolation

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D01, D02, D03

**User-visible / decision outcome:** P6 fixes Mac document architecture, App Sandbox posture, XPC/in-process rendering, and minimum OS.

### Acceptance criteria

- [ ] Real folder/watch/relink workflows run.
- [ ] Multiple documents and recovery tested.
- [ ] Helper crash tested.
- [ ] Entitlements and signing implications documented.
- [ ] Three ADRs accepted.

### Public seam / evidence surface

Packaged Mac prototype

### Required evidence

- P6 report
- Mac ADRs
- entitlement matrix

### Non-goals

- No public release.
- No updater.

## D07 — Choose Linux sidecar transport and packages

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D01, D02, D03

**User-visible / decision outcome:** P7 selects Linux process/transport and the first clean-install package set.

### Acceptance criteria

- [ ] Electron security baseline applied.
- [ ] Sidecar kill/restart demonstrated.
- [ ] Ubuntu and Fedora clean tests run.
- [ ] Wayland/X11 checked.
- [ ] Package ADRs accepted.

### Public seam / evidence surface

Packaged Linux prototype

### Required evidence

- P7 report
- package artifacts
- Linux ADRs

### Non-goals

- No Flatpak promise without portals proof.
- No Linux arm64.

## D08 — Lock the cross-platform accessibility and security contract

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D01, D02, D03, D04, D05, D06, D07

**User-visible / decision outcome:** The threat model and semantic accessibility model are accepted before the tracer becomes production-shaped.

### Acceptance criteria

- [ ] Trust boundaries documented.
- [ ] Font bytes/path policy fixed.
- [ ] Semantic equivalent for render assets demonstrated.
- [ ] Native/web focus behavior documented.
- [ ] Security/accessibility ADRs accepted.

### Public seam / evidence surface

HostBridge / packaged prototype

### Required evidence

- threat model
- a11y report
- accepted contract

### Non-goals

- No release certification claim.

## D09 — Freeze the tracer contracts

**Kind:** decision  
**Milestone:** R0  
**Blocked by:** D01, D02, D03, D04, D05, D08

**User-visible / decision outcome:** Minimal Study, HostBridge, Render, Scene, and error contracts are frozen for the first production tracer.

### Acceptance criteria

- [ ] Contract schemas versioned.
- [ ] Mac/TypeScript/Linux bindings generated or validated.
- [ ] Capability and error vocabulary fixed.
- [ ] Only tracer-required fields included.
- [ ] Breaking-change process documented.

### Public seam / evidence surface

Contracts

### Required evidence

- Contract Freeze A
- conformance fixtures

### Non-goals

- No beta-complete schema.
- No plugin surface.

## T00 — Create the shared tracer foundation

**Kind:** build  
**Milestone:** R0.5  
**Blocked by:** D09

**User-visible / decision outcome:** The repository builds the shared Study Session, contracts, one Recipe/Scene, and a minimal Studio without moving the old app.

### Acceptance criteria

- [ ] One workspace package builds.
- [ ] One Study fixture opens.
- [ ] One semantic review command works.
- [ ] One Scene request serializes.
- [ ] Old native reference remains runnable.
- [ ] Build commands documented.

### Public seam / evidence surface

Study Session / contracts

### Required evidence

- shared build
- contract conformance

### Non-goals

- No import UI.
- No final design system.

## T01 — Build the Mac tracer Host

**Kind:** build  
**Milestone:** R0.5  
**Blocked by:** T00, D06

**User-visible / decision outcome:** An arm64 Mac Host opens the shared Studio, selects one Source, renders one Face, mirrors state, and saves a Study.

### Acceptance criteria

- [ ] WKWebView or accepted workspace host works.
- [ ] Native source panel.
- [ ] One exact Face.
- [ ] Accepted render path.
- [ ] Host mirror.
- [ ] Native Save.
- [ ] No raw path leak.
- [ ] Engine restart leaves Study safe.

### Public seam / evidence surface

Mac HostBridge / Render Service

### Required evidence

- Mac tracer video/log
- Study
- PNG

### Non-goals

- No installed Catalog.
- No package release.

## T02 — Build the Linux tracer Host

**Kind:** build  
**Milestone:** R0.5  
**Blocked by:** T00, D07

**User-visible / decision outcome:** A secure Electron Host opens the shared Studio, binds one Source, renders one Face, mirrors state, and saves a Study.

### Acceptance criteria

- [ ] Sandbox/context isolation.
- [ ] Narrow preload.
- [ ] Custom protocol.
- [ ] One exact Face.
- [ ] Accepted renderer.
- [ ] Host mirror.
- [ ] Native Save.
- [ ] Sidecar restart.

### Public seam / evidence surface

Linux HostBridge / Render Service

### Required evidence

- Linux tracer log
- Study
- PNG

### Non-goals

- No installed Catalog.
- No final package.

## T03 — Complete the Mac–Linux–Mac tracer

**Kind:** build  
**Milestone:** R0.5  
**Blocked by:** T01, T02

**User-visible / decision outcome:** One Study saves on Mac, opens and renders on Linux, saves, and reopens on Mac without semantic drift.

### Acceptance criteria

- [ ] SourceID/FaceID/CandidateID stable.
- [ ] Keep decision preserved.
- [ ] local bindings differ correctly.
- [ ] renderer profile declared.
- [ ] semantic snapshots equal.
- [ ] one proof and manifest per platform.
- [ ] no unapproved merge.

### Public seam / evidence surface

Critical packaged/source journey

### Required evidence

- round-trip report
- two proofs
- snapshot diff

### Non-goals

- No broad feature expansion.

## T04 — Stream file and folder import into Review

**Kind:** build  
**Milestone:** R1  
**Blocked by:** T03

**User-visible / decision outcome:** A user imports bounded files/folders, sees Candidates progressively, cancels safely, and understands failures.

### Acceptance criteria

- [ ] bounded recursive discovery.
- [ ] exact collection Faces.
- [ ] progress/task drawer.
- [ ] first Candidate early.
- [ ] duplicate categories.
- [ ] cancel coherent.
- [ ] unsupported/quarantined states.

### Public seam / evidence surface

Catalog/import

### Required evidence

- import fixtures
- journey recording

### Non-goals

- No ZIP.
- No installed fonts.

## T05 — Implement the stable Review loop

**Kind:** build  
**Milestone:** R1  
**Blocked by:** T04

**User-visible / decision outcome:** Contact Sheet and Focus support fast, reversible Unreviewed/Keep/Maybe/Reject decisions.

### Acceptance criteria

- [ ] stable cards.
- [ ] keyboard decisions.
- [ ] editable-focus guard.
- [ ] undo/redo.
- [ ] filters/counts.
- [ ] comparison tray.
- [ ] notes/tags/rationale.
- [ ] multi-select preview.

### Public seam / evidence surface

Study Session review commands

### Required evidence

- review journey
- command tests

### Non-goals

- No command palette.
- No automatic score.

## T06 — Implement Recipe Packs and custom Recipes

**Kind:** build  
**Milestone:** R1  
**Blocked by:** T05

**User-visible / decision outcome:** A Study tests real Film/TV, Advertising, Business, or custom copy through reusable Recipes.

### Acceptance criteria

- [ ] three seed packs and Blank.
- [ ] create/duplicate/rename/delete.
- [ ] copy and common typography settings.
- [ ] advanced language/direction.
- [ ] scope labels.
- [ ] undo.
- [ ] migration from global sample.

### Public seam / evidence surface

Recipe commands

### Required evidence

- Recipe fixtures
- journey

### Non-goals

- No arbitrary Scene editor.

## T07 — Implement fair Compare

**Kind:** build  
**Milestone:** R1  
**Blocked by:** T05, T06

**User-visible / decision outcome:** A user saves and reopens 2–4 Candidate comparisons under named policies.

### Acceptance criteria

- [ ] equal nominal size.
- [ ] equal fit.
- [ ] locked line breaks.
- [ ] order/reorder.
- [ ] lock Recipe/settings.
- [ ] fitted-size evidence.
- [ ] saved Comparison Set.
- [ ] basic blind mode.

### Public seam / evidence surface

Comparison commands / Scene grammar

### Required evidence

- comparison fixtures
- human task

### Non-goals

- No winner score.
- Overlay/blink optional later.

## T08 — Finish native document and recovery lifecycle

**Kind:** build  
**Milestone:** R1  
**Blocked by:** T05, D06, D07

**User-visible / decision outcome:** Open, Save, Save As, recent documents, recovery, and web/engine restart work on both Apps.

### Acceptance criteria

- [ ] atomic save.
- [ ] flush barrier.
- [ ] separate recovery.
- [ ] corrupt quarantine.
- [ ] multiple document policy.
- [ ] cross-platform round trip.
- [ ] future-schema refusal.
- [ ] file association development check.

### Public seam / evidence surface

Document Store / Study mirror

### Required evidence

- crash matrix
- round-trip fixtures

### Non-goals

- No cloud sync.

## T09 — Export a basic transactional Handoff

**Kind:** build  
**Milestone:** R1  
**Blocked by:** T06, T07, T08

**User-visible / decision outcome:** Review/Compare boards, PDF, summary, manifest, and checksums export without partial debris.

### Acceptance criteria

- [ ] preflight.
- [ ] hidden staging.
- [ ] PNG/PDF.
- [ ] summary/manifest.
- [ ] renderer identity.
- [ ] checksums.
- [ ] cancel cleanup.
- [ ] no paths/font copies by default.

### Public seam / evidence surface

Handoff Builder

### Required evidence

- export bundle
- verification report

### Non-goals

- No Figma integration.
- No source copies yet.

## T10 — Implement Family Groups and variable Candidate duplication

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T05

**User-visible / decision outcome:** Families aid navigation while exact Faces and configured Candidate instances remain distinct.

### Acceptance criteria

- [ ] group confidence.
- [ ] bad-name fixtures.
- [ ] static/variable relationship.
- [ ] duplicate Candidate.
- [ ] independent decision/settings.
- [ ] bulk family add with preview.

### Public seam / evidence surface

Catalog grouping / Study commands

### Required evidence

- family corpus report
- Candidate fixtures

### Non-goals

- Family is not identity.

## T11 — Build Typography Systems and deck Scenes

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T06, T07, T10

**User-visible / decision outcome:** Exact Font Uses fill Roles and render believable pitch-deck typography Scenes.

### Acceptance criteria

- [ ] Display/Body/Data/Caption/Legal/Utility.
- [ ] same Face different Role settings.
- [ ] title/logline/body/data/legal Scenes.
- [ ] system rationale.
- [ ] Handoff profile completeness.
- [ ] no slide-authoring tools.

### Public seam / evidence surface

Typography System commands / Scene grammar

### Required evidence

- System Study
- Scene proofs

### Non-goals

- No media.
- No automatic pairing score.

## T12 — Add variable axes, named instances, and OpenType features

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T10, D02

**User-visible / decision outcome:** Contextual Inspect exposes authored variation and supported features with responsive focused preview.

### Acceptance criteria

- [ ] named instances first.
- [ ] custom axes.
- [ ] min/default/max.
- [ ] reset one/all.
- [ ] copy matching axes deliberately.
- [ ] supported feature groups.
- [ ] proof strings.
- [ ] clamp after reconcile.

### Public seam / evidence surface

Font intelligence / Candidate commands

### Required evidence

- font fixture report
- axis interaction trace

### Non-goals

- No generated static font export.

## T13 — Add characters, script, fallback, metrics, and practical metadata

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T12

**User-visible / decision outcome:** Inspect provides decision-relevant evidence without becoming a compliance dashboard.

### Acceptance criteria

- [ ] character search/copy.
- [ ] Unicode/glyph name where available.
- [ ] required-copy missing report.
- [ ] native/fallback/missing distinction.
- [ ] metrics guides.
- [ ] color evidence.
- [ ] embedding disclaimer.
- [ ] profile declared.

### Public seam / evidence surface

Font intelligence / Render evidence

### Required evidence

- script corpus
- fallback report

### Non-goals

- No accessibility certification.
- No full FontBakery UI.

## T14 — Implement Source relink, reconciliation, and hot reload

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T08, T10, T12

**User-visible / decision outcome:** Moved or changed Sources reconnect without losing configured Candidates or silently remapping Faces.

### Acceptance criteria

- [ ] single/folder relink.
- [ ] ranked match.
- [ ] ambiguous confirmation.
- [ ] in-place write.
- [ ] rename-over.
- [ ] directory replacement.
- [ ] collection topology report.
- [ ] cache invalidation.
- [ ] crash quarantine.

### Public seam / evidence surface

Source Binding / watcher / reconcile

### Required evidence

- filesystem scenario report

### Non-goals

- No silent face-index substitution.

## T15 — Add installed-font Catalog and large-library performance

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T10, T14

**User-visible / decision outcome:** Local installed fonts are searchable progressively without becoming Study state or freezing the UI.

### Acceptance criteria

- [ ] CoreText installed discovery.
- [ ] Fontconfig discovery.
- [ ] incremental index.
- [ ] 10,000-Face search.
- [ ] virtualization.
- [ ] explicit add to Study.
- [ ] bounded cache.
- [ ] cancel/rebuild.

### Public seam / evidence surface

Catalog

### Required evidence

- large-catalog trace
- memory report

### Non-goals

- No activation.
- No remote catalog.

## T16 — Complete reconstructable Handoff

**Kind:** build  
**Milestone:** R2  
**Blocked by:** T11, T13, T14, T09

**User-visible / decision outcome:** A recipient can reconstruct the Typography System from human, machine, and visual evidence.

### Acceptance criteria

- [ ] human summary.
- [ ] Sources/Faces/Candidates/Font Uses.
- [ ] Recipes/Scenes.
- [ ] renderer evidence.
- [ ] source health.
- [ ] coverage/fallback.
- [ ] Figma reference JSON/CSV.
- [ ] permission-gated Source copies.
- [ ] independent reconstruction.

### Public seam / evidence surface

Handoff Builder / reconstruction

### Required evidence

- reconstruction report
- complete Handoff

### Non-goals

- No Figma API claim.
- No licence conclusion.

## T17 — Close security, accessibility, and performance risks

**Kind:** build  
**Milestone:** R3  
**Blocked by:** T15, T16

**User-visible / decision outcome:** The complete product passes the named risk ledger and human core journeys.

### Acceptance criteria

- [ ] VoiceOver.
- [ ] Orca.
- [ ] keyboard only.
- [ ] high contrast/reduced motion/zoom.
- [ ] malformed-font containment.
- [ ] Electron security/fuses.
- [ ] Mac entitlements.
- [ ] privacy observation.
- [ ] long session.
- [ ] performance budgets.

### Public seam / evidence surface

Packaged/source critical journeys

### Required evidence

- risk ledger
- human reports
- traces

### Non-goals

- No certification theatre.

## T18 — Package Mac and Linux release candidates

**Kind:** build  
**Milestone:** R3  
**Blocked by:** T17, D06, D07

**User-visible / decision outcome:** Downloaded release candidates install/open and complete the critical journey on clean supported machines.

### Acceptance criteria

- [ ] arm64 Mac.
- [ ] Developer ID/hardened/notarized/stapled.
- [ ] nested helper verification.
- [ ] deb/rpm accepted.
- [ ] native dependencies bundled.
- [ ] file associations.
- [ ] SBOM/notices.
- [ ] checksums.
- [ ] clean install/uninstall.
- [ ] no accidental font fixture.

### Public seam / evidence surface

Packaged applications

### Required evidence

- packages
- clean-machine report

### Non-goals

- No public publication.
- No updater.

## T19 — Migrate legacy work and archive superseded paths

**Kind:** build  
**Milestone:** R3  
**Blocked by:** T18

**User-visible / decision outcome:** Every reference-branch capability is preserved, replaced, deferred, or explicitly removed, and legacy Studies migrate safely.

### Acceptance criteria

- [ ] capability parity matrix.
- [ ] v2/v3 migration.
- [ ] reference CoreText logic reused or consciously replaced.
- [ ] old full UI no longer primary.
- [ ] legacy HTML archived.
- [ ] docs updated.
- [ ] no private artifact.
- [ ] draft PR.

### Public seam / evidence surface

Migration / packaged apps

### Required evidence

- migration report
- draft PR

### Non-goals

- No deletion before evidence.
- No merge.

## T20 — Prepare the owner release decision

**Kind:** gate  
**Milestone:** V1  
**Blocked by:** T19

**User-visible / decision outcome:** Owners receive the verified packages, limitations, provenance, release notes, and explicit merge/release choices.

### Acceptance criteria

- [ ] final verification report.
- [ ] open limitations.
- [ ] package links/checksums.
- [ ] licence ledger.
- [ ] release notes.
- [ ] merge decision separate from release decision.
- [ ] no action taken by default.

### Public seam / evidence surface

Owner review

### Required evidence

- release-decision packet

### Non-goals

- No implicit approval.
