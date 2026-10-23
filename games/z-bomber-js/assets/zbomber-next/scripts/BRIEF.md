# Z-BOMBER - writing the story

Z-BOMBER is a ZX Spectrum Next strategy game: capture the flag in space, played on an
isometric map of 8 x 8 sectors. Between the battles the crew talk (big face portraits and a text
box, like a visual novel). Everything here is original: our own ship, crew, enemy and worlds.

## The premise

The year 2199. Humanity's colonies run from Mars to the edge of the solar system, joined by
**jump gates**. Each side keeps the key to its gates in its home base: a **STAR KEY** (a crystal
the size of a fist that holds the jump routes). Whoever holds both keys of a sector controls its
gate.

The **IRON SWARM** - machine fleets from beyond Neptune, led by the cold, theatrical **ADMIRAL
VELK** - is pushing in, sector by sector, toward Earth. If the Swarm takes Earth's key in a
sector, that gate opens for them.

Earth's answer is the **Z-BOMBER**: a prototype warship made of three craft that fly apart and
**combine** into one (the Z-BOMBER COMBINE: the big moment of every battle):
- **SPEAR** - the fast fighter (the nose)
- **ANVIL** - the heavy gunship (the body and the big cannon)
- **LANTERN** - the scout and sensor ship (the tail and the shields)

The player is **the Captain** ({P}, on the bridge), commanding the Z-BOMBER and the frigates of
the defence fleet across five sectors. In each sector you must **take the Swarm's STAR KEY from
its base and bring it home, while holding on to yours**. Win, and the sector's gate is yours and
you jump on toward the Swarm's home; lose your key, and you fall back and try again.

Tone: classic 1980s Saturday-morning space opera - brave, earnest, a bit cheesy, with banter,
rivalry and warmth in the crew, a villain who monologues, and a mystery. Light humour. No real
people, ships or companies. Nothing from any existing show or game: our own names and ideas.

## The cast (faces are drawn for each one; write them as these people)

| Speaker | Who |
|---|---|
| `@P` ({P}) | **you, the Captain**: calm under fire, dry humour, the crew's anchor. Named by the player (8 letters at most): write "{P}" for the name, never a made-up one; never he/she about the Captain |
| `@J` | **JIN**: pilot of SPEAR. Hotshot, cocky, loud, brave to a fault, calls the Captain "boss" |
| `@M` | **MAYA**: gunner of ANVIL. Blunt, competitive with Jin, loves the big cannon, a mechanic's hands |
| `@D` | **DR YOON**: the engineer, flies LANTERN. Older, glasses, gentle, worried about the ship like a parent; built the Z-BOMBER |
| `@A` | **ARI**: the Z-BOMBER's AI, shown as a hologram. Precise, curious about humans, deadpan jokes, quietly growing a heart. She is the one who calls out "Z-BOMBER, COMBINE!" |
| `@O` | **MARSHAL ODO**: Earth Command, on the screen from Mars. Gruff, proud, gives the orders and the bad news |
| `@V` | **ADMIRAL VELK**: commander of the IRON SWARM, on the screen. Grand, cold, poetic, sure of victory; secretly not a machine at all |
| `@S` | **SERA**: Velk's second-in-command, a human raised by the Swarm. Sharp, proud; she doubts Velk, and in sector 3 she contacts you |
| `@N` | the narrator (no face): short, punchy stage directions in capitals' spirit |

## The five sectors

| | Sector | What's there |
|---|---|---|
| 1 | **MARS GATE** | the jump gate over Mars, the defence fleet's home. The Swarm's first strike |
| 2 | **THE BELT** | the asteroid belt, mining towns, rocks to hide in |
| 3 | **GANYMEDE** | Jupiter's moon, ice cities under the gas giant's storms; Sera contacts you |
| 4 | **THE RINGS** | Saturn's rings, ice and dust fields, a lost colony |
| 5 | **THE HOLLOW THRONE** | beyond Neptune: the Swarm's home, a hollow world. Velk's truth |

The story arc: the Swarm attacks Mars; you push them back sector by sector; Sera reveals in
sector 3 that the Swarm's machines are run by one mind - Velk - and that Velk is human, the last
survivor of a lost colony ship, who "became" the Swarm. In the Rings you find the wreck of that
colony ship. At the Hollow Throne you face Velk: the ending is a victory with a heart (Ari talks
to the Swarm machine-to-machine; Velk, beaten, is given a choice; Sera's fate). End on a warm,
funny beat with the crew.

## The scenes (file: `scripts/STORY.txt`, in exactly this order)

| Scene | When | Length |
|---|---|---|
| `PROLOGUE` | Mars, the Swarm's attack, the Z-BOMBER's first launch, the STAR KEYS explained, the crew introduced | 160-240 words |
| `M1IN` .. `M5IN` | before each sector's battle: Odo's briefing or the crew arriving, what's at stake, Velk taunting | 60-100 words |
| `M1COMBINE` .. `M5COMBINE` | the Z-BOMBER's first battle in that sector: the three craft combine (Ari calls it), a line each, different every time | 25-50 words |
| `M1WIN` .. `M4WIN` | the Swarm's key taken home: what happened, a story beat, then **a choice of exactly 2** about how to prepare for the next sector. **Option 1 is always a refit of the Z-BOMBER (it gets tougher: Yoon's work)**; **option 2 is always more frigates for the fleet** (Odo sends them, or Maya finds them...). Write them in-story, each label 30 letters at most (e.g. "LET YOON REFIT THE SHIP" / "TAKE ODO'S FRIGATES") | 70-120 words |
| `M5WIN` | the Throne taken: the finale and the ending (no choice) | 150-250 words |
| `M1LOSE` .. `M5LOSE` | the Swarm took your key home: the gate falls, you fall back to regroup and try the sector again (no choice) | 40-70 words |
| `ENDING` | after M5WIN: the epilogue back at Mars, the crew, the last joke | 80-140 words |
| `GAMEOVER` | out of retries: the Swarm wins this war... for now | 40-80 words |

## The script format

```
# a comment
=== SCENE
@N
- NARRATION (a line of narration; it wraps itself)
@J
:grin
"What Jin says (a closing quote is optional)
? FIRST OPTION LABEL
  "lines under an option are what happens if it's picked (indented two spaces)
? SECOND OPTION LABEL
  @M
  "...
```

- `@X` changes who speaks (their face shows); `:mood` changes their face: smile open cat o grin
  smirk. `:heart :star :note :sparkle :broken` float an icon.
- `{P}` the Captain's name; `{PLACE}` the sector's name.
- Only these letters: A-Z, 0-9, space and `!"#$%&'()*+,-./:;<=>?@[\]^_` (it's all shown in
  capitals: write normally, it's upper-cased). No apostrophe-like curly quotes, no em dashes
  (write " - "), no accents.
- No word longer than 34 letters; option labels 30 letters at most; a choice needs 2 options.
- Check your file with: `python3 tools/storyc.py --check scripts/STORY.txt` (from the game folder)
