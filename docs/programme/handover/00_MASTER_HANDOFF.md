# Master Handoff

> [!IMPORTANT]
> **HISTORICAL ARCHIVE — NOT CURRENT AUTHORITY**
>
> This handover pack is retained as programme evidence. It is not current build, release, or repository authority. Current truth lives in [`docs/maintenance/REPOSITORY_STATE.md`](../../maintenance/REPOSITORY_STATE.md).
>
> Any references below to signed or notarized distribution describe historical intent only. They are not claims about the current application or its published artifacts.

## Assignment

Turn the current Font Previewer native reference into one coherent local product with two desktop clients:

- a Mac reference application using SwiftUI/AppKit and WKWebView;
- a Linux Electron companion using the same Studio and Study contract.

The product helps pitch-deck designers move from local font sources to a reproducible typography system and handoff.

## Destination

A designer can:

1. open either installed application without developer tooling;
2. import files, folders, or installed fonts without installation;
3. see useful pitch-deck specimens progressively;
4. review configured Candidates as Unreviewed, Keep, Maybe, or Reject;
5. compare 2–4 Candidates under explicit fair-comparison policies;
6. duplicate one variable Face into several configured Candidates;
7. assemble exact typography Roles into deck-context Scenes;
8. inspect axes, named instances, OpenType features, characters, scripts, fallback, metrics, and practical metadata when needed;
9. save a portable `.pitchfontstudy`;
10. open and relink it on the other platform without semantic drift;
11. export a human-readable and machine-readable handoff;
12. survive missing sources, source replacement, engine crashes, web-process crashes, application crashes, and cancelled exports without damaging the last intentional save.

## Product stages

The canonical domain stages are:

1. **Review**
2. **Compare**
3. **System**
4. **Handoff**

The shipped labels may be tested during the UX prototype. The underlying model remains stable.

`Inspect` is contextual.

`Catalog` is a source area within Review.

`System` provides deck-context typography Scenes; it is not a presentation builder.

## Product architecture — fixed decisions

These are accepted unless a prototype demonstrates a direct veto condition:

- One product, two platform Hosts.
- Mac is the reference quality client.
- Linux is first-class and completes every V1 journey.
- One shared Studio supplies the cross-platform product workspace; P1 decides whether it owns the full workspace or a narrower central stage.
- The Host owns windows, native commands, dialogs, file access, permissions, durable storage, recovery, task supervision, and packaging.
- Catalog and portable Study are separate.
- Source, Face, Candidate, and Font Use are separate concepts.
- Portable IDs are not file paths.
- New Candidates begin Unreviewed.
- Study semantics are shared across platforms.
- Cross-platform parity is semantic and geometric, not raster-identical.
- V1 is local-only.
- Font Previewer does not mutate the operating system’s font installation state.
- Migration is expand–contract.
- Tests protect named risks through public seams.
- Release requires packaged-artifact and human gates.

## Architecture — leading hypotheses, not yet accepted

### Workspace hypothesis

A full React/TypeScript Studio fills WKWebView on Mac and the sandboxed Electron renderer on Linux. Native Hosts remain substantial around it.

P1 may reject or narrow this.

### Rendering hypothesis

The primary reference/export renderers are:

```text
Mac:   CoreText + Quartz/CoreGraphics
Linux: HarfBuzz + FreeType + selected drawing/PDF backend
```

The interactive path is chosen by P2:

- native rendered assets;
- browser direct;
- controlled hybrid.

No path is accepted before it passes fidelity, responsiveness, format, security, accessibility, and maintenance vetoes.

### Study durability hypothesis

The leading option is:

- Studio performs an optimistic local semantic commit;
- Host receives and validates the complete snapshot and monotonic revision asynchronously;
- Host persists a recovery mirror;
- Save, close, export, and document switch create a flush barrier;
- the UI exposes unsynced/mirror-failed state;
- recovery guarantees the last Host-acknowledged revision.

P3 compares this against Host-authoritative and synchronous two-phase alternatives.

## R0 decision gates

Production implementation begins only after the required gates:

1. shared workspace / native quality;
2. interactive renderer path;
3. Linux renderer and supported formats;
4. Study durability protocol;
5. Source/Face/Candidate identity and migration;
6. UX direction and stage labels;
7. Mac sandbox and deployment floor;
8. Linux packaging baseline;
9. accessibility feasibility across native/web focus;
10. security process boundary.

## First production tracer

```text
Choose one Source
→ enumerate one exact Face
→ create one configured Candidate
→ render one Cover Recipe
→ display it in the shared Studio
→ mark Keep
→ mirror the Study
→ save on Mac
→ open on Linux
→ bind the local Source
→ render the Linux profile
→ save
→ reopen on Mac
→ confirm semantic equality
```

Nothing outranks proving this path.

## Release ladder

### R0 — Evidence and decisions

- repository reconciliation;
- domain and schema prototype;
- workspace prototype;
- renderer bake-off;
- durability bake-off;
- UX prototype;
- sandbox/package prototypes;
- accepted ADRs.

### R0.5 — Cross-platform tracer

The one-Face journey above passes on both platforms.

### R1 — Alpha

- file/folder import;
- Review;
- Recipes;
- basic Compare;
- open/save/recovery;
- source-missing state;
- basic PNG/PDF/manifest export;
- source builds for both apps.

### R2 — Beta

- Family Groups;
- variable instances;
- System;
- axes/features;
- characters/coverage/fallback;
- relink/hot reload;
- installed-font Catalog;
- complete structured Handoff;
- performance work.

### R3 — Release candidate

- security closure;
- accessibility closure;
- package verification;
- Mac signing/notarization;
- Linux deb/rpm candidate;
- migrations;
- human real-font and real-project gates;
- draft PR.

### V1 — Owner-authorized release

No automation may merge or publish by inference.

## Build method

- Wayfinder decisions first.
- Research facts in parallel.
- Prototype uncertainty cheaply.
- Keep product decisions human-visible.
- Build vertical tracer bullets.
- Use one branch per prototype/ticket.
- One integration owner.
- Shared packages have one writer at a time.
- Mac and Linux Host work may parallelize only after the bridge and contracts freeze.
- Report artifacts and evidence, not elapsed time.
