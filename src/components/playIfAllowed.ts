// Autoplay can be refused and a pause can interrupt a pending play(); either way the
// poster or the last frame simply stays on screen.
export function playIfAllowed(video: HTMLVideoElement) {
  video.play().catch((error: unknown) => {
    const expected = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError')
    if (!expected) throw error
  })
}
