# Codex Task Template

Use one copy per prototype or vertical build ticket.

```text
# Ticket

<ID — title>

## Repository

bomkino/pitch-deck-tools

## Base

<verified branch and SHA>

## Working branch

<new isolated branch>

Do not merge.

## Milestone

<R0 / R0.5 / R1 / R2 / R3>

## Blockers

- <ticket — confirmed closed>
- <accepted ADR>

Do not start if a blocker is open.

## Read first

- AGENTS.md
- 00_MASTER_HANDOFF.md
- relevant Product/UX section
- 03_DOMAIN_MODEL.md
- accepted ADRs
- current STATUS.md
- ticket body
- relevant reference-branch files
- test/security section for the named seam

## Outcome

<One complete user-visible behavior or one decision question.>

## Scope

<The narrow vertical slice or throwaway prototype.>

## Acceptance criteria

- [ ] ...
- [ ] ...
- [ ] ...

## Public seam

<Study Session / HostBridge / Render Service / Catalog / Handoff Builder / packaged App / human prototype>

## Named risk

<What plausible failure is being protected or decided?>

## Independent evidence

<Fixture, literal expected output, task observation, packaged artifact, external engine result, or other oracle.>

## Non-goals

- No unrelated refactor.
- No product scope expansion.
- No random tests or snapshot expansion.
- No Font binary/private artifact in Git.
- No merge, deployment, or publication.
- <ticket-specific non-goals>

## Architecture constraints

- one product, two Hosts;
- Source ≠ Face ≠ Candidate ≠ Font Use;
- Catalog stays outside Study;
- portable IDs are not paths/names;
- Host owns privileged operations;
- one semantic authority;
- Render Profile declared;
- no path leakage;
- expand–contract migration;
- preserve reference behavior until replacement evidence.

## Work method

1. Inspect relevant code/history.
2. State any conflict with accepted authority.
3. For a prototype, answer the question with the cheapest runnable artifact.
4. For a build ticket, implement the smallest complete vertical path.
5. Add tests only at the agreed seam.
6. Run fresh verification.
7. inspect diff and Git status.
8. Commit one coherent change.
9. Update STATUS/ADR/evidence pointers where required.
10. Do not merge.

## Completion report

- base:
- branch:
- head commit:
- files changed:
- user-visible behavior or decision:
- commands run:
- tests/evidence:
- performance result:
- security/privacy result:
- limitations:
- risks changed:
- docs/status changed:
- merge status: not merged
```

## Prototype addendum

A prototype:

- is named as throwaway;
- has no production persistence unless that is the question;
- exposes state and measurements;
- skips broad error handling;
- avoids abstractions;
- records accept/reject;
- preserves a branch/context pointer;
- contributes only validated decisions or deliberately extracted code.
