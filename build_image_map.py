"""一次性从 wger 拉取有图片的动作，匹配到我们的动作库，生成 image_map.json"""
import urllib.request, json, time

print("1. 拉取所有图片...")
img_req = urllib.request.urlopen("https://wger.de/api/v2/exerciseimage/?limit=500")
img_data = json.loads(img_req.read())
ex_ids = set(r['exercise'] for r in img_data['results'])
print(f"   共 {len(img_data['results'])} 张图片, {len(ex_ids)} 个动作")

print("2. 拉取英文翻译...")
translations = {}
page_url = "https://wger.de/api/v2/exercise-translation/?language=2&limit=100"
while page_url:
    print(f"   {page_url}")
    req = urllib.request.urlopen(page_url)
    data = json.loads(req.read())
    for t in data['results']:
        eid = t['exercise']
        if eid in ex_ids and eid not in translations:
            translations[eid] = t['name']
    page_url = data['next']
    time.sleep(0.3)

print(f"   匹配到 {len(translations)} 个动作名")

print("3. 建立图片映射...")
# 每个 exercise 的第一张图片
image_map = {}
for r in img_data['results']:
    eid = r['exercise']
    if eid not in image_map:
        image_map[eid] = r['image']

# 用关键字匹配我们的动作
import sys
sys.path.insert(0, 'js')
# 手动定义关键词映射
KEYWORDS = {
    'e1':  ['squat', 'bodyweight squat', 'air squat'],
    'e2':  ['goblet squat'],
    'e3':  ['kettlebell swing'],
    'e4':  ['split squat', 'bulgarian'],
    'e5':  ['band lateral walk', 'lateral walk', 'band walk'],
    'e6':  ['glute bridge', 'hip thrust'],
    'e7':  ['romanian deadlift', 'rdl', 'deadlift'],
    'e8':  ['lunge', 'lunges'],
    'e9':  ['sumo squat'],
    'e10': ['wall sit'],
    'e11': ['dumbbell row', 'bent over row', 'one arm row'],
    'e12': ['seated row', 'band row'],
    'e13': ['superman'],
    'e14': ['kettlebell row'],
    'e15': ['lat pulldown', 'pull down'],
    'e16': ['reverse fly', 'rear delt'],
    'e17': ['pullover'],
    'e18': ['y raise', 'y raise'],
    'e19': ['push up', 'pushup', 'press up'],
    'e20': ['bench press', 'dumbbell press', 'chest press'],
    'e21': ['chest fly', 'fly'],
    'e22': ['incline push up'],
    'e23': ['diamond push up', 'narrow push'],
    'e24': ['dumbbell fly', 'flyes'],
    'e25': ['decline push up'],
    'e26': ['shoulder press', 'overhead press', 'military press'],
    'e27': ['lateral raise'],
    'e28': ['front raise'],
    'e29': ['arnold press'],
    'e30': ['bent over lateral raise', 'rear lateral'],
    'e31': ['face pull'],
    'e32': ['upright row'],
    'e33': ['bicep curl', 'biceps curl', 'dumbbell curl'],
    'e34': ['band curl'],
    'e35': ['dip', 'tricep dip'],
    'e36': ['tricep extension', 'overhead extension'],
    'e37': ['hammer curl'],
    'e38': ['tricep pushdown', 'pushdown'],
    'e39': ['concentration curl'],
    'e40': ['plank'],
    'e41': ['russian twist'],
    'e42': ['dead bug'],
    'e43': ['leg raise'],
    'e44': ['side plank'],
    'e45': ['mountain climber'],
    'e46': ['bird dog'],
    'e47': ['crunch', 'crunch', 'abdominal'],
    'e48': ['jumping jack'],
    'e49': ['high knee', 'high knees'],
    'e50': ['burpee'],
    'e51': ['jump rope', 'rope skipping'],
    'e52': ['fast feet'],
    'e53': ['squat jump', 'jump squat'],
    'e54': ['skater'],
    'e55': ['treadmill'],
    'e56': ['lunge jump'],
    'e57': ['turkish get up'],
    'e58': ['dumbbell snatch', 'snatch'],
    'e59': ['thruster'],
    'e60': ['burpee push up'],
    'e61': ['kettlebell high pull'],
    'e62': ['farmer walk', 'farmers walk'],
}

# 匹配
result = {}
for ex_id, keywords in KEYWORDS.items():
    for eid, name in translations.items():
        name_lower = name.lower()
        for kw in keywords:
            if kw in name_lower:
                result[ex_id] = image_map[eid]
                break
        if ex_id in result:
            break

print(f"4. 匹配结果: {len(result)}/62 个动作有图片")
for ex_id, url in sorted(result.items()):
    print(f"   {ex_id}: {url}")

# 写入
with open('js/image_map.json', 'w') as f:
    json.dump(result, f, indent=2)
print(f"\n写入 js/image_map.json ({len(result)} entries)")
