# Font Previewer — Final Cloud Work Handover

> [!IMPORTANT]
> **HISTORICAL ARCHIVE — NOT CURRENT AUTHORITY**
>
> This handover pack is retained as programme evidence. It is not current build, release, or repository authority. Current truth lives in [`docs/maintenance/REPOSITORY_STATE.md`](../../maintenance/REPOSITORY_STATE.md).
>
> Any references below to signed or notarized distribution describe historical intent only. They are not claims about the current application or its published artifacts.

This pack is the build authority for the Font Previewer two-application programme.

It replaces the earlier single-document architecture thesis with a decision-controlled product, prototype, implementation, and release programme suitable for a fresh ChatGPT Work / Codex handoff.

## Product

One local typography-decision product delivered as:

1. **Font Previewer for Mac**
   - reference client;
   - Apple-silicon-only;
   - SwiftUI/AppKit host;
   - bundled WKWebView Studio;
   - direct distribution through a signed and notarized application.

2. **Font Previewer for Linux**
   - first-class companion;
   - Electron host;
   - the same Studio and portable Study semantics;
   - x86_64 first;
   - Linux-native discovery, rendering, packaging, and desktop behavior.

## Important correction

Two architecture questions remain deliberate R0 decision gates:

1. **Interactive rendering**
   - host-native rendered assets;
   - direct browser rendering;
   - or a controlled hybrid.

2. **Study durability authority**
   - Studio-authoritative with an asynchronous durable Host mirror;
   - Host-authoritative shared core;
   - or a synchronous two-phase commit.

The pack supplies leading hypotheses, prototypes, veto conditions, and decision records. It does not disguise untested assumptions as final architecture.

## Read in this order

1. `00_MASTER_HANDOFF.md`
2. `01_PRODUCT_SPEC.md`
3. `02_UX_SPEC.md`
4. `03_DOMAIN_MODEL.md`
5. `04_ARCHITECTURE.md`
6. `05_RENDERING_DECISION_GATE.md`
7. `06_STATE_DURABILITY_GATE.md`
8. `07_PROTOTYPE_PROGRAM.md`
9. `08_GAUNTLET_REPORT.md`
10. `09_ADR_REGISTER.md`
11. `10_IMPLEMENTATION_ROADMAP.md`
12. `11_BUILD_BACKLOG.md`
13. `12_TEST_SECURITY_RELEASE.md`
14. `13_OPEN_SOURCE_LEDGER.md`
15. `14_CLOUD_WORK_MASTER_PROMPT.md`
16. `15_CODEX_TASK_TEMPLATE.md`
17. `16_STATUS_AND_CHANGE_CONTROL.md`
18. `AGENTS.md`
19. `VALIDATION_REPORT.md`

## Authority hierarchy

When documents conflict:

1. an accepted ADR;
2. `00_MASTER_HANDOFF.md`;
3. `01_PRODUCT_SPEC.md`;
4. `03_DOMAIN_MODEL.md`;
5. `04_ARCHITECTURE.md`;
6. the current Wayfinder decision;
7. the current vertical ticket;
8. implementation comments;
9. archived plans.

Never resolve a conflict by silently choosing the easiest sentence. Record it, update the authority, then continue.

## Repository baseline

```text
Repository:       bomkino/pitch-deck-tools
Reference branch: codex/native-macos-font-lab
Reference commit: be77221cb7cb809fdf119945f3fee3d2e1e72ed6
```

The reference branch contains working CoreText, import, document, source-watching, export, and packaging ideas. Preserve it as an oracle until replacement evidence exists.

## Non-negotiable boundaries

- No big-bang rewrite.
- No merge to `main` without explicit owner approval.
- No public release, deployment, upload, or third-party delivery without explicit owner approval.
- No font binaries or paid/client sources committed.
- No cloud, account, analytics, or background upload.
- No font installation, activation, deactivation, moving, or deletion.
- No automatic “best font” or pairing score.
- No Figma-integration claim without a real integration.
- No cross-platform pixel-parity claim.
- No test-count target.
- No production phase begins while its blocking R0 decision remains open.
- No existing native capability is deleted before its replacement passes the agreed journey.

## What Cloud Work should produce

The intended endpoint is:

- accepted product and architecture decisions;
- completed R0 evidence;
- one cross-platform vertical tracer;
- staged alpha, beta, and release-candidate builds;
- verified Mac and Linux packages;
- a draft pull request;
- a complete verification report;
- no unapproved merge or publication.
