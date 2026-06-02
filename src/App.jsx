import React, { useState } from 'react'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePlaybackEngine }    from './hooks/usePlaybackEngine'
import { useAutosave }          from './hooks/useAutosave'
import Topbar                   from './components/ui/Topbar'
import MediaPanel               from './components/media/MediaPanel'
import PreviewPanel             from './components/preview/PreviewPanel'
import InspectorPanel           from './components/effects/InspectorPanel'
import TimelinePanel            from './components/timeline/TimelinePanel'
import ExportModal              from './components/export/ExportModal'
import ShortcutsModal           from './components/ui/ShortcutsModal'
import SystemCheckModal         from './components/ui/SystemCheckModal'
import HelpModal                from './components/ui/HelpModal'
import PerfWarningToast         from './components/ui/PerfWarningToast'
import { useEditorStore }       from './store/editorStore'

export default function App() {
  useKeyboardShortcuts()
  usePlaybackEngine()
  useAutosave()

  const [systemCheckDone, setSystemCheckDone] = useState(false)

  const {
    activeModal, setActiveModal,
    leftPanelWidth, rightPanelWidth, timelineHeight,
    setLeftPanelWidth, setRightPanelWidth, setTimelineHeight,
  } = useEditorStore()

  const startResize = (setter, axis, initial) => (e) => {
    e.preventDefault()
    const start = axis === 'x' ? e.clientX : e.clientY
    const move  = (mv) => setter(initial + (axis === 'x' ? mv.clientX - start : start - mv.clientY))
    const up    = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',  up)
  }

  const mainHeight = `calc(100vh - 48px - ${timelineHeight}px - 4px)`

  return (
    <div className="flex flex-col" style={{ height: '100vh', width: '100vw', background: 'var(--bg)', overflow: 'hidden' }}>
      {!systemCheckDone && (
        <SystemCheckModal onContinue={() => setSystemCheckDone(true)} />
      )}

      <Topbar />

      <div className="flex flex-1 overflow-hidden" style={{ height: mainHeight }}>
        <div
          className="flex-shrink-0 flex flex-col border-r"
          style={{ width: leftPanelWidth, borderColor: 'var(--border)', background: 'var(--panel)' }}
        >
          <MediaPanel />
        </div>

        <div
          className="panel-resize-handle flex-shrink-0 cursor-col-resize"
          style={{ width: 4 }}
          onMouseDown={startResize(setLeftPanelWidth, 'x', leftPanelWidth)}
        />

        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)', minWidth: 0 }}>
          <PreviewPanel />
        </div>

        <div
          className="panel-resize-handle flex-shrink-0 cursor-col-resize"
          style={{ width: 4 }}
          onMouseDown={startResize(setRightPanelWidth, 'x', rightPanelWidth)}
        />

        <div
          className="flex-shrink-0 flex flex-col border-l"
          style={{ width: rightPanelWidth, borderColor: 'var(--border)', background: 'var(--panel)' }}
        >
          <InspectorPanel />
        </div>
      </div>

      <div
        className="panel-resize-handle flex-shrink-0 cursor-row-resize"
        style={{ height: 4 }}
        onMouseDown={startResize(setTimelineHeight, 'y', timelineHeight)}
      />

      <div
        className="flex-shrink-0 border-t overflow-hidden"
        style={{ height: timelineHeight, borderColor: 'var(--border)', background: 'var(--panel)' }}
      >
        <TimelinePanel />
      </div>

      {/* Modals */}
      {activeModal === 'export'    && <ExportModal    onClose={() => setActiveModal(null)} />}
      {activeModal === 'shortcuts' && <ShortcutsModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'help'      && <HelpModal      onClose={() => setActiveModal(null)} />}

      {/* Toast */}
      <PerfWarningToast />
    </div>
  )
}
