# V1 owner release decision packet

## Recommendation

**Hold public release.** The application is a strong release candidate, but production distribution and attended usability evidence are not complete. This packet deliberately separates code integration from public release.

## Candidate under review

- Repository: [`bomkino/font-previewer`](https://github.com/bomkino/font-previewer)
- Isolated branch: `codex/v1-release-candidate-hardening-02`
- Draft PR: [#2](https://github.com/bomkino/font-previewer/pull/2)
- Candidate product commit: `5d368650436bd2b1aca6f7efdf8825087a65d4e3`
- Candidate tree: `ebfbce480d26e05d75cdd6f5b2a0a92d24883dd9`
- Exact-head workflow: [33043015559](https://github.com/bomkino/font-previewer/actions/runs/33043015559) — macOS and Linux green
- Merge: not performed
- Tag/release: not created

Eight exact-SHA artifacts are retained: Mac app, Mac evidence, Mac package smoke, Mac soak, Linux packages, Linux evidence, Linux package smoke, and Linux soak. GitHub records SHA-256 digests for every artifact; package-internal checksum files are also verified by the workflow.

## Release notes draft

Font Previewer v0.1 is a local desktop typography decision tool for macOS and Linux. It provides one shared Review → Compare → System → Handoff workflow, portable path-free Study v4 documents, Host-local installed-font Catalogs, native menus and panels, recovery distinct from Save, and transactional handoff packages with checksums. The hardening candidate adds exact Linux collection-face metadata, bounded malformed-font rejection, 500-Face long-session diagnostics, and complete v1–v3 migration fixtures.

## Verified deliverables

| Deliverable | Current state |
|---|---|
| Shared Studio source/build | Strict builds pass on hosted Linux x64 and macOS 14 arm64 |
| Public-seam tests | Linux 28/28; Mac 27 pass plus one Linux-only test skipped |
| Linux `.deb` and portable archive | [Exact-SHA artifacts](https://github.com/bomkino/font-previewer/actions/runs/33043015559), package journeys and removal pass |
| macOS app ZIP | [Exact-SHA arm64 artifact](https://github.com/bomkino/font-previewer/actions/runs/33043015559), ad-hoc integrity, extracted journey, and portable consumer checksum pass |
| 500-Face long-session diagnostics | 2,000 operations and 100 recovery round trips pass on both Hosts; retained JSON artifacts |
| SBOM and third-party notices | CycloneDX 1.6, 81 components, zero known npm vulnerabilities; packaged notices pass |
| Capability/migration report | [`CAPABILITY_PARITY.md`](CAPABILITY_PARITY.md) |
| Risk and QA truth | [`RISK_LEDGER.md`](RISK_LEDGER.md) and [`../QA.md`](../QA.md) |

## Open limitations

- No attended VoiceOver or Orca pass.
- No attended native-window or typography review with legally held production fonts and competent complex-script readers.
- No independent clean-machine installation matrix or reference-hardware budget.
- No hostile-font process-isolation proof; Linux now rejects malformed/truncated metadata within a bounded `fc-query` subprocess, but font rendering remains inside the browser content process.
- No induced WKWebView content-process termination evidence.
- Linux imported-font axis/instance metadata and the production renderer/format tiers remain decision-gated.
- No Developer ID identity, hardened production signature, notarization, stapling, or Gatekeeper proof.
- RPM, Linux architecture matrix, and Mac architecture/minimum-version policy remain owner decisions.
- Independent Handoff reconstruction and source-redistribution rights remain human responsibilities.

## Provenance and licences

- Repository code is MIT licensed; packaged candidates include the licence and generated third-party notices.
- CycloneDX SBOM generation and npm audit are release gates.
- The preserved reference is traced to `bomkino/pitch-deck-tools` at `be77221cb7cb809fdf119945f3fee3d2e1e72ed6`.
- CI uses installed system fonts but does not commit or upload font binaries.
- No licence conclusion is inferred for user-selected Sources; Source copying is default-off and permission-gated.

## Independent owner choices

1. **Integration choice:** merge draft PR #2 into the isolated release-candidate branch, request changes, or leave it open. This does not authorize a public release.
2. **Distribution policy:** choose supported Mac architectures/minimum version, Linux architectures, and whether RPM is required.
3. **Security architecture:** accept or revise renderer/format tiers, Mac sandbox/process-isolation policy, and durability ADRs.
4. **Public release choice:** only after open gates have evidence, explicitly authorize tag/release creation. No action is taken by default.

## Minimum evidence before “release ready”

- exact-head macOS and Linux workflows green with retained packages/checksums — **verified**;
- attended VoiceOver and Orca reports;
- attended typography/native review and independent Handoff reconstruction;
- independent clean-machine and reference-hardware reports;
- chosen distribution/security ADRs;
- Developer ID signing/notarization proof if direct Mac distribution is chosen;
- explicit merge decision followed by a separate explicit public-release decision.
