// Facial expression presets — each is a target blend shape value set
// Values 0.0 = neutral, 1.0 = full expression

// browInner: inner brow ends up (worry, grief) when positive, down (anger) when negative.
export const EXPRESSIONS = {
  NEUTRAL:     { browRaise: 0,    browFurrow: 0,    browInner: 0,    mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0 },
  TIRED:       { browRaise: 0,    browFurrow: 0.3,  browInner: 0.2,  mouthSmile: 0,    mouthFrown: 0.2, eyeWide: 0,    eyeSquint: 0.4 },
  SAD:         { browRaise: 0.2,  browFurrow: 0.3,  browInner: 0.9,  mouthSmile: 0,    mouthFrown: 0.5, eyeWide: 0.1,  eyeSquint: 0.2 },
  FRUSTRATED:  { browRaise: 0,    browFurrow: 0.8,  browInner: -0.6, mouthSmile: 0,    mouthFrown: 0.3, eyeWide: 0,    eyeSquint: 0.5 },
  CONCERNED:   { browRaise: 0.5,  browFurrow: 0.3,  browInner: 0.6,  mouthSmile: 0,    mouthFrown: 0.2, eyeWide: 0.3,  eyeSquint: 0   },
  HOPEFUL:     { browRaise: 0.4,  browFurrow: 0,    browInner: 0.2,  mouthSmile: 0.3,  mouthFrown: 0,   eyeWide: 0.3,  eyeSquint: 0   },
  SURPRISED:   { browRaise: 0.9,  browFurrow: 0,    browInner: 0,    mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0.9,  eyeSquint: 0   },
  CALM:        { browRaise: 0.1,  browFurrow: 0,    browInner: 0,    mouthSmile: 0.1,  mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0.1 },
  THOUGHTFUL:  { browRaise: 0.2,  browFurrow: 0.4,  browInner: -0.1, mouthSmile: 0,    mouthFrown: 0.1, eyeWide: 0,    eyeSquint: 0.25 },
  DEFEATED:    { browRaise: 0,    browFurrow: 0.3,  browInner: 0.7,  mouthSmile: 0,    mouthFrown: 0.6, eyeWide: 0,    eyeSquint: 0.5 },
  // Envy and grievance: social pain, not defensiveness — the hurt reads in the
  // inner brows and the sunk mouth, with none of FRUSTRATED's downward glare.
  GRIEVANCE:   { browRaise: 0.1,  browFurrow: 0.2,  browInner: 0.75, mouthSmile: 0,    mouthFrown: 0.45, eyeWide: 0,   eyeSquint: 0.35 },
  BITTER:      { browRaise: 0,    browFurrow: 0.7,  browInner: -0.4, mouthSmile: 0.15, mouthFrown: 0.2, eyeWide: 0,    eyeSquint: 0.6 },
  LISTENING:   { browRaise: 0.15, browFurrow: 0.1,  browInner: 0.1,  mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0.2,  eyeSquint: 0   },
  ANGRY:       { browRaise: 0,    browFurrow: 1.0,  browInner: -1.0, mouthSmile: 0,    mouthFrown: 0.4, eyeWide: 0.2,  eyeSquint: 0.3 },
  WARM:        { browRaise: 0.1,  browFurrow: 0,    browInner: 0.15, mouthSmile: 0.45, mouthFrown: 0,   eyeWide: 0.1,  eyeSquint: 0.3 },
  WRY:         { browRaise: 0.1,  browFurrow: 0.1,  browInner: 0,    mouthSmile: 0.3,  mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0.3 },
  LAUGH:       { browRaise: 0.3,  browFurrow: 0,    browInner: 0.3,  mouthSmile: 1.0,  mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0.7 },
}

// Map tone keywords from dialogue.json → expression preset
export function toneToExpression(tone) {
  if (!tone) return 'NEUTRAL'
  const t = tone.toLowerCase()
  if (t.includes('envy') || t.includes('envious') || t.includes('jealous') || t.includes('grievance')) return 'GRIEVANCE'
  if (t.includes('tired') || t.includes('exhausted') || t.includes('flat')) return 'TIRED'
  if (t.includes('frustrated') || t.includes('angry') || t.includes('sharp')) return 'FRUSTRATED'
  if (t.includes('sad') || t.includes('devastat') || t.includes('hurt')) return 'SAD'
  if (t.includes('defeated') || t.includes('hollow') || t.includes('empty')) return 'DEFEATED'
  if (t.includes('bitter') || t.includes('ironic') || t.includes('dry')) return 'BITTER'
  if (t.includes('hopeful') || t.includes('genuine') || t.includes('eager')) return 'HOPEFUL'
  if (t.includes('surprised') || t.includes('shock')) return 'SURPRISED'
  if (t.includes('concern') || t.includes('gentle') || t.includes('careful')) return 'CONCERNED'
  if (t.includes('calm') || t.includes('quiet') || t.includes('steady')) return 'CALM'
  if (t.includes('thought') || t.includes('analytic') || t.includes('paus')) return 'THOUGHTFUL'
  return 'NEUTRAL'
}

// Ordered keyword rules for the script's free-text direction fields.
// The first rule that matches the combined text wins, so order is priority:
// anger and sarcasm before softer words, so "furious" beats "hurt" and "wary hope" stays cautious.
const TEXT_RULES = [
  [/human laughs|real, surprised one/, 'LAUGH'],
  [/sarcas|bitter|smug|sardonic|mock/, 'BITTER'],
  [/despair|defeat|hollow|cave|numb|surrender|collapse|deflat|hopeless|dims/, 'DEFEATED'],
  [/furious|angry|fury|rage|terror|snap/, 'ANGRY'],
  // Envy and grievance before the defensive rule: they are social pain, and a
  // guarded, chin-up face reads as the wrong emotion on them.
  [/envy|envious|jealous|grievance|resentment|counting debts/, 'GRIEVANCE'],
  [/defensive|chin up|brows down|frustrat|clamp|nostrils flare|lip curls|brows drawing/, 'FRUSTRATED'],
  [/warm|tender|gentle|affection|soft|crescent|sincere/, 'WARM'],
  [/tears|cracking|crack|tremble|wet|red-rimmed|ashamed|shame|hurt|breaks/, 'SAD'],
  [/\b(dry|deadpan|wry|sly|smirk|lopsided)\b/, 'WRY'],
  [/exhaust|tired|weary|worn/, 'TIRED'],
  [/laugh|amus|giggl|cheer|hope|relief|relieved|brighten|eager|crinkle/, 'HOPEFUL'],
  [/surpris|shock|startle/, 'SURPRISED'],
  [/wary|cautio|careful|bruise|guard|unsure|unsteady|lost|fragile|confus|exposed|stuck|uneasy|bracing|reluctant|worr|afraid|fear|scared|pinched|bite/, 'CONCERNED'],
  [/thought|think|concentrat|realis|dawn|intrigu|curio|consider|suspic|narrow|pondering|puzzle|unfocused/, 'THOUGHTFUL'],
  [/steady|calm|level|certain|grounded|serious|grave|solemn|sure|confident|even|plain|quiet|clear|firm|deliberate|still|respect|acknowledg|agree|nod/, 'CALM'],
]

// Preset from free text (emotion, face, eyes, or reaction). Null when no rule matches.
export function expressionFromText(text) {
  if (!text) return null
  const t = text.toLowerCase()
  for (const [pattern, key] of TEXT_RULES) {
    if (pattern.test(t)) return key
  }
  return null
}

// Speaker's expression: their own line's emotion, face and eyes read together.
// Falls back to the old tone keywords when the text matches nothing.
export function speakerExpression(line) {
  const text = [line.emotion, line.face, line.eyes].filter(Boolean).join(' | ')
  return expressionFromText(text) ?? toneToExpression(line.tone)
}

// Listener's expression: this line's reaction field. LISTENING when it matches nothing.
export function listenerExpression(line) {
  return expressionFromText(line.reaction) ?? 'LISTENING'
}

// Blend between two expression sets using t (0→1)
export function blendExpressions(from, to, t) {
  const result = {}
  for (const key of Object.keys(EXPRESSIONS.NEUTRAL)) {
    result[key] = from[key] + (to[key] - from[key]) * t
  }
  return result
}