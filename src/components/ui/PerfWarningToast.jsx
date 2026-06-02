import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'

export default function PerfWarningToast() {
  const { perfWarning, dismissPerfWarning } = useEditorStore()

  useEffect(() => {
    if (!perfWarning) return
    const t = setTimeout(dismissPerfWarning, 8000)
    return () => clearTimeout(t)
  }, [perfWarning])

  if (!perfWarning) return null

  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 flex items-start gap-3 px-4 py-3 rounded-lg border animate-slide-up"
      style={{
        transform: 'translateX(-50%)',
        background: 'rgba(201,168,76,0.12)',
        borderColor: 'rgba(201,168,76,0.4)',
        maxWidth: 420,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <AlertTriangle size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
      <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text)' }}>{perfWarning}</p>
      <button onClick={dismissPerfWarning} className="p-0.5 rounded hover:bg-white/10 flex-shrink-0" style={{ color: 'var(--muted)' }}>
        <X size={13} />
      </button>
    </div>
  )
}
