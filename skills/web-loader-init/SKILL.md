---
name: web-loader-init
description: "Add a boot progress loader to a Flutter web app so users do not stare at a blank white page while main.dart.js, the renderer runtime, fonts and assets download — patches `web/index.html` with an accessible overlay (logo + staged progress bar), writes `web/style.css` (light/dark, reduced-motion) and a custom `web/flutter_bootstrap.js` (IIFE-wrapped, removes the loader on `flutter-first-frame`, conditional `serviceWorkerSettings` by PWA strategy). INIT when no loader exists, AUDIT when one does (WEB-02). Use when the user says \"flutter web blank page\", \"web loader\", \"web splash\", \"loading bar on web\", \"boot progress\", \"flutter_bootstrap.js\", \"white screen on web load\", \"schermata bianca web\", or asks to improve first paint on Flutter web."
user-invocable: true
---

# web-loader-init

## Runtime and resources

Use the current agent's native file, search, shell, and question tools; plain-text questions and direct sequential scans are valid fallbacks. Subagents are optional and require host permission. Bundled paths below are relative to this installed skill directory; application paths are relative to the target Flutter project. Resolve sibling skills through the installed skill registry (or sibling directories), never by assuming a `skills/` folder in the application. If a required dependency is absent, name it and report the affected step as unavailable; never invent its rules or claim complete coverage.

Adds a staged boot loader to a Flutter web app with no Dart changes. Flutter mounts into `<body>`, so HTML/CSS placed
there paints immediately; a custom `web/flutter_bootstrap.js` drives progress from the loader lifecycle hooks. Run
phases in order.

Before coding, load the references in parallel:

- `references/bootstrap-template.md`
- `references/markup-and-style.md`

Usage: `/web-loader-init [app-path]`

---

## Phase 0 — Target detection

1. **Melos**: if `melos.yaml` exists at the root, locate apps under the workspace packages. If `app-path` is missing
   and several apps have a `web/` folder, ask which one (one question). Paths below are relative to the chosen app.
2. **Web target**: require `web/index.html` **and** `web` in `flutter.platforms` of `pubspec.yaml` (or
   `--platform=web`). Otherwise **abort** with a clear message, e.g.
   `No web target: web/index.html not found. Run "flutter create . --platforms=web" first.` Generate nothing.
3. **INIT vs AUDIT**: check for an existing loader (an element before the bootstrap script in `<body>`, a
   `web/flutter_bootstrap.js`).
   - nothing found → **INIT**
   - found → **AUDIT** (see below). Never overwrite an existing custom `flutter_bootstrap.js` without diffing it
     against the template, showing the diff and asking.

---

## Phase 1 — Discovery

1. **Palette**: grep `lib/` for `ColorScheme.fromSeed`, `FlexSchemeColor`, `scaffoldBackgroundColor` and brand color
   classes. Resolve the light and dark scaffold background and the primary color. Report what you could not resolve.
2. **Logos**: `assets/**/logo*.{svg,png}`, light/dark variants, `web/icons`. Prefer SVG (~8 KB budget).
3. **Pre-`runApp` work**: read `main()` and list every awaited step before `runApp` (Firebase, Sentry, Remote Config,
   `PackageInfo`, provider container). This justifies removing the loader on `flutter-first-frame` instead of on
   `runApp()` resolve (pitfall 1).
4. **PWA strategy**: grep CI workflows, `melos.yaml`, scripts and docs for `--pwa-strategy`. Result is `none` or
   `default/offline-first`; if nothing is found assume the default (emit the `serviceWorkerSettings` block).

---

## Phase 2 — Decisions

One the agent's question tool, or a plain-text question round (recommendation first, max 1–2 blocking questions):

- **Loader shape**: logo + linear bar *(recommended)* / bar only / top-of-page bar with logo / spinner.
- **Dark mode**: `prefers-color-scheme` *(recommended; zero coupling, flashes if the user forced the opposite theme
  from the OS)* / stored theme (couples HTML to the SharedPreferences web key format) / always light.
- **Colors**: bg / track / bar taken from the discovered palette; confirm only if discovery was ambiguous.

Decisions are interactive only; there is no non-interactive flag.

---

## Phase 3 — Generate

1. **`web/index.html`**: add `<link rel="stylesheet" href="style.css">` and put the loader markup as the **first child
   of `<body>`** (`<picture>` with a dark `<source>`). Leave existing scripts (e.g. FCM service worker registration)
   untouched.
2. **`web/style.css`**: custom properties for light/dark, fixed overlay, fade, `prefers-reduced-motion`. Never style
   `body` as a flex container.
3. **`web/flutter_bootstrap.js`** from `bootstrap-template.md`: `{{flutter_js}}` / `{{flutter_build_config}}` outside
   the IIFE, everything else **inside** `(function () { ... })();`. Stages 20 → 50 → 80 → 90 → 100 (first frame).
   Emit `serviceWorkerSettings` **only** when the PWA strategy is not `none`.
4. **Logos**: copy into `web/` with safe names (no spaces; `LOGO X.svg` → `logo.svg`, dark variant `logo-dark.svg`);
   relative paths only so `<base href>` keeps working.

---

## Phase 4 — Verification checklist

Print for the developer (this skill cannot run a browser):

- `flutter build web` succeeds.
- Serve `build/web`; throttle to **Slow 4G**; check light **and** dark.
- After load, `document.getElementById('app-loader') === null`.
- No layout shift at the handover to Flutter.
- **Dev boot**: `flutter run -d chrome` (debug/DDC) still starts; console has no
  `Identifier ... has already been declared`. Release builds do not show that failure, so a build check alone misses it.

---

## Phase 5 — Summary

List files created/modified, decisions taken, PWA strategy detected, and the checklist. If the repo keeps a
hand-curated CHANGELOG, remind the user to add an entry; do not edit it blindly.

---

## Pitfalls (all enforced by the templates)

1. `runApp()` resolving is not "first frame painted" → remove on `flutter-first-frame` (on `window`).
2. No `display: flex` on `body` → fixed overlay.
3. A custom bootstrap replaces the generated one → keep `serviceWorkerSettings`, but only when the PWA strategy allows
   it (the token renders empty with `--pwa-strategy=none` → JS syntax error).
4. Keep it tiny: reuse the existing SVG logos, no big images/animations.
5. The loader runs before Dart: it cannot read `ThemeMode`; document the `prefers-color-scheme` trade-off.
6. No spaces in `web/` asset names; relative paths.
7. Honour `prefers-reduced-motion`; `role="progressbar"`, `aria-busy`, `aria-label`.
8. Wrap the bootstrap body in an IIFE (classic script: top-level `const loader` collides with the DDC loader in
   debug).

---

## AUDIT branch

When a loader already exists, do not edit it. Report against **WEB-02** (`../audit-presentation-layer/rules/CATALOG.md`):

- (a) no visible `<body>` element before the bootstrap script
- (b) custom bootstrap never listens for `flutter-first-frame`
- (c) top-level `const`/`let`/`class` outside an IIFE or block
- (d) custom bootstrap missing `serviceWorkerSettings` without `--pwa-strategy=none`
- (e) loader styles on `body`

Then offer targeted fixes; edit only what the user approves.

---

## Notes

- Never overwrite an existing custom `flutter_bootstrap.js` without a diff and confirmation.
- Related skills: `audit-presentation-layer` (WEB-02 on an app-root run), `flutter-melos-workspace` (multi-app repos),
  `flutter-flavors` (flavored web builds: run this skill once per app, not per flavor).
