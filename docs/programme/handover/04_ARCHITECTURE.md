# Architecture

## 1. Architectural goal

Create one product with two native-enough Hosts, one portable domain, one shared Studio, and explicit platform adapters.

The architecture must optimize for:

- locality;
- durability;
- trustworthy font identity;
- fast judgement;
- process containment;
- cross-platform semantics;
- release simplicity;
- replacement of current work without a rewrite cliff.

## 2. Reference baseline

The native reference branch already demonstrates:

- Foundation-only document logic;
- CoreText Face enumeration;
- collection indexing;
- axes and features;
- CoreText rendering;
- source watching;
- atomic export;
- privacy checks;
- Mac package assembly.

Treat these as evidence and reusable implementation, not as an immutable module map.

## 3. Architecture options

### Option A — Full shared Studio with native Hosts

Mac:

```text
SwiftUI/AppKit Host
└── WKWebView Studio
```

Linux:

```text
Electron Host
└── sandboxed Chromium Studio
```

Strengths:

- one workspace;
- one interaction model;
- one accessibility model;
- one visual system;
- Linux is not a rewrite.

Risks:

- Mac nativeness;
- native/web focus;
- WebKit process recovery;
- bridge/state durability.

Leading option. P1 decides.

### Option B — Native shell and inspector, shared central stage

Strengths:

- more native Host controls;
- web stage stays focused.

Risks:

- duplicated selection/forms/inspector;
- two product implementations;
- bridge chatter;
- Linux drift.

Fallback if P1 rejects full Studio.

### Option C — Separate UIs sharing domain/render contracts

Strengths:

- maximal platform fit.

Risks:

- double product work;
- UX and accessibility drift;
- Linux remains secondary.

Use only if shared UI fails a hard veto.

## 4. Recommended layers

```text
Portable product contracts
├── Domain
├── Study schema
├── semantic commands
├── Recipes/Scenes
├── HostBridge protocol
├── Render protocol
└── Handoff contract

Shared Studio
├── Study Session
├── Review
├── Compare
├── System
├── Handoff
├── Inspector
└── semantic accessibility

Mac Host
├── document/window lifecycle
├── dialogs/menus
├── binding/recovery stores
├── WebKit coordinator
├── CoreText render adapter
└── package/signing

Linux Host
├── lifecycle/dialogs/menus
├── binding/recovery stores
├── secure preload/protocols
├── sidecar supervision
├── Linux render adapter
└── packaging
```

## 5. Deep modules and real seams

### Study Session

One shared implementation.

Interface:

- open/migrate;
- dispatch semantic command;
- snapshot;
- undo/redo;
- revision;
- flush draft.

Do not create adapters merely for testing.

### HostBridge

Real seam because Mac and Linux adapters exist.

Interface includes:

- capability negotiation;
- document mirror/save;
- source selection/discovery/binding;
- render request/cancel/release;
- export;
- native app commands;
- constrained clipboard/reveal.

No generic filesystem or raw IPC.

### Render Service

Real seam because Mac and Linux adapters exist.

Interface:

- inspect Face;
- render Scene;
- cancel;
- release result;
- report profile/capabilities.

The interface hides parser, shaper, rasterizer, cache, and process details.

### Catalog

Real seam because discovery differs:

- CoreText/system locations on Mac;
- Fontconfig/system locations on Linux.

Interface:

- index;
- search;
- resolve;
- add to Study;
- observe changes.

### Document Store

Real seam because native document behavior differs.

Interface:

- open bytes;
- save atomically;
- Save As;
- recent items;
- recovery;
- workspace state.

### Handoff Builder

Shared planning/manifest logic with platform render/file adapters.

Interface:

- preflight;
- stage;
- produce;
- verify;
- commit;
- cancel.

## 6. HostBridge security model

### Request

```ts
{
  protocolVersion,
  sessionID,
  requestID,
  method,
  params
}
```

### Response

```ts
{
  protocolVersion,
  sessionID,
  requestID,
  ok,
  result | error
}
```

### Event

```ts
{
  protocolVersion,
  sessionID,
  eventID,
  event,
  payload
}
```

### Requirements

- runtime validation;
- capability negotiation;
- sender validation;
- session isolation;
- monotonic task/revision IDs;
- cancellation;
- typed errors;
- no path-bearing asset URLs;
- no arbitrary external navigation;
- no renderer access to shell primitives.

## 7. Preview capability

Concept:

```text
pitch-preview://<session-token>/<asset-token>
```

Properties:

- opaque;
- immutable;
- one asset;
- correct MIME;
- session-scoped;
- no directory listing;
- no traversal;
- revocable;
- expires on document close;
- never encodes Source path.

If direct browser-font preview is selected by P2, use a separate font capability with the same constraints and renderer-process recovery.

## 8. Mac Host

### Composition

Provisional:

```text
NSDocument or document coordinator
+ SwiftUI/AppKit shell
+ WKWebView Studio
+ one restartable XPC render/inspection engine
```

### Native responsibilities

- welcome/recent;
- document windows;
- menus;
- toolbar;
- open/save/import/export panels;
- security-scoped access if sandboxed;
- Finder;
- recovery;
- process restart;
- update/release surface.

### WebKit

- bundled local content;
- no remote page;
- named content world;
- request/reply handler;
- navigation policy;
- custom schemes;
- process termination recovery;
- state rehydration;
- semantic focus bridge.

### Engine

Leading Mac engine:

- CoreText;
- CoreGraphics/Quartz;
- PDF context;
- current branch logic adapted behind Render Service.

XPC is provisional until P2/P3 measure latency and crash containment.

### Distribution

- arm64 only;
- direct Developer ID;
- hardened runtime;
- notarization/stapling;
- minimum OS provisional macOS 14;
- App Sandbox decided by real workflow prototype.

## 9. Linux Host

### Electron configuration

- current supported Electron;
- `app.enableSandbox()` before ready;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- sandboxed renderer;
- strict CSP;
- custom secure/standard schemes;
- no `file://`;
- no remote code;
- navigation/new windows blocked;
- sender validation;
- permission handlers;
- narrow `contextBridge`;
- fuse and ASAR integrity review.

### Processes

```text
Main
├── lifecycle
├── windows
├── documents
├── protocols
├── capabilities
└── sidecar supervision

Preload
└── typed HostBridge only

Renderer
└── shared Studio

Utility / supervisor
└── task transport and health

Native sidecar
├── Source discovery/watch
├── metadata
├── shaping
├── raster/PDF
└── cache
```

### Renderer candidates

- HarfBuzz + FreeType + Cairo/Pango;
- HarfBuzz + FreeType + Skia;
- Rust Fontations/Swash/Cosmic Text class stack where it meets the exact needs;
- Fontkit as metadata/baseline, not accepted rendering truth by default.

### Packaging

Provisional:

- deb;
- rpm;
- optional AppImage testing artifact;
- Flatpak deferred until portal/folder/hot-reload proof.

## 10. Interactive rendering alternatives

See `05_RENDERING_DECISION_GATE.md`.

The architecture must support a Render Profile identifier regardless of the chosen path.

## 11. Study durability alternatives

See `06_STATE_DURABILITY_GATE.md`.

Every alternative must preserve:

- one semantic authority;
- host-native Save;
- crash recovery;
- monotonic revision;
- per-document isolation;
- semantic undo;
- flush barrier.

## 12. Storage

### Portable

User-chosen `.pitchfontstudy`.

### Mac local

- Application Support: bindings, recent metadata, recovery index;
- Caches: render/cache;
- temporary staging;
- optional security bookmarks;
- diagnostics.

### Linux local

- XDG config;
- XDG data;
- XDG cache;
- XDG runtime for sockets where available;
- temporary staging.

### Rules

- caches disposable;
- bindings not in portable Study;
- recovery separate from intentional file;
- no font binaries copied into app storage except explicit bounded ephemeral cache where the chosen renderer requires it;
- logs redact absolute paths by default.

## 13. Multi-document behavior

Each window owns:

- one Study Session;
- one HostBridge session;
- one render task namespace;
- one recovery identity;
- one workspace state.

Opening another Study should create another window on platforms where viable.

No cross-document mutable singleton.

## 14. Source lifecycle

### Discovery

Bounded recursive scan.

### Binding

Host-local.

### Revision

Changed source updates Source Revision.

### Reconcile

If topology changes:

- match exact old Face where possible;
- show added/removed/changed;
- clamp settings;
- preserve unresolved references;
- require confirmation for ambiguity.

### Quarantine

Repeated engine crash/hang can quarantine a Source for the current session.

The user can view details and retry deliberately.

## 15. Export architecture

1. Studio asks shared Handoff planner for intended outputs.
2. Host selects destination.
3. Handoff Builder preflights.
4. Hidden staging directory.
5. Platform Render Service produces visual assets.
6. Shared serializers write human/machine data.
7. Optional Sources copied after permission.
8. Verify manifest/files/checksums.
9. Atomic move into collision-safe final folder.
10. Reveal.
11. Cancel/failure removes staging.

## 16. Cross-platform parity

### Exact

- Study semantics;
- IDs;
- Review states;
- Recipes;
- Comparison Sets;
- Systems;
- Scene geometry;
- Handoff JSON;
- command meaning;
- migration.

### Strongly equivalent

- information architecture;
- stages;
- keyboard intent;
- error model;
- accessibility capability;
- export choices.

### Platform-specific

- window chrome;
- menus/dialogs;
- file permissions;
- installed Catalog;
- renderer pixels;
- package;
- file-manager wording.

### Declared differences

- fitted size;
- line breaks;
- fallback;
- missing support;
- renderer/profile/version.

## 17. Architecture vetoes

Reject any implementation that:

- places arbitrary filesystem access in the web renderer;
- maintains two mutable Study models;
- uses path or PostScript name as portable identity;
- turns Catalog into the document;
- requires pixel equality between platforms;
- deletes the native reference before parity evidence;
- creates many shallow bridge methods mirroring UI controls;
- adds a shared engine rewrite without measured leverage;
- lets an engine crash destroy the document process;
- makes Save depend entirely on a healthy web process at one instant;
- hides the renderer that produced exported proof.
