# Font Previewer status

## Baseline

- Public repository: `bomkino/font-previewer`
- Preserved reference: `bomkino/pitch-deck-tools`, branch `codex/native-macos-font-lab`, SHA `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`
- Release-candidate branch: `codex/v1-release-candidate`
- Draft PR: [#1](https://github.com/bomkino/font-previewer/pull/1)
- Latest verified remote code SHA: `704be6e94939b867323f735609d692c1e5c6ad67`
- Exact verified tree: `98ae42c9a5da2f61ba6df304d66cb0c400cbb97a`
- Cross-Host workflow: [33023567900](https://github.com/bomkino/font-previewer/actions/runs/33023567900)

## Current milestone

R3 — release-candidate hardening.

The autonomous, credential-free implementation and automated evidence slice is complete. The milestone itself is not complete because human accessibility/typography, clean-machine distribution, production signing, performance, and owner release gates remain open.

## Current frontier

- T10 Family Groups: implementation and public-seam tests pass; attended design review remains.
- T15 installed Catalog: Host-local separation, server search, 10,000-entry bound, 80-entry paging, 400-entry cache, explicit Add, rebuild, opaque font load, and Study-nonmutation evidence pass. Synthetic 10,000-entry latency/cancellation evidence remains.
- T17 hardening: automated keyboard, semantics, path-redaction, bridge rejection, reload/focus, sandbox, and package evidence pass. VoiceOver, Orca, malformed-font containment, long-session, and reference-hardware budgets remain.
- T18 packaging: Mac ad-hoc `.app` ZIP and Linux `.deb`/portable archive pass integrity and notice checks. Developer ID/notarization/stapling, clean-machine install/uninstall, and an owner decision on RPM remain.

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

- 19/19 domain, grouping, protocol, Host-utility, and surface tests pass.
- Strict Studio, Electron main, and sandboxed preload builds pass.
- Renderer bundle is approximately 85.9 kB gzip; preload is approximately 6.5 kB gzip.
- CycloneDX 1.6 SBOM contains 81 resolved components; npm audit reports zero known vulnerabilities.
- macOS displayed evidence passes warning-free Host compilation, AppKit menu dispatch, real panel open/cancel/focus, actual CoreText Catalog font load, Catalog/Study separation, semantics, layout, security, reload recovery, six snapshots, app assembly, ad-hoc signature verification, notices, ZIP, and checksum.
- Linux displayed evidence passes native menu semantics, actual Fontconfig Catalog font load, Catalog/Study separation, Chromium AX tree, layout, security, transactional Handoff, reload recovery, six screenshots, `.deb`/portable assembly, SUID sandbox ownership, notices, and checksums.
- Exact details: [`app/REPORT.md`](../../app/REPORT.md).

## Owner gates

- No merge, release, deployment, production signing identity, or source-font delivery is authorized.
- The PR remains draft.
- Public artifacts remain CI evidence builds.
- Human/credential gates must be recorded before marking R3 complete or converting the PR from draft.

## Latest update

- Date: 2026-08-26
- Author: primary agent
- Summary: release-candidate code now runs on both desktop Hosts with a separate paginated installed Catalog, explicit Add-to-Study, Family Groups, real installed-font loading, secure recovery/Handoff, verified packages, notices, and cross-Host evidence. Remaining work is explicitly human-, credential-, performance-, or owner-gated.
