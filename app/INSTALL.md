# Install Font Previewer

Font Previewer is a local desktop app. It has no account, updater, analytics, cloud processing, or required network connection.

The latest public package set is [`v0.1.0-rc.6`](https://github.com/bomkino/font-previewer/releases/tag/v0.1.0-rc.6), built from exact source `f1aa382c8265b4884261c4308a4a5d37077a5242`. Its public tag, `SOURCE_SHA`, and freshly downloaded `SHA256SUMS` agree. CI artifacts remain exact-SHA evidence, not substitutes for release assets.

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
4. Try to open the app once. If macOS blocks it, open **System Settings → Privacy & Security**, scroll to **Security**, click **Open Anyway**, then confirm. Apple keeps that button available for about an hour after the blocked launch: [Apple’s current instructions](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac).

This creates an exception for Font Previewer; it does not require disabling Gatekeeper globally. Do this only after the checksum matches and you trust the GitHub repository and tag. No Developer ID signing, notarisation, stapling, or Gatekeeper acceptance is claimed.

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
