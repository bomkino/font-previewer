# Font Previewer Status

## Baseline

- source repository: `bomkino/pitch-deck-tools`
- reference branch: `codex/native-macos-font-lab`
- reference SHA: `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`
- standalone extracted SHA: `f89cde8c3e6e347e29829e5bcd7ee59160d7b3ad`
- working branch: `prototype/p1-full-shared-studio`
- latest verified shared SHA: none
- latest verified Mac SHA: none; baseline CI is red
- latest verified Linux SHA: none; P1 Electron shell compiles, but no desktop runtime evidence exists

## Current milestone

R0 — evidence and architecture decisions.

## Current frontier

- D00 / P0 reconciliation: complete at `c707590`.
- D01 / P1 workspace ownership: Variant A implemented on an isolated prototype branch; decision evidence remains incomplete.
- D02 / P2 rendering research may proceed independently, but no renderer decision is accepted.

## Claimed work

- Primary agent claims D01 / P1 on `prototype/p1-full-shared-studio`.
- Scope: Variant A, a full shared Studio, using the canonical 24-Candidate fixture and a narrow Electron HostBridge.
- Implemented evidence: explicit Source/Binding/Face/Candidate/Font Use model, semantic command tests, recovery validation, runtime-validated bridge, secure Electron shell, native menu/dialog routes, four-stage Studio, and dependency SBOM.
- Decision remains open until Mac/WKWebView, displayed Linux/Electron, native menu/dialog, reload, focus, input-latency, and VoiceOver/Orca evidence are recorded.

## Open decisions

- D01 — full shared Studio versus narrowed shared stage versus separate UIs.
- D02 — interactive renderer, reference renderer, Linux backend, and format tiers.
- D03 — Study authority, mirror, recovery, and Save barrier.
- D04 — Study v4 and migration.
- D05 — UX composition and visible stage labels.
- D06 — Mac documents, sandbox, engine isolation, and minimum OS.
- D07 — Linux process transport and package set.
- D08 — cross-platform accessibility and security contract.
- D09 — tracer contract freeze.

## Accepted ADRs

- ADR-001 — one product, two Hosts.
- ADR-002 — Mac reference, Linux first-class.
- ADR-003 — Review, Compare, System, Handoff.
- ADR-004 — Catalog separate from Study.
- ADR-005 — Source, Face, Candidate, Font Use are distinct.
- ADR-006 — portable IDs are not paths or names.
- ADR-007 — new Candidates are Unreviewed.
- ADR-008 — semantic parity, not raster parity.
- ADR-009 — local-only V1.
- ADR-010 — no font installation mutation.
- ADR-011 — expand–contract migration.
- ADR-012 — risk-led public-seam testing.
- ADR-013 — owner controls irreversible actions.

## Evidence

- `docs/programme/RECONCILIATION.md`
- `evidence/D00/2026-08-26/fixture-manifest.json`
- `evidence/D00/2026-08-26/reference-output-index.json`
- `evidence/D00/2026-08-26/repository-inventory.json`
- GitHub Actions run `32954024459`: failed at Swift compilation for reference SHA.
- Source equivalence check: extracted `macos/` tree matches the reference subtree.
- `prototypes/p1-shared-studio/REPORT.md`
- `evidence/P1/2026-08-27/environment.json`
- `evidence/P1/2026-08-27/verification.json`
- `.github/workflows/p1-linux-evidence.yml` is SHA-pinned and ready for manual dispatch after repository creation; it has not run.
- 10 public-seam/domain/protocol tests pass; renderer and Electron TypeScript builds pass.
- CycloneDX 1.6 SBOM contains 81 resolved components; npm audit reports zero known vulnerabilities.

## Risks changed

- Increased: reference branch was described as working, but current reference SHA does not compile in macOS CI.
- Increased: no committed redistributable font corpus, Study file, screenshot, or successful output artifact exists at the reference SHA.
- Clarified: current schema collapses Source, Face, Candidate, and Font Use and defaults imports to Maybe.
- Clarified: current autosave writes the intentional document; it is not crash recovery.
- Reduced: standalone history extraction preserves the reference implementation without changing the source repository.
- Reduced: P1 does not repeat the reference domain collapse; Font Use and Source Binding are explicit and separately validated.
- Reduced: Electron renderer has no Node access, uses context isolation and sandboxing, and receives no source path.
- Increased: P1 cannot reach a displayed Linux session, D-Bus, Orca, macOS, or WKWebView in this workspace; full-Studio acceptance is therefore unproven.
- Clarified: renderer `localStorage` is a prototype reload checkpoint, not the accepted D03 recovery architecture.

## Packages

- Mac: none verified at the reference SHA.
- Linux: P1 shell compiles with Electron `44.0.0`; package launch reaches the main process but desktop readiness is blocked by the environment.

## Owner gates

- New GitHub repository visibility remains unselected.
- No merge, public release, deployment, signing identity use, or source-font delivery authorized.
- Repository creation is not exposed by the connected GitHub API surface; local standalone history is prepared first.

## Latest update

- date: 2026-08-27
- author: primary agent
- summary: P1 Variant A is green at type, domain, protocol, SSR surface, build, dependency, and static security gates. D01 stays open because native runtime, screen-reader, focus, reload, and Mac quality gates could not be exercised here.
