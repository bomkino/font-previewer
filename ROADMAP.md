# Font Previewer roadmap

Completed implementation and repository history belong in the changelog and archived programme reports. This file contains future work only.

## Stable-release gates

- Run attended VoiceOver and Orca journeys on packaged applications and resolve blocking findings.
- Review native window/menu quality and typography with 20–50 legally held production fonts.
- Add competent-reader review for selected complex scripts; automated coverage metadata is insufficient.
- Repeat import, visible-card, long-session, and recovery measurements on reference hardware.
- Extend malformed-input coverage into a documented hostile cross-format font corpus and induce WKWebView content-process termination.
- Reconstruct Studies and Handoffs independently on clean supported Mac and Linux machines; test install, launch, Save, recover, export, update, remove, and residue.
- Decide production renderer/format tiers, workspace durability, Linux package scope, and any sandbox/process-isolation changes through ADRs.
- Decide whether RPM, Linux arm64, Mac x86_64, or universal Mac artifacts are support commitments.
- Adopt Developer ID signing, notarisation, and stapling only if credentials and maintenance responsibility are deliberately supplied.
- Obtain explicit owner authorization for any new public release.

## Next product pass

- Richer Character, fallback, and metrics evidence with explicit confidence and Render Profile.
- Dedicated fallback-stack and cascade testing.
- Cross-Host reference-output corpus using redistributable fonts.
- Named specimen Recipe editing and reusable Recipe packs.
- Multi-select and bulk review, tag, and Role operations.
- Better large-family paging beyond the visible Catalog page.
- Handoff annotations and reconstruction diagnostics.
- Optional RPM only after demand and maintenance cost are confirmed.

## Typography research

- Build a shaping corpus for Arabic, Devanagari, Hebrew, Thai, and selected Southeast Asian scripts.
- Compare CoreText/WebKit and Chromium against a measured HarfBuzz/FreeType reference before choosing another runtime dependency.
- Explore optical-size presets, named variable instances, vertical-metric diagnostics, and punctuation preflight.
- Consider UFO, Designspace, or TTX only if font-development workflows become a real user need.

## Distribution later

- Repeatable arm64/x86_64 or universal Mac production builds.
- Opt-in updater only if privacy, rollback, signing, and maintenance evidence justify it.
- Reproducible provenance and attestation after a signed distribution path exists.

## Not planned

- Cloud font storage, accounts, analytics, or required network.
- Font installation or activation management.
- Automatic “best font” scores or generative font imitation.
- Silent copying of source fonts.
- FontBlind transformation or packaging engines.
- Fake Figma integration.
- Pixel-identical Mac/Linux output claims.
