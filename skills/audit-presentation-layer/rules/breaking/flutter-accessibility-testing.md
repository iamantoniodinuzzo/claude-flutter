<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Flutter accessibility & testing (baseline) – semantics + test layers

**Version**: Flutter 3.27+ / 3.32+ / 3.35+  
**Source**: split from `flutter.md` to support smaller, task-focused seeds.

Use this file when you need a baseline for **accessibility** and a minimal,
practical **testing strategy**.

---

## Accessibility

### Required patterns

```dart
Semantics(
  label: 'Close button',
  button: true,
  child: IconButton(
    onPressed: () {},
    icon: const Icon(Icons.close),
  ),
);

// Exclude decorative elements
ExcludeSemantics(
  child: DecorativeImage(),
);
```

### Requirements (baseline)

- WCAG AA contrast: 4.5:1 for text
- Scalable text support
- Keyboard navigation (web/desktop)
- Test with TalkBack (Android) / VoiceOver (iOS)

---

## Testing strategy (three-tier)

```dart
// 1. Unit Tests - business logic
test('counter increments', () {
  final counter = Counter();
  counter.increment();
  expect(counter.value, 1);
});

// 2. Widget Tests - UI components
testWidgets('button displays text', (tester) async {
  await tester.pumpWidget(MyButton());
  expect(find.text('Click'), findsOneWidget);
});

// 3. Integration Tests - end-to-end (device)
```

---

## Practical checklist

- [ ] Add semantic labels to interactive widgets (buttons, toggles, icons)
- [ ] Exclude semantics for decorative UI
- [ ] Prefer unit tests for logic, widget tests for UI behavior, integration for flows
