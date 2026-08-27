# V1 owner decision record

## Verdict

The owner authorized an immediate, free GitHub `v0.1.0` prerelease after exact-head macOS and Linux CI passes. Integration targets the isolated `codex/v1-release-candidate` branch only; `main` remains untouched. The prerelease is intentionally unsigned by an Apple Developer ID and is not notarized.

## Approved product boundary

| Area | Owner decision |
|---|---|
| UI/renderer | Shared semantic Studio; WKWebView/CoreText on Mac and Chromium on Linux; no raster-parity claim |
| Formats | Full preview for OTF/TTF/WOFF/WOFF2; metadata-only TTC/OTC/DFONT |
| Linux variables | Axes and named instances required; parsed in a bounded child process |
| Durability | Host recovery mirror plus explicit Save |
| Font containment | Sandboxed browser content process plus bounded metadata/parser children; hostile-corpus proof still required for stable V1 |
| macOS distribution | GitHub ZIP, macOS 13+ arm64, hardened runtime, ad-hoc signature, no App Sandbox, no Developer ID/notarization |
| Linux distribution | GitHub `.deb` and portable tarball, x64, X11 and Wayland; no RPM or arm64 in v0.1 |
| Handoff Sources | Copy locally bound Sources by default for the internal workflow; retain opt-out and licence warning |
| Integrations | JSON/CSV Figma reference only; no live Figma integration |
| Connectivity | Local-only; no accounts, updater, analytics, or cloud processing |
| Evidence | Automate everything available; never claim attended accessibility/design/reconstruction evidence without a person |
| Versioning | Public `v0.1.0` prerelease first; stable `v1.0.0` only after the remaining human/reference gates |
| Publication | Preauthorized merge into the RC branch, tag, and GitHub prerelease after green exact-head gates |

## Verified candidate before the owner decision

- Repository: [`bomkino/font-previewer`](https://github.com/bomkino/font-previewer)
- Isolated branch: `codex/v1-release-candidate-hardening-02`
- Draft PR: [#2](https://github.com/bomkino/font-previewer/pull/2)
- Candidate product commit: `5d368650436bd2b1aca6f7efdf8825087a65d4e3`
- Exact-head workflow: [33043015559](https://github.com/bomkino/font-previewer/actions/runs/33043015559) — macOS and Linux green
- Linux 28/28 tests; Mac 27 pass plus one Linux-only test skipped
- Eight exact-SHA artifacts retained, with workflow and package checksums verified

## New release slice awaiting exact-head CI

- Linux OTF/TTF/WOFF/WOFF2 variable-axis and named-instance inspection through Fontkit in a three-second, one-megabyte-output child process.
- A real Ubuntu-packaged Inter variable font is mandatory in CI; the test must discover a real axis rather than rely only on mocks.
- New internal Studies copy Sources into transactional Handoffs by default without a second confirmation click; users can opt out.
- macOS ad-hoc packaging enables hardened runtime and asserts the flag.
- Fontkit runtime dependencies ship inside Linux packages; the SBOM, notices, audit, package extraction, and checksum gates cover them.

## Honest prerelease limitations

- No attended VoiceOver or Orca report.
- No attended native-window or typography review with legally held production fonts and competent complex-script readers.
- No independent Handoff reconstruction or independent clean-machine/reference-hardware report.
- No hostile cross-format font corpus or induced WKWebView content-process termination evidence.
- No Developer ID identity, notarization, stapling, or Gatekeeper acceptance proof. The Mac download may require Control-click → Open.
- No physical Linux machine is required for this prerelease because hosted Ubuntu builds, launches, installs, exercises, and removes the real packages. A Mac cannot independently prove Linux desktop behavior.

These limitations block a supported stable `v1.0.0` claim. They do not become “passed” merely because the owner accepts a v0.1 prerelease.

## Release notes

Font Previewer v0.1 is a local desktop typography decision tool for macOS and Linux. It provides one shared Review → Compare → System → Handoff workflow, portable path-free Study v4 documents, Host-local installed-font Catalogs, native menus and panels, recovery distinct from Save, variable-font controls on both Hosts, and transactional Handoff packages with checksums. Linux downloads include x64 `.deb` and portable tarball packages. The macOS 13+ arm64 ZIP is ad-hoc signed with hardened runtime but is not notarized.
