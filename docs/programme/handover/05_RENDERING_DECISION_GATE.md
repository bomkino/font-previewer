# Rendering Decision Gate

## 1. Decision

Choose the interactive rendering architecture without sacrificing:

- responsiveness;
- source/Face fidelity;
- live/export coherence;
- complex-script honesty;
- process containment;
- accessibility;
- cross-platform maintainability.

This is an R0 gate.

## 2. Fixed requirements

Regardless of the chosen option:

- exact Source and Face Index;
- axes and features identified;
- Render Profile declared;
- no absolute path in Studio;
- renderer crash cannot damage Study state;
- output geometry follows shared Scene grammar;
- export is reproducible;
- semantic equivalent exists for assistive technology;
- obsolete render work cancels;
- cache is bounded and revision-aware;
- malicious input is isolated as far as practical.

## 3. Option A — Native rendered assets

### Shape

Studio sends Render Requests.

Platform Render Service returns immutable PNG/texture/PDF assets and evidence.

### Strengths

- one live/export engine per platform;
- exact collection support;
- CoreText reference reuse;
- explicit shaping/fallback evidence;
- no raw font bytes in Studio;
- format normalization hidden;
- strong crash boundary.

### Risks

- typing across many Candidates causes render fan-out;
- axis drag may lag;
- image memory;
- nonselectable visual text;
- accessibility mirror required;
- more bridge/cache scheduling.

### Required prototype

50 visible Candidates, copy editing, scroll, 4-up Compare, focused variable axis, hot reload.

## 4. Option B — Direct browser interactive rendering

### Shape

Host supplies approved font bytes through an opaque capability.

Studio registers `FontFace`.

WebKit/Chromium lays out live previews.

Platform native renderer remains export/reference or is removed if browser proof wins.

### Strengths

- immediate text editing;
- high-frequency axes/features;
- DOM text;
- easier animation/selection;
- smaller preview IPC;
- web-target profile is genuine.

### Risks

- raw font bytes in renderer;
- browser parser attack surface;
- collection/dfont support;
- live/export divergence if native export remains;
- fallback detection complexity;
- WebKit/Chromium differences;
- memory lifecycle;
- source conversion pressure.

### Required controls

- local bundled content only;
- sandboxed renderer;
- opaque session font capability;
- no path;
- process recovery;
- source-size limits;
- explicit profile;
- capability revocation;
- export profile disclosure.

## 5. Option C — Controlled hybrid

### Shape

- browser rendering for proven browser-loadable formats/interactive focus;
- native assets for collection/unsupported/reference proof;
- every result declares profile.

### Strengths

- fast common path;
- broad fallback;
- reference proof retained.

### Risks

- two live behaviors;
- harder mental model;
- subtle mismatch;
- twice the regression surface;
- complex cache and handoff.

Hybrid is acceptable only if Option A misses interaction thresholds and Option B misses format/fidelity thresholds.

Do not choose hybrid merely because it sounds flexible.

## 6. Prototype matrix

Use the same fixtures and tasks.

### Fixtures

- static TTF;
- CFF OTF;
- variable glyf;
- CFF2 variable;
- custom axis;
- named instances;
- TTC;
- OTC;
- dfont;
- WOFF;
- WOFF2;
- Arabic;
- Devanagari;
- Thai;
- Hebrew;
- combining marks;
- color fonts;
- malformed;
- large;
- duplicate names.

### Tasks

1. display first Cover.
2. edit Cover copy.
3. update 50-card Contact Sheet.
4. rapid scroll.
5. switch Recipe.
6. compare four Candidates.
7. drag variable axis.
8. toggle feature.
9. hot-reload Source.
10. export PNG/PDF.
11. kill render/web process.
12. use keyboard/screen-reader equivalent.

## 7. Veto conditions

### Veto Option A when

- focused variable control cannot maintain an acceptable interactive rate;
- ordinary copy editing feels materially delayed after debounce;
- memory/cache exceeds the reference-hardware ceiling;
- asset-based accessibility cannot provide equivalent navigation;
- implementation complexity exceeds the controlled hybrid without fidelity benefit.

### Veto Option B when

- promised collection/format cases cannot render reliably;
- live/export mismatch is material and hard to communicate;
- renderer font handling cannot be bounded/recovered;
- exact Face identity is unreliable;
- fallback evidence is too weak for promised claims;
- source conversion creates a hidden font-generation product.

### Veto Option C when

- users cannot understand which profile they are seeing;
- profiles silently switch;
- two implementations drift;
- maintenance cost is greater than dropping/defering a format.

## 8. Interaction thresholds

Provisional, measured on reference hardware:

- first normal preview: target ≤500 ms after discovery starts;
- review decision feedback: ≤50 ms;
- focused copy update: visible response target ≤120 ms after input debounce;
- focused axis drag: ≥30 fps acceptable, 60 fps preferred;
- visible Contact Sheet completion: progressive, no layout jump;
- cancel acknowledgement: ≤100 ms;
- no UI-thread parse/render;
- recovery after engine/process death: Study remains usable.

## 9. Decision output

The accepted ADR must state:

- interactive profile;
- reference/export profile;
- supported format tiers;
- profile-switch rules;
- raw-font exposure policy;
- asset/capability lifecycle;
- accessibility strategy;
- cache key;
- cancellation;
- live/export guarantee;
- known divergence.

## 10. Leading hypothesis

Start by prototyping Option A because it preserves the strongest properties of the existing CoreText work and isolates font parsing.

Do not accept it until the focused interaction thresholds pass.

If it fails, compare Option B before defaulting to hybrid.
