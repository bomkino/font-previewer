# Study State and Durability Decision Gate

## 1. Decision

Choose where semantic authority lives and how native Save/recovery remains trustworthy without introducing visible command latency or duplicated domain logic.

This is an R0 gate.

## 2. Fixed invariants

- one semantic authority;
- one monotonic revision sequence per document;
- semantic undo/redo;
- no cross-document stale command;
- native Save and Save As;
- recovery separate from intentional file;
- corrupt recovery cannot replace last good save;
- close/export/document switch flushes drafts;
- web-process crash preserves the documented durability guarantee;
- Host never edits Study JSON ad hoc;
- platform round trip preserves semantic snapshot.

## 3. Option A — Optimistic Studio authority + asynchronous durable Host mirror

### Flow

1. Studio validates and commits Semantic Command locally.
2. UI updates immediately.
3. Studio emits snapshot/revision to Host.
4. Host validates schema, StudyID, and monotonic revision.
5. Host ACKs and persists recovery according to policy.
6. Studio tracks acknowledged revision.

### Save

- flush drafts;
- wait for Host mirror through current revision;
- Host atomically writes its mirror.

### Strengths

- immediate UI;
- one shared TypeScript domain;
- simple native menu dispatch;
- Host can Save after web-process loss up to acknowledged revision.

### Risks

- unacknowledged changes can be lost on sudden process death;
- Host cannot deeply validate semantics without shared reducer;
- reconciliation after Host rejection;
- undo history must be reconstructable or mirrored enough for recovery.

### Leading hypothesis

This is the preferred starting option.

## 4. Option B — Synchronous commit-before-publish

### Flow

1. Studio computes candidate state.
2. sends snapshot/revision;
3. Host validates/ACKs;
4. Studio publishes UI and undo.

### Strengths

- every visible committed state is Host acknowledged;
- clean durability promise.

### Risks

- bridge latency enters every command;
- web UI depends on Host health;
- rapid review may feel sticky;
- slider/text controls require complex draft layer.

Use only if measured latency is negligible and simplicity remains acceptable.

## 5. Option C — Host-authoritative shared Document Engine

### Shape

Studio dispatches commands.

A shared Host/native core mutates state, returns patch/snapshot, and owns undo/persistence.

Candidates:

- current portable Swift core, bundled on Linux;
- Rust shared core;
- another single cross-platform native engine.

### Strengths

- authority outside web process;
- strong durability;
- Host owns Save naturally;
- font metadata and Study logic can share process boundary.

### Risks

- shared native runtime and bridge complexity;
- rewrite of working TypeScript UI semantics or current Swift model;
- UI command latency;
- FFI/sidecar deployment;
- two-language model types.

Use only if Option A fails durability or complexity criteria.

## 6. Prototype scenarios

- 1,000 review decisions;
- rapid note typing;
- axis drag;
- bulk decision;
- undo/redo;
- Save during active draft;
- close during active draft;
- document switch;
- web-process kill before mirror ACK;
- kill after ACK before disk recovery flush;
- Host rejection;
- Host crash;
- corrupt recovery;
- future schema;
- Save As path change;
- two documents open;
- stale task result from old document.

## 7. Durability vocabulary

### Local committed revision

Visible semantic state in Studio.

### Acknowledged revision

Host has validated and mirrored it.

### Recovery-persisted revision

Host has atomically stored recovery.

### Intentionally saved revision

User-selected Study file contains it.

The UI may show:

- Saved;
- Saving recovery;
- Recovery unavailable;
- Unsaved changes.

Do not expose four revision numbers to normal users.

## 8. Performance thresholds

- review command visible ≤50 ms;
- Host ACK p95 target ≤100 ms on local machine;
- Save flush target ≤250 ms for normal Study;
- no undo entry per slider frame;
- no full document serialization on every pointer movement;
- Study snapshot remains within an agreed size budget;
- recovery process does not block UI.

## 9. Failure policy for Option A

If Host rejects or fails to mirror:

1. keep local UI state;
2. show non-modal durability warning;
3. retry;
4. Save/close requires repair or explicit safe fallback;
5. preserve command/snapshot diagnostic locally when possible;
6. never silently claim Saved;
7. on unrecoverable mismatch, offer reload from last acknowledged mirror and export a diagnostic copy of local snapshot.

## 10. Draft coalescing

Drafts:

- sample copy;
- notes;
- rationale;
- numeric text entry;
- axis slider.

Commit triggers:

- short idle;
- blur;
- pointer/key release;
- stage/selection change;
- Save;
- export;
- close.

One semantic command per meaningful edit session.

## 11. Recovery contents

Recovery includes:

- Study snapshot;
- revision;
- StudyID;
- document URL identity where available;
- schema version;
- timestamp;
- app version.

Recovery excludes:

- font bytes;
- absolute paths beyond Host-local binding store;
- render cache;
- task output.

## 12. Decision output

Accepted ADR states:

- authority;
- commit timing;
- ACK semantics;
- recovery interval;
- Save barrier;
- close behavior;
- crash guarantee;
- undo recovery;
- multi-document isolation;
- Host validation depth;
- schema ownership;
- rejection/reconciliation.

## 13. Leading recommendation

Prototype Option A first.

Reject synchronous two-phase commit unless measurements prove it is both simpler and imperceptible.

Adopt a Host-authoritative shared core only if the prototype demonstrates that durability cannot be achieved without duplicating critical semantics or accepting unacceptable loss.
