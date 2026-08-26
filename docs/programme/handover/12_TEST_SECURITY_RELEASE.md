# Test, Security, Accessibility, Performance, and Release Constitution

## 1. Purpose

This document prevents two opposite failures:

1. shipping a fragile local app that can lose work or mishandle untrusted fonts;
2. replacing judgement with a bloated test and compliance apparatus.

Every gate maps to a user risk.

## 2. Test constitution

A retained test must answer:

- What user-visible or trust property does it protect?
- At which public seam is the property observable?
- What independent source defines the expected result?
- Would it survive an internal refactor?
- What release consequence follows if it fails?

If those answers are unclear, do not add the test.

## 3. Public seams

### Study Session

Observe:

- open/migrate;
- semantic command;
- undo/redo;
- snapshot;
- revision;
- flush;
- serialize.

Risks:

- semantic drift;
- migration loss;
- Candidate/Font Use confusion;
- incorrect review state;
- bad undo grouping.

### HostBridge

Observe:

- negotiate;
- request/reply;
- event;
- cancel;
- session isolation;
- validation;
- error normalization.

Risks:

- arbitrary privilege;
- path leak;
- stale command;
- cross-document result;
- incompatible protocol.

### Render Service

Observe:

- inspect Face;
- render Scene;
- evidence;
- cancel;
- release;
- crash/restart.

Risks:

- wrong Face Index;
- lost axes/features;
- hidden fallback;
- blank or wrong-size proof;
- font crash kills UI;
- stale result.

### Catalog and Source Binding

Observe:

- discover;
- index;
- search;
- add Candidate;
- resolve;
- relink;
- watch;
- reconcile.

Risks:

- duplicate collapse;
- path confusion;
- symlink escape;
- collection remap;
- large-library freeze.

### Handoff Builder

Observe:

- preflight;
- stage;
- write;
- verify;
- commit;
- cancel;
- reconstruct.

Risks:

- partial output;
- overwritten export;
- missing exact settings;
- leaked paths;
- unapproved font copy;
- unsafe CSV;
- bad checksum/manifest.

### Packaged App

Observe:

- install;
- launch;
- file association;
- import;
- render;
- save;
- reopen;
- export;
- uninstall;
- trust/signature.

Risks:

- source-only success;
- missing runtime/helper;
- wrong architecture;
- Gatekeeper/package failure;
- desktop integration failure.

## 4. Tests not to write

- private-method tests;
- getter/setter tests;
- snapshots of every component state;
- one test per label;
- mocks of internal renderer helpers;
- assertions that duplicate the implementation algorithm;
- pixel equality between Mac and Linux;
- exhaustive OpenType-table conformance;
- full FontBakery on every user Source;
- screenshot suites without named visual risk;
- tests whose only benefit is a larger count;
- accessibility inferred solely from static labels;
- performance checks without a user-level budget;
- network claims verified only through source grep.

## 5. CI tiers

### Tier A — Local/PR fast path

Target: ordinary implementation feedback.

Includes:

- formatting/lint where useful;
- shared type/schema build;
- Study Session behavior;
- HostBridge conformance;
- Mac compile on supported CI;
- Linux compile/package skeleton;
- small renderer fixture set;
- source/privacy guard;
- changed-area critical journey.

Keep this bounded.

### Tier B — Cross-platform integration

Run on merge-to-integration or scheduled candidate:

- Mac tracer;
- Linux tracer;
- semantic round trip;
- import/relink fixture;
- basic export verification;
- engine restart.

### Tier C — Corpus

Nightly or explicit:

- full redistributable font fixture matrix;
- complex scripts;
- collections;
- color;
- malformed;
- format classifications.

Do not run the entire corpus on every copy edit.

### Tier D — Performance and soak

Scheduled and release:

- 50/500 Candidate Study;
- 10,000 Catalog;
- axis interaction;
- long session;
- file-descriptor/process/cache growth;
- 100-board export.

### Tier E — Package/release

Release candidate only:

- package;
- extract/install;
- signatures/fuses;
- file associations;
- clean machines;
- critical journey;
- privacy observation.

### Human gates

Never automated away:

- real pitch.dog font library;
- real film/TV project;
- real business/advertising project;
- Mac visual/feel;
- Linux parity;
- VoiceOver;
- Orca;
- Handoff reconstruction;
- owner release decision.

## 6. Fixture policy

Each committed font fixture records:

- source project;
- exact file;
- licence;
- redistribution permission;
- reason;
- expected behavior;
- size;
- upstream commit/version.

Prefer the smallest fixture that proves the risk.

Never commit:

- paid fonts;
- client fonts;
- scraped font binaries;
- mystery fixtures;
- system fonts copied from macOS.

Private/manual gauntlets may use licensed working fonts without entering Git or public artifacts.

## 7. Canonical fixture categories

- TTF glyf;
- OTF CFF;
- variable glyf;
- CFF2;
- custom axis;
- named instances;
- feature-heavy;
- TTC;
- OTC;
- dfont;
- WOFF;
- WOFF2;
- color formats;
- complex scripts;
- combining marks;
- fallback;
- duplicate names;
- malformed/truncated;
- large/boundary cases;
- changed collection topology.

## 8. Risk ledger

| Risk | Public seam | Independent evidence | Severity |
|---|---|---|---|
| Last intentional save damaged | Document/Study | kill and file comparison | Release blocker |
| Acknowledged edits disappear | Study/Host mirror | revision crash matrix | Release blocker |
| Mac/Linux semantic drift | Study Session | canonical snapshots | Release blocker |
| Wrong collection Face | Catalog/Render | known collection fixture | Release blocker |
| Engine crash destroys document | Render/packaged app | malformed corpus, kill/restart | Release blocker |
| Font/path leaks to Studio/Handoff | Bridge/Handoff | protocol/artifact/log inspection | Release blocker |
| Export incomplete or overwritten | Handoff | staged failure and reconstruction | Release blocker |
| Electron privilege escape | HostBridge/package | negative IPC/protocol tests | Release blocker |
| Web process loses state | Study mirror | kill before/after ACK | Release blocker |
| Source update silently remaps Face | Binding/reconcile | topology fixtures | Release blocker |
| Large library freezes | Catalog/render | measured 10,000 workload | Release blocker |
| Screen-reader user excluded | Packaged app | VoiceOver/Orca journey | Release blocker |
| Source copies enabled without consent | Handoff | output/interaction inspection | Release blocker |
| Metadata represented as licence | Handoff copy | content review | Release blocker |
| Cross-platform render differs | Render evidence | profile report | Expected unless hidden |
| Performance misses target | Package/journey | trace/budget | Blocker or accepted limitation |
| Rare deferred format unsupported | Format matrix | explicit classification | Not a blocker if promised honestly |

## 9. Threat model

### Untrusted inputs

- font bytes;
- metadata strings;
- Study files;
- dropped folders;
- relative paths;
- external links;
- renderer/sidecar messages until validated;
- Handoff destinations;
- CSV content.

### Privileged areas

- Mac Host;
- Electron main;
- document storage;
- source bindings;
- render helper/sidecar;
- export filesystem.

### Restricted areas

- WKWebView page world;
- Electron renderer;
- shared Studio.

## 10. Security controls

### Shared Studio

- bundled local code only;
- no remote scripts or fonts;
- restrictive CSP;
- no arbitrary navigation;
- metadata escaped;
- runtime-validated messages;
- no general filesystem or shell interface;
- no path-bearing asset URLs;
- no direct source copy action;
- no secrets.

### Electron

- current supported release;
- sandbox enabled globally;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- narrow preload;
- sender validation;
- custom secure/standard protocol;
- no `file://`;
- navigation and window creation blocked;
- external URL allowlist;
- permission handlers;
- Electron fuses reviewed;
- ASAR integrity / only-load-from-ASAR where supported;
- native sidecar supervised and restartable.

### WebKit

- bundled resources;
- named content world;
- reply handler;
- navigation/UI delegate;
- custom schemes;
- opaque capabilities;
- process-termination recovery;
- no remote page;
- App Transport/network posture reviewed;
- Content Security Policy applied to Studio.

### Filesystem

- explicit user selection;
- canonical path authorization;
- bounded recursion;
- package traversal off by default;
- symlink cycles/escape checks;
- regular-file checks;
- size/count limits;
- read-only Source access;
- detect replacement/change;
- atomic document/export writes;
- collision-safe destinations;
- temporary/staging cleanup.

### Render engines

- process isolation where accepted;
- typed request;
- file/face capability, not arbitrary path;
- timeout;
- cancellation;
- bounded concurrency/memory;
- repeated-crash quarantine;
- no direct Study mutation;
- result validation;
- profile/version disclosure.

### Documents

- runtime schema;
- size limit;
- future-version refusal;
- extension preservation policy;
- atomic save;
- separate recovery;
- no font bytes;
- no Catalog;
- no hidden executable content.

### Handoff

- explicit output plan;
- source copy off;
- permission acknowledgement;
- CSV formula neutralization;
- path redaction;
- checksums;
- manifest/file consistency;
- staging;
- verify before commit.

## 11. Privacy gauntlet

Monitor packaged Apps while:

- idle;
- importing;
- rendering;
- saving;
- exporting;
- recovering;
- showing Help/external links.

Inspect:

- network;
- Study;
- bindings;
- recovery;
- cache;
- logs;
- temp;
- Handoff;
- crash artifacts.

Pass:

- no unexpected traffic;
- no default absolute path in portable/Handoff output;
- no font bytes without permission;
- no private digest in Handoff;
- no persistent staging;
- logs use SourceID/display label by default;
- cache/binding locations documented;
- user can clear disposable cache.

## 12. Accessibility gate

Complete without pointer:

1. create/open Study;
2. import;
3. review ten Candidates;
4. add four to Compare;
5. choose policy;
6. assign Display and Body;
7. change a variable axis;
8. understand fallback finding;
9. export;
10. relink.

Run:

- VoiceOver;
- Orca;
- keyboard only;
- high contrast;
- reduced motion;
- 200% zoom.

Pass:

- no trap;
- focus restoration after native panel;
- semantic specimen equivalent;
- decision/role not color-only;
- comparison order understandable;
- blind mode does not leak identity;
- task/error announcements useful but not noisy;
- Inspector headings and controls labelled;
- image/texture output not the sole information.

## 13. Performance budgets

Provisional reference hardware:

- Mac mini M2 8 GB;
- MacBook Pro M1 Pro;
- modest x86_64 Linux 8 GB integrated graphics.

Targets to validate:

| Operation | Target |
|---|---:|
| Warm Mac welcome | ≤1.5 s |
| Linux cold usable shell | ≤3 s |
| First normal preview after discovery starts | ≤500 ms target |
| Review decision feedback | ≤50 ms |
| Focused copy response after debounce | ≤120 ms |
| Host mirror ACK p95 | ≤100 ms |
| 10,000 Catalog search | ≤75 ms |
| Cancel acknowledgement | ≤100 ms |
| Focused axis interaction | ≥30 fps acceptable, 60 fps preferred |
| Save flush for normal Study | ≤250 ms target |
| Contact Sheet | stable, progressive, no geometry jump |

Memory ceilings are set after P2/P3 measurement.

Hard requirements:

- no UI-thread parse/render;
- no unbounded cache;
- no unbounded file descriptors;
- no orphan sidecars;
- obsolete work cancels;
- Study does not contain whole Catalog.

## 14. Visual release gate

Use packaged applications with:

- one Film/TV project;
- one Business/Advertising project;
- at least 50 legitimately owned Fonts;
- static;
- variable;
- collection;
- small text;
- complex script where relevant.

Judge:

- stage clarity;
- specimen dominance;
- density;
- selection;
- decision loop;
- Compare fairness;
- System comprehension;
- error/recovery;
- Mac nativeness;
- Linux authenticity;
- live/export coherence.

Screenshots alone are insufficient.

## 15. Handoff reconstruction gate

A different designer receives:

- Handoff;
- licensed Sources;
- no oral instruction.

They reproduce:

- exact Face and index;
- Candidate settings;
- Font Uses;
- Recipes;
- Scenes;
- profile;
- cautions.

Pass when the output is understandable and reproducible.

## 16. Mac release gate

- arm64-only every nested Mach-O;
- release build from pinned toolchain;
- helper signatures;
- hardened runtime;
- accepted sandbox posture;
- Developer ID;
- notarization;
- stapling;
- archive;
- extraction;
- signature/Gatekeeper verification;
- file association;
- critical journey on clean supported Mac;
- no dev tools required;
- no bundled private Fonts;
- SBOM/notices/checksum.

## 17. Linux release gate

- pinned Electron;
- secure configuration;
- sidecar and dependencies bundled;
- deb/rpm accepted;
- clean Ubuntu/Fedora;
- Wayland/X11;
- file association;
- open/import/render/save/export;
- uninstall;
- documented cache/data residue;
- no developer runtime required;
- SBOM/notices/checksum.

## 18. Release authority

Agents/automation may:

- build;
- run checks;
- package;
- sign/notarize in configured secure CI;
- create draft artifacts;
- create draft PR;
- prepare release notes.

They may not without explicit owner approval:

- merge;
- publish a public release;
- enable update channel;
- deploy download site;
- send artifacts externally;
- include paid/client Fonts;
- change repository licence.
