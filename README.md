# sport_plat

`sport_plat` is a static mobile training planner. It generates weekly workout plans, tracks daily check-ins, records extra training items, and shows history/statistics in-browser with `localStorage`.

## What it includes

- Weekly plan generation
- Today training view
- Check-in history
- Basic stats
- Custom exercises
- Extra items added on the day

## Project Layout

- `index.html` - app shell
- `css/style.css` - mobile UI
- `js/app.js` - state, plan generation, rendering, check-ins
- `js/exercises.js` - built-in exercise library and image map
- `sw.js` - cache busting / offline shell
- `test/` - browser flow tests
- `docs/plans/` - design and implementation notes

## Run Locally

Serve the repo with any static server, then open `index.html`.

Example:

```sh
python3 -m http.server 8939
```

Open:

```text
http://127.0.0.1:8939/
```

## Test

Browser flow tests live in `test/runner.html`.

```sh
python3 -m http.server 8939
```

Open:

```text
http://127.0.0.1:8939/test/runner.html
```

## Notes

- Data is stored locally in the browser.
- No build step is required.
- When shipping UI changes, update the service worker version in `index.html`.
