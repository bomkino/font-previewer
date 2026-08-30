# Release policy

## Published history

Published tags and releases are immutable historical records. Do not move a published tag, overwrite a release, replace its assets, or rewrite its source history.

The latest published Font Previewer release is `v0.1.0-rc.4`. Its tag and `SOURCE_SHA` asset identify immutable release source `b0950402316253cc9cb7bf7a6ec86ea5f669184f`. The prior `v0.1.0-rc.3`, `v0.1.0-rc.2`, and `v0.1.0-rc.1` releases remain fixed with their original assets and source history.

## Version model

- Application source and package version: `0.1.0`.
- Latest published prerelease: `v0.1.0-rc.4`.
- Prepared later candidate source: `v0.1.0-rc.5`; it has no tag, release, exact candidate SHA, or published assets yet.
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

No public release may be published without separate owner authorization, even when dry-run validation succeeds. The one-use authorization for `v0.1.0-rc.4` was exercised by publication run `33151987068` on 2026-08-28. The owner explicitly authorized one guarded `v0.1.0-rc.5` publication on 2026-08-30; that authority remains conditional on the exact-main verification and dry-run gates and does not authorize a stable release or later tag.

### Temporary rc.5 owner-comment bridge

`.github/workflows/release-comment-rc5.yml` is a one-use control-plane bridge for the authorized `v0.1.0-rc.5` release only. It never checks out or evaluates pull-request code. It accepts only an exact comment from the repository owner on the merged candidate pull request, requires that pull request's merge commit and current `main` to equal the requested SHA, and mirrors the successful exact-main Verify-run check before dispatching the guarded manual release workflow.

The two accepted full-comment forms are:

```text
/font-previewer-release-v0.1.0-rc.5 dry-run <40-character-main-SHA> <Verify-run-ID>
/font-previewer-release-v0.1.0-rc.5 publish <40-character-main-SHA> <Verify-run-ID> <dry-run-ID> confirm=v0.1.0-rc.5
```

Dry runs emit a conditional proof artifact containing their exact SHA, Verify run, tag, release-workflow run ID, and `publish: false`. The publish command must identify a completed successful release-workflow run and match that unexpired proof byte for byte at the field level. The release workflow then independently rechecks current `main`, the Verify run, artifact provenance, checksums, package contents, tag confirmation, and tag/release non-existence. Tag-scoped concurrency and the existing refusal checks prevent overwrite or a successful duplicate publication.

Other users, other tags, partial commands, unmerged pull requests, stale `main` SHAs, failed or mismatched runs, and expired or altered proof artifacts cannot dispatch. Remove the bridge in the post-publication receipt pull request; its hard-coded repository, owner, and tag cannot authorize `v1.0.0` or any later release.

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
