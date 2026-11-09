import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import PaSprig from './PaSprig'
import { playIfAllowed } from './playIfAllowed'
import { PROJECTS, STYLE_GROUPS } from './projects'
import { useConceptTones } from './useConceptTones'
import type { Project } from './projects'
import styles from './Works.module.css'

const MOBILE_QUERY = '(max-width: 810px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// Short enough that each project still sounds during a normal scroll, long enough that a fast one does not rattle.
const PROJECT_TONE_GAP_S = 0.45

type TileProps = { project: Project; className: string; primary?: boolean; origin?: string; children: ReactNode }

// Every tile opens the project; only the first one of a row is exposed to keyboards and screen readers.
function Tile({ project, className, primary = false, origin, children }: TileProps) {
  return (
    <a
      className={`${styles.tile} ${className}`}
      href={project.url}
      target="_blank"
      rel="noopener"
      aria-label={primary ? `${project.name}, visit site` : undefined}
      aria-hidden={primary ? undefined : true}
      tabIndex={primary ? undefined : -1}
      style={origin ? ({ '--origin': origin } as CSSProperties) : undefined}
    >
      {children}
    </a>
  )
}

function Poster({ name }: { name: string }) {
  return <img className={styles.media} src={`/media/${name}.jpg`} alt="" loading="lazy" />
}

function ScreenMedia({ project, isMobile }: { project: Project; isMobile: boolean }) {
  const video = isMobile && project.mobileVideo ? project.mobileVideo : project.video
  const poster = isMobile && project.mobileMedia ? project.mobileMedia : project.media
  if (!video) return <Poster name={poster} />
  return (
    <video
      className={styles.media}
      src={`/media/${video}.mp4`}
      poster={`/media/${poster}.jpg`}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  )
}

type ProjectRowProps = {
  project: Project
  index: number
  isMobile: boolean
  rowRef: (node: HTMLDivElement | null) => void
}

function ProjectRow({ project, index, isMobile, rowRef }: ProjectRowProps) {
  const position = { gridRow: index + 1 }
  const flipped = index % 2 === 1 ? styles.flipped : ''
  const first = index === 0 ? styles.rowFirst : ''
  const startsGroup = index === 0 || PROJECTS[index - 1].style !== project.style

  return (
    <>
      <div ref={rowRef} className={`${styles.rowLeft} ${flipped} ${first}`} style={position} data-index={index}>
        {startsGroup && <p className={styles.groupHeading}>{project.style}</p>}
        <p className={styles.rowName}>
          <span>{project.name}</span>
          <span>{project.index}</span>
        </p>
        <Tile project={project} className={styles.tileMat}>
          <Poster name={project.media} />
        </Tile>
        <Tile project={project} className={styles.tileDetail} origin="20% 25%">
          <Poster name={project.media} />
        </Tile>
        <p className={styles.number}>{project.index}</p>
      </div>

      <div className={`${styles.rowRight} ${flipped} ${first}`} style={position}>
        <Tile project={project} className={styles.tileWide} primary>
          <ScreenMedia project={project} isMobile={isMobile} />
          {project.artwork === 'pa-sprig' && (
            <div className={styles.artwork}>
              <PaSprig />
            </div>
          )}
        </Tile>
        <Tile project={project} className={styles.tilePhone}>
          <Poster name={project.mobileMedia ?? project.media} />
        </Tile>
        <Tile project={project} className={styles.tileDetail} origin="78% 72%">
          <Poster name={project.media} />
        </Tile>
      </div>
    </>
  )
}

export default function Works() {
  const sectionRef = useRef<HTMLElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const tonesRef = useConceptTones(PROJECT_TONE_GAP_S)
  const lastSoundedIndexRef = useRef(0)

  // the list follows whichever project row crosses the middle of the screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveIndex(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: '-45% 0px -55% 0px' },
    )
    for (const row of rowRefs.current) {
      if (row) observer.observe(row)
    }
    return () => observer.disconnect()
  }, [])

  // sounds only when the project changes, never on load
  useEffect(() => {
    if (activeIndex === lastSoundedIndexRef.current) return
    lastSoundedIndexRef.current = activeIndex
    tonesRef.current?.play('appear', activeIndex, 0)
  }, [activeIndex, tonesRef])

  // only the loops near the screen decode
  useEffect(() => {
    const section = sectionRef.current
    if (!section || window.matchMedia(REDUCED_MOTION_QUERY).matches) return

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
    for (const video of section.querySelectorAll('video')) observer.observe(video)
    return () => observer.disconnect()
  }, [])

  function scrollToRow(index: number) {
    const behavior = window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth'
    rowRefs.current[index]?.scrollIntoView({ behavior, block: 'center' })
  }

  return (
    <div className={styles.hold}>
      <section ref={sectionRef} className={styles.works} style={{ backgroundColor: `var(--ground-${PROJECTS[activeIndex].style.toLowerCase()})` }} aria-labelledby="works-title">
        <header className={styles.header}>
          <h2 id="works-title" className={styles.title}>
            Works,
          </h2>
          <p className={styles.headerLinks}>
            <a href="https://www.delta-numen.com" target="_blank" rel="noopener">
              Start a project
            </a>
            {', '}
            <a href="mailto:contact@delta-numen.com">Contact</a>
          </p>
        </header>

        <div className={styles.body}>
          <div className={styles.listColumn} style={{ gridRow: `1 / span ${PROJECTS.length}` }}>
            <div className={styles.list}>
              {STYLE_GROUPS.map((group) => (
                <div className={styles.listGroup} key={group}>
                  <p className={styles.listGroupName}>{group}</p>
                  <ol className={styles.listItems}>
                    {PROJECTS.map((project, i) =>
                      project.style === group ? (
                        <li key={project.index}>
                          <button
                            type="button"
                            className={`${styles.listItem} ${i === activeIndex ? styles.listItemActive : ''}`}
                            aria-current={i === activeIndex ? 'true' : undefined}
                            onClick={() => scrollToRow(i)}
                          >
                            {project.name}
                          </button>
                        </li>
                      ) : null,
                    )}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          {PROJECTS.map((project, i) => (
            <ProjectRow
              key={project.index}
              project={project}
              index={i}
              isMobile={isMobile}
              rowRef={(node) => {
                rowRefs.current[i] = node
              }}
            />
          ))}
        </div>
      </section>
      <div className={styles.holdSpace} aria-hidden="true" />
    </div>
  )
}
