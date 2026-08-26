# Font Previewer Status

## Baseline

- source repository: `bomkino/pitch-deck-tools`
- reference branch: `codex/native-macos-font-lab`
- reference SHA: `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`
- standalone extracted SHA: `f89cde8c3e6e347e29829e5bcd7ee59160d7b3ad`
- working branch: `codex/d00-reconciliation`
- latest verified shared SHA: none
- latest verified Mac SHA: none; baseline CI is red
- latest verified Linux SHA: none; Linux Host does not exist

## Current milestone

R0 — evidence and architecture decisions.

## Current frontier

- D00 / P0 reconciliation: complete on the working branch.
- Next unblocked decision: D01 / P1 workspace ownership.
- D02 / P2 rendering research may proceed independently, but no renderer decision is accepted.

## Claimed work

- None. D00 is closed; D01 has not yet been claimed on a prototype branch.

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

## Risks changed

- Increased: reference branch was described as working, but current reference SHA does not compile in macOS CI.
- Increased: no committed redistributable font corpus, Study file, screenshot, or successful output artifact exists at the reference SHA.
- Clarified: current schema collapses Source, Face, Candidate, and Font Use and defaults imports to Maybe.
- Clarified: current autosave writes the intentional document; it is not crash recovery.
- Reduced: standalone history extraction preserves the reference implementation without changing the source repository.

## Packages

- Mac: none verified at the reference SHA.
- Linux: none exists.

## Owner gates

- New GitHub repository visibility remains unselected.
- No merge, public release, deployment, signing identity use, or source-font delivery authorized.
- Repository creation is not exposed by the connected GitHub API surface; local standalone history is prepared first.

## Latest update

- date: 2026-08-26
- author: primary agent
- summary: D00 complete. Extracted standalone history, installed handover authority, audited reference code and CI, and produced reconciliation evidence. No product source changed.
