# Structured Logging — Flutter Project Standard

## Format

```
[feature][layer] operation – key1=value1, key2=value2
```

- **feature**: snake_case feature name (e.g. `auth`, `order_list`)
- **layer**: one of `domain`, `data`, `application`, `presentation`
- **operation**: imperative verb phrase (e.g. `fetch user`, `map response`, `build state`)
- **key=value pairs**: relevant identifiers, counts, durations (no PII)

## Log levels

| Method | When |
|---|---|
| `t()` | Trace — very noisy, loop iterations, serialization |
| `d()` | Debug — method entry/exit, state transitions |
| `i()` | Info — meaningful business events (user action, network success) |
| `w()` | Warning — recoverable anomaly (fallback path, retried request) |
| `e()` | Error — caught exception with stack trace |
| `f()` | Fatal — unrecoverable state that warrants crash reporting |

## Logger declaration

One logger per layer. Declare as a module-level `final`:

```dart
final _log = Logger('feature_name.layer');
```

Examples:
```dart
final _log = Logger('auth.data');
final _log = Logger('order_list.application');
```

## AsyncErrorLogger rule

**Never** log errors inside async providers (Notifiers, StreamProviders, FutureProviders).
`AsyncErrorLogger` observes `ProviderObserver` and logs automatically.

```dart
// BAD — duplicates error logging
class OrderNotifier extends AsyncNotifier<List<Order>> {
  @override
  Future<List<Order>> build() async {
    try {
      return await ref.watch(orderRepositoryProvider).fetchAll();
    } catch (e, st) {
      _log.e('[order_list][application] fetch failed', error: e, stackTrace: st);
      rethrow; // logged twice
    }
  }
}

// GOOD — let AsyncErrorLogger handle it
class OrderNotifier extends AsyncNotifier<List<Order>> {
  @override
  Future<List<Order>> build() async {
    return ref.watch(orderRepositoryProvider).fetchAll();
  }
}
```

## Layer examples

### Data — datasource

```dart
final _log = Logger('product.data');

Future<ProductDto> fetchProduct(String id) async {
  _log.d('[product][data] fetch product – id=$id');
  final doc = await _firestore.collection('products').doc(id).get();
  _log.i('[product][data] product fetched – id=$id, exists=${doc.exists}');
  return ProductDto.fromJson(doc.data()!);
}
```

### Data — repository impl (maps exceptions to failures)

```dart
final _log = Logger('product.data');

@override
Future<Either<ProductFailure, Product>> getProduct(String id) async {
  try {
    final dto = await _datasource.fetchProduct(id);
    return right(dto.toEntity());
  } on FirebaseException catch (e, st) {
    _log.e('[product][data] Firestore error – id=$id, code=${e.code}', error: e, stackTrace: st);
    return left(ProductFailure.notFound(e.code));
  }
}
```

### Application — notifier side effect

```dart
final _log = Logger('product.application');

Future<void> deleteProduct(String id) async {
  _log.d('[product][application] delete – id=$id');
  state = const AsyncLoading();
  state = await AsyncValue.guard(() => ref.read(productRepositoryProvider).delete(id));
  _log.i('[product][application] delete complete – id=$id');
}
```

### Presentation — user-triggered action

```dart
final _log = Logger('product.presentation');

void _onDeleteTapped(BuildContext context, String id) {
  _log.d('[product][presentation] delete tapped – id=$id');
  ref.read(productNotifierProvider.notifier).deleteProduct(id);
}
```

## What NOT to log

- Passwords, tokens, full stack traces of expected validation errors
- Repeated identical log lines in tight loops (use `t()` + sampling)
- `state` after every micro-transition (log intent and outcome, not every step)
