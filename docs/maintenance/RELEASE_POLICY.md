# Release policy

## Published history

Published tags and releases are immutable historical records. Do not move a published tag, overwrite a release, replace its assets, or rewrite its source history.

The latest published Font Previewer release is `v0.1.0-rc.6`. Its tag and `SOURCE_SHA` asset identify immutable release source `f1aa382c8265b4884261c4308a4a5d37077a5242`. The prior `v0.1.0-rc.5`, `v0.1.0-rc.4`, `v0.1.0-rc.3`, `v0.1.0-rc.2`, and `v0.1.0-rc.1` releases remain fixed with their original assets and source history.

## Version model

- Application source and package version: `0.1.0`.
- Latest published prerelease: `v0.1.0-rc.6`.
- Prepared later candidate source: none.
- Stable `v1.0.0`: prohibited until the documented human, physical, typography, accessibility, containment, reconstruction, and distribution decisions close.

Every version change must reconcile `app/package.json`, `app/package-lock.json`, macOS bundle metadata, Linux package names/metadata, displayed version, SBOM, README, installation docs, changelog, tests, CI, and release notes. `npm run version:check` is the first gate.

## Verification before release preparation

A candidate must pass `.github/workflows/verify.yml` at the exact intended commit. Required evidence includes:

- strict types, complete public-seam tests, production builds, and npm audit;
- displayed macOS and Linux journeys;
- X11 and native Wayland/Ozone evidence;
- recovery, migration, forced failure, and transactional Handoff tests;
- package reproducibility, install/extract/launch/remove journeys, residue checks, and checksums;
- package inventory, source-map, private-path, credential-marker, licence, notices, and SBOM scans;
- exactly seven approved CC0-1.0 interface WOFF2 files at the allowed renderer path, byte sizes, and SHA-256 digests, with every other or disguised font binary rejected;
- displayed evidence captured only after PD Body Roman, PD Body Italic, PD Head, and PD Eyebrow load and two animation frames settle;
- exact productive-control height, icon/caret centering, caret inset, panel alignment, tray boundary, overflow, disclosure semantics, reduced-motion behavior, and real intermediate motion frames where motion is enabled;
- macOS hardened-runtime and ad-hoc signature verification.

A successful run on another commit is not transferable evidence.

## Manual release workflow

`.github/workflows/release.yml` is manual only. It requires:

1. an exact full SHA equal to current `main`;
2. an exact successful verification run for that SHA;
3. a new prerelease tag matching the source version;
4. exact-SHA package artifacts carrying `SOURCE_SHA`;
5. valid checksums, package contents, SBOM, notices, licence, and current release notes.

The default path creates and retains a dry-run bundle. Publication requires explicit `publish=true` and an exact tag confirmation. The workflow refuses an existing tag or release.

No public release may be published without separate owner authorization, even when dry-run validation succeeds. The one-use authorization for `v0.1.0-rc.5` was exercised by publication run `33292575588` on 2026-08-30. The one-use authorization for `v0.1.0-rc.6` was exercised by publication run `33296294623` on 2026-08-30 after exact-main verification run `33296016674` and guarded dry run `33296253222`. Neither authorization extends to a stable release or later tag.

## Claim boundaries

Automated evidence may support statements about builds, tests, package structure, checksums, semantics, bounded fixtures, and hosted-runner journeys. It may not support claims of:

- attended VoiceOver or Orca usability;
- human typography, native-interface, or competent complex-script quality;
- universal Mac/Linux behavior;
- independent clean-machine reconstruction unless independently performed;
- broad hostile-font containment beyond the tested corpus;
- Developer ID signing, notarisation, stapling, or Gatekeeper acceptance.

The macOS package is ad-hoc signed with hardened runtime and remains unnotarised. Linux support language must remain scoped to the package and environments actually exercised.

## Artifact rules

- Name verification artifacts with the exact source SHA.
- Include `SOURCE_SHA` and checksum manifests.
- Refuse source maps, private paths, usernames, emails, credentials, internal handover names, and client material.
- Permit only the seven approved CC0-1.0 pitch.dog interface WOFF2 files at their approved package location, byte size, and SHA-256 digest; refuse missing, duplicate, altered, disguised, or additional font binaries.
- Include the software licence, third-party notices, SBOM, and installation limitations.
- Never silently copy or redistribute a user’s source fonts.
