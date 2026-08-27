# AGENTS.md — Font Previewer

## Mission

Build one local typography-decision product delivered as:

- a Mac AppKit/WKWebView Host using the shared Studio;
- a first-class Linux Electron Host using the same Study semantics and Studio.

The root SwiftUI/CoreText Mac application is a preserved reference, not the active product.

## Before any task

Read:

1. `00_MASTER_HANDOFF.md`
2. relevant Product/UX section
3. `03_DOMAIN_MODEL.md`
4. accepted ADRs
5. current STATUS
6. current ticket
7. `12_TEST_SECURITY_RELEASE.md`
8. relevant reference-branch code

## Authority

Accepted ADR > Master Handoff > Product Spec > Domain Model > Architecture > current decision/ticket > implementation comment.

Surface conflict. Do not silently choose.

## Domain invariants

- Source ≠ Face.
- Face ≠ Candidate.
- Candidate ≠ Font Use.
- Family is not identity.
- Catalog is Host-local.
- Study is portable.
- Recipe ≠ Scene.
- Review State ≠ Tag.
- local Source Binding ≠ portable Source hint.
- recovery ≠ intentional save.
- Handoff ≠ automatic Source package.
- new Candidates are Unreviewed.

## Product invariants

- Review / Compare / System / Handoff.
- Inspect contextual.
- no deck builder.
- no font manager.
- no taste score.
- no fake Figma integration.
- no cloud/account/analytics.
- no required network.
- no source copying by default.
- no cross-platform pixel-parity claim.

## Architecture invariants

Accepted:

- one product, two Hosts;
- shared semantics;
- platform-native privileged operations;
- durable IDs;
- Catalog/Study separation;
- explicit Render Profile;
- expand–contract migration.

Open programme/release decisions:

- full shared Studio;
- interactive renderer path;
- Study authority/durability;
- Linux backend;
- Mac sandbox/document/XPC;
- final renderer and format tiers;
- Mac sandbox/signing/document/process-isolation policy;
- Linux package matrix;
- production merge and release.

The `codex/v1-release-candidate` implementation is evidence for leading hypotheses. It does not silently accept them.

Do not treat a leading hypothesis as accepted.

## Security

Fonts and Studies are untrusted.

- no arbitrary filesystem in web renderer;
- no path-bearing preview URL;
- runtime-validate bridge;
- sandbox Electron;
- bundled local web content only;
- process-isolate parsing/rendering where accepted;
- bound scan/file/task/memory/time;
- canonicalize paths;
- protect symlink/package traversal;
- redact logs;
- stage exports;
- clean cancellation;
- no font/private binary in Git.

## Development

### Prototypes

- one question;
- throwaway branch;
- runnable;
- measured;
- no broad architecture;
- accept/reject ADR;
- archive/delete losing code.

### Production

- one vertical ticket;
- blockers closed;
- one branch;
- smallest complete user path;
- one writer per shared package;
- fresh verification;
- coherent commit;
- no merge.

### Refactors

Only when:

- required by ticket;
- makes the change easy;
- deepens a real module;
- improves locality/leverage;
- or removes measured friction.

Do not perform architecture gardening.

## Testing

Only at agreed public seams:

- Study Session;
- HostBridge;
- Render Service;
- Catalog/Binding;
- Handoff Builder;
- packaged App.

No:

- private-method tests;
- tautologies;
- test-count target;
- broad snapshots;
- Mac/Linux pixel equality;
- accessibility-by-label-only.

## UI

- typography dominates;
- stable geometry;
- progressive loading;
- keyboard complete;
- semantic equivalent for visual assets;
- no shortcut while editing;
- no color-only state;
- advanced evidence disclosed contextually;
- Mac does not imitate Electron;
- Linux does not imitate Mac chrome.

## Performance

- no UI-thread parse/render;
- visible-first scheduling;
- cancellation;
- bounded cache;
- virtualized Catalog;
- no whole Catalog in Study;
- measure reference hardware;
- preserve provisional budgets until evidence revises them.

## Open-source use

Before direct code/dependency:

- exact version;
- licence/transitives;
- notice;
- security/maintenance;
- product need;
- seam;
- removal plan;
- SBOM.

GPL product references are patterns unless licence posture deliberately changes.

## Repository safety

- preserve `codex/native-macos-font-lab` reference;
- no paid/client Fonts;
- no private exports;
- clean status;
- one coherent commit;
- report base/head;
- no merge;
- no release/deploy.

## Completion report

Must include:

- branch;
- base/head;
- files;
- user behavior/decision;
- commands;
- evidence;
- performance/security impact;
- limitations;
- risks changed;
- docs/status;
- not-merged state.

Never claim completion without fresh evidence.
