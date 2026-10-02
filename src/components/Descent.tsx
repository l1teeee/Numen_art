import type { CSSProperties } from 'react'
import styles from './Descent.module.css'

// curated starfield positions across the outer thirds and safe corners - never the
// centre corridor (42-58%), so nothing collides with the tails travelling down the middle.
// a few sit near the ring/spiral vignettes but offset from them. `bright` gets a soft halo.
const FIREFLIES = [
  { top: 5.8, left: 71.5, size: 1.5, floatDur: 17.1, floatDelay: -16, twinkleDur: 2.9, twinkleDelay: -0.3, twinkleMin: 0.17, twinkleMax: 0.35 },
  { top: 6.4, left: 64.7, size: 2.1, floatDur: 12.9, floatDelay: -5.5, twinkleDur: 4.2, twinkleDelay: -2.1, twinkleMin: 0.16, twinkleMax: 0.37 },
  { top: 10.1, left: 40.1, size: 2.8, floatDur: 17.8, floatDelay: -16.9, twinkleDur: 4, twinkleDelay: -1.5, twinkleMin: 0.18, twinkleMax: 0.38 },
  { top: 14.6, left: 4.5, size: 3.2, floatDur: 8.1, floatDelay: -4.7, twinkleDur: 3.2, twinkleDelay: -1.1, twinkleMin: 0.15, twinkleMax: 0.37, bright: true },
  { top: 15.1, left: 91.9, size: 2, floatDur: 9.3, floatDelay: -5, twinkleDur: 2.6, twinkleDelay: -1.3, twinkleMin: 0.25, twinkleMax: 0.47 },
  { top: 15.9, left: 86.1, size: 2.5, floatDur: 9.6, floatDelay: -8.6, twinkleDur: 3.2, twinkleDelay: -2.1, twinkleMin: 0.25, twinkleMax: 0.38 },
  { top: 16, left: 9.1, size: 1.8, floatDur: 16.9, floatDelay: -7.1, twinkleDur: 4.4, twinkleDelay: -3.7, twinkleMin: 0.3, twinkleMax: 0.41 },
  { top: 19.1, left: 71.3, size: 1.8, floatDur: 8, floatDelay: -7.6, twinkleDur: 3.5, twinkleDelay: -2.6, twinkleMin: 0.19, twinkleMax: 0.48 },
  { top: 24.4, left: 92.9, size: 1.8, floatDur: 17.3, floatDelay: -14.7, twinkleDur: 2.7, twinkleDelay: -0.9, twinkleMin: 0.17, twinkleMax: 0.38 },
  { top: 25.3, left: 71.5, size: 1.9, floatDur: 11.3, floatDelay: -6.5, twinkleDur: 2.3, twinkleDelay: -1.7, twinkleMin: 0.23, twinkleMax: 0.42 },
  { top: 27.7, left: 17.6, size: 1.8, floatDur: 10.9, floatDelay: -5.1, twinkleDur: 3.8, twinkleDelay: -1.7, twinkleMin: 0.17, twinkleMax: 0.42 },
  { top: 30.3, left: 84, size: 2.8, floatDur: 16.8, floatDelay: -3.4, twinkleDur: 4.2, twinkleDelay: -3.3, twinkleMin: 0.28, twinkleMax: 0.36 },
  { top: 31.1, left: 70.2, size: 2, floatDur: 12.3, floatDelay: -11.8, twinkleDur: 3, twinkleDelay: -1.9, twinkleMin: 0.23, twinkleMax: 0.42 },
  { top: 31.9, left: 24.5, size: 1.8, floatDur: 16.5, floatDelay: -5.7, twinkleDur: 4.1, twinkleDelay: -3.1, twinkleMin: 0.19, twinkleMax: 0.43 },
  { top: 33, left: 87.8, size: 2.6, floatDur: 14.8, floatDelay: -1.6, twinkleDur: 3.9, twinkleDelay: -3, twinkleMin: 0.22, twinkleMax: 0.49 },
  { top: 36.7, left: 94.8, size: 1.9, floatDur: 8.5, floatDelay: -8.3, twinkleDur: 3.4, twinkleDelay: -1.7, twinkleMin: 0.3, twinkleMax: 0.48 },
  { top: 37.2, left: 8.9, size: 3.1, floatDur: 9.7, floatDelay: -7.4, twinkleDur: 3.9, twinkleDelay: -3.1, twinkleMin: 0.16, twinkleMax: 0.49, bright: true },
  { top: 39.4, left: 67.3, size: 2.4, floatDur: 11.4, floatDelay: -3.8, twinkleDur: 3, twinkleDelay: -0.7, twinkleMin: 0.23, twinkleMax: 0.43 },
  { top: 44, left: 34.7, size: 2.7, floatDur: 15.8, floatDelay: -2.4, twinkleDur: 3.3, twinkleDelay: -0.8, twinkleMin: 0.25, twinkleMax: 0.45 },
  { top: 55.7, left: 17.2, size: 2.7, floatDur: 15, floatDelay: -12.8, twinkleDur: 3.7, twinkleDelay: -1.4, twinkleMin: 0.16, twinkleMax: 0.44 },
  { top: 56.4, left: 3.6, size: 2.1, floatDur: 16, floatDelay: -12.3, twinkleDur: 4.2, twinkleDelay: -2, twinkleMin: 0.22, twinkleMax: 0.49 },
  { top: 57, left: 28.8, size: 1.9, floatDur: 11.3, floatDelay: -6.3, twinkleDur: 2.3, twinkleDelay: -1.8, twinkleMin: 0.24, twinkleMax: 0.45 },
  { top: 57.5, left: 21.5, size: 2.3, floatDur: 14.5, floatDelay: -7.1, twinkleDur: 3.2, twinkleDelay: -1.5, twinkleMin: 0.21, twinkleMax: 0.43 },
  { top: 64.4, left: 28.8, size: 2.1, floatDur: 16.5, floatDelay: -1.2, twinkleDur: 3.7, twinkleDelay: -2.6, twinkleMin: 0.22, twinkleMax: 0.42 },
  { top: 64.7, left: 26.5, size: 1.8, floatDur: 8.8, floatDelay: -6.4, twinkleDur: 4.1, twinkleDelay: -1.1, twinkleMin: 0.19, twinkleMax: 0.43 },
  { top: 67.3, left: 95.9, size: 1.9, floatDur: 13.3, floatDelay: -2.5, twinkleDur: 2.3, twinkleDelay: -0.4, twinkleMin: 0.16, twinkleMax: 0.47 },
  { top: 68.3, left: 8.8, size: 1.8, floatDur: 17.7, floatDelay: -7.3, twinkleDur: 4.2, twinkleDelay: -3.3, twinkleMin: 0.26, twinkleMax: 0.4 },
  { top: 79.3, left: 61.3, size: 2.7, floatDur: 9.9, floatDelay: -4.6, twinkleDur: 2.7, twinkleDelay: -2.5, twinkleMin: 0.2, twinkleMax: 0.46 },
  { top: 82.8, left: 75.4, size: 1.9, floatDur: 10.7, floatDelay: -9.8, twinkleDur: 2.9, twinkleDelay: -2.9, twinkleMin: 0.21, twinkleMax: 0.45 },
  { top: 84.9, left: 37.5, size: 2.5, floatDur: 16.3, floatDelay: -8.5, twinkleDur: 2.5, twinkleDelay: -0.6, twinkleMin: 0.21, twinkleMax: 0.4 },
  { top: 84.9, left: 96.1, size: 1.7, floatDur: 14.6, floatDelay: -4.8, twinkleDur: 2.2, twinkleDelay: -0.5, twinkleMin: 0.17, twinkleMax: 0.49 },
  { top: 91.9, left: 90.9, size: 3.4, floatDur: 17.2, floatDelay: -14.6, twinkleDur: 4.2, twinkleDelay: -1, twinkleMin: 0.29, twinkleMax: 0.37, bright: true },
  { top: 92.5, left: 7.9, size: 1.8, floatDur: 13.4, floatDelay: -12.5, twinkleDur: 3.5, twinkleDelay: -2.8, twinkleMin: 0.25, twinkleMax: 0.47 },
  { top: 92.5, left: 37.2, size: 3, floatDur: 8.9, floatDelay: -1.2, twinkleDur: 3.7, twinkleDelay: -2, twinkleMin: 0.29, twinkleMax: 0.44, bright: true },
  { top: 85.3, left: 79.7, size: 3.4, floatDur: 15.7, floatDelay: -10, twinkleDur: 3.9, twinkleDelay: -2.4, twinkleMin: 0.16, twinkleMax: 0.44, driftX: 7.9 },
  { top: 68.8, left: 32.5, size: 3, floatDur: 17.5, floatDelay: -16.9, twinkleDur: 4.3, twinkleDelay: -0.9, twinkleMin: 0.17, twinkleMax: 0.44, driftX: 9.3 },
  { top: 17.3, left: 44, size: 2.1, floatDur: 12.9, floatDelay: -11.7, twinkleDur: 2.3, twinkleDelay: -2.2, twinkleMin: 0.26, twinkleMax: 0.45, driftX: 6.6 },
  { top: 13.4, left: 88.1, size: 2.5, floatDur: 9.8, floatDelay: -15, twinkleDur: 2.6, twinkleDelay: -1.5, twinkleMin: 0.26, twinkleMax: 0.44, driftX: -13.2, bright: true },
  { top: 94.1, left: 19.6, size: 2.8, floatDur: 17.4, floatDelay: -5.9, twinkleDur: 3.7, twinkleDelay: -0.6, twinkleMin: 0.16, twinkleMax: 0.39, driftX: 7.9 },
  { top: 84.2, left: 37.7, size: 2.5, floatDur: 9.5, floatDelay: -16.1, twinkleDur: 3.6, twinkleDelay: -1.4, twinkleMin: 0.23, twinkleMax: 0.45, driftX: 8.2 },
  { top: 73.8, left: 95.3, size: 2.4, floatDur: 14.3, floatDelay: -5.9, twinkleDur: 3.7, twinkleDelay: -2.3, twinkleMin: 0.18, twinkleMax: 0.41, driftX: -13.5 },
  { top: 5.7, left: 45.9, size: 2.3, floatDur: 10.8, floatDelay: -16.3, twinkleDur: 2.3, twinkleDelay: -1.4, twinkleMin: 0.21, twinkleMax: 0.43, driftX: 2.1 },
  { top: 19.9, left: 46.8, size: 3, floatDur: 10.8, floatDelay: -7.7, twinkleDur: 3.4, twinkleDelay: -1.9, twinkleMin: 0.28, twinkleMax: 0.49, driftX: -12.4 },
  { top: 15.8, left: 30.1, size: 2.5, floatDur: 15.6, floatDelay: -3.2, twinkleDur: 2.6, twinkleDelay: -0.6, twinkleMin: 0.28, twinkleMax: 0.46, driftX: 1.4 },
  { top: 78, left: 88.3, size: 2.6, floatDur: 12.8, floatDelay: -14.2, twinkleDur: 3.5, twinkleDelay: -1.2, twinkleMin: 0.25, twinkleMax: 0.49, driftX: 1.4 },
  { top: 78.6, left: 12.8, size: 3.1, floatDur: 15.2, floatDelay: -9.2, twinkleDur: 3.1, twinkleDelay: -3.1, twinkleMin: 0.23, twinkleMax: 0.47, driftX: -1.4, bright: true },
  { top: 61.7, left: 34.4, size: 1.7, floatDur: 9.9, floatDelay: -9.3, twinkleDur: 2.6, twinkleDelay: -2.5, twinkleMin: 0.26, twinkleMax: 0.42, driftX: -3.2 },
  { top: 36.6, left: 83.2, size: 3.2, floatDur: 8.2, floatDelay: -8.4, twinkleDur: 3.7, twinkleDelay: -3.5, twinkleMin: 0.24, twinkleMax: 0.4, driftX: -5.7 },
  { top: 72.1, left: 69, size: 2.7, floatDur: 10.6, floatDelay: -14, twinkleDur: 2.7, twinkleDelay: -2.3, twinkleMin: 0.28, twinkleMax: 0.47, driftX: -10.8 },
  { top: 27.1, left: 29.4, size: 2.4, floatDur: 10.9, floatDelay: -9.3, twinkleDur: 4.1, twinkleDelay: -1.7, twinkleMin: 0.18, twinkleMax: 0.47, driftX: 12.5 },
  { top: 76.9, left: 79.6, size: 2.1, floatDur: 14.8, floatDelay: -5.3, twinkleDur: 4.3, twinkleDelay: -1.3, twinkleMin: 0.24, twinkleMax: 0.41, driftX: -13 },
  { top: 17.3, left: 56.9, size: 2.2, floatDur: 12.4, floatDelay: -8, twinkleDur: 3.6, twinkleDelay: -3.2, twinkleMin: 0.18, twinkleMax: 0.37, driftX: 6.7 },
  { top: 31.8, left: 69.3, size: 2.7, floatDur: 9.7, floatDelay: -7.1, twinkleDur: 4.1, twinkleDelay: -1, twinkleMin: 0.25, twinkleMax: 0.48, driftX: 8 },
  { top: 8, left: 94.4, size: 2.3, floatDur: 17, floatDelay: -13.2, twinkleDur: 3.1, twinkleDelay: -2.5, twinkleMin: 0.24, twinkleMax: 0.42, driftX: 4.2, bright: true },
  { top: 80.3, left: 32.8, size: 2.3, floatDur: 17.5, floatDelay: -2.2, twinkleDur: 2.8, twinkleDelay: -1.5, twinkleMin: 0.29, twinkleMax: 0.48, driftX: -2.2 },
  { top: 25, left: 60.4, size: 2.5, floatDur: 17.1, floatDelay: -6.3, twinkleDur: 2.4, twinkleDelay: -2.1, twinkleMin: 0.3, twinkleMax: 0.47, driftX: -5 },
  { top: 2.9, left: 85.9, size: 3, floatDur: 16, floatDelay: -16.3, twinkleDur: 2.8, twinkleDelay: -3.1, twinkleMin: 0.15, twinkleMax: 0.35, driftX: -3.3 },
  { top: 12.7, left: 2.4, size: 3.1, floatDur: 10.8, floatDelay: -2.1, twinkleDur: 3.1, twinkleDelay: -0.9, twinkleMin: 0.3, twinkleMax: 0.48, driftX: -8.8 },
  { top: 19.2, left: 88.7, size: 3, floatDur: 8.7, floatDelay: -12.5, twinkleDur: 2.9, twinkleDelay: -0.5, twinkleMin: 0.22, twinkleMax: 0.4, driftX: 2.6 },
  { top: 93.1, left: 7.4, size: 2.1, floatDur: 17.2, floatDelay: -15.1, twinkleDur: 2.8, twinkleDelay: -2.1, twinkleMin: 0.22, twinkleMax: 0.47, driftX: -9.6 },
  { top: 27.5, left: 33.3, size: 2, floatDur: 14.7, floatDelay: -5.5, twinkleDur: 2.8, twinkleDelay: -0.6, twinkleMin: 0.16, twinkleMax: 0.42, driftX: 13 },
  { top: 11.7, left: 59, size: 2.9, floatDur: 16, floatDelay: -13.2, twinkleDur: 3.8, twinkleDelay: -2.3, twinkleMin: 0.22, twinkleMax: 0.42, driftX: 10, bright: true },
  { top: 16.8, left: 20.1, size: 1.6, floatDur: 10.3, floatDelay: -9.3, twinkleDur: 3.5, twinkleDelay: -0.7, twinkleMin: 0.27, twinkleMax: 0.49, driftX: -8.6 },
  { top: 27.8, left: 89.7, size: 3.1, floatDur: 10.9, floatDelay: -12.3, twinkleDur: 3.2, twinkleDelay: -1.4, twinkleMin: 0.29, twinkleMax: 0.48, driftX: 6.4 },
] as const

export default function Descent() {
  return (
    <div className={styles.descent} aria-hidden="true">
      {FIREFLIES.map((fly, i) => (
        <span
          key={i}
          className={styles.firefly}
          style={{
            top: `${fly.top}%`,
            left: `${fly.left}%`,
            width: `${fly.size}px`,
            height: `${fly.size}px`,
            animationDuration: `${fly.floatDur}s, ${fly.twinkleDur}s`,
            animationDelay: `${fly.floatDelay}s, ${fly.twinkleDelay}s`,
            boxShadow: 'bright' in fly ? '0 0 6px rgba(255, 255, 255, 0.35)' : undefined,
            ['--twinkle-min' as string]: fly.twinkleMin,
            ['--twinkle-max' as string]: fly.twinkleMax,
            ['--drift-x' as string]: 'driftX' in fly ? `${fly.driftX}px` : undefined,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
