import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { saveProject, loadProject, saveMediaBlob, loadMediaBlob } from '../utils/db'

const PROJECT_ID        = 'default-project'
const AUTOSAVE_INTERVAL = 30_000 // 30s

export function useAutosave() {
  const timerRef    = useRef(null)
  const restoredRef = useRef(false)

  // Restore on first mount
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    loadProject(PROJECT_ID).then(async (saved) => {
      if (!saved?.timeline) return
      const store = useEditorStore.getState()

      // Restore blob URLs for media assets from IndexedDB
      const restoredAssets = await Promise.all(
        (saved.mediaAssets || []).map(async (a) => {
          if (a.url) return a // already has a live URL (shouldn't happen after strip, but be safe)
          try {
            const url = await loadMediaBlob(a.id)
            return { ...a, url }
          } catch {
            return { ...a, url: null }
          }
        })
      )

      // Revoke any previously live blob URLs before overwriting state
      const prev = useEditorStore.getState().mediaAssets
      prev.forEach((a) => { if (a.url?.startsWith('blob:')) URL.revokeObjectURL(a.url) })

      useEditorStore.setState({
        timeline:       saved.timeline,
        projectName:    saved.name           || store.projectName,
        exportSettings: saved.exportSettings || store.exportSettings,
        mediaAssets:    restoredAssets,
      })
    }).catch(() => {
      // No saved project — fine, start fresh
    })
  }, [])

  const doSave = async () => {
    const { timeline, mediaAssets, projectName, exportSettings } = useEditorStore.getState()

    // Persist each asset's blob to IndexedDB so it can be restored after reload
    await Promise.all(
      mediaAssets.map(async (a) => {
        if (!a.url || !a.url.startsWith('blob:')) return
        try {
          const res  = await fetch(a.url)
          const blob = await res.blob()
          await saveMediaBlob(a.id, blob)
        } catch {
          // Blob may have been revoked — skip silently
        }
      })
    )

    const snapshot = {
      id:             PROJECT_ID,
      name:           projectName,
      timeline,
      // Strip live blob URLs — they'll be restored from IndexedDB media store on next load
      mediaAssets:    mediaAssets.map((a) => ({ ...a, url: undefined })),
      exportSettings,
    }
    saveProject(snapshot).catch(console.error)
  }

  useEffect(() => {
    timerRef.current = setInterval(doSave, AUTOSAVE_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    const handler = () => doSave()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])
}
