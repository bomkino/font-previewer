# Risk Ledger

| ID | Risk | Evidence | Severity | Next control |
|---|---|---|---|---|
| R-001 | Reference Mac build may cease to be a usable oracle | Repaired GitHub Actions run `33008885071` passes tests, native smoke, packaging, re-extraction, plist, signing, and artifacts | Controlled release risk | Keep reference CI green; do not silently fold new-domain behavior into the oracle |
| R-002 | Domain identity collapses distinct concepts | `FontFaceRecord` owns path, Face metadata, axes, review, Role, tags, and notes | Architecture blocker | P4 Study v4 prototype and explicit migration |
| R-003 | Portable Study carries source paths | `FontStudy.records[].sourcePath` is serialized | Privacy/portability blocker | Separate portable Source hints from Host-local bindings in P4 |
| R-004 | Unseen and deliberate Maybe are indistinguishable | `ReviewStatus` has no Unreviewed; default is `.maybe` | Product blocker | Preserve legacy Maybe with provenance; default new Candidate to Unreviewed |
| R-005 | Autosave can overwrite intentional save | 850 ms autosave calls `ProjectCodec.save` on the selected document | Data-loss blocker | P3 recovery mirror and Save barrier; keep recovery separate |
| R-006 | Font parsing/rendering shares application process | CoreText inspection and `BoardRenderer` run in-process | Security/stability blocker | P2/P6 crash-containment bake-off |
| R-007 | Production Linux client is absent | Electron P1 run `33010127784` proves a thin displayed Host around the shared Studio, not a renderer or package candidate | Product blocker | P2/P7 prototypes, then cross-platform tracer and packaging evidence |
| R-008 | Source watching may miss atomic replacement recovery | watcher binds file descriptors and reloads after rename/delete without a directory-level topology strategy | High | P6 topology fixtures: write, rename-over, delete/recreate, collection reorder |
| R-009 | Format support is broader than current evidence | extension list and CoreText acceptance stand in for full import/render/export proof | High | P2 redistributable corpus and explicit Full/Metadata-only/Deferred tiers |
| R-010 | No redistributable font fixture/output oracle | P1 preserves Mac/Linux architectural screenshots and traces, but uses names and geometry rather than real font binaries | High | Build fixture provenance set; generate cross-renderer outputs from redistributable fonts |
| R-011 | Reference CI dependencies are major-tag references | P1 workflows are SHA-pinned; `macos-reference.yml` still uses `actions/checkout@v4` and `actions/upload-artifact@v4` | Medium | Pin the preserved reference workflow after exact-version/licence/security review |
| R-012 | Filesystem traversal bounds are incomplete | file count is bounded, but depth, symlink directory cycles, byte totals, and time are not explicit | High | P2/P6 adversarial directory fixtures and canonical authorization |
| R-013 | Handoff lacks renderer identity and reconstruction depth | current JSON/Markdown omits Render Profile, Recipes, Scenes, exact Font Uses, findings, checksums | High | P8 reconstruction gate and Handoff contract |
| R-014 | UI and domain state live in one large `AppModel` | 643-line main-actor model owns documents, import, review, filters, watching, export, and autosave | Medium | Extract only through validated deep seams during tracer work; no architecture gardening |
| R-015 | Mac minimum and architecture policy conflict | reference says macOS 13 and permits x86_64; programme leads with macOS 14 and Apple silicon only | Decision blocker | P6 evidence and accepted platform ADR |
| R-016 | P1 assistive-technology and attended-quality evidence is unavailable in the current workspace | CI now proves displayed Linux and Mac WKWebView automation; no interactive Orca/VoiceOver or full native-window critique exists | Decision blocker | Run attended Linux/Orca and Mac/VoiceOver task traversals before D01 |
| R-017 | P1 reload checkpoint is not a production durability design | Variant A writes the validated `StudySession` to renderer `localStorage` | Data-loss blocker for production | Replace only after D03 accepts Host mirror, recovery location, and intentional Save barrier |
| R-018 | Full shared Studio has non-trivial UI and Host evidence surface | Shared runtime plus two Hosts is 4,127 lines, including 1,095 lines of CSS, an 828-line prototype App, and a 1,033-line all-in-one Mac evidence Host | Medium | Use P1 task evidence to accept/narrow/reject workspace ownership; do not promote prototype structure into production |
| R-019 | Electron 44 binary acquisition is explicit | npm package no longer downloads the binary during postinstall | Build reproducibility | Keep exact package lock and `electron:install` command; cache and verify binary in future CI/package ticket |
| R-020 | WKWebView recovery is proven only for reload | The Host installs a content-process termination handler, but run `33013245969` did not induce a termination | Decision blocker | Kill the Web Content process and require stage, revision, and focus recovery |

Judgement note: severity reflects product harm, not implementation difficulty.
