# Status and Change Control

## 1. Canonical status file

Maintain:

```text
tools/font-previewer/docs/STATUS.md
```

Template:

```markdown
# Font Previewer Status

## Baseline
- reference branch:
- reference SHA:
- integration branch:
- latest verified shared SHA:
- latest verified Mac SHA:
- latest verified Linux SHA:

## Current milestone
R0 / R0.5 / R1 / R2 / R3

## Current frontier
- <unblocked ticket>

## Claimed work
- <ticket / owner-agent / branch / started>

## Open decisions
- <decision / blocker / prototype>

## Accepted ADRs
- <ADR / gist>

## Evidence
- <artifact / branch / result>

## Risks changed
- <risk / direction / reason>

## Packages
- Mac:
- Linux:

## Owner gates
- <merge/release/licence/scope>

## Latest update
- date:
- author:
- summary:
```

## 2. Status truth rules

- A ticket is “in progress” only with an owner and branch/task.
- A ticket is “complete” only with evidence.
- A milestone is complete only when every exit criterion passes.
- A prototype working is not an accepted decision until its ADR is recorded.
- A source build is not a release candidate.
- A package build is not verified until installed/extracted and used.
- A draft PR is not merged.
- “Green” must name the exact SHA and gate.

## 3. Decision record

Maintain machine-readable decision state:

```json
{
  "id": "ADR-...",
  "status": "accepted|leading-hypothesis|open|deferred|rejected",
  "title": "...",
  "dependsOn": [],
  "evidence": [],
  "supersedes": [],
  "updatedAt": "..."
}
```

## 4. Change classes

### Class A — Reversible implementation detail

Examples:

- private helper name;
- internal cache container;
- local layout implementation.

Agent may decide and document briefly.

### Class B — Shared contract or module interface

Examples:

- HostBridge field;
- Study command;
- Render Result;
- error code.

Requires:

- accepted ticket scope;
- conformance fixtures;
- status update;
- migration/compatibility consideration.

### Class C — Accepted ADR reversal

Requires:

- explicit evidence;
- replacement ADR;
- affected-ticket re-evaluation;
- owner visibility.

### Class D — Product scope/licence/platform/release

Requires owner decision.

Examples:

- dropping Linux;
- adding cloud;
- incorporating GPL code;
- changing repository licence;
- public release;
- updater;
- font installation.

## 5. Concurrency control

### Claims

A task is claimed by:

- assigned issue;
- branch/worktree;
- STATUS entry.

### Shared-file lock

While a shared contract/package ticket is active, no second task edits the same authority area.

### Safe parallel work

- research;
- fixture provenance;
- isolated prototypes;
- Mac/Linux Host adapters after contract freeze;
- documentation that does not change decisions.

### Integration

One integration owner:

- confirms bases;
- chooses merge/cherry-pick order;
- resolves conflicts;
- reruns cross-platform gates;
- updates status.

## 6. Deviation protocol

When implementation reveals plan friction:

1. identify affected authority;
2. classify the change;
3. stop only the blocked slice;
4. produce the smallest evidence;
5. update ADR/backlog;
6. rewire blockers;
7. continue frontier.

Do not quietly fork the architecture in code.

## 7. Owner escalation format

```markdown
## Decision needed

**Question:**  
<one precise question>

**Why now:**  
<blocked user journey/ticket>

**Facts:**  
<researched evidence>

**Options:**  
A. ...
B. ...
C. ...

**Recommendation:**  
<clear recommendation>

**Cost of delay:**  
<material, not an ETA>

**Reversible later:**  
yes/no and why
```

## 8. Milestone review

At each milestone:

- demonstrate user journey;
- inspect status truth;
- run gauntlet questions;
- delete dead prototype/code/tickets;
- update risks;
- confirm next frontier;
- record owner gates.

## 9. Artifact naming

Use:

```text
evidence/<ticket>/<date>-<artifact>
```

Never use ambiguous files such as:

```text
final-final-v2-really-final.md
```

## 10. No ETA theatre

Progress updates report:

- decision closed;
- behavior working;
- evidence produced;
- blocker found;
- risk changed.

Do not use projected hours as a substitute for evidence.
