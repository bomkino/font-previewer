# Wayfinder

## Actual goal

Deliver one trustworthy local typography-decision product on Mac and Linux. A designer must be able to move from local Sources through Review, Compare, System, and Handoff, reopen the portable Study on the other platform, preserve decisions, understand renderer differences, and avoid leaking or silently copying font files.

## Current reality

The v0.1 release-candidate branch now implements the end-to-end journey in one shared Studio with narrow AppKit/WKWebView and Electron Hosts. Automated displayed-app and packaging evidence is green on both platforms.

The root `macos/` application remains a preserved CoreText oracle. It is not the active product because its historical model stores paths in the Study and collapses concepts that Study v4 keeps distinct.

## Evidence-backed route

1. D00 preserved and reconciled the reference.
2. P1 proved one shared Studio can run inside both Hosts with native menus/dialogs, a narrow bridge, recovery, and stable focus.
3. The release-candidate vertical slice replaced prototype recovery/import/Handoff seams with Host-owned durable implementations.
4. The installed Catalog is now Host-local, bounded, searchable, paginated, and explicit-add; Family Groups preserve Candidate identity.
5. CI now builds, launches, exercises, packages, and retains evidence for both Hosts.
6. The owner accepted the V1 workspace, durability, renderer, format, distribution, and internal Source-copy decisions. Human/reference gates remain before a supported stable v1.0.

## Accepted V1 direction

Full shared-Studio ownership is the accepted V1 direction. It survived automated cross-Host vetoes for:

- focus and native-panel return focus;
- native semantic command routing;
- bridge locality and malformed-request rejection;
- renderer reload and Host recovery;
- Catalog/Study separation and actual installed-font loading;
- displayed composition and web accessibility semantics;
- Mac and Linux packaging.

Interactive VoiceOver/Orca, attended native-quality review, real production-font review, and induced WebKit termination remain unverified and block a stable v1.0 quality claim, not the disclosed v0.1 prerelease.

## Next stable-v1 evidence packet

Prepare one consolidated packet after:

- attended Mac/VoiceOver and Linux/Orca journeys;
- reference-hardware Catalog/import/scroll/long-session measurements;
- renderer and format-tier comparison with redistributable fonts;
- independent clean-machine packages; production Mac signing evidence only if the owner later adopts paid Developer ID distribution.

At that point, decide whether the evidence supports a stable `v1.0.0` release.

## Discipline

- A working implementation does not silently accept an ADR.
- A green workflow names its exact SHA and gates.
- A package candidate is not a public release.
- Missing human or credential evidence is reported as an open gate, never fabricated.
