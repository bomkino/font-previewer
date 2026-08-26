# Open-source notes

## Shipped runtime and build dependencies

The active application deliberately keeps a small dependency surface: React/React DOM for the shared Studio and Electron for the Linux Host. TypeScript and Vite are build-time tools. Exact versions, licences, removal seams, transitive posture, and immutable workflow actions are recorded in [`../app/DEPENDENCIES.md`](../app/DEPENDENCIES.md) and the CycloneDX SBOM.

Mac uses platform AppKit, WebKit, CoreText, CryptoKit, Foundation, and Uniform Type Identifiers frameworks. No additional Swift package is linked into the active Host.

## FontGoggles

Useful patterns include direct local-file work, collection Faces, reload behavior, variable-font testing, and explicit complex-script shaping. Font Previewer does not copy its UI or bundle its Python/HarfBuzz stack. HarfBuzz remains a renderer decision to evaluate against a corpus.

## FontBlind

Useful operational lessons include local-only architecture, native panels, staged packaging, re-extraction/verification, privacy tests, and refusal over untrustworthy output. Font Previewer borrows those standards, not transformation logic or interface.

## fontTools and FontBakery

fontTools is a plausible future seam for richer metadata and source formats; FontBakery’s explicit checks are a useful model for a small deck-relevant preflight. Neither is bundled. Adding Python/runtime weight requires a measured need, licence review, security review, notices, and a removal plan.

## DrawBot

DrawBot demonstrates repeatable specimen scripting. Study v4 and Recipes provide a data foundation for repeatable specimens without requiring users to write Python.

## Electron and Chromium

Electron is isolated to the Linux Host. The package retains Electron and Chromium licence files, and the app ships third-party notices. Replacing Electron should leave Study semantics and HostBridge intent intact.

## Non-goals

- Reproducing another tool’s visual language or source wholesale.
- Adding a famous dependency without measured product need.
- Claiming script quality from Unicode coverage alone.
- Generating subjective winner scores.
- Training on, uploading, or redistributing paid/client fonts.
- Treating system-font availability as permission to package font binaries.
