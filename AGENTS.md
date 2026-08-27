# AGENTS.md — Font Previewer

## Mission

Maintain one local typography-decision product delivered through:

- a macOS AppKit/WKWebView Host using the shared Studio;
- a Linux Electron Host using the same Study semantics and Studio.

The root SwiftUI/CoreText application is preserved reference material, not the active package.

## Current truth

Read these before changing product or release claims:

1. `docs/maintenance/REPOSITORY_STATE.md`
2. `docs/ARCHITECTURE.md`
3. `docs/QA.md`
4. `docs/maintenance/BRANCH_POLICY.md`
5. `docs/maintenance/RELEASE_POLICY.md`
6. the relevant ADR or historical programme source when needed

`main` is canonical. Old RC, hardening, pre-Mac, publishing, prototype, and agent branch names are history, not architecture.

## Domain invariants

- Source ≠ Face.
- Face ≠ Candidate.
- Candidate ≠ Font Use.
- Family is grouping evidence, not identity.
- Catalog is Host-local; Study is portable.
- Recipe ≠ Scene.
- Review State ≠ Tag.
- local Source Binding ≠ portable Source hint.
- recovery ≠ intentional Save.
- Handoff ≠ automatic Source package.
- new Candidates are Unreviewed.

## Product invariants

- Review → Compare → System → Handoff.
- Inspect remains contextual.
- No deck builder, font manager, taste score, cloud/account/analytics layer, or fake Figma integration.
- No required network.
- No source copying without the explicit Handoff rights acknowledgement and selected policy.
- No cross-platform raster-parity claim.
- No FontBlind anonymisation, transformation, mechanical oblique, interpolation, or font-packaging implementation.

## Architecture invariants

- One product, two Hosts, shared semantics.
- Privileged operations stay platform-native and outside the Studio.
- Durable IDs are not paths, names, PostScript names, or digests.
- Catalog and Study remain separate.
- HostBridge is closed, path-free, runtime-validated, and bounded.
- Study migration is explicit and fail-closed.
- Font files, Studies, bridge messages, recovery data, and Handoff destinations are untrusted.

## Security

- No arbitrary filesystem access in web content.
- No path-bearing preview URL.
- Electron remains sandboxed with context isolation and no Node integration.
- WKWebView uses bounded local schemes and a named content world.
- Parsing, traversal, tasks, output, memory, and time remain bounded.
- Canonicalize paths; reject symlink/package traversal; redact logs; clean failed staging.
- Never commit paid, client, copied system, private, or mystery font binaries.

## Development

- Work on a temporary branch from current `main`.
- Keep one coherent product change per PR where practical.
- Test at agreed public seams, not private implementation details.
- Add abstractions only for a demonstrated product or security need.
- Preserve the native reference until a deliberate replacement decision records equivalent evidence.
- Do not publish, move tags, overwrite releases, add credentials, or change distribution claims without explicit owner authorization.

## Required verification

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

Application and release changes must also pass `.github/workflows/verify.yml` at the exact proposed head. Semantic labels are not an attended screen-reader pass. Hosted package journeys are not independent-machine evidence. An ad-hoc signature is not Developer ID signing or notarisation.

## Completion record

Record:

- base and exact head SHA;
- files and behavior changed;
- commands and workflow run;
- package/checksum evidence;
- security, privacy, performance, and accessibility impact;
- claims newly supported;
- limitations and gates still open.

Never claim completion without fresh evidence.
