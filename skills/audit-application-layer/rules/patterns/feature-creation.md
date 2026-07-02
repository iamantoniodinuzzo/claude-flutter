<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Feature Implementation – Compact Guide

Short reference for adding a new feature following the project’s 4-tier clean architecture and Riverpod patterns.

---

## 1. Directory & Layering

**Feature structure**

```plaintext
lib/src/features/[feature_name]/
├── domain/
│   └── [entities, value objects, repository interfaces]
├── data/
│   └── repository/
│       └── [concrete_repository].dart
├── application/
│   └── [services, use-cases].dart
└── presentation/
    ├── [screens, widgets]
    └── [controllers, providers]
```

- **Keep everything feature‑local** (no “god” folders).
- Name files consistently (one feature = one namespace):

```plaintext
✓ feature_name_repository.dart
✓ feature_name_service.dart
✓ feature_name_screen.dart
✓ feature_name_controller.dart
```

---

## 2. Domain Layer

**Goals**

- Express core business concepts.
- Avoid primitives where a type makes sense.
- Keep domain **immutable** and **framework‑free**.

**Checklist**

- [ ] Create feature directory structure.
- [ ] Add domain model(s) with:
  - final fields
  - `toMap()` / `fromMap()` (simple serialization)
  - clear types for IDs (e.g. `UserId` instead of `String` when useful)
- [ ] Keep validation inside domain types (not scattered in functions).

---

## 3. Data Layer (Repository)

**Intent**: abstract data access (Firestore, REST, local DB, etc.) behind a
feature‑specific API.

**What to create**

1. **Concrete repository implementation** in `data/repository/`.
2. **Optional abstract interface** in `domain/repository/` (only if you truly expect multiple implementations).
3. **Feature‑specific exceptions**, following the exception‑handling patterns.
4. **Repository provider** (Riverpod, code‑gen).

**Rules**

- **Implicit Interfaces**: Every class in Dart defines an implicit interface. Abstract classes are often unnecessary boilerplate if you only have one implementation.
- **No Leaky Abstractions**: Do not leak infrastructure types. Repositories must return Domain Entities or pure Dart types. **Never** return `DocumentSnapshot`, `Query`, or `FirebaseException` to the layers above.
- Handle external errors in the repository, rethrow as domain exceptions.

**Example – Repository + provider**

```dart
// lib/src/features/user_profile/data/repository/user_profile_repository.dart

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

part 'user_profile_repository.g.dart';

// Domain exceptions
class ProfileNotFoundException implements Exception {}
class UpdateProfileException implements Exception {
  UpdateProfileException(this.message);
  final String? message;
}

/// Concrete repository.
class UserProfileRepository {
  UserProfileRepository({required FirebaseFirestore firestore})
      : _firestore = firestore;

  final FirebaseFirestore _firestore;

  Future<UserProfile> fetchProfile(String userId) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      if (!doc.exists) throw ProfileNotFoundException();
      return UserProfile.fromMap(doc.data()!);
    } on FirebaseException catch (e) {
      throw UpdateProfileException(e.message);
    }
  }
}

@riverpod
UserProfileRepository userProfileRepository(UserProfileRepositoryRef ref) {
  return UserProfileRepository(
    firestore: ref.watch(firebaseFirestoreProvider),
  );
}
```

---

## 4. Application Layer (Service) — **Mandatory for tomcat_portal**

> **tomcat_portal rule**: every write operation goes through a `Service` class. The controller never calls the repository directly.

**Responsibilities**

- Orchestrate multiple repositories (e.g. profile + auth).
- Centralize cross‑cutting concerns (logging, validation).
- Expose clear methods for the UI (`updateUserProfile`, `loadProfilePage`).

**Service interface (for testability)**

Unlike repositories — where an abstract interface is optional when there is
only one real implementation — **service classes benefit from an abstract
interface** because controllers mock the service directly in unit tests.

```dart
// application/feature_name_service.dart
abstract interface class FeatureNameService {
  Future<String> sendOrder(FeatureOrder order);
  Future<String> sendStopOrder({required String scenarioId});
  Stream<FeatureOrder?> watchOrder(String orderId);
}

class FeatureNameServiceImpl implements FeatureNameService { ... }
```

The Riverpod provider returns the **interface** type; tests mock the interface:

```dart
class MockFeatureNameService extends Mock implements FeatureNameService {}
```

**Checklist**

- [ ] Create abstract interface class in `application/`.
- [ ] Create `Impl` class implementing the interface.
- [ ] Inject repositories + logger via providers.
- [ ] Log operations with `[feature][service]` prefix.
- [ ] Controller reads service via `ref.read()`, never the repo.
- [ ] Provider returns the interface type.

---

## 5. Presentation Layer

**Goals**

- Observe state and render UI.
- Handle user input via **Controllers** (using `AsyncNotifier` for async state).

**Rules**

- **Dumb Widgets**: Extract UI into small, private widget classes.
- **AsyncValue**: Always handle all states (data, loading, error).
- **Side Effects**: Use `ref.listen` for navigation or snackbars.

---

## 6. Testing

- Use `ProviderContainer` with overrides for repositories/services.
- Test happy paths (success) and error paths (exceptions).
- Mock concrete repositories directly if an abstract interface is missing.
