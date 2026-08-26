# P1 Shared Studio

This is the throwaway Variant A prototype for D01. It tests whether one React/TypeScript Studio can own Sources/Study navigation, Review/Compare/System/Handoff, the Inspector, and the comparison tray while a narrow native Host owns menus, dialogs, undo, source bindings, and process reload.

It is evidence code, not a production foundation. It has no real font engine and does not accept the workspace ADR.

## Fixture and tasks

The fixture contains 24 Candidates, four Families, variable Candidates that share Faces, one missing local Source Binding, prior review decisions, three Recipes, two Font Uses, and an existing Compare Set.

The interface supports:

- finding and deciding Unreviewed Candidates;
- editing specimen copy;
- building a four-item Compare Set;
- assigning a Display/Text/Caption/Mono Font Use;
- opening the Host import dialog without exposing paths;
- native undo and semantic native menu commands;
- checkpointing and reloading the renderer;
- keyboard stage and review commands that are disabled while editing.

## Run

Use Node.js 24 or newer.

```bash
npm install
npm run electron:install
npm run build
npm run electron
```

Electron 44 deliberately does not download its binary during `npm install`; `electron:install` is an explicit, networked setup step.

For the renderer-only fallback:

```bash
npm install
npm run dev
```

The browser fallback simulates import and undo. It cannot provide native-host evidence.

## Verification

```bash
npm run check
npm test
npm run build
npm audit --audit-level=moderate
node scripts/build-sbom.mjs
```

See `REPORT.md` for the current evidence and remaining decision gates. See `DEPENDENCIES.md` and `sbom.cdx.json` for the exact dependency posture.
