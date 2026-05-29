// 训练动作库
// target: 腿/背/胸/肩/手臂/核心/有氧/全身
// equipment: 自重/哑铃/弹力带/壶铃/跑步机/跳绳/瑜伽垫

const EXERCISES = [
  // ===== 腿部 =====
  { id:'e1',  name:'自重深蹲', target:'腿', equipment:'自重', duration:3, sets:4, reps:'15-20', desc:'双脚与肩同宽，下蹲至大腿与地面平行，保持背部挺直。', wgerTerm:'squat' },
  { id:'e2',  name:'哑铃高脚杯深蹲', target:'腿', equipment:'哑铃', duration:4, sets:4, reps:'12-15', desc:'双手持哑铃于胸前，手肘朝下，下蹲时保持哑铃贴胸。', wgerTerm:'goblet squat' },
  { id:'e3',  name:'壶铃摆荡', target:'腿', equipment:'壶铃', duration:3, sets:4, reps:'20', desc:'双手持壶铃，髋部发力向前顶，手臂只起连接作用，不要用手臂发力。', wgerTerm:'kettlebell swing' },
  { id:'e4',  name:'保加利亚分腿蹲', target:'腿', equipment:'哑铃', duration:4, sets:3, reps:'10-12', desc:'后脚搭在椅子上，前腿下蹲至大腿平行地面，膝盖不超过脚尖。', wgerTerm:'bulgarian split squat' },
  { id:'e5',  name:'弹力带侧向行走', target:'腿', equipment:'弹力带', duration:2, sets:3, reps:'10步/侧', desc:'弹力带套在膝盖上方，半蹲姿势向侧方移动，保持张力。', wgerTerm:'band lateral walk' },
  { id:'e6',  name:'臀桥', target:'腿', equipment:'自重', duration:2, sets:4, reps:'15-20', desc:'仰卧屈膝，臀部发力向上顶起，顶点保持1-2秒。', wgerTerm:'glute bridge' },
  { id:'e7',  name:'哑铃罗马尼亚硬拉', target:'腿', equipment:'哑铃', duration:4, sets:3, reps:'12', desc:'膝盖微屈，髋部后移，哑铃贴腿下放至小腿中段，背部始终挺直。', wgerTerm:'romanian deadlift' },
  { id:'e8',  name:'交替弓步蹲', target:'腿', equipment:'哑铃', duration:3, sets:3, reps:'10/腿', desc:'双手持哑铃，交替向前跨步下蹲，后膝接近地面但不触地。', wgerTerm:'lunge' },
  { id:'e9',  name:'相扑深蹲', target:'腿', equipment:'哑铃', duration:3, sets:4, reps:'15', desc:'宽站距脚尖外八，持哑铃下垂于腿间，下蹲后起身。', wgerTerm:'sumo squat' },
  { id:'e10', name:'靠墙静蹲', target:'腿', equipment:'自重', duration:2, sets:3, reps:'30-60秒', desc:'背靠墙，大腿平行地面，保持静态。', wgerTerm:'wall sit' },

  // ===== 背部 =====
  { id:'e11', name:'哑铃单臂划船', target:'背', equipment:'哑铃', duration:4, sets:3, reps:'12/侧', desc:'单膝跪凳，同侧手支撑，另一手持哑铃沿身体侧面上拉至髋部。', wgerTerm:'dumbbell row' },
  { id:'e12', name:'弹力带坐姿划船', target:'背', equipment:'弹力带', duration:3, sets:4, reps:'15', desc:'坐地腿伸直，弹力带绕脚底，双手拉向腹部，肩胛骨收紧。', wgerTerm:'seated row' },
  { id:'e13', name:'超人式', target:'背', equipment:'自重', duration:2, sets:3, reps:'12', desc:'俯卧，同时抬起双臂和双腿，背部发力，保持2秒后放下。', wgerTerm:'superman' },
  { id:'e14', name:'壶铃单臂划船', target:'背', equipment:'壶铃', duration:3, sets:3, reps:'10/侧', desc:'单手撑凳，另一手提壶铃做划船，肘部贴近身体。', wgerTerm:'kettlebell row' },
  { id:'e15', name:'弹力带高位下拉', target:'背', equipment:'弹力带', duration:3, sets:4, reps:'15', desc:'弹力带固定在高处，跪姿或坐姿下拉至锁骨位置。', wgerTerm:'lat pulldown band' },
  { id:'e16', name:'哑铃俯身飞鸟', target:'背', equipment:'哑铃', duration:3, sets:3, reps:'15', desc:'俯身至躯干接近水平，双臂微屈向两侧展开，挤压肩胛骨。', wgerTerm:'reverse fly' },
  { id:'e17', name:'仰卧弹力带下拉', target:'背', equipment:'弹力带', duration:3, sets:4, reps:'12', desc:'仰卧，弹力带固定于头顶方向，直臂下拉至大腿侧。', wgerTerm:'pullover' },
  { id:'e18', name:'Y字上举', target:'背', equipment:'自重', duration:2, sets:3, reps:'12', desc:'俯卧，双臂向前上方抬起呈Y字形，拇指朝上。', wgerTerm:'y raise' },

  // ===== 胸部 =====
  { id:'e19', name:'标准俯卧撑', target:'胸', equipment:'自重', duration:3, sets:4, reps:'10-15', desc:'双手略宽于肩，身体直线下放至胸部接近地面，推起时呼气。', wgerTerm:'push up' },
  { id:'e20', name:'哑铃地板卧推', target:'胸', equipment:'哑铃', duration:4, sets:4, reps:'10-12', desc:'仰卧地板，双手持哑铃推起至手臂伸直，缓慢下放。', wgerTerm:'dumbbell bench press' },
  { id:'e21', name:'弹力带夹胸', target:'胸', equipment:'弹力带', duration:2, sets:3, reps:'15', desc:'弹力带固定身后，双手从两侧向胸前合拢，挤压胸肌。', wgerTerm:'chest fly band' },
  { id:'e22', name:'上斜俯卧撑', target:'胸', equipment:'自重', duration:3, sets:4, reps:'12-15', desc:'双手撑在椅子/沙发上，身体倾斜做俯卧撑，重点刺激上胸。', wgerTerm:'incline push up' },
  { id:'e23', name:'窄距俯卧撑', target:'胸', equipment:'自重', duration:3, sets:3, reps:'8-12', desc:'双手并拢，肘部贴近身体，侧重三头肌和胸内侧。', wgerTerm:'diamond push up' },
  { id:'e24', name:'哑铃飞鸟', target:'胸', equipment:'哑铃', duration:3, sets:3, reps:'12', desc:'仰卧地板，双臂微屈向两侧展开，胸部发力合拢。', wgerTerm:'dumbbell fly' },
  { id:'e25', name:'下斜俯卧撑', target:'胸', equipment:'自重', duration:3, sets:3, reps:'10-12', desc:'脚搭在椅子上，手撑地做俯卧撑，侧重下胸。', wgerTerm:'decline push up' },

  // ===== 肩部 =====
  { id:'e26', name:'哑铃坐姿推举', target:'肩', equipment:'哑铃', duration:4, sets:4, reps:'10-12', desc:'坐姿，双手持哑铃于肩高，垂直向上推起至手臂伸直。', wgerTerm:'shoulder press' },
  { id:'e27', name:'哑铃侧平举', target:'肩', equipment:'哑铃', duration:2, sets:4, reps:'15', desc:'站姿微屈肘，双臂从体侧举至与地面平行，控制下放。', wgerTerm:'lateral raise' },
  { id:'e28', name:'弹力带前平举', target:'肩', equipment:'弹力带', duration:2, sets:3, reps:'15', desc:'踩住弹力带，双手前平举至肩高。', wgerTerm:'front raise' },
  { id:'e29', name:'阿诺德推举', target:'肩', equipment:'哑铃', duration:4, sets:3, reps:'10', desc:'坐姿，起始掌心朝内，推起过程中旋转至掌心朝前。', wgerTerm:'arnold press' },
  { id:'e30', name:'俯身侧平举', target:'肩', equipment:'哑铃', duration:2, sets:3, reps:'15', desc:'俯身至躯干接近水平，双臂向两侧平举，刺激后束。', wgerTerm:'bent over lateral raise' },
  { id:'e31', name:'弹力带面拉', target:'肩', equipment:'弹力带', duration:2, sets:4, reps:'15', desc:'弹力带固定于面前，双手拉向面部两侧，肘部向外打开。', wgerTerm:'face pull' },
  { id:'e32', name:'哑铃直立划船', target:'肩', equipment:'哑铃', duration:3, sets:3, reps:'12', desc:'双手持哑铃于体前，沿身体上拉至下巴高度，肘部朝外。', wgerTerm:'upright row' },

  // ===== 手臂 =====
  { id:'e33', name:'哑铃弯举', target:'手臂', equipment:'哑铃', duration:2, sets:4, reps:'12-15', desc:'站姿掌心朝前，肘部固定于体侧，弯举哑铃至肩高。', wgerTerm:'bicep curl' },
  { id:'e34', name:'弹力带弯举', target:'手臂', equipment:'弹力带', duration:2, sets:4, reps:'15', desc:'踩住弹力带，做弯举动作，保持慢速控制。', wgerTerm:'band curl' },
  { id:'e35', name:'椅臂屈伸', target:'手臂', equipment:'自重', duration:2, sets:3, reps:'10-15', desc:'背对椅子，双手撑椅边，屈肘下放身体，三头肌发力推起。', wgerTerm:'tricep dip' },
  { id:'e36', name:'哑铃颈后臂屈伸', target:'手臂', equipment:'哑铃', duration:2, sets:3, reps:'12', desc:'坐姿或站姿，双手托哑铃于头后，向上伸直手臂。', wgerTerm:'overhead tricep extension' },
  { id:'e37', name:'锤式弯举', target:'手臂', equipment:'哑铃', duration:2, sets:3, reps:'12', desc:'掌心相对握哑铃，弯举时保持中立握法，刺激肱桡肌。', wgerTerm:'hammer curl' },
  { id:'e38', name:'弹力带下压', target:'手臂', equipment:'弹力带', duration:2, sets:4, reps:'15', desc:'弹力带固定高处，双手下压至手臂伸直，侧重三头肌外侧头。', wgerTerm:'tricep pushdown' },
  { id:'e39', name:'集中弯举', target:'手臂', equipment:'哑铃', duration:2, sets:3, reps:'10-12/侧', desc:'坐姿肘部抵大腿内侧，单臂弯举，顶峰收缩1秒。', wgerTerm:'concentration curl' },

  // ===== 核心 =====
  { id:'e40', name:'平板支撑', target:'核心', equipment:'瑜伽垫', duration:2, sets:3, reps:'30-60秒', desc:'俯卧，肘部支撑，身体呈一条直线，收紧腹部和臀部。', wgerTerm:'plank' },
  { id:'e41', name:'俄罗斯转体', target:'核心', equipment:'哑铃', duration:2, sets:3, reps:'20', desc:'坐姿脚离地，双手持哑铃左右扭转，保持背部挺直。', wgerTerm:'russian twist' },
  { id:'e42', name:'死虫式', target:'核心', equipment:'瑜伽垫', duration:2, sets:3, reps:'10/侧', desc:'仰卧，对侧手脚同时伸展，核心收紧保持腰部贴地。', wgerTerm:'dead bug' },
  { id:'e43', name:'仰卧举腿', target:'核心', equipment:'瑜伽垫', duration:2, sets:3, reps:'15', desc:'仰卧双腿并拢上举至90度，缓慢下放，腰部始终贴地。', wgerTerm:'leg raise' },
  { id:'e44', name:'侧平板', target:'核心', equipment:'瑜伽垫', duration:1, sets:3, reps:'20-30秒/侧', desc:'侧卧单肘支撑，髋部上抬保持身体直线。', wgerTerm:'side plank' },
  { id:'e45', name:'登山者', target:'核心', equipment:'自重', duration:2, sets:3, reps:'30', desc:'俯卧撑姿势，交替提膝至胸前，保持核心收紧。', wgerTerm:'mountain climber' },
  { id:'e46', name:'鸟狗式', target:'核心', equipment:'瑜伽垫', duration:2, sets:3, reps:'10/侧', desc:'四足跪姿，伸展对侧手脚，保持身体稳定不晃动。', wgerTerm:'bird dog' },
  { id:'e47', name:'卷腹', target:'核心', equipment:'瑜伽垫', duration:2, sets:4, reps:'15-20', desc:'仰卧屈膝，肩胛骨抬离地面卷曲上腹，下放时不完全躺平。', wgerTerm:'crunch' },

  // ===== 有氧 =====
  { id:'e48', name:'开合跳', target:'有氧', equipment:'自重', duration:2, sets:3, reps:'30-60秒', desc:'双脚开合跳跃，同时双手在头顶和体侧交替，保持节奏。', wgerTerm:'jumping jack' },
  { id:'e49', name:'高抬腿', target:'有氧', equipment:'自重', duration:2, sets:3, reps:'30秒', desc:'原地快速交替抬高大腿至水平，摆臂配合。', wgerTerm:'high knees' },
  { id:'e50', name:'波比跳', target:'有氧', equipment:'自重', duration:3, sets:3, reps:'8-12', desc:'站姿→下蹲→踢腿至俯卧撑位→收腿→跳起，连贯完成。', wgerTerm:'burpee' },
  { id:'e51', name:'跳绳', target:'有氧', equipment:'跳绳', duration:5, sets:2, reps:'3-5分钟', desc:'双脚并拢轻跳，手腕发力摇绳，保持匀速呼吸。', wgerTerm:'jump rope' },
  { id:'e52', name:'原地小碎步', target:'有氧', equipment:'自重', duration:2, sets:3, reps:'30秒', desc:'微屈膝快速小步交替，前脚掌着地。', wgerTerm:'fast feet' },
  { id:'e53', name:'深蹲跳', target:'有氧', equipment:'自重', duration:2, sets:3, reps:'15', desc:'深蹲后爆发跳起，落地缓冲进入下一次深蹲。', wgerTerm:'squat jump' },
  { id:'e54', name:'滑冰步', target:'有氧', equipment:'自重', duration:2, sets:3, reps:'20', desc:'侧向跳跃，落地时对侧脚后摆，模仿滑冰动作。', wgerTerm:'skater' },
  { id:'e55', name:'跑步机慢跑', target:'有氧', equipment:'跑步机', duration:5, sets:1, reps:'15-30分钟', desc:'匀速慢跑，心率保持在最大心率60-70%，可间隔变速。', wgerTerm:'treadmill jog' },
  { id:'e56', name:'箭步蹲跳', target:'有氧', equipment:'自重', duration:2, sets:3, reps:'12/侧', desc:'弓步姿势跳起交换双腿，落地缓冲保持平衡。', wgerTerm:'lunge jump' },

  // ===== 全身 =====
  { id:'e57', name:'壶铃土耳其起立', target:'全身', equipment:'壶铃', duration:4, sets:2, reps:'3/侧', desc:'手持壶铃从仰卧到站立再返回，全程保持手臂垂直于地面。', wgerTerm:'turkish get up' },
  { id:'e58', name:'哑铃抓举', target:'全身', equipment:'哑铃', duration:3, sets:3, reps:'8/侧', desc:'单手持哑铃从地面一次性举至头顶，髋膝踝协调发力。', wgerTerm:'dumbbell snatch' },
  { id:'e59', name:'哑铃火箭推', target:'全身', equipment:'哑铃', duration:3, sets:3, reps:'12', desc:'持哑铃于肩部→深蹲→站起时顺势推举过头顶。', wgerTerm:'thruster' },
  { id:'e60', name:'波比俯卧撑', target:'全身', equipment:'自重', duration:3, sets:3, reps:'8', desc:'波比跳中加入一次俯卧撑，极度考验心肺和力量。', wgerTerm:'burpee push up' },
  { id:'e61', name:'壶铃高拉', target:'全身', equipment:'壶铃', duration:3, sets:3, reps:'10/侧', desc:'壶铃从腿间摆至胸前，肘部向上拉开，全身协调发力。', wgerTerm:'kettlebell high pull' },
  { id:'e62', name:'哑铃农夫行走', target:'全身', equipment:'哑铃', duration:3, sets:3, reps:'30步', desc:'双手提重哑铃于体侧，核心收紧，自然行走保持身体不侧倾。', wgerTerm:'farmer walk' },
];

// ====== 自定义动作库 ======

const CUSTOM_EX_KEY = 'sport_plat_custom_ex';

function loadCustomExercises() {
  try {
    const raw = localStorage.getItem(CUSTOM_EX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveCustomExercises(list) {
  localStorage.setItem(CUSTOM_EX_KEY, JSON.stringify(list));
}

function addCustomExercise({ name, target, equipment, duration, sets, reps, desc }) {
  const list = loadCustomExercises();
  const ex = {
    id: 'custom_' + Date.now(),
    name,
    target,
    equipment,
    duration: Math.max(1, Math.min(60, Number(duration) || 5)),
    sets: Math.max(1, Math.min(10, Number(sets) || 1)),
    reps: reps || '-',
    desc: desc || '',
    custom: true,
  };
  list.push(ex);
  saveCustomExercises(list);
  return ex;
}

function removeCustomExercise(id) {
  const list = loadCustomExercises().filter(e => e.id !== id);
  saveCustomExercises(list);
}

// 合并内置 + 自定义动作
function getAllExercises() {
  return [...EXERCISES, ...loadCustomExercises()];
}

// 按目标部位筛选（使用合并后的列表）
function filterByTarget(targets) {
  const all = getAllExercises();
  if (!targets || targets.length === 0) return all;
  return all.filter(e => targets.includes(e.target));
}

// 按器械筛选
function filterByEquipment(equipment) {
  const all = getAllExercises();
  if (!equipment || equipment.length === 0) return all;
  return all.filter(e => equipment.includes(e.equipment));
}

// 按目标和器械同时筛选
function filterExercises({ targets, equipment }) {
  const all = getAllExercises();
  let result = all;
  if (targets && targets.length > 0) {
    result = result.filter(e => targets.includes(e.target));
  }
  if (equipment && equipment.length > 0) {
    result = result.filter(e => equipment.includes(e.equipment));
  }
  return result;
}

// 获取唯一部位列表（含自定义）
function getAllTargets() {
  return [...new Set(getAllExercises().map(e => e.target))];
}

// 获取唯一器械列表（含自定义）
function getAllEquipment() {
  return [...new Set(getAllExercises().map(e => e.equipment))];
}

// ====== 动作图标（按部位配色） ======

// wger 离线图片映射（build_image_map.py 生成）
const IMAGE_MAP = {"e1":"https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg","e2":"https://wger.de/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg","e3":"https://wger.de/media/exercise-images/960/da4d0560-da89-4bb5-b91f-746458fb04ad.png","e4":"https://wger.de/media/exercise-images/1706/0c5243cc-2539-4005-aee0-d3a8c5d3a32c.jfif","e6":"https://wger.de/media/exercise-images/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp","e7":"https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg","e8":"https://wger.de/media/exercise-images/1830/3b6c547c-ab3d-4472-93cf-561710279eab.jpg","e11":"https://wger.de/media/exercise-images/81/a751a438-ae2d-4751-8d61-cef0e9292174.png","e12":"https://wger.de/media/exercise-images/1725/f0ebd44e-b8e1-400c-b598-ca371f3a07af.png","e15":"https://wger.de/media/exercise-images/158/02e8a7c3-dc67-434e-a4bc-77fdecf84b49.webp","e16":"https://wger.de/media/exercise-images/1227/57415c3c-2963-4130-9f6f-79f6a96113b6.gif","e17":"https://wger.de/media/exercise-images/1634/9a4704d3-1b25-43e3-b244-3885f4d3db87.png","e19":"https://wger.de/media/exercise-images/1217/590e65db-de60-4727-b7eb-55f80af56043.png","e20":"https://wger.de/media/exercise-images/1897/9abec4e4-90ba-44f9-9e6e-5e35f7273078.png","e21":"https://wger.de/media/exercise-images/1922/eb750ee5-3220-4128-aef1-5e2f1ccff40a.webp","e26":"https://wger.de/media/exercise-images/418/fa2a2207-43cb-4dc0-bc2a-039e32544790.png","e27":"https://wger.de/media/exercise-images/1378/7c1fcf34-fb7e-45e7-a0c1-51f296235315.jpg","e28":"https://wger.de/media/exercise-images/1745/9c92843a-6b90-428b-a868-9af4b11bad38.jpg","e31":"https://wger.de/media/exercise-images/1639/8927346e-f5ca-4795-bdf1-5ac9309401e7.webp","e33":"https://wger.de/media/exercise-images/1192/651a4535-8210-4dbd-8f06-61d95fdd9963.png","e35":"https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png","e37":"https://wger.de/media/exercise-images/1567/0a8c155c-a48e-47e8-9df3-e39f025c6cad.png","e38":"https://wger.de/media/exercise-images/1900/a8243245-8f8f-4e2b-93ca-694d416cb11d.png","e43":"https://wger.de/media/exercise-images/1889/bc51ef67-0c12-4340-a36c-42ef722778dd.png","e46":"https://wger.de/media/exercise-images/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png","e47":"https://wger.de/media/exercise-images/91/Crunches-1.png","e49":"https://wger.de/media/exercise-images/285/4141e8b2-d9f2-4597-8ef0-7768127fd0ec.png","e58":"https://wger.de/media/exercise-images/1947/4201a9c0-f9e4-48ca-80f1-b46c7ffe5640.webp"};

const TARGET_STYLE = {
  '腿':   { emoji:'🦵', bg:'#fde8e8', color:'#c0392b' },
  '背':   { emoji:'🔙', bg:'#e8f0fe', color:'#2471a3' },
  '胸':   { emoji:'🦍', bg:'#fef5e7', color:'#b9770e' },
  '肩':   { emoji:'🙆', bg:'#f4ecf7', color:'#7d3c98' },
  '手臂': { emoji:'💪', bg:'#fef9e7', color:'#b7950b' },
  '核心': { emoji:'🎯', bg:'#e8faf0', color:'#1e8449' },
  '有氧': { emoji:'🏃', bg:'#e8f8f5', color:'#148f77' },
  '全身': { emoji:'🔥', bg:'#fdedec', color:'#c0392b' },
};

function targetEmoji(target) {
  return (TARGET_STYLE[target] || TARGET_STYLE['全身']).emoji;
}

function getExerciseImage(exercise) {
  // 有 wger 真图就用真图
  if (IMAGE_MAP[exercise.id]) {
    return `<img src="${IMAGE_MAP[exercise.id]}" alt="${exercise.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
  }
  // 否则用颜色卡片
  const style = TARGET_STYLE[exercise.target] || TARGET_STYLE['全身'];
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${style.bg};border-radius:14px;font-size:1.6rem;">${style.emoji}</div>`;
}

// 部位 → tag 颜色 class
function targetTagClass(target) {
  const m = { '腿':'tag-leg','背':'tag-back','胸':'tag-chest','肩':'tag-shoulder','手臂':'tag-arm','核心':'tag-core','有氧':'tag-cardio','全身':'tag-full' };
  return m[target] || 'tag-full';
}
