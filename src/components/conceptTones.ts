export type ToneKind = 'appear' | 'vanish'

export type ConceptTones = {
  play: (kind: ToneKind, toneIndex: number, pan: number) => void
  resume: () => void
  isRunning: () => boolean
  close: () => void
}

// An open, rootless set high in the register: no note pulls toward another, so overlapping tails just glow.
const TONES_HZ = [587.33, 659.25, 880, 987.77, 1174.66, 1318.51]
const PEAK_GAIN: Record<ToneKind, number> = { appear: 0.04, vanish: 0.024 }
// A fading word rises an octave, as if dissolving into light.
const PITCH_RATIO: Record<ToneKind, number> = { appear: 1, vanish: 2 }
const SILENCE_GAIN = 0.0001
const ATTACK_S = 0.25
const RELEASE_S = 1.8
// Two voices a few cents apart beat slowly, which gives each note its shimmer.
const VOICE_DETUNE_CENTS = [-3, 3]
const DRY_GAIN = 0.25
const HALO_SECONDS = 5.5
const HALO_DECAY_POWER = 3.2

// A synthetic hall: darkened noise that fades out slowly, so every note leaves a long halo behind it.
function createHaloImpulse(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * HALO_SECONDS)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const samples = impulse.getChannelData(channel)
    let darkened = 0
    for (let i = 0; i < length; i += 1) {
      darkened += (Math.random() * 2 - 1 - darkened) * 0.35
      samples[i] = darkened * Math.pow(1 - i / length, HALO_DECAY_POWER)
    }
  }
  return impulse
}

export function createConceptTones(minGapS: number): ConceptTones {
  const context = new AudioContext()
  const dry = context.createGain()
  const halo = context.createConvolver()
  dry.gain.value = DRY_GAIN
  halo.buffer = createHaloImpulse(context)
  dry.connect(context.destination)
  halo.connect(context.destination)
  let lastToneAt = -Infinity

  function play(kind: ToneKind, toneIndex: number, pan: number) {
    if (context.state !== 'running') return
    const now = context.currentTime
    if (now - lastToneAt < minGapS) return
    lastToneAt = now

    const envelope = context.createGain()
    const panner = context.createStereoPanner()
    const peakAt = now + ATTACK_S
    const endAt = peakAt + RELEASE_S

    panner.pan.value = pan
    envelope.gain.setValueAtTime(SILENCE_GAIN, now)
    envelope.gain.linearRampToValueAtTime(PEAK_GAIN[kind], peakAt)
    envelope.gain.exponentialRampToValueAtTime(SILENCE_GAIN, endAt)
    envelope.connect(panner)
    panner.connect(dry)
    panner.connect(halo)

    for (const detune of VOICE_DETUNE_CENTS) {
      const voice = context.createOscillator()
      voice.frequency.value = TONES_HZ[toneIndex % TONES_HZ.length] * PITCH_RATIO[kind]
      voice.detune.value = detune
      voice.connect(envelope)
      voice.start(now)
      voice.stop(endAt)
    }
  }

  return {
    play,
    resume: () => void context.resume(),
    isRunning: () => context.state === 'running',
    close: () => void context.close(),
  }
}
