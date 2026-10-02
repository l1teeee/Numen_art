import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import styles from './WhiteSection.module.css'
import WhiteLine from './WhiteLine'
import WhitePractices from './WhitePractices'
import WhiteVideoWall from './WhiteVideoWall'

// merges the section's own internal ref (WhiteLine needs the live DOM node
// to measure scroll progress) with whatever ref the caller passed in
function assignRef<T>(ref: Ref<T> | undefined, node: T) {
  if (typeof ref === 'function') {
    ref(node)
  } else if (ref) {
    (ref as { current: T | null }).current = node
  }
}

const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'

// blur is only an entry transition: held at full strength until the section
// has entered this fraction of the viewport, then dissolves linearly to sharp
// by the moment it fully occupies the viewport - the pinned hold plays sharp
const BLUR_HOLD_FRACTION = 0.1
const BLUR_MAX_PX = 14

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export default function WhiteSection({ ref }: { ref?: Ref<HTMLElement> }) {
  const sectionRef = useRef<HTMLElement>(null)
  const introStageRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef<HTMLDivElement>(null)
  const closingVideoRef = useRef<HTMLVideoElement>(null)
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const [videoLive, setVideoLive] = useState(false)
  const [allowVideo] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [isMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [closingVideoReady, setClosingVideoReady] = useState(false)
  // the 1200x900 closing loop is upscaled ~3x on a portrait phone and reads as a blurry grey wash
  const allowClosingVideo = allowVideo && !isMobile

  useEffect(() => {
    const targets = [introRef.current, closingRef.current].filter(
      (el): el is HTMLDivElement => el !== null,
    )
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.35 },
    )

    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const stage = introStageRef.current
    if (!stage) return

    // reduced motion: stage is a plain 100vh block via CSS - no hold, no blur
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // mobile: re-blurring live video every scroll frame is too costly - the
    // staggered panel opacity reveal is the entry motion instead
    if (window.matchMedia(MOBILE_QUERY).matches) return

    let lastPx = -1
    function updateBlur() {
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      const entry = clamp01((window.innerHeight - rect.top) / window.innerHeight)
      const px =
        entry <= BLUR_HOLD_FRACTION
          ? BLUR_MAX_PX
          : BLUR_MAX_PX * (1 - (entry - BLUR_HOLD_FRACTION) / (1 - BLUR_HOLD_FRACTION))
      const rounded = Math.round(px)
      if (rounded === lastPx) return
      lastPx = rounded
      if (rounded > 0) {
        stage.dataset.wallBlurring = 'true'
        stage.style.setProperty('--wall-blur', `${rounded}px`)
      } else {
        stage.dataset.wallBlurring = 'false'
      }
    }

    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        updateBlur()
      })
    }

    updateBlur()
    window.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(updateBlur)
    resizeObserver.observe(stage)

    return () => {
      window.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const container = closingRef.current
    const video = closingVideoRef.current
    if (!container || !video || !allowClosingVideo) return

    // the closing loop keeps decoding while far off-screen - only play it near the viewport
    const playbackObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        }
      },
      { threshold: 0, rootMargin: '25% 0px' },
    )

    playbackObserver.observe(container)
    return () => playbackObserver.disconnect()
  }, [allowClosingVideo])

  return (
    <section
      ref={(node) => {
        sectionRef.current = node
        assignRef(ref, node)
      }}
      className={`${styles.white} ${videoLive ? styles.videoLive : ''}`}
      aria-labelledby="white-section-title"
    >
      <div className={styles.introStage} ref={introStageRef}>
        <div className={styles.introSticky}>
          <WhiteVideoWall onLiveChange={setVideoLive} />

          <div className={styles.intro} ref={introRef}>
            <h2 id="white-section-title" className={styles.title}>
              <span className={styles.titleMask}>
                <span className={styles.titleLine} style={{ transitionDelay: '0ms' }}>
                  Every idea
                </span>
              </span>
              <span className={styles.titleMask}>
                <span className={`${styles.titleLine} ${styles.titleLine2}`} style={{ transitionDelay: '120ms' }}>
                  starts as a line.
                </span>
              </span>
            </h2>
            <p className={styles.description} style={{ transitionDelay: '360ms' }}>
              We follow it until it becomes a brand, a motion, an experience.
            </p>
          </div>
        </div>
      </div>

      <WhiteLine sectionRef={sectionRef} ctaRef={buttonRef} />

      <WhitePractices />

      <div className={`${styles.closing} ${isMobile ? styles.closingSolid : ''}`} ref={closingRef}>
        <div className={styles.closingBg} aria-hidden="true">
          {allowClosingVideo && (
            <video
              ref={closingVideoRef}
              className={`${styles.closingVideo} ${closingVideoReady ? styles.closingVideoLive : ''}`}
              src="/media/closing-light.mp4"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              aria-hidden="true"
              onCanPlay={() => setClosingVideoReady(true)}
            />
          )}
          {allowClosingVideo && (
            <div
              className={`${styles.filmGrain} ${closingVideoReady ? styles.filmGrainLive : ''}`}
              aria-hidden="true"
            />
          )}
        </div>
        {allowClosingVideo && (
          <div
            className={`${styles.closingVeil} ${closingVideoReady ? styles.closingVeilLive : ''}`}
            aria-hidden="true"
          />
        )}
        <div className={`${styles.closingContent} ${closingVideoReady || isMobile ? styles.closingDark : ''}`}>
          <p className={styles.closingTitle}>Let's draw the next one.</p>
          <a
            ref={buttonRef}
            href="https://www.delta-numen.com"
            target="_blank"
            rel="noopener"
            className={styles.button}
          >
            <span>Start a project</span>
            <svg className={styles.buttonArrow} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" />
            </svg>
          </a>
          <p className={styles.footer}>Numen Art - the creative division of Delta Numen</p>
        </div>
      </div>
    </section>
  )
}
