# D00 Reconciliation — Native Reference vs Final Handover

**Status:** complete in evidence; no product source changed  
**Date:** 2026-08-26  
**Public seam:** repository evidence

## 1. Baseline

```text
source repository: bomkino/pitch-deck-tools
reference branch:  codex/native-macos-font-lab
reference commit:  be77221cb7cb809fdf119945f3fee3d2e1e72ed6
reference tree:    0c1e031a7bd5b0e642b46a83898d2008c19508b6
extracted commit:  f89cde8c3e6e347e29829e5bcd7ee59160d7b3ad
```

The standalone repository was created by filtering `tools/font-previewer` history into repository root. The source repository and reference branch remain unchanged. A directory comparison found no changes in the extracted `macos/` source tree.

The extraction preserves 27 Font Previewer commits, including the browser experiments and the native rewrite. It is materially better than a snapshot copy because decisions and hot spots remain inspectable.

## 2. Capability check

| Capability | Result | Evidence / limit |
|---|---|---|
| Read source repository and history | Yes | local clone plus connected GitHub reads |
| Create local branches, commits, and artifacts | Yes | standalone repository on `codex/d00-reconciliation` |
| Read GitHub CI, jobs, and logs | Yes | run `32954024459`, job `98131604888` |
| Write existing connected repositories | Technically exposed | not used; source repository must remain untouched during spin-out |
| Create a new GitHub repository through connector | No exposed operation | standalone Git history prepared locally; visibility and publication remain owner gates |
| Run macOS builds/tests | No | workspace is Linux x86_64; no macOS runtime or Swift toolchain |
| Run current portable Swift tests locally | No | `swift: command not found` |
| Run Linux/Studio JavaScript work | Yes | Node.js 24.19.0, npm 11.9.0, pnpm 11.19.0 |
| Run Rust/native Linux engine work | No, currently | Rust, CMake, and Ninja are absent |
| Inspect Fontconfig | Yes | Fontconfig 2.15.0 available |

No Mac compile, render, package, visual, VoiceOver, or signing claim is made from this environment.

## 3. Current source map

### `macos/Sources/FontPreviewerCore` — 1,497 lines

Foundation-only package containing:

- schema-v3 `FontStudy` and `FontFaceRecord`;
- review, role, casing, preview, preset, and layout enums;
- path-based identity and relative-path helpers;
- JSON encode/decode and schema-2 migration;
- search/filter/order helpers;
- preset copy and script coverage probes;
- export planning;
- privacy-default JSON and Markdown handoff.

This is the most portable current code, but its domain model is not portable enough for the destination Study.

### `macos/Sources/FontPreviewerMacKit` — 1,650 lines

Mac typography and file behavior:

- CoreText Source inspection and Face enumeration;
- variable axes and CoreText feature selectors;
- metrics and scalar coverage probes;
- `RuntimeFontFace` and descriptor-based font creation;
- file-descriptor source watching;
- `BoardRenderer` for seven current modes;
- transactional PNG/PDF/JSON/Markdown export and optional Source copies.

This is the strongest reusable implementation area. Reuse should happen behind future Render Service, Catalog/Binding, and Handoff seams rather than by adopting its current model types.

### `macos/Sources/FontPreviewerApp` — 1,961 lines

Native SwiftUI/AppKit application:

- one three-column `NavigationSplitView`;
- import/open/save/relink/export panels;
- review keyboard commands and filters;
- current Inspector and preview-mode toolbar;
- one `AppModel` that owns document state, undo, import, runtime fonts, watching, export, autosave, and alerts.

Useful as a Mac interaction oracle. Not reusable as shared product state or workspace architecture without creating two products.

### Tests and smoke

- 16 Foundation/Core tests.
- 4 MacKit tests.
- one native system-font smoke executable.
- one macOS Actions workflow in the source repository.

### Legacy

- `typeboards.html`
- `figma-font-test-exporter.html`
- `start-font-previewer.sh`

Keep for archaeology only. Do not evolve them beside the new Studio.

## 4. Current capability matrix

| Journey | Reference behavior | Destination gap | Reuse judgement |
|---|---|---|---|
| Import Source/folder | Recursive extension-filtered scan; CoreText acceptance; collections enumerate by descriptor order | no portable Source/Face split; incomplete traversal budgets and format proof | reuse CoreText enumeration logic behind new seam |
| Review | native list/cards, Focus, keyboard decisions, filters, notes, tags | no Unreviewed; Candidate collapsed into Face record; no semantic shared Studio | use as interaction oracle, not state model |
| Compare | four-up mode and comparison IDs | no explicit equal-size/equal-fit/locked-lines policy; fallback evidence absent | retain render examples only |
| Variable font | axes extracted and exact values applied | no multiple Candidates for one Face; no named instances | reuse axis extraction after identity split |
| Features | CoreText selector groups and selections | feature semantics tied to record; no cross-engine contract | reuse Mac adapter logic after P2/P4 |
| System | Display/Body pairing plus Role field | no Typography System, Font Use, Scene model, required Roles, or rationale | current pairing is an oracle, not destination implementation |
| Inspect | metrics, coverage, axes, features, glyph mode | coverage may look stronger than shaping proof; no fallback runs or Render Profile | reuse measured facts with stricter language |
| Save/open | atomic JSON file, schema-2 migration, Save As path rewrite | paths in portable Study; no Host binding store; no recovery mirror; autosave writes intentional save | retain atomic-write technique only |
| Relink/reload | path replacement preserves review data; file watcher reloads matching Face index | no Source Revision/reconcile model; atomic replacement/topology cases unresolved | reuse reload mechanics after P4/P6 |
| Handoff | staged PNG/PDF/JSON/Markdown; optional font copy gate | no profile, Recipes, Scenes, Font Uses, findings, checksums, reconstruction | retain staging/atomic commit and permission gate |
| Mac package | ad-hoc app builder, icon, sign, zip, re-extract, verify | current SHA does not compile; not notarized; platform floor conflicts | builder is evidence, not release |
| Linux | none | complete Host, renderer, packaging, Orca, Wayland/X11 absent | no current code to reuse |

## 5. Schema and identity findings

Current schema is v3.

`FontFaceRecord` contains all of these at once:

- local source path;
- Face index and names;
- metrics and coverage;
- axes and selected coordinates;
- feature groups and selections;
- review status;
- role;
- tags and notes.

This directly conflicts with accepted domain boundaries:

```text
Source ≠ Face ≠ Candidate ≠ Font Use
```

Other conflicts:

- `ReviewStatus` has Keep, Maybe, Reject only.
- new records default to Maybe.
- canonical source path plus Face index is used as identity.
- source paths serialize into `.pitchfontstudy`.
- Role settings live on the reviewed record rather than a Font Use.
- Family is metadata only in code, which is good, but no explicit Family Group exists.
- Catalog and Study are not separate products; imported records are the Study.
- schema decoding does not preserve unknown extension fields.
- v2 migration updates defaults but does not create Source/Face/Candidate provenance.

Migration constraint: v3 cannot be mutated in place into v4 without losing the ability to distinguish legacy Face configuration, review decision, role assignment, and path binding. P4 must import v2/v3 into explicit new objects, preserve legacy Maybe with provenance, and keep unresolved mappings visible.

## 6. Rendering findings

`BoardRenderer` is one CoreText/CoreGraphics implementation used by live `NSView` previews and exports. This is a strong coherence property.

Current modes:

- Review;
- Focus;
- Compare;
- Waterfall;
- Metrics;
- Glyphs;
- Pairing.

Useful implementation:

- descriptor-based Face materialization;
- exact collection Face index;
- sorted feature and variation application;
- shared renderer between canvas and export;
- fitted point-size helper;
- immutable bitmap/PDF output path.

Open risks:

- renderer and parser run in the application process;
- no Render Request/Result protocol;
- no profile/version identity;
- no cancellation inside individual draw operations;
- no shaping/fallback evidence;
- no malformed-font crash boundary;
- no measured 50-card typing or axis interaction;
- supported formats are inferred from extension and CoreText acceptance, not full-journey fixtures.

Conclusion: native rendered assets remain a credible leading hypothesis, not an accepted interactive architecture.

## 7. Durability findings

Current semantic authority is `AppModel.study` on the main actor.

Positive evidence:

- `documentGeneration` prevents delayed work crossing document boundaries;
- document transitions cancel import, export, reload, and autosave tasks;
- JSON writes are atomic;
- undo registers full semantic snapshots;
- Save As resolves old paths and rewrites stored paths relative to the new destination.

Conflicts and risks:

- autosave waits 850 ms, then writes the intentional Study file;
- no recovery snapshot is stored separately;
- no acknowledged or recovery-persisted revision exists;
- no web-process recovery exists because the current app has no shared Studio;
- full Study copies are used for every mutation/undo snapshot;
- failed silent autosave can leave `isDirty` true without a durable recovery surface;
- source rehydration mutates loaded Study records with fresh metadata without a formal reconcile report.

Conclusion: current code supplies useful stale-task and atomic-write techniques. It does not answer D03.

## 8. Export and privacy findings

Strong current behavior:

- selected records validated before work;
- font copying off by default;
- explicit permission acknowledgement required;
- hidden staging directory;
- cancellation checks between pages and Source copies;
- collision-safe final folder;
- staging deleted on failure/cancel;
- default handoff omits absolute source paths.

Gaps:

- no Render Profile;
- no Handoff Profile or findings;
- no manifest/file checksum verification;
- no exact Recipe, Scene, Comparison policy, or Font Use model;
- no reconstruction test;
- no CSV formula-neutralization concern because CSV does not yet exist;
- Source copy permission is one boolean, without per-source licence evidence.

Reuse the transaction skeleton. Replace the payload contract.

## 9. Tests, CI, and package truth

### Repository tests

Core tests protect useful properties such as path/Face-index identity, schema migration, filtering, atomic naming, and privacy-default handoff. Mac tests exercise system-font import, every current scene, export dimensions, and Source-copy consent. The smoke executable produces several exports from macOS system fonts.

Several tests encode behavior rejected by the final handover:

- Maybe as default;
- path-bearing portable records;
- Role on the record;
- current pairing fallback;
- path + Face index as identity.

These are reference tests, not future conformance tests.

### Current CI result

GitHub Actions run `32954024459` at the exact reference SHA failed in `Test portable core and macOS kit`. Later smoke, package, inspection, and artifact upload steps were skipped.

Decisive compiler failures include:

- `AppModel.swift:194:36: error: 'TextAlignment' is ambiguous for type lookup in this context`
- `AppModel.swift:370:53: error: reference to captured var 'self' in concurrently-executing code`
- `AppModel.swift:594:34: error: reference to captured var 'self' in concurrently-executing code`
- `ExportSheet.swift:61:17: error: struct 'ViewBuilder' requires that 'TableHeaderRowContent<V, Text>' conform to 'View'`
- `WorkspaceView.swift:355:56: error: no exact matches in call to initializer`

Therefore:

- the reference branch is not currently a green build oracle;
- no package exists at the reference SHA;
- no current smoke output exists;
- README claims exceed current verified state.

### Local result

`swift test --package-path tools/font-previewer/macos` could not start because this Linux workspace has no Swift executable. This is an environment limit, not a test result.

## 10. Fixtures and output evidence

The reference tree contains:

- no committed redistributable font binary;
- no committed `.pitchfontstudy` file;
- no current PNG/PDF render output;
- no runtime screenshot;
- no successful artifact for the reference SHA.

Available fixture-like evidence is limited to inline synthetic Studies in tests and runtime use of macOS system fonts in MacKit tests/smoke. System fonts cannot be committed or treated as cross-platform corpus fixtures.

See the fixture manifest and output index under `evidence/D00/2026-08-26/`.

## 11. Recent hot spots

All native rewrite commits landed on 2026-08-26. Highest-risk current surfaces are:

1. `AppModel.swift` — document, import, review, reload, export, undo, and autosave authority.
2. `FontCatalog.swift` — exact Face enumeration, identity materialization, variations, features, metrics, coverage.
3. `BoardRenderer.swift` / `BoardExporter.swift` — live/export proof and transaction semantics.
4. `Models.swift` / `ProjectCodec.swift` — schema v3 and migration behavior.
5. `WorkspaceView.swift` / `ExportSheet.swift` — current CI compile failures and Mac interaction surface.

The history also shows several temporary `*Fixed.swift`, duplicate App-layer renderer/catalog files, and a split package manifest were created and later removed. This is useful warning against parallel duplicate implementations.

## 12. Plan/code conflicts

| Accepted authority | Reference code | Required treatment |
|---|---|---|
| one product, two Hosts | Mac-only native product | preserve Mac reference; build shared semantics and Linux through gated tracer |
| shared Studio hypothesis | no WKWebView; all-native SwiftUI workspace | P1 compares full Studio against native reference quality |
| Source/Face/Candidate/Font Use split | one `FontFaceRecord` | P4 importer and v4 model; no in-place rename fiction |
| new Candidate is Unreviewed | `.maybe` default | migrate legacy Maybe with provenance; new only becomes Unreviewed |
| local binding outside portable Study | serialized source path | host binding store plus portable hint |
| recovery separate from intentional save | autosave writes selected Study | P3 durability protocol |
| Render Profile declared | no profile | P2 Render Result/manifest evidence |
| engine crash cannot destroy document | in-process CoreText | P2/P6 isolation decision |
| four product stages | seven equal preview modes | keep modes contextual under Review/Compare/System/Inspect |
| System is exact Role → Font Use | Role on Face record and Pairing mode | build System only after schema/UX decisions |
| Linux first-class | absent | no milestone completion without Linux path |
| macOS 14 / Apple silicon leading posture | macOS 13 and x86_64 accepted by builder | P6 decides; do not silently change |

## 13. Reusable implementation

High-value candidates:

- CoreText descriptor enumeration and exact array-position Face index;
- axis tag extraction and clamping;
- CoreText feature selector extraction/application;
- metrics and clearly qualified coverage probe logic;
- `BoardRenderer` as Mac reference renderer seed;
- staging, cancellation, collision avoidance, and permission gating in export;
- document-generation token for stale-task isolation;
- atomic JSON writes;
- source reload settings preservation;
- Foundation-only boundary as evidence that portable logic can be isolated.

Reuse conditions:

- adapter behind accepted public seam;
- new durable IDs and local binding rules;
- explicit Render Profile;
- test rewritten around destination risk rather than legacy shape;
- no premature deletion of reference implementation.

## 14. Do not touch before replacement evidence

- `macos/Sources/FontPreviewerMacKit/FontCatalog.swift`
- `macos/Sources/FontPreviewerMacKit/BoardRenderer.swift`
- `macos/Sources/FontPreviewerMacKit/BoardExporter.swift`
- `macos/Sources/FontPreviewerCore/ProjectCodec.swift`
- `macos/Sources/FontPreviewerCore/Models.swift`
- `macos/Sources/FontPreviewerApp/AppModel.swift`
- `macos/Sources/FontPreviewerSmoke/main.swift`
- `build-font-previewer-app.command`

Small isolated compile repairs are allowed only on a dedicated reference-repair branch, with no semantic migration disguised as repair.

## 15. Migration constraints

1. Expand beside the reference; do not mutate v3 directly into partial v4.
2. Keep an explicit v2/v3 importer and canonical legacy fixtures.
3. Preserve legacy Maybe and explain its provenance.
4. Generate durable SourceID, FaceID, and CandidateID independent of path/name.
5. Move source binding to Host-local storage while retaining bounded portable hints.
6. Preserve exact collection Face index and flag topology changes.
7. Keep Mac reference rendering available until P2 and tracer evidence replace each scene.
8. Do not let shared Studio introduce a second mutable Study model.
9. Do not claim Linux format parity from parsing alone.
10. Keep release/package gates open until downloaded artifacts pass.

## 16. D00 acceptance audit

- [x] Reference branch and commit recorded.
- [x] Current source tree and recent hot spots mapped.
- [x] Current fixture reality captured without private fonts.
- [x] Current render/export evidence indexed; absence recorded honestly.
- [x] Plan conflicts and migration constraints named.
- [x] No source file in `bomkino/pitch-deck-tools` moved, deleted, or rewritten.

## 17. Decision and next frontier

D00 passes as a reconciliation decision.

The reference is valuable but not green and not the destination domain. Proceed to D01/P1 with a fixture-driven shared-Studio prototype. Keep D02/P2 and reference compile repair isolated. Do not start T00 production foundation until D09 freezes tracer contracts.
