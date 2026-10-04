# Platform matrix

## Builders per option

| Option | Android | iOS | macOS / Windows / Linux / Fuchsia | Web (any platform) |
|--------|---------|-----|-----------------------------------|--------------------|
| **Default (recommended)** | `ZoomPageTransitionsBuilder` | `CupertinoPageTransitionsBuilder` | instant | instant |
| Predictive Back | `PredictiveBackPageTransitionsBuilder` | `CupertinoPageTransitionsBuilder` | instant | instant |
| Fade-through | `FadeForwardsPageTransitionsBuilder` | `CupertinoPageTransitionsBuilder` | instant | instant |
| Native everywhere | Zoom | Cupertino | Zoom/Cupertino per OS | native (no gate) |

**Web caveat**: mobile browsers report `TargetPlatform.android`/`iOS`, so the `kIsWeb` gate on those two entries is
required, not optional.

**Predictive Back**: Android 14+ only (older versions fall back). Requires
`android:enableOnBackInvokedCallback="true"` on `<application>` in `AndroidManifest.xml`.

## Theme file template

```dart
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

/// Native transitions on installed Android/iOS, instant on web and desktop.
const PageTransitionsTheme appPageTransitionsTheme = PageTransitionsTheme(
  builders: {
    // Mobile browsers report android/iOS too, so gate on kIsWeb.
    TargetPlatform.android: kIsWeb ? _NoPageTransitionsBuilder() : ZoomPageTransitionsBuilder(),
    TargetPlatform.iOS: kIsWeb ? _NoPageTransitionsBuilder() : CupertinoPageTransitionsBuilder(),
    TargetPlatform.macOS: _NoPageTransitionsBuilder(),
    TargetPlatform.windows: _NoPageTransitionsBuilder(),
    TargetPlatform.linux: _NoPageTransitionsBuilder(),
    TargetPlatform.fuchsia: _NoPageTransitionsBuilder(),
  },
);

class _NoPageTransitionsBuilder extends PageTransitionsBuilder {
  const _NoPageTransitionsBuilder();

  @override
  Duration get transitionDuration => Duration.zero;

  @override
  Duration get reverseTransitionDuration => Duration.zero;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) => child;
}
```

- Dart >= 3.10: map keys may use dot-shorthands (`.android:`); otherwise keep `TargetPlatform.android`.
- A `const` map with `kIsWeb ? const A() : const B()` values is a valid compile-time constant.
- Swap the Android/iOS builders per the chosen matrix row; keep the gate.

## Wiring

```dart
ThemeData(
  // ...
  pageTransitionsTheme: appPageTransitionsTheme,
)

FlexThemeData.light(
  // ...
  pageTransitionsTheme: appPageTransitionsTheme, // FlexThemeData's own parameter
)

baseTheme.copyWith(pageTransitionsTheme: appPageTransitionsTheme) // when only copyWith builds exist
```

Apply to **every** light and dark site discovered in Phase 1.
