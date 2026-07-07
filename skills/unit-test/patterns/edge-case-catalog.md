# Pattern: Adversarial Edge-Case Catalog

## Purpose

Tests that only feed a method its expected, well-formed inputs prove nothing beyond "the happy path compiles". This catalog lists the adversarial inputs that expose off-by-one errors, null-handling gaps, parsing assumptions, and race conditions.

**Selection rule**: scan the signature and behavior of the method under test, then apply **only the rows whose input type actually appears**. Never generate ritual tests for impossible inputs (e.g. a `NaN` test for an `int` parameter, an empty-list test for a method that takes a single entity). Every catalog test must map to a plausible bug.

## String inputs

| Input | Bug it exposes |
|---|---|
| `''` (empty) | `.first`, `substring`, index access without guard |
| `'   '` (whitespace only) | missing `.trim()` before validation |
| Very long string (e.g. 10 000 chars) | truncation logic, fixed-size assumptions |
| Unicode / emoji (`'café 🚀'`, combining chars) | byte-length vs rune-length confusion, encoding in serialization |
| Characters meaningful to downstream parsing (`'a"b'`, `'x\ny'`, `'{'`) | naive interpolation into JSON, queries, or log formats |

## Numeric inputs

| Input | Bug it exposes |
|---|---|
| `0` | division, "empty means zero" conflation, falsy-style checks |
| Negative value | unsigned assumptions, `abs()` missing, range checks with `>` vs `>=` |
| Boundary value ± 1 for every explicit range in the code | off-by-one in `<` vs `<=` comparisons |
| Maximum realistic value | overflow in sums/products, UI formatting assumptions |
| `double.nan`, `double.infinity` (only for `double` params) | comparisons silently false (`NaN != NaN`), sort corruption |

## Collection inputs

| Input | Bug it exposes |
|---|---|
| `[]` (empty) | `.first` / `.last` / `.reduce` without guard |
| Single element | fencepost logic between "empty" and "many" branches |
| Duplicates | dedup assumptions, `Set` vs `List` semantics, keyed lookups |
| `null` element inside a list of nullable items | mapping/filtering that assumes non-null elements |
| Unsorted input where output order matters | hidden dependency on input ordering |

## DateTime inputs

Always construct with `DateTime.utc(...)` — never `DateTime.now()`.

| Input | Bug it exposes |
|---|---|
| Two instants equal to the exact comparison boundary | `isBefore` / `isAfter` are strict — equality falls through both |
| Feb 29 of a leap year | manual date arithmetic |
| Epoch (`DateTime.utc(1970)`) and far future | serialization range, sentinel-value collisions |
| Same instant expressed in UTC vs local | `==` on DateTime compares instant AND location |

## JSON / `fromJson` inputs

| Input | Bug it exposes |
|---|---|
| Required field absent from the map | cast of `null` → unhelpful `TypeError` instead of domain `FormatException` |
| Wrong type (`42` where a `String` is expected, `'42'` where an `int` is) | unchecked `as` casts |
| Field explicitly `null` (present, value null) | different code path from "field absent" — test both |
| Unknown extra fields | strict parsers that should ignore them |
| Unknown enum string value | `.byName` throws — is there a fallback or a domain error? |

## Stream behavior

| Scenario | Bug it exposes |
|---|---|
| Stream that closes immediately without emitting | listeners awaiting a "first value" forever, missing done-handling |
| Error emitted mid-stream after N valid values | `onError` missing → unhandled async error kills the zone |
| Rapid consecutive emissions (no await between `add` calls) | state machines that assume one microtask per event |
| Stream closed while the subject still holds a subscription | missing cancellation/cleanup, "add after close" StateError |

Use `StreamController` for fine-grained control (see `notifier-with-internal-ref-listen.md`); pump microtasks with `await Future<void>.value()` between emissions.

## Async / concurrency behavior

| Scenario | Bug it exposes |
|---|---|
| Second call while the first is still in-flight (double-tap) | duplicated side effects, state overwritten by the stale first result |
| Container / subject disposed while an operation is in-flight | "used after dispose" errors, callbacks mutating dead state |
| Same call twice sequentially (idempotency) | accumulating state, duplicate writes |

Double-tap recipe: stub the dependency with a `Completer`-backed future, start both calls, then complete:

```dart
final completer = Completer<Foo>();
when(() => mockRepo.fetchFoo(any())).thenAnswer((_) => completer.future);

final first = container.read(fooProvider.notifier).load('1');
final second = container.read(fooProvider.notifier).load('1'); // while in-flight

completer.complete(expectedFoo);
await Future.wait([first, second]);

verify(() => mockRepo.fetchFoo('1')).called(1); // or 2 — assert the DOCUMENTED contract
```

## How many catalog tests per method?

Aim for the smallest set that covers every applicable row **once**. Ten sharp adversarial tests beat forty ritual permutations. If two rows would exercise the same guard clause, keep the harsher one.
