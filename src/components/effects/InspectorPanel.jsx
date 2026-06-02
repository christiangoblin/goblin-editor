import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import TransformControls from './TransformControls'
import ColorEffects      from './ColorEffects'
import TextControls      from '../text/TextControls'
import AudioControls     from '../audio/AudioControls'

const TABS = ['Transform', 'Color', 'Audio', 'Text']

export default function InspectorPanel() {
  const { selectedClips, timeline } = useEditorStore()
  const [tab, setTab] = useState('Transform')

  const getSelectedClip = () => {
    if (!selectedClips.length) return null
    const { trackId, clipId } = selectedClips[0]
    const track = timeline.tracks.find((t) => t.id === trackId)
    return track?.clips.find((c) => c.id === clipId) ? { trackId, clipId, ...track.clips.find((c) => c.id === clipId) } : null
  }

  const clip = getSelectedClip()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-cinzel text-xs tracking-widest" style={{ color: 'var(--gold)' }}>INSPECTOR</span>
      </div>

      {!clip ? (
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Select a clip on the timeline to inspect and edit its properties.</p>
        </div>
      ) : (
        <>
          {/* Clip info */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{clip.name || 'Clip'}</p>
            <p className="text-xs" style={{ color: 'var(--muted)', fontSize: 10 }}>{clip.type}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 text-xs transition-colors"
                style={{
                  color:       tab === t ? 'var(--accent)' : 'var(--muted)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  fontSize: 11,
                }}
              >{t}</button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {tab === 'Transform' && <TransformControls clip={clip} />}
            {tab === 'Color'     && <ColorEffects      clip={clip} />}
            {tab === 'Audio'     && <AudioControls     clip={clip} />}
            {tab === 'Text'      && <TextControls      clip={clip} />}
          </div>
        </>
      )}
    </div>
  )
}
