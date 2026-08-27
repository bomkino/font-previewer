# Contributing

Font Previewer is prerelease software. `main` is the canonical branch. Read `AGENTS.md`, `docs/maintenance/REPOSITORY_STATE.md`, `docs/ARCHITECTURE.md`, `docs/QA.md`, and any relevant ADR before changing code or claims.

## Working rules

1. Preserve Source/Binding/Face/Candidate/Font Use separation and Catalog/Study separation.
2. Keep privileged operations in the Host and the HostBridge closed, path-free, runtime-validated, and bounded.
3. Add tests at a public seam for a named user, security, privacy, accessibility, or migration risk.
4. Preserve the root `macos/` reference until a deliberate evidence-backed disposition replaces it.
5. Keep font binaries, Studies, recovery files, Handoffs, client material, absolute paths, email addresses, credentials, and internal handover packages out of Git and release artifacts.
6. Record exact SHA, commands, evidence, limitations, and changed risk.
7. Do not weaken an evidence assertion merely to make CI green.
8. Do not publish, overwrite a release, move a published tag, add secrets, or make signing/notarisation claims without explicit owner authorization.

## Required verification

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

Changes to the active application, package output, or release machinery must pass both jobs in `.github/workflows/verify.yml` at the exact proposed head.

A Linux build is not a Mac claim. Automated semantics are not attended VoiceOver/Orca evidence. Hosted clean runners are not broad independent-machine acceptance. An ad-hoc signature is not Developer ID signing or notarisation.

## Fixtures

Committed font fixtures require exact provenance, licence, redistribution permission, purpose, expected behavior, size, and upstream version. Paid fonts, client fonts, copied system fonts, and mystery binaries are forbidden.

## Branch and commit hygiene

- Branch from current `main`.
- Keep commits coherent and scoped.
- Preserve unrelated work.
- Update current-state docs when a version, workflow, support boundary, or release claim changes.
- Delete merged and superseded branches after their exact tips are recorded.
- Historical reports must be visibly historical and must not serve as current instructions.
