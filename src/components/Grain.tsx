import styles from './Grain.module.css'

// Fine paper tooth built from an inline SVG feTurbulence filter (not tiled pixel noise).
export default function Grain() {
  return <div className={styles.grain} aria-hidden="true" />
}
