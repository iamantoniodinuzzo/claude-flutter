# Audit Domain Layer — Rule Catalog

Each rule has: ID, severity, source doc, detection heuristic, fix hint, and whether
auto-fix is safe (`autofix_safe`). Phase 3 of the skill scans using this catalog.

---

## Dependency isolation rules

### DOMAIN-DEP-01
- **Severity**: error
- **Source**: `rules/patterns/repository-pattern.md`
- **What**: Domain file imports an infrastructure or data-layer package (`cloud_firestore`,
  `http`, `dio`, `firebase_core`, `firebase_auth`, `hive`, `sqflite`, `drift`, or similar).
  The domain layer must be framework-free; it may only import Dart core, `riverpod_annotation`,
  and other domain packages.
- **Heuristic**: in any `.dart` file under `domain/`, find `import 'package:<pkg>/` where
  `<pkg>` is one of: `cloud_firestore`, `firebase_core`, `firebase_auth`, `firebase_storage`,
  `http`, `dio`, `retrofit`, `hive`, `hive_flutter`, `sqflite`, `drift`, `isar`,
  `shared_preferences`. Flag the import line.
- **Fix**: remove the infra import; depend only on domain interfaces/entities. Move the logic
  that requires the infra package to the data layer.
- **autofix_safe**: false (requires moving or restructuring logic)

---

## Exception typing rules

### DOMAIN-FAIL-01
- **Severity**: error
- **Source**: `rules/patterns/exception-handling.md`
- **What**: Domain or application code throws a generic exception (`Exception(...)`,
  `StateError(...)`, `ArgumentError(...)`, `FormatException(...)`) instead of a typed
  exception extending the project's `AppException` hierarchy.
- **Heuristic**: find `throw Exception(`, `throw StateError(`, `throw ArgumentError(`,
  `throw FormatException(`, `throw RangeError(` in files under `domain/` or `application/`.
  Also flag `throw` followed by a string literal as the thrown expression.
- **Fix**: define a concrete exception class extending the feature-level abstract exception
  (which extends `AppException`). Replace the generic throw with the typed exception.
  Place the exception class in `domain/exceptions/<feature>_exceptions.dart`.
- **autofix_safe**: false (exception class must be designed per project naming convention)

---

## Entity purity rules

### DOMAIN-ENT-01
- **Severity**: warning
- **Source**: `rules/patterns/feature-creation.md`
- **What**: Entity or value-object class in `domain/` contains JSON/map serialization
  logic (`fromJson`, `toJson`, `fromMap`, `toMap`, or a constructor/factory accepting
  `Map<String, dynamic>`). Domain entities must stay framework-free; serialization belongs
  in data-layer model classes.
- **Heuristic**: in files under `domain/` whose name does NOT end in `_model.dart`,
  find method or factory declarations matching:
  - `factory .+\.fromJson\(`
  - `factory .+\.fromMap\(`
  - `Map<String, dynamic> toJson\(`
  - `Map<String, dynamic> toMap\(`
  - constructor parameter typed `Map<String, dynamic>`
- **Fix**: extract serialization into a data-layer model class (e.g. `data/models/<name>_model.dart`)
  with a `toEntity()` mapper method that returns the domain entity.
- **autofix_safe**: false (extraction requires adding a new model file and mapper)

---

## UI string rules

### DOMAIN-STR-01
- **Severity**: info
- **Source**: `rules/patterns/no-ui-strings-outside-ui.md`
- **What**: Hardcoded user-facing string literal (≥ 20 chars, > 3 words) in a domain file —
  strings intended for display should live in the presentation layer or be expressed as
  typed exception messages via `.hardcoded`.
- **Heuristic**: in `.dart` files under `domain/`, find string literals matching
  `'[A-Za-z ]{20,}'` or `"[A-Za-z ]{20,}"` that are not in `//` comments and are not
  assigned to identifiers named `url`, `path`, `key`, `tag`, `code`, `name`, `id`.
- **Fix**: replace the raw string with a typed exception `message` field (using `.hardcoded`
  extension) or move user-visible copy to a presentation-layer `AppLocalizations` key.
- **autofix_safe**: false (typed enum / l10n design is project-specific)

---

## Adding new rules

1. Add a rule block here following the schema above.
2. Update `SKILL.md` rule count in the usage examples if desired.
3. No other files need changing — Phase 3 reads this catalog at runtime.
