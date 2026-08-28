# Font Previewer repository cleanup — 2026-08-27

> Historical cleanup receipt. Its release status records the repository at that checkpoint; current truth lives in [`REPOSITORY_STATE.md`](REPOSITORY_STATE.md).

## Final result

Repository canonicalisation is complete for product integration, current documentation, permanent verification, and release preparation.

- Canonical/default branch: `main`
- Starting `main`: `f1a6df73246eab2d52b0ac582af8e9f737fcafd0`
- Final product-integration `main`: `671e9feeebcf39c7333d5abf7296d24b9641e74b`
- Readback `main` after receipt correction: `806b419f00f6f0662783bef9b00c9bcfd526edb0`
- Merged cleanup PR: #4
- Final PR head: `3aabf186b233a033e99e4c04915e7608a326713e`
- Product-integration tree: `212c38a48f59a945ad873b6535c52a75b09fa5c8`
- Readback tree: `116639a2679b37edf48005b0782b1b337371bf0c`
- Finalisation merge: `c5d445f1e086030c9ce884df74728538d21fb73b`
- Merged finalisation PR: #8
- Source version: `0.1.0`
- Current source posture: published `v0.1.0-rc.2` prerelease
- Latest published release: `v0.1.0-rc.2`
- Latest published release commit: `c5d445f1e086030c9ce884df74728538d21fb73b`
- Prior published release: `v0.1.0-rc.1`
- Prior published release commit: `6ae51f5618387e1e4e39f4816f797da35aaee57b`
- Stable release: none

The product-integration `main` commit and final PR head have the same tree. No product implementation was lost during squash merge. The 2026-08-28 readback `main` adds only the corrected version of this receipt; its `app/` and `.github/workflows/` subtrees remain byte-identical to the product-integration commit.

## Branches reviewed

| Branch | Recorded tip | Classification | Disposition |
|---|---|---|---|
| `main` | `806b419f00f6f0662783bef9b00c9bcfd526edb0` | Readback canonical truth; documentation-only child of product-integration commit | Retain |
| `codex/v1-release-candidate` | `6ae51f5618387e1e4e39f4816f797da35aaee57b` | Merged ancestor and published RC tip | Delete branch; retain tag, release, and PR history |
| `codex/v1-release-candidate-hardening-02` | `82072911d20ac10ae5e79aa31e0c0b2f7b404a11` | Merged ancestor | Delete branch |
| `codex/v0.2-pre-mac` | `84c9f4a527783bb2d121d346830b8a6bc42506ff` | Merged ancestor | Delete branch |
| `prototype/p1-full-shared-studio` | `be1d9f3a9def80624db74cb0aa9d091078f251a5` | Merged historical prototype; reference preserved in tree and provenance | Delete branch |
| `prototype/p1-macos-shared-studio` | `5028108880d227eb0ab1a8be246ffeac489f6e29` | Merged historical prototype; reference preserved in tree and provenance | Delete branch |
| `codex/publish-v0.1.0-rc.1` | `40e5b76a5657ee6e2c6f5dbc704f786d67f16bb9` | Stale release-only automation | Safe mechanism ported; delete branch |
| `chore/canonicalise-font-previewer-2026-08-27` | `e0e3f0801314a395eacb851995909ba42585dd68` | Transfer payload/export scaffolding only | Delete branch |
| `chore/canonicalise-font-previewer-2026-08-27-v2` | `3aabf186b233a033e99e4c04915e7608a326713e` | Squash-merged cleanup integration; tree equals canonical merge tree | Delete branch |

No branch contained newer unsalvaged product implementation. The eight reviewed refs were deleted after finalisation, exact-main verification, release publication, and release readback.

## Repository changes completed

- Replaced branch-era release-candidate verification with `.github/workflows/verify.yml`.
- Removed dead branch triggers and added exact-head checkout plus SHA-bound package artifacts.
- Retained a separate exact-head `macOS reference` workflow for the preserved native oracle.
- Added `.github/workflows/repository.yml` for version, workflow, link, and current-truth checks.
- Added a manual, exact-SHA, exact-run, non-overwriting, dry-run-first release workflow.
- Added version consistency checks and source-SHA manifests.
- Reconciled README, changelog, roadmap, contribution, security, installation, QA, status, and release documentation.
- Preserved branch-era reports under `docs/archive/2026-08-27/` and replaced their former current paths with current truth.
- Removed the published security-contact email from the tree and retained non-public vulnerability-reporting instructions.
- Kept FontBlind product and implementation concepts out of Font Previewer.

## Product-integration verification

All permanent workflows passed on product-integration commit `671e9feeebcf39c7333d5abf7296d24b9641e74b`:

- [Repository truth: run `33119845629`](https://github.com/bomkino/font-previewer/actions/runs/33119845629)
- [macOS reference: run `33119845491`](https://github.com/bomkino/font-previewer/actions/runs/33119845491)
- [Verify Font Previewer: run `33119845596`](https://github.com/bomkino/font-previewer/actions/runs/33119845596)
  - macOS AppKit/WKWebView evidence and package round trip: pass
  - Linux Electron/X11 and Wayland/Ozone evidence: pass
  - reproducible `.deb` and portable packages: pass
  - install, launch, remove, residue, privacy, SBOM, audit, checksum, and font-binary exclusion checks: pass

After this receipt was corrected, [Repository truth run `33120587354`](https://github.com/bomkino/font-previewer/actions/runs/33120587354) passed at exact readback `main` commit `806b419f00f6f0662783bef9b00c9bcfd526edb0`. The application and reference workflows did not run there because their path filters excluded this documentation-only change. Their evidence remains attached to `671e9feeebcf39c7333d5abf7296d24b9641e74b`; the readback `main` had the same `app/` and workflow subtrees.

## Interim repository readback — 2026-08-28

- PRs #1 through #4 are merged; no pull request is open.
- Issues #5, #6, and #7 remain open as the human, accessibility, physical, and containment gates.
- At this interim point, all eight reviewed non-`main` branches still remained and `main` was unprotected. The finalisation below supersedes that temporary state.

## Finalisation readback — 2026-08-28

- PR #8 merged exact green head `974ac2d311d7b3a6130adcb2ab1a1b51ea627432` into `main` as `c5d445f1e086030c9ce884df74728538d21fb73b`.
- Exact-main runs passed: Repository truth `33126457664`, macOS reference `33126457687`, and active macOS/Linux verification `33126457658`.
- Guarded dry run `33126674278` passed; publication run `33126821914` created `v0.1.0-rc.2` as a public prerelease.
- The tag and `SOURCE_SHA` resolve to the finalisation merge. The nine public assets were read back; release notes and all manifest-listed GitHub asset digests match.
- All eight reviewed non-`main` branches were deleted. `main` is the sole remote branch and merged branches now auto-delete.
- `main` is protected against force-push and deletion, including for administrators. Required checks were not attached because every existing workflow is path-filtered and a missing check would deadlock unrelated maintenance changes.
- The unused repository wiki and classic-project surfaces are disabled. Issues remain enabled for the three stable-v1 gates.
- Private vulnerability reporting, vulnerability alerts, Dependabot security updates, secret scanning, and secret-scanning push protection are enabled.

## Remaining human and physical gates

- Attended VoiceOver and Orca.
- Human typography, native-interface, and complex-script review.
- Independent clean-machine Study/Handoff reconstruction.
- Reference-hardware import, scrolling, long-session, and memory measurements.
- Wider hostile cross-format font corpus.
- Induced WKWebView content-process termination in a packaged real session.
- Developer ID signing and notarisation only if deliberately adopted later.

These gates block stable `v1.0.0`, broad platform-support claims, attended accessibility claims, and production signing/notarisation claims. They do not block canonical `main`.

## Release action

`v0.1.0-rc.2` was published as a prerelease from exact finalisation merge `c5d445f1e086030c9ce884df74728538d21fb73b`. The prior `v0.1.0-rc.1` tag and release remain historically intact; no existing tag or release was moved, overwritten, or deleted. Stable `v1.0.0` remains blocked by the human and physical gates above.
