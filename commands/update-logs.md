# Update Feature Logs

You are tasked with updating the logging implementation for a Flutter feature to comply with the project's logging guidelines.

## Pattern Reference

📚 **Complete pattern documentation**: `ai_docs/logging_patterns.md`

This document contains complete logging guidelines, 8 common patterns with concrete examples from real features, anti-patterns, and a decision checklist. Refer to it when deciding how to log specific scenarios.

## Task Overview

Given a feature name (e.g., `flight_area`, `missions`, `map_base`), you must:

1. **Quick Analysis** (2-3 min) - Grep patterns to classify files
2. **Strategic Batching** (5-7 min) - Process files in groups by complexity
3. **Rapid Verification** (30 sec) - Syntax check on modified files only
4. **Quality Output** - Maintain signal-to-noise ratio with proper formatting

## Guidelines Reference

### Format Standard

```plain
[feature][layer] operation – key1=value1, key2=value2
```

### Log Levels

- **t()** – trace: Ultra-detailed, very rare; deep debugging only
- **d()** – debug: Diagnostics (parameters, counts, timing)
- **i()** – info: Business events (use case start/end, user actions)
- **w()** – warning: Handled anomalies (partial data, fallbacks)
- **e()** – error: Failed operations (data layer/mixin only, recoverable)
- **f()** – fatal: Critical unexpected errors (bugs, impossible states)

### Layer Tags

- **[repository]** – data layer (Firestore, Storage, HTTP operations)
- **[service]** – application layer (business logic, use cases)
- **[ui]** – presentation layer controllers/notifiers (user actions, state changes)
- **[provider]** – presentation layer providers (async operations, filtering)

### Critical Rules

- **AsyncErrorLogger** automatically logs errors from async providers – DO NOT duplicate error logs in providers
- **Providers with AsyncValue**: Only log parameters/counts/success with `d()`/`i()` – NO `e()`/`f()`
- **Mixin/Repository**: Can use `e()`/`f()` before throwing exceptions (will be caught by AsyncErrorLogger)
- **Service layer**: Log business logic, not technical details; let exceptions propagate

## Optimized Workflow

**Estimated time: 8-10 minutes** (vs 15 min baseline)

### Phase 1: Quick Analysis (2-3 minutes)

**1.1 Parallel Pattern Discovery**

Execute these grep commands in parallel to quickly understand the feature:

```bash
# Find all debugPrint calls
grep -rn "debugPrint" lib/src/features/FEATURE --include="*.dart"

# Find existing logger usage
grep -rn "logger\.[tdiwef](" lib/src/features/FEATURE --include="*.dart"

# List all dart files (excluding generated)
find lib/src/features/FEATURE -name "*.dart" -not -name "*.g.dart"
```

**1.2 File Classification**

Based on grep output, classify files into three categories:

- **BATCH_SIMPLE** (3-4 files): Standard patterns, few logs
  - Provider/Widget with simple user actions
  - Example: drawer controller with open/close actions
  - Processing: 2-3 files in parallel, 1 Edit per file

- **BATCH_MEDIUM** (2-3 files): Moderate logic, multiple logs
  - Widgets with user interactions and lifecycle
  - Example: control panels, tile layers
  - Processing: 1 file at a time, 2-3 Edits per file

- **INDIVIDUAL** (1-2 files): Complex, requires decisions
  - Files with 10+ logs needing consolidation
  - Example: status providers with verbose debugging
  - Processing: Full analysis, justify decisions

**1.3 Create Todo List**

Create todo list with file classification:

```markdown
## BATCH_SIMPLE (3 files)
- [ ] file1.dart - 2 debugPrint, pattern: user action
- [ ] file2.dart - 1 debugPrint, pattern: event detection

## BATCH_MEDIUM (2 files)
- [ ] file3.dart - 5 debugPrint, pattern: user interactions + lifecycle
- [ ] file4.dart - 3 debugPrint, pattern: error handling

## INDIVIDUAL (1 file)
- [ ] file5.dart - 15+ debugPrint, needs consolidation analysis
```

### Phase 2: Strategic Batching (5-7 minutes)

**2.1 BATCH_SIMPLE: Quick Edits (2 min)**

For files with clear patterns:

1. Read 2-3 files in parallel
2. Apply standard patterns from `ai_docs/logging_patterns.md`
3. One precise Edit per file
4. No deep analysis needed

Common patterns:

- `ref.read(loggerServiceProvider).i('[feature][ui] action')` for user actions
- `ref.watch(loggerServiceProvider)` in ConsumerWidget
- Direct removal of commented debugPrint

**2.2 BATCH_MEDIUM: Moderate Edits (3 min)**

For files with moderate logic:

1. Read 1 file at a time
2. Identify all logging points
3. Decide appropriate levels (d/i/w) based on context
4. 2-3 Edits per file if needed

Decision criteria:

- User actions → `i()` info level
- Diagnostics/parameters → `d()` debug level
- Errors/warnings → `w()` warning level
- Remove excessive verbosity (build, dispose if not essential)

**2.3 INDIVIDUAL: Deep Analysis (2-3 min)**

For complex files:

1. Read file completely
2. Analyze each log for utility
3. **Critical decision**: What to keep/remove/add
4. Justify important choices in comments
5. Consider consolidating multiple logs into one

Example decision pattern:

```dart
// DECISION: 15 debugPrint too verbose for frequent rebuilds
// ACTION: Consolidate into ONE log at end of computation
// RATIONALE: Provider rebuilds frequently, logging every check is noise
// RESULT: Single log with all key-value pairs
logger.d('[feature][provider] Status computed – key1=val1, key2=val2, ...')
```

### Phase 3: Rapid Verification (30 seconds)

**3.1 Feature-Scoped Syntax Check**

**CRITICAL**: Run `dart analyze` scoped to the feature directory ONLY (NOT entire project):

```bash
# ✅ CORRECT: Feature-scoped (fast, ~30 seconds)
dart analyze --no-fatal-infos lib/src/features/FEATURE

# ❌ WRONG: Entire project (slow, 5+ minutes, often timeout)
dart analyze
```

**Why feature-scoped**:

- ⚡ **Fast**: 30 seconds vs 5+ minutes for full project
- 🎯 **Targeted**: Only checks files you modified in the feature
- ✅ **Reliable**: No timeout issues, immediate feedback
- 🔍 **Sufficient**: Catches syntax errors, missing imports in your changes

**Alternative - Modified files only** (if feature scope still too broad):

```bash
dart analyze --no-fatal-infos \
  lib/src/features/FEATURE/path/to/file1.dart \
  lib/src/features/FEATURE/path/to/file2.dart \
  # ... only modified files (max 8-10)
```

**3.2 Visual Spot-Check (optional)**

Quick verification with grep:

```bash
# Verify log format compliance
grep "logger\.[tdiwef](" lib/src/features/FEATURE -A 1 | head -30

# Verify no active debugPrint (ignore commented ones)
grep "debugPrint(" lib/src/features/FEATURE --include="*.dart" | grep -v "//"
```

## Implementation Examples

### Example 1: Inject LoggerService

```dart
// Provider with ref.read (no class field needed)
void open() {
  if (state != DrawerState.open) {
    state = DrawerState.open;
    ref.read(loggerServiceProvider).i('[feature][ui] Drawer opened by user');
  }
}

// ConsumerWidget with ref.watch
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final logger = ref.watch(loggerServiceProvider);
    return InkWell(
      onTap: () {
        logger.i('[feature][ui] Button tapped – action=submit');
      },
    );
  }
}

// Detector/Service with constructor injection
class MyDetector extends BaseDetector {
  const MyDetector({required LoggerService logger}) : _logger = logger;
  final LoggerService _logger;

  @override
  Result detect(...) {
    _logger.d('[feature][ui] Detection triggered – lat=$lat, lng=$lng');
    return result;
  }
}
```

### Example 2: Replace debugPrint

```dart
// Before:
debugPrint('Loading zones: $count');

// After:
_logger.d('[flight_area][repository] fetchZones – count=$count');
```

### Example 3: Fix Format

```dart
// Before:
_logger.i('Zones loaded successfully');

// After:
_logger.i('[flight_area][repository] fetchZones success – count=$count');
```

### Example 4: Remove Duplicate Error Logs

```dart
// Before (WRONG):
@riverpod
Future<Data> fetchData(Ref ref) async {
  try {
    final data = await repository.fetch();
    ref.read(loggerServiceProvider).i('[feature][provider] success');
    return data;
  } catch (e) {
    ref.read(loggerServiceProvider).e('[feature][provider] error', e); // ❌ NO!
    rethrow;
  }
}

// After (CORRECT):
@riverpod
Future<Data> fetchData(Ref ref) async {
  ref.read(loggerServiceProvider).d('[feature][provider] fetchData – applying filter');
  final data = await repository.fetch();
  // AsyncErrorLogger handles errors automatically - no catch block needed
  return data;
}
```

### Example 5: Consolidate Verbose Logs

```dart
// Before (TOO VERBOSE):
debugPrint('Checking visibility...');
debugPrint('Mode: $mode');
debugPrint('isDirty: $isDirty');
debugPrint('visibilityChanged: $visibilityChanged');
// ... 10+ more debugPrint calls

// After (CONSOLIDATED):
logger.d(
  '[feature][provider] Status computed – '
  'mode=$mode, isDirty=$isDirty, visibilityChanged=$visibilityChanged'
);
```

## Important Notes

1. **Do not remove useful logs** – Only remove true duplicates or debug noise
2. **Respect AsyncErrorLogger** – Never log errors in async providers
3. **Maintain context** – Logs should help reconstruct flow in seconds
4. **Use batching strategy** – Classify files before processing to optimize time
5. **Refer to patterns** – Use `ai_docs/logging_patterns.md` for complete guidelines and examples
6. **Verify efficiently** – Run `dart analyze` scoped to feature directory only (30 sec vs 5+ min for full project)

## Performance Metrics

### Baseline (Before Optimization)

- ⏱️ **Time**: ~15 minutes
- 📁 **Files**: 8 modified
- 🔄 **Approach**: Sequential, file-by-file
- ✅ **Verification**: Full `dart analyze` (5+ min, often timeout)

### Target (With Optimized Workflow)

- ⏱️ **Time**: ~8-10 minutes (33% faster)
- 📁 **Files**: 8-10 modified
- 🔄 **Approach**: Mixed batch + individual based on complexity
- ✅ **Verification**: Targeted syntax check (30 seconds)

### Time Breakdown (Target)

- **Phase 1 - Quick Analysis**: 2-3 min (grep + classification)
- **Phase 2 - Strategic Batching**: 5-7 min
  - BATCH_SIMPLE: 2 min (3-4 files)
  - BATCH_MEDIUM: 3 min (2-3 files)
  - INDIVIDUAL: 2-3 min (1-2 files)
- **Phase 3 - Rapid Verification**: 30 sec (modified files only)

## Example Execution

When user runs:

```plain
/update-logs flight_area
```

You should:

1. **Quick Analysis** (Phase 1): Run parallel grep to classify files
2. **Create Todo List**: Group files by BATCH_SIMPLE/MEDIUM/INDIVIDUAL
3. **Strategic Batching** (Phase 2): Process files based on classification
4. **Rapid Verification** (Phase 3): Syntax check only modified files
5. **Summary**: Report changes made and time spent per phase

Start by asking the user which feature they want to update if not provided as a parameter.
