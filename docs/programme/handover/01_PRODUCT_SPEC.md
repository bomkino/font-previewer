# Product Specification

## 1. Problem

Typography selection for a pitch deck is fragmented.

A designer typically:

- opens font files one by one;
- installs fonts merely to audition them;
- remembers candidates mentally;
- copies names into notes;
- tests only a hero headline;
- loses variable coordinates;
- cannot compare equal size and equal fit cleanly;
- reconstructs decisions from screenshots;
- struggles when sources move;
- gives collaborators incomplete handoff information.

Font Previewer should preserve the decision process, not merely display font names.

## 2. Primary user

A type-literate pitch-deck designer evaluating roughly 20–200 Faces for a real film, television, advertising, or business deck.

## 3. Secondary users

- a writer-director or founder reviewing a shortlist;
- a collaborating designer on Linux;
- a creative director approving a typography system;
- a small studio reopening older work;
- a type expert investigating a specific Face.

The product must remain usable without forcing every secondary user into font-engineering language.

## 4. Jobs to be done

1. When I have too many local fonts, help me reduce them without losing context or installing them.
2. When two Faces both seem right, let me compare them under explicit, fair conditions.
3. When a Face is variable, let me preserve exact useful instances.
4. When a Face works for titles but not paragraphs, let me model that as a role decision.
5. When a script falls back, tell me rather than presenting substitution as proof.
6. When a Source moves or changes, preserve my decisions and help me reconcile it.
7. When I hand work to another person, include exact settings and rationale.
8. When I move between Mac and Linux, preserve meaning and declare rendering differences.

## 5. Product constitution

### Local-only

Core use requires no network.

No account, analytics, cloud processing, remote font service, or font upload.

### Non-destructive

The app does not install, activate, move, rename, trash, or delete Sources.

### Human judgement

The app provides evidence, not taste scores.

### Progressive disclosure

The normal path does not begin with font tables, Unicode charts, or engineering audits.

### Honest rendering

Every proof identifies its Render Profile.

The app never claims pixel equality between CoreText/Quartz and Linux renderers.

### Reproducible decisions

A saved Study records enough semantic information to reopen and hand off the work.

## 6. Product concepts

The authoritative definitions live in `03_DOMAIN_MODEL.md`.

Load-bearing distinctions:

- Source is a file/provider.
- Face is one addressable face in a Source.
- Candidate is a configured Face under review.
- Font Use is an exact system assignment.
- Family Group is navigation, not identity.
- Catalog is local.
- Study is portable.
- Recipe defines typographic conditions.
- Scene defines composition.
- Handoff communicates a decision; it is not automatically a source package.

## 7. New Study

A new Study may start from:

- Film / TV Recipe Pack;
- Advertising Recipe Pack;
- Business Recipe Pack;
- Blank.

This is a lightweight seed choice, not a mandatory wizard.

Every built-in Recipe is editable and duplicable.

## 8. Review

### Entry

- drag Sources or folders;
- choose native Import;
- add from installed Catalog;
- reopen existing Study.

### Default state

Every new Candidate is **Unreviewed**.

### Core behavior

- Contact Sheet;
- Focus;
- Waterfall;
- stable geometry;
- arrow navigation;
- one-key review decisions;
- comparison tray;
- notes, tags, and rationale;
- source health;
- Family Group and exact Face views;
- multi-select and previewed bulk actions.

### Review states

- Unreviewed;
- Keep;
- Maybe;
- Reject.

Maybe is deliberate, not a default.

### Candidate duplication

A variable Face can be duplicated into several Candidates with distinct settings.

Example:

```text
Recoleta Variable — wght 540
Recoleta Variable — wght 680
```

The Candidates receive separate decisions and notes while referring to the same Face.

## 9. Compare

Compare 2–4 Candidates.

### Policies

#### Equal nominal size

Same specified size and frame.

Reveals natural apparent scale, width, and metric differences.

#### Equal fit

Each Candidate independently fits the same frame.

Reveals silhouette and space efficiency.

#### Locked line breaks

Authored line breaks remain identical.

Reveals rhythm and phrase shape.

### Optional blind comparison

- neutral Candidate codes;
- seeded order;
- no identifying accessibility label leakage;
- explicit Reveal;
- optional blind proof and separate reveal key.

### Evidence

- exact Candidate;
- fitted point size;
- axis values;
- features;
- line count;
- profile;
- missing/fallback warning.

No automatic winner.

## 10. System

A Typography System binds exact Font Uses to deck Roles.

### V1 Roles

- Display;
- Body;
- Data;
- Caption;
- Legal;
- Utility;
- optional Fallback when required.

### Font Use

A Font Use records:

- Face;
- optional originating Candidate;
- axes;
- features;
- casing default;
- tracking;
- language/direction policy;
- rationale.

The same Face may be used differently in several Roles.

### Deck Scenes

- title slide;
- logline;
- section divider;
- two-column narrative;
- quote;
- bio;
- data/traction;
- caption/reference;
- legal footer;
- 16:9 title;
- 2.39:1 title.

System does not add images, slide ordering, transitions, or general presentation editing.

## 11. Inspect

Inspect is contextual to the selected Source, Face, Candidate, Comparison, Recipe, or Font Use.

### Source

- file/provider label;
- format;
- file size;
- status;
- modified state;
- collection count;
- local path reveal through native Host only;
- licence metadata with disclaimer.

### Face

- names;
- collection index;
- metrics;
- variable/static;
- axes;
- named instances;
- feature support;
- characters;
- script evidence;
- color-font evidence.

### Candidate

- review;
- axes/features;
- notes/tags;
- rationale;
- duplicate;
- reset;
- compare;
- role suggestion.

### Accessibility language

Coverage and fallback findings state exactly what they prove.

They never claim full language correctness or accessibility certification.

## 12. Source lifecycle

### States

- pending;
- readable;
- metadata-only;
- unsupported;
- missing;
- changed;
- ambiguous;
- quarantined.

### Relink

- one Source;
- folder;
- ranked possible matches;
- explicit confirmation when ambiguous;
- preserve IDs and decisions;
- report collection topology differences.

### Hot reload

- detect in-place write;
- detect rename-over;
- detect directory replacement;
- invalidate affected caches;
- preserve Candidate settings where compatible;
- never silently remap to another Face index.

## 13. Handoff

### Human layer

- Study purpose;
- chosen system;
- roles;
- rationale;
- cautions;
- missing Sources;
- tested profiles;
- source-copy status.

### Machine layer

- Study snapshot;
- Source/Face/Candidate references;
- Recipes;
- Scenes;
- Font Uses;
- comparison sets;
- axes/features;
- coverage/fallback evidence;
- renderer identity;
- Figma reference JSON/CSV;
- checksums.

### Visual layer

- Review sheets;
- comparison sheets;
- System Scenes;
- multi-page PDF.

### Optional Source layer

Off by default.

Requires explicit permission acknowledgement.

The app states that font metadata is not the licence.

## 14. Built-in Recipe Packs

### Film / TV

- title;
- subtitle;
- logline;
- one-line promise;
- character bio;
- creator quote;
- episode/section title;
- body paragraph;
- caption;
- legal.

### Advertising

- campaign line;
- director statement;
- treatment paragraph;
- supers;
- data/proof point;
- end card;
- caption;
- legal.

### Business

- company/title;
- value proposition;
- problem;
- solution;
- testimonial;
- metric;
- team bio;
- caption;
- legal.

### Shared stress Recipes

- numerals/currency;
- punctuation;
- glyph stress;
- multilingual probe.

## 15. Search and filtering

Plain search is primary.

Filter controls:

- review state;
- family;
- style;
- source;
- format;
- variable;
- role;
- tag;
- missing/changed;
- script evidence.

An advanced field grammar may remain for power users, but must be discoverable through suggestions rather than placeholder incantations.

## 16. First-run and empty states

### Welcome

- New Study;
- Open Study;
- Import Sources;
- Scan Installed Fonts;
- Recent Studies;
- recovery item when present.

### No forced carousel

Teach through:

- context;
- empty states;
- one-time tips;
- sample Study;
- Help.

## 17. Product acceptance stories

### Import and review

1. As a designer, I can drop a folder and see exact collection Faces without installing them.
2. As a designer, I can begin reviewing before a large scan completes.
3. As a designer, I can cancel discovery without corrupting the Study.
4. As a designer, I can distinguish Unreviewed from Maybe.
5. As a designer, I can decide with the keyboard without triggering shortcuts while typing.
6. As a designer, I can undo a bulk review action.
7. As a designer, I can hide Reject without deleting it.
8. As a designer, I can group by Family without collapsing exact Faces.
9. As a designer, I can duplicate a variable Face into several Candidates.
10. As a designer, I can attach rationale rather than relying on memory.

### Compare

11. As a designer, I can compare at equal nominal size.
12. As a designer, I can compare at equal fit.
13. As a designer, I can lock line breaks.
14. As a designer, I can save and reopen a Comparison Set.
15. As a designer, I can use blind mode without hidden name leakage.
16. As a designer, I can see fitted-size differences.
17. As a designer, I can copy only matching axes deliberately.
18. As a designer, I can compare two instances of the same variable Face.

### System

19. As a designer, I can assign exact Font Uses to Roles.
20. As a designer, I can use one Face differently in two Roles.
21. As a designer, I can judge title and body together.
22. As a designer, I can test legal and captions at realistic small sizes.
23. As a designer, I can add a fallback only where needed.
24. As a designer, I can save rationale for a Role assignment.
25. As a designer, I can detect an incomplete required Handoff profile.

### Inspect

26. As a designer, I can use named instances before raw axes.
27. As a designer, I can see custom axes rather than only registered ones.
28. As a designer, I can reset axes safely.
29. As a designer, I can see only supported feature controls.
30. As a designer, I can search the character map.
31. As a designer, I can distinguish intended Face, fallback, and missing output.
32. As a designer, I can see practical metrics without receiving a quality grade.
33. As a designer, I can see embedding metadata accompanied by a licence disclaimer.

### Documents and sources

34. As a designer, I can save a human-readable portable Study.
35. As a designer, I can open it on the other platform.
36. As a designer, I can relink missing Sources.
37. As a designer, I can reconcile a changed collection.
38. As a designer, I can recover acknowledged work after a renderer crash.
39. As a designer, I can preserve the last intentional save after corrupt recovery.
40. As a designer, I can reveal a Source through the native file manager without exposing its path to the Studio.

### Handoff

41. As a collaborator, I can identify exact Face indices and settings.
42. As a collaborator, I can understand the selected system without the app.
43. As a collaborator, I can see which profile generated a proof.
44. As a collaborator, I can see missing Sources and warnings.
45. As a designer, I can export without partial debris.
46. As a designer, I can cancel export safely.
47. As a designer, I can choose whether licensed Source copies are included.
48. As a designer, I can generate reference data without a fake Figma-integration claim.

### Platform and accessibility

49. As a Mac user, I receive native documents, menus, dialogs, window behavior, and Finder integration.
50. As a Linux user, I receive Linux-native dialogs, modifiers, packages, and file-manager language.
51. As a screen-reader user, I can understand every primary specimen through semantic equivalent content.
52. As a keyboard user, I can complete the primary journey.
53. As a reduced-motion user, I can avoid nonessential animation.
54. As a user, I can understand material Mac/Linux renderer differences rather than seeing silent drift.

## 18. V1 exclusions

- Windows;
- mobile;
- font installation/activation;
- source editing;
- cloud collaboration;
- public review links;
- AI ranking;
- Figma plugin/API;
- plugin architecture;
- arbitrary Scene editor;
- updater;
- Flatpak unless the release gate explicitly promotes it;
- UFO/Designspace/TTX editing;
- vector outline export as a default Handoff.
