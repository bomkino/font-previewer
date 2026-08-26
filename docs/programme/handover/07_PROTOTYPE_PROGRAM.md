# R0 Prototype Programme

R0 exists to falsify expensive assumptions.

A prototype is complete when it answers one decision and records evidence—not when it resembles production.

## Operating rules

- one question per branch;
- fixture-driven;
- runnable with one documented command;
- no broad abstraction;
- no production migration;
- no comprehensive test suite;
- no release polish;
- record measurements and human findings;
- write accept/reject ADR;
- archive or delete losing code;
- do not merge a prototype merely because it works.

## P0 — Repository reconciliation

### Question

What exactly exists at the reference commit, what is reusable, and where does the final handover conflict with current code?

### Work

- inventory `tools/font-previewer`;
- map current modules;
- inspect schema versions;
- inspect current decisions/defaults;
- inspect import formats;
- inspect renderer/export paths;
- inspect tests/CI/package;
- capture current screenshots and outputs with redistributable fixtures;
- map recent change hot spots.

### Output

`RECONCILIATION.md`:

- capability matrix;
- reusable implementation;
- current risks;
- plan/code conflicts;
- migration constraints;
- files not to touch before replacement.

### Pass

A fresh agent can explain current behavior without reading the whole branch.

## P1 — Workspace architecture

### Question

Can the shared Studio own the full workspace inside WKWebView/Electron while each App still feels native and accessible?

### Variants

#### A — Full shared Studio

- Sources/Study navigation;
- central stage;
- Inspector;
- stages;
- tray.

#### B — Native navigation and Inspector, shared stage

#### C — separate native Mac workspace, shared contracts only

Build A fully enough to test. Build B/C as rough comparison if A shows material problems.

### Fixture

- 24 Candidates;
- four Families;
- variable Candidate duplicates;
- one missing Source;
- existing decisions;
- three Recipes;
- comparison tray.

### Tasks

1. find Unreviewed Candidate;
2. mark Keep;
3. edit copy;
4. create Compare Set;
5. assign Display Role;
6. open native Import dialog;
7. undo through native menu;
8. kill/reload web process;
9. navigate with screen reader.

### Evidence

- focus transitions;
- native menu behavior;
- bridge round trips;
- input latency;
- reload;
- VoiceOver/Orca exploratory report;
- Mac visual critique;
- Linux platform critique;
- duplicated state count;
- code surface comparison.

### Veto A when

- focus is unreliable;
- screen-reader path is materially broken;
- Mac workspace cannot feel credible;
- bridge must mirror most UI state;
- reload cannot recover;
- platform differences require forked Studio code everywhere.

### Output

ADR for workspace ownership and a prototype branch pointer.

## P2 — Rendering and engine bake-off

### Question

Which interactive and reference renderer combination satisfies the product without creating two uncontrolled rendering products?

### Interactive options

- native assets;
- browser direct;
- controlled hybrid.

### Mac reference

- CoreText/Quartz in-process baseline;
- CoreText/Quartz XPC helper.

### Linux reference candidates

- HarfBuzz + FreeType + Cairo/Pango;
- HarfBuzz + FreeType + Skia;
- Rust stack using Fontations/Swash/Cosmic Text class tools where viable;
- Fontkit baseline for metadata/browser comparison.

### Fixture matrix

Each fixture has an explicit licence and reason.

- static TTF;
- CFF OTF;
- variable glyf;
- CFF2 variable;
- custom axis;
- named instances;
- feature-heavy Latin;
- Arabic;
- Devanagari;
- Hebrew;
- Thai;
- Bengali/Tamil sample where fixtures are viable;
- combining marks;
- emoji sequences;
- TTC;
- OTC;
- dfont;
- WOFF;
- WOFF2;
- COLRv0;
- COLRv1;
- SVG glyph;
- sbix;
- duplicate names;
- malformed/truncated;
- very large table/file.

### Product tasks

- first Cover;
- 50-card Review;
- edit copy;
- equal-size Compare;
- axis drag;
- feature toggle;
- character search;
- fallback probe;
- hot reload;
- PNG;
- PDF;
- cancel;
- crash.

### Evidence

- exact Face count/index;
- axes/features/named instances;
- shaping/fallback;
- live latency;
- axis frame rate;
- scroll;
- output dimensions;
- line breaks;
- color support;
- memory;
- process failure;
- package size;
- build reproducibility;
- licence/notice burden;
- implementation size;
- public interface size.

### Decision

Classify each format:

- Full;
- Metadata-only;
- Deferred;
- Unsupported.

Accept renderer ADR and rendering-path ADR separately.

## P3 — Study authority and durability

### Question

Which authority/mirror protocol produces immediate interaction and strong recovery with the least duplicated logic?

### Options

- optimistic Studio + asynchronous Host mirror;
- synchronous Host ACK before publish;
- Host-authoritative shared core.

### Fixture

Study with:

- 100 Candidates;
- ten Recipes;
- four Comparison Sets;
- two Systems;
- notes;
- source hints;
- unknown extension field.

### Scenarios

- 1,000 review commands;
- text draft;
- axis drag;
- bulk action;
- Save;
- Save As;
- close;
- two windows;
- web kill before/after ACK;
- Host kill;
- recovery disk failure;
- future schema;
- stale result;
- corrupt recovery.

### Evidence

- UI latency;
- ACK latency;
- snapshot size;
- serialization cost;
- recovery guarantee;
- undo restoration;
- implementation duplication;
- bridge complexity;
- failure UX.

### Decision

Accept:

- authority;
- commit protocol;
- flush policy;
- recovery promise;
- Host validation depth;
- schema owner.

## P4 — Domain/schema/migration

### Question

Does Study v4 correctly separate Source, Face, Candidate, Font Use, Catalog, binding, and portable identity while preserving legacy work?

### Build

- runtime schema;
- canonical JSON fixtures;
- v2/v3 importer;
- v4 writer;
- Mac and Linux prototype readers;
- identity/relink simulator.

### Scenarios

- same PostScript name, two files;
- collection with ten Faces;
- changed Family name;
- moved Source;
- duplicate variable Candidates;
- one Face, two Role Font Uses;
- legacy Maybe;
- missing Source;
- collection loses/reorders Faces;
- future schema;
- unknown extension field.

### Evidence

- semantic snapshots;
- migration report;
- no silent loss;
- relink outcomes;
- file size;
- human readability.

### Decision

Accept schema and migration ADR before production document work.

## P5 — UX directions and product vocabulary

### Question

Which interaction direction makes Review fast, Compare deep, and System believable without becoming a dashboard or deck builder?

### Directions

#### Contact Sheet

Fast reduction and stable cards.

#### Editorial Lab

Large quiet specimen and notebook-like inspection.

#### Deck Stage

Role/system context.

### Fixture tasks

1. review 24 Candidates;
2. duplicate one variable Face;
3. shortlist four;
4. compare at equal size;
5. compare at equal fit;
6. assign Display and Body;
7. inspect feature/axis;
8. repair missing Source;
9. export Handoff.

### Vocabulary test

Compare visible labels:

- Review / Compare / System / Handoff;
- Audition / Compare / Assemble / Handoff;
- Library / Compare / Roles / Export.

Keep domain terms stable regardless of labels.

### Evidence

- completion;
- errors;
- time;
- scroll;
- lost selection;
- inspector visits;
- vocabulary comprehension;
- confidence;
- fatigue;
- Mac nativeness;
- Linux authenticity.

### Output

`DESIGN.md`, accepted direction, rejected alternatives with reasons.

## P6 — Mac sandbox, document, and helper architecture

### Questions

- App Sandbox or hardened direct app without it?
- `NSDocument` or custom document coordinator?
- in-process engine or XPC?

### Workflows

- arbitrary folder;
- recursive scan;
- security bookmark;
- reopen;
- source watch;
- rename-over;
- moved folder;
- relink;
- installed fonts;
- Save As;
- export to another folder;
- multiple windows;
- engine crash;
- app relaunch.

### Evidence

- user friction;
- permission prompts;
- watcher reliability;
- helper access;
- package/signing;
- latency;
- recovery.

### Output

Three ADRs:

- sandbox;
- document architecture;
- engine isolation.

## P7 — Linux process and package architecture

### Questions

- sidecar transport;
- package set;
- dependency bundling;
- Wayland/X11 behavior.

### Build

Minimal tracer with:

- Electron security configuration;
- custom protocols;
- preload;
- native sidecar;
- one source/render;
- Study association;
- deb/rpm/AppImage candidates.

### Clean environments

- supported Ubuntu reference;
- supported Fedora reference;
- Wayland;
- X11.

### Tasks

- install;
- launch;
- open Study;
- import;
- render;
- save;
- export;
- file-manager reveal;
- uninstall.

### Evidence

- missing runtimes;
- permissions;
- sidecar restart;
- package size;
- cold launch;
- desktop integration;
- uninstall residue.

### Output

Linux process/transport and package ADRs.

## P8 — Handoff reconstruction

### Question

Does the Handoff communicate enough to reproduce a decision without the app or oral explanation?

### Work

One person creates Handoff.

Another receives:

- Handoff;
- licensed Sources;
- no live guidance.

### Required reconstruction

- exact Face Index;
- Candidate settings;
- Role Font Uses;
- Recipes;
- Scenes;
- renderer profile;
- cautions.

### Pass

Recipient reconstructs all required Scenes and explains remaining platform differences.

### Output

Handoff contract changes before R2 completion.

## Prototype sequence

```text
P0
├── P1 workspace
├── P2 rendering
├── P3 durability
├── P4 domain/schema
└── P5 UX

P1 + P3 + P4 → shared tracer contract
P2 + P5       → visible tracer behavior
P6            → Mac production shell
P7            → Linux production shell
P8            → Handoff beta gate
```

P6/P7 can begin while late P5 refinement runs, but no production integration starts before P1–P4 decisions.
