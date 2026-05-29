const frame = document.getElementById('app-frame');
const resultsEl = document.getElementById('results');
const summaryEl = document.getElementById('summary');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForFrameLoad() {
  return new Promise(resolve => {
    frame.addEventListener('load', resolve, { once: true });
  });
}

async function waitForAppReady() {
  for (let i = 0; i < 100; i++) {
    if (typeof app().renderPlanTab === 'function' && typeof app().switchTab === 'function') return;
    await wait(20);
  }
  throw new Error('App iframe did not finish loading');
}

function app() {
  return frame.contentWindow;
}

function doc() {
  return frame.contentDocument;
}

function clickChip(groupSelector, value) {
  const chip = [...doc().querySelectorAll(`${groupSelector} .chip`)].find(el => el.dataset.val === String(value));
  assert(chip, `Missing chip ${groupSelector}=${value}`);
  chip.click();
}

function selectedValues(groupSelector) {
  return [...doc().querySelectorAll(`${groupSelector} .chip.selected`)].map(el => el.dataset.val);
}

function currentPlan() {
  return app().getCurrentPlan();
}

async function resetApp() {
  const load = waitForFrameLoad();
  frame.src = `../index.html?t=${Date.now()}-${Math.random()}`;
  await load;
  await waitForAppReady();

  app().localStorage.clear();
  try {
    if ('serviceWorker' in app().navigator) {
      const regs = await app().navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
  } catch {}
  try {
    if ('caches' in app()) {
      const keys = await app().caches.keys();
      await Promise.all(keys.map(key => app().caches.delete(key)));
    }
  } catch {}
  app().renderPlanTab();
  app().switchTab('plan');
}

async function generateBasicPlan() {
  clickChip('#goal-chips', '胸');
  clickChip('#days-chips', '3');
  clickChip('#duration-chips', '30');
  clickChip('#equip-chips', '自重');
  doc().getElementById('btn-generate').click();
  await wait(450);
}

function makeTodayPlan() {
  const today = app().todayDayName();
  const exercise = app().getAllExercises().find(ex => ex.id === 'e19');
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const days = Object.fromEntries(weekdays.map(day => [
    day,
    day === today ? { targets: ['胸'], exercises: [exercise] } : null,
  ]));
  app().savePlan({
    id: 'test_plan',
    createdAt: new Date().toISOString(),
    goals: ['胸'],
    daysPerWeek: 3,
    durationPerDay: 30,
    equipment: ['自重'],
    days,
  });
}

async function addExtraItem(name = '拉伸', duration = '10') {
  doc().getElementById('btn-add-custom-item').click();
  doc().getElementById('aci-name').value = name;
  doc().getElementById('aci-duration').value = duration;
  doc().getElementById('aci-save').click();
  await wait(20);
}

function clickCustomItemToggle() {
  const dot = doc().querySelector('.exercise-done[data-customid]');
  assert(dot, 'Missing custom item toggle');
  dot.click();
}

test('generates a weekly plan from selected goals, days, duration, and equipment', async () => {
  await resetApp();
  await generateBasicPlan();

  const plan = currentPlan();
  assert(plan, 'Plan was not saved');
  assert(plan.goals.includes('胸'), 'Selected goal was not saved');
  assert(plan.daysPerWeek === 3, 'Selected days per week was not saved');
  assert(plan.durationPerDay === 30, 'Selected duration was not saved');
  assert(plan.equipment.includes('自重'), 'Selected equipment was not saved');
  assert(doc().querySelector('#plan-result .card'), 'Generated plan was not rendered');
});

test('returning to plan tab after training keeps modify controls visible', async () => {
  await resetApp();
  await generateBasicPlan();

  app().switchTab('today');
  app().switchTab('plan');

  const btn = doc().getElementById('btn-generate');
  const rect = btn.getBoundingClientRect();
  assert(getComputedStyle(btn).display !== 'none', 'Generate button is hidden after returning to plan tab');
  assert(rect.width > 0 && rect.height >= 44, 'Generate button is not usable after returning to plan tab');
  assert(selectedValues('#goal-chips').includes('胸'), 'Plan goal selection was not restored');
  assert(doc().querySelector('#plan-result .card'), 'Plan result disappeared after tab switch');
});

test('edit plan button restores controls and clears only the rendered result', async () => {
  await resetApp();
  await generateBasicPlan();

  doc().getElementById('btn-edit-plan').click();

  const btn = doc().getElementById('btn-generate');
  assert(getComputedStyle(btn).display !== 'none', 'Generate button is hidden after clicking edit');
  assert(!doc().querySelector('#plan-result .card'), 'Plan result should be cleared while editing');
  assert(selectedValues('#goal-chips').includes('胸'), 'Existing plan choices should remain selected for editing');
});

test('regenerating a plan keeps the same constraints while replacing the saved plan', async () => {
  await resetApp();
  await generateBasicPlan();

  const before = currentPlan();
  const beforeId = before.id;
  doc().getElementById('btn-regenerate').click();
  await wait(350);

  const after = currentPlan();
  assert(after, 'Regenerated plan was not saved');
  assert(after.id !== beforeId, 'Regenerated plan should replace the previous plan');
  assert(after.goals.join(',') === before.goals.join(','), 'Goals changed during regeneration');
  assert(after.daysPerWeek === before.daysPerWeek, 'Days per week changed during regeneration');
  assert(after.durationPerDay === before.durationPerDay, 'Duration changed during regeneration');
  assert(after.equipment.join(',') === before.equipment.join(','), 'Equipment changed during regeneration');
  assert(doc().querySelector('#plan-result .card'), 'Regenerated plan was not rendered');
});

test('replacing an exercise updates the plan without losing the day layout', async () => {
  await resetApp();

  const plan = {
    id: 'replace_plan',
    createdAt: new Date().toISOString(),
    goals: ['胸'],
    daysPerWeek: 1,
    durationPerDay: 30,
    equipment: ['自重'],
    days: {
      周一: null,
      周二: null,
      周三: { targets: ['胸'], exercises: [app().getAllExercises().find(ex => ex.id === 'e19')] },
      周四: null,
      周五: null,
      周六: null,
      周日: null,
    },
  };
  app().savePlan(plan);
  app().renderPlanResult(plan);

  const beforeId = currentPlan().days['周三'].exercises[0].id;
  doc().querySelector('.replace-btn').click();
  await wait(50);

  const option = doc().querySelector('.replace-option');
  assert(option, 'Replace modal did not show alternatives');
  option.click();
  await wait(50);

  const after = currentPlan();
  assert(after.days['周三'].targets.includes('胸'), 'Day targets changed after replacement');
  assert(after.days['周三'].exercises.length === 1, 'Day exercise count changed after replacement');
  assert(after.days['周三'].exercises[0].id !== beforeId, 'Exercise was not replaced');
  assert(doc().querySelector('#plan-result .card'), 'Replaced plan was not rendered');
});

test('today tab shows a rest state when the current day is not scheduled', async () => {
  await resetApp();

  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const today = app().todayDayName();
  app().savePlan({
    id: 'rest_plan',
    createdAt: new Date().toISOString(),
    goals: ['胸'],
    daysPerWeek: 1,
    durationPerDay: 30,
    equipment: ['自重'],
    days: Object.fromEntries(weekdays.map(day => [day, day === today ? null : { targets: ['胸'], exercises: [app().getAllExercises().find(ex => ex.id === 'e19')] }])),
  });

  app().renderToday();

  assert(doc().querySelector('#tab-today .empty'), 'Rest day did not render an empty state');
  assert(doc().body.textContent.includes('今天是休息日'), 'Rest day message was missing');
});

test('custom exercises are available for future goals and equipment choices', async () => {
  await resetApp();

  app().addCustomExercise({
    name: '引体向上',
    target: '背',
    equipment: '单杠',
    duration: 5,
    sets: 3,
    reps: '8',
    desc: '控制下放',
  });
  app().renderPlanTab();

  assert([...doc().querySelectorAll('#goal-chips .chip')].some(el => el.dataset.val === '背'), 'Custom target was not available');
  assert([...doc().querySelectorAll('#equip-chips .chip')].some(el => el.dataset.val === '单杠'), 'Custom equipment was not available');
});

test('custom exercise output escapes HTML and normalizes empty numeric fields', async () => {
  await resetApp();

  app().addCustomExercise({
    name: '<img src=x onerror=alert(1)>',
    target: '胸',
    equipment: '自重',
    duration: '',
    sets: '',
    reps: '',
    desc: '<b>bad</b>',
  });
  app().renderPlanTab();

  const item = doc().querySelector('#custom-ex-list .exercise-item');
  const custom = app().loadCustomExercises()[0];
  assert(item, 'Custom exercise was not rendered');
  assert(!item.querySelector('img'), 'Custom exercise HTML was injected as markup');
  assert(item.textContent.includes('<img'), 'Escaped custom name was not visible as text');
  assert(custom.duration === 5, 'Empty duration was not normalized to default');
  assert(custom.sets === 1, 'Empty sets was not normalized to default');
  assert(custom.reps === '-', 'Empty reps was not normalized to placeholder');
});

test('adding an extra item before check-in does not create a check-in or pollute planned progress', async () => {
  await resetApp();
  makeTodayPlan();
  app().renderToday();

  await addExtraItem('拉伸', '10');

  assert(!app().getTodayCheckin(app().todayStr()), 'Extra item created check-in too early');
  const label = doc().getElementById('btn-checkin').textContent.trim();
  assert(label.includes('已选 0/2'), `Planned progress was not counting the extra item: ${label}`);
  assert(doc().querySelector('.exercise-done[data-customid]') && !doc().querySelector('.exercise-done[data-customid]').classList.contains('checked'), 'Custom item should start unchecked');
});

test('checking in with only extra items saves custom duration and no planned exercises', async () => {
  await resetApp();
  const today = app().todayDayName();
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  app().savePlan({
    id: 'extra_only_plan',
    createdAt: new Date().toISOString(),
    goals: ['核心'],
    daysPerWeek: 1,
    durationPerDay: 30,
    equipment: ['自重'],
    days: Object.fromEntries(weekdays.map(day => [
      day,
      day === today ? { targets: ['核心'], exercises: [] } : null,
    ])),
  });
  app().renderToday();

  await addExtraItem('拉伸', '10');
  clickCustomItemToggle();
  const btn = doc().getElementById('btn-checkin');
  assert(!btn.disabled, 'Check-in button should be enabled when extra items exist');
  btn.click();

  const checkin = app().getTodayCheckin(app().todayStr());
  assert(checkin, 'Check-in was not saved');
  assert(checkin.completedExercises.length === 0, 'Unexpected planned exercises were saved');
  assert(checkin.customItems.length === 1, 'Custom item was not saved');
  assert(checkin.totalDuration === 10, 'Custom duration was not included');
});

test('custom item increases the progress denominator and can be completed with the plan', async () => {
  await resetApp();
  makeTodayPlan();
  app().renderToday();

  await addExtraItem('拉伸', '10');
  const planDone = doc().querySelector('.exercise-done[data-exid]');
  planDone.click();
  const labelBefore = doc().getElementById('btn-checkin').textContent.trim();
  assert(labelBefore.includes('已选 1/2'), `Progress denominator should include the custom item: ${labelBefore}`);

  clickCustomItemToggle();

  const label = doc().getElementById('btn-checkin').textContent.trim();
  assert(label.includes('完成今日训练，打卡'), `Progress should reach completion after the custom item is checked: ${label}`);
});

test('after check-in, adding another extra item appends to the existing record', async () => {
  await resetApp();
  makeTodayPlan();
  app().saveCheckin(app().todayStr(), {
    planId: 'test_plan',
    completedExercises: ['e19'],
    totalDuration: 3,
    customItems: [],
    checkedAt: new Date().toISOString(),
  });
  app().renderToday();

  await addExtraItem('散步', '12');

  const checkin = app().getTodayCheckin(app().todayStr());
  assert(checkin.completedExercises.includes('e19'), 'Existing planned exercise completion was lost');
  assert(checkin.customItems.length === 1, 'Extra item was not appended');
  assert(checkin.totalDuration === 15, 'Extra item duration was not accumulated');
});

test('history displays saved check-ins without depending on removed custom exercise definitions', async () => {
  await resetApp();
  makeTodayPlan();
  app().saveCheckin(app().todayStr(), {
    planId: 'test_plan',
    completedExercises: ['custom_deleted'],
    totalDuration: 8,
    customItems: [{ id: 'extra_1', name: '拉伸', duration: 5, checked: true }],
    checkedAt: new Date().toISOString(),
  });

  app().renderHistory();

  const text = doc().querySelector('#tab-history').textContent;
  assert(text.includes('custom_deleted'), 'History should show unknown saved exercise ids');
  assert(text.includes('拉伸'), 'History should show custom items');
});

async function run() {
  await new Promise(resolve => {
    if (frame.contentDocument?.readyState === 'complete' && typeof app().renderPlanTab === 'function') resolve();
    else frame.addEventListener('load', resolve, { once: true });
  });
  await waitForAppReady();

  const results = [];
  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, ok: true });
    } catch (error) {
      results.push({ name: t.name, ok: false, error });
    }
  }

  const passed = results.filter(r => r.ok).length;
  summaryEl.textContent = `${passed}/${results.length} passed`;
  summaryEl.style.color = passed === results.length ? '#047857' : '#b91c1c';
  resultsEl.innerHTML = results.map(r => `
    <div class="case ${r.ok ? 'pass' : 'fail'}">
      <div>${r.ok ? 'PASS' : 'FAIL'} - ${r.name}</div>
      ${r.ok ? '' : `<pre>${r.error.stack || r.error.message}</pre>`}
    </div>
  `).join('');

  window.__TEST_RESULTS__ = results;
  if (passed !== results.length) {
    throw new Error(`${results.length - passed} test(s) failed`);
  }
}

run();
