# Install Font Previewer

Font Previewer is a local desktop app. It has no account, updater, analytics, cloud processing, or required network connection.

## macOS 13+ — Apple Silicon

1. Download the macOS arm64 ZIP from the GitHub release.
2. Verify it against `SHA256SUMS` from the same release.
3. Extract the ZIP and move **Font Previewer.app** to Applications if useful.
4. The app is ad-hoc signed with hardened runtime, but it is not Developer-ID signed or notarized. On first launch, Control-click the app, choose **Open**, then confirm only if you trust the repository and checksum.

No Apple signing, notarization, stapling, or Gatekeeper acceptance is claimed.

## Ubuntu/Debian x64

Verify the download first:

```bash
sha256sum -c SHA256SUMS
```

Install the Debian package:

```bash
sudo apt install ./font-previewer_0.1.0_amd64.deb
```

Or extract the portable archive. Its Chromium sandbox helper must retain root ownership and mode `4755`; use the Debian package if your archive tool or filesystem cannot preserve that safely.

Font Previewer supports both X11 and native Wayland/Ozone launch paths. The desktop session decides the default.

## Data and removal

- Studies and Handoffs are written only where you choose.
- Recovery, bindings and disposable caches stay in the normal per-user application-data locations.
- Removing the app does not remove user-created Studies or Handoffs.
- Font Previewer never installs, moves, edits or deletes font Sources.
