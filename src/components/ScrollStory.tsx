import { useCallback, useLayoutEffect, useRef } from 'react'
import { storyTimelineAt } from '../scroll/storyTimeline'
import type { StoryFrame, StoryMeasure } from '../scroll/storyTimeline'
import Descent from './Descent'
import Hero from './Hero'
import LineFigures from './LineFigures'
import styles from './ScrollStory.module.css'
import WhiteSection from './WhiteSection'

export default function ScrollStory() {
  const storyRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const whiteRef = useRef<HTMLElement>(null)

  const getStoryFrame = useCallback((): StoryFrame => {
    const viewportHeight = window.innerHeight
    const hero = heroRef.current
    const white = whiteRef.current
    let measure: StoryMeasure

    if (hero && white) {
      const heroRect = hero.getBoundingClientRect()
      const whiteRect = white.getBoundingClientRect()
      measure = {
        heroTop: heroRect.top,
        heroHeight: heroRect.height,
        whiteTop: whiteRect.top,
        viewportHeight,
      }
    } else {
      measure = { heroTop: 0, heroHeight: viewportHeight, whiteTop: Infinity, viewportHeight }
    }

    return { ...measure, timeline: storyTimelineAt(measure) }
  }, [])

  useLayoutEffect(() => {
    let lastScrolled: string | null = null
    function updateScrolledState() {
      const story = storyRef.current
      if (!story) return
      const scrolled = getStoryFrame().timeline.frozen ? '1' : '0'
      if (scrolled === lastScrolled) return
      lastScrolled = scrolled
      story.style.setProperty('--scrolled', scrolled)
    }

    updateScrolledState()
    window.addEventListener('scroll', updateScrolledState, { passive: true })
    window.addEventListener('resize', updateScrolledState)

    return () => {
      window.removeEventListener('scroll', updateScrolledState)
      window.removeEventListener('resize', updateScrolledState)
    }
  }, [getStoryFrame])

  return (
    <main className={styles.story} ref={storyRef}>
      <LineFigures getStoryFrame={getStoryFrame} />
      <Hero ref={heroRef} />
      <Descent />
      <WhiteSection ref={whiteRef} />
    </main>
  )
}
