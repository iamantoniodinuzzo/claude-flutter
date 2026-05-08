---
name: build-optimized-widget
description: Create a Flutter widget already optimized by applying structure, side-effect, seed-rule, and rebuild-optimization patterns (Riverpod .select(), inline Consumer, computed providers). Invoke whenever writing a new widget.
user-invocable: true
---

Create an optimized Flutter widget from a description. All patterns are loaded
and applied proactively — no audit step after the fact.

## Source of truth

`ai_toolkit/commands/build-optimized-widget.md`

## Steps

1. **Read** `ai_toolkit/commands/build-optimized-widget.md` in full.

2. **Read the required pattern files in parallel:**
   - `ai_toolkit/patterns/widget-classes-no-build-helpers.md`
   - `ai_toolkit/patterns/flutter-side-effects.md`
   - `ai_toolkit/patterns/replace-container-nested-widgets.md`
   - `ai_toolkit/patterns/riverpod-rebuild-optimization.md`
   - `ai_toolkit/breaking/riverpod-flutter.md`

3. **Read conditional files** based on what the user describes:
   - Form with text inputs → `ai_toolkit/patterns/text-field-validation.md`
   - Non-trivial layout → `ai_toolkit/patterns/flutter-constraints-layout.md`
   - UI controls → Firestore writes → `ai_toolkit/patterns/firestore-write-throttle-ui.md`
   - Navigation / back-button → `ai_toolkit/patterns/go-router-navigation-conventions.md`

4. **Apply the pre-output checklist** from `build-optimized-widget.md` silently
   before emitting any code. Do not ask the user to confirm each item.

5. **Produce the widget.** Add inline comments only where the choice is
   non-obvious (e.g., why a `Consumer` is inlined, why a computed provider is
   used). Do not annotate self-evident code.

## Usage examples

- `/build-optimized-widget ConsumerWidget bookings list with per-item selection`
- `/build-optimized-widget form widget with speed field and departure time, save/cancel actions`
- `/build-optimized-widget panel that shows async validation result with loading/error/success states`

## Notes

- Paths are relative to the repo root — always resolve from there.
- Internalize patterns silently; do not echo rule lists back to the user.
- If the widget description is ambiguous, ask one focused clarifying question
  before reading any files.
