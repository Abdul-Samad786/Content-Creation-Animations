# Making episodes

Every episode is a JSON script. The engine (`src/engine/`) turns it into a
vertical 1080×1920 video: 3D characters, faces, camera, chat phone, captions,
effects, voices, sound effects and music. You never write animation code to
make a new episode.

```
src/content/
  sfx-library.json               shared sound effects (id → prompt)
  <series>/series.json           cast, voices, look, stage, music
  <series>/<episode>/episode.json   the script
  <series>/<episode>/audio.json     written by make_voices.py
```

Any folder with an `episode.json` shows up in Remotion Studio automatically as
`<Prefix>-EpNN` (e.g. `LeftOnSeen-Ep01`).

## The workflow

```bash
npm run dev                                          # Studio: watch and scrub every episode
node scripts/stills.mjs LeftOnSeen-Ep01              # quick PNG previews (one per line)
python scripts/audition_voices.py left-on-seen mia   # hear candidate voices, pick one
python scripts/make_voices.py left-on-seen           # voice every line (ElevenLabs v3)
python scripts/make_sfx.py                           # sound effects library (once)
python scripts/make_music.py left-on-seen            # background loop (once per series)
npx remotion render LeftOnSeen-Ep01 out/videos/left-on-seen-ep01.mp4 --concurrency=4
```

Put `ELEVENLABS_API_KEY` in `.env` first (copy `.env.example`). Until voices
exist, timing is estimated from the text and the video is silent — you can
still preview and render it.

When you change a line's `tts` or `text`, run `make_voices.py` again: only the
changed lines are regenerated.

## A new episode in 3 steps

1. Copy an episode folder, e.g. `src/content/left-on-seen/ep02-typing` →
   `ep05-voice-note`, and delete its `audio.json` if there is one.
2. Edit `episode.json` (format below). Set `"number": 5`.
3. `npm run dev`, check it, then `make_voices.py left-on-seen/ep05-voice-note`.

A new series is a new folder with a `series.json` (copy `left-on-seen`).

## episode.json

```jsonc
{
  "number": 1,
  "title": "haha ok",
  "hook": "when they leave you on seen 👀",   // sticker on the first 3 s (and the thumbnail)
  "outro": "Ep 2 → he's typing...",          // teaser sticker at the end
  "phone": {                                  // the chat at the start
    "contact": "Leo", "avatar": "#7FB3FF",
    "messages": [{ "from": "them", "text": "hi" }, { "from": "me", "text": "haha ok" }],
    "seen": "Seen 9:41 PM",
    "visible": false                          // true = on screen from frame 0
  },
  "start": {                                  // each character's state at frame 0
    "mia":  { "face": "worried", "pose": "phone", "look": "phone" },
    "byte": { "visible": false }
  },
  "lines": [ ... ]
}
```

### Lines

A line is either **spoken** (`say`) or a **beat** (silent action, `beat` seconds).

```jsonc
{
  "say": "mia",                                  // cast id (on-stage or off-stage like "mom")
  "text": "He saw my message... eleven minutes ago.",            // captions
  "tts": "[nervous] He saw my message... [whispers] eleven minutes ago.",  // what the voice performs
  "camera": "close:mia",
  "mia":  { "face": "worried", "do": "freeze", "look": "phone" },
  "byte": [ { "face": "shocked", "at": "eleven" }, { "do": "spin", "at": 1.2 } ],
  "phone": [ { "receive": "haha ok", "at": "end" } ],
  "fx":   [ { "type": "sweat", "on": "mia", "at": "eleven" } ],
  "sfx":  [ { "id": "clock-tick", "at": 0 } ],
  "pause": 0.2                                   // seconds of silence after the line
}
```

```jsonc
{ "beat": 1.3, "camera": "two", "phone": [{ "typing": true }], "mia": { "face": "shocked", "do": "gasp" } }
```

**`at`** (on any direction): `"start"` (default), `"end"` (end of speech /
beat), a number of seconds from the line start, or a **word from the line**
(`"at": "replied"` fires when that word is spoken — exact once voices exist).

**`tts` tags** (ElevenLabs v3): `[giggles] [laughs] [gasps] [sighs] [whispers]
[excited] [nervous] [deadpan] [sobbing] [dreamy] ...` — any short direction in
brackets. They shape the performance and are not spoken or captioned.

### Character directions

Per character, keyed by cast id. Each is an object or a list of objects with `at`.

| key | values |
|---|---|
| `face` | neutral, happy, joy, excited, sparkle, love, warm, hopeful, flustered, embarrassed, smug, curious, focused, suspicious, determined, deadpan, worried, nervous, nervous-smile, sad, crying, panic, shocked, dizzy, relieved, sleepy, angry |
| `do` (gesture, one-shot) | bounce, jump, gasp, shake, shiver, nod, headshake, wiggle, spin, pop-in, zoom (scoot toward the other character), freeze, type |
| `pose` (held) | girl: sit, phone, lean, cheer, cheeks, flop, slump, grab · robot: hover, lean, droop, hide, proud, cheer |
| `look` | another character id, camera, phone, away, up, down |
| `visible` | true / false |

`do` also accepts a pose name, and combos like `"cheer+jump"`.

### Camera

`two` (both, faces big) · `wide` · `close:<id>` · `zoom:<id>` (comedy crash-zoom).
Repeating the same shot on the next line continues it without a cut. While the
phone is on screen, every shot lifts the faces to make room for it.

### Phone

`{ "show": true }` `{ "hide": true }` `{ "send": "text" }` `{ "receive": "text" }`
`{ "typing": true|false }` `{ "draft": "text", "dur": 0.8 }` `{ "clear": true }`
`{ "seen": "Seen 9:52 PM" }` `{ "call": "Mom" }` `{ "endCall": true }` — each with optional `at`.

### Effects and sounds

`fx` types: hearts, sparkles, sweat, rain, shock, question, blush (cheeks glow), confetti (full screen, no `on`).
Optional `dur` in seconds.

`sfx` ids come from `src/content/sfx-library.json`; add a new sound there
(prompt + seconds + volume) and run `make_sfx.py`.

## series.json

Cast members with a `model` (`girl`, `robot`) appear on stage at a `mark`
(`left`, `right`, `center`); a cast member with `"model": null` is a voice
only (shown as "📞 Name" on captions). `look` sets colours; `voice` sets the
ElevenLabs voice (`id`, `stability`, `speed`, `candidates` for auditions).

## Writing for short-form

- **Hook in 1 second**: the `hook` sticker plus an immediate reaction.
- **20–35 seconds.** Keep `pause` short (0.1–0.3); use beats for visual jokes.
- **One relatable moment, one twist**, a warm or funny button.
- **End where it began** (loop) or tease the next episode with `outro`.
- **Something changes every 1–2 seconds**: a face, a gesture, a phone event, a cut.
