<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
### Replace `Container` with Nested Widgets

---

### 1. Core idea

`Container` combines **painting**, **positioning**, and **sizing** in a single widget, but:

- it **does not have a `const` constructor**;
- it often hides what you are really doing (padding? alignment? decoration? size?).

Prefer composing **smaller dedicated widgets** (that *do* have `const` constructors) instead:

- `Padding`
- `Align` / `Center`
- `SizedBox`
- `DecoratedBox`
- `ConstrainedBox`

This improves const-friendliness, performance, readability, and reusability.

---

### 2. Before / after

**Anti-pattern – monolithic `Container`:**

```dart
Container(
  padding: const EdgeInsets.all(16),
  alignment: Alignment.center,
  width: 200,
  decoration: BoxDecoration(
    color: Colors.blue,
    borderRadius: BorderRadius.circular(12),
  ),
  child: const Text('Title'),
)
```

**Preferred – nested widgets with const constructors:**

```dart
const SizedBox(
  width: 200,
  child: Padding(
    padding: EdgeInsets.all(16),
    child: DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.blue,
        borderRadius: BorderRadius.all(Radius.circular(12)),
      ),
      child: Align(
        alignment: Alignment.center,
        child: Text('Title'),
      ),
    ),
  ),
)
```

---

### 3. Practical guidelines

- **Default rule**: do **not** use `Container` for new code unless you truly need several of its features at once and `const` is not important.
- Use `SizedBox`/`ConstrainedBox` for width/height.
- Use `Padding` for spacing.
- Use `DecoratedBox` for background, border, radius.
- Use `Align` / `Center` for alignment.
- Use project-specific widgets (`AppCard`, `AppSection`) that internally use these building blocks.

Use `Container` mainly for quick prototypes or cases where constness and readability are not affected.
