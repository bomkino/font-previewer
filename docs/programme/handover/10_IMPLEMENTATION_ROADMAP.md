# Implementation Roadmap

## 1. Sequencing principle

Do not finish Mac and then port.

The product grows through cross-platform vertical slices.

Research and isolated prototypes may parallelize. Shared contract and product implementation uses one integration frontier.

## 2. Programme phases

### Phase 0 — Reconcile

Goal:

- understand current branch;
- install handover docs;
- identify plan/code conflicts;
- capture fixtures and oracle output.

Exit:

- P0 report;
- clean planning branch;
- decision issue map;
- no code moved.

### Phase 1 — Decide the expensive seams

Run:

- P1 workspace;
- P2 rendering;
- P3 durability;
- P4 domain/schema;
- P5 UX.

Mac/Linux platform prototypes P6/P7 may begin when their prerequisites exist.

Exit:

- accepted ADRs;
- supported-format tiers;
- stable contract sketches;
- visual direction;
- no hidden architectural decision blocking tracer.

### Phase 2 — Cross-platform tracer

Goal:

One Source, Face, Candidate, Recipe, decision, save, cross-open, render, export.

Exit:

- Mac → Linux → Mac semantic equality;
- declared renderer results;
- Host security baseline;
- no raw path leak;
- one build command per app.

### Phase 3 — R1 Alpha

Build:

- file/folder import;
- Review;
- Recipes;
- Compare;
- documents/recovery;
- basic Handoff.

Exit:

A designer can complete a small font-selection journey on both apps.

### Phase 4 — R2 Beta

Build:

- Family Groups;
- variable Candidate duplication;
- System;
- Inspect depth;
- relink/hot reload;
- installed Catalog;
- complete Handoff;
- large-library behavior.

Exit:

The complete product promise works from source builds.

### Phase 5 — R3 Hardening

Close:

- accessibility;
- security;
- performance;
- crash/recovery;
- package;
- source migration;
- provenance;
- human gates.

Exit:

Verified release candidates and draft PR.

### Phase 6 — V1 owner gate

Owners review:

- Mac package;
- Linux packages;
- Handoff;
- open limitations;
- licence ledger;
- release notes.

Only explicit approval permits merge/public release.

## 3. Dependency frontier

```text
D00 Reconcile
├── D01 Workspace
├── D02 Rendering
├── D03 Durability
├── D04 Domain/schema
└── D05 UX

D01 + D03 + D04 → T00 shared foundation
D02 + D05       → visible tracer
D01–D05         → D09 architecture lock

D06 Mac platform ─┐
D07 Linux platform├→ T01/T02 Hosts
D08 Security/a11y ┘

T00 + T01 + T02 → T03 cross-platform tracer
T03 → R1 vertical slices
R1 → R2 vertical slices
R2 → hardening/package/migration
```

## 4. Parallelism rules

### Safe to parallelize

- independent research;
- P1/P2/P3/P4/P5 in isolated branches;
- Mac and Linux Host work after HostBridge freezes;
- package research after process architecture;
- fixture/provenance work independent of product code.

### Do not parallelize

- two writers to Study schema;
- two writers to HostBridge;
- two writers to Scene grammar;
- two writers to shared Studio stage;
- migration while schema prototype is open;
- package hardening while process layout is moving.

### Integration owner

One person/agent owns:

- shared contracts;
- integration branch;
- version compatibility;
- cherry-pick/merge order;
- conflict decisions;
- status truth.

## 5. Architecture freeze points

### Contract Freeze A — Tracer

Freezes only:

- IDs;
- minimal Study;
- minimal HostBridge;
- minimal Render Request;
- one Recipe/Scene;
- decision command.

Changes remain allowed through migration during alpha.

### Contract Freeze B — Alpha

Freezes:

- Study v4;
- core commands;
- HostBridge v1;
- Render v1;
- export manifest alpha.

Breaking changes require ADR and migration.

### Contract Freeze C — Release candidate

No breaking schema/protocol change without owner-approved release reset.

## 6. Build-system rule

Do not reorganize into a monorepo directory tree before the tracer proves the module seams.

Likely eventual shape:

```text
tools/font-previewer/
├── apps/mac
├── apps/linux
├── packages/studio
├── packages/domain
├── packages/contracts
├── packages/scenes
├── packages/handoff
├── engines/mac
├── engines/linux
├── fixtures
└── docs
```

A folder is not architecture. Prefer fewer deep modules.

## 7. Milestone demonstrations

### R0 demo

- prototypes;
- evidence reports;
- ADRs;
- no product claim.

### R0.5 demo

- same Study in Mac and Linux tracer;
- one exact Candidate;
- one decision;
- one proof;
- one cross-platform round trip.

### R1 demo

- 20–50 Source folder;
- Review;
- Compare;
- save/reopen;
- basic Handoff.

### R2 demo

- real film/TV Study;
- real business/advertising Study;
- variable Candidate duplicates;
- complete System;
- relink;
- complete Handoff.

### R3 demo

- packaged apps;
- accessibility journey;
- malformed source;
- 10,000 Catalog;
- clean install;
- reconstruction.

## 8. Scope control

A new feature enters only when it:

- completes a V1 user journey;
- resolves a named risk;
- is required by a supported format/platform;
- improves reproducibility;
- replaces proven friction.

“Other font apps have it” is research evidence, not a reason by itself.
