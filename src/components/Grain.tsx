import styles from './Grain.module.css'

// Fine organic dust built from an inline SVG feTurbulence filter (not tiled
// pixel noise), drifting linearly - reads as smooth light dust, not a flicker.
export default function Grain() {
  return <div className={styles.grain} aria-hidden="true" />
}
