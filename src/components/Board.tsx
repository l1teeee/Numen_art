import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { playIfAllowed } from './playIfAllowed'
import { PROJECTS } from './projects'
import styles from './Board.module.css'

type Box = { x: number; y: number; w: number; h?: number }
type Tile = { box: Box; image?: string; video?: string; invite?: boolean; position?: string; fit?: 'contain' }

// The reference layout in its own pixels, followed by the same layout mirrored and continued below it.
const SHEET_WIDTH = 806
const SHEET_HEIGHT = 2756

const TILES: Tile[] = [
  { box: { x: 28, y: 15, w: 180, h: 119 }, image: 'cosmos_1076358504.webp', position: '50% 32%' },
  { box: { x: 223, y: 15, w: 372, h: 248 }, image: 'cosmos_1404491574.webp' },
  { box: { x: 611, y: 15, w: 180, h: 120 }, image: 'board-burst.jpg', video: 'board-burst.mp4' },
  { box: { x: 611, y: 145, w: 180, h: 120 }, image: 'cosmos_837082021.webp' },
  { box: { x: 28, y: 275, w: 372, h: 247 }, image: 'cosmos_745384579.jpg', video: 'cosmos_745384579.mp4' },
  { box: { x: 418, y: 275, w: 178, h: 119 }, image: 'board-hand.jpg', video: 'board-hand.mp4' },
  { box: { x: 418, y: 405, w: 371, h: 248 }, image: 'cosmos_1161835097.webp' },
  { box: { x: 28, y: 533, w: 180, h: 119 }, image: 'board-ink-violet.jpg', video: 'board-ink-violet.mp4' },
  { box: { x: 223, y: 533, w: 179, h: 119 }, image: 'cosmos_1630397156.jpg', video: 'cosmos_1630397156.mp4', fit: 'contain' },
  { box: { x: 223, y: 663, w: 372, h: 247 }, invite: true },
  { box: { x: 611, y: 663, w: 180, h: 119 }, image: 'cosmos_867159251.jpg', video: 'cosmos_867159251.mp4' },
  { box: { x: 28, y: 793, w: 180, h: 118 }, image: 'cosmos_230731540.webp', position: '50% 62%' },
  { box: { x: 20, y: 922, w: 372, h: 246 }, image: 'cosmos_1265164716.webp', position: '50% 35%' },
  { box: { x: 408, y: 1052, w: 373, h: 248 }, image: 'cosmos_666434540.jpg', video: 'cosmos_666434540.mp4' },
  { box: { x: 20, y: 1180, w: 180, h: 118 }, image: 'cosmos_73828605.webp', position: '50% 44%' },
  { box: { x: 215, y: 1180, w: 177, h: 118 }, image: 'cosmos_540369985.jpg', video: 'cosmos_540369985.mp4' },
  { box: { x: 215, y: 1310, w: 177, h: 118 }, image: 'cosmos_1014508099.webp' },
  { box: { x: 598, y: 1471, w: 180, h: 119 }, image: 'cosmos_603019706.webp' },
  { box: { x: 211, y: 1471, w: 372, h: 248 }, image: 'cosmos_961905012.webp' },
  { box: { x: 15, y: 1471, w: 180, h: 120 }, image: 'board-particles.jpg', video: 'board-particles.mp4' },
  { box: { x: 15, y: 1601, w: 180, h: 120 }, image: 'cosmos_494742481.webp' },
  { box: { x: 406, y: 1731, w: 372, h: 247 }, image: 'cosmos_1045849714.jpg', video: 'cosmos_1045849714.mp4' },
  { box: { x: 210, y: 1731, w: 178, h: 119 }, image: 'board-charcoal.jpg', video: 'board-charcoal.mp4' },
  { box: { x: 17, y: 1861, w: 371, h: 248 }, image: 'cosmos_1388536246.webp' },
  { box: { x: 598, y: 1989, w: 180, h: 119 }, image: 'board-ink-grey.jpg', video: 'board-ink-grey.mp4' },
  { box: { x: 404, y: 1989, w: 179, h: 119 }, image: 'cosmos_1536910596.jpg', video: 'cosmos_1536910596.mp4', position: '50% 12%' },
  { box: { x: 211, y: 2119, w: 372, h: 247 }, image: 'cosmos_1223623255.webp' },
  { box: { x: 15, y: 2119, w: 180, h: 119 }, image: 'cosmos_1250033377.webp' },
  { box: { x: 598, y: 2249, w: 180, h: 118 }, image: 'cosmos_1538569646.webp' },
  { box: { x: 414, y: 2378, w: 372, h: 246 }, image: 'cosmos_1694845179.webp' },
  { box: { x: 25, y: 2508, w: 373, h: 248 }, image: 'cosmos_777894426.webp' },
  { box: { x: 606, y: 2636, w: 180, h: 118 }, image: 'cosmos_309800238.webp', position: '50% 28%' },
  { box: { x: 414, y: 2636, w: 177, h: 118 }, image: 'cosmos_1709083439.jpg', video: 'cosmos_1709083439.mp4' },
]

const NOTES: { box: Box; content: string }[] = [
  {
    box: { x: 611, y: 793, w: 174 },
    content: 'An idea that refuses to sit still? Tell us what it is and who it is for. We will show you how it could look, move and live on the web.',
  },
  {
    box: { x: 603, y: 925, w: 175 },
    content: 'Every project here started the same way: one idea and a blank page. Yours can be next.',
  },
  {
    box: { x: 20, y: 1312, w: 170 },
    content: 'Scroll on to write to us.',
  },
]

function percent(value: number, whole: number) {
  return `${(value / whole) * 100}%`
}

function boxStyle({ x, y, w, h }: Box): CSSProperties {
  return {
    '--x': percent(x, SHEET_WIDTH),
    '--y': percent(y, SHEET_HEIGHT),
    '--w': percent(w, SHEET_WIDTH),
    '--h': h === undefined ? 'auto' : percent(h, SHEET_HEIGHT),
  } as CSSProperties
}

function mediaStyle({ position, fit }: Tile): CSSProperties {
  return { objectPosition: position, objectFit: fit }
}

function tileContent(tile: Tile) {
  if (tile.invite) return <span className={styles.inviteText}>{PROJECTS.length} + YOU?</span>
  if (tile.video) {
    return (
      <video
        className={styles.media}
        style={mediaStyle(tile)}
        src={`/media/${tile.video}`}
        poster={`/media/${tile.image}`}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      />
    )
  }
  return <img className={styles.media} style={mediaStyle(tile)} src={`/media/${tile.image}`} alt="" loading="lazy" />
}

export default function Board() {
  const sheetRef = useRef<HTMLDivElement>(null)

  // each tile fades in when it comes into view and hides again once it has left
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle(styles.tileShown, entry.isIntersecting)
        }
      },
      { threshold: 0.15 },
    )
    for (const tile of sheet.querySelectorAll('[data-board-tile]')) observer.observe(tile)
    return () => observer.disconnect()
  }, [])

  // only the loops near the screen decode
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) playIfAllowed(video)
          else video.pause()
        }
      },
      { rootMargin: '15% 0px' },
    )
    for (const video of sheet.querySelectorAll('video')) observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <section className={styles.board} aria-label="More of the work">
      <div className={styles.sheet} ref={sheetRef}>
        <div className={styles.tiles}>
          {TILES.map((tile) => (
            <div
              className={`${styles.tile} ${tile.invite ? styles.invite : ''}`}
              key={`${tile.box.x}-${tile.box.y}`}
              style={boxStyle(tile.box)}
              data-board-tile
            >
              {tileContent(tile)}
            </div>
          ))}
        </div>
        <div className={styles.notes}>
          {NOTES.map((note) => (
            <p className={styles.note} key={`${note.box.x}-${note.box.y}`} style={boxStyle(note.box)}>
              {note.content}
            </p>
          ))}
        </div>
      </div>
      <div className={styles.contact}>
        <h2 className={styles.contactTitle}>Looking for a collaboration or development?</h2>
        <div className={styles.contactOptions}>
          <a className={styles.contactLink} href="https://www.instagram.com/jul_num/" target="_blank" rel="noopener">
            <span className={styles.contactName}>Collaboration</span>
            <span className={styles.contactRoute}>Instagram, @jul_num</span>
          </a>
          <a className={styles.contactLink} href="mailto:official.count.alejandro@gmail.com">
            <span className={styles.contactName}>Development</span>
            <span className={styles.contactRoute}>official.count.alejandro@gmail.com</span>
          </a>
        </div>
      </div>
    </section>
  )
}
