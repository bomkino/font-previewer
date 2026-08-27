# Font Previewer status

## Baseline

- Public repository: `bomkino/font-previewer`
- Preserved reference: `bomkino/pitch-deck-tools`, branch `codex/native-macos-font-lab`, SHA `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`
- Release-candidate branch: `codex/v1-release-candidate`
- Draft PR: [#1](https://github.com/bomkino/font-previewer/pull/1)
- Isolated hardening branch: `codex/v1-release-candidate-hardening-02`
- Hardening draft PR: [#2](https://github.com/bomkino/font-previewer/pull/2)
- Latest verified product/evidence SHA: `5d368650436bd2b1aca6f7efdf8825087a65d4e3`
- Exact verified tree: `ebfbce480d26e05d75cdd6f5b2a0a92d24883dd9`
- Exact-head Cross-Host workflow: [33043015559](https://github.com/bomkino/font-previewer/actions/runs/33043015559)

## Current milestone

R3 — release-candidate hardening.

The autonomous, credential-free hardening and hosted-runner evidence slice is complete. The milestone itself is not complete because attended accessibility/typography, independent reference-machine distribution/performance, production signing, decision, and owner release gates remain open.

## Current frontier

- T10 Family Groups: implementation and public-seam tests pass; attended design review remains.
- T15 installed Catalog: Host-local separation, bounded index/search/paging/cache, explicit Add, rebuild, opaque font load, Study non-mutation, and cancellation pass. Current 10,000-entry search p95 is 0.408 ms hosted Linux / 0.253 ms hosted Mac. A 500-Face, 2,000-operation, 100-recovery-round-trip diagnostic passes on both hosted architectures with stable entity counts and about 1.55 MB final post-GC heap growth. Actual 500-Face import/100-card rendering and reference-hardware budgets remain.
- T17 hardening: automated keyboard, semantics, path redaction, 1,000 malformed bridge messages, 250 corrupt Study documents, stale-test-output rejection, reload/focus, cancellation, sandbox, transactional failure recovery, bounded Linux metadata parsing, and basic truncated-font rejection pass. VoiceOver, Orca, hostile-font process isolation, and attended native review remain.
- T18 packaging: Mac ad-hoc `.app` ZIP and Linux `.deb`/portable archive pass integrity, notices, extraction/install, real displayed journey, removal, and residue checks on disposable hosted runners. Developer ID/notarization/stapling, independent clean reference machines, and owner decisions on RPM and Mac architecture remain.

## Implemented product

- One React/TypeScript Studio across AppKit/WKWebView and Electron.
- Study v4 with distinct Source, Binding, Face, Candidate, Recipe, Comparison Set, Font Use, Typography System, and Handoff concepts.
- Review, Compare, System, and Handoff with native menu/dialog integration.
- Host-owned recovery separate from intentional Save; revision barrier before Save/Handoff.
- Transactional Handoff with checksums and permission-gated Source copies.
- Secure bounded protocol v2 with no renderer filesystem capability or path-bearing preview URLs.
- Real installed-font discovery through CoreText and Fontconfig.
- Mac and Linux package-candidate workflows with immutable action pins, SBOM, audit, legal notices, and retained evidence.

## Decision state

Accepted ADR-001 through ADR-013 remain unchanged. Implementation evidence strongly supports the leading full-shared-Studio and optimistic-Host-mirror hypotheses, but no open/leading ADR was silently accepted.

Still owner/decision-gated:

- production interactive/reference renderer and format tiers;
- formal Study authority/durability ADR;
- Mac App Sandbox/document/process-isolation policy;
- Linux drawing/PDF backend and RPM requirement;
- minimum macOS/architecture distribution policy;
- Developer ID distribution model;
- merge and public release.

## Evidence

- Linux passes 28/28 domain, grouping, protocol, Host-utility, durability, Catalog, font-inspection, migration, and surface tests. Mac passes 27 with the Linux-only malformed-font execution test explicitly not applicable. The runner deletes compiled test output first and proves a planted stale test cannot execute.
- Strict Studio, Electron main, and sandboxed preload builds pass.
- Renderer bundle is approximately 86.1 kB gzip; preload is approximately 6.5 kB gzip.
- CycloneDX 1.6 SBOM contains 81 resolved components; npm audit reports zero known vulnerabilities.
- macOS displayed evidence passes warning-free Host compilation, AppKit menu dispatch, real panel open/cancel/focus, actual CoreText Catalog font load, Catalog/Study separation, 15 ms cancellation, transactional Handoff commit-failure recovery, semantics, layout, security, reload recovery, and six snapshots.
- Linux displayed evidence passes native menu semantics, actual Fontconfig Catalog font load, Catalog/Study separation, 3.9 ms cancellation, Chromium AX tree, layout, security, transactional Handoff, reload recovery, and six screenshots.
- Packaged-app round trips pass from the extracted Mac ZIP, extracted Linux archive, and installed Linux `.deb`; checksums, ad-hoc Mac integrity, SUID sandbox ownership, application journey, uninstall, and installed-file removal are asserted. These are disposable hosted-runner checks, not independent clean-machine or notarization evidence.
- Exact-SHA soak artifacts record stable 500-Source/Face/Candidate counts across 2,000 operations and 100 recovery round trips. Hosted totals are 740.605 ms Linux and 618.764 ms Mac; final post-GC heap growth is 1,553,568 bytes Linux and 1,548,336 bytes Mac. These are diagnostic, not universal budgets.
- Exact details: [`app/REPORT.md`](../../app/REPORT.md).

## Owner gates

- No merge, release, deployment, production signing identity, or source-font delivery is authorized.
- The PR remains draft.
- Public artifacts remain CI evidence builds.
- Human/credential gates must be recorded before marking R3 complete or converting the PR from draft.

## Latest update

- Date: 2026-08-27
- Author: primary agent
- Summary: exact-head Mac/Linux CI now also verifies Linux exact collection-face metadata, bounded malformed-font rejection, v1/v2/v3 migrations, and retained 500-Face long-session/memory diagnostics. T19 capability reconciliation and the T20 owner packet are prepared separately; no merge, release, production signing, notarization, or attended accessibility claim occurred.
