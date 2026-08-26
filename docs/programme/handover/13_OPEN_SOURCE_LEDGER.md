# Open-Source Research and Borrowing Ledger

## 1. Borrowing categories

### Direct dependency candidate

May ship after exact-version licence, security, maintenance, and interface review.

### Isolated code candidate

A narrow separable implementation may be adapted with provenance and notice.

### Product-pattern reference

Study the behavior and reimplement independently.

### Historical warning

Study failure, scope, maintenance, or architectural cost.

No repository enters the runtime because it is famous.

## 2. Font-engine and proofing sources

### FontGoggles

Repository:

```text
justvanrossum/fontgoggles
```

Licence:

```text
Apache-2.0
```

Learn:

- exact collection Faces;
- source hot reload;
- variable behavior;
- HarfBuzz shaping;
- complex scripts;
- source-format seriousness;
- glyph/run evidence.

Possible reuse:

- fixture ideas;
- narrow algorithms after file-level review;
- product behavior references.

Do not borrow:

- complete UI;
- Python/macOS architecture wholesale;
- font-development scope.

### Wakamai Fondue engine

Repository:

```text
Wakamai-Fondue/wakamai-fondue-engine
```

Licence:

```text
Apache-2.0
```

Candidate:

- normalized capability extraction;
- practical metadata model;
- Node/browser baseline.

Questions:

- exact formats;
- collection indexing;
- CFF2;
- malformed input;
- overlap with Fontkit;
- maintenance.

### Fontkit

Repository:

```text
foliojs/fontkit
```

Licence:

```text
MIT
```

Candidate:

- Linux metadata baseline;
- collection handling;
- metrics;
- features;
- variations;
- color formats;
- glyph paths;
- optional browser experiment.

Questions:

- exact current format behavior;
- complex-script shaping expectations;
- malformed containment;
- memory;
- CFF2;
- WOFF2 packaging;
- collection identity.

Do not accept it as production truth before P2.

### HarfBuzz

Repository:

```text
harfbuzz/harfbuzz
```

Licence:

```text
permissive MIT-style; verify exact distribution files
```

Candidate:

- Linux shaping;
- complex scripts;
- feature/variation semantics;
- glyph/run evidence.

HarfBuzz shapes. It does not by itself choose the full drawing/PDF architecture.

### FreeType

Repository:

```text
freetype/freetype
```

Licence:

```text
FreeType Licence or GPL option; verify selected terms
```

Candidate:

- Linux font access;
- outline/bitmap/color raster foundations.

Questions:

- dynamic/static linking;
- packaging;
- color formats;
- PDF relationship.

### Fontations / Skrifa / read-fonts

Repository:

```text
googlefonts/fontations
```

Licence:

```text
MIT / Apache-2.0 family; verify exact crates
```

Candidate:

- memory-safe Rust parser;
- metadata;
- variation;
- outline access;
- possible shared engine.

Decision:

- prototype only;
- no Rust rewrite unless measured leverage exceeds current CoreText plus Linux stack.

### Swash

Repository:

```text
dfrg/swash
```

Candidate:

- Rust font introspection, shaping/raster pieces.

Licence and current maintenance must be verified.

### Cosmic Text

Repository:

```text
pop-os/cosmic-text
```

Candidate:

- Rust text layout/shaping stack for Linux experiment.

Questions:

- feature completeness;
- PDF;
- color;
- custom evidence;
- integration burden.

### Rustybuzz

Repository:

```text
RazrFalcon/rustybuzz
```

Candidate:

- pure-Rust HarfBuzz-like shaping experiment.

Use only if compatibility and maintenance meet P2 requirements.

### Pango/Cairo

Projects:

```text
GNOME Pango
Cairo
```

Candidate:

- Linux shaping/layout/drawing/PDF path.

Strength:

- mature Linux desktop/text stack.

Risk:

- lower-level evidence and color limitations;
- system dependency packaging.

### Skia

Project:

```text
Skia
```

Candidate:

- Linux drawing/color/PDF path.

Strength:

- graphics breadth.

Risk:

- build/package weight;
- language binding complexity;
- overkill.

### Diffenator3

Repository:

```text
googlefonts/diffenator3
```

Licence:

```text
Apache-2.0
```

Learn:

- named/explicit variable-location comparisons;
- proof context;
- coverage proof;
- text/JSON/HTML evidence;
- overlay/diff vocabulary.

Candidate:

- optional proof tool;
- not a default runtime dependency.

### Samsa / Samsa-Core

Repository:

```text
Lorp/samsa
```

Licence:

```text
Apache-2.0
```

Learn:

- variable design-space interaction;
- custom axes;
- named instances;
- outline change.

Do not borrow:

- static-instance generation as a production user output without separate product/licence review;
- historical UI wholesale.

### FontTools

Repository:

```text
fonttools/fonttools
```

Licence:

```text
MIT
```

Use:

- development-time inspection;
- fixture creation;
- migration/provenance tools;
- WOFF2 knowledge;
- TTX comparison.

Do not ship a Python runtime without a measured product need.

### FontBakery / Fontspector

Repositories:

```text
fonttools/fontbakery
fonttools/fontspector
```

Licence:

```text
Apache-2.0; verify exact versions
```

Learn:

- clear findings;
- explicit profiles;
- broad font knowledge.

Use:

- select deck-relevant checks.

Do not create a general compliance dashboard.

## 3. Font-manager references

### Font Manager

Repository:

```text
FontManager/font-manager
```

Licence:

```text
GPL-3.0
```

Learn independently:

- Linux installed-font organization;
- Family views;
- collections;
- character map;
- filters;
- desktop conventions.

No code incorporation into a permissive product without accepting GPL consequences.

### ZFontManager

Repository:

```text
TheHolyOneZ/ZFontManager
```

Licence:

```text
GPL-3.0
```

Learn independently:

- family cards;
- grid/list/waterfall;
- compare tray;
- tags/notes;
- watched folders;
- command discovery;
- reduced motion.

Treat behavior as early-stage and verify independently.

### Bulletproof

Repository:

```text
hyvyys/Bulletproof
```

Licence:

```text
MIT
```

Learn:

- local proofing;
- language/sample organization;
- axis/feature controls.

Historical warning:

- old framework/dependency choices are not foundation.

## 4. Desktop architecture references

### Electron

Use official documentation as authority for:

- sandbox;
- context isolation;
- preload;
- custom protocols;
- utility processes;
- security checklist;
- fuses;
- packaging.

### Apple SwiftUI/AppKit/WebKit

Use official Apple documentation as authority for:

- WKWebView;
- content worlds/message handlers;
- custom URL schemes;
- process recovery;
- AppKit/SwiftUI integration;
- document architecture;
- XPC;
- hardened runtime;
- notarization;
- App Sandbox;
- security-scoped bookmarks.

### MarkEdit / CodeEdit class projects

Product/architecture references only:

- hybrid native/WebKit ownership;
- Mac document/window behavior;
- menu/inspector conventions.

Verify licences before any code reuse.

## 5. Skills and process references

### Matt Pocock skills

Use:

- Wayfinder;
- Grilling;
- Domain Modeling;
- Prototype;
- Codebase Design;
- TDD;
- To Spec;
- To Tickets.

These govern planning and decision quality, not runtime code.

### AvdLee SwiftUI Agent Skill

Use:

- SwiftUI state/view composition;
- macOS windows;
- AppKit integration;
- accessibility;
- Instruments tracing.

### Vercel React Best Practices

Use for the shared Studio:

- bundle boundaries;
- rerender control;
- event listeners;
- virtualization;
- derived state;
- performance review.

Do not import Next.js/server patterns.

### Impeccable

Use after UX direction exists:

- shape;
- critique;
- distill;
- clarify;
- harden;
- typeset;
- layout;
- accessibility audit.

It does not choose the architecture.

### gstack

Use selected red-team lenses:

- CEO/product review;
- design review;
- engineering review;
- careful/release review.

Do not import telemetry/session machinery or let a giant skill pack own the programme.

### Trail of Bits skills

Use targeted security review for:

- Electron IPC;
- protocol/path capabilities;
- parser boundaries;
- dependency/package changes.

### Potatostack

The exact public project remains unidentified.

Do not silently substitute another repository.

Evaluate any supplied repository later through:

- demonstrated real use;
- licence;
- maintenance;
- trigger clarity;
- durable artifact;
- evidence discipline;
- low ceremony.

## 6. Direct-code checklist

Before adding code or a package:

- [ ] exact repository;
- [ ] exact commit/version;
- [ ] exact file/crate/package;
- [ ] direct licence;
- [ ] transitive licences;
- [ ] NOTICE/attribution;
- [ ] security posture;
- [ ] maintenance status;
- [ ] product requirement;
- [ ] why it creates depth;
- [ ] interface seam;
- [ ] alternatives;
- [ ] package/build cost;
- [ ] removal plan;
- [ ] SBOM entry;
- [ ] no copied visual identity.

## 7. Pattern-research checklist

- [ ] name the user problem;
- [ ] capture interaction, not screenshot style;
- [ ] identify the original product’s scope;
- [ ] identify failure/limitation;
- [ ] test in Font Previewer’s task;
- [ ] record accepted/rejected result;
- [ ] no code copied.
