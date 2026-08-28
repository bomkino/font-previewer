# Capability parity and migration report

## Scope

This matrix reconciles the preserved `macos/` reference with the active shared Simple + Studio product and its AppKit/WKWebView and Electron Hosts. “Verified” means source and automated evidence agree. It does not mean attended design, accessibility, or typography approval.

| Capability | Active shared product | macOS Host | Linux Host | State / limit |
|---|---|---|---|---|
| Source/folder import | Bounded traversal; Source, Binding, Face, and Candidate remain distinct | CoreText validates and enumerates descriptors | Fontconfig validates metadata; `fc-query` preserves collection face indices | Verified automatically; hostile-font process isolation remains unverified |
| Installed Catalog | Host-local index, search, paging, cancellation, explicit Add | CoreText, 10,000-entry bound | Fontconfig, 10,000-entry bound | Verified; browsing cannot mutate Study |
| Face identity | Durable Face ID plus exact source-local face index | Descriptor index and PostScript metadata | `fc-query` index and names; collection rendering remains metadata-only | Verified for metadata semantics; no raster-parity claim |
| Variable fonts | Candidate axes are independent semantic values | CoreText reports axes | Fontconfig identifies variable Faces; a bounded Fontkit child reports axes and named instances | Automated parity verified with a real Inter variable font in Linux CI; attended typography remains unverified |
| Simple intake | Files/folders plus family-first installed picker and style detail feed the same Study | Native panel and CoreText Catalog | Native dialog and Fontconfig Catalog | Mac displayed state-travel verified locally; exact-head Linux CI pending for this candidate |
| Simple boards | Four fonts per 5,152 × 2,160 page, optional 12-up index, stress/casing/axes/order/include, shared sizing | Host validates and transactionally commits renderer PNGs | Host validates and transactionally commits renderer PNGs | Unit and displayed Mac evidence verified; human typography approval unverified |
| Review | Contact Sheet, Focus, Waterfall, decisions, tags, notes, rationale | Shared Studio | Shared Studio | Verified automatically; attended typography review unverified |
| Compare | Four-Candidate tray, blind reveal, size policies, saved sets | Shared Studio | Shared Studio | Verified automatically |
| System | Roles create Font Uses without collapsing Candidates | Shared Studio | Shared Studio | Verified automatically |
| Save/recovery | Portable Study v4; Host-local binding/recovery; atomic intentional Save | AppKit Host | Electron Host | Verified including injected atomic-commit failure |
| Relink/watch | Binding replacement preserves portable identity | Native file monitoring | Node file watcher | Verified at public seams; attended replacement matrix unverified |
| Handoff | Summary, JSON, CSV, PDF/screens, manifest/checksums, default-on internal Source copies with opt-out | Transactional Host export | Transactional Host export | Verified including injected commit failure; independent human reconstruction and font rights remain user responsibilities |
| Native integration | Menus, panels, undo/redo, focus return | AppKit | Electron | Displayed CI verified; attended native-feel review unverified |
| Interface scaling | One 80–140% control across Simple and Studio | Shared renderer | Shared renderer | Mac evidence checks all seven steps, 44 px minimum at 80%, overflow, and truncation; exact-head Linux candidate run pending |
| Accessibility | Shared semantic UI and keyboard contract | Automated semantics/focus | Automated semantics/focus and Chromium AX tree | VoiceOver and Orca remain unverified |
| Packaging | Notices, SBOM, checksums, displayed package journey | Hardened-runtime/ad-hoc app ZIP | Portable archive and installed `.deb` | Disposable CI verified; Developer ID/notarization deliberately absent from v0.1; independent clean machines unverified |

## Legacy migration

- Study schemas v1, v2, and v3 migrate through the same explicit v4 adapter.
- Migration creates separate Source, Face, Candidate, and Font Use objects.
- legacy `Maybe` decisions survive with provenance instead of becoming `Unreviewed`.
- local source paths are removed rather than copied into the portable Study.
- role mappings remain visible; unsupported/newer schemas fail closed.
- automated fixtures cover every supported legacy schema version.

The root `macos/` application, `typeboards.html`, `figma-font-test-exporter.html`, and `start-font-previewer.sh` remain provenance/oracle material. They are not active product entry points and are not evolved beside `app/`. This is conscious retention, not duplicate authority.

## T19 conclusion

The autonomous T19 work is verified: capability disposition is explicit, v1–v3 migrations are exercised, the active application path is unambiguous, legacy artifacts contain no private font/Study evidence, and documentation is current. Owner decisions are recorded in the release decision packet; human gates remain unverified rather than silently waived.
