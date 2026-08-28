# Release policy

## Published history

Published tags and releases are immutable historical records. Do not move a published tag, overwrite a release, replace its assets, or rewrite its source history.

The latest published Font Previewer release is `v0.1.0-rc.3`. Its tag and `SOURCE_SHA` asset identify immutable release source `0e1d5c1c3ef1e6d6455c8bafcfb72fb8d203e1fe`. The prior `v0.1.0-rc.2` and `v0.1.0-rc.1` releases remain fixed with their original assets and source history.

## Version model

- Application source and package version: `0.1.0`.
- Latest published prerelease: `v0.1.0-rc.3`.
- Designated candidate: `v0.1.0-rc.4`, not yet published.
- Stable `v1.0.0`: prohibited until the documented human, physical, typography, accessibility, containment, reconstruction, and distribution decisions close.

Every version change must reconcile `app/package.json`, `app/package-lock.json`, macOS bundle metadata, Linux package names/metadata, displayed version, SBOM, README, installation docs, changelog, tests, CI, and release notes. `npm run version:check` is the first gate.

## Verification before release preparation

A candidate must pass `.github/workflows/verify.yml` at the exact intended commit. Required evidence includes:

- strict types, complete public-seam tests, production builds, and npm audit;
- displayed macOS and Linux journeys;
- X11 and native Wayland/Ozone evidence;
- recovery, migration, forced failure, and transactional Handoff tests;
- package reproducibility, install/extract/launch/remove journeys, residue checks, and checksums;
- package inventory, source-map, private-path, credential-marker, licence, notices, SBOM, and font-binary scans;
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

No public release may be published without separate owner authorization, even when dry-run validation succeeds. The owner explicitly authorized `v0.1.0-rc.4` in the Body Copy completion request on 2026-08-28; that authorization is limited to this exact candidate and remains conditional on the gates above.

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
- Refuse source maps, private paths, usernames, emails, credentials, internal handover names, client material, and unlicensed font binaries.
- Include the software licence, third-party notices, SBOM, and installation limitations.
- Never silently copy or redistribute a user’s source fonts.
