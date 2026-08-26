# UX and Interaction Specification

## 1. Experience goal

Font Previewer should feel like a calm editorial instrument: fast enough for ruthless reduction, deep enough for expert inspection, and quiet enough that auditioned typography remains the content.

The interface must not feel like:

- a SaaS dashboard;
- a font store;
- a font-engineering cockpit;
- an IDE;
- a presentation editor;
- a browser page trapped in desktop chrome.

## 2. Information architecture

### Native welcome layer

Before a Study is open, the Host presents:

- New Study;
- Open Study;
- Import Sources;
- Scan Installed Fonts;
- Recent Studies;
- Recovery item when one exists;
- Help and release notes.

No empty three-pane workspace.

### Document workspace

```text
┌────────────────────────────────────────────────────────────────────┐
│ Native title / document status / sparse host actions               │
├───────────────┬───────────────────────────────────┬────────────────┤
│ Sources &     │ Studio stage                      │ Inspector      │
│ Study views   │ Review / Compare / System         │ Contextual     │
│               │                                   │                │
├───────────────┴───────────────────────────────────┴────────────────┤
│ Comparison / task tray                                             │
└────────────────────────────────────────────────────────────────────┘
```

### Shared Studio stages

- Review;
- Compare;
- System;
- Handoff.

The exact visible labels are tested in P4, but stage semantics are stable.

### Left region

Tabs or sections:

- Study;
- Catalog;
- Smart Views;
- Family Groups;
- Comparison Sets;
- Roles;
- Tags;
- Sources.

Smart Views:

- Needs Review;
- Keep;
- Maybe;
- Reject;
- Variable;
- Missing;
- Changed;
- Quarantined;
- Used in System.

### Central region

The typography stage.

It contains:

- stable specimen geometry;
- progressive placeholders;
- scene controls;
- selection;
- compare order;
- guides;
- visual output.

It does not contain permanent advanced metadata.

### Inspector

The Inspector changes with selection and stage:

- Source;
- Face;
- Candidate;
- Recipe;
- Comparison;
- Font Use;
- Finding;
- Handoff Profile.

Advanced groups are collapsed by default.

### Bottom tray

Contextual and collapsible:

- comparison candidates;
- blind-session state;
- role slots;
- task progress;
- unresolved source/finding count.

## 3. First launch

### Default actions

Primary:

> Import Sources

Secondary:

- New Study;
- Open Study;
- Scan Installed Fonts.

### Recipe Pack choice

If New Study is chosen:

- Film / TV;
- Advertising;
- Business;
- Blank.

The app creates an unsaved Study immediately. The user can change the pack later.

### No tutorial carousel

Use:

- concise empty states;
- contextual one-time hints;
- sample Study;
- menu/tooltips;
- Help.

### Privacy copy

Use one factual sentence:

> Fonts you choose are read locally on this computer.

Do not promise legal safety or anonymity.

## 4. Import interaction

### Drag target

The entire document window accepts Sources and folders.

During drag:

- darken the workspace modestly;
- show supported categories, not an exhaustive extension chant;
- distinguish copy/import from install;
- keep current work visible beneath.

### Small import

Start immediately.

Show task drawer progress without modal interruption.

### Large import

When discovery exceeds a threshold selected by P2:

- show files found;
- estimated Faces;
- collections;
- unsupported candidates;
- safety-limit exclusions;
- Continue / Cancel.

### Progressive result

- first readable Candidate appears quickly;
- remaining Candidates stream;
- selection and scroll remain stable;
- import failures are inspectable;
- cancellation retains committed Candidates and reports partial completion honestly.

### Duplicate language

Distinguish:

- already in Study;
- same local Source/Face;
- same internal name, different Source;
- same binary revision;
- possible revised Source.

Never call every collision a duplicate.

## 5. Review stage

### Contact Sheet

Default for roughly 6–100 Candidates.

Card anatomy:

- neutral sequence;
- decision state;
- Candidate label;
- specimen asset;
- variable indicator;
- source warning;
- shortlist state;
- optional role-use indicator.

Metadata stays outside the specimen frame unless the user enables it.

### Focus

One Candidate receives the central stage.

Use for:

- copy editing;
- axes;
- features;
- detailed judgement;
- notes/rationale;
- character/coverage inspection.

### Waterfall

One Candidate across meaningful deck sizes.

Do not use arbitrary traditional type-specimen sizes if deck sizes differ.

### Compact list

Optimized for large Catalog/Study navigation.

It is not required in R1 unless performance evidence demands it.

### Decision loop

- arrows navigate;
- `1` Keep;
- `2` Maybe;
- `3` Reject;
- `0` reset to Unreviewed;
- `Space` toggles comparison tray;
- `Return` opens Focus.

Rules:

- never fire while an editable control has focus;
- decision is visible within the interaction budget;
- layout does not jump;
- Focus advances only when “Advance after review” is enabled;
- Undo returns both state and selection coherently.

### Multi-select

Selection methods:

- platform modifier click;
- range select;
- Select all visible;
- Select all matching.

Bulk action preview states exactly:

- number affected;
- visible vs all matching;
- action;
- undo availability.

### Candidate duplication

Command:

> Duplicate as another instance…

The new Candidate:

- references the same Face;
- copies current settings;
- receives a new CandidateID;
- starts Unreviewed unless the user explicitly copies decision/rationale;
- can be renamed with a concise instance label.

## 6. Recipe interaction

### Recipe switcher

Visible near specimen controls.

Shows:

- current Recipe;
- pack;
- unsaved edits;
- duplicate;
- manage.

### Editing

Common controls visible:

- copy;
- size policy;
- alignment;
- line-height;
- tracking;
- background.

Advanced:

- language/direction;
- casing;
- line limit;
- axis/feature policy;
- metadata/guides.

### Scope

Every control labels its scope:

- Recipe;
- Candidate;
- Font Use;
- Scene.

Avoid invisible global changes.

### Reset

Reset identifies target:

- Reset Candidate axes;
- Restore Recipe defaults;
- Remove Role override.

No generic Reset button.

## 7. Compare stage

### Entry

2–4 Candidates in the comparison tray.

If fewer than two, explain what is missing.

### Layouts

- two-up;
- three-up;
- four-up;
- one focused + remaining strip.

### Comparison policy control

Prominent, descriptive options:

- Same size;
- Fit each;
- Lock line breaks.

Provide one sentence explaining what each reveals.

### Locked conditions

A comparison can lock:

- Recipe;
- background;
- language;
- features;
- matching axes;
- metadata;
- guides.

Unlocking is explicit.

### Blind mode

Before start:

- generate stable seed;
- hide identifying labels and source metadata;
- replace with Candidate A/B/C/D;
- accessible names also stay neutral;
- hide inspector identity sections.

Reveal:

- explicit action;
- confirmation only if accidental reveal would invalidate the session;
- record revealed state;
- user can start a new blind session.

### Overlay and blink

Beta only after basic Compare quality.

Use for two Candidates.

Overlay:

- matched frame;
- adjustable opacity;
- explicit policy/profile;
- no implication of outline equivalence.

Blink:

- reduced-motion disabled;
- user-controlled rate;
- keyboard toggle.

## 8. System stage

### Role tray

Visible Role slots:

- Display;
- Body;
- Data;
- Caption;
- Legal;
- Utility;
- Fallback when enabled.

Assign through:

- drag;
- context menu;
- keyboard command;
- Inspector.

### Role card

Shows:

- exact Face;
- Candidate origin;
- current axes/features;
- Recipe bindings;
- rationale;
- missing Source warning;
- duplicate Face use.

### Scenes

A Scene switcher uses recognizable deck tasks.

The stage renders the complete system, not one font at a time.

### No deck-builder affordances

No image drop, slide thumbnails, transition controls, or arbitrary shape tools.

### Completion

A Handoff Profile can require specific Roles.

Missing Roles appear as preflight findings, not constant red alerts.

## 9. Inspect interaction

### Named instances first

For variable Faces:

1. named instances;
2. common axis controls;
3. all axes.

### Axis control

Each axis shows:

- name;
- tag;
- minimum;
- default;
- maximum;
- current value;
- reset.

Keyboard and text entry accompany slider.

### Feature control

Group by human purpose.

Show:

- name;
- tag;
- default;
- current state;
- support;
- a proof string or affected Recipe when available.

### Characters

- search;
- script/block filters;
- glyph name;
- Unicode;
- copy;
- intended/fallback/missing state.

### Metrics

Use visual guides and plain language.

No red/green “quality” score.

### Source and licence metadata

Display factual strings and URLs from the font, with:

> Metadata reported by the font. Confirm the actual licence before redistribution.

## 10. Handoff stage

### Step 1 — Profile

Profiles:

- Internal review;
- Client review;
- Designer handoff;
- Technical proof.

### Step 2 — Preflight

Separate:

- Blockers;
- Cautions;
- Notes.

Each finding explains:

- affected item;
- consequence;
- repair action;
- whether acknowledgement permits continuation.

### Step 3 — Outputs

Select:

- Review boards;
- Compare boards;
- System Scenes;
- PDF;
- human summary;
- JSON;
- CSV;
- source copies.

### Step 4 — Permission

Source copies remain visibly separate.

Checkbox language:

> I have permission to copy the selected font files into this handoff.

The app does not pre-check it.

### Step 5 — Export

- native destination;
- progress;
- cancellation;
- verification;
- reveal completed folder;
- no partial final folder.

## 11. Search

### Plain search

Searches:

- family;
- style;
- Candidate label;
- filename;
- PostScript name;
- tags;
- notes;
- role;
- source status.

### Filters

Visible chips/menu.

Advanced query grammar is optional.

When no results:

- show active filters;
- explain the empty result;
- offer Reset filters;
- never show a mysterious blank pane.

## 12. Task and error states

### Task phases

Import:

```text
Discovering → Reading → Adding → Complete
```

Render:

```text
Queued → Rendering → Ready
```

Export:

```text
Preflight → Staging → Rendering → Writing → Verifying → Committing → Complete
```

### Failure principles

- name the affected Source/Candidate;
- explain what remains safe;
- provide one repair action;
- preserve inspectable details;
- never dump raw stack traces in the primary alert.

### Engine crash

Primary message:

> The font engine restarted. Your Study is safe. One source may have caused the failure.

Actions:

- Retry;
- Skip source;
- View details.

### Mirror failure

Show a non-modal document status:

> Changes are on screen but recovery storage is unavailable.

Save/close invokes flush and repair.

## 13. Native integration

### Mac

- standard menu placement;
- Command shortcuts;
- native Open/Save panels;
- multiple document windows where the chosen document architecture supports it;
- Finder wording;
- window restoration;
- full-screen;
- system appearance;
- VoiceOver focus.

### Linux

- Ctrl shortcuts;
- Linux file dialog;
- “Show in file manager”;
- desktop theme;
- no fake Mac window controls;
- Wayland/X11 focus behavior;
- Orca.

## 14. Visual system

### Palette

- warm near-black;
- warm paper;
- restrained neutral chrome;
- one accent;
- semantic status colors with text/icon.

### Typography

Platform UI font for controls.

Monospace only for technical evidence.

### Geometry

- 4 px base grid;
- 8/12/16/24/32 rhythm;
- stable rows/cards;
- clear minimum pane widths;
- compact and comfortable density after evidence.

### Motion

- causal;
- short;
- no bounce;
- no specimen morphing during fair comparison;
- reduced motion supported.

### Copy voice

- plain;
- specific;
- calm;
- occasional dry wit in noncritical empty states;
- never cute during loss, licence, or security states.

## 15. Accessibility

### Rendered specimen equivalent

If the visual is an image/texture:

- expose copy as text;
- identify Candidate or neutral blind code;
- expose decision;
- expose Recipe;
- expose profile;
- expose warnings;
- hide duplicate visual from accessibility tree where necessary.

### Focus

- deterministic native ↔ web transition;
- restoration after panels;
- no focus reset after asset update;
- roving focus in large grids;
- stage headings/landmarks.

### Human acceptance

Core tasks must pass:

- VoiceOver;
- Orca;
- keyboard only;
- high contrast;
- reduced motion;
- 200% zoom.

## 16. UX vetoes

Do not ship a direction where:

- the first specimen is buried behind setup;
- stage labels cannot be explained by first-time users;
- Review geometry jumps after decisions;
- advanced metadata dominates the first journey;
- Mac feels like fake Electron;
- Linux imitates Mac chrome;
- screen readers receive only “image”;
- equal size and equal fit are conflated;
- source copy is enabled by default;
- missing Sources erase decisions;
- System resembles a slide editor.
