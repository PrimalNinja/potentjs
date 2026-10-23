# SEOUL MATES - the 100 people (50 guys, 50 girls): the K-POP GROUP MANAGER trainees grown up -
# the same names and faces - with ages, jobs and the places they hang out.
# Writes people.json (for the story writers and storyc.py) and people.bin (the records, put in
# the story banks by storyc.py).   (run: python3 tools/people.py)
# (c) 2026 Cyborg Unicorn Pty Ltd. Everyone here is made up.
import os, sys, json, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import idols_base as I

PLACES = ['HOME', 'OFFICE', 'CAFE', 'MALL', 'BOUTIQUE', 'GYM', 'PARK', 'BEACH', 'CINEMA',
          'RESTAURANT', 'BAR', 'CLUB', 'KARAOKE', 'CONCERT HALL', 'FUNFAIR', 'CHAPEL']
JOBS = ['BARISTA', 'NURSE', 'FIREFIGHTER', 'CHEF', 'PROGRAMMER', 'LAWYER', 'TATTOO ARTIST',
        'PERSONAL TRAINER', 'FLORIST', 'PILOT', 'VET', 'TEACHER', 'PHOTOGRAPHER', 'BAKER', 'BANKER',
        'DJ', 'BARTENDER', 'ARCHITECT', 'MODEL', 'DENTIST', 'MUSICIAN', 'DESIGNER', 'JOURNALIST',
        'FLIGHT ATTENDANT', 'MECHANIC', 'LIBRARIAN', 'ACTOR', 'WEBTOON ARTIST', 'STOCK TRADER',
        'YOGA TEACHER', 'DOCTOR', 'HAIRSTYLIST', 'BOOKSHOP OWNER', 'GAME DEVELOPER', 'SOMMELIER',
        'MARINE BIOLOGIST', 'STREAMER', 'FASHION BUYER', 'LIFEGUARD', 'SURFER', 'DANCER',
        'ACCOUNTANT', 'SALES MANAGER', 'PHYSIO', 'ZOOKEEPER', 'POTTER', 'RADIO HOST', 'COURIER',
        'EVENT PLANNER', 'SINGER']
# where a job takes someone
JOBP = {'BARISTA': 2, 'CHEF': 9, 'PERSONAL TRAINER': 5, 'BARTENDER': 10, 'DJ': 11, 'MODEL': 4,
        'MUSICIAN': 13, 'SINGER': 12, 'FASHION BUYER': 4, 'LIFEGUARD': 7, 'SURFER': 7, 'DANCER': 11,
        'YOGA TEACHER': 6, 'SOMMELIER': 9, 'ACTOR': 8, 'MARINE BIOLOGIST': 7, 'ZOOKEEPER': 14,
        'EVENT PLANNER': 13, 'HAIRSTYLIST': 3, 'STREAMER': 12, 'BAKER': 2, 'ACCOUNTANT': 1,
        'SALES MANAGER': 1, 'PROGRAMMER': 1, 'DESIGNER': 1, 'BANKER': 1, 'LAWYER': 1}
HOBP = {'BAKING COOKIES': 2, 'PHOTOGRAPHY': 6, 'SKATEBOARDING': 6, 'GAMING': 3, 'DRAWING CATS': 2,
        'COOKING RAMEN': 9, 'PIANO': 13, 'GUITAR': 13, 'BASKETBALL': 5, 'SWIMMING': 7,
        'WRITING LYRICS': 2, 'WATCHING DRAMAS': 8, 'COLLECTING PLUSH': 14, 'CAMPING': 6,
        'DANCE COVERS': 11, 'BOXING': 5, 'YOGA': 5, 'JIGSAW PUZZLES': 2, 'ANIME': 8, 'FISHING': 7,
        'TAEKWONDO': 5, 'MAKEUP ART': 4, 'NAIL ART': 3, 'KNITTING': 2, 'SINGING TROT': 12,
        'BEATBOXING': 12, 'MAGIC TRICKS': 10, 'RUNNING': 6, 'BOARD GAMES': 2, 'CALLIGRAPHY': 2,
        'HOUSE PLANTS': 3, 'MAKING COFFEE': 2, 'SNOWBOARDING': 5, 'BOWLING': 3, 'CLAW MACHINES': 14,
        'BADMINTON': 6, 'POETRY': 2, 'CARTOONS': 8, 'NAPPING': 6, 'VLOGGING': 3,
        'ROLLER SKATING': 14, 'STAR GAZING': 7, 'LEGO': 3, 'BUBBLE TEA': 3, 'KARAOKE': 12,
        'FOOTBALL': 6}
TRAITP = {'CHEERFUL': 14, 'SHY': 2, 'BORN LEADER': 9, 'PRANKSTER': 12, 'HARD WORKER': 5,
          'FOODIE': 9, '4D': 8, 'CHIC': 10, 'SOFTIE': 6, 'CHARISMATIC': 11}
# what wins them over (a stat: 0 style, 1 fitness, 2 charm, 3 money)
TASTE = {'CHEERFUL': 2, 'SHY': 2, 'BORN LEADER': 1, 'PRANKSTER': 2, 'HARD WORKER': 1,
         'FOODIE': 3, '4D': 2, 'CHIC': 0, 'SOFTIE': 0, 'CHARISMATIC': 0}

random.seed(1004)
jobs = JOBS[:]
random.shuffle(jobs)
people = []
for i, d in enumerate(I.idols):
    g = d['g']
    job = jobs[(i * 7 + g * 3) % len(jobs)] if True else None
    trait = I.TRAITS[d['trait']]
    hs = []
    for p in (JOBP.get(job), HOBP.get(d['hobby']), TRAITP[trait]):
        if p is not None and p not in hs: hs.append(p)
    while len(hs) < 3:
        p = random.randint(2, 14)
        if p not in hs: hs.append(p)
    age = 21 + (d['age'] - 18) + random.randint(0, 7)          # all adults: 21-34
    people.append(dict(id=i, name=d['name'], full=d['full'], girl=g, age=age, height=d['height'],
                       blood='A B O AB'.split()[d['blood']], city=d['city'], job=job, trait=trait,
                       hobby=d['hobby'], birthday='%d/%d' % (d['day'], d['month']),
                       haunts=[PLACES[p] for p in hs], hauntn=hs, taste=TASTE[trait],
                       look=d['look'], month=d['month'], day=d['day'], bloodn=d['blood']))

json.dump(dict(places=PLACES, people=people), open(os.path.join(HERE, 'people.json'), 'w'), indent=1)

# ---------------------------------------------------------------- the records (32 bytes each)
# 0 girl, 1 age, 2 height - 100, 3 blood, 4 trait, 5 taste, 6 month, 7 day, 8-16 the look,
# 17-19 haunts, 20 job, 21 hobby, 22 city, 23 (spare), 24-31 the name
CITIES = I.CITIES + sorted(set(a[1] for a in I.ABROAD))
def fixed(s, n): return [ord(ch) for ch in s[:n].ljust(n)]
data = bytearray()
for p in people:
    r = [p['girl'], p['age'], p['height'] - 100, p['bloodn'], I.TRAITS.index(p['trait']), p['taste'],
         p['month'], p['day']] + p['look'] + p['hauntn'] + [JOBS.index(p['job']), I.HOBBIES.index(p['hobby']),
         CITIES.index(p['city']), 0] + fixed(p['name'], 8)
    assert len(r) == 32
    data += bytes(r)
# the word tables after: full names (14 each), jobs (16), hobbies (16), cities (12), traits (12)
tabs = {}
tabs['FULL'] = len(data)
for p in people: data += bytes(fixed(p['full'], 14))
for nm, tab, w in (('JOB', JOBS, 16), ('HOBBY', I.HOBBIES, 16), ('CITY', CITIES, 12), ('TRAIT', I.TRAITS, 12)):
    tabs[nm] = len(data)
    for t in tab: data += bytes(fixed(t, w))
open(os.path.join(HERE, 'people.bin'), 'wb').write(data)
json.dump(tabs, open(os.path.join(HERE, 'people_tabs.json'), 'w'))
print('people.bin:', len(data), 'bytes', tabs)
if __name__ == '__main__':
    from collections import Counter
    print(Counter(h for p in people for h in p['haunts']))
    for p in people[:3] + people[50:53]: print(p['name'], p['age'], p['job'], p['trait'], p['hobby'], p['haunts'])
