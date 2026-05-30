# sport_plat Today-first Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `sport_plat` open on `训练`, keep the existing plan generator intact, and redesign the view layer so first-time users can immediately understand and start using the tool.

**Architecture:** Keep the workout generation and check-in state machine in `js/app.js` unchanged. Only adjust the default tab, the rendering order, the empty-state copy, and the CSS for the mobile tool shell. Preserve `localStorage` structure and service worker behavior.

**Tech Stack:** Vanilla HTML, CSS, and JavaScript; browser `localStorage`; service worker cache busting; static GitHub Pages-style deployment.

---

### Task 1: Lock the default entry to `训练`

**Files:**
- Modify: `js/app.js:19-37,1501-1510`
- Modify: `index.html:1-40`

**Step 1: Write the failing test**

```javascript
// test/app-flow.test.js
test('defaults to training tab when no saved tab exists', () => {
  // render app with empty sessionStorage
  // expect tab-today to be active on init
});
```

**Step 2: Run test to verify it fails**

Run: `node test/runner.html` or existing browser flow test command used by this repo

Expected: the app still opens on `计划`

**Step 3: Write minimal implementation**

- Set the runtime default tab to `today`
- Keep `sessionStorage` restoration as the first choice
- Update header/tab labels only if needed to match the new order

**Step 4: Run test to verify it passes**

Run: same browser flow test command

Expected: default active tab is `训练`

**Step 5: Commit**

```bash
git add js/app.js index.html test/app-flow.test.js
git commit -m "feat: default sport_plat to training tab"
```

### Task 2: Rebuild `训练` as the first-screen entry

**Files:**
- Modify: `js/app.js:1049-1240`

**Step 1: Write the failing test**

```javascript
test('training tab shows first-run guidance when no plan exists', () => {
  // empty state
  // expect a single primary CTA to create a plan
});
```

**Step 2: Run test to verify it fails**

Expected: current no-plan rendering still points users to the plan tab instead of guiding them in-place

**Step 3: Write minimal implementation**

- Change empty-state content to first-run guidance
- Add a direct CTA that jumps to `计划`
- Keep the rest of the training state rendering intact

**Step 4: Run test to verify it passes**

Expected: `训练` is usable as the homepage

**Step 5: Commit**

```bash
git add js/app.js test/app-flow.test.js
git commit -m "feat: make training tab the first screen"
```

### Task 3: Reposition `计划` as configuration center

**Files:**
- Modify: `js/app.js:564-767`

**Step 1: Write the failing test**

```javascript
test('plan tab still restores existing selections and plan summary', () => {
  // existing plan
  // expect summary first, config second
});
```

**Step 2: Run test to verify it fails**

Expected: plan tab still feels like the old primary page

**Step 3: Write minimal implementation**

- Keep all generation controls
- Make the current plan summary visually dominant
- Demote the form into a configuration section

**Step 4: Run test to verify it passes**

Expected: plan tab is clearly a config center

**Step 5: Commit**

```bash
git add js/app.js test/app-flow.test.js
git commit -m "feat: reposition plan tab as config center"
```

### Task 4: Tighten history and stats information order

**Files:**
- Modify: `js/app.js:1306-1495`

**Step 1: Write the failing test**

```javascript
test('history and stats remain readable for unknown or sparse data', () => {
  // historical checkin with missing exercise id
});
```

**Step 2: Run test to verify it fails**

Expected: existing rendering is not yet optimized for first-read clarity

**Step 3: Write minimal implementation**

- Keep the current data model
- Reorder summaries so the important numbers appear first
- Preserve fallback text for unknown exercise ids

**Step 4: Run test to verify it passes**

Expected: history and stats remain compatible and easier to scan

**Step 5: Commit**

```bash
git add js/app.js test/app-flow.test.js
git commit -m "feat: improve history and stats readability"
```

### Task 5: Refresh the mobile shell styling

**Files:**
- Modify: `css/style.css:1-260`

**Step 1: Write the failing test**

```javascript
test('mobile shell keeps one clear primary action at a time', () => {
  // visual/DOM assertions for hero/button ordering
});
```

**Step 2: Run test to verify it fails**

Expected: the current shell still looks like a dense tool

**Step 3: Write minimal implementation**

- Increase clarity of hero, spacing, and button hierarchy
- Keep the existing dark tool aesthetic
- Do not introduce a marketing layout or a new color system

**Step 4: Run test to verify it passes**

Expected: the tool feels cleaner and easier to scan on mobile

**Step 5: Commit**

```bash
git add css/style.css test/app-flow.test.js
git commit -m "feat: polish the mobile tool shell"
```

### Task 6: Verify the full flow end to end

**Files:**
- Modify: none

**Step 1: Run the flow test**

Run: `python3 -m unittest` or the repository's current browser flow test command

**Expected:** all flow cases pass

**Step 2: Run a quick browser smoke check**

Run the local page and confirm:

- first open lands on `训练`
- no-plan state shows a direct CTA to plan generation
- existing plan still renders today’s workout
- check-in still works

**Step 3: Commit final state**

```bash
git add css/style.css index.html js/app.js docs/plans/2026-05-30-today-first-tool-design.md docs/plans/2026-05-30-today-first-tool-implementation.md
git commit -m "feat: make sport_plat today-first"
```
