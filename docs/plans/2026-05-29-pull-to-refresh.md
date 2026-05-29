# Pull-to-Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a mobile-friendly pull-to-refresh interaction that reloads the latest static resources and re-renders the active tab without clearing local training data.

**Architecture:** Keep the current app state in `localStorage` untouched. Add a light touch gesture layer at the page level, limited to the top of the scroll container, that detects a downward drag when the user is already at scroll offset `0`. When the gesture crosses a small threshold, show a refresh affordance, then on release reload the shell assets and re-render the current tab so the UI reflects the newest code while preserving plans, check-ins, and custom exercises.

**Tech Stack:** Vanilla JavaScript, existing app state/render functions, current service worker strategy, browser flow tests in `test/runner.html`.

---

### Task 1: Map the scroll and refresh entry points

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

**Step 1: Inspect the current page structure**

- Confirm which element owns scrolling on mobile.
- Identify where the current tab render functions are called.
- Find the existing service worker registration path.

**Step 2: Add the minimal UI hooks**

- Add a top-edge pull-to-refresh affordance element.
- Add CSS for a hidden refresh indicator and a visible "releasing" state.
- Keep the control compact and mobile-first.

**Step 3: Do not implement the gesture yet**

- Only add the structural hooks needed for the next task.

**Step 4: Verify the page still loads cleanly**

Run:

```sh
python3 -m http.server 8939
```

Then open `http://127.0.0.1:8939/` and confirm the app still renders.

---

### Task 2: Implement pull gesture detection

**Files:**
- Modify: `js/app.js`

**Step 1: Write the failing browser test first**

- Add a test that simulates pulling down from the top and asserts the refresh affordance appears.
- Add a test that releasing after the threshold re-renders the current tab.
- Add a test that local plan/check-in data survives the refresh.

**Step 2: Run the tests and confirm they fail**

Run:

```sh
python3 -m http.server 8939
```

Open:

```text
http://127.0.0.1:8939/test/runner.html
```

Expected: the new tests fail because the gesture does not exist yet.

**Step 3: Implement the smallest gesture handler**

- Listen for touch/pointer start, move, and end on the app shell.
- Only activate when the scroll position is at the top.
- Ignore drags that start inside open overlays or form controls.
- Track a small threshold so accidental swipes do not refresh.

**Step 4: Wire the refresh action**

- On successful release, re-run the active tab renderer.
- Ask the service worker to fetch the latest shell resources.
- Do not clear `localStorage`.
- Do not mutate the current plan/check-in state.

**Step 5: Run the targeted tests**

Expected:
- Pull gesture shows the refresh affordance.
- Release triggers a single refresh cycle.
- The active tab remains on screen with the latest render.
- Plans, check-ins, and custom exercises remain intact.

---

### Task 3: Make refresh resilient across tabs and overlays

**Files:**
- Modify: `js/app.js`
- Modify: `test/app-flow.test.js`

**Step 1: Add guard rails**

- Disable pull-to-refresh while a modal is open.
- Disable it while the user is editing a field or interacting with chips.
- Prevent repeated refresh triggers until the current refresh finishes.

**Step 2: Add regression coverage**

- Verify the gesture does not fire from inside the add-custom-item modal.
- Verify a pull on the history tab re-renders the calendar and records.
- Verify a pull on the training tab preserves the selected check state.

**Step 3: Run the full browser suite**

Run:

```sh
python3 -m http.server 8939
```

Open `test/runner.html` and confirm the full suite passes with no console errors.

---

### Task 4: Final verification and commit

**Files:**
- Modify: any files changed above

**Step 1: Run the full browser flow suite**

Expected: all tests pass.

**Step 2: Manually verify the mobile interaction**

- Start from the top of the page.
- Pull down.
- See the refresh affordance.
- Release.
- Confirm the current tab re-renders and data stays intact.

**Step 3: Commit**

```bash
git add index.html css/style.css js/app.js test/app-flow.test.js docs/plans/2026-05-29-pull-to-refresh.md
git commit -m "feat: add mobile pull to refresh"
```
