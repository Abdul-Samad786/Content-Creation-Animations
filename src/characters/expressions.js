// Facial expression presets — each is a target blend shape value set
// Values 0.0 = neutral, 1.0 = full expression

export const EXPRESSIONS = {
  NEUTRAL:     { browRaise: 0,    browFurrow: 0,    mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0 },
  TIRED:       { browRaise: 0,    browFurrow: 0.3,  mouthSmile: 0,    mouthFrown: 0.2, eyeWide: 0,    eyeSquint: 0.4 },
  SAD:         { browRaise: 0.2,  browFurrow: 0.5,  mouthSmile: 0,    mouthFrown: 0.5, eyeWide: 0.1,  eyeSquint: 0.2 },
  FRUSTRATED:  { browRaise: 0,    browFurrow: 0.8,  mouthSmile: 0,    mouthFrown: 0.3, eyeWide: 0,    eyeSquint: 0.5 },
  CONCERNED:   { browRaise: 0.5,  browFurrow: 0.3,  mouthSmile: 0,    mouthFrown: 0.2, eyeWide: 0.3,  eyeSquint: 0   },
  HOPEFUL:     { browRaise: 0.4,  browFurrow: 0,    mouthSmile: 0.3,  mouthFrown: 0,   eyeWide: 0.3,  eyeSquint: 0   },
  SURPRISED:   { browRaise: 0.9,  browFurrow: 0,    mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0.9,  eyeSquint: 0   },
  CALM:        { browRaise: 0.1,  browFurrow: 0,    mouthSmile: 0.1,  mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0.1 },
  THOUGHTFUL:  { browRaise: 0.2,  browFurrow: 0.2,  mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0,    eyeSquint: 0.2 },
  DEFEATED:    { browRaise: 0,    browFurrow: 0.4,  mouthSmile: 0,    mouthFrown: 0.6, eyeWide: 0,    eyeSquint: 0.5 },
  BITTER:      { browRaise: 0,    browFurrow: 0.7,  mouthSmile: 0.1,  mouthFrown: 0.2, eyeWide: 0,    eyeSquint: 0.6 },
  LISTENING:   { browRaise: 0.15, browFurrow: 0.1,  mouthSmile: 0,    mouthFrown: 0,   eyeWide: 0.2,  eyeSquint: 0   },
}

// Map tone keywords from dialogue.json → expression preset
export function toneToExpression(tone) {
  if (!tone) return 'NEUTRAL'
  const t = tone.toLowerCase()
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

// Blend between two expression sets using t (0→1)
export function blendExpressions(from, to, t) {
  const result = {}
  for (const key of Object.keys(EXPRESSIONS.NEUTRAL)) {
    result[key] = from[key] + (to[key] - from[key]) * t
  }
  return result
}