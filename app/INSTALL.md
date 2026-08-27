# Install Font Previewer

Font Previewer is a local desktop app. It has no account, updater, analytics, cloud processing, or required network connection.

The latest published package set is the `v0.1.0-rc.1` prerelease. Current `main` is ahead and preparing `v0.1.0-rc.2`; CI artifacts are exact-SHA evidence, not public releases.

## Verify downloads

Download the package and `SHA256SUMS` from the same GitHub release, then verify before installation.

macOS:

```bash
shasum -a 256 -c SHA256SUMS
```

Linux:

```bash
sha256sum -c SHA256SUMS
```

Do not install an asset whose checksum fails or whose release tag does not point to the commit stated in the release.

## macOS 13+ — Apple Silicon

1. Verify the macOS ZIP.
2. Extract it and move **Font Previewer.app** to Applications if useful.
3. The app is ad-hoc signed with hardened runtime. It is not Developer-ID signed or notarised.
4. macOS may warn or block first launch. Control-click the app, choose **Open**, then confirm only after trusting the repository, tag, and checksum.

No Developer ID signing, notarisation, stapling, or Gatekeeper acceptance is claimed.

## Ubuntu/Debian x64

Install the Debian package:

```bash
sudo apt install ./font-previewer_0.1.0_amd64.deb
```

Or extract `Font-Previewer-0.1.0-linux-x64.tar.gz`. Its Chromium sandbox helper must retain root ownership and mode `4755`; use the Debian package when the archive tool or filesystem cannot preserve that safely.

The package contains X11 and native Wayland/Ozone launch paths. Hosted CI exercises a full displayed X11 journey and a native Wayland/Ozone launch-and-render smoke. This does not replace independent-machine acceptance across Linux distributions, compositors, drivers, and desktop environments.

## Data and removal

- Studies and Handoffs are written only to destinations you choose.
- Recovery, bindings, and disposable caches stay in normal per-user application-data locations.
- Removing the app does not remove user-created Studies or Handoffs.
- Font Previewer never installs, moves, edits, or deletes font Sources.
- A Handoff copies Sources only through the product’s explicit redistribution acknowledgement and selected policy. You remain responsible for font rights.

## Build from source

```bash
cd app
npm ci
npm run electron:install
npm run verify
```

Then follow [`README.md`](README.md) for platform-specific packaging. Source builds remain prerelease software and do not create signing, notarisation, accessibility, typography, or production-readiness claims.
