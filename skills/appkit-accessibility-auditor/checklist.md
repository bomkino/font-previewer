# Font Previewer AppKit accessibility audit

Audit target: `app/macos/FontPreviewerHost.swift` and the shared Studio rendered by WKWebView.

## Findings

### P0 — Blocker

No static-code blocker remains. This is not an attended VoiceOver pass.

### P1 — High

- **Modal focus escaped into the background.** The New Study dialog now traps Tab and Shift-Tab, closes on Escape, and restores focus to the invoking control or workspace heading.
- **Global candidate shortcuts overrode standard controls.** Unmodified Space and arrow shortcuts now stand down whenever a link, button, form control, radio, or disclosure summary owns focus.
- **Repeated icon-only actions had duplicate names.** Contact-sheet review and comparison reorder/remove controls now include the visible Candidate identity; blind comparisons retain anonymized names.

### P2 — Medium / low

- The native WKWebView container now exposes a concise Studio label and help string, and becomes first responder after navigation.
- Decorative tray glyphs and the outbound arrow are hidden from accessibility; review state remains explicit text.
- Dynamic task, error, recovery, and selection behavior still needs an attended announcement-quality check.

## Automated checks

- Every `button`, `input`, `select`, and `textarea` has a computed name.
- IDs are unique; one main workspace is exposed at a time.
- Stage changes and reload recovery move focus to `#workspace-heading`.
- A displayed WKWebView run verifies the bounded bridge, menu paths, semantic counts, and recovery focus.

## Manual test checklist

### VoiceOver

1. Start VoiceOver, launch Font Previewer, and navigate the title bar, workflow stages, Candidate navigator, workspace, Inspector, and comparison tray.
2. Confirm each region and control has one concise name; review state and selected state are announced without relying on color or glyphs.
3. Open New Study. Confirm VoiceOver stays inside the dialog, reads its heading and description, and returns to the invoking control after Cancel or Escape.
4. Change Candidate, stage, preflight state, and recovery state. Confirm updates are understandable and not announced repeatedly.

Expected: core review, compare, System, save, and Handoff-preflight paths are operable and comprehensible without sight.

### Keyboard

1. Enable full keyboard access. Traverse with Tab and Shift-Tab; activate controls with Space or Return.
2. Focus buttons, radio inputs, checkboxes, selects, and disclosures. Confirm candidate shortcuts do not steal their arrow or Space behavior.
3. From non-interactive workspace context, confirm 0–3 mark review state, arrows change Candidate, and Space toggles the comparison tray.
4. Open New Study, wrap through its first and last controls, close with Escape, and confirm focus restoration.

Expected: no dead ends, background modal focus, or shortcut collisions.

### Voice Control and Switch Control

1. Show names/numbers and invoke review, reorder, remove, and stage actions.
2. Confirm repeated controls have distinct Candidate-qualified names and blind mode never reveals identity.
3. Scan through the New Study dialog and return to the underlying workflow after closing it.

Expected: controls are uniquely targetable in logical order.

## Regression risk

Low. Changes are localized to focus routing, accessible names, decorative semantics, and WKWebView container metadata. Pointer behavior and Study-domain transitions are unchanged. Verify WKWebView does not collapse web descendants beneath the new container label during the attended VoiceOver pass.
