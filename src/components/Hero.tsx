import GradientBackground from './GradientBackground'
import LineFigures from './LineFigures'
import Grain from './Grain'
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <GradientBackground />
      <Grain />
      <LineFigures />

      <div className={styles.center}>
        <h1 className={`${styles.title} ${styles.fadeUp}`} style={{ animationDelay: '0ms' }}>
          <span>Ideas that</span>
          <br />
          <span className={styles.titleLine2}>refuse to sit still.</span>
        </h1>

        <p className={`${styles.description} ${styles.fadeUp}`} style={{ animationDelay: '100ms' }}>
          Numen Art is the creative division of Delta Numen. Brand, motion and experiences shaped
          from a first sketch to the real world.
        </p>

        <a href="https://www.delta-numen.com" target="_blank" rel="noopener" className={`${styles.button} ${styles.fadeUp}`} style={{ animationDelay: '200ms' }}>
          <span>Explore Numen Art</span>
          <svg className={styles.buttonArrow} viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" />
          </svg>
        </a>
      </div>

      <svg className={styles.scrollChevron} viewBox="0 0 20 12" aria-hidden="true">
        <path d="M2 2L10 10L18 2" />
      </svg>
    </section>
  )
}
