import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      const {
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        timeline,
        selectedClips, removeClip, splitClip,
        undo, redo,
        copySelectedClips, pasteClips,
        setActiveModal,
        setTimelineZoom,
        projectName, mediaAssets, exportSettings,
      } = useEditorStore.getState()

      const ctrl = e.ctrlKey || e.metaKey

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPlaying(!isPlaying)
          break

        case 's':
        case 'S':
          if (ctrl) {
            // Ctrl+S = save (strip live blob URLs the same way autosave does)
            e.preventDefault()
            import('../utils/db').then(({ saveProject }) => {
              saveProject({
                id: 'default-project',
                name: projectName,
                timeline,
                mediaAssets: mediaAssets.map((a) => ({ ...a, url: undefined })),
                exportSettings,
              })
            })
          } else {
            if (selectedClips.length) {
              selectedClips.forEach(({ trackId, clipId }) =>
                splitClip(trackId, clipId, currentTime)
              )
            }
          }
          break

        case 'Delete':
        case 'Backspace':
          if (selectedClips.length) {
            selectedClips.forEach(({ trackId, clipId }) => removeClip(trackId, clipId))
          }
          break

        case 'z':
        case 'Z':
          if (ctrl) {
            e.preventDefault()
            if (e.shiftKey) redo()
            else            undo()
          }
          break

        case 'y':
        case 'Y':
          if (ctrl) { e.preventDefault(); redo() }
          break

        case 'c':
        case 'C':
          if (ctrl) { e.preventDefault(); copySelectedClips() }
          break

        case 'v':
        case 'V':
          if (ctrl) { e.preventDefault(); pasteClips() }
          break

        case 'ArrowLeft':
          e.preventDefault()
          setCurrentTime(Math.max(0, currentTime - (e.shiftKey ? 1 : 1 / 30)))
          break

        case 'ArrowRight':
          e.preventDefault()
          setCurrentTime(Math.min(timeline.duration, currentTime + (e.shiftKey ? 1 : 1 / 30)))
          break

        case 'Home':
          e.preventDefault()
          setCurrentTime(0)
          break

        case 'End':
          e.preventDefault()
          setCurrentTime(timeline.duration)
          break

        case 'e':
        case 'E':
          if (ctrl) { e.preventDefault(); setActiveModal('export') }
          break

        case '+':
        case '=':
          if (ctrl) { e.preventDefault(); setTimelineZoom(timeline.zoom * 1.25) }
          break

        case '-':
          if (ctrl) { e.preventDefault(); setTimelineZoom(timeline.zoom * 0.8) }
          break

        case '?':
          setActiveModal('shortcuts')
          break

        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
