import type { AnimationEvent, CSSProperties } from 'react'
import { useState } from 'react'
import { useConceptTones } from './useConceptTones'
import styles from './LatinConcepts.module.css'

type Word = { text: string; x: number; y: number; mx: number; my: number; cycle: number; delay: number }

// x/y place each word on desktop and mx/my on phones, as % of the section. Negative delays
// start every word at a different point of its own cycle, so they never pulse together.
const WORDS: Word[] = [
  { text: 'Ars', x: 2.2, y: 5.5, mx: 4.5, my: 5, cycle: 11, delay: -2 },
  { text: 'Forma', x: 75.6, y: 18.6, mx: 68, my: 15, cycle: 11, delay: -1.2 },
  { text: 'Lux', x: 72.2, y: 27.8, mx: 40, my: 19, cycle: 9, delay: -6.4 },
  { text: 'Umbra', x: 80, y: 33, mx: 80, my: 24, cycle: 12.5, delay: -3.7 },
  { text: 'Linea', x: 27, y: 27, mx: 12, my: 20, cycle: 10, delay: -8.1 },
  { text: 'Color', x: 18.3, y: 31.8, mx: 22, my: 28, cycle: 13, delay: -2.4 },
  { text: 'Harmonia', x: 38.5, y: 35.6, mx: 55, my: 30, cycle: 11.5, delay: -9.9 },
  { text: 'Ordo', x: 41.9, y: 46.7, mx: 72, my: 38, cycle: 12, delay: -0.6 },
  { text: 'Species', x: 2.2, y: 48, mx: 4.5, my: 47.5, cycle: 13.5, delay: -10 },
  { text: 'Gratia', x: 57.5, y: 48, mx: 52, my: 47.5, cycle: 10.5, delay: -4.5 },
  { text: 'Spatium', x: 22.9, y: 66.4, mx: 38, my: 41, cycle: 10.5, delay: -7.2 },
  { text: 'Imago', x: 74.6, y: 73.8, mx: 14, my: 58, cycle: 9, delay: -2.9 },
  { text: 'Motus', x: 81.7, y: 79.2, mx: 34, my: 65, cycle: 11, delay: -5.5 },
  { text: 'Figura', x: 90, y: 14, mx: 78, my: 66, cycle: 12, delay: -10.2 },
  { text: 'Venustas', x: 12, y: 78, mx: 8, my: 72, cycle: 10, delay: -3.1 },
  { text: 'Stilus', x: 57.5, y: 84, mx: 46, my: 81, cycle: 12.5, delay: -6.8 },
]

// A landscape tablet has a coarse pointer but needs the wide cut, so only width decides here.
const PORTRAIT_QUERY = '(max-width: 810px)'
// Long tails need room: a note only every so often keeps the space open.
const WORD_TONE_GAP_S = 1.6

function wordStyle(word: Word): CSSProperties {
  return {
    '--x': `${word.x}%`,
    '--y': `${word.y}%`,
    '--mx': `${word.mx}%`,
    '--my': `${word.my}%`,
    '--cycle': `${word.cycle}s`,
    '--delay': `${word.delay}s`,
  } as CSSProperties
}

export default function LatinConcepts() {
  const [isPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches)
  const tonesRef = useConceptTones(WORD_TONE_GAP_S)
  const mediaName = isPortrait ? 'concepts-figure-mobile' : 'concepts-figure'

  function handleWordCycle(event: AnimationEvent<HTMLDivElement>) {
    const tones = tonesRef.current
    if (!tones || !(event.target instanceof HTMLElement)) return
    const { tone, pan } = event.target.dataset
    if (tone === undefined || pan === undefined) return
    tones.play(event.animationName.includes('word-cycle') ? 'appear' : 'vanish', Number(tone), Number(pan))
  }

  return (
    <section className={styles.concepts} aria-label="Concepts of art, in Latin">
      <video
        className={styles.video}
        src={`/media/${mediaName}.mp4`}
        poster={`/media/${mediaName}.jpg`}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

      <div className={styles.words} lang="la" onAnimationIteration={handleWordCycle}>
        {WORDS.map((word, i) => (
          <span
            className={styles.word}
            key={word.text}
            style={wordStyle(word)}
            data-tone={i}
            data-pan={(word.x / 100 - 0.5) * 1.2}
          >
            {word.text}
          </span>
        ))}
      </div>
    </section>
  )
}
