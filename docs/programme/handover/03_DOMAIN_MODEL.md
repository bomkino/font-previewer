# Domain Model

This document defines product language. It avoids implementation details except where a data-shape example is necessary to expose a decision.

## 1. Platform

### App

One distributable Font Previewer client.

### Host

The platform-specific application environment responsible for privileged and native behavior.

Hosts:

- Mac Host;
- Linux Host.

### Studio

The shared interactive workspace.

### Capability

A narrowly authorized Host operation or asset.

### Capability Token

An opaque session-scoped identifier that gives the Studio access to one approved operation or immutable asset without revealing a filesystem path.

## 2. Source domain

### Source

A font-containing file or logical installed-font record.

A Source may contain one or many Faces.

### SourceID

Durable Study identity assigned when a Source first enters the Study.

It is not a path, PostScript name, digest, inode, or provider identifier.

### Source Binding

Host-local information used to find and access a Source on one machine.

### Portable Source Hint

Non-authoritative information that may assist relinking:

- file name;
- relative path;
- format;
- size hint;
- metadata snapshot;
- collection topology.

### Source Revision

One observed state of a Source.

A changed file remains the same SourceID until reconciliation determines otherwise.

### Source Signature

Host-local change evidence such as modification time, filesystem identity, size, or private digest.

## 3. Font domain

### Face

One addressable face inside a Source.

Face metadata is immutable within one Source Revision.

### FaceID

Durable Study identity for one Face.

A FaceID remains stable when a Source is relinked to the same logical Face.

### Face Index

The exact collection index used to address a Face.

### Family

A name relationship reported by font metadata.

Family is not identity.

### Family Group

A navigational grouping of related Faces.

A Family Group may have a confidence and reason.

### Instance

An authored named location or custom axis location in a variable Face.

## 4. Decision domain

### Candidate

A Study-level audition configuration referencing one Face.

A Candidate contains:

- CandidateID;
- FaceID;
- configured axes;
- configured features;
- casing;
- review state;
- notes;
- tags;
- rationale;
- provenance.

Several Candidates may reference one Face.

### CandidateID

Durable identity for one audition configuration.

### Review State

- Unreviewed;
- Keep;
- Maybe;
- Reject.

### Unreviewed

No deliberate review decision has been made.

### Keep

The Candidate remains a serious option or selected choice.

### Maybe

The Candidate is deliberately deferred or conditionally retained.

### Reject

The Candidate has been deliberately removed from active consideration while remaining recoverable.

### Rationale

Human reasoning attached to a Candidate, Comparison Set, Font Use, Typography System, or Finding.

### Tag

A free-form organizational label.

Tag is not Role or Review State.

### Shortlist

The current deliberate group under active comparison.

### Comparison Set

A saved ordered group of CandidateIDs plus locked comparison conditions.

### Blind Session

A presentation state for a Comparison Set using neutral codes and a stable seed.

## 5. Typography domain

### Recipe

Reusable typographic conditions.

A Recipe contains copy, language, direction, casing, size policy, alignment, line-height, tracking, axes/features policy, background, line limit, and metadata policy.

### Recipe Pack

A built-in or Study-saved group of Recipes.

### Scene

A composition placing one or more Recipe-bound text elements into frames.

### Scene Pack

A built-in group of deck-context Scenes.

### Fit Policy

- nominal;
- fit;
- locked lines.

### Role

A functional position in a Typography System.

### Font Use

The exact assignment used in a Role.

A Font Use references:

- FaceID;
- optional originating CandidateID;
- axes;
- features;
- casing;
- tracking;
- language/direction;
- rationale.

### Typography System

A named collection of Role → Font Use assignments evaluated through Scenes.

### Fallback Use

A Font Use invoked for a script or text span that the primary Use cannot represent or shape.

## 6. Rendering domain

### Render Profile

A named engine/environment combination.

### Interactive Profile

The profile used to update the live Studio.

### Reference Profile

The profile used for canonical proof, export, or diagnostics.

They may be the same.

### Render Request

An immutable request containing exact Source/Face, settings, Scene, target, and evidence level.

### Render Result

An immutable visual asset plus identity, dimensions, warnings, and evidence.

### Preview Asset

A session-scoped immutable representation shown in the Studio.

### Renderer Evidence

Structured facts such as:

- engine/version;
- lines;
- glyph sequence;
- positions;
- fallback runs;
- missing scalars;
- fitted size;
- output dimensions;
- cache provenance.

### Fallback Run

A span rendered by a Face other than the intended Face.

## 7. Document domain

### Study

The portable document containing selected Sources/Faces, Candidates, Recipes, Comparison Sets, Typography Systems, Findings, and Handoff preferences.

The Catalog does not belong in the Study.

### Study Session

The active semantic state and command history for one Study.

### Semantic Command

A user-meaningful mutation such as setting a Review State or assigning a Role.

### Revision

Monotonic semantic version of one Study Session.

### Host Mirror

The Host’s validated read-only copy of the latest acknowledged Study snapshot.

### Intentional Save

A write to the user-selected Study document.

### Recovery Snapshot

Host-local crash recovery stored separately from the Intentional Save.

### Workspace State

Non-portable interaction state:

- window geometry;
- current stage;
- selection;
- zoom;
- panel widths;
- temporary filters;
- recent files.

### Catalog

Host-local searchable index of discoverable Sources and Faces.

### Relink

Associate a portable SourceID with a local Source Binding.

### Reconcile

Resolve changes in Source metadata or collection topology while preserving or intentionally remapping Study identity.

## 8. Handoff domain

### Handoff

A deliberate package that communicates a typography decision.

### Handoff Profile

A named selection of required Roles, outputs, and preflight rules.

### Finding

- Blocker;
- Caution;
- Note.

### Blocker

Prevents reproducible or trustworthy output.

### Caution

Requires acknowledgement but may permit output.

### Note

Context that does not require action.

### Source Copy

An optional copy of an original Source included after explicit permission acknowledgement.

## 9. Parity

### Semantic Parity

Equivalent Study state and command meaning across Apps.

### Geometric Parity

Equivalent Scene dimensions, frames, fit rules, and composition.

### Interaction Parity

Equivalent user journey and discoverability, adapted to platform conventions.

### Raster Parity

Identical pixels. Not required across platforms.

## 10. Edge scenarios

### Two files share one PostScript name

They remain distinct Sources and Faces.

### One collection has ten Faces

All ten preserve exact Face Index.

### One variable Face is tested at two weights

Create two Candidates referencing one Face.

### One Face is used as Display at weight 700 and Body at 430

Create two Font Uses with distinct settings.

### A Family name changes after source update

Face identity does not silently change. Reconciliation reports the metadata change.

### A collection loses a Face

The associated Face becomes unresolved. It is not silently remapped to the next index.

### A Source moves from Mac to Linux

The Study keeps SourceID/FaceID. Linux creates a local Source Binding.

### Browser preview falls back

The Result must identify fallback. Visible output alone is not proof.

### Legacy Maybe

Preserve it as Maybe with legacy provenance. Offer explicit bulk reset to Unreviewed; never infer silently.
