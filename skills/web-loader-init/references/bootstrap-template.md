# flutter_bootstrap.js template

Canonical `web/flutter_bootstrap.js` for the boot loader. A custom file **replaces the generated one entirely**, so
every line here is deliberate.

## Template

```js
{{flutter_js}}
{{flutter_build_config}}

(function () {
  var loader = document.getElementById('app-loader');
  var bar = document.getElementById('app-loader-bar');

  function setProgress(pct) {
    if (!loader) return;
    if (bar) bar.style.width = pct + '%';
    loader.setAttribute('aria-valuenow', String(pct));
  }

  function hideLoader() {
    if (!loader) return;
    var node = loader;
    loader = null;
    setProgress(100);
    node.setAttribute('aria-busy', 'false');
    node.classList.add('app-loader--done');
    var removed = false;
    function remove() {
      if (removed) return;
      removed = true;
      node.remove();
    }
    node.addEventListener('transitionend', remove);
    // Reduced motion has no transition, so transitionend never fires.
    setTimeout(remove, 600);
  }

  // The engine dispatches this on `window` once the first frame is painted.
  window.addEventListener('flutter-first-frame', hideLoader, { once: true });

  setProgress(20);

  _flutter.loader.load({
    // >>> CONDITIONAL: emit only when the PWA strategy is not `none` <<<
    serviceWorkerSettings: {
      serviceWorkerVersion: {{flutter_service_worker_version}},
    },
    // >>> END CONDITIONAL <<<
    onEntrypointLoaded: async function (engineInitializer) {
      setProgress(50);
      var appRunner = await engineInitializer.initializeEngine();
      setProgress(80);
      await appRunner.runApp();
      setProgress(90);
    },
  });
})();
```

## Stages

| Stage | % | Trigger |
|---|---|---|
| bootstrap running | 20 | script start |
| entrypoint downloaded | 50 | `onEntrypointLoaded` |
| engine ready | 80 | `initializeEngine()` resolved |
| app started | 90 | `runApp()` resolved |
| first frame | 100 | `flutter-first-frame` -> fade -> remove |

## Why each non-obvious choice

- **IIFE (pitfall 8).** `flutter_bootstrap.js` is a *classic* script: a top-level `const loader` lands in the global
  lexical scope. In debug (`flutter run -d chrome`) `main.dart.js` is the DDC module loader and declares its own
  top-level `loader`, so the page dies with `Uncaught SyntaxError: Identifier 'loader' has already been declared
  (at main.dart.js:1:1)` and the app never starts. Release builds do not show it, so a `flutter build web` check
  misses it. Keep `{{flutter_js}}` / `{{flutter_build_config}}` **outside** the IIFE; they are replaced by the build
  tool and `_flutter` must exist before the IIFE runs. No top-level `const`/`let`/`class` anywhere.
- **`flutter-first-frame`, not `runApp()` (pitfall 1).** When `main()` awaits async init before `runApp` (Firebase,
  Sentry, Remote Config, `PackageInfo`, a provider container), `appRunner.runApp()` resolves before Flutter renders.
  Removing the loader right after `await appRunner.runApp()` leaves a blank page. `runApp()` resolving is only the
  90% stage.
- **Conditional `serviceWorkerSettings` (pitfall 3).** Dropping it silently changes PWA behaviour; keeping it with
  `--pwa-strategy=none` renders `{{flutter_service_worker_version}}` empty and yields a JS syntax error
  (`serviceWorkerVersion: ,`). Detect the strategy in discovery; when it is `none`, delete the whole
  `serviceWorkerSettings` block (including the markers).
- **Timeout fallback.** `prefers-reduced-motion` disables the fade, so `transitionend` never fires; the ~600 ms timer
  guarantees removal. The `removed` flag makes the two paths idempotent.
- **`{ once: true }` + nulling `loader`.** `hideLoader` is safe against a second event and against stage updates
  arriving after removal (`setProgress` returns early when `loader` is null).
