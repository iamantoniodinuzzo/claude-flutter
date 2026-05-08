# Melos Best Practices

## Workspace organization

- Keep glob patterns in `packages:` broad (`apps/*`, `packages/*`) so new packages are picked up automatically.
- Use `ignore:` to explicitly exclude packages that should not participate (e.g., deprecated or WIP packages).
- Maintain a flat structure: avoid deeply nested package directories.

## Script design

- Name scripts with namespaces: `test`, `test:selective`, `test:coverage` for discoverability.
- Always add `description:` to scripts for `melos run` help output.
- Use `packageFilters.dirExists` to skip packages that don't apply (e.g., skip `test` script for packages without `test/` dir).
- Use `packageFilters.dependsOn` to target packages that use specific dependencies (e.g., `build_runner` for codegen).
- Set `concurrency: 1` for scripts that touch shared resources (file locks, emulators).
- Use `failFast: false` in CI when you want to see all failures, not just the first.

## Dependency management

- Prefer shared version constraints in root `pubspec.yaml` when using Pub workspaces.
- Use `melos list --graph` regularly to visualize and validate the dependency graph.
- Avoid circular dependencies between packages — Melos will detect and report them.
- Pin versions in root, use `any` or `workspace` resolution in child packages for internal deps.

## Versioning strategy

- Adopt conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`, `build:`).
- Use `melos version` for automated semver bumps and changelog generation.
- Configure `command.version.branch` to restrict versioning to specific branches.
- Use `workspaceChangelog: true` to generate a unified changelog at root.
- Tag releases with `melos version` — it creates git tags automatically.

## CI/CD integration

- Cache `~/.pub-cache` and `.dart_tool/` directories.
- Run `melos bootstrap` as the first CI step.
- Use `--since` filter to run only affected package tests on PRs.
- Use `melos list --parsable` for scripting (e.g., dynamic CI matrix generation).
- Example CI step sequence:
  1. `melos bootstrap`
  2. `melos run format` (check)
  3. `melos run analyze`
  4. `melos run test`
  5. `melos run codegen` (verify no uncommitted generated files)

## Common mistakes to avoid

- Don't run `flutter pub get` in individual packages — use `melos bootstrap`.
- Don't forget to re-bootstrap after adding a new package.
- Don't use `exec` when you need a single workspace-level command — use `run`.
- Don't set high concurrency for build_runner — file locks will cause failures.
- Don't mix versioning strategies (manual + melos version) — pick one.
- Don't ignore `melos.yaml` in `.gitignore` — it should be committed.

## Performance tips

- Use `--since` in CI to avoid running tests on unchanged packages.
- Use `concurrency` setting to parallelize independent package operations.
- Use `packageFilters.scope` in scripts to pre-filter when the glob is too broad.
- Consider splitting heavy scripts (e.g., integration tests) from lightweight ones (unit tests).
