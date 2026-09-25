import styles from './GradientBackground.module.css'

// Pure black field with a single very faint white glow drifting slowly, so the
// hero isn't a flat void without lifting the blacks toward grey.
export default function GradientBackground() {
  return (
    <div className={styles.background} aria-hidden="true">
      <div className={styles.glow} />
    </div>
  )
}
