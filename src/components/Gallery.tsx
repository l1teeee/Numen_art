import type { CSSProperties } from 'react'
import Grain from './Grain'
import styles from './Gallery.module.css'

type Box = { x: number; y: number; w: number; h: number }
type Slot = { name: string; src: string; poster?: string; alt: string; box: Box; phoneBox: Box }

// Where each blank area sits in the holders photographs, as % of the picture.
const SLOTS: Slot[] = [
  {
    name: 'Organic',
    src: '/media/gallery-01.jpg',
    alt: 'The shadow of a plant on a linen curtain',
    box: { x: 4.75, y: 29.69, w: 20.12, h: 41.02 },
    phoneBox: { x: 14.27, y: 4.86, w: 32.38, h: 41.63 },
  },
  {
    name: 'Luminous',
    src: '/media/gallery-02.mp4',
    poster: '/media/gallery-02.jpg',
    alt: '',
    box: { x: 28.52, y: 29.59, w: 19.79, h: 41.11 },
    phoneBox: { x: 52.87, y: 4.86, w: 31.9, h: 41.71 },
  },
  {
    name: 'Geometric',
    src: '/media/gallery-03.webp',
    alt: 'Black arcs on cream tiles',
    box: { x: 52.02, y: 29.49, w: 19.99, h: 41.31 },
    phoneBox: { x: 14.27, y: 53.35, w: 32.46, h: 41.79 },
  },
  {
    name: 'Digital',
    src: '/media/gallery-04.mp4',
    poster: '/media/gallery-04.jpg',
    alt: '',
    box: { x: 75.65, y: 29.59, w: 20.12, h: 41.11 },
    phoneBox: { x: 53.03, y: 53.43, w: 31.9, h: 41.79 },
  },
]

function slotStyle({ box, phoneBox }: Slot): CSSProperties {
  return {
    '--x': `${box.x}%`,
    '--y': `${box.y}%`,
    '--w': `${box.w}%`,
    '--h': `${box.h}%`,
    '--mx': `${phoneBox.x}%`,
    '--my': `${phoneBox.y}%`,
    '--mw': `${phoneBox.w}%`,
    '--mh': `${phoneBox.h}%`,
  } as CSSProperties
}

export default function Gallery() {
  return (
    <section className={styles.gallery} aria-label="Art selection">
      <Grain />

      <div className={styles.frame}>
        <div className={styles.signature}>
          <h2 className={styles.heading}>Our styles</h2>
          <p className={styles.subheading}>Four visual languages we work in</p>
        </div>

        <div className={styles.setFloat}>
          <div className={styles.set} data-gallery-prints>
            <picture>
              <source media="(max-width: 810px)" srcSet="/media/gallery-prints-mobile.jpg" />
              <img className={styles.holders} src="/media/gallery-prints.jpg" alt="" />
            </picture>
            {SLOTS.map((slot) => (
              <div className={styles.slot} key={slot.src} style={slotStyle(slot)}>
                {slot.poster ? (
                  <video
                    className={styles.media}
                    src={slot.src}
                    poster={slot.poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                  />
                ) : (
                  <img className={styles.media} src={slot.src} alt={slot.alt} />
                )}
              </div>
            ))}
            <ol className={styles.captions}>
              {SLOTS.map((slot, i) => (
                <li className={styles.caption} key={slot.name} style={slotStyle(slot)}>
                  <span className={styles.captionNumber}>{String(i + 1).padStart(2, '0')}</span>
                  {slot.name}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
