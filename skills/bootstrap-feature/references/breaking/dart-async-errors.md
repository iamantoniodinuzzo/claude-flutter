# Dart async & error handling – async/await, streams, exceptions

**Version**: Dart 3.10+ (Null Safety Required)  
**Source**: split from `dart.md` to support smaller, task-focused seeds.

Use this file when you’re implementing async code (I/O, network, DB), streams,
and you need **real-world error handling** rules.

---

## Async Programming

### DO use async/await over raw Futures

```dart
// Good - readable and clear
Future<User> fetchUser(String id) async {
  final response = await client.get('/users/$id');
  final json = await response.json();
  return User.fromJson(json);
}

// Bad - callback hell
Future<User> fetchUser(String id) {
  return client.get('/users/$id').then((response) {
    return response.json().then((json) {
      return User.fromJson(json);
    });
  });
}
```

### AVOID async when it has no benefit

```dart
// Good - no await needed
Future<String> fetchCached(String key) {
  return cache.get(key);
}

// Bad - unnecessary async
Future<String> fetchCached(String key) async {
  return cache.get(key);
}

// Good - await is needed
Future<String> fetchAndCache(String key) async {
  final value = await fetch(key);
  await cache.set(key, value);
  return value;
}
```

### DO use Future<void> for async methods without returns

```dart
// Good
Future<void> saveUser(User user) async {
  await repository.save(user);
}

// Bad
Future saveUser(User user) async {
  await repository.save(user);
}
```

### DO handle errors in async code

```dart
// Good - try-catch for async errors
Future<User> fetchUser(String id) async {
  try {
    final response = await client.get('/users/$id');
    return User.fromJson(response.data);
  } on NetworkException catch (e) {
    throw UserFetchException('Failed to fetch user: ${e.message}');
  }
}
```

### DO use async* for stream generation

```dart
// Good - readable stream generation
Stream<int> countStream(int max) async* {
  for (var i = 0; i < max; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i;
  }
}

// Usage
await for (final count in countStream(10)) {
  print(count);
}
```

### DO use Stream transformations for complex operations

```dart
// Good - composable stream operations
final userStream = dataStream
    .where((data) => data.isValid)
    .map((data) => User.fromJson(data))
    .distinct()
    .handleError((error) => print('Error: $error'));
```

---

## Error Handling

### DO use on clauses for specific exceptions

```dart
// Good - specific error handling
try {
  await fetchData();
} on NetworkException catch (e) {
  print('Network error: ${e.message}');
} on ParseException catch (e) {
  print('Parse error: ${e.message}');
} catch (e) {
  print('Unknown error: $e');
}

// Bad - catches everything
try {
  await fetchData();
} catch (e) {
  print('Error: $e');
}
```

### DO use rethrow to preserve stack traces

```dart
// Good
try {
  await riskyOperation();
} catch (e) {
  log('Operation failed: $e');
  rethrow; // Preserves original stack trace
}

// Bad
try {
  await riskyOperation();
} catch (e) {
  log('Operation failed: $e');
  throw e; // Loses stack trace information
}
```

### DO throw Error for programming errors

```dart
// Good - programming errors
class InvalidConfigError extends Error {
  final String message;
  InvalidConfigError(this.message);
}

// Good - runtime exceptions
class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);
}
```

### DO create custom exceptions for domain errors

```dart
// Good - clear domain exceptions
class UserNotFoundException implements Exception {
  final String userId;
  UserNotFoundException(this.userId);

  @override
  String toString() => 'User not found: $userId';
}

class AuthenticationException implements Exception {
  final String message;
  AuthenticationException(this.message);
}
```

