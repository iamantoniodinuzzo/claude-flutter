---
name: asset-preload-init
description: Fix first-frame asset pop-in in a Flutter app and audit its assets — inventories every file declared under `flutter: assets:`, maps each to the loader/cache that consumes it (SvgPicture.asset, Image.asset/AssetImage, engine registries like Flame, rootBundle, flutter_gen accessors, runtime-built paths), then generates only the warm-up that is actually needed (SVG via `SvgAssetLoader(path).loadBytes(null)` with errors handled at creation, overlapped with startup; context-based `precacheImage` for raster) and reports oversized and unused assets (report only, never deletes or resizes unasked). INIT when no warm-up exists, AUDIT when one does. Use when the user says "precache assets", "warm up assets", "logo pop-in", "asset flicker on first frame", "precacheImage", "unused assets", "oversized images", "asset audit", "ottimizza gli asset", or asks to speed up first-frame rendering of logos/icons.
user-invocable: true
---

# asset-preload-init

Removes first-frame asset pop-in and audits asset hygiene in a Flutter app. Run phases in order. The warm-up is only a
small part of the answer: most value comes from knowing which assets are really used, how each is loaded, and how big
they are. **Generate nothing for assets that do not need it.**

Before coding, load the references in parallel:

- `skills/asset-preload-init/references/loader-cache-matrix.md`
- `skills/asset-preload-init/references/size-and-dead-assets.md`

Usage: `/asset-preload-init [app-path]`

---

## Phase 0 — Intake & classify

1. **Melos**: if `melos.yaml` exists at the root, locate apps under the workspace packages. If `app-path` is missing and
   several apps exist, ask which one (one question). Paths below are relative to the chosen app.
2. **Targets**: `--platform` arg > `flutter.platforms` in `pubspec.yaml` > `all` (same precedence as
   `audit-presentation-layer`). State the result, e.g. `Target platforms: web, android (from pubspec)`.
3. **INIT vs AUDIT**: grep `lib/` for `SvgAssetLoader(`, `.loadBytes(null)`, `precacheImage(`, `precacheAssets`.
   - none found → **INIT**
   - found → **AUDIT** (report mismatches; never overwrite existing warm-up code)
4. Read `pubspec.yaml`: `flutter_svg` version, `flutter_gen`/`flutter_gen_runner`, `flame`, `flutter: assets:`.

---

## Phase 1 — Inventory and classify

1. Expand `flutter: assets:` (directories → files; quote paths with spaces).
2. For each file, find its consumers and map to the loader table (see `loader-cache-matrix.md`):

   | Consumer | Cache | Verdict |
   |---|---|---|
   | `SvgPicture.asset` | `svg.cache` | warm now / background |
   | `Image.asset` / `AssetImage` | `ImageCache` | warm now (needs context) / background |
   | Engine registry (Flame `Images`, sprite registry) | engine cache | already preloaded |
   | `rootBundle.load` only | none | no cache |
   | no consumer found | — | unused (after runtime-path check) |

   Also follow `flutter_gen` `Assets.*` accessors and **runtime-built paths** (prefix + enum `.name` + extension) —
   see `size-and-dead-assets.md` before concluding "unused".
3. For raster files read pixel size; compute decoded size `w × h × 4`; apply the hybrid oversize threshold.
4. Decide **first-frame vs later**: is the consumer reachable from the first route / app shell?
5. Emit the table:

   | File | Size | Px | Decoded | Consumers | First frame? | Loader/cache | Verdict |
   |---|---|---|---|---|---|---|---|

   Verdicts: `warm now`, `background`, `already preloaded`, `no cache`, `unused`, `oversized`.

---

## Phase 2 — Decisions

Use `AskUserQuestion` (recommendation first, max 1–2 blocking questions per round) for:

- **Await vs background**: await only first-screen assets; background the rest. On web, never await the full set.
- **Raster warm-up location** (only if raster first-frame assets exist): splash widget vs post-first-frame step.
- **Oversized files**: propose a resize command; never run it unasked.
- **Unused files**: report only by default; deletion is the user's call.

Skip questions whose inventory section is empty.

---

## Phase 3 — Generate

Only for assets whose verdict is `warm now` / `background`.

1. **Cache-key precondition (SVG)**: for every consuming widget check there is no `theme:`, `colorMapper:`, `bundle:`
   argument and no `DefaultSvgTheme` ancestor. If any holds, skip that asset and explain (the warm-up would silently miss).
2. **Share paths**: make the path constants public so the widget and the warm-up use the same string.
3. **SVG warm-up** in `main()`:

   ```dart
   final warmUp = Future.wait([
     for (final p in const [lightLogoPath, darkLogoPath]) SvgAssetLoader(p).loadBytes(null),
   ]).then<void>((_) {}, onError: (Object e) => debugPrint('[App] precache failed: $e'));
   // ... other startup work ...
   await warmUp;
   runApp(...);
   ```

   - Use `SvgAssetLoader(p).loadBytes(null)` directly — no `svg.cache.putIfAbsent` wrapper.
   - Attach the error handler **at creation**, not at the `await`.
   - Start early so it overlaps other startup work; await just before `runApp`.
   - Warm both light and dark variants.
   - Match the project's logging convention instead of `debugPrint` if one exists.
4. **Raster**: generate a context-based `precacheImage(AssetImage(path), context)` helper only if raster first-frame
   assets exist; call it post-first-frame or from the splash widget.
5. **Never generate** for engine-preloaded assets or `rootBundle`-only assets. If the inventory has nothing to warm, say
   so and generate nothing.
6. **Oversized files that cannot be edited**: suggest `cacheWidth`/`cacheHeight` or `ResizeImage` on the consumer.

---

## Phase 4 — Verify

1. `dart analyze` (or `flutter-analyze-targeted`) on touched files.
2. Run existing widget tests of touched widgets.
3. Manual checklist for the developer:
   - First frame shows the logo with no pop-in — on web **and** mobile.
   - Web network panel shows only the expected fetches before first paint.
   - Sprites/markers still sharp after any resize.

---

## Phase 5 — Summary

List: inventory table, files created/modified, assets deliberately not warmed (and why), oversized and unused findings
(report only), and the manual checklist.

---

## AUDIT branch

When a warm-up already exists, do not edit it. Report against the audit rules (same IDs as
`skills/audit-presentation-layer/rules/CATALOG.md`):

- **ASSET-01** — first-frame `SvgPicture.asset`/`Image.asset` with no warm-up.
- **ASSET-02** — raster over the size budget.
- **ASSET-03** — declared in pubspec but unreferenced (after runtime-path check).
- **ASSET-04** — warm-up unsafe or ineffective: error not handled at creation, cache key cannot match the widget's
  (`theme`/`colorMapper`/`bundle`/`DefaultSvgTheme`), or `precacheImage` used for an engine-managed cache.

Then offer targeted fixes; edit only what the user approves.

---

## Notes

- Never delete or resize files without explicit confirmation.
- Related skills: `audit-presentation-layer` (ASSET-01..04 on widget files), `flutter-melos-workspace` (multi-app repos),
  `flutter-analyze-targeted`.
- Optional adjacent tip for non-precachable images (network, long lists): `image_fade`'s `ImageFade` cross-fade — see
  `loader-cache-matrix.md`.
