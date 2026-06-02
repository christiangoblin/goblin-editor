import React from 'react'
import { useEditorStore } from '../../store/editorStore'

const COLOR_PROPS = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
  { key: 'contrast',   label: 'Contrast',   min: -100, max: 100, default: 0 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
  { key: 'exposure',   label: 'Exposure',   min: -100, max: 100, default: 0 },
  { key: 'hue',        label: 'Hue',        min: -180, max: 180, default: 0 },
  { key: 'temperature',label: 'Temperature',min: -100, max: 100, default: 0 },
  { key: 'blur',       label: 'Blur',       min: 0,    max: 20,  default: 0 },
  { key: 'sharpen',    label: 'Sharpen',    min: 0,    max: 100, default: 0 },
]

const PRESETS = [
  { name: 'Grayscale', fx: { saturation: -100 } },
  { name: 'Sepia',     fx: { saturation: -80, hue: 30, brightness: 10 } },
  { name: 'Cinematic', fx: { contrast: 20, saturation: -20, temperature: -15 } },
  { name: 'Vivid',     fx: { saturation: 60, contrast: 15 } },
  { name: 'Night',     fx: { brightness: -40, saturation: -30, temperature: -30 } },
]

export default function ColorEffects({ clip }) {
  const { updateClip } = useEditorStore()
  const fx = clip.colorFx || {}

  const set = (key, val) => {
    updateClip(clip.trackId, clip.id, { colorFx: { ...fx, [key]: val } })
  }

  const applyPreset = (preset) => {
    const base = {}
    COLOR_PROPS.forEach((p) => { base[p.key] = p.default })
    updateClip(clip.trackId, clip.id, { colorFx: { ...base, ...preset.fx } })
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Presets</p>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-2 py-1 text-xs rounded border hover:border-accent transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >{p.name}</button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      {COLOR_PROPS.map(({ key, label, min, max }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>{label}</span>
          <input
            type="range" min={min} max={max} step={1}
            value={fx[key] ?? 0}
            onChange={(e) => set(key, +e.target.value)}
            className="flex-1"
          />
          <span className="text-xs w-8 text-right" style={{ color: 'var(--text)' }}>{fx[key] ?? 0}</span>
        </div>
      ))}

      <button
        onClick={() => updateClip(clip.trackId, clip.id, { colorFx: {} })}
        className="w-full py-1.5 text-xs rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        Reset Color
      </button>
    </div>
  )
}
