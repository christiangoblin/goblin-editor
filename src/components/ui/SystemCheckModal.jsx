import React, { useEffect, useState } from 'react'
import { Scissors, CheckCircle, XCircle, AlertTriangle, ChevronRight, Cpu, MemoryStick, Monitor, Zap, Clock, Film, BookOpen } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import HelpModal from './HelpModal'

async function detectSystemCapabilities() {
  const results = {}
  results.ram   = navigator.deviceMemory ?? null
  results.cores = navigator.hardwareConcurrency ?? null

  try {
    const canvas = document.createElement('canvas')
    const gl     = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (gl) {
      const dbgInfo   = gl.getExtension('WEBGL_debug_renderer_info')
      results.gpu     = dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown GPU'
      results.webgl   = true
      results.webgl2  = !!canvas.getContext('webgl2')
    } else {
      results.gpu   = 'No GPU detected'
      results.webgl = false
    }
  } catch {
    results.gpu   = 'Unable to detect'
    results.webgl = false
  }

  results.sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'

  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      results.storageGB = Math.round((est.quota || 0) / 1024 / 1024 / 1024 * 10) / 10
    }
  } catch { results.storageGB = null }

  const ua = navigator.userAgent
  if      (ua.includes('Chrome') && !ua.includes('Edg'))  results.browser = 'Chrome'
  else if (ua.includes('Edg'))                             results.browser = 'Edge'
  else if (ua.includes('Firefox'))                         results.browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) results.browser = 'Safari'
  else results.browser = 'Other'

  const score =
    (results.cores >= 8 ? 3 : results.cores >= 4 ? 2 : 1) +
    (results.ram   >= 8 ? 3 : results.ram   >= 4 ? 2 : 1) +
    (results.webgl2 ? 2 : results.webgl ? 1 : 0)

  results.tier = score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low'
  return results
}

const TIER_RECS = {
  high: {
    label:       'High Performance',
    color:       'var(--success)',
    maxLength:   '30+ minutes',
    quality:     '1080p at 60fps',
    tracks:      'Unlimited tracks',
    description: 'Your system should handle large projects comfortably.',
  },
  medium: {
    label:       'Moderate Performance',
    color:       'var(--gold)',
    maxLength:   '5–15 minutes',
    quality:     '720p at 30fps',
    tracks:      'Up to 6–8 tracks',
    description: 'Keep projects under 15 minutes for best results.',
  },
  low: {
    label:       'Low Performance',
    color:       'var(--danger)',
    maxLength:   '1–3 minutes',
    quality:     '480p at 24fps',
    tracks:      '2–3 tracks max',
    description: 'Your system may struggle. Keep clips short and use low quality settings.',
  },
}

function CheckRow({ icon, label, value, status }) {
  const Icon   = icon
  const colors = { ok: 'var(--success)', warn: 'var(--gold)', fail: 'var(--danger)', info: 'var(--muted)' }
  const Badges = { ok: CheckCircle, warn: AlertTriangle, fail: XCircle, info: null }
  const Badge  = Badges[status]
  return (
    <div className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <Icon size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      <span className="text-xs flex-1" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: colors[status] || 'var(--text)' }}>{value}</span>
      {Badge && <Badge size={13} style={{ color: colors[status], flexShrink: 0 }} />}
    </div>
  )
}

function RecCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} />
        <span className="text-xs" style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

export default function SystemCheckModal({ onContinue }) {
  const [sys,         setSys]         = useState(null)
  const [step,        setStep]        = useState('checking')
  const [checked,     setChecked]     = useState(false)
  const [showHelp,    setShowHelp]    = useState(false)
  const { setSystemTier } = useEditorStore()

  useEffect(() => {
    detectSystemCapabilities().then((res) => {
      setSys(res)
      setSystemTier(res.tier)
      setStep('results')
    })
  }, [])

  const rec = sys ? TIER_RECS[sys.tier] : null

  if (showHelp) return <HelpModal onClose={() => setShowHelp(false)} />

  if (step === 'checking') {
    return (
      <Overlay>
        <div className="flex flex-col items-center gap-6 py-8">
          <div style={{ position: 'relative' }}>
            <Scissors size={32} style={{ color: 'var(--gold)' }} />
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(201,168,76,0.15)', animationDuration: '1.5s' }} />
          </div>
          <div className="text-center">
            <p className="font-cinzel text-sm tracking-widest" style={{ color: 'var(--gold)' }}>GOBLIN EDITOR</p>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Checking your system…</p>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </Overlay>
    )
  }

  if (step === 'results' && sys) {
    return (
      <Overlay>
        <ModalHeader />

        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: `1px solid ${rec.color}22` }}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rec.color, boxShadow: `0 0 8px ${rec.color}` }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: rec.color }}>{rec.label}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{rec.description}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--muted)', fontSize: 10 }}>System</p>
          <CheckRow icon={Cpu}         label="CPU Cores"          value={sys.cores ? `${sys.cores} cores` : 'Unknown'}    status={sys.cores >= 8 ? 'ok' : sys.cores >= 4 ? 'warn' : 'info'} />
          <CheckRow icon={MemoryStick} label="RAM"                value={sys.ram   ? `~${sys.ram} GB`     : 'Unknown'}   status={sys.ram   >= 8 ? 'ok' : sys.ram   >= 4 ? 'warn' : 'info'} />
          <CheckRow icon={Monitor}     label="GPU / WebGL"        value={sys.gpu   ? sys.gpu.slice(0, 36) : 'Unknown'}   status={sys.webgl2 ? 'ok' : sys.webgl ? 'warn' : 'fail'} />
          <CheckRow icon={Zap}         label="FFmpeg.wasm Export" value={sys.sharedArrayBuffer ? 'Supported' : 'Not supported'} status={sys.sharedArrayBuffer ? 'ok' : 'fail'} />
          <CheckRow icon={Monitor}     label="Browser"            value={sys.browser}                                     status={['Chrome','Edge'].includes(sys.browser) ? 'ok' : 'warn'} />
          {sys.storageGB !== null && (
            <CheckRow icon={Film}      label="Available Storage"  value={`~${sys.storageGB} GB`}                          status={sys.storageGB >= 2 ? 'ok' : 'warn'} />
          )}
        </div>

        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs mb-3 uppercase tracking-widest" style={{ color: 'var(--muted)', fontSize: 10 }}>Recommended for your system</p>
          <div className="grid grid-cols-3 gap-2">
            <RecCard icon={Clock}   label="Max length" value={rec.maxLength} color={rec.color} />
            <RecCard icon={Film}    label="Quality"    value={rec.quality}   color={rec.color} />
            <RecCard icon={Monitor} label="Tracks"     value={rec.tracks}    color={rec.color} />
          </div>
        </div>

        {!sys.sharedArrayBuffer && (
          <div className="mx-6 mb-2 mt-3 p-3 rounded text-xs" style={{ background: 'rgba(201,76,76,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            <strong>Export unavailable:</strong> SharedArrayBuffer is not available. FFmpeg.wasm requires specific HTTP headers (<code>COOP</code> / <code>COEP</code>).
          </div>
        )}

        <div className="px-6 py-4 flex flex-col gap-2">
          <button
            onClick={() => setStep('warning')}
            className="w-full py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Continue to Editor <ChevronRight size={15} />
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="w-full py-2 rounded text-xs flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <BookOpen size={13} /> How to use Goblin Editor
          </button>
        </div>
      </Overlay>
    )
  }

  if (step === 'warning') {
    return (
      <Overlay>
        <ModalHeader />

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Browser-based editor — please read</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Goblin Editor runs entirely in your browser. <strong style={{ color: 'var(--text)' }}>No files leave your device</strong>, but this means all processing uses your browser's memory and CPU.
              </p>
              <ul className="text-xs space-y-1.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                <li>⚠ Importing many large video files at once may cause <strong style={{ color: 'var(--text)' }}>tab crashes or slowdowns</strong></li>
                <li>⚠ Very long timelines (30+ min at high quality) can <strong style={{ color: 'var(--text)' }}>exhaust browser memory</strong></li>
                <li>⚠ Export via FFmpeg.wasm is <strong style={{ color: 'var(--text)' }}>CPU-intensive</strong> and may make your browser unresponsive for several minutes on large projects</li>
                <li>✓ Your work autosaves every 30 seconds to IndexedDB</li>
                <li>✓ If the tab crashes, reopen Goblin Editor and your project should restore</li>
              </ul>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setChecked(!checked)}
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: checked ? 'var(--accent)' : 'transparent',
                border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {checked && <CheckCircle size={10} color="white" fill="white" />}
            </div>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              I understand this is a browser-based editor and will keep my projects within the recommended limits.
            </span>
          </label>

          <button
            onClick={onContinue}
            disabled={!checked}
            className="w-full py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: checked ? 'var(--accent)' : 'var(--border)',
              color:      checked ? 'white' : 'var(--muted)',
              opacity:    checked ? 1 : 0.6,
              cursor:     checked ? 'pointer' : 'not-allowed',
            }}
          >
            <Scissors size={14} />
            Open Goblin Editor
          </button>

          <button
            onClick={() => setStep('results')}
            className="w-full py-1.5 text-xs rounded hover:bg-white/5 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            ← Back to system info
          </button>
        </div>
      </Overlay>
    )
  }

  return null
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,10,12,0.95)', backdropFilter: 'blur(12px)' }}>
      <div
        className="w-full max-w-md mx-4 rounded-xl border overflow-hidden animate-slide-up"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader() {
  return (
    <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="p-2 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)' }}>
        <Scissors size={18} style={{ color: 'var(--gold)' }} />
      </div>
      <div>
        <p className="font-cinzel text-sm font-semibold tracking-widest" style={{ color: 'var(--gold)' }}>GOBLIN EDITOR</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>System Check & Recommendations</p>
      </div>
    </div>
  )
}
