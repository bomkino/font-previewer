# Risk ledger

| ID | Risk | Current evidence | State | Next control |
|---|---|---|---|---|
| R-001 | Reference ceases to be a usable oracle | Preserved reference and its prior Mac CI remain intact | Controlled | Keep isolated from active Study semantics |
| R-002 | Domain identities collapse | Study v4 validators/tests separate Source, Binding, Face, Candidate, and Font Use | Controlled | Preserve public-seam tests and migration fixtures |
| R-003 | Portable Study leaks local paths | Protocol/serialization reject Binding/path data; bridge artifacts are scanned; 250 seeded corrupt Study documents are rejected | Controlled | Repeat with private/manual adversarial Studies before release |
| R-004 | Catalog silently pollutes Study | Real-host evidence asserts Candidate count unchanged after browse; explicit Add is the only mutation | Controlled | Human Catalog journey and large-family test |
| R-005 | Recovery overwrites intentional Save | Host mirror is separate; Save/Handoff require exact acknowledged revision; injected atomic-commit failure preserves the prior save byte-for-byte and cleans its sidecar | Reduced | Document-switch/crash/quit matrix and durability ADR |
| R-006 | Malformed font destabilizes Host | Linux metadata and variable parsing run in separate 3-second/1-MB bounded `fc-query`/Fontkit children; malformed/truncated metadata and an actual truncated file are rejected before import. Rendering stays in sandboxed browser content processes | Stable-v1 blocker | Cross-format hostile corpus and induced renderer/content-process termination |
| R-007 | Mac/Linux rendering claims exceed evidence | Both load actual installed fonts, but no redistributable fidelity corpus or raster-parity claim exists | Release blocker | Renderer/format ADR with cross-Host corpus |
| R-008 | Large Catalog freezes or grows without bound | 10,000 index, 80 UI page, 200 protocol cap, 400 metadata cache; hosted search/cancellation pass. A retained 500-Face/2,000-operation/100-recovery diagnostic has stable counts and about 1.55 MB final post-GC heap growth on Linux x64 and Mac arm64 | Reduced | Actual 500-Face import/100-card rendering and reference-hardware profile |
| R-009 | Assistive-technology user is excluded | Keyboard/focus/semantics/AX automation passes; no attended VoiceOver/Orca | Release blocker | Complete packaged-app journeys with findings |
| R-010 | Mac content process loses work | Automated reload restores revision/decision/focus; termination handler exists | Open | Induce WKWebView termination and inspect recovery |
| R-011 | Bridge/filesystem authority expands | Exact protocol v2, trusted sender/frame, opaque tokens, denied renderer Node/path access, and a 1,000-message malformed vocabulary corpus pass | Controlled | Attended security review and packaged privacy observation |
| R-012 | Handoff is partial or copies Sources unexpectedly | Hidden staging, hashes, manifest, visible default-on internal policy with opt-out; injected commit failure preserves the prior export and removes staging | Reduced | Low-disk and attended reconstruction/font-rights review |
| R-013 | Prerelease is mistaken for supported stable release | GitHub prerelease flag, v0.1 version, ad-hoc/notarization warning, explicit limitations | Controlled | Keep stable v1.0 separately gated |
| R-014 | Supply-chain notices are incomplete | Exact pins, lockfile, 81-component SBOM, zero audit findings, notices in both packages | Reduced | Recheck at final signed SHA |
| R-015 | Linux distribution coverage is too narrow | `.deb` and portable x64 pass disposable Ubuntu 24.04 extract/install/displayed-journey/removal checks; no independent machine, RPM, arm64, or Fedora evidence | Open | Owner decides V1 package matrix, then test it on independent clean machines |
| R-016 | Mac distribution triggers Gatekeeper friction | Hardened runtime and ad-hoc signature/ZIP pass; no Developer ID/notarization credentials used | Accepted v0.1 limitation | Publish Control-click → Open warning; adopt Developer ID only under a future paid policy |
| R-017 | Typography quality is poor despite green automation | Displayed screenshots exist, but no 20–50 production-font attended review | Release blocker | Designer review across QA payload matrix |
| R-018 | Dead prototype code becomes accidental authority | Obsolete P1 Mac Host removed; root native reference explicitly isolated | Reduced | Keep active app paths and docs unambiguous |

Severity reflects potential user harm, not implementation difficulty.
