# Risk Ledger

| ID | Risk | Evidence | Severity | Next control |
|---|---|---|---|---|
| R-001 | Reference Mac build is not a usable oracle | GitHub Actions run `32954024459` fails during Swift compilation | Release blocker | Repair on isolated branch; rerun full Mac CI before treating output as baseline |
| R-002 | Domain identity collapses distinct concepts | `FontFaceRecord` owns path, Face metadata, axes, review, Role, tags, and notes | Architecture blocker | P4 Study v4 prototype and explicit migration |
| R-003 | Portable Study carries source paths | `FontStudy.records[].sourcePath` is serialized | Privacy/portability blocker | Separate portable Source hints from Host-local bindings in P4 |
| R-004 | Unseen and deliberate Maybe are indistinguishable | `ReviewStatus` has no Unreviewed; default is `.maybe` | Product blocker | Preserve legacy Maybe with provenance; default new Candidate to Unreviewed |
| R-005 | Autosave can overwrite intentional save | 850 ms autosave calls `ProjectCodec.save` on the selected document | Data-loss blocker | P3 recovery mirror and Save barrier; keep recovery separate |
| R-006 | Font parsing/rendering shares application process | CoreText inspection and `BoardRenderer` run in-process | Security/stability blocker | P2/P6 crash-containment bake-off |
| R-007 | Linux is absent | No Linux Host, renderer, package, or CI | Product blocker | P1/P2/P7 prototypes, then cross-platform tracer |
| R-008 | Source watching may miss atomic replacement recovery | watcher binds file descriptors and reloads after rename/delete without a directory-level topology strategy | High | P6 topology fixtures: write, rename-over, delete/recreate, collection reorder |
| R-009 | Format support is broader than current evidence | extension list and CoreText acceptance stand in for full import/render/export proof | High | P2 redistributable corpus and explicit Full/Metadata-only/Deferred tiers |
| R-010 | No current redistributable fixture/output oracle | repository contains no font binaries, Study files, screenshots, or baseline output artifacts | High | Build fixture provenance set; generate Mac/Linux evidence |
| R-011 | Current CI dependencies are major-tag references | `actions/checkout@v4`, `actions/upload-artifact@v4` are not commit-pinned | Medium | Pin after exact-version/licence/security review |
| R-012 | Filesystem traversal bounds are incomplete | file count is bounded, but depth, symlink directory cycles, byte totals, and time are not explicit | High | P2/P6 adversarial directory fixtures and canonical authorization |
| R-013 | Handoff lacks renderer identity and reconstruction depth | current JSON/Markdown omits Render Profile, Recipes, Scenes, exact Font Uses, findings, checksums | High | P8 reconstruction gate and Handoff contract |
| R-014 | UI and domain state live in one large `AppModel` | 643-line main-actor model owns documents, import, review, filters, watching, export, and autosave | Medium | Extract only through validated deep seams during tracer work; no architecture gardening |
| R-015 | Mac minimum and architecture policy conflict | reference says macOS 13 and permits x86_64; programme leads with macOS 14 and Apple silicon only | Decision blocker | P6 evidence and accepted platform ADR |

Judgement note: severity reflects product harm, not implementation difficulty.
