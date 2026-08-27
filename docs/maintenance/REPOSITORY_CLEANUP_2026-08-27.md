# Font Previewer repository cleanup — 2026-08-27

> Execution receipt in progress. Final merge SHA, workflow runs, deleted branches, dry-run artifacts, checksums, issues, and any permission-bound omissions are filled only after exact-head verification.

## Starting state

- Default branch: `main`
- Starting main: `f1a6df73246eab2d52b0ac582af8e9f737fcafd0`
- Source version: `0.1.0`
- Latest published release: `v0.1.0-rc.1`
- Published release commit: `6ae51f5618387e1e4e39f4816f797da35aaee57b`
- Open product PRs: none
- Merged product PRs reviewed: #1, #2, #3

## Branches reviewed

| Branch | Starting tip | Classification | Disposition |
|---|---|---|---|
| `main` | `f1a6df73246eab2d52b0ac582af8e9f737fcafd0` | Canonical product state | Retain |
| `codex/v1-release-candidate` | `6ae51f5618387e1e4e39f4816f797da35aaee57b` | Merged ancestor and published RC tip | Delete branch; retain tag/release/PR |
| `codex/v1-release-candidate-hardening-02` | `82072911d20ac10ae5e79aa31e0c0b2f7b404a11` | Merged ancestor | Delete branch |
| `codex/v0.2-pre-mac` | `84c9f4a527783bb2d121d346830b8a6bc42506ff` | Merged ancestor | Delete branch |
| `prototype/p1-full-shared-studio` | `be1d9f3a9def80624db74cb0aa9d091078f251a5` | Merged historical prototype; reference preserved in tree/provenance | Delete branch |
| `prototype/p1-macos-shared-studio` | `5028108880d227eb0ab1a8be246ffeac489f6e29` | Merged historical prototype; reference preserved in tree/provenance | Delete branch |
| `codex/publish-v0.1.0-rc.1` | `40e5b76a5657ee6e2c6f5dbc704f786d67f16bb9` | Stale release-only automation | Port safe mechanism; delete branch |
| `chore/canonicalise-font-previewer-2026-08-27` | `e0e3f0801314a395eacb851995909ba42585dd68` | Transfer payload/export scaffolding only | Delete branch |
| `chore/canonicalise-font-previewer-2026-08-27-v2` | Created from starting `main` | Active cleanup integration | Merge after green exact-head CI; then delete |

No branch above contains newer unsalvaged product implementation after the reviewed RC/pre-Mac merges. The publishing branch’s useful intent is represented by the guarded release workflow on the cleanup branch; its hard-coded historical run assumptions are not retained.

## Repository changes prepared

- Replaced `.github/workflows/release-candidate.yml` with `.github/workflows/verify.yml`.
- Removed dead branch triggers and added exact-head checkout plus SHA-bound package artifacts.
- Retained a separate exact-head `macOS reference` workflow for the preserved native oracle.
- Added a manual, exact-SHA, exact-run, non-overwriting, dry-run-first release workflow.
- Added version consistency checks and source-SHA manifests.
- Reconciled README, changelog, roadmap, contribution, security, installation, QA, status, and release documentation.
- Preserved branch-era reports unchanged under `docs/archive/2026-08-27/` and replaced their former current paths with current truth.
- Removed the published security-contact email from the tree in favor of private vulnerability reporting.
- Kept FontBlind product and implementation concepts out of Font Previewer.

## Final evidence

Pending exact-head CI and final GitHub cleanup. No public release or tag has been created, moved, overwritten, or deleted.
