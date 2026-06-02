import React from 'react'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['Space'],          desc: 'Play / Pause' },
  { keys: ['S'],              desc: 'Split clip at playhead' },
  { keys: ['Delete'],         desc: 'Remove selected clip(s)' },
  { keys: ['Ctrl', 'Z'],      desc: 'Undo' },
  { keys: ['Ctrl', 'Y'],      desc: 'Redo' },
  { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo (alternate)' },
  { keys: ['Ctrl', 'C'],      desc: 'Copy selected clips' },
  { keys: ['Ctrl', 'V'],      desc: 'Paste clips at playhead' },
  { keys: ['Ctrl', 'E'],      desc: 'Open Export' },
  { keys: ['←'],              desc: 'Step back one frame' },
  { keys: ['→'],              desc: 'Step forward one frame' },
  { keys: ['Shift', '←'],     desc: 'Step back 1 second' },
  { keys: ['Shift', '→'],     desc: 'Step forward 1 second' },
  { keys: ['Home'],           desc: 'Go to start' },
  { keys: ['End'],            desc: 'Go to end' },
  { keys: ['Ctrl', '+'],      desc: 'Zoom timeline in' },
  { keys: ['Ctrl', '-'],      desc: 'Zoom timeline out' },
  { keys: ['?'],              desc: 'Show shortcuts' },
]

export default function ShortcutsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg w-full max-w-sm mx-4 border animate-slide-up" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-cinzel text-sm tracking-widest" style={{ color: 'var(--gold)' }}>SHORTCUTS</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }}><X size={16} /></button>
        </div>
        <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between py-1.5">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</span>
              <div className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'monospace' }}>
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
