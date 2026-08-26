# Contributing

Font Previewer is in evidence-led R0 work. Read `AGENTS.md`, `docs/programme/STATUS.md`, the current ticket, and relevant accepted ADRs before changing code.

## Working rules

1. Use one branch for one decision prototype or vertical ticket.
2. Confirm blockers are closed before starting downstream work.
3. Preserve the macOS reference until replacement evidence exists.
4. Add tests only at a named public seam for a named user risk.
5. Keep font sources, studies, exports, client material, and absolute paths out of Git.
6. Record evidence, limitations, and changed risks.
7. Do not merge, publish, or release without owner approval.

## Commit hygiene

- Keep commits coherent and scoped.
- Avoid unrelated refactors.
- Include fresh verification in the completion report.
- Never claim macOS, Linux, accessibility, package, or visual gates you did not run.

## Fixtures

Committed font fixtures require exact provenance, licence, redistribution permission, purpose, expected behavior, size, and upstream version. Paid fonts, client fonts, system fonts copied from macOS, and mystery binaries are forbidden.
