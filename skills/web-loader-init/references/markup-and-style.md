# Loader markup and style

Flutter mounts into `<body>`, so HTML/CSS placed there paints immediately, before any Dart runs.

## `web/index.html`

Add inside `<head>`:

```html
<link rel="stylesheet" href="style.css">
```

Add as the **first child of `<body>`**, before every script:

```html
<div id="app-loader" role="progressbar" aria-label="Loading" aria-busy="true"
     aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
  <picture>
    <source srcset="logo-dark.svg" media="(prefers-color-scheme: dark)">
    <img src="logo.svg" alt="" width="96" height="96">
  </picture>
  <div class="app-loader__track"><div id="app-loader-bar" class="app-loader__bar"></div></div>
</div>
```

Keep existing scripts (e.g. FCM service worker registration) untouched. All paths relative so `<base href>` keeps
working. Localise `aria-label` if the app is not English.

## `web/style.css`

```css
:root {
  --loader-bg: #ffffff;
  --loader-track: #e5e7eb;
  --loader-bar: #1e66f5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --loader-bg: #111418;
    --loader-track: #2a2f36;
    --loader-bar: #7aa7ff;
  }
}

#app-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: var(--loader-bg);
  opacity: 1;
  transition: opacity 300ms ease-out;
}
#app-loader.app-loader--done { opacity: 0; pointer-events: none; }

.app-loader__track {
  width: min(240px, 60vw);
  height: 4px;
  border-radius: 2px;
  background: var(--loader-track);
  overflow: hidden;
}
.app-loader__bar {
  width: 0;
  height: 100%;
  background: var(--loader-bar);
  transition: width 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  #app-loader, .app-loader__bar { transition: none; }
}
```

Colors above are placeholders: substitute the discovered light/dark scaffold background (`--loader-bg`) and primary
(`--loader-bar`); derive the track from the background.

## Rules this enforces

- **Overlay, not `body` styling (pitfall 2).** `display: flex` on `body` (common in blog snippets) disturbs Flutter's
  host element layout. The `position: fixed; inset: 0` overlay leaves it untouched. The `flex` above is on
  `#app-loader`, never on `body`.
- **Tiny (pitfall 4).** The loader ships with the first request. Reuse the app's existing SVG logos (~8 KB); no big
  images or animations.
- **Theme (pitfall 5).** The loader runs before Dart so it cannot read `ThemeMode`. Strategies:
  - `prefers-color-scheme` (default): zero coupling; trade-off is a flash if the user forced the opposite theme from
    the OS.
  - stored theme: read the SharedPreferences web key (`flutter.<key>` in `localStorage`) in a tiny inline script that
    sets `data-theme`; couples HTML to the storage format and breaks if it changes.
  - always light: simplest, wrong for dark-forced users.
- **File names (pitfall 6).** No spaces in `web/` asset names (copy `LOGO X.svg` to `logo.svg`); relative paths only.
- **Accessibility and motion (pitfall 7).** `role="progressbar"`, `aria-busy`, `aria-label`; the
  `prefers-reduced-motion` block makes every transition inert (the bootstrap's timeout handles removal).

## Shape variants

| Shape | Change |
|---|---|
| logo + linear bar (default) | markup above |
| bar only | drop `<picture>`; keep the track |
| top-of-page bar with logo | overlay `justify-content: flex-start`; track `width: 100%` pinned top, logo centred below via an extra wrapper |
| spinner | replace the track with a CSS-only `border` spinner; `setProgress` still updates `aria-valuenow`, bar width is ignored; gate its `animation` under `prefers-reduced-motion: no-preference` |
