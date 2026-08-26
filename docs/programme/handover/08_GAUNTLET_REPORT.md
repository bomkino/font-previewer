# Gauntlet Report

This report records the adversarial loops applied after the first two-app plan.

The point is not to prove the plan “great.” It is to expose assumptions, remove bloat, and concentrate uncertainty into explicit gates.

## Scorecard

| Dimension | Initial two-app draft | Final handover | Material change |
|---|---:|---:|---|
| Product boundary | 8.0 | 9.5 | Four stages; font-manager and deck-builder drift fenced |
| Domain model | 7.0 | 9.6 | Source/Face/Candidate/Font Use separated |
| User journey | 8.0 | 9.5 | Unreviewed, variable duplicates, explicit compare policies |
| Architecture honesty | 7.0 | 9.3 | rendering/state authority reopened as bake-offs |
| Mac product fit | 7.5 | 9.0 | full-Studio hypothesis has explicit vetoes |
| Linux parity | 7.5 | 9.2 | first-class release ladder and sidecar/package gates |
| Durability | 7.0 | 9.4 | revision vocabulary, mirror, flush, failure policy |
| Rendering fidelity | 7.0 | 9.3 | three-path bake-off and format tiers |
| Accessibility | 7.5 | 9.2 | asset semantic equivalent and focus gauntlet |
| Security/privacy | 8.0 | 9.5 | font/web/process boundaries and capability model |
| Test discipline | 8.5 | 9.6 | CI tiers, named risks, explicit non-tests |
| Build handoff | 6.5 | 9.6 | authority, master prompt, backlog, change control |
| Open-source leverage | 7.5 | 9.2 | precise reuse categories and engine alternatives |

The scores are editorial judgement, not test output.

## Loop 1 — Is this one product?

### Attack

A Mac-first implementation followed by a Linux “port” would create two products and permanent semantic drift.

### Decision

One portable domain and Studio. Two Hosts and render adapters.

### Evidence required

The first production tracer crosses Mac → Linux → Mac.

## Loop 2 — Is Mac nativeness being reduced to window chrome?

### Attack

A full WKWebView workspace can still feel like a website despite native menus and dialogs.

### Correction

P1 must test focus, accessibility, density, scroll, document behavior, and visual character against a native alternative.

### Veto

If full Studio requires pervasive Mac-only forks or cannot meet VoiceOver/focus quality, narrow the shared UI seam.

## Loop 3 — Is Linux genuinely first-class?

### Attack

“Close as possible” can become a vague excuse for delayed gaps.

### Correction

Every R1+ vertical slice has both-host acceptance unless explicitly platform-only.

### Veto

No milestone is complete with “use Mac to finish.”

## Loop 4 — Are product stages implementation categories?

### Attack

Review, Focus, Waterfall, Metrics, Glyphs, Pairing, and export as equal tabs expose internal capabilities rather than a journey.

### Correction

Review → Compare → System → Handoff.

Focus/Waterfall/Inspect become contextual modes.

## Loop 5 — Is “System” a deck builder?

### Attack

Deck Scenes can pull scope toward images, slides, animation, and layout authoring.

### Correction

System may place only typography elements in fixed authored Scenes.

### Veto

No arbitrary shape/media/slide authoring.

## Loop 6 — Is Maybe doing two jobs?

### Attack

The reference app defaults imports to Maybe, conflating unseen and deliberately conditional.

### Correction

Unreviewed is default.

Legacy Maybe remains Maybe with provenance; conversion is explicit.

## Loop 7 — Can one variable Face be two candidates?

### Attack

Face-level decisions prevent comparing two useful variable coordinates.

### Correction

Candidate is a configured Face under review. Several Candidates may share one Face.

## Loop 8 — Can one Face be used differently by Role?

### Attack

Candidate settings alone cannot cleanly represent Display at weight 700 and Body at 430.

### Correction

Font Use is an exact Role assignment with its own settings and optional Candidate origin.

## Loop 9 — Is Family being used as identity?

### Attack

Family names collide and change.

### Correction

Family Group is navigation only. SourceID/FaceID/CandidateID remain explicit.

## Loop 10 — Can path identity travel?

### Attack

Canonical path + face index is excellent local dedupe and poor portable identity.

### Correction

Durable IDs travel. Local bindings stay local.

## Loop 11 — Does the Catalog poison the document?

### Attack

Saving an installed library into every Study produces enormous documents and host-specific state.

### Correction

Catalog local, Study chosen Candidates only.

This also makes full-snapshot mirroring plausible.

## Loop 12 — Is host-rendered imagery automatically safer and better?

### Attack

The previous pass treated Host-rendered assets as final without proving typing and axis interaction.

### Correction

Rendering is reopened as a three-option gate.

Native assets are the leading hypothesis, not an article of faith.

## Loop 13 — Is browser rendering automatically the right use of WebKit?

### Attack

Direct `FontFace` rendering is fast but introduces format, security, fallback, and live/export divergence.

### Correction

Browser direct is a measured option, not a default.

WebKit’s reason for existence is shared interaction, not necessarily raw font parsing.

## Loop 14 — Is hybrid rendering just compromise theatre?

### Attack

Hybrid can double code and hide profile switches.

### Correction

Hybrid is allowed only if both pure paths fail different vetoes and every result declares profile.

## Loop 15 — Is synchronous commit actually durable design?

### Attack

Commit-before-publish places Host round-trip latency in every review action.

### Correction

State authority is reopened.

Optimistic local commit + asynchronous durable mirror is the leading hypothesis.

## Loop 16 — Does optimistic state hide loss?

### Attack

A sudden web-process failure may lose unacknowledged commands.

### Correction

Define local, acknowledged, recovery-persisted, and intentionally saved revisions.

Expose durability failure and require flush barriers for Save/close/export.

## Loop 17 — Should the Host own domain state?

### Attack

Putting authority in the Studio makes a web process load-bearing.

### Counterattack

Host authority requires a cross-platform native core or duplicated reducers and may make every UI command remote.

### Decision

Prototype all three options; accept smallest one meeting latency and loss guarantees.

## Loop 18 — Is the render engine becoming a science project?

### Attack

HarfBuzz, FreeType, Cairo, Skia, Fontations, Swash, Cosmic Text, Fontkit, and CoreText can turn one app into engine research.

### Correction

P2 tests only promised product tasks and formats.

Choose the smallest passing path.

## Loop 19 — Is format support being claimed from parsing?

### Attack

A parser may enumerate a format the product cannot render, hot-reload, relink, or export.

### Correction

Format support requires the complete journey. Otherwise classify metadata-only or deferred.

## Loop 20 — Is source watching robust to real editors?

### Attack

Watching one inode misses atomic replacement.

### Correction

Test in-place write, rename-over, directory replacement, delete/recreate, and collection topology.

## Loop 21 — Is blind review actually blind?

### Attack

Names may leak through accessibility labels, sort order, Inspector, or export filenames.

### Correction

Neutral IDs and seeded ordering apply to visible and semantic labels.

Reveal is explicit.

## Loop 22 — Is accessibility being bolted onto images?

### Attack

Host-rendered assets can leave screen readers with an unlabeled bitmap.

### Correction

Every Scene has a semantic DOM representation containing copy, Candidate/neutral ID, decision, Recipe, profile, and findings.

Human VoiceOver/Orca use remains a gate.

## Loop 23 — Is Handoff just a polished export folder?

### Attack

Screenshots and manifest can still omit exact Font Uses and settings.

### Correction

Independent reconstruction is a beta gate.

## Loop 24 — Is Figma language misleading?

### Attack

CSV/JSON can be mistaken for a Figma file or API integration.

### Correction

Call it Figma reference data. No integration claim.

## Loop 25 — Is licensing being automated through metadata?

### Attack

OS/2 embedding bits and name-table strings are not the licence.

### Correction

Present metadata as evidence with disclaimer. Source copy remains user-authorized.

## Loop 26 — Are we copying GPL applications?

### Attack

Useful Linux font-manager interfaces can tempt direct reuse.

### Correction

GPL projects are product-pattern references unless project licensing deliberately changes.

## Loop 27 — Does the backlog pre-plan fog?

### Attack

A huge list can create false certainty and invite agents to execute unresolved architecture.

### Correction

Decision tickets and tracer bullets are separate. Rendering/state/package details remain gated.

## Loop 28 — Can agents work in parallel safely?

### Attack

Mac, Linux, and Studio agents can collide in shared contracts.

### Correction

One writer per shared package. Parallelize research and isolated Hosts only after contracts freeze. One integration owner.

## Loop 29 — Does testing become seriousness theatre?

### Attack

A font tool can generate thousands of table/script/screenshot tests.

### Correction

Six public seams, named risks, CI tiers, and a written non-test list.

## Loop 30 — Do performance budgets create fake precision?

### Attack

Unmeasured numbers can become arbitrary blockers.

### Correction

Use provisional targets in prototypes. Accept/revise with evidence and preserve the user-level reason.

## Loop 31 — Can the packaged app fail after CI passes?

### Attack

Source builds do not prove signatures, helpers, native dependencies, MIME association, or clean install.

### Correction

Downloaded package is the final seam.

## Loop 32 — Is the reference branch being discarded emotionally?

### Attack

A new architecture can encourage a rewrite narrative.

### Correction

Reference branch is an oracle and Mac engine seed. Delete only after capability parity.

## Loop 33 — Can Cloud Work execute this without inventing authority?

### Attack

A long plan alone does not tell a fresh agent which document wins, when to stop, or what it may change.

### Correction

Authority hierarchy, decision register, branch policy, status file, task template, and owner-controlled actions.

## Loop 34 — Are time and length being used as quality proxies?

### Attack

Long work can still be repetitive, and a shorter decision can be better.

### Correction

Track closed risks, accepted decisions, prototypes, artifacts, user journeys, and verified packages. Do not pad work to satisfy elapsed-time theatre.

## Loop 35 — Is the plan final enough?

### Finding

It is final as a **programme**:

- destination;
- boundaries;
- domain;
- user journeys;
- decision gates;
- prototype briefs;
- backlog;
- test/security/release;
- Cloud Work protocol.

It is intentionally not final on two implementation decisions that require measured prototypes:

- interactive render path;
- Study durability authority.

Pretending otherwise would make the handover less final, not more.
