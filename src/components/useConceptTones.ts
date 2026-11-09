import { useEffect, useRef } from 'react'
import { createConceptTones } from './conceptTones'
import type { ConceptTones } from './conceptTones'

const START_EVENTS = ['scroll', 'wheel', 'pointerdown', 'touchend', 'keydown', 'click']

// Browsers only let audio start after a click, tap or key press; scrolling alone does not count.
// Every scroll still asks, so a visitor who has already interacted hears it straight away.
export function useConceptTones(minGapS: number) {
  const tonesRef = useRef<ConceptTones | null>(null)

  useEffect(() => {
    function askToStart() {
      tonesRef.current ??= createConceptTones(minGapS)
      tonesRef.current.resume()
      if (tonesRef.current.isRunning()) stopAsking()
    }

    function stopAsking() {
      for (const name of START_EVENTS) window.removeEventListener(name, askToStart)
    }

    for (const name of START_EVENTS) window.addEventListener(name, askToStart, { passive: true })
    return () => {
      stopAsking()
      tonesRef.current?.close()
      tonesRef.current = null
    }
  }, [minGapS])

  return tonesRef
}
