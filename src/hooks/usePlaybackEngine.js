import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'

export function usePlaybackEngine() {
  const isPlaying = useEditorStore((s) => s.isPlaying)
  const { setCurrentTime, setIsPlaying } = useEditorStore()
  const rafRef  = useRef(null)
  const lastRef = useRef(null)

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    lastRef.current = performance.now()

    const tick = (now) => {
      const delta = (now - lastRef.current) / 1000
      lastRef.current = now

      // Always read fresh state — avoids ALL stale closures (currentTime, playbackRate, duration)
      const { currentTime, timeline, playbackRate } = useEditorStore.getState()

      // Nothing to play on an empty timeline
      if (timeline.duration <= 0) {
        setIsPlaying(false)
        return
      }

      const next = currentTime + delta * playbackRate

      if (timeline.duration > 0 && next >= timeline.duration) {
        setCurrentTime(timeline.duration)
        setIsPlaying(false)
        return
      }

      setCurrentTime(next)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying])
}
