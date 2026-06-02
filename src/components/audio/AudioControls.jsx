import React from 'react'
import { useEditorStore } from '../../store/editorStore'

const AUDIO_EFFECTS = ['none', 'normalize', 'bass-boost', 'low-pass', 'high-pass', 'echo', 'reverb']

export default function AudioControls({ clip }) {
  const { updateClip } = useEditorStore()
  const audio = clip.audioSettings || {}

  const set = (key, val) => {
    updateClip(clip.trackId, clip.id, { audioSettings: { ...audio, [key]: val } })
  }

  return (
    <div className="space-y-4">
      {/* Volume */}
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Volume</span>
        <input
          type="range" min={0} max={200} step={1}
          value={(audio.volume ?? 1) * 100}
          onChange={(e) => set('volume', +e.target.value / 100)}
          className="flex-1"
        />
        <span className="text-xs w-10 text-right" style={{ color: 'var(--text)' }}>{Math.round((audio.volume ?? 1) * 100)}%</span>
      </div>

      {/* Mute */}
      <div className="flex items-center gap-2">
        <span className="text-xs flex-1" style={{ color: 'var(--muted)', fontSize: 11 }}>Mute clip audio</span>
        <button
          onClick={() => set('muted', !audio.muted)}
          className="px-3 py-1 text-xs rounded border transition-colors"
          style={{
            borderColor: audio.muted ? 'var(--danger)' : 'var(--border)',
            color:       audio.muted ? 'var(--danger)' : 'var(--muted)',
            background:  audio.muted ? 'rgba(201,76,76,0.15)' : 'transparent',
          }}
        >{audio.muted ? 'Unmute' : 'Mute'}</button>
      </div>

      {/* Fade in/out */}
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Fade In</span>
        <input
          type="range" min={0} max={5} step={0.1}
          value={audio.fadeIn ?? 0}
          onChange={(e) => set('fadeIn', +e.target.value)}
          className="flex-1"
        />
        <span className="text-xs w-10 text-right" style={{ color: 'var(--text)' }}>{(audio.fadeIn ?? 0).toFixed(1)}s</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Fade Out</span>
        <input
          type="range" min={0} max={5} step={0.1}
          value={audio.fadeOut ?? 0}
          onChange={(e) => set('fadeOut', +e.target.value)}
          className="flex-1"
        />
        <span className="text-xs w-10 text-right" style={{ color: 'var(--text)' }}>{(audio.fadeOut ?? 0).toFixed(1)}s</span>
      </div>

      {/* Effect */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Effect</label>
        <select
          className="w-full text-xs px-2 py-1 rounded outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          value={audio.effect || 'none'}
          onChange={(e) => set('effect', e.target.value)}
        >
          {AUDIO_EFFECTS.map((ef) => <option key={ef} value={ef}>{ef}</option>)}
        </select>
      </div>

      <button
        onClick={() => updateClip(clip.trackId, clip.id, { audioSettings: {} })}
        className="w-full py-1.5 text-xs rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        Reset Audio
      </button>
    </div>
  )
}
