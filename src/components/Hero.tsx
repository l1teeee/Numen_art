import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { useEffect, useRef } from 'react'
import GradientBackground from './GradientBackground'
import Grain from './Grain'
import styles from './Hero.module.css'

const TITLE_LINE_1 = ['Ideas', 'that']
const TITLE_LINE_2 = ['refuse', 'to', 'sit', 'still.']
const WORD_STAGGER_MS = 70

// Renders each word in its own overflow-hidden mask so it can slide up independently,
// continuing the stagger delay across both title lines.
function maskedWords(words: string[], startIndex: number, dimmed: boolean): ReactNode[] {
  const nodes: ReactNode[] = []
  words.forEach((word, i) => {
    const delay = (startIndex + i) * WORD_STAGGER_MS
    nodes.push(
      <span className={styles.wordMask} key={startIndex + i}>
        <span
          className={dimmed ? `${styles.wordInner} ${styles.titleLine2}` : styles.wordInner}
          style={{ animationDelay: `${delay}ms` }}
        >
          {word}
        </span>
      </span>
    )
    if (i < words.length - 1) nodes.push(' ')
  })
  return nodes
}

export default function Hero({ ref }: { ref: Ref<HTMLElement> }) {
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const mediaQueriesRef = useRef<{ pointerFine: MediaQueryList; reducedMotion: MediaQueryList } | null>(null)

  useEffect(() => {
    mediaQueriesRef.current = {
      pointerFine: window.matchMedia('(pointer: fine)'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    }
  }, [])

  const handlePointerMove = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const button = buttonRef.current
    const mediaQueries = mediaQueriesRef.current
    const canMagnet = !!mediaQueries && mediaQueries.pointerFine.matches && !mediaQueries.reducedMotion.matches
    if (!canMagnet || !button) return
    const rect = button.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width - 0.5
    const relY = (e.clientY - rect.top) / rect.height - 0.5
    button.style.setProperty('--mx', `${relX * 6}px`)
    button.style.setProperty('--my', `${relY * 6}px`)
  }

  const handlePointerLeave = () => {
    const button = buttonRef.current
    if (!button) return
    button.style.setProperty('--mx', '0px')
    button.style.setProperty('--my', '0px')
  }

  return (
    <section ref={ref} className={styles.hero}>
      <GradientBackground />
      <Grain />

      <div className={styles.center}>
        <h1 className={styles.title}>
          {maskedWords(TITLE_LINE_1, 0, false)}
          <br />
          {maskedWords(TITLE_LINE_2, TITLE_LINE_1.length, true)}
        </h1>

        <p className={`${styles.description} ${styles.fadeUp}`} style={{ animationDelay: '600ms' }}>
          Numen Art is the creative division of Delta Numen. Brand, motion and experiences shaped
          from a first sketch to the real world.
        </p>

        <span className={`${styles.buttonEntrance} ${styles.fadeUp}`} style={{ animationDelay: '750ms' }}>
          <a
            ref={buttonRef}
            href="https://www.delta-numen.com"
            target="_blank"
            rel="noopener"
            className={styles.button}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <span>Explore Numen Art</span>
            <svg className={styles.buttonArrow} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" />
            </svg>
          </a>
        </span>
      </div>

      <div className={styles.scrollCue} aria-hidden="true">
        <svg className={styles.scrollCueSvg} viewBox="0 0 12 48" width="12" height="48">
          <path
            className={styles.scrollCueBase}
            d="M6 1 C 9 11, 3 21, 6 30 C 8 38, 5 44, 6 47"
            pathLength={100}
          />
          <path
            className={styles.scrollCueTravel}
            d="M6 1 C 9 11, 3 21, 6 30 C 8 38, 5 44, 6 47"
            pathLength={100}
          />
        </svg>
      </div>
    </section>
  )
}
