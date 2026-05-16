---
name: flutter-melos-workspace
description: Apply Melos to Flutter/Dart monorepo projects for workspace orchestration, shared scripts, dependency management, versioning, and CI automation. Use when setting up Melos from scratch, adding/removing packages, defining custom scripts, configuring filters, managing versioning/changelogs, or troubleshooting workspace-level build/test/analyze workflows.
user-invocable: true
---

# Flutter Melos Workspace

## Overview

Melos is a CLI tool for managing Dart/Flutter monorepos with multiple packages.
It orchestrates dependency resolution, script execution, versioning, and changelogs across the workspace.

This skill covers Melos v3+ (latest stable) and Melos v6+/v7+ (with Pub workspace support).

## When to use

- Setting up Melos in an existing or new monorepo.
- Adding/removing packages from the workspace.
- Defining shared scripts (analyze, test, build, format, codegen).
- Configuring package filters and scoping.
- Managing versioning and changelogs (conventional commits).
- CI/CD pipeline integration with Melos.
- Migrating from manual workspace management to Melos.

## Setup workflow

### 1. Install Melos

```bash
dart pub global activate melos
```

Or add as dev dependency in root `pubspec.yaml`:

```yaml
dev_dependencies:
  melos: ^7.0.0
```

### 2. Configuration file

Melos can be configured in two ways:

- **Standalone `melos.yaml`** at repo root (traditional, recommended for visibility).
- **Inline `melos:` key** in root `pubspec.yaml` (compact, used when Pub workspace is also declared).

### 3. Minimal configuration

```yaml
name: my_workspace
packages:
  - apps/*
  - packages/*
```

### 4. Bootstrap

```bash
melos bootstrap
# or shorthand:
melos bs
```

This links local packages and resolves dependencies across the workspace.

**With Pub workspaces (Dart 3.5+ / Melos 7+):** If the root `pubspec.yaml` declares a `workspace:` key, `dart pub get` at root already resolves shared dependencies. Melos bootstrap adds linking and script orchestration on top.

## Configuration reference

### Package filters

Melos commands accept filters to scope execution:

```bash
melos run test --scope="gap_core"          # by name
melos run test --ignore="*_demo_*"         # exclude pattern
melos run test --dir-exists="test"         # only packages with test/ dir
melos run test --depends-on="flutter"      # only packages depending on flutter
melos run test --no-private                # exclude private packages
melos run test --since="main"              # only changed since branch
```

### Scripts

Define reusable commands in `melos.yaml` (or under `melos:` in `pubspec.yaml`):

```yaml
scripts:
  analyze:
    run: dart analyze --fatal-infos
    description: Run static analysis on all packages
    packageFilters:
      dirExists: lib

  test:
    run: flutter test
    description: Run tests in all packages
    packageFilters:
      dirExists: test

  test:selective:
    run: flutter test
    description: Run tests only in changed packages
    packageFilters:
      dirExists: test
      since: main

  format:
    run: dart format --set-exit-if-changed .
    description: Check formatting

  codegen:
    run: dart run build_runner build --delete-conflicting-outputs
    description: Run code generation
    packageFilters:
      dependsOn: build_runner

  clean:
    run: flutter clean
    description: Clean all packages

  deps:graph:
    run: melos list --graph
    description: Show dependency graph

  deps:outdated:
    run: dart pub outdated
    description: Check outdated dependencies
```

### Script execution modes

- **`exec`**: Runs the command in each package directory (default for `run`).
- **`run`**: Runs a single command at workspace root.
- **`packageFilters`**: Scopes which packages the script applies to.
- **`env`**: Inject environment variables.
- **`failFast`**: Stop on first failure (default: true).
- **`concurrency`**: Max parallel executions.

Example with exec and concurrency:

```yaml
scripts:
  test:
    exec: flutter test
    concurrency: 4
    packageFilters:
      dirExists: test
```

### Versioning and changelogs

Melos supports automated versioning via conventional commits:

```yaml
command:
  version:
    message: "chore(release): publish %v"
    includeCommitId: true
    linkToCommits: true
    workspaceChangelog: true
    updateGitTagRefs: true
    branch: main
  bootstrap:
    usePubspecOverrides: true
```

Workflow:

```bash
melos version              # bump versions based on conventional commits
melos version --prerelease # pre-release bump
melos version --graduate   # graduate pre-release to stable
```

### IDE integration

Generate IDE configuration for local package resolution:

```yaml
ide:
  intellij:
    enabled: true
```

## Pub workspace + Melos coexistence (Dart 3.5+)

Modern Dart supports native `workspace:` in `pubspec.yaml`. This provides shared resolution without Melos. When combining both:

1. Root `pubspec.yaml` declares `workspace:` listing all packages.
2. Melos adds orchestration (scripts, filters, versioning) on top.
3. `melos bootstrap` still works and respects the Pub workspace resolution.
4. Individual packages use `resolution: workspace` in their `pubspec.yaml`.

```yaml
# Root pubspec.yaml
name: my_workspace
environment:
  sdk: ^3.5.0

workspace:
  - apps/app_one
  - apps/app_two
  - packages/shared_core

dev_dependencies:
  melos: ^7.0.0

melos:
  name: my_workspace
  packages:
    - apps/*
    - packages/*
  scripts:
    # ... scripts here
```

## Migration checklist (manual workspace -> Melos)

1. Ensure all packages are listed in `packages:` glob patterns.
2. Run `melos bootstrap` and verify all packages link correctly.
3. Replace any manual `flutter pub get` loops with `melos bs`.
4. Move repeated script patterns (analyze, test, format) to `scripts:`.
5. Add `packageFilters` to scope scripts appropriately.
6. If using conventional commits, configure `command.version`.
7. Update CI to use `melos bootstrap` + `melos run <script>`.
8. Verify `melos list` shows all expected packages.
9. Verify `melos run analyze` and `melos run test` pass.

## Common patterns

### Run only affected packages in CI

```yaml
scripts:
  ci:test:
    exec: flutter test
    packageFilters:
      dirExists: test
      since: origin/main
```

### Pre-commit hook integration

```bash
melos run format && melos run analyze
```

### Build runner across workspace

```yaml
scripts:
  codegen:
    exec: dart run build_runner build --delete-conflicting-outputs
    packageFilters:
      dependsOn: build_runner
    concurrency: 1  # avoid file lock conflicts
```

### Custom environment variables

```yaml
scripts:
  build:apk:
    run: flutter build apk --release
    env:
      FLUTTER_BUILD_NUMBER: ${MELOS_PACKAGE_VERSION}
```

## Troubleshooting

- **"Package not found" after adding new package**: Re-run `melos bootstrap`.
- **Circular dependency detected**: Check `melos list --graph` and break the cycle.
- **Script not running in expected packages**: Add `--verbose` flag or check `packageFilters`.
- **Version conflicts**: With Pub workspace, ensure `resolution: workspace` in child packages.
- **Bootstrap fails on CI**: Ensure `melos` is activated globally or use `dart pub global run melos bootstrap`.

## References

- [Melos documentation](https://melos.invertase.dev/)
- [references/melos-best-practices.md](references/melos-best-practices.md)
