# Branch policy

## Canonical branch

`main` is the only permanent product branch and the repository default. Current product truth, maintained documentation, permanent CI, and release preparation live on `main`.

Branch names such as `release-candidate`, `hardening`, `pre-Mac`, `publishing`, `prototype`, or an autonomous ticket identifier do not define architecture or release state.

## Temporary branches

Create a temporary branch from current `main` for a coherent change. Prefer:

- `feat/<scope>`
- `fix/<scope>`
- `chore/<scope>`
- `docs/<scope>`

A pull request must identify:

- exact base and head SHA;
- product or repository change;
- verification command and exact-head workflow run;
- package or migration impact;
- claims supported and limitations remaining.

## Merge policy

- Do not merge red CI.
- Verify the exact proposed head, not merely a branch name.
- Use squash merge for noisy autonomous-agent history when individual commits add no durable value.
- Preserve coherent commit history only when it improves maintenance or provenance.
- Recheck the target head immediately before merge.
- Do not merge an incomplete experiment into an enabled product path.

## Cleanup policy

After a successful merge, record the branch tip SHA in the cleanup receipt and delete the remote branch when it is:

- fully merged;
- squash-merged with an equivalent patch on `main`;
- duplicate or superseded;
- temporary CI/release scaffolding;
- a prototype whose useful reference is preserved elsewhere.

Do not delete unreviewed unique work. Integrate the useful subset, record a deliberate rejection, or retain the branch with a concrete issue and disposition.

Use archival tags sparingly and only for unique rejected or historically necessary work. Do not replace branch clutter with tag clutter.

## Protection

`main` must reject force pushes and deletion where repository settings permit. Required checks should be added only when their names are stable and the configuration does not make emergency repair impossible. Protection settings and any permission limitation are recorded in the cleanup receipt.
