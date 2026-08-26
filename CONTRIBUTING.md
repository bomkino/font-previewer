# Contributing

Font Previewer is in R3 release-candidate hardening. Read `AGENTS.md`, `docs/programme/STATUS.md`, the relevant accepted ADRs, and the named ticket before changing code.

## Working rules

1. Preserve Source/Binding/Face/Candidate/Font Use separation and Catalog/Study separation.
2. Keep privileged operations in the Host and the HostBridge closed, path-free, runtime-validated, and bounded.
3. Add tests at a public seam for a named user/security risk.
4. Preserve the root `macos/` reference until replacement rendering evidence exists.
5. Keep font binaries, Studies, recovery files, Handoffs, client material, absolute paths, and credentials out of Git.
6. Record exact SHA, commands, evidence, limitations, and changed risk.
7. Do not merge, mark the PR ready, sign for distribution, publish, or release without owner approval.

## Required verification

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

Changes to the application or release workflow must pass both jobs in `.github/workflows/release-candidate.yml`. A Linux-only build is not a Mac claim; a semantic audit is not a VoiceOver/Orca pass; a package is not a verified release until clean-machine and signing gates close.

## Fixtures

Committed font fixtures require exact provenance, licence, redistribution permission, purpose, expected behavior, size, and upstream version. Paid fonts, client fonts, copied system fonts, and mystery binaries are forbidden.

## Commit hygiene

- Keep commits coherent and scoped.
- Preserve unrelated work.
- Update status/docs when a claim or gate changes.
- Never weaken an evidence assertion merely to make CI green.
