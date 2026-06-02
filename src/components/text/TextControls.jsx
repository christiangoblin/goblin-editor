import React from 'react'
import { useEditorStore } from '../../store/editorStore'

const FONTS = ['Inter', 'Cinzel', 'Georgia', 'Arial', 'Courier New', 'Impact', 'Trebuchet MS']
const ANIMATIONS = ['none', 'fade-in', 'fade-out', 'slide-left', 'slide-right', 'pop', 'typewriter']
const ALIGNS = ['left', 'center', 'right']

export default function TextControls({ clip }) {
  const { updateClip, addClipToTrack, timeline } = useEditorStore()
  // Always read from textOptions (the canonical field)
  const opts = clip.textOptions || {}

  const set = (key, val) => {
    updateClip(clip.trackId, clip.id, { textOptions: { ...opts, [key]: val } })
  }

  const isTextClip = clip.type === 'text'

  if (!isTextClip) {
    return (
      <div className="space-y-3">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Select a text clip to edit text properties.</p>
        <button
          onClick={() => {
            const textTrack = timeline.tracks.find((t) => t.type === 'text')
            if (textTrack) {
              addClipToTrack(textTrack.id, {
                type: 'text', name: 'New Text',
                timelineStart: 0, trimStart: 0, trimEnd: 5,
                text: 'Your text here',
                textOptions: { font: 'Inter', size: 48, color: '#ffffff', align: 'center', x: 50, y: 90, opacity: 1 },
              })
            }
          }}
          className="w-full py-1.5 text-xs rounded transition-colors"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          + Add Text Clip
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Text content */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Content</label>
        <textarea
          className="w-full text-xs p-2 rounded outline-none resize-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', minHeight: 60 }}
          value={clip.text || ''}
          onChange={(e) => updateClip(clip.trackId, clip.id, { text: e.target.value })}
        />
      </div>

      {/* Font */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Font</label>
        <select
          className="w-full text-xs px-2 py-1 rounded outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          value={opts.font || 'Inter'}
          onChange={(e) => set('font', e.target.value)}
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Size */}
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Size</span>
        <input type="range" min={10} max={200} value={opts.size || 48} onChange={(e) => set('size', +e.target.value)} className="flex-1" />
        <span className="text-xs w-8 text-right" style={{ color: 'var(--text)' }}>{opts.size || 48}</span>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-xs flex-1" style={{ color: 'var(--muted)', fontSize: 11 }}>Color</span>
        <input type="color" value={opts.color || '#ffffff'} onChange={(e) => set('color', e.target.value)}
          className="w-8 h-7 rounded cursor-pointer border" style={{ borderColor: 'var(--border)', background: 'transparent' }} />
      </div>

      {/* Align */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Align</label>
        <div className="flex gap-1">
          {ALIGNS.map((a) => (
            <button key={a} onClick={() => set('align', a)}
              className="flex-1 py-1 text-xs rounded border capitalize transition-colors"
              style={{ borderColor: opts.align === a ? 'var(--accent)' : 'var(--border)', color: opts.align === a ? 'var(--accent)' : 'var(--muted)', background: opts.align === a ? 'rgba(124,92,191,0.15)' : 'transparent' }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Position X</span>
        <input type="range" min={0} max={100} value={opts.x ?? 50} onChange={(e) => set('x', +e.target.value)} className="flex-1" />
        <span className="text-xs w-8 text-right" style={{ color: 'var(--text)' }}>{opts.x ?? 50}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Position Y</span>
        <input type="range" min={0} max={100} value={opts.y ?? 90} onChange={(e) => set('y', +e.target.value)} className="flex-1" />
        <span className="text-xs w-8 text-right" style={{ color: 'var(--text)' }}>{opts.y ?? 90}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>Opacity</span>
        <input type="range" min={0} max={1} step={0.01} value={opts.opacity ?? 1} onChange={(e) => set('opacity', +e.target.value)} className="flex-1" />
        <span className="text-xs w-8 text-right" style={{ color: 'var(--text)' }}>{Math.round((opts.opacity ?? 1) * 100)}%</span>
      </div>

      {/* Style toggles */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Style</label>
        <div className="flex flex-wrap gap-1">
          {[['bold','Bold'],['italic','Italic'],['shadow','Shadow'],['stroke','Stroke']].map(([k,label]) => (
            <button key={k} onClick={() => set(k, !opts[k])}
              className="px-2 py-1 text-xs rounded border transition-colors"
              style={{ borderColor: opts[k] ? 'var(--accent)' : 'var(--border)', color: opts[k] ? 'var(--accent)' : 'var(--muted)', background: opts[k] ? 'rgba(124,92,191,0.15)' : 'transparent' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke color (shown when stroke is on) */}
      {opts.stroke && (
        <div className="flex items-center gap-2 pl-1 border-l-2" style={{ borderColor: 'var(--accent)' }}>
          <span className="text-xs flex-1" style={{ color: 'var(--muted)', fontSize: 11 }}>Stroke color</span>
          <input type="color" value={opts.strokeColor || '#000000'} onChange={(e) => set('strokeColor', e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border" style={{ borderColor: 'var(--border)' }} />
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--muted)', fontSize: 11 }}>Width</span>
            <input type="number" min={1} max={20} value={opts.strokeWidth || 2} onChange={(e) => set('strokeWidth', +e.target.value)}
              className="w-12 text-xs text-right bg-transparent outline-none border rounded px-1"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
        </div>
      )}

      {/* Animation */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Animation</label>
        <select
          className="w-full text-xs px-2 py-1 rounded outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          value={opts.animation || 'none'}
          onChange={(e) => set('animation', e.target.value)}
        >
          {ANIMATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {opts.animation !== 'none' && opts.animation && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted)', fontSize: 10 }}>
            Animation renders in preview. Export encodes the composited canvas frames.
          </p>
        )}
      </div>
    </div>
  )
}
