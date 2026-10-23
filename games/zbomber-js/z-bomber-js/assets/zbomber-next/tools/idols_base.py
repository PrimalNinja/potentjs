# KPOP GROUP MANAGER - the 100 trainees (50 guys, 50 girls): names, profiles, stats and looks.
# Writes ../Idols.cls (the data, read with Peek) and tools/idols_preview.png (every face).
# (run: python3 tools/idols.py)   (c) 2026 Cyborg Unicorn Pty Ltd
# Everyone here is made up: change a name, a stat or a look and run it again.
import os, sys, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import art_kpop as A
from PIL import Image

random.seed(2026)

BOYS = ['RAON', 'DAON', 'HAEON', 'YUL', 'SEJIN', 'TAEO', 'JUNHA', 'RIO', 'LEON', 'HARU',
        'MINU', 'SEOHAN', 'IAN', 'NOLAN', 'KIAN', 'YEON', 'ROHAN', 'GYEOL', 'HWAN', 'DAEHO',
        'SIHU', 'JAEON', 'TERU', 'CHAEON', 'DOHA', 'EZRA', 'FINN', 'GEON', 'HYUNO', 'IJUN',
        'JAYCE', 'KANGHO', 'LUCA', 'MIRO', 'NAMU', 'ODIN', 'PARAN', 'REO', 'SEOK', 'TAEHA',
        'UJIN', 'VIN', 'WOOHA', 'XIAN', 'YUHO', 'ZEN', 'BAEON', 'CHAHO', 'DOJIN', 'EUNHO']
GIRLS = ['SERIN', 'YUNE', 'HAEUN', 'SOAH', 'BOREUM', 'DAHEE', 'ARA', 'NARIN', 'MISO', 'SEOA',
         'CHAEIN', 'JIAN', 'RUBI', 'LUMI', 'HAYUL', 'IRIS', 'YERA', 'SUAH', 'DAIN', 'EUNSOL',
         'MIRAE', 'NAREUM', 'GARAM', 'BYEOL', 'SORA', 'HYEMI', 'KOKO', 'LIEN', 'MOA', 'NAYA',
         'OHRA', 'PIA', 'RIRI', 'SAEBOM', 'TIA', 'UNA', 'VERA', 'WINNIE', 'XIYU', 'YEBIN',
         'ZOE', 'AEJIN', 'BOMNAL', 'CHERRY', 'DOYE', 'ELLA', 'HAZEL', 'JUNE', 'KIRA', 'SUNA']
SURN = ['KIM', 'LEE', 'PARK', 'CHOI', 'JUNG', 'KANG', 'YOON', 'HAN', 'SEO', 'SHIN', 'OH', 'LIM',
        'JANG', 'MOON', 'BAE', 'SONG', 'HWANG', 'AHN', 'YOO', 'KWON', 'NAM', 'GO', 'HA', 'CHA']
GIVEN_B = ['DOYUN', 'SEOJUN', 'HAJUN', 'JUWON', 'MINJUN', 'SIWOO', 'YEJUN', 'GEONWOO', 'WOOJIN',
           'SEUNGHO', 'TAEYOON', 'JIWAN', 'HYUNSEO', 'DONGHA', 'EUNCHAN', 'JAEMIN', 'SUNGJAE',
           'KYUNGHO', 'YOUNGJAE', 'INHO', 'SANGWOO', 'JONGHYUN', 'MINSEOK', 'HOJIN']
GIVEN_G = ['SEOYEON', 'HAYOON', 'JIWOO', 'SEOAH', 'HAEUN', 'SUBIN', 'YEJIN', 'DAYEON', 'MINSEO',
           'CHAEYEON', 'SOYUL', 'YUNSEO', 'JIAN', 'NAYOON', 'SEORIN', 'EUNJI', 'HYEWON', 'BORA',
           'SUA', 'YERIN', 'DAHYUN', 'GAYOUNG', 'SOHEE', 'JIMIN']
# (overseas trainees: a name of their own, a home city)
ABROAD = [('TANAKA RIN', 'TOKYO', 1), ('SATO HINA', 'OSAKA', 1), ('LIN XIAOYU', 'TAIPEI', 1),
          ('PIM SRISUK', 'BANGKOK', 1), ('MIA TAYLOR', 'SYDNEY', 1), ('ANA REYES', 'MANILA', 1),
          ('CHLOE WONG', 'VANCOUVER', 1), ('NADIA PUTRI', 'JAKARTA', 1),
          ('KENTO MORI', 'TOKYO', 0), ('WEI ZHANG', 'SHANGHAI', 0), ('MARK DAVIS', 'LOS ANGELES', 0),
          ('JAMES PARK', 'SYDNEY', 0), ('NIN CHAI', 'BANGKOK', 0), ('LEO CRUZ', 'MANILA', 0),
          ('RYO ITO', 'OSAKA', 0), ('ALEX TAN', 'SINGAPORE', 0)]
CITIES = ['SEOUL', 'BUSAN', 'INCHEON', 'DAEGU', 'GWANGJU', 'DAEJEON', 'JEJU', 'ULSAN', 'SUWON',
          'JEONJU', 'CHUNCHEON', 'POHANG']
HOBBIES = ['BAKING COOKIES', 'PHOTOGRAPHY', 'SKATEBOARDING', 'GAMING', 'DRAWING CATS', 'COOKING RAMEN',
           'PIANO', 'GUITAR', 'BASKETBALL', 'SWIMMING', 'WRITING LYRICS', 'WATCHING DRAMAS',
           'COLLECTING PLUSH', 'CAMPING', 'DANCE COVERS', 'BOXING', 'YOGA', 'JIGSAW PUZZLES', 'ANIME',
           'FISHING', 'TAEKWONDO', 'MAKEUP ART', 'NAIL ART', 'KNITTING', 'SINGING TROT', 'BEATBOXING',
           'MAGIC TRICKS', 'RUNNING', 'BOARD GAMES', 'CALLIGRAPHY', 'HOUSE PLANTS', 'MAKING COFFEE',
           'SNOWBOARDING', 'BOWLING', 'CLAW MACHINES', 'BADMINTON', 'POETRY', 'CARTOONS', 'NAPPING',
           'VLOGGING', 'ROLLER SKATING', 'STAR GAZING', 'LEGO', 'BUBBLE TEA', 'KARAOKE', 'FOOTBALL']
TRAITS = ['CHEERFUL', 'SHY', 'BORN LEADER', 'PRANKSTER', 'HARD WORKER', 'FOODIE', '4D', 'CHIC',
          'SOFTIE', 'CHARISMATIC']
POS = ['LEADER', 'MAIN VOCAL', 'LEAD VOCAL', 'MAIN RAPPER', 'MAIN DANCER', 'VISUAL', 'ALL-ROUNDER']
BLOOD = ['A', 'B', 'O', 'AB']

# stats: vocal, dance, rap, visual, charm
def stats(spec):
    base = [random.randint(25, 60) for _ in range(5)]
    star = {'MAIN VOCAL': [0], 'LEAD VOCAL': [0, 1], 'MAIN RAPPER': [2], 'MAIN DANCER': [1],
            'VISUAL': [3], 'LEADER': [4], 'ALL-ROUNDER': [0, 1, 2]}[spec]
    for k in star: base[k] = random.randint(62, 92) if len(star) < 3 else random.randint(55, 75)
    if spec == 'LEADER': base[random.choice([0, 1, 2])] = random.randint(55, 75)
    return base

def look_for(g, used):
    for _ in range(1000):
        face = random.choice([0, 0, 1]) if g else random.choice([1, 1, 0])
        hair = random.randint(0, 7) if g else random.randint(8, 14)
        hc = random.choice([0, 0, 1, 1, 2, 3, 4, 5, 6, 7])
        eyes = random.choice([0, 0, 1, 1, 4, 5, 7, 2]) if g else random.choice([2, 2, 3, 3, 4, 5, 6, 6])
        ec = random.choice([0, 0, 1, 1, 2])
        mouth = random.randint(0, 5)
        skin = random.choice([0, 0, 1, 1, 2])
        if g: acc = random.choice([0, 0, 1, 2, 3, 4, 5, 6])
        else: acc = random.choice([0, 0, 0, 5, 5, 6])
        out = random.randint(0, 7) if g else random.choice([0, 1, 2, 3, 4, 6, 7])
        key = (g, hair, hc, eyes, mouth)
        if key not in used:
            used.add(key)
            return [face, skin, hair, hc, eyes, ec, mouth, acc, out]
    raise RuntimeError('no new look')

idols = []
used = set()
abroad = {0: [a for a in ABROAD if a[2] == 0], 1: [a for a in ABROAD if a[2] == 1]}
specs = POS * 8
for g, names in ((0, BOYS), (1, GIRLS)):
    random.shuffle(specs)
    ab = list(abroad[g])
    ai = random.sample(range(50), len(ab))
    for k, nm in enumerate(names):
        if k in ai:
            full, city, _ = ab.pop()
        else:
            full = random.choice(SURN) + ' ' + random.choice(GIVEN_G if g else GIVEN_B)
            city = random.choice(CITIES)
        spec = specs[k]
        st = stats(spec)
        age = random.randint(18, 25)
        h = random.randint(158, 171) if g else random.randint(171, 186)
        idols.append(dict(name=nm, full=full, city=city, g=g, age=age, height=h, blood=random.randint(0, 3),
                          pos=POS.index(spec), st=st, trait=random.randint(0, len(TRAITS) - 1),
                          hobby=random.choice(HOBBIES), month=random.randint(1, 12), day=random.randint(1, 28),
                          look=look_for(g, used)))

# ---------------------------------------------------------------- a face, put together (as the game does)
SPAL = A.SP
def compose(look, scale=2):
    face, skin, hair, hc, eyes, ec, mouth, acc, out = look
    im = Image.new('RGB', (32, 32), (40, 0, 40))
    px = im.load()
    def draw(cv, ox, oy, row):
        for y in range(cv.h):
            for x in range(cv.w):
                v = cv.p[y][x]
                if v is None: continue
                X, Y = ox + x, oy + y
                if 0 <= X < 32 and 0 <= Y < 32: px[X, Y] = SPAL[row][v]
    draw(A.outfit(out), 0, 16, 0)
    draw(A.face(face), 0, 0, 1 + skin)
    draw(A.mouth(mouth), 8, 16, 1 + skin)
    draw(A.eyes(eyes), 0, 8, 12 + ec)
    draw(A.hairdo(hair), 0, 0, 4 + hc)
    if acc:
        ax, ay = ACCXY[acc]
        draw(A.acc(acc), ax, ay, 0)
    return im.resize((32 * scale, 32 * scale), Image.NEAREST)

# where each accessory goes (its sprite's top left, in the 32 x 32 face)
ACCXY = {1: (14, -4), 2: (19, 2), 3: (1, 3), 4: (19, 3), 5: (16, 10), 6: (0, 8)}

if False:
    sheet = Image.new('RGB', (10 * 70, 10 * 80), (20, 0, 30))
    for i, d in enumerate(idols):
        sheet.paste(compose(d['look']), ((i % 10) * 70 + 3, (i // 10) * 80 + 3))
    sheet.save(os.path.join(HERE, 'idols_preview.png'))
    print(len(idols), 'idols')

