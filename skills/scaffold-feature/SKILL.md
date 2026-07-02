---
name: scaffold-feature
description: Scaffold a new Flutter feature respecting clean architecture (feature-first), repository pattern with dependency inversion, Riverpod v3 DI, go_router navigation, structured logging, and explicit exception handling. Use when the user says they are starting a new feature, scaffolding feature folders, or kicking off feature implementation. Does NOT handle git, issues, or branches — those stay manual.
user-invocable: true
---

## Phase 1 — Socratic intake

Ask the user in **one message** (do not proceed until all answers are received):

1. **Scope**: Top-level feature or sub-feature of an existing parent?
   - If sub-feature: which parent? (verify `lib/src/features/<parent>/` exists on disk)
2. **Name**: Short `snake_case` name for the feature.
3. **Purpose**: One-line description of what this feature does.
4. **Design probes** (tailor to the description):
   - What data sources does it touch? (Firestore / REST / local DB / none)
   - What is the navigation entry point? (deep link / tab / modal / nested route)
   - What is the primary state shape? (list / single entity / form / real-time stream)
   - What failures can the repository surface? (e.g. not-found, permission-denied, network)

Wait for the user's full answers before proceeding.

---

## Phase 2 — Scaffold clean-architecture directories

Use the `Write` tool with empty `.gitkeep` content to create parent directories implicitly.

### Top-level feature → `lib/src/features/<name>/`

```
lib/src/features/<name>/domain/entities/.gitkeep
lib/src/features/<name>/domain/repositories/.gitkeep
lib/src/features/<name>/domain/value_objects/.gitkeep
lib/src/features/<name>/domain/failures/.gitkeep
lib/src/features/<name>/data/datasources/.gitkeep
lib/src/features/<name>/data/models/.gitkeep
lib/src/features/<name>/data/repositories/.gitkeep
lib/src/features/<name>/data/mappers/.gitkeep
lib/src/features/<name>/application/providers/.gitkeep
lib/src/features/<name>/application/notifiers/.gitkeep
lib/src/features/<name>/application/states/.gitkeep
lib/src/features/<name>/presentation/screens/.gitkeep
lib/src/features/<name>/presentation/widgets/.gitkeep
lib/src/features/<name>/presentation/controllers/.gitkeep
```

### Sub-feature → `lib/src/features/<parent>/<name>/`

Sub-features are UI-only. Domain, data, and application layers are provided by the parent feature.

```
lib/src/features/<parent>/<name>/presentation/screens/.gitkeep
lib/src/features/<parent>/<name>/presentation/widgets/.gitkeep
lib/src/features/<parent>/<name>/presentation/controllers/.gitkeep
```

---

## Phase 3 — Load architectural context

Read the following files **in parallel** from inside this skill's own `references/` folder.

### Mandatory (always load)

**Breaking changes — language and async safety**
- `skills/scaffold-feature/references/breaking/dart-language.md`
- `skills/scaffold-feature/references/breaking/dart-async-errors.md`
- `skills/scaffold-feature/references/breaking/riverpod-core.md`
- `skills/scaffold-feature/references/breaking/riverpod-async-mutations.md`
- `skills/scaffold-feature/references/breaking/riverpod-flutter.md`

**Architecture patterns**
- `skills/scaffold-feature/references/patterns/feature-creation.md`
- `skills/scaffold-feature/references/patterns/repository-pattern.md`
- `skills/scaffold-feature/references/patterns/exception-handling.md`
- `skills/scaffold-feature/references/patterns/go-router-navigation-conventions.md`
- `skills/scaffold-feature/references/patterns/async-notifier-command-api.md`
- `skills/scaffold-feature/references/patterns/riverpod-rebuild-optimization.md`
- `skills/scaffold-feature/references/patterns/no-ui-strings-outside-ui.md`
- `skills/scaffold-feature/references/patterns/widget-classes-no-build-helpers.md`
- `skills/scaffold-feature/references/patterns/flutter-side-effects.md`

**Logging standard**
- `skills/scaffold-feature/references/logging.md`

### Conditional (load only when Phase 1 answer matches)

| Condition | File |
|---|---|
| Primary state shape is real-time stream | `skills/scaffold-feature/references/breaking/riverpod-streams-lifecycle.md` |

Internalize rules silently — do not echo back unless the user explicitly asks.

---

## Phase 4 — Architecture contract

Print a compact contract derived from Phase 1 answers + the loaded references.
Use this template, filling in every `<…>` from the intake answers:

```
Feature: <name>  (<top-level> | <sub-feature of parent>)

Domain
  - Entities:           <e.g. Order, OrderItem>
  - Repository iface:   <Name>Repository
  - Failures:           <e.g. OrderFailure.notFound, OrderFailure.permissionDenied>

Data
  - Source:             <Firestore | REST endpoint | SQLite | none>
  - Model:              <Name>Model  →  toEntity() / fromJson()
  - Repo impl:          <Name>RepositoryImpl maps DataException → DomainFailure

Application
  - Provider:           <feature>Provider  (extends Notifier<<State>>)
  - State:              <AsyncValue<T> | record | sealed class>
  - Side effects:       command pattern — mutation methods return Future<void>

Presentation
  - Screen:             <Feature>Screen  (ConsumerWidget)
  - Watches:            ref.watch(<provider>.select(…))  — one .select() per field read
  - Navigation:         context.goNamed('<routeName>')  (never push for deep-linkable routes)

Logging
  - Logger naming:      Logger('<feature>.domain'), Logger('<feature>.data'),
                        Logger('<feature>.application'), Logger('<feature>.presentation')
  - Async errors:       AsyncErrorLogger handles them — no manual try/catch in async providers

GoRouter notes (critical for web / deep-link targets)
  - push() does NOT update browser URL in go_router v11.1.2+; use go/goNamed always
  - AppBar default back button does not update GoRouter URL; override leading with
    BackButton → context.goNamed(parentRoute) when query params or path segments must clear
  - Multiple Scaffolds → consolidate into one outer Scaffold for unified back-button override
```

Ask the user to confirm or correct the contract before moving to implementation.

---

## Phase 5 — Closing summary

```
✅ Scaffolded:          lib/src/features/<[parent/]name>/
✅ Architecture loaded: 15 reference files (breaking + patterns + logging)
✅ Contract confirmed above — ready to implement

Next manual steps (not handled by this skill):
  - gh issue create …                        (if issue not yet created)
  - git start feature <n>_<name>             (creates feature/<n>_<name> from develop)
  - Implement layers: domain → data → application → presentation
  - /build-filter <path>                     (after adding @riverpod / @JsonSerializable)
  - /unit-test                               (domain + application layer tests)
  - gh issue close <N>                       (GitHub does NOT auto-close on PR merge)
```
