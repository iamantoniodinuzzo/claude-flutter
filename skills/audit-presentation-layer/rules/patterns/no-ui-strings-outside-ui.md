<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
## No user-facing strings outside UI (Flutter clean architecture)

Use this guide when you're tempted to put **messages**, **labels**, or
**localized copy** inside `domain/`, `data/`, or `application/`.

### Goal

Keep i18n/localization and copy **only** in the UI layer, while still allowing
services/repositories to explain *what happened* in a structured way.

---

### 1) Rule of thumb by layer

- **presentation/**: may contain user-facing strings (eventually localized).
- **application/**: must NOT contain user-facing copy. Return types, enums, or domain exceptions.
- **domain/**: no UI copy. Prefer sealed types/enums/value objects.
- **data/**: no UI copy. Translate infrastructure errors to domain exceptions or typed failures.

---

### 2) Prefer typed reasons over strings

Instead of returning a `String reason`, return a typed discriminated value:

- `enum DeleteAccountBlockReason { notAuthenticated, adminCannotSelfDelete, ... }`
- or a sealed class (when you need payloads).

Then the UI maps the reason to localized text.

**Why this is better:**

- avoids needing `BuildContext` in services
- makes logic testable (assert the enum, not the text)
- reduces churn when copy changes

---

### 2.1) Domain enums: no display labels (map them in presentation)

When you create an `enum` in the **domain layer**, do **not** add UI-oriented
properties/methods like `displayLabel`, `label()`, `title`, `IconData`, or
anything requiring `BuildContext` or UI copy.

Instead, keep the domain enum as a **stable, typed value** and create an
**extension in the presentation layer** that translates it to a user-facing string.

Notes:

- OK for domain enums to include **serialization helpers** (e.g. `fromString`, `toStringValue`).
- Put the mapping extension close to the UI that uses it.

---

### 3) Exceptions vs typed failures

- **Exceptions** — "operation failed" with stack + diagnostics.
- **Typed failures (ADT/enum)** — "operation blocked/invalid state" where the UI needs a stable reason code.

Common hybrid:

- "blocked" → return typed reason
- "failed" → throw exception
