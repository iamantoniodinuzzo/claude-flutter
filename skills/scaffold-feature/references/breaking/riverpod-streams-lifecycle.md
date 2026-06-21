# Riverpod streams & lifecycle – Stream providers, autoDispose/keepAlive, cleanup, select()

**Version**: Riverpod 3.x  
**Source**: split from `riverpod.md` to support smaller, task-focused seeds.

Use this file for **real-time** data and when lifecycle/disposal/performance
matters.

---

## Stream provider (read-only)

```dart
@riverpod
Stream<User> userStream(Ref ref, String userId) {
  final firestore = ref.watch(firestoreProvider);
  return firestore
      .collection('users')
      .doc(userId)
      .snapshots()
      .map((snap) => User.fromJson(snap.data()!));
}
```

---

## StreamNotifier (stream + actions)

```dart
@riverpod
class ChatController extends _$ChatController {
  @override
  Stream<List<ChatMessage>> build(String chatId) {
    return ref
        .watch(firestoreProvider)
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => ChatMessage.fromJson(d.data())).toList());
  }

  Future<void> sendMessage(String text) async {
    await ref.read(firestoreProvider).collection('chats').doc(chatId).collection('messages').add({
      'text': text,
      'timestamp': FieldValue.serverTimestamp(),
    });
  }
}
```

---

## Disposal & cleanup

```dart
@riverpod
Stream<Location> location(Ref ref) {
  final controller = StreamController<Location>.broadcast();
  final subscription = Geolocator.getPositionStream().listen(controller.add);

  ref.onDispose(() {
    subscription.cancel();
    controller.close();
  });

  return controller.stream;
}
```

---

## autoDispose vs keepAlive

- Use `autoDispose` for short-lived screens/state (search, ephemeral filters).
- Use `ref.keepAlive()` only when you need caching across navigation.

### Lifecycle callbacks (optional)

Riverpod providers can react to lifecycle events:

```dart
@riverpod
int example(Ref ref) {
  ref.onCancel(() {
    // provider got “paused” (no listeners)
  });
  ref.onResume(() {
    // listeners came back
  });
  ref.onDispose(() {
    // final cleanup
  });
  return 0;
}
```

---

## Anti-pattern: creating StreamProvider inline inside another provider

Never create a new `StreamProvider` (or `Provider`) instance dynamically
inside another provider's body. Inline providers are not registered with
Riverpod's container, so they lose caching, disposal, and reactivity.

```dart
// ❌ WRONG — new StreamProvider created on every rebuild
@riverpod
Future<List<Aircraft>> availableAircraftForTimeSlot(
  Ref ref,
  String aeroclubId,
  String startTime,
  String endTime,
) async {
  // This StreamProvider is created inline — it is NOT tracked!
  final allAircraft = await ref.watch(
    StreamProvider((ref) => Firestore.instance
        .collection('aeroclubs/$aeroclubId/fleet')
        .snapshots()
        .map(...)),
  ).future;
  ...
}

// ✅ CORRECT — extract the stream into a stable @riverpod function provider
@riverpod
Stream<List<Aircraft>> aeroclubFleetById(Ref ref, String aeroclubId) {
  return ref.watch(firestoreProvider)
      .collection('aeroclubs/$aeroclubId/fleet')
      .snapshots()
      .map((snap) => snap.docs.map(Aircraft.fromFirestore).toList());
}

// Then watch the stable provider from the computed provider
@riverpod
Future<List<Aircraft>> availableAircraftForTimeSlot(
  Ref ref,
  String aeroclubId,
  String startTime,
  String endTime,
) async {
  final all = await ref.watch(aeroclubFleetByIdProvider(aeroclubId).future);
  // filter...
  return all.where(...).toList();
}
```

**Rule:** every `StreamProvider` or `Provider` must be a top-level,
code-generated (`@riverpod`) declaration.  If you need a parameterized
stream, use a family parameter in the function signature.

---

## Performance: select() for granular rebuilds

```dart
final userName = ref.watch(
  userProvider.select((user) => user.name),
);
```

