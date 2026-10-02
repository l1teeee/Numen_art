import { useEffect, useRef, useState } from 'react'
import styles from './WhiteVideoWall.module.css'

const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'

export default function WhiteVideoWall({ onLiveChange }: { onLiveChange?: (anyLive: boolean) => void }) {
  const wallRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [revealed, setRevealed] = useState(false)
  const [allowVideo] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [isMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [liveStrips, setLiveStrips] = useState<Set<number>>(new Set())
  const anyLive = liveStrips.size > 0

  useEffect(() => {
    if (anyLive) onLiveChange?.(true)
  }, [anyLive, onLiveChange])

  useEffect(() => {
    const node = wallRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = wallRef.current
    if (!node || !allowVideo) return

    // decode cost of 5 looping videos adds up while the wall sits off-screen -
    // pause them all and resume only once the wall is back near the viewport
    const idleObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            videoRefs.current.forEach((video) => video?.play().catch(() => {}))
          } else {
            videoRefs.current.forEach((video) => video?.pause())
          }
        }
      },
      { threshold: 0, rootMargin: '25% 0px' },
    )

    idleObserver.observe(node)
    return () => idleObserver.disconnect()
  }, [allowVideo])

  // decoding 5 looping videos at once is too heavy on mobile - keep the 3 center strips
  const clipNumbers = isMobile ? [2, 3, 4] : [1, 2, 3, 4, 5]

  function markLive(clipNumber: number) {
    // 404s on the missing clip just never fire onCanPlay, so the placeholder
    // panel keeps drifting until the real file lands - no code change needed
    setLiveStrips((prev) => new Set(prev).add(clipNumber))
  }

  return (
    <div
      ref={wallRef}
      className={`${styles.wall} ${revealed ? styles.revealed : ''}`}
      aria-hidden="true"
    >
      {clipNumbers.map((clipNumber, position) => {
        return (
          <div key={clipNumber} className={styles.panel} style={{ transitionDelay: `${position * 90}ms` }}>
            {allowVideo && (
              <video
                ref={(node) => {
                  videoRefs.current[position] = node
                }}
                className={`${styles.video} ${liveStrips.has(clipNumber) ? styles.videoLive : ''}`}
                src={`/media/idea-0${clipNumber}.mp4`}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
                aria-hidden="true"
                onCanPlay={() => markLive(clipNumber)}
              />
            )}
          </div>
        )
      })}
      <div className={styles.veil} />
    </div>
  )
}
