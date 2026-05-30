// ====== sport_plat - 居家训练计划 ======

const STORAGE_KEY = 'sport_plat';
const ACTIVE_TAB_KEY = 'sport_plat_active_tab';
const pendingCustomItemsByDate = {};
const pullRefreshEl = document.getElementById('pull-refresh');
const pullRefreshIconEl = pullRefreshEl?.querySelector('.pull-refresh-icon');
const pullRefreshTextEl = pullRefreshEl?.querySelector('.pull-refresh-text');
const PULL_REFRESH_THRESHOLD = 72;
const PULL_REFRESH_MAX = 120;
const pullRefreshState = {
  active: false,
  armed: false,
  refreshing: false,
  pointerId: null,
  startY: 0,
  currentY: 0,
};
let currentTab = 'today';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return { plans: [], checkins: {} };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function saveActiveTab(tabName) {
  try {
    sessionStorage.setItem(ACTIVE_TAB_KEY, tabName);
  } catch {}
}

function getSavedActiveTab() {
  try {
    return sessionStorage.getItem(ACTIVE_TAB_KEY);
  } catch {
    return null;
  }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

// ====== 计划生成引擎 ======

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 将训练目标分配到具体日期
// 规则：同一部位间隔至少 48h，有氧穿插在力量日之间，核心可附加到任意日
function assignGoalsToDays(strengthGoals, hasCardio, hasCore, trainingDayIndices) {
  const numDays = trainingDayIndices.length;
  const numStrength = strengthGoals.length;

  const assignments = {};

  if (numStrength === 0 && !hasCardio && !hasCore) return assignments;

  // 情况1：力量目标数 <= 训练天数 — 按训练日循环分配，单一目标也覆盖所有选中日期
  if (numStrength <= numDays && numStrength > 0) {
    for (let i = 0; i < numDays; i++) {
      const dayIdx = trainingDayIndices[i];
      assignments[dayIdx] = [strengthGoals[i % numStrength]];
    }
  }

  // 情况2：力量目标数 > 训练天数 — 每天组合不同部位
  if (numStrength > numDays && numStrength > 0) {
    const combos = buildCombos(strengthGoals, numDays);
    for (let i = 0; i < numDays; i++) {
      assignments[trainingDayIndices[i]] = combos[i] || [strengthGoals[i % numStrength]];
    }
  }

  // 有氧穿插：和力量日共存，选1-2个非纯有氧日附加有氧
  if (hasCardio) {
    const existingCardioIndices = Object.entries(assignments)
      .filter(([, targets]) => targets.length === 1 && targets[0] === '有氧')
      .map(([idx]) => Number(idx));
    const pureCardioCount = existingCardioIndices.length;

    // 如果还没有足够的纯有氧日，选1-2个力量日附加有氧
    const needMixedCardio = pureCardioCount < 2;
    if (needMixedCardio) {
      const strengthIndices = trainingDayIndices.filter(i =>
        assignments[i] && !(assignments[i].length === 1 && assignments[i][0] === '有氧')
      );
      // 选最多2个力量日附加有氧，优先选目标少的
      strengthIndices.sort((a, b) => assignments[a].length - assignments[b].length);
      const mixCount = Math.min(2 - pureCardioCount, strengthIndices.length);
      for (let i = 0; i < mixCount; i++) {
        const idx = strengthIndices[i];
        if (!assignments[idx].includes('有氧')) {
          assignments[idx].push('有氧');
        }
      }
    }
  }

  // 情况3：只有有氧
  if (numStrength === 0 && hasCardio) {
    for (const idx of trainingDayIndices) {
      assignments[idx] = ['有氧'];
    }
  }

  // 情况4：只有核心
  if (numStrength === 0 && !hasCardio && hasCore) {
    for (const idx of trainingDayIndices) {
      assignments[idx] = ['核心'];
    }
  }

  // 核心附加到力量日（如果用户选了核心目标且还没分配）
  if (hasCore) {
    for (const idx of trainingDayIndices) {
      if (assignments[idx] && !assignments[idx].includes('核心')) {
        assignments[idx].push('核心');
      }
    }
  }

  return assignments;
}

// 将多个力量目标组合到有限天数
function buildCombos(goals, numDays) {
  // 常见组合：推(胸+肩+三头) / 拉(背+二头) / 腿 / 全身
  const combos = [];

  // 推类：胸、肩、手臂(三头)
  const push = goals.filter(g => ['胸', '肩'].includes(g));
  // 拉类：背、手臂(二头)
  const pull = goals.filter(g => g === '背');
  // 腿类
  const legs = goals.filter(g => g === '腿');

  if (legs.length > 0 && combos.length < numDays) combos.push(['腿']);
  if (push.length > 0) {
    if (combos.length < numDays) combos.push(push);
    else combos[combos.length - 1] = [...combos[combos.length - 1], ...push];
  }
  if (pull.length > 0) {
    if (combos.length < numDays) combos.push(pull);
    else combos[0] = [...combos[0], ...pull];
  }

  // 剩余没分配的目标
  const assigned = new Set(combos.flat());
  const remaining = goals.filter(g => !assigned.has(g));
  for (const g of remaining) {
    if (combos.length < numDays) {
      combos.push([g]);
    } else {
      // 找练习最少的组合追加
      let minIdx = 0;
      for (let i = 1; i < combos.length; i++) {
        if (combos[i].length < combos[minIdx].length) minIdx = i;
      }
      combos[minIdx].push(g);
    }
  }

  return combos;
}

// 为某一天的训练选择合适的动作
function selectExercisesForDay({ targets, durationPerDay, equipment }) {
  const selected = [];
  let totalDuration = 0;
  const durationBudget = durationPerDay - 3; // 留3分钟热身

  // 确保 equipment 包含 '自重'（热身用）
  const eqWithBodyweight = [...new Set([...equipment, '自重'])];

  // 筛选可用动作
  const available = filterExercises({ targets, equipment: eqWithBodyweight });

  if (available.length === 0) return selected;

  // 按目标分组
  const byTarget = {};
  for (const ex of available) {
    if (!byTarget[ex.target]) byTarget[ex.target] = [];
    byTarget[ex.target].push(ex);
  }

  // 为每个目标选 1-3 个动作，用满时间预算
  for (const target of targets) {
    const pool = byTarget[target] || [];
    if (pool.length === 0) continue;

    // 随机打乱取前几个
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const maxForTarget = Math.min(3, Math.ceil(durationBudget / targets.length / 3));

    for (const ex of shuffled) {
      if (totalDuration + ex.duration > durationBudget) break;
      if (selected.filter(s => s.target === target).length >= maxForTarget) break;
      selected.push(ex);
      totalDuration += ex.duration;
    }
  }

  // 如果还有时间，补充1-2个核心动作
  if (totalDuration < durationBudget && !targets.includes('核心')) {
    const corePool = getAllExercises().filter(e => e.target === '核心' && eqWithBodyweight.includes(e.equipment));
    const shuffled = [...corePool].sort(() => Math.random() - 0.5);
    for (const ex of shuffled) {
      if (totalDuration + ex.duration > durationBudget) break;
      selected.push(ex);
      totalDuration += ex.duration;
    }
  }

  return selected;
}

function normalizeSelectedDays(selectedDays) {
  return (selectedDays || [])
    .map(String)
    .filter(day => WEEKDAYS.includes(day));
}

function getTrainingDayIndicesFromSelectedDays(selectedDays) {
  const normalized = normalizeSelectedDays(selectedDays);
  return WEEKDAYS
    .map((day, index) => normalized.includes(day) ? index : -1)
    .filter(index => index >= 0);
}

function getDayDuration(plan, dayName) {
  if (!plan?.days?.[dayName]) return 0;
  const override = Number(plan.dayOverrides?.[dayName]);
  if (override > 0) return override;
  return plan.days[dayName].exercises.reduce((sum, ex) => sum + ex.duration, 0);
}

function setDayDurationOverride(plan, dayName, durationMinutes) {
  const newPlan = structuredClone(plan);
  if (!newPlan.dayOverrides) newPlan.dayOverrides = {};
  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    delete newPlan.dayOverrides[dayName];
    return newPlan;
  }
  newPlan.dayOverrides[dayName] = duration;
  return newPlan;
}

function inferSelectedDaysFromPlan(plan) {
  if (Array.isArray(plan?.selectedDays) && plan.selectedDays.length) {
    return normalizeSelectedDays(plan.selectedDays);
  }
  if (!plan?.days) return [];
  return WEEKDAYS.filter(day => plan.days[day]);
}

// 生成完整周计划
function generateWeeklyPlan({ goals, selectedDays, durationPerDay, equipment, dayOverrides = {} }) {
  const trainingDayIndices = getTrainingDayIndicesFromSelectedDays(selectedDays);
  const normalizedSelectedDays = trainingDayIndices.map(index => WEEKDAYS[index]);
  const daysPerWeek = normalizedSelectedDays.length;
  const strengthGoals = goals.filter(g => g !== '有氧' && g !== '核心');
  const hasCardio = goals.includes('有氧');
  const hasCore = goals.includes('核心');

  const assignments = assignGoalsToDays(strengthGoals, hasCardio, hasCore, trainingDayIndices);

  const days = {};
  for (let i = 0; i < 7; i++) {
    const dayName = WEEKDAYS[i];
    if (assignments[i]) {
      const targets = assignments[i];
      const exercises = selectExercisesForDay({ targets, durationPerDay, equipment });
      days[dayName] = { targets, exercises };
    } else {
      days[dayName] = null; // 休息日
    }
  }

  return {
    id: 'plan_' + Date.now(),
    createdAt: new Date().toISOString(),
    goals,
    selectedDays: normalizedSelectedDays,
    daysPerWeek,
    durationPerDay,
    equipment,
    dayOverrides,
    days,
  };
}

// 替换计划中某天的某个动作
function replaceExercise(plan, dayName, oldExerciseId, newExerciseId) {
  const newPlan = structuredClone(plan);
  const day = newPlan.days[dayName];
  if (!day) return newPlan;
  const idx = day.exercises.findIndex(e => e.id === oldExerciseId);
  if (idx === -1) return newPlan;
  const newEx = getAllExercises().find(e => e.id === newExerciseId);
  if (!newEx) return newPlan;
  day.exercises[idx] = newEx;
  return newPlan;
}

// ====== 数据操作 ======

function getCurrentPlan() {
  const data = loadData();
  if (data.plans.length === 0) return null;
  return data.plans[data.plans.length - 1];
}

function savePlan(plan) {
  const data = loadData();
  data.plans = [plan]; // 只保留最新计划
  saveData(data);
  return plan;
}

function getTodayCheckin(dateStr) {
  const data = loadData();
  return data.checkins[dateStr] || null;
}

function saveCheckin(dateStr, checkinData) {
  const data = loadData();
  data.checkins[dateStr] = checkinData;
  saveData(data);
  return checkinData;
}

function getCheckinsInRange(startDate, endDate) {
  const data = loadData();
  const result = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (const [dateStr, c] of Object.entries(data.checkins)) {
    const d = new Date(dateStr);
    if (d >= start && d <= end) result[dateStr] = c;
  }
  return result;
}

// ====== 今日日期工具 ======

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayDayName() {
  const d = new Date();
  return WEEKDAYS[(d.getDay() + 6) % 7]; // 周日=6 → 周日
}

function getWeekMonday(dateStr) {
  const d = new Date(dateStr || todayStr());
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // 回到周一
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getCheckinStreak(data = loadData()) {
  let streak = 0;
  const checkDate = new Date();
  while (true) {
    const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
    if (data.checkins[ds]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getMonthDateRange(baseDate = new Date()) {
  const monthStart = `${baseDate.getFullYear()}-${String(baseDate.getMonth()+1).padStart(2,'0')}-01`;
  const monthEnd = `${baseDate.getFullYear()}-${String(baseDate.getMonth()+1).padStart(2,'0')}-${String(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()).padStart(2,'0')}`;
  return { monthStart, monthEnd };
}

function getPlanTotals(plan) {
  if (!plan) return { trainingDays: 0, totalMinutes: 0, totalExercises: 0 };
  const trainingDays = WEEKDAYS.filter(day => plan.days[day]).length;
  const totalMinutes = WEEKDAYS.reduce((sum, day) => sum + getDayDuration(plan, day), 0);
  const totalExercises = WEEKDAYS.reduce((sum, day) => sum + (plan.days[day]?.exercises?.length || 0), 0);
  return { trainingDays, totalMinutes, totalExercises };
}

function getTodayTrainingSnapshot() {
  const plan = getCurrentPlan();
  const dateStr = todayStr();
  const dayName = todayDayName();
  const dayPlan = plan?.days?.[dayName] || null;
  const checkin = getTodayCheckin(dateStr);
  const customItems = checkin?.customItems || pendingCustomItemsByDate[dateStr] || [];
  const completedIds = checkin?.completedExercises || [];
  const totalExercises = dayPlan?.exercises?.length || 0;
  const completedCount = completedIds.length;
  const customCompletedCount = checkin ? customItems.length : customItems.filter(item => item.checked).length;
  const totalItems = totalExercises + customItems.length;
  const finishedItems = completedCount + customCompletedCount;
  const progress = totalItems > 0 ? Math.round(finishedItems / totalItems * 100) : 0;
  const duration = dayPlan ? getDayDuration(plan, dayName) : 0;

  return {
    plan,
    dateStr,
    dayName,
    dayPlan,
    checkin,
    customItems,
    completedIds,
    totalExercises,
    completedCount,
    totalItems,
    finishedItems,
    progress,
    duration,
  };
}

function getTodayStatusText(snapshot) {
  if (!snapshot.plan) {
    return { kicker: '首次使用', title: '先生成你的第一周计划', subtitle: '选训练目标、训练日和器械后，今天该练什么会自动安排好。' };
  }
  if (!snapshot.dayPlan) {
    return { kicker: '恢复日', title: '今天安排休息', subtitle: '保持恢复节奏，明天继续推进训练。' };
  }
  if (snapshot.checkin) {
    return { kicker: '已完成', title: '今天训练已打卡', subtitle: `总时长 ${snapshot.checkin.totalDuration || snapshot.duration} 分钟，状态已经记入统计。` };
  }
  if (snapshot.progress === 0) {
    return { kicker: '待开始', title: '今天的训练已经排好', subtitle: '先从第一项动作开始，进度会随着完成自动推进。' };
  }
  return { kicker: '进行中', title: `已完成 ${snapshot.finishedItems}/${snapshot.totalItems} 项`, subtitle: '继续把今天的训练清掉，打卡后会同步到历史和统计。' };
}

// ====== 图片加载 ======

function loadExerciseImage(exercise, imgEl) {
  imgEl.innerHTML = getExerciseImage(exercise);
}

// ====== UI 渲染 ======

function switchTab(tabName) {
  currentTab = tabName;
  saveActiveTab(tabName);
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabName));
  if (tabName === 'plan') renderPlanTab();
  if (tabName === 'today') renderToday();
  if (tabName === 'history') renderHistory();
  if (tabName === 'stats') renderStats();
}

function isPullRefreshBlocked(target) {
  if (document.querySelector('.modal-overlay')) return true;
  return !!target.closest('input, textarea, select, button, a, .chip, .btn, .modal, [contenteditable="true"]');
}

function getPullRefreshText() {
  if (pullRefreshState.refreshing) return '刷新中...';
  return pullRefreshState.armed ? '松开刷新' : '下拉刷新';
}

function renderPullRefresh(distance = 0) {
  if (!pullRefreshEl) return;
  const clamped = Math.max(0, Math.min(distance, PULL_REFRESH_MAX));
  const visible = clamped > 0 || pullRefreshState.refreshing;
  if (pullRefreshState.refreshing) {
    pullRefreshEl.style.transform = 'translateY(0)';
  } else {
    const pct = -100 + Math.min(clamped, PULL_REFRESH_THRESHOLD) / PULL_REFRESH_THRESHOLD * 100;
    pullRefreshEl.style.transform = `translateY(${pct}%)`;
  }
  pullRefreshEl.classList.toggle('visible', visible);
  pullRefreshEl.classList.toggle('armed', pullRefreshState.armed && !pullRefreshState.refreshing);
  pullRefreshEl.classList.toggle('refreshing', pullRefreshState.refreshing);
  pullRefreshEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (pullRefreshIconEl) pullRefreshIconEl.textContent = pullRefreshState.refreshing ? '⟳' : '↓';
  if (pullRefreshTextEl) pullRefreshTextEl.textContent = getPullRefreshText();
}

function resetPullRefresh() {
  pullRefreshState.active = false;
  pullRefreshState.armed = false;
  pullRefreshState.pointerId = null;
  pullRefreshState.startY = 0;
  pullRefreshState.currentY = 0;
  if (!pullRefreshState.refreshing) renderPullRefresh(0);
}

function beginPullRefresh(pointerId, clientY) {
  if (pullRefreshState.refreshing || window.scrollY > 0) return false;
  pullRefreshState.active = true;
  pullRefreshState.armed = false;
  pullRefreshState.pointerId = pointerId;
  pullRefreshState.startY = clientY;
  pullRefreshState.currentY = clientY;
  renderPullRefresh(0);
  return true;
}

function updatePullRefresh(clientY) {
  if (!pullRefreshState.active || pullRefreshState.refreshing) return;
  const delta = clientY - pullRefreshState.startY;
  if (delta <= 0 || window.scrollY > 0) {
    pullRefreshState.armed = false;
    renderPullRefresh(0);
    return;
  }
  const distance = Math.min(delta, PULL_REFRESH_MAX);
  pullRefreshState.currentY = clientY;
  pullRefreshState.armed = delta >= PULL_REFRESH_THRESHOLD;
  renderPullRefresh(distance);
}

function endPullRefresh() {
  if (!pullRefreshState.active) return;
  const shouldRefresh = pullRefreshState.armed && !pullRefreshState.refreshing;
  resetPullRefresh();
  if (shouldRefresh) triggerPullRefresh();
}

function triggerPullRefresh() {
  if (pullRefreshState.refreshing) return;
  pullRefreshState.refreshing = true;
  renderPullRefresh(PULL_REFRESH_THRESHOLD);

  // Update SW in background for next visit
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration?.().then((reg) => reg?.update?.()).catch(() => {});
    }
  } catch {}

  // Soft refresh: re-render from localStorage without page reload
  setTimeout(() => {
    switchTab(currentTab);
    pullRefreshState.refreshing = false;
    resetPullRefresh();
  }, 300);
}

// ---- 制定计划 Tab ----
function renderPlanTab() {
  const el = document.getElementById('tab-plan');
  const plan = getCurrentPlan();
  const todaySnapshot = getTodayTrainingSnapshot();
  const totals = getPlanTotals(plan);

  el.innerHTML = `
    <div class="section-stack">
      <div class="hero-card" id="plan-summary">
        <div class="hero-kicker">Weekly Program</div>
        <div class="hero-title">${plan ? '本周训练地图' : '先配置你的训练模板'}</div>
        <div class="hero-subtitle">${plan
          ? `每周 ${totals.trainingDays} 天 · 约 ${totals.totalMinutes} 分钟 · ${totals.totalExercises} 个动作，今天 ${todaySnapshot.dayPlan ? '已自动挂到训练页' : '没有排到训练任务'}。`
          : '先把目标、训练日、时长和器械定下来，系统会自动编排一周训练。'}
        </div>
        <div class="hero-metrics">
          <div class="metric">
            <div class="metric-value">${plan ? totals.trainingDays : '--'}</div>
            <div class="metric-label">训练日</div>
          </div>
          <div class="metric">
            <div class="metric-value">${plan ? totals.totalMinutes : '--'}</div>
            <div class="metric-label">周总分钟</div>
          </div>
          <div class="metric">
            <div class="metric-value">${plan ? totals.totalExercises : '--'}</div>
            <div class="metric-label">动作总数</div>
          </div>
        </div>
      </div>

      <div class="card plan-config-card" id="plan-config">
        <div class="card-title">${plan ? '修改条件' : '训练模板'}</div>
        <div class="card-subtitle">${plan
          ? '当前计划已经生效。需要调整目标、训练日、时长或器械时，再从这里改动。'
          : '先选本周重点，再生成系统给你的训练编排。'}
        </div>

        <div class="section-label" style="margin-bottom:8px;">训练目标</div>
        <div class="chip-group" id="goal-chips">
          ${getAllTargets().map(t => `<span class="chip" data-val="${t}">${t}</span>`).join('')}
        </div>

        <div class="section-label" style="margin:16px 0 8px;">训练日</div>
        <div class="chip-group" id="weekday-chips">
          ${WEEKDAYS.map(day => `<span class="chip" data-val="${day}">${day}</span>`).join('')}
        </div>

        <div class="section-label" style="margin:16px 0 8px;">单次时长</div>
        <div class="chip-group" id="duration-chips">
          ${[15,20,30,45,60].map(d => `<span class="chip" data-val="${d}">${d} 分钟</span>`).join('')}
        </div>

        <div class="section-label" style="margin:16px 0 8px;">可用器械</div>
        <div class="chip-group" id="equip-chips">
          ${getAllEquipment().map(t => `<span class="chip" data-val="${t}">${t}</span>`).join('')}
        </div>

        <div class="primary-actions">
          <button class="btn btn-primary" id="btn-generate">${plan ? '按当前条件生成新计划' : '生成训练计划'}</button>
          <button class="btn btn-outline" id="btn-custom-ex">自定义动作</button>
        </div>
      </div>

      <div id="custom-ex-list" class="custom-ex-list"></div>
      <div id="plan-result"></div>
    </div>
  `;

  // 如果已有计划，恢复选中状态
  if (plan) {
    restoreChipSelection('#goal-chips', plan.goals);
    restoreChipSelection('#weekday-chips', inferSelectedDaysFromPlan(plan));
    restoreChipSelection('#duration-chips', [plan.durationPerDay]);
    restoreChipSelection('#equip-chips', plan.equipment);
    renderPlanResult(plan);
  }

  bindChipEvents('#goal-chips');
  bindChipEvents('#weekday-chips');
  bindChipEvents('#duration-chips');
  bindChipEvents('#equip-chips');

  document.getElementById('btn-generate').addEventListener('click', () => {
    const goals = getSelectedChips('#goal-chips');
    const selectedDays = getSelectedChips('#weekday-chips');
    const durationPerDay = parseInt(getSelectedChips('#duration-chips')[0]) || 30;
    const equipment = getSelectedChips('#equip-chips');

    if (goals.length === 0) { alert('请至少选择一个训练目标'); return; }
    if (selectedDays.length === 0) { alert('请至少选择一个训练日'); return; }
    if (equipment.length === 0) { alert('请至少选择一种器械（包含自重）'); return; }

    // 显示 loading
    const btn = document.getElementById('btn-generate');
    btn.textContent = '生成中...';
    btn.disabled = true;

    // 收起选择区
    const cards = el.querySelectorAll('.card');
    cards.forEach(c => c.style.display = 'none');
    btn.style.display = 'none';

    setTimeout(() => {
      const plan = generateWeeklyPlan({ goals, selectedDays, durationPerDay, equipment });
      savePlan(plan);
      renderPlanTab();
      // 滚动到计划结果
      document.getElementById('plan-result').scrollIntoView({ behavior: 'smooth' });
    }, 300);
  });

  // 自定义动作
  const cxBtn = document.getElementById('btn-custom-ex');
  if (cxBtn) {
    cxBtn.addEventListener('click', () => showCustomExModal());
    renderCustomExList();
  }
}

function bindChipEvents(selector) {
  document.querySelectorAll(`${selector} .chip`).forEach(chip => {
    chip.addEventListener('click', () => {
      const parent = chip.parentElement;
      const isSingle = parent.id === 'duration-chips';
      if (isSingle) {
        parent.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      }
      chip.classList.toggle('selected');
    });
  });
}

function getSelectedChips(selector) {
  return Array.from(document.querySelectorAll(`${selector} .chip.selected`)).map(c => c.dataset.val);
}


// ====== 自定义动作 UI ======

function showCustomExModal() {
  document.querySelector(".modal-overlay")?.remove();
  const targets = getAllTargets();
  const equipment = getAllEquipment();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header">
        <span>添加自定义动作</span>
        <button class="modal-close">&times;</button>
      </div>
      <div style="padding:8px 0;">
        <label class="field-label">动作名称</label>
        <input class="field-input" id="cx-name" placeholder="例如：跑步机爬坡、引体向上">
        <label class="field-label">目标部位</label>
        <div class="chip-group" id="cx-target">${targets.map(t => `<span class="chip" data-val="${t}">${t}</span>`).join("")}</div>
        <label class="field-label">使用器械</label>
        <div class="chip-group" id="cx-equip">${equipment.map(t => `<span class="chip" data-val="${t}">${t}</span>`).join("")}</div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;"><label class="field-label">时长</label><input class="field-input" id="cx-duration" type="number" min="1" max="60" value="5"></div>
          <div style="flex:1;"><label class="field-label">组数</label><input class="field-input" id="cx-sets" type="number" min="1" max="10" value="3"></div>
          <div style="flex:1;"><label class="field-label">次数</label><input class="field-input" id="cx-reps" placeholder="12-15"></div>
        </div>
        <label class="field-label">描述（可选）</label>
        <input class="field-input" id="cx-desc" placeholder="动作要点">
      </div>
      <button class="btn btn-primary" id="cx-save" style="width:100%;">保存</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  // chip toggle
  const bindCx = (sel) => {
    overlay.querySelectorAll(sel + " .chip").forEach(c => {
      c.addEventListener("click", () => {
        overlay.querySelectorAll(sel + " .chip").forEach(x => x.classList.remove("selected"));
        c.classList.add("selected");
      });
    });
  };
  bindCx("#cx-target");
  bindCx("#cx-equip");

  overlay.querySelector("#cx-save").addEventListener("click", () => {
    const name = overlay.querySelector("#cx-name").value.trim();
    const target = overlay.querySelector("#cx-target .chip.selected")?.dataset.val;
    const equip = overlay.querySelector("#cx-equip .chip.selected")?.dataset.val;
    const duration = overlay.querySelector("#cx-duration").value;
    const sets = overlay.querySelector("#cx-sets").value;
    const reps = overlay.querySelector("#cx-reps").value.trim();
    const desc = overlay.querySelector("#cx-desc").value.trim();
    if (!name) { alert("请输入动作名称"); return; }
    if (!target) { alert("请选择目标部位"); return; }
    if (!equip) { alert("请选择器械"); return; }
    addCustomExercise({ name, target, equipment: equip, duration, sets, reps, desc });
    overlay.remove();
    renderCustomExList();
    renderPlanTab();
  });
}

function renderCustomExList() {
  const el = document.getElementById("custom-ex-list");
  if (!el) return;
  const list = loadCustomExercises();
  if (list.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <div class="card-title custom-title">我的自定义动作</div>
    ${list.map(ex => `
      <div class="exercise-item custom-exercise-item">
        <div class="exercise-info">
          <div class="ex-name"><span class="target-tag ${targetTagClass(ex.target)}">${escapeHTML(ex.target)}</span> ${escapeHTML(ex.name)}</div>
          <div class="ex-meta">
            <span>${escapeHTML(ex.sets)}组 × ${escapeHTML(ex.reps)}</span>
            <span>${escapeHTML(ex.equipment)}</span>
            <span>约${escapeHTML(ex.duration)}分钟</span>
          </div>
          ${ex.desc ? `<div class="ex-desc">${escapeHTML(ex.desc)}</div>` : ""}
        </div>
        <button class="btn btn-sm btn-ghost cx-del-btn" data-id="${escapeHTML(ex.id)}">删除</button>
      </div>
    `).join("")}
  `;
  el.querySelectorAll(".cx-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("删除这个自定义动作？")) {
        removeCustomExercise(btn.dataset.id);
        renderCustomExList();
        renderPlanTab();
      }
    });
  });
}
function restoreChipSelection(selector, values) {
  document.querySelectorAll(`${selector} .chip`).forEach(c => {
    if (values.map(String).includes(c.dataset.val)) c.classList.add('selected');
  });
}

function renderPlanResult(plan) {
  const el = document.getElementById('plan-result');
  if (!el) return;
  const totals = getPlanTotals(plan);
  el.innerHTML = `
    <div class="card">
      <div class="card-title">本周训练计划</div>
      <div class="card-subtitle">按训练日和恢复日拆开看，一眼知道这周怎么练。</div>
      <div class="plan-action-bar">
        <button class="btn btn-sm btn-ghost" id="btn-edit-plan">修改条件</button>
        <button class="btn btn-sm btn-ghost" id="btn-regenerate">重新生成</button>
      </div>
      <div class="highlight-strip" style="margin-bottom:14px;">
        <div class="accent-panel">
          <strong>${totals.trainingDays}</strong>
          <span>本周训练日</span>
        </div>
        <div class="accent-panel">
          <strong>${totals.totalMinutes}</strong>
          <span>预计总分钟</span>
        </div>
      </div>
      <div class="plan-days">
      ${WEEKDAYS.map(day => {
        const d = plan.days[day];
        if (!d) return `<div class="day-plan rest">
          <div class="day-plan-header">
            <div>
              <div class="day-plan-name">${day}</div>
              <div class="day-plan-meta">恢复、拉伸或自由活动</div>
            </div>
            <span class="target-tag" style="background:rgba(255,255,255,0.08);color:var(--text-tertiary);">休息</span>
          </div>
        </div>`;
        const totalDuration = getDayDuration(plan, day);
        return `<div class="day-plan">
          <div class="day-plan-header">
            <div>
              <div class="day-plan-name">${day}</div>
              <div class="day-plan-meta">${d.exercises.length} 个动作 · 约 ${totalDuration} 分钟</div>
            </div>
            <div class="pill-row">${d.targets.map(t => `<span class="target-tag ${targetTagClass(t)}">${t}</span>`).join(' ')}</div>
          </div>
          <div class="plan-action-bar" style="margin-bottom:12px;">
            <button class="btn btn-sm btn-ghost adjust-duration-btn" data-day="${day}" data-duration="${totalDuration}">调整时长</button>
          </div>
          <div class="day-plan-ex-list">
          ${d.exercises.map(ex => `
            <div class="day-plan-ex" data-exid="${ex.id}" data-day="${day}">
              <div>
                <strong>${ex.name}</strong>
                <span>${ex.sets}组 × ${ex.reps} · ${ex.equipment} · 约${ex.duration}分钟</span>
              </div>
              <button class="btn btn-sm btn-ghost replace-btn" data-day="${day}" data-exid="${ex.id}" style="color:var(--primary);">替换</button>
            </div>
          `).join('')}
          </div>
        </div>`;
      }).join('')}
      </div>
    </div>
  `;

  // 替换动作按钮
  el.querySelectorAll('.replace-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = btn.dataset.day;
      const exId = btn.dataset.exid;
      showReplaceModal(plan, day, exId);
    });
  });

  el.querySelectorAll('.adjust-duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.dataset.day;
      const currentDuration = parseInt(btn.dataset.duration, 10) || plan.durationPerDay;
      showAdjustDurationModal(plan, day, currentDuration, {
        onSaved: () => {
          renderPlanTab();
          document.getElementById('plan-result')?.scrollIntoView({ behavior: 'smooth' });
        },
      });
    });
  });

  // 修改条件
  const editBtn = document.getElementById('btn-edit-plan');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      renderPlanTab();
      document.getElementById('tab-plan')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // 重新生成
  const regenBtn = document.getElementById('btn-regenerate');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      const plan = getCurrentPlan();
      if (!plan) return;
      const newPlan = generateWeeklyPlan({
        goals: plan.goals,
        selectedDays: inferSelectedDaysFromPlan(plan),
        durationPerDay: plan.durationPerDay,
        equipment: plan.equipment,
        dayOverrides: plan.dayOverrides || {},
      });
      savePlan(newPlan);
      renderPlanTab();
      document.getElementById('plan-result').scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function showReplaceModal(plan, dayName, oldExId) {
  const oldEx = plan.days[dayName].exercises.find(e => e.id === oldExId);
  if (!oldEx) return;

  const targets = plan.days[dayName].targets;
  const alternatives = getAllExercises().filter(e =>
    targets.includes(e.target) &&
    plan.equipment.concat('自重').includes(e.equipment) &&
    e.id !== oldExId
  );

  // 移除旧弹窗
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>替换「${oldEx.name}」</span>
        <button class="modal-close">&times;</button>
      </div>
      <div style="max-height:50vh;overflow-y:auto;">
        ${alternatives.map(ex => `
          <div class="exercise-item replace-option" data-exid="${ex.id}" style="cursor:pointer;">
            <div class="exercise-img" data-exid="${ex.id}"></div>
            <div class="exercise-info">
              <div class="ex-name">${ex.name}</div>
              <div class="ex-meta">
                <span>${ex.sets}组 × ${ex.reps}</span>
                <span>${ex.equipment}</span>
              </div>
              <div class="ex-desc">${ex.desc}</div>
            </div>
          </div>
        `).join('')}
        ${alternatives.length === 0 ? '<div class="empty"><p>没有可替换的动作，试试增加器械或调整目标。</p></div>' : ''}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // 加载图片
  overlay.querySelectorAll('.exercise-img').forEach(imgEl => {
    const ex = getAllExercises().find(e => e.id === imgEl.dataset.exid);
    if (ex) loadExerciseImage(ex, imgEl);
  });

  // 选择替换
  overlay.querySelectorAll('.replace-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const newExId = opt.dataset.exid;
      const newPlan = replaceExercise(plan, dayName, oldExId, newExId);
      savePlan(newPlan);
      overlay.remove();
      renderPlanResult(newPlan);
    });
  });
}

function showAdjustDurationModal(plan, dayName, currentDuration, options = {}) {
  const {
    hintText = '这里只调整当天总时长，不会改动单个动作的时长配置。',
    onSaved,
  } = options;
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-header">
        <span>调整 ${dayName} 时长</span>
        <button class="modal-close">&times;</button>
      </div>
      <div style="padding:8px 0;">
        <label class="field-label">训练总时长（分钟）</label>
        <input class="field-input" id="day-duration-input" type="number" min="1" max="180" value="${currentDuration}">
        <div style="margin-top:8px;color:var(--text-secondary);font-size:0.82rem;line-height:1.6;">
          ${hintText}
        </div>
      </div>
      <div class="today-actions">
        <button class="btn btn-outline" id="day-duration-cancel">取消</button>
        <button class="btn btn-primary" id="day-duration-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  const input = overlay.querySelector('#day-duration-input');

  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('#day-duration-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  input?.focus();
  input?.select();

  const save = () => {
    const nextDuration = Math.max(1, Math.min(180, parseInt(input.value, 10) || 0));
    if (!nextDuration) {
      alert('请输入有效的分钟数');
      input?.focus();
      return;
    }
    const nextPlan = setDayDurationOverride(plan, dayName, nextDuration);
    savePlan(nextPlan);
    close();
    if (typeof onSaved === 'function') {
      onSaved(nextPlan);
      return;
    }
    renderPlanResult(nextPlan);
    if (todayDayName() === dayName) renderToday();
  };

  overlay.querySelector('#day-duration-save').addEventListener('click', save);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
}

// ---- 今日训练 Tab ----
function renderToday() {
  const el = document.getElementById('tab-today');
  const snapshot = getTodayTrainingSnapshot();
  const { plan, dayName: today, dateStr: todayStrVal, dayPlan, checkin, completedIds, totalExercises, customItems, totalItems, finishedItems, progress, duration } = snapshot;
  const status = getTodayStatusText(snapshot);
  const streak = getCheckinStreak();

  if (!plan) {
    el.innerHTML = `
      <div class="section-stack">
        <div class="hero-card">
          <div class="hero-kicker">${status.kicker}</div>
          <div class="hero-title">${status.title}</div>
          <div class="hero-subtitle">${status.subtitle}</div>
          <div class="single-cta">
            <button class="btn btn-primary" id="btn-go-plan">去生成计划</button>
          </div>
        </div>
        <div class="card onboarding-card">
          <div class="card-title">先做这 3 步</div>
          <div class="today-onboarding-steps">
            <div class="today-onboarding-step"><span>1</span><strong>选训练目标</strong></div>
            <div class="today-onboarding-step"><span>2</span><strong>选每周训练日</strong></div>
            <div class="today-onboarding-step"><span>3</span><strong>自动生成今天训练</strong></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btn-go-plan')?.addEventListener('click', () => switchTab('plan'));
    return;
  }

  if (!dayPlan) {
    el.innerHTML = `
      <div class="section-stack">
        <div class="hero-card">
          <div class="hero-kicker">${status.kicker}</div>
          <div class="hero-title">${status.title}</div>
          <div class="hero-subtitle">${status.subtitle}</div>
          <div class="hero-metrics">
            <div class="metric"><div class="metric-value">${streak}</div><div class="metric-label">连续训练</div></div>
            <div class="metric"><div class="metric-value">${getPlanTotals(plan).trainingDays}</div><div class="metric-label">周训练日</div></div>
            <div class="metric"><div class="metric-value">0</div><div class="metric-label">今日分钟</div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">今天不训练</div>
          <div class="card-subtitle">保持恢复也算训练节奏的一部分。散步、拉伸或早睡都算今天的安排。</div>
          <div class="pill-row">
            <span class="target-tag" style="background:rgba(255,255,255,0.08);color:var(--text-secondary);">恢复日</span>
            <span class="target-tag" style="background:rgba(77,163,255,0.12);color:#8cc7ff;">建议散步 / 拉伸</span>
          </div>
          <div class="single-cta">
            <button class="btn btn-outline" id="btn-view-week-plan">查看本周安排</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btn-view-week-plan')?.addEventListener('click', () => switchTab('plan'));
    return;
  }

  const canCheckin = totalItems > 0 && finishedItems === totalItems;

  el.innerHTML = `
    <div class="section-stack">
      <div class="hero-card ${checkin ? 'success' : ''}">
        <div class="hero-kicker">${status.kicker}</div>
        <div class="hero-title">${today} · ${status.title}</div>
        <div class="hero-subtitle">${status.subtitle}</div>
        <div class="pill-row" style="margin-top:12px;">
          ${dayPlan.targets.map(t => `<span class="target-tag ${targetTagClass(t)}">${t}</span>`).join(' ')}
        </div>
        <div class="progress-shell">
          <div class="progress-meta">
            <span>今日完成度</span>
            <span>${finishedItems}/${totalItems} 项</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          <div class="progress-meta">
            <span>预计时长 ${duration} 分钟</span>
            <span>${progress}%</span>
          </div>
        </div>
        <div class="hero-metrics">
          <div class="metric"><div class="metric-value">${streak}</div><div class="metric-label">连续训练</div></div>
          <div class="metric"><div class="metric-value">${totalExercises}</div><div class="metric-label">计划动作</div></div>
          <div class="metric"><div class="metric-value">${customItems.length}</div><div class="metric-label">额外项目</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">今日动作清单</div>
        <div class="card-subtitle">按动作完成今天的训练，全部勾选后再打卡。</div>

        ${dayPlan.exercises.map(ex => {
      const isDone = completedIds.includes(ex.id);
      return `
        <div class="exercise-item">
          <div class="exercise-img" data-exid="${ex.id}"></div>
          <div class="exercise-info">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-meta">
              <span>${ex.sets}组 × ${ex.reps}</span>
              <span>${ex.equipment}</span>
            </div>
            <div class="ex-desc">${ex.desc}</div>
          </div>
          <div class="exercise-done ${isDone ? 'checked' : ''}" data-exid="${ex.id}">
            ${isDone ? '✓' : ''}
          </div>
        </div>
      `;
    }).join('')}

    ${customItems.map((ci) => `
        <div class="exercise-item">
          <div class="exercise-img"><div class="custom-item-icon">+</div></div>
          <div class="exercise-info">
            <div class="ex-name">${escapeHTML(ci.name)}</div>
            <div class="ex-meta"><span>额外项目</span><span>约${escapeHTML(ci.duration || 0)}分钟</span></div>
          </div>
          <div class="exercise-done ${checkin ? 'checked' : ci.checked ? 'checked' : ''}" data-customid="${escapeHTML(ci.id || '')}">
            ${checkin || ci.checked ? '✓' : ''}
          </div>
        </div>
      `).join('')}
      </div>

      <div class="card">
        <div class="card-title">训练操作</div>
        <div class="card-subtitle">额外项目也会计入今天的总时长和打卡记录。</div>
        <div class="today-actions">
          <button class="btn btn-outline" id="btn-adjust-today-duration">调整今日时长</button>
          <button class="btn btn-outline btn-add-extra" id="btn-add-custom-item">添加额外项目</button>
          <button class="btn ${canCheckin ? 'btn-success' : 'btn-primary'}" id="btn-checkin" ${canCheckin ? '' : 'disabled'}>
            ${checkin ? '今日已打卡' : canCheckin ? '完成训练并打卡' : `已选 ${finishedItems}/${totalItems} 项`}
          </button>
        </div>
        ${checkin ? `<div style="margin-top:12px;color:var(--success);font-size:0.84rem;font-weight:800;">✓ 今日已打卡 · ${checkin.totalDuration || 0} 分钟</div>` : ''}
      </div>
    </div>
  `;

  // 加载图片
  el.querySelectorAll('.exercise-img').forEach(imgEl => {
    const ex = getAllExercises().find(e => e.id === imgEl.dataset.exid);
    if (ex) loadExerciseImage(ex, imgEl);
  });

  // 点击切换完成状态
  el.querySelectorAll('.exercise-done[data-exid], .exercise-done[data-customid]').forEach(dot => {
    const exId = dot.dataset.exid;
    const customId = dot.dataset.customid;
    if (checkin && checkin.completedExercises.includes(exId)) {
      // 已打卡的不能取消（简化逻辑：打卡后不可撤销今日）
      dot.style.pointerEvents = 'none';
    } else if (checkin && customId) {
      dot.style.pointerEvents = 'none';
    } else {
      dot.addEventListener('click', () => {
        dot.classList.toggle('checked');
        dot.textContent = dot.classList.contains('checked') ? '✓' : '';
        if (customId) {
          const pending = pendingCustomItemsByDate[todayStrVal] || [];
          const item = pending.find(ci => ci.id === customId);
          if (item) item.checked = dot.classList.contains('checked');
        }
        updateCheckinButton();
      });
    }
  });

  function updateCheckinButton() {
    const checked = el.querySelectorAll('.exercise-done[data-exid].checked').length;
    const pendingCustomCount = checkin
      ? (checkin.customItems || []).length
      : (pendingCustomItemsByDate[todayStrVal] || []).filter(ci => ci.checked).length;
    const btn = document.getElementById('btn-checkin');
    const doneCount = checked + pendingCustomCount;
    const totalCount = totalExercises + (checkin ? (checkin.customItems || []).length : (pendingCustomItemsByDate[todayStrVal] || []).length);
    btn.textContent = doneCount === totalCount ? '完成今日训练，打卡' : `已选 ${doneCount}/${totalCount} 项`;
    btn.className = `btn ${doneCount === totalCount ? 'btn-success' : 'btn-primary'}`;
    btn.disabled = doneCount !== totalCount || totalCount === 0;
    btn.style.opacity = btn.disabled ? '0.5' : '1';
  }

  // 打卡按钮
  const checkinBtn = document.getElementById('btn-checkin');
  if (checkinBtn && !checkin) {
    checkinBtn.addEventListener('click', () => {
      const checked = Array.from(el.querySelectorAll('.exercise-done[data-exid].checked')).map(d => d.dataset.exid);
      const customItems = (pendingCustomItemsByDate[todayStrVal] || []).filter(ci => ci.checked);
      if (checked.length === 0 && customItems.length === 0) return;
      const totalDuration = getDayDuration(plan, today);
      const customDuration = customItems.reduce((s, ci) => s + (ci.duration || 0), 0);
      saveCheckin(todayStrVal, {
        planId: plan.id,
        completedExercises: checked,
        totalDuration: totalDuration + customDuration,
        customItems: customItems.map(ci => ({
          id: ci.id,
          name: ci.name,
          duration: ci.duration,
          checked: true,
        })),
        checkedAt: new Date().toISOString(),
      });
      delete pendingCustomItemsByDate[todayStrVal];
      renderToday();
    });
  }

  const adjustTodayBtn = document.getElementById('btn-adjust-today-duration');
  if (adjustTodayBtn) {
    adjustTodayBtn.addEventListener('click', () => {
      const hintText = checkin
        ? '这会更新今天的计划时长，但不会回写已经保存的打卡总时长。'
        : '这里只调整今天总时长，不会改动单个动作的时长配置。';
      showAdjustDurationModal(plan, today, duration, {
        hintText,
        onSaved: () => {
          renderToday();
          renderPlanTab();
        },
      });
    });
  }

  // 自定义项目按钮
  const addCustomBtn = document.getElementById('btn-add-custom-item');
  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:360px;">
          <div class="modal-header">
            <span>添加额外项目</span>
            <button class="modal-close">&times;</button>
          </div>
          <div style="padding:8px 0;">
            <label class="field-label">项目名称</label>
            <input class="field-input" id="aci-name" placeholder="例如：跑步机30分钟、拉伸">
            <label class="field-label">时长（分钟）</label>
            <input class="field-input" id="aci-duration" type="number" min="1" max="120" value="20">
          </div>
          <button class="btn btn-primary" id="aci-save" style="width:100%;">添加项目</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#aci-save').addEventListener('click', () => {
        const name = overlay.querySelector('#aci-name').value.trim();
        const duration = Math.max(1, Math.min(120, parseInt(overlay.querySelector('#aci-duration').value, 10) || 20));
        if (!name) { alert('请输入项目名称'); return; }
        const existingCheckin = getTodayCheckin(todayStrVal);
        if (existingCheckin) {
          const customItems = [...(existingCheckin.customItems || []), { id: 'extra_' + Date.now(), name, duration, checked: true }];
          saveCheckin(todayStrVal, {
            ...existingCheckin,
            totalDuration: (existingCheckin.totalDuration || 0) + duration,
            customItems,
            checkedAt: new Date().toISOString(),
          });
        } else {
          pendingCustomItemsByDate[todayStrVal] = [
            ...(pendingCustomItemsByDate[todayStrVal] || []),
            { id: 'extra_' + Date.now(), name, duration, checked: false },
          ];
        }
        overlay.remove();
        renderToday();
      });
    });
  }
}

// ---- 打卡记录 Tab ----
function renderHistory() {
  const el = document.getElementById('tab-history');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();

  const todayStrVal = todayStr();
  const checkins = loadData().checkins;

  // 日历头部
  const dayHeaders = ['一','二','三','四','五','六','日'];

  let calendarHTML = '<div class="calendar">';
  dayHeaders.forEach(h => { calendarHTML += `<div class="day-header">${h}</div>`; });

  // 填充空白
  for (let i = 0; i < startPad; i++) {
    calendarHTML += '<div class="day other-month"></div>';
  }

  // 日期
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStrVal;
    const isChecked = !!checkins[dateStr];
    calendarHTML += `<div class="day${isChecked ? ' checked' : ''}${isToday ? ' today' : ''}" data-date="${dateStr}">${d}</div>`;
  }

  calendarHTML += '</div>';

  // 本月打卡列表
  const monthStart = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const monthEnd = `${year}-${String(month+1).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;
  const monthCheckins = getCheckinsInRange(monthStart, monthEnd);
  const sortedDates = Object.keys(monthCheckins).sort().reverse();
  const monthMinutes = sortedDates.reduce((sum, dateStr) => sum + (monthCheckins[dateStr].totalDuration || 0), 0);

  el.innerHTML = `
    <div class="section-stack">
    <div class="hero-card">
      <div class="hero-kicker">Training Log</div>
      <div class="hero-title">${year} 年 ${month+1} 月训练记录</div>
      <div class="hero-subtitle">先看最近几次训练，再用月历回看这个月的节奏。</div>
      <div class="hero-metrics">
        <div class="metric"><div class="metric-value">${sortedDates.length}</div><div class="metric-label">本月打卡</div></div>
        <div class="metric"><div class="metric-value">${monthMinutes}</div><div class="metric-label">本月分钟</div></div>
        <div class="metric"><div class="metric-value">${getCheckinStreak()}</div><div class="metric-label">连续训练</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">最近打卡</div>
      <div class="card-subtitle">最近完成的训练会优先显示在这里。</div>
      <div class="history-list">
      ${sortedDates.length === 0 ? '<div class="empty"><p>本月还没有打卡记录，先去训练页完成今天的第一组动作。</p></div>' :
        sortedDates.map(dateStr => {
          const c = monthCheckins[dateStr];
          const exNames = c.completedExercises.map(eid => {
            const ex = getAllExercises().find(e => e.id === eid);
            return ex ? ex.name : eid;
          }).join('、');
          const customNames = (c.customItems || []).map(ci => ci.name).join('、');
          const detailNames = [exNames, customNames].filter(Boolean).join('、');
          const d = new Date(dateStr);
          const dayName = WEEKDAYS[(d.getDay() + 6) % 7];
          return `<div class="checkin-record">
            <div class="cr-date">${dateStr} ${dayName} · ${c.totalDuration || 0}分钟</div>
            <div class="cr-detail">${detailNames}</div>
          </div>`;
        }).join('')
      }
      </div>
    </div>

    <div class="card calendar-card">
      <div class="card-title">${year}年${month+1}月</div>
      ${calendarHTML}
    </div>
    </div>
  `;

  // 点击日期
  el.querySelectorAll('.day[data-date]').forEach(day => {
    day.addEventListener('click', () => {
      const dateStr = day.dataset.date;
      const c = checkins[dateStr];
      if (c) {
        alert(`${dateStr} 打卡记录\n完成动作：${c.completedExercises.length}项\n训练时长：${c.totalDuration || 0}分钟`);
      }
    });
  });
}

// ---- 数据统计 Tab ----
function renderStats() {
  const el = document.getElementById('tab-stats');
  const data = loadData();
  const allDates = Object.keys(data.checkins).sort();
  const todayStrVal = todayStr();
  const weekStart = getWeekMonday(todayStrVal);

  // 本周统计
  const weekEnd = todayStrVal; // up to today
  const weekCheckins = getCheckinsInRange(weekStart, weekEnd);
  const weekDates = Object.keys(weekCheckins);
  const weekDays = weekDates.length;
  const weekMinutes = weekDates.reduce((s, d) => s + (weekCheckins[d].totalDuration || 0), 0);

  // 本月统计
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const monthCheckins = getCheckinsInRange(monthStart, todayStrVal);
  const monthDates = Object.keys(monthCheckins);
  const monthDays = monthDates.length;
  const monthMinutes = monthDates.reduce((s, d) => s + (monthCheckins[d].totalDuration || 0), 0);

  // 部位统计（本月）
  const targetCount = {};
  for (const dateStr of monthDates) {
    const c = monthCheckins[dateStr];
    for (const eid of c.completedExercises) {
      const ex = getAllExercises().find(e => e.id === eid);
      if (ex) {
        targetCount[ex.target] = (targetCount[ex.target] || 0) + 1;
      }
    }
  }

  const maxTarget = Math.max(1, ...Object.values(targetCount));

  const streak = getCheckinStreak(data);

  const barColors = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
  let colorIdx = 0;
  const totalMinutes = allDates.reduce((s,d)=>s+(data.checkins[d].totalDuration||0),0);

  el.innerHTML = `
    <div class="section-stack">
    <div class="hero-card">
      <div class="hero-kicker">Performance</div>
      <div class="hero-title">训练表现总览</div>
      <div class="hero-subtitle">先看本周，再看本月，最后看你最近的训练趋势。</div>
      <div class="hero-metrics">
        <div class="metric"><div class="metric-value">${weekDays}</div><div class="metric-label">本周天数</div></div>
        <div class="metric"><div class="metric-value">${weekMinutes}</div><div class="metric-label">本周分钟</div></div>
        <div class="metric"><div class="metric-value">${streak}</div><div class="metric-label">连续训练</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">本周摘要</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="num">${weekDays}</div><div class="label">本周训练天数</div></div>
        <div class="stat-box"><div class="num">${weekMinutes}</div><div class="label">本周训练分钟</div></div>
        <div class="stat-box"><div class="num">${Math.max(0, 7 - weekDays)}</div><div class="label">本周剩余天数</div></div>
        <div class="stat-box"><div class="num">${streak}</div><div class="label">当前连续训练</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">本月摘要</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="num">${monthDays}</div><div class="label">本月训练天数</div></div>
        <div class="stat-box"><div class="num">${monthMinutes}</div><div class="label">本月训练分钟</div></div>
        <div class="stat-box"><div class="num">${allDates.length}</div><div class="label">累计打卡</div></div>
        <div class="stat-box"><div class="num">${totalMinutes}</div><div class="label">累计总分钟</div></div>
      </div>
    </div>

    <div class="card streak-card">
      <div class="card-title">连续训练</div>
      <div class="streak-circle" style="background:conic-gradient(var(--primary) ${Math.min(streak*36,360)}deg, var(--bg) 0deg);">
        <div class="streak-inner">
          <div style="font-size:1.8rem;font-weight:800;color:var(--primary);">${streak}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);">天</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">本月部位分布</div>
      ${Object.keys(targetCount).length === 0 ? '<div class="empty"><p>暂无数据</p></div>' :
        Object.entries(targetCount).sort((a,b) => b[1]-a[1]).map(([target, count]) => {
          const color = barColors[colorIdx++ % barColors.length];
          return `
          <div class="bar-row">
            <div class="bar-label">${targetEmoji(target)} ${target}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/maxTarget*100)}%;background:${color};">${count}次</div></div>
          </div>`;
        }).join('')
      }
    </div>

    <div class="card">
      <div class="card-title">总览说明</div>
      <div style="font-size:0.88rem;color:var(--text-secondary);line-height:1.8;">
        你已经累计打卡 <strong style="color:var(--text);">${allDates.length}</strong> 天，完成 <strong style="color:var(--text);">${totalMinutes}</strong> 分钟训练。本周已经完成 <strong style="color:var(--text);">${weekDays}</strong> 天，保持这个节奏，月度数据会继续往上走。
      </div>
    </div>
    </div>
  `;
}

// ====== 初始化 ======
function init() {
  const savedTab = getSavedActiveTab();
  const defaultTab = 'today';
  switchTab(['plan', 'today', 'history', 'stats'].includes(savedTab) ? savedTab : defaultTab);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.buttons !== 1) return;
  if (isPullRefreshBlocked(e.target)) return;
  if (window.scrollY > 0) return;
  beginPullRefresh(e.pointerId, e.clientY);
}, { passive: true });

document.addEventListener('pointermove', (e) => {
  if (!pullRefreshState.active || e.pointerId !== pullRefreshState.pointerId) return;
  if (window.scrollY > 0) {
    resetPullRefresh();
    return;
  }
  if (e.cancelable) e.preventDefault();
  updatePullRefresh(e.clientY);
}, { passive: false });

document.addEventListener('pointerup', (e) => {
  if (e.pointerId !== pullRefreshState.pointerId) return;
  endPullRefresh();
});

document.addEventListener('pointercancel', (e) => {
  if (e.pointerId !== pullRefreshState.pointerId) return;
  resetPullRefresh();
});

window.__sportPlatTriggerRefresh = triggerPullRefresh;
