import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import Grain from './Grain'
import styles from './Hero.module.css'

const TITLE_WORDS = ['Numen', 'Art']
const TITLE_LENGTH = TITLE_WORDS.join(' ').length
const TITLE_START_MS = 120
const LETTER_STAGGER_MS = 55
const META_COLUMNS = [
  ['Brand identity', 'Art direction', 'Naming'],
  ['Motion design', 'Web design', 'Interactive experiences'],
  ['Delta Numen', 'Creative division', 'El Salvador'],
]
const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Splits the title into letters that drift together while they come into focus,
// starting from the middle of the title and reaching its ends last.
function settlingLetters(words: string[]): ReactNode[] {
  const centre = (TITLE_LENGTH - 1) / 2
  const nodes: ReactNode[] = []
  let position = 0
  words.forEach((word, wordIndex) => {
    nodes.push(
      <span className={styles.word} key={word}>
        {Array.from(word, (letter, letterIndex) => {
          const spread = position + letterIndex - centre
          const letterStyle = {
            '--spread': spread,
            animationDelay: `${TITLE_START_MS + Math.abs(spread) * LETTER_STAGGER_MS}ms`,
          } as CSSProperties
          return (
            <span className={styles.letter} key={letterIndex} style={letterStyle}>
              {letter}
            </span>
          )
        })}
      </span>
    )
    position += word.length + 1
    if (wordIndex < words.length - 1) nodes.push(' ')
  })
  return nodes
}

export default function Hero() {
  const [allowVideo] = useState(() => !window.matchMedia(REDUCED_MOTION_QUERY).matches)
  const [isMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const mediaName = isMobile ? 'hero-ink-mobile' : 'hero-ink'

  return (
    <section className={styles.hero}>
      <Grain />

      <div className={styles.frame}>
        <h1 className={styles.title} aria-label="Numen Art">
          <span aria-hidden="true">{settlingLetters(TITLE_WORDS)}</span>
        </h1>

        <div className={styles.masthead}>
          <div className={`${styles.links} ${styles.quietIn}`} style={{ animationDelay: '900ms' }}>
            <a className={styles.link} href="https://www.delta-numen.com" target="_blank" rel="noopener">
              <span>Explore Numen Art</span>
              <svg className={styles.linkArrow} viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" />
              </svg>
            </a>
            <a className={styles.link} href="mailto:contact@delta-numen.com">
              contact@delta-numen.com
            </a>
          </div>

          <div className={`${styles.meta} ${styles.quietIn}`} style={{ animationDelay: '1000ms' }}>
            {META_COLUMNS.map((column) => (
              <ul className={styles.metaColumn} key={column[0]}>
                {column.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <p className={`${styles.intro} ${styles.quietIn}`} style={{ animationDelay: '1150ms' }}>
          <strong>Ideas that refuse to sit still.</strong> Numen Art is the creative division of Delta
          Numen. We take an idea, give it an identity and a direction, and build the web experience it
          was meant to become.
        </p>

        <div className={styles.panel} aria-hidden="true">
          <video
            className={styles.panelVideo}
            src={`/media/${mediaName}.mp4`}
            poster={`/media/${mediaName}.jpg`}
            muted
            loop
            autoPlay={allowVideo}
            playsInline
            preload={allowVideo ? 'auto' : 'none'}
          />
        </div>
      </div>
    </section>
  )
}
