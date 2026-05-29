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
  for (let i = 0; i < 120; i++) {
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

function weekdays() {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
}

function todayPlanDay() {
  return app().todayDayName();
}

function buildPlanForToday({
  goals = ['胸'],
  targets = ['胸'],
  exercises = [app().getAllExercises().find(ex => ex.id === 'e19')],
  selectedDays = [todayPlanDay()],
  durationPerDay = 30,
  dayOverrides = {},
} = {}) {
  const today = todayPlanDay();
  return {
    id: 'test_plan_' + Date.now(),
    createdAt: new Date().toISOString(),
    goals,
    selectedDays,
    daysPerWeek: selectedDays.length,
    durationPerDay,
    equipment: ['自重'],
    dayOverrides,
    days: Object.fromEntries(weekdays().map(day => [
      day,
      day === today ? { targets, exercises } : null,
    ])),
  };
}

async function resetApp() {
  const load = waitForFrameLoad();
  frame.src = `../index.html?t=${Date.now()}-${Math.random()}`;
  await load;
  await waitForAppReady();

  app().localStorage.clear();
  app().sessionStorage.clear();
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
  clickChip('#weekday-chips', '周一');
  clickChip('#weekday-chips', '周三');
  clickChip('#weekday-chips', '周五');
  clickChip('#duration-chips', '30');
  clickChip('#equip-chips', '自重');
  doc().getElementById('btn-generate').click();
  await wait(450);
}

async function addExtraItem(name = '拉伸', duration = '10') {
  doc().getElementById('btn-add-custom-item').click();
  doc().getElementById('aci-name').value = name;
  doc().getElementById('aci-duration').value = duration;
  doc().getElementById('aci-save').click();
  await wait(40);
}

function clickCustomItemToggle() {
  const dot = doc().querySelector('.exercise-done[data-customid]');
  assert(dot, 'Missing custom item toggle');
  dot.click();
}

async function saveDurationModal(value) {
  const input = doc().getElementById('day-duration-input');
  assert(input, 'Duration input was not rendered');
  input.value = value;
  doc().getElementById('day-duration-save').click();
  await wait(50);
}

test('generates a weekly plan from selected goals, weekdays, duration, and equipment', async () => {
  await resetApp();
  await generateBasicPlan();

  const plan = currentPlan();
  assert(plan, 'Plan was not saved');
  assert(plan.goals.includes('胸'), 'Selected goal was not saved');
  assert(plan.selectedDays.join(',') === '周一,周三,周五', 'Selected weekdays were not saved');
  assert(plan.daysPerWeek === 3, 'Derived days per week was not saved');
  assert(plan.durationPerDay === 30, 'Selected duration was not saved');
  assert(plan.equipment.includes('自重'), 'Selected equipment was not saved');
  assert(doc().querySelector('#plan-result .card'), 'Generated plan was not rendered');
});

test('returning to the plan tab keeps selections and rendered results visible', async () => {
  await resetApp();
  await generateBasicPlan();

  app().switchTab('today');
  app().switchTab('plan');

  assert(selectedValues('#goal-chips').includes('胸'), 'Plan goal selection was not restored');
  assert(selectedValues('#weekday-chips').join(',') === '周一,周三,周五', 'Weekday selection was not restored');
  assert(doc().querySelector('#plan-result .card'), 'Plan result disappeared after tab switch');
});

test('edit plan rerenders the plan tab without losing the saved constraints', async () => {
  await resetApp();
  await generateBasicPlan();

  doc().getElementById('btn-edit-plan').click();
  await wait(80);

  assert(selectedValues('#goal-chips').includes('胸'), 'Goal selection was lost after edit');
  assert(selectedValues('#weekday-chips').join(',') === '周一,周三,周五', 'Weekday selection was lost after edit');
  assert(selectedValues('#duration-chips').includes('30'), 'Duration selection was lost after edit');
  assert(selectedValues('#equip-chips').includes('自重'), 'Equipment selection was lost after edit');
  assert(doc().querySelector('#plan-result .card'), 'Plan result should remain available while editing');
});

test('regenerating a plan keeps the same constraints while replacing the saved plan', async () => {
  await resetApp();
  await generateBasicPlan();

  const before = currentPlan();
  const beforeId = before.id;
  doc().getElementById('btn-regenerate').click();
  await wait(380);

  const after = currentPlan();
  assert(after, 'Regenerated plan was not saved');
  assert(after.id !== beforeId, 'Regenerated plan should replace the previous plan');
  assert(after.goals.join(',') === before.goals.join(','), 'Goals changed during regeneration');
  assert(after.selectedDays.join(',') === before.selectedDays.join(','), 'Selected weekdays changed during regeneration');
  assert(after.durationPerDay === before.durationPerDay, 'Duration changed during regeneration');
  assert(after.equipment.join(',') === before.equipment.join(','), 'Equipment changed during regeneration');
});

test('plan tab duration modal saves a day override and updates the weekly totals', async () => {
  await resetApp();
  await generateBasicPlan();

  const day = currentPlan().selectedDays[0];
  const btn = [...doc().querySelectorAll('.adjust-duration-btn')].find(el => el.dataset.day === day);
  assert(btn, `Missing adjust-duration button for ${day}`);
  btn.click();
  await saveDurationModal('45');

  const plan = currentPlan();
  assert(plan.dayOverrides?.[day] === 45, 'Day duration override was not saved');
  assert(app().getDayDuration(plan, day) === 45, 'Day duration helper did not return the override');
  assert(app().getPlanTotals(plan).totalMinutes >= 45, 'Plan totals did not include the override');
});

test('today tab can adjust today duration before check-in', async () => {
  await resetApp();
  const plan = buildPlanForToday();
  app().savePlan(plan);
  app().renderToday();

  doc().getElementById('btn-adjust-today-duration').click();
  await saveDurationModal('40');

  const updated = currentPlan();
  const today = todayPlanDay();
  assert(updated.dayOverrides?.[today] === 40, 'Today override was not saved from the training tab');
  assert(app().getTodayTrainingSnapshot().duration === 40, 'Today snapshot did not use the overridden duration');
  assert(doc().querySelector('#tab-today').textContent.includes('预计时长 40 分钟'), 'Today UI did not refresh to the new duration');
});

test('today tab warns after check-in and does not rewrite the saved historical duration', async () => {
  await resetApp();
  const plan = buildPlanForToday({ dayOverrides: { [todayPlanDay()]: 40 } });
  app().savePlan(plan);
  app().saveCheckin(app().todayStr(), {
    planId: plan.id,
    completedExercises: plan.days[todayPlanDay()].exercises.map(ex => ex.id),
    totalDuration: 40,
    customItems: [],
    checkedAt: new Date().toISOString(),
  });
  app().renderToday();

  doc().getElementById('btn-adjust-today-duration').click();
  await wait(20);
  assert(doc().querySelector('.modal-overlay').textContent.includes('不会回写已经保存的打卡总时长'), 'Checked-in warning text was missing');
  await saveDurationModal('55');

  const updated = currentPlan();
  const checkin = app().getTodayCheckin(app().todayStr());
  assert(updated.dayOverrides?.[todayPlanDay()] === 55, 'Updated plan override was not saved');
  assert(app().getTodayTrainingSnapshot().duration === 55, 'Today snapshot did not reflect the new plan duration');
  assert(checkin.totalDuration === 40, 'Historical check-in duration should not be rewritten');
  assert(doc().querySelector('#tab-today').textContent.includes('总时长 40 分钟'), 'Checked-in summary should still reflect historical duration');
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

test('adding an extra item before check-in does not create a check-in and expands the progress denominator', async () => {
  await resetApp();
  const plan = buildPlanForToday();
  app().savePlan(plan);
  app().renderToday();

  await addExtraItem('拉伸', '10');

  assert(!app().getTodayCheckin(app().todayStr()), 'Extra item created a check-in too early');
  const label = doc().getElementById('btn-checkin').textContent.trim();
  assert(label.includes('已选 0/2'), `Progress denominator did not include the extra item: ${label}`);
  assert(doc().querySelector('.exercise-done[data-customid]') && !doc().querySelector('.exercise-done[data-customid]').classList.contains('checked'), 'Custom item should start unchecked');
});

test('checking in with an extra item adds custom duration on top of the planned day duration', async () => {
  await resetApp();
  const exercise = app().getAllExercises().find(ex => ex.id === 'e19');
  const plan = buildPlanForToday({ exercises: [exercise], dayOverrides: { [todayPlanDay()]: 40 } });
  app().savePlan(plan);
  app().renderToday();

  await addExtraItem('拉伸', '10');
  doc().querySelector('.exercise-done[data-exid]').click();
  clickCustomItemToggle();
  doc().getElementById('btn-checkin').click();

  const checkin = app().getTodayCheckin(app().todayStr());
  assert(checkin, 'Check-in was not saved');
  assert(checkin.completedExercises.length === 1, 'Planned exercise completion was not saved');
  assert(checkin.customItems.length === 1, 'Custom item was not saved');
  assert(checkin.totalDuration === 50, `Expected planned override + custom duration to equal 50, got ${checkin.totalDuration}`);
});

test('after check-in, adding another extra item appends to the existing record', async () => {
  await resetApp();
  const plan = buildPlanForToday();
  app().savePlan(plan);
  app().saveCheckin(app().todayStr(), {
    planId: plan.id,
    completedExercises: plan.days[todayPlanDay()].exercises.map(ex => ex.id),
    totalDuration: 3,
    customItems: [],
    checkedAt: new Date().toISOString(),
  });
  app().renderToday();

  await addExtraItem('散步', '12');

  const checkin = app().getTodayCheckin(app().todayStr());
  assert(checkin.customItems.length === 1, 'Extra item was not appended');
  assert(checkin.totalDuration === 15, 'Extra item duration was not accumulated');
});

test('history displays saved check-ins without depending on removed exercise definitions', async () => {
  await resetApp();
  const plan = buildPlanForToday();
  app().savePlan(plan);
  app().saveCheckin(app().todayStr(), {
    planId: plan.id,
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
