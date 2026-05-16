#!/usr/bin/env bash
# Flutter Claude Toolkit — session-start hook
# Injects quick-start context at SessionStart. Output < 50 lines. No network. No dart analyze.

cat <<'CONTEXT'
Flutter Claude Toolkit loaded.

Quick-start (pick the right skill/command for the task):
  New feature end-to-end  → skill: bootstrap-feature
  UI / widget work only   → /seed-ui-context-claude
  Bug fix / refactor      → /seed-fix-refactor-claude
  Write unit tests        → skill: unit-test-claude
  Write widget tests      → skill: generate-widget-tests
  Codegen (@riverpod)     → /build-filter <feature-path>
  Fast lint check         → /flutter-analyze-targeted <feature-path>
  Navigation (GoRouter)   → skill: flutter-go-router
  Melos monorepo          → skill: flutter-melos-workspace
  Maestro screenshots     → skill: maestro-screenshot-flow
  Architecture review     → skill: second-opinion

Riverpod v3 — critical (check before writing any provider):
  ref.watch() → build() only | ref.read() → callbacks only
  FooNotifier → generates fooProvider (NOT fooNotifierProvider)
  Function providers → Ref ref (FooRef removed in v3)
  One field consumed → wrap in .select()
  AsyncValue → always handle data / loading / error (no naked .value!)

Never run full codegen or full analyze — scope to feature path only.
CONTEXT
