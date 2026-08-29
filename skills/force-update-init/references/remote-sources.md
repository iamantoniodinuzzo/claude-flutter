# Remote Sources — Gist, Firebase Remote Config, Custom Backend

> Course shape (Andrea Bizzotto, *Flutter in Production*, "Force Update Strategies" module). Adapted to
> this toolkit's conventions — inline provenance, no upstream file to attribute.

---

## `upgrader` vs `force_update_helper`

Two ways to solve force update in Flutter, worth stating explicitly since a user may ask why this skill
implements the second and not the first:

- **[upgrader](https://pub.dev/packages/upgrader)** compares the version in `pubspec.yaml` against what's
  published on the store, and shows an alert **every time** there's a newer version available. No remote
  control — you cannot choose to *not* prompt for a minor release, and you cannot force an update to a
  specific version without first publishing it.
- **[force_update_helper](https://pub.dev/packages/force_update_helper)** fetches a `required_version` from
  a remote source you control, and only prompts when the installed version is below it. This is the
  difference that matters for the course's real use cases: retiring a backend endpoint, patching a security
  bug, or migrating to a new backend — all of which need the update to be *triggered on your schedule*, not
  on the store's release cadence.

`force-update-init` implements only the second. If a target already has `upgrader` installed, the AUDIT
branch flags it; migration is a product decision (do you want "nag on every release" or "block below a
floor"), not something this skill decides for the user.

---

## Source 1 — GitHub Gist

**No backend, no Firebase SDK.** Fetch a raw JSON file from a Gist URL.

### Shape

```json
{
  "config" : {
    "required_version": "0.4.0"
  }
}
```

### Client

```dart
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'remote_config_gist_client.g.dart';

class RemoteConfigGistData {
  RemoteConfigGistData({required this.requiredVersion});
  final String requiredVersion;

  factory RemoteConfigGistData.fromJson(Map<String, dynamic> json) {
    final requiredVersion = json['config']?['required_version'];
    if (requiredVersion == null) {
      throw FormatException('required_version not found in JSON: $json');
    }
    return RemoteConfigGistData(requiredVersion: requiredVersion);
  }
}

/// An API client class for fetching a remote config JSON from a GitHub gist
class RemoteConfigGistClient {
  const RemoteConfigGistClient({required this.dio, required this.flavor});
  final Dio dio;
  final Flavor flavor; // omit the flavor param entirely for an unflavored app

  Future<RemoteConfigGistData> fetchRemoteConfig() async {
    const owner = 'YOUR_GITHUB_USERNAME';
    final gistId = switch (flavor) {
      // One entry per LIVE flavor from Phase 0.5. Non-live arms can point at a
      // gist whose required_version is a floor value, or share one gist.
      Flavor.prod => 'YOUR_PROD_GIST_ID',
    };
    const fileName = 'remote_config.json';
    final url = 'https://gist.githubusercontent.com/$owner/$gistId/raw/$fileName';
    final response = await dio.get(url);
    final jsonData = jsonDecode(response.data);
    return RemoteConfigGistData.fromJson(jsonData);
  }
}

@Riverpod(keepAlive: true)
RemoteConfigGistClient remoteConfigGistClient(Ref ref) {
  final dio = ref.watch(dioProvider);
  return RemoteConfigGistClient(dio: dio, flavor: getFlavor());
}
```

### Creating gists

Go to [gist.new](https://gist.new), set filename + JSON content, click **"Create secret gist"** — it
doesn't need to be public, only the URL needs to be known. One gist per live flavor if flavored.

### Rate limits

- **Unauthenticated**: 60 requests/hour **per IP address**. Fine for small-to-medium apps fetching once per
  launch — the limit is per-IP, so each user gets their own budget, and it only bites when many users share
  one IP (corporate networks, mobile carrier NAT).
- **Authenticated** (personal access token): 5,000 requests/hour, but shared across the whole token, not
  per-user — still needs sensible fetch frequency.
- For high-traffic apps, prefer Remote Config or a custom backend instead.

### Limitations

- No real-time updates — fetched once at app launch, not pushed.
- Rate limits as above.

---

## Source 2 — Firebase Remote Config

Best when the app already pays the Firebase SDK cost — centralized console control, no extra
infrastructure.

### Console setup

1. Select the **production** Firebase project (force update is a prod-only concern per Phase 0.5's default).
2. Run → Remote Config → Create configuration.
3. Parameter name `required_version`, default value = current shipped version, Save, Publish changes.

### Provider — production-grade shape (not the naive docs snippet)

```dart
import 'dart:async';
import 'dart:developer';

import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'firebase_remote_config_provider.g.dart';

@Riverpod(keepAlive: true)
Future<FirebaseRemoteConfig> firebaseRemoteConfig(Ref ref) async {
  // Firebase throttles to a default 12h minimum fetch interval outside of this
  // setting — see https://firebase.google.com/docs/remote-config/get-started?platform=flutter#throttling
  final minimumFetchIntervalMinutes = isProdFlavor ? 12 : 1;
  final remoteConfig = FirebaseRemoteConfig.instance;
  await remoteConfig.setConfigSettings(
    RemoteConfigSettings(
      fetchTimeout: const Duration(minutes: 1),
      minimumFetchInterval: Duration(minutes: minimumFetchIntervalMinutes),
    ),
  );
  // Default value covers first launch while offline.
  await remoteConfig.setDefaults({'required_version': '0.1.0'});
  // Strategy 3 (load new values for next startup): activate what was already
  // fetched, then kick off a background fetch for the *next* launch.
  await remoteConfig.activate();
  if (!kIsWeb) {
    unawaited(remoteConfig.fetch());
    final sub = remoteConfig.onConfigUpdated.listen((event) {
      log('Updated keys: ${event.updatedKeys}', name: 'Remote Config');
      // Intentionally does nothing else — new values activate on next app start.
    });
    ref.onDispose(sub.cancel);
  }
  return remoteConfig;
}
```

Usage in `ForceUpdateClient`:

```dart
fetchRequiredVersion: () async {
  final remoteConfig = await ref.read(firebaseRemoteConfigProvider.future);
  return remoteConfig.getString('required_version');
},
```

### Throttling

Default minimum fetch interval is **12 hours** — configs won't be re-fetched from the backend more
frequently than that regardless of call count, unless you use the real-time listener above (which still
only activates on the *next* app start, not live).

### Limitations

- Requires Firebase already in the project (or adds it just for this, which is a heavier lift than a gist).
- No hard rate limit like Gist, but throttled as above.

---

## Source 3 — Custom backend (Dart Shelf)

Best when the app already has backend infrastructure — one more endpoint is cheap to add and keeps
everything in one place.

### Server (full source — do not tell the user to `dart pub unpack force_update_helper` for this; the
published package archive contains only `lib/`, not the example server folder)

`server/lib/server.dart`:

```dart
import 'dart:io';

import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;

// Minimum required version of the Flutter app.
// Read from an env var so each deployed environment can set its own.
String get kRequiredVersion => Platform.environment['REQUIRED_VERSION'] ?? '0.1.0';

Future<Response> handleRequest(Request request) async {
  return switch (request.url.path) {
    'required_version' => Future.value(requiredVersion(request)),
    _ => Future.value(Response.notFound('Not found')),
  };
}

Response requiredVersion(Request request) {
  return Response.ok(kRequiredVersion);
}

void main() async {
  final handler =
      const Pipeline().addMiddleware(logRequests()).addHandler(handleRequest);

  final server = await io.serve(
    handler,
    InternetAddress.anyIPv4,
    int.tryParse(Platform.environment['PORT'] ?? '8080') ?? 8080,
  );
  print('Serving at http://${server.address.host}:${server.port}');
}
```

`server/pubspec.yaml`:

```yaml
name: force_update_server
environment:
  sdk: ^3.5.0
dependencies:
  shelf: ^1.4.2
```

Run locally: `dart run lib/server.dart`. Test: `curl http://0.0.0.0:8080/required_version` — returns the
version as a **plain-text body**, not JSON (unlike the Gist source, which is JSON).

### Client

```dart
ForceUpdateClient(
  fetchRequiredVersion: () async {
    final response = await ref.read(dioProvider).get('$baseUrl/required_version');
    return response.data as String;
  },
  iosAppStoreId: APP_STORE_ID_DART_EXPR,
)
```

`baseUrl` points to `http://0.0.0.0:8080` for local testing; **must** point to a publicly deployed URL in
production. If flavored, one base URL per live flavor (e.g.
`https://prod-shelf-backend-xxxx.your-app.com`).

### Deployment options

Not scaffolded by this skill — pick one when ready:

- **Docker image** on Google Cloud Run, Amazon ECS, Azure Container Instances.
- **VM/VPS** — Azure Virtual Machines, Google Compute Engine, Amazon EC2, DigitalOcean Droplets. Run in JIT
  for dev, compile AOT for production.
- **Dedicated server** — full control, highest cost/complexity.
- **Global edge network** — [Globe](https://globe.dev/) is the option that actually deploys a Dart
  *server* to the edge (Dart Edge / Cloudflare Workers / Vercel Edge Functions run serverless *functions*,
  a different model — you have a server, not a function, here).

See:
- [4 Ways to deploy your Dart backend](https://globe.dev/blog/4-ways-deploy-dart-backend/)
- [How to Build and Deploy a Dart Shelf App on Globe.dev](https://codewithandrea.com/articles/build-deploy-dart-shelf-app-globe/)

### Limitations

- You own the deploy pipeline, uptime, and TLS termination.
- No built-in rate limiting or throttling — add your own if needed.
