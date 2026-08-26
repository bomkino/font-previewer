# Font Previewer roadmap

## Current: close the v0.1 release gate

- Run attended VoiceOver and Orca journeys on the packaged apps.
- Review native window/menu quality and typography with 20–50 legally held production fonts.
- Measure 10,000-entry Catalog search, 500-Face import, scrolling, long-session memory, and cancellation on reference hardware.
- Exercise malformed-font containment and induced WKWebView content-process termination.
- Run clean-machine `.deb`, portable archive, and Mac install/launch/uninstall matrices.
- Decide production renderer/format tiers and record the workspace/durability ADR verdicts.
- Decide whether RPM and x86_64/universal Mac artifacts are V1 commitments.
- Apply Developer ID/hardened signing, notarization, and stapling when credentials are deliberately supplied.
- Obtain separate owner approval for PR readiness, merge, and public release.

## Next product pass

- Richer Character/Fallback/Metrics evidence with explicit confidence and Render Profile.
- Dedicated fallback-stack and cascade testing.
- Cross-Host reference-output corpus using redistributable fonts.
- Named specimen Recipe editing and reusable Recipe packs.
- Multi-select and bulk review/tag/Role operations.
- Better large-family paging beyond the visible Catalog page.
- Handoff annotations and reconstruction diagnostics.
- Optional RPM after demand and maintenance cost are confirmed.

## Typography research

- Build a shaping corpus for Arabic, Devanagari, Hebrew, Thai, and selected Southeast Asian scripts.
- Compare CoreText/WebKit and Chromium against a measured HarfBuzz/FreeType reference before choosing another runtime dependency.
- Explore optical-size presets, named variable instances, vertical-metric diagnostics, and punctuation preflight.
- Consider UFO, Designspace, or TTX only if font-development workflows become a real user need.

## Distribution later

- Repeatable arm64/x86_64 or universal Mac production builds.
- Opt-in updater only if privacy, rollback, signing, and maintenance evidence justify it.
- Reproducible provenance/attestation after the first signed distribution path is stable.

## Not planned

- Cloud font storage, accounts, analytics, or required network.
- Font installation or activation management.
- Automatic “best font” scores or generative font imitation.
- Silent copying of source fonts.
- Fake Figma integration.
- Pixel-identical Mac/Linux output claims.
