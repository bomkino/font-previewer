# Font Previewer status

## Baseline

- Public repository: `bomkino/font-previewer`
- Preserved reference: `bomkino/pitch-deck-tools`, branch `codex/native-macos-font-lab`, SHA `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`
- Release-candidate branch: `codex/v1-release-candidate`
- Draft PR: [#1](https://github.com/bomkino/font-previewer/pull/1)
- Isolated hardening branch: `codex/v1-release-candidate-hardening-02`
- Hardening draft PR: [#2](https://github.com/bomkino/font-previewer/pull/2)
- Latest verified product/evidence SHA: `a5dd924265d85ec37d8022732b923ccc89cedad4`
- Exact verified tree: `73f865a661f6b05d6f5fad67d9af6a823c532f37`
- Exact-head Cross-Host workflow: [33040027604](https://github.com/bomkino/font-previewer/actions/runs/33040027604)

## Current milestone

R3 — release-candidate hardening.

The autonomous, credential-free hardening and hosted-runner evidence slice is complete. The milestone itself is not complete because attended accessibility/typography, independent reference-machine distribution/performance, production signing, decision, and owner release gates remain open.

## Current frontier

- T10 Family Groups: implementation and public-seam tests pass; attended design review remains.
- T15 installed Catalog: Host-local separation, bounded index/search/paging/cache, explicit Add, rebuild, opaque font load, Study non-mutation, and cancellation pass. The 10,000-entry synthetic search p95 is 0.477 ms on hosted Linux and 0.906 ms on hosted Mac; reference-hardware, 500-Face, and long-session memory evidence remain.
- T17 hardening: automated keyboard, semantics, path redaction, 1,000 malformed bridge messages, 250 corrupt Study documents, stale-test-output rejection, reload/focus, cancellation, sandbox, and transactional failure recovery pass. VoiceOver, Orca, hostile-font containment, long-session, and attended native review remain.
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

- 25/25 domain, grouping, protocol, Host-utility, durability, Catalog, and surface tests pass. The runner deletes compiled test output first and proves a planted stale test cannot execute.
- Strict Studio, Electron main, and sandboxed preload builds pass.
- Renderer bundle is approximately 86.1 kB gzip; preload is approximately 6.5 kB gzip.
- CycloneDX 1.6 SBOM contains 81 resolved components; npm audit reports zero known vulnerabilities.
- macOS displayed evidence passes warning-free Host compilation, AppKit menu dispatch, real panel open/cancel/focus, actual CoreText Catalog font load, Catalog/Study separation, 15 ms cancellation, transactional Handoff commit-failure recovery, semantics, layout, security, reload recovery, and six snapshots.
- Linux displayed evidence passes native menu semantics, actual Fontconfig Catalog font load, Catalog/Study separation, 3.9 ms cancellation, Chromium AX tree, layout, security, transactional Handoff, reload recovery, and six screenshots.
- Packaged-app round trips pass from the extracted Mac ZIP, extracted Linux archive, and installed Linux `.deb`; checksums, ad-hoc Mac integrity, SUID sandbox ownership, application journey, uninstall, and installed-file removal are asserted. These are disposable hosted-runner checks, not independent clean-machine or notarization evidence.
- Exact details: [`app/REPORT.md`](../../app/REPORT.md).

## Owner gates

- No merge, release, deployment, production signing identity, or source-font delivery is authorized.
- The PR remains draft.
- Public artifacts remain CI evidence builds.
- Human/credential gates must be recorded before marking R3 complete or converting the PR from draft.

## Latest update

- Date: 2026-08-27
- Author: primary agent
- Summary: isolated hardening now adds deterministic fresh-test discovery, bounded 10,000-entry Catalog diagnostics, explicit cross-Host cancellation, malformed protocol/Study corpora, injected save/Handoff commit failures, and packaged-app round trips. Exact-head Mac and Linux CI is green; no merge, release, production signing, notarization, or attended accessibility claim occurred.
