# sport_plat

Static mobile workout planner. Keep the app simple, browser-only, and data-local.

## Rules

- Do not change the core plan generation logic unless explicitly requested.
- Preserve `localStorage` data shape.
- Keep `index.html`, `css/style.css`, and `js/app.js` in sync when changing UI flow.
- Update the service worker cache-bust version in `index.html` when shipping user-visible changes.
- Prefer small, readable edits over framework rewrites.

## Core Files

- `index.html` - app shell and tab order
- `css/style.css` - shell, cards, tabs, modals, mobile layout
- `js/app.js` - plan generation, today view, history, stats, storage
- `js/exercises.js` - exercise catalog and image mapping
- `test/runner.html` - browser flow test entry
- `docs/plans/` - current design and implementation notes

## Important State

- `sport_plat` - main app data
- `sport_plat_custom_ex` - custom exercise list
- `sport_plat_active_tab` - last active tab

## Local Test Flow

```sh
python3 -m http.server 8939
```

Open:

```text
http://127.0.0.1:8939/test/runner.html
```

## Working Notes

- The app is static and should stay static.
- Plan generation, check-ins, and stats are intentionally browser-local.
- Docs for current direction live in `docs/plans/`.
