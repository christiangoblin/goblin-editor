import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export default function TransformControls({ clip }) {
  const { updateClip } = useEditorStore()
  const tr = clip.transform || {}

  const set = (key, val) => {
    updateClip(clip.trackId, clip.id, {
      transform: { ...tr, [key]: val },
    })
  }

  return (
    <div className="space-y-4">
      <Section title="Position">
        <SliderRow label="X" value={tr.x ?? 0}    min={-100} max={100} step={0.5}  onChange={(v) => set('x', v)} unit="%" />
        <SliderRow label="Y" value={tr.y ?? 0}    min={-100} max={100} step={0.5}  onChange={(v) => set('y', v)} unit="%" />
      </Section>

      <Section title="Scale & Rotation">
        <SliderRow label="Scale"    value={tr.scale    ?? 1}   min={0.1} max={4}   step={0.01} onChange={(v) => set('scale', v)}    unit="×" />
        <SliderRow label="Rotation" value={tr.rotation ?? 0}   min={-180} max={180} step={1}   onChange={(v) => set('rotation', v)} unit="°" />
        <SliderRow label="Opacity"  value={tr.opacity  ?? 1}   min={0}   max={1}   step={0.01} onChange={(v) => set('opacity', v)}  unit="" />
      </Section>

      <Section title="Flip">
        <div className="flex gap-2">
          <ToggleBtn label="Flip H" active={tr.flipH} onClick={() => set('flipH', !tr.flipH)} />
          <ToggleBtn label="Flip V" active={tr.flipV} onClick={() => set('flipV', !tr.flipV)} />
        </div>
      </Section>

      <Section title="Crop">
        <SliderRow label="Top"    value={tr.cropTop    ?? 0} min={0} max={50} step={0.5} onChange={(v) => set('cropTop',    v)} unit="%" />
        <SliderRow label="Bottom" value={tr.cropBottom ?? 0} min={0} max={50} step={0.5} onChange={(v) => set('cropBottom', v)} unit="%" />
        <SliderRow label="Left"   value={tr.cropLeft   ?? 0} min={0} max={50} step={0.5} onChange={(v) => set('cropLeft',   v)} unit="%" />
        <SliderRow label="Right"  value={tr.cropRight  ?? 0} min={0} max={50} step={0.5} onChange={(v) => set('cropRight',  v)} unit="%" />
      </Section>

      <Section title="Aspect Ratio">
        <div className="flex flex-wrap gap-1">
          {['16:9','9:16','1:1','4:5','Custom'].map((ar) => (
            <ToggleBtn key={ar} label={ar} active={tr.aspectRatio === ar} onClick={() => set('aspectRatio', ar)} />
          ))}
        </div>
      </Section>

      <button
        onClick={() => updateClip(clip.trackId, clip.id, { transform: { x:0,y:0,scale:1,rotation:0,opacity:1,flipH:false,flipV:false } })}
        className="w-full py-1.5 text-xs rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        Reset Transform
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs mb-2 font-medium" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange, unit }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-14 flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 11 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="flex-1"
      />
      <input
        type="number" min={min} max={max} step={step}
        value={Number(value).toFixed(step < 1 ? 2 : 0)}
        onChange={(e) => onChange(+e.target.value)}
        className="w-14 text-xs text-right bg-transparent outline-none border rounded px-1"
        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      />
      <span className="text-xs w-4 flex-shrink-0" style={{ color: 'var(--muted)' }}>{unit}</span>
    </div>
  )
}

function ToggleBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-xs rounded border transition-colors"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background:  active ? 'rgba(124,92,191,0.2)' : 'transparent',
        color:       active ? 'var(--accent)' : 'var(--muted)',
      }}
    >
      {label}
    </button>
  )
}
