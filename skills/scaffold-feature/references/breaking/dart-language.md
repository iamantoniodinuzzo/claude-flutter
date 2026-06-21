# Dart language (core) – naming, types, modern features, collections, functions, OOP

**Version**: Dart 3.10+ (Null Safety Required)  
**Source**: split from `dart.md` to support smaller, task-focused seeds.

Use this file when you need **core Dart language** guidance, but you *don’t* need
async/error/performance/tooling sections.

---

## Contents

1. Naming Conventions
2. Type System & Null Safety
3. Modern Dart 3.0+ Features
4. Collections & Iterables
5. Functions & Parameters
6. Classes & OOP

---

## Naming Conventions

### DO use correct case styles

```dart
// Types, extensions, enums: UpperCamelCase
class UserProfile {}
enum MediaType {}
extension StringExtensions on String {}

// Files, packages, directories: lowercase_with_underscores
// user_profile.dart, media_list_screen.dart

// Variables, functions, parameters, constants: lowerCamelCase
final userId = '123';
const maxRetries = 3; // NOT MAX_RETRIES
void fetchUserData() {}

// Import prefixes: lowercase_with_underscores
import 'package:flutter/material.dart' as material;
```

### DO treat acronyms longer than two letters as words

```dart
class HttpConnection {} // Good
class HTTPConnection {} // Bad

class ApiClient {} // Good
class APIClient {} // Bad

// Exception: Two letters
class IOStream {} // OK
class ID {} // OK
```

### DO make names descriptive and consistent

```dart
// Good - descriptive noun phrases
final userProfile = getUserProfile();
final mediaList = getMediaList();

// Bad - vague or abbreviated
final data = getUserProfile();
final lst = getMediaList();

// Good - consistent terminology
class MediaRepository {}
class MediaService {}
class MediaProvider {}

// Bad - mixing terms
class MovieRepo {}
class FilmService {}
class MediaDataSource {}
```

---

## Type System & Null Safety

### DO leverage type inference with var

```dart
// Good - type is clear from initializer
var name = 'John';
var count = 42;
var items = <String>[];

// Good - explicit when needed
String? nullableName;
final int Function(int) calculator;
```

### DON'T explicitly initialize variables to null

```dart
// Good
String? name;

// Bad
String? name = null;
```

### DO annotate when types aren't obvious

```dart
// Good - unclear from initializer
final List<MediaItem> items = getItems();
final MediaType type = parseType(input);

// Good - no initializer
int? userId;
String? errorMessage;

// Bad - obvious from literal
final String name = 'John'; // Just use: var name = 'John';
```

### DO use type promotion and null-check patterns

```dart
// Good - type promotion
String? name;
if (name != null) {
  print(name.length); // name promoted to String
}

// Good - null-check pattern
if (name case String value) {
  print(value.length);
}

// Good - null-aware operators
final displayName = name ?? 'Unknown';
final length = name?.length ?? 0;
```

### DO provide function type annotations

```dart
// Good - explicit return types and parameters
Future<UserProfile> fetchUser(String userId) async {
  // ...
}

void updateCache(String key, dynamic value) {
  // ...
}

// Good - void for no return value
Future<void> saveData() async {
  // ...
}
```

---

## Modern Dart 3.0+ Features

### DO use records for multiple return values

```dart
// Good - clean multiple returns
(String name, int age) getUserInfo(Map<String, dynamic> json) {
  return (json['name'] as String, json['age'] as int);
}

// Usage with destructuring
var (name, age) = getUserInfo(data);

// Good - named fields for clarity
({String title, int year, double rating}) getMediaInfo() {
  return (title: 'Inception', year: 2010, rating: 8.8);
}

// Usage
var (:title, :year, :rating) = getMediaInfo();
```

### DO use pattern matching for cleaner code

```dart
// Good - destructuring in declarations
var [first, second, ...rest] = items;
var {'name': userName, 'age': userAge} = userMap;

// Good - if-case for validation
if (json case {'user': {'name': String name, 'id': int id}}) {
  print('User: $name ($id)');
}

// Good - switch expressions for exhaustive matching
String getStatusMessage(Status status) => switch (status) {
  Status.loading => 'Loading...',
  Status.success => 'Success!',
  Status.error => 'Error occurred',
};

// Good - destructuring in loops
for (var (index, item) in items.indexed) {
  print('$index: $item');
}
```

### DO use sealed classes for discriminated unions

```dart
// Good - exhaustive type checking
sealed class Result<T> {}

final class Success<T> extends Result<T> {
  final T data;
  Success(this.data);
}

final class Error<T> extends Result<T> {
  final String message;
  Error(this.message);
}

// Compiler ensures all cases handled
String handleResult(Result<String> result) => switch (result) {
  Success(:final data) => 'Got: $data',
  Error(:final message) => 'Error: $message',
  // No need for default - compiler knows all cases
};
```

### DO use class modifiers appropriately

```dart
// final - prevent extension and implementation
final class ImmutableConfig {
  final String apiKey;
  const ImmutableConfig(this.apiKey);
}

// base - enforce inheritance of implementation
base class BaseRepository {
  void logOperation() {}
}

// interface - allow implementation, prevent extension
interface class Sortable {
  int compareTo(Sortable other);
}

// sealed - exhaustive pattern matching
sealed class ViewState {}
final class Loading extends ViewState {}
final class Success<T> extends ViewState {
  final T data;
  Success(this.data);
}
final class Failure extends ViewState {
  final String error;
  Failure(this.error);
}
```

### DO use enhanced enums

```dart
// Good - enums with methods and properties
enum MediaType {
  movie('Movie', Icons.movie),
  tv('TV Show', Icons.tv),
  person('Person', Icons.person);

  final String displayName;
  final IconData icon;

  const MediaType(this.displayName, this.icon);

  bool get isVideo => this == movie || this == tv;
}

// Usage with dot shorthand when context is clear
void showMedia(MediaType type) {
  // ...
}

showMedia(.movie); // Instead of MediaType.movie
```

**Clean architecture note (this workspace):** avoid putting **user-facing labels**
or **UI-only types** (e.g. `IconData`) inside enums that live in `domain/`,
`data/`, or `application/`. Keep enums “pure” and map them to UI strings/icons
in `presentation/` via an extension. See `patterns/no-ui-strings-outside-ui.md`.

### DO use extension methods for adding functionality

```dart
// Good - extending existing types
extension StringValidation on String {
  bool get isValidEmail => contains('@') && contains('.');

  String get capitalized => isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}

// Usage
if (email.isValidEmail) {
  print(email.capitalized);
}

// Good - generic extensions
extension IterableExtensions<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;

  Map<K, List<T>> groupBy<K>(K Function(T) keySelector) {
    final map = <K, List<T>>{};
    for (final item in this) {
      (map[keySelector(item)] ??= []).add(item);
    }
    return map;
  }
}
```

---

## String Operations

### DO use compareTo() for lexicographic ordering

Dart strings do **not** support `<`, `>`, `<=`, `>=` operators directly.
Use `.compareTo()` for any ordering comparison.

```dart
// ❌ COMPILE ERROR — undefined operator
if (startTime < endTime) { ... }
if (a >= b) { ... }

// ✅ CORRECT
if (startTime.compareTo(endTime) < 0) { ... }
if (a.compareTo(b) >= 0) { ... }
```

This is especially relevant when comparing zero-padded time strings (e.g. `"HH:mm"`)
or date strings (e.g. `"YYYY-MM-DD"`) — lexicographic order is correct
**only when strings are zero-padded**, and `.compareTo()` is the right tool.

---

## Collections & Iterables

### DO use collection literals

```dart
// Good
final list = <String>[];
final set = <int>{};
final map = <String, int>{};

// Bad
final list = List<String>();
final set = Set<int>();
final map = Map<String, int>();
```

### DO use isEmpty/isNotEmpty instead of length

```dart
// Good
if (items.isEmpty) return;
if (users.isNotEmpty) print('Has users');

// Bad
if (items.length == 0) return;
if (users.length > 0) print('Has users');
```

### DO use whereType() instead of cast()

```dart
// Good - filters and casts
final strings = items.whereType<String>();

// Bad - runtime errors if wrong type
final strings = items.cast<String>();
```

### AVOID using forEach with function literals

```dart
// Good - use for-in loop
for (final item in items) {
  print(item);
}

// Bad - unnecessary overhead
items.forEach((item) {
  print(item);
});

// Exception: OK with tear-offs
items.forEach(print);
```

### DO use null-aware elements in collection literals (Dart 3.x)

The `use_null_aware_elements` lint (enabled in `flutter_lints` 6+) flags
`if (x != null)` guards that can be replaced with the `?` null-aware marker.

```dart
// ❌ LINT: use_null_aware_elements
final map = {
  'required': value,
  if (optionalA != null) 'optionalA': optionalA,
  if (optionalB != null) 'optionalB': optionalB,
};

// ✅ CORRECT — null-aware marker, same semantics
final map = {
  'required': value,
  'optionalA': optionalA,   // null written as-is; receiver decides
  'optionalB': optionalB,
};

// ✅ ALSO CORRECT when you truly want to omit the key entirely
final map = {
  'required': value,
  ?'optionalA': optionalA,  // key omitted when optionalA is null
};
```

**Note:** `Map<String, dynamic>` (Firestore) accepts `null` values fine —
use the plain assignment unless you specifically need to omit the key.

---

### DO use collection-if and collection-for

```dart
// Good - conditional elements
final items = [
  'Always',
  if (showExtra) 'Extra',
  if (showMore) ...moreItems,
];

// Good - generating elements
final squares = [
  for (var i = 0; i < 10; i++) i * i,
];

// Good - in widgets
ListView(
  children: [
    HeaderWidget(),
    for (final item in items) ItemWidget(item: item),
    if (hasFooter) FooterWidget(),
  ],
);
```

### DO use spread operators efficiently

```dart
// Good - combining collections
final all = [...first, ...second, ...third];

// Good - conditional spreading
final items = [
  ...required,
  if (includeOptional) ...optional,
];

// Good - null-aware spreading
final safe = [...items, ...?nullableItems];
```

---

## Functions & Parameters

### DO use function declarations over lambdas

```dart
// Good
void handleClick() {
  print('Clicked');
}

button.onClick = handleClick;

// Bad
button.onClick = () {
  print('Clicked');
};
```

### DO use tear-offs when possible

```dart
// Good
items.map(processItem);
button.onClick = handleClick;

// Bad
items.map((item) => processItem(item));
button.onClick = () => handleClick();
```

### DO use arrow syntax for single expressions

```dart
// Good
int square(int x) => x * x;
String greet(String name) => 'Hello, $name!';

// Bad - unnecessary braces
int square(int x) {
  return x * x;
}
```

### DO use required for mandatory named parameters

```dart
// Good
class User {
  User({
    required this.id,
    required this.name,
    this.email, // Optional
  });

  final String id;
  final String name;
  final String? email;
}
```

### AVOID positional boolean parameters

```dart
// Good - named for clarity
void setVisibility({required bool visible, required bool animated}) {}

setVisibility(visible: true, animated: false);

// Bad - unclear meaning
void setVisibility(bool visible, bool animated) {}

setVisibility(true, false); // What do these mean?
```

### DO use inclusive start and exclusive end for ranges

```dart
// Good - follows convention [start, end)
List<T> slice<T>(List<T> items, int start, int end) {
  return items.sublist(start, end);
}

final firstThree = slice(items, 0, 3); // Items 0, 1, 2
```

### DO order parameters: required positional, optional positional, named

```dart
// Good
void createUser(
  String id, // Required positional
  String name, // Required positional
  [String? email], // Optional positional
  {
    bool verified = false, // Named
    String? role, // Named
  }
) {}
```

---

## Classes & OOP

### DO use initializing formals

```dart
// Good
class Point {
  Point(this.x, this.y);

  final double x;
  final double y;
}

// Bad - redundant
class Point {
  Point(double x, double y) : x = x, y = y;

  final double x;
  final double y;
}
```

### DO use ; for empty constructor bodies

```dart
// Good
class User {
  User(this.id, this.name);

  final String id;
  final String name;
}

// Bad
class User {
  User(this.id, this.name) {}

  final String id;
  final String name;
}
```

### DO initialize fields at declaration when possible

```dart
// Good
class Counter {
  int value = 0;
  String label = 'Count';
}

// Less ideal - initializer list
class Counter {
  Counter() : value = 0, label = 'Count';

  int value;
  String label;
}
```

### DON'T use new keyword

```dart
// Good
final user = User('123', 'John');
final widget = Container();

// Bad
final user = new User('123', 'John');
```

### DO use final for read-only properties

```dart
// Good
class User {
  final String id;
  final String name;
}

// Bad - unnecessary getter
class User {
  String get id => _id;
  String _id;
}
```

### DO override hashCode when overriding ==

```dart
// Good
class Point {
  Point(this.x, this.y);

  final double x;
  final double y;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Point && runtimeType == other.runtimeType && x == other.x && y == other.y;

  @override
  int get hashCode => Object.hash(x, y);
}
```

### DO use mixins for shared behavior

```dart
// Good
mixin LoggerMixin {
  void log(String message) {
    print('[${runtimeType}] $message');
  }
}

class UserRepository with LoggerMixin {
  void save() {
    log('Saving user');
    // ...
  }
}
```

### AVOID defining one-member abstract classes

```dart
// Good - use function type
typedef Validator = bool Function(String);

// Bad - unnecessary class
abstract class Validator {
  bool validate(String value);
}
```

### DO make declarations private by default

```dart
// Good - expose only what's needed
class _InternalHelper {
  void _privateMethod() {}
}

class PublicApi {
  final _helper = _InternalHelper();

  void publicMethod() {
    _helper._privateMethod();
  }
}
```

