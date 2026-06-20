# Graph Report - .  (2026-06-20)

## Corpus Check
- 76 files · ~53,730 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 270 nodes · 298 edges · 28 communities (19 shown, 9 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Unit Test Patterns|Unit Test Patterns]]
- [[_COMMUNITY_Feature Bootstrapping Workflow|Feature Bootstrapping Workflow]]
- [[_COMMUNITY_Sentry Integration & Error Monitoring|Sentry Integration & Error Monitoring]]
- [[_COMMUNITY_Toolkit Architecture & Documentation|Toolkit Architecture & Documentation]]
- [[_COMMUNITY_GoRouter & Widget Testing|GoRouter & Widget Testing]]
- [[_COMMUNITY_Riverpod Streams & Async API|Riverpod Streams & Async API]]
- [[_COMMUNITY_Flutter Widget Performance|Flutter Widget Performance]]
- [[_COMMUNITY_Riverpod-Flutter Audit Rules|Riverpod-Flutter Audit Rules]]
- [[_COMMUNITY_Exception Handling & Clean Architecture|Exception Handling & Clean Architecture]]
- [[_COMMUNITY_Robot Testing Pattern|Robot Testing Pattern]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Sentry Wiring & Privacy|Sentry Wiring & Privacy]]
- [[_COMMUNITY_Accessibility Testing|Accessibility Testing]]
- [[_COMMUNITY_Maestro Screenshot Flow|Maestro Screenshot Flow]]
- [[_COMMUNITY_Async Command API & Logging|Async Command API & Logging]]
- [[_COMMUNITY_GoRouter Navigation Patterns|GoRouter Navigation Patterns]]
- [[_COMMUNITY_Build Filter & CI Tooling|Build Filter & CI Tooling]]
- [[_COMMUNITY_Melos Workspace Setup|Melos Workspace Setup]]
- [[_COMMUNITY_Second Opinion Skill|Second Opinion Skill]]
- [[_COMMUNITY_Targeted Flutter Analysis|Targeted Flutter Analysis]]
- [[_COMMUNITY_Repository Pattern|Repository Pattern]]
- [[_COMMUNITY_Riverpod Rebuild Optimization|Riverpod Rebuild Optimization]]
- [[_COMMUNITY_AutoDispose Lifecycle|AutoDispose Lifecycle]]
- [[_COMMUNITY_Gemini Integration Notes|Gemini Integration Notes]]
- [[_COMMUNITY_Bug Issue Template|Bug Issue Template]]
- [[_COMMUNITY_Issue Config Template|Issue Config Template]]
- [[_COMMUNITY_Feature Issue Template|Feature Issue Template]]
- [[_COMMUNITY_Task Issue Template|Task Issue Template]]

## God Nodes (most connected - your core abstractions)
1. `unit-test Skill` - 15 edges
2. `sentry-init Skill` - 12 edges
3. `ARCHITECTURE.md — Repo Structure` - 8 edges
4. `audit-presentation-layer Rule CATALOG.md` - 8 edges
5. `audit-presentation-layer SKILL.md` - 7 edges
6. `Flutter Widgets & Performance Rules` - 7 edges
7. `Riverpod Core Reference (Principles, Provider Selection, ref API)` - 7 edges
8. `generate-widget-tests Skill (Robot Testing Pattern for Flutter)` - 7 edges
9. `GoRouter Observer and Dio Breadcrumbs Reference` - 7 edges
10. `Release Uploads — Source Maps and Debug Symbols Reference` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Riverpod Widget Audit Rules RIV-WIDGET-01 to 04` --semantically_similar_to--> `Riverpod v3 Provider Rules`  [INFERRED] [semantically similar]
  skills/audit-presentation-layer/rules/CATALOG.md → ai_docs/FLUTTER_RULES.md
- `Robot Testing Audit Rules ROBOT-01 to 05` --semantically_similar_to--> `Robot Testing Pattern`  [INFERRED] [semantically similar]
  skills/audit-presentation-layer/rules/CATALOG.md → ai_docs/FLUTTER_RULES.md
- `GoRouter Audit Rules ROUTER-01 to 02` --semantically_similar_to--> `GoRouter Navigation Rules`  [INFERRED] [semantically similar]
  skills/audit-presentation-layer/rules/CATALOG.md → ai_docs/FLUTTER_RULES.md
- `CHANGELOG` --references--> `skill-reviewer Agent`  [EXTRACTED]
  CHANGELOG.md → .claude/agents/skill-reviewer.md
- `CHANGELOG` --references--> `audit-presentation-layer SKILL.md`  [EXTRACTED]
  CHANGELOG.md → skills/audit-presentation-layer/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flutter Toolkit Core — Skills Agents and Rule Docs** — audit_presentation_layer_skill_md, agents_riverpod_reviewer, audit_presentation_layer_catalog, concept_riverpod_v3_rules, concept_robot_testing_pattern, concept_gorouter_rules [INFERRED 0.85]
- **Skill Release Pipeline — Reviewer README ARCHITECTURE** — agents_skill_reviewer, claude_flutter_readme, ai_docs_architecture, ai_docs_contributing [EXTRACTED 0.95]
- **Git Flow Lifecycle — start commit publish finish sync** — ai_docs_git_workflow, concept_git_flow_aliases, concept_conventional_commits, ai_docs_contributing [EXTRACTED 0.95]
- **Riverpod Rebuild Minimization Pattern (.select, inline Consumer, computed providers)** — patterns_riverpod_rebuild_select, patterns_riverpod_rebuild_inline_consumer, patterns_riverpod_rebuild_computed_providers, breaking_riverpod_flutter_select_async [INFERRED 0.85]
- **Flutter Widget Testability via Keys and Robot Pattern** — patterns_robot_testing_key_based_finders, patterns_robot_testing_static_const_keys, patterns_widget_classes_keys_for_testability, patterns_robot_testing_pump_and_settle [INFERRED 0.85]
- **Clean Architecture: No UI Concerns in Domain/Data/Application** — patterns_no_ui_strings_outside_ui, patterns_no_ui_strings_domain_enum_no_display, references_breaking_dart_language_no_ui_in_domain_enums, bootstrap_feature_clean_arch_layers [INFERRED 0.85]
- **Clean Architecture Layer Boundaries (domain exceptions, no leaky abstractions, typed reasons, no UI strings)** — feature_creation_4tier_clean_architecture, exception_handling_domain_layer_ownership, no_ui_strings_typed_reasons_over_strings, feature_creation_repository_no_leaky_abstractions [EXTRACTED 0.95]
- **Riverpod Rebuild Minimization Patterns (select/record-select/inline Consumer/computed providers)** — riverpod_rebuild_optimization_select_subset, riverpod_rebuild_optimization_select_dart_records, riverpod_rebuild_optimization_inline_consumer_lists, riverpod_rebuild_optimization_computed_providers [EXTRACTED 0.95]
- **Widget Key Testability Contract (keys in source → key-based finders in Robot tests)** — widget_classes_testability_keys, generate_widget_tests_skill_key_based_finders, generate_widget_tests_skill_robot_pattern [INFERRED 0.85]
- **sentry-init Sequential Phase Pipeline (0 through 6)** — sentry_init_phase0_intake, sentry_init_phase1_deps, sentry_init_phase2_main, sentry_init_phase3_gorouter, sentry_init_phase4_riverpod, sentry_init_phase5_platform, sentry_init_phase6_release [EXTRACTED 1.00]
- **Riverpod Provider Override Strategies in Unit Tests** — unit_test_stream_override_strategy_a, unit_test_stream_override_strategy_b, unit_test_override_with_value_sync, unit_test_notifier_strategy_a, unit_test_notifier_strategy_b [INFERRED 0.85]
- **Sentry Error Capture Pipeline (Decorator + Observer + Global Hooks)** — sentry_init_sentry_logger_service, sentry_init_async_error_logger, sentry_init_branch_a_decorator, sentry_init_branch_b_observer [INFERRED 0.85]

## Communities (28 total, 9 thin omitted)

### Community 0 - "Unit Test Patterns"
Cohesion: 0.07
Nodes (36): AsyncLoading Propagation in whenData Chains, Pattern: Testing Computed AsyncValue Providers, container.pump() vs pumpEventQueue() for Riverpod Scheduler, Unit Test Phase 7 — Coverage Strategy (target 80%), Deterministic Test IDs (DateTime.utc, key-based IDs), Direct container.read() State Assertion for AsyncNotifier, Unit Test Phase 2 — Discovery, Pattern: Fixture Helper Functions (+28 more)

### Community 1 - "Feature Bootstrapping Workflow"
Cohesion: 0.07
Nodes (34): Clean Architecture Layers (domain/data/application/presentation), Phase 1: Socratic Intake (Scope, Name, Purpose, Design Probes), Phase 2: Scaffold Clean Architecture Directories, Phase 3: Load Architectural Context References, Phase 4: Architecture Contract (Domain/Data/Application/Presentation), Bootstrap Feature Skill (Clean Architecture Scaffolding), Sub-Feature is UI-Only (Domain/Data from Parent Feature), Side Effects in Flutter – Complete Guide (+26 more)

### Community 2 - "Sentry Integration & Error Monitoring"
Cohesion: 0.08
Nodes (32): Sentry Init Approach 1 — Hybrid (zoneMismatch risk on web), Sentry Init Approach 2 — Everything Inside appRunner, Sentry Init Approach 3 — No appRunner (Recommended), AsyncErrorLogger ProviderObserver, BetterFeedback Conditional Widget Tree Placement, sentry-init Branch A — LoggerService Decorator, sentry-init Branch B — Standalone SentryProviderObserver, CanvasKit Renderer Detection Utility (isCanvasKitRenderer, conditional export) (+24 more)

### Community 3 - "Toolkit Architecture & Documentation"
Cohesion: 0.10
Nodes (30): prompt-engineer Agent, riverpod-reviewer Agent, skill-reviewer Agent, ARCHITECTURE.md — Repo Structure, CONTRIBUTING.md — Adding Skills and Version Bump, FLUTTER_RULES.md — Riverpod v3 GoRouter Testing Rules, GIT_WORKFLOW.md — Git Aliases and Lifecycle, HOW_TO_CREATE_MARKETPLACE.md — Plugin Marketplace Guide (+22 more)

### Community 4 - "GoRouter & Widget Testing"
Cohesion: 0.14
Nodes (16): flutter-go-router Skill (GoRouter navigation guide), addPostFrameCallback for go() Inside ref.listen, StatefulShellRoute for Persistent Tab State (independent stacks per branch), URL-Driven Tab/Query-Param State (GoRouterState as source of truth), Dialog Test Patterns (viewport size, button trigger not addPostFrameCallback), generate-widget-tests Skill (Robot Testing Pattern for Flutter), Given-When-Then Test Structure ('given X when Y then Z' naming), Key-Based Finders Rule (never find.text() or find.byTooltip()) (+8 more)

### Community 5 - "Riverpod Streams & Async API"
Cohesion: 0.15
Nodes (15): Command vs Query Separation (AsyncNotifier), Anti-pattern: Inline StreamProvider Creation Inside Another Provider, select() for Granular Rebuilds (performance), StreamNotifier (stream + actions), Stream Provider (Riverpod read-only), build-optimized-widget Skill (create widget with all patterns applied), Correct Side Effect Locations (callbacks/lifecycle/listeners), Side Effects in build() Anti-pattern (+7 more)

### Community 6 - "Flutter Widget Performance"
Cohesion: 0.15
Nodes (13): Flutter Widgets & Performance Rules, Card clipBehavior: Clip.antiAlias for Ripple Containment, Const Constructors for Rebuild Prevention, InkWell Over GestureDetector (Material Tap Targets), Keep build() Lightweight (No Heavy Work in Build), ListView.builder for Large Lists, Prefer Riverpod Notifiers Over setState(), Selective MediaQuery Subscriptions (paddingOf/sizeOf) (+5 more)

### Community 7 - "Riverpod-Flutter Audit Rules"
Cohesion: 0.17
Nodes (12): AsyncValue.when Flags (skipLoadingOnReload, skipError), Riverpod Flutter Widget APIs & UI Patterns (Audit Rules), ConsumerWidget vs ConsumerStatefulWidget, ref.listen for UI Side Effects (Dialogs, Navigation, Snackbars), ref.listenManual for Outside-build Listening, selectAsync for Async Provider Field Filtering, Computed Providers for Expensive Derivations, Extract Form State to Parameterized Notifier (>4 setState Fields) (+4 more)

### Community 8 - "Exception Handling & Clean Architecture"
Cohesion: 0.20
Nodes (11): Domain Layer Exception Ownership (exceptions in domain/, never data/ or presentation/), Exception Hierarchy (AppException → FeatureException → Concrete), Typed Exceptions for Auth/Guard Conditions, 4-Tier Clean Architecture (domain/data/application/presentation), No Leaky Abstractions in Repository (domain entities, no infrastructure types), Application Service Layer Pattern (abstract interface + Impl), Domain Enums Without UI Display Labels (presentation-layer extension instead), Typed Reasons Over Strings (enum/sealed class, not String reason) (+3 more)

### Community 9 - "Robot Testing Pattern"
Cohesion: 0.22
Nodes (10): Robot Testing Pattern – Audit Rules, Use ElevatedButton + tester.tap() to Trigger Dialogs in Tests (ROBOT-05), Key-Based Finders in Robot Classes (ROBOT-01, ROBOT-02), Never pumpAndSettle with Infinite Animation (ROBOT-03), Static Const Key Fields on Public Widgets (ROBOT-04), Viewport Setup with Mandatory addTearDown (ROBOT-06), Composition Over Build Helpers (SRP, DRY, Dumb Widgets), Static Const Keys for Test Locatability (+2 more)

### Community 10 - "Package Metadata"
Cohesion: 0.25
Nodes (7): author, description, homepage, keywords, license, name, version

### Community 11 - "Sentry Wiring & Privacy"
Cohesion: 0.29
Nodes (8): Sentry beforeSend Event Filtering, Web CORS tracePropagationTargets.clear() Workaround, sentry_dio HTTP Breadcrumbs (addSentry()), Sentry GDPR/PII Defaults (attachScreenshot off, sendDefaultPii off), GoRouter Observer and Dio Breadcrumbs Reference, In-App Frame Filtering (considerInAppFramesByDefault), SentryNavigatorObserver GoRouter Placement, sentry-init Phase 3 — Wire GoRouter Observer

### Community 12 - "Accessibility Testing"
Cohesion: 0.29
Nodes (7): Semantics Widget (Flutter Accessibility), Flutter Accessibility & Testing Baseline, Three-Tier Testing Strategy (Unit/Widget/Integration), WCAG AA Contrast Requirement (4.5:1), Web Interaction Affordances in Flutter, FocusableActionDetector for Hover + Keyboard Affordance, MouseRegion + SystemMouseCursors.click for Web Tap Targets

### Community 13 - "Maestro Screenshot Flow"
Cohesion: 0.40
Nodes (6): Maestro ADB Port 7001 Fix Pattern, Maestro Cold-Start Wait Pattern (extendedWaitUntil), Maestro Suite config.yaml, Maestro Master Flow (00_all_flows.yaml), Maestro Selector Rules (regex escaping, accessibility limits, tapOn point), Maestro Screenshot Flow Skill

### Community 14 - "Async Command API & Logging"
Cohesion: 0.40
Nodes (5): AsyncValue.guard() for Single-Step Mutations, Single Error Channel Pattern (AsyncNotifier state only), AsyncErrorLogger Rule (never log in async providers), Log Levels (t/d/i/w/e/f), Structured Logging Standard [feature][layer] operation – key=value

### Community 15 - "GoRouter Navigation Patterns"
Cohesion: 0.40
Nodes (5): AppBar Back Button Must Use context.goNamed (URL Sync), GoRouter Navigation Conventions, context.go vs context.push URL Behavior (go_router v11.1.2+), Nested Routes in StatefulShellBranch (Relative Paths), Consolidate Multiple Scaffolds Into Single Outer Scaffold

### Community 16 - "Build Filter & CI Tooling"
Cohesion: 0.50
Nodes (4): build-filter Skill (targeted build_runner via --build-filter), No --delete-conflicting-outputs with --build-filter, Melos concurrency:1 for build_runner (avoid file lock failures), Melos --since Filter for CI (run only affected package tests)

### Community 17 - "Melos Workspace Setup"
Cohesion: 0.67
Nodes (3): flutter-melos-workspace Skill (Melos monorepo orchestration), Pub Workspace + Melos Coexistence (Dart 3.5+), Melos Best Practices

### Community 18 - "Second Opinion Skill"
Cohesion: 0.67
Nodes (3): Gemini Consultant Subagent, Flutter/Riverpod Architecture Checks, Second Opinion Skill

## Knowledge Gaps
- **94 isolated node(s):** `name`, `version`, `description`, `keywords`, `author` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `description` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Unit Test Patterns` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Feature Bootstrapping Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._
- **Should `Sentry Integration & Error Monitoring` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._
- **Should `Toolkit Architecture & Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Should `GoRouter & Widget Testing` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._