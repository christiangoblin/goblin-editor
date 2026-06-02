import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX,
} from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { formatTime } from '../../utils/mediaUtils'
import { applyAudioEffect, detachAudioEffect } from '../../utils/audioEffects'

const QUALITY_SCALES = { '240p': 240/720, '480p': 480/720, '720p': 1, '1080p': 1080/720 }
const QUALITY_OPTIONS = ['240p', '480p', '720p', '1080p']
const SPEED_OPTIONS   = [0.25, 0.5, 1, 1.5, 2]
const BASE_W = 1280
const BASE_H = 720

// Simple LRU image cache — evicts oldest entries beyond MAX_CACHED_IMAGES
const MAX_CACHED_IMAGES = 50
const imageCache = new Map()

function getOrLoadImage(url) {
  if (imageCache.has(url)) {
    // Move to end (most recently used)
    const img = imageCache.get(url)
    imageCache.delete(url)
    imageCache.set(url, img)
    return img
  }
  const img = new Image()
  img.src = url
  imageCache.set(url, img)
  // Evict oldest if over limit
  if (imageCache.size > MAX_CACHED_IMAGES) {
    const oldestKey = imageCache.keys().next().value
    imageCache.delete(oldestKey)
  }
  return img
}

function buildFilter(colorFx = {}) {
  const parts = []
  // Brightness: -100..100 → 0..2
  const bright = (colorFx.brightness ?? 0) + (colorFx.exposure ?? 0) * 0.8
  if (bright !== 0) parts.push(`brightness(${1 + bright / 100})`)
  if (colorFx.contrast   ?? 0) parts.push(`contrast(${1 + (colorFx.contrast) / 100})`)
  // Saturation: also absorb temperature shift as a hue-rotate + saturate combo
  if (colorFx.saturation ?? 0) parts.push(`saturate(${1 + (colorFx.saturation) / 100})`)
  if (colorFx.hue        ?? 0) parts.push(`hue-rotate(${colorFx.hue}deg)`)
  // Temperature: warm (+) = slight hue shift toward red/yellow, cool (-) = toward blue
  if (colorFx.temperature ?? 0) parts.push(`hue-rotate(${(colorFx.temperature ?? 0) * -0.3}deg) saturate(${1 + Math.abs(colorFx.temperature ?? 0) * 0.003})`)
  if (colorFx.blur        ?? 0) parts.push(`blur(${colorFx.blur}px)`)
  // Sharpen approximated via contrast boost
  if (colorFx.sharpen     ?? 0) parts.push(`contrast(${1 + (colorFx.sharpen) * 0.005})`)
  return parts.join(' ') || 'none'
}

function applyClipTransform(ctx, clip, drawFn, canvasW, canvasH) {
  const tf = clip.transform || {}
  ctx.save()
  ctx.globalAlpha = tf.opacity ?? 1
  ctx.filter      = buildFilter(clip.colorFx)

  const cx = canvasW / 2 + (tf.x || 0) / 100 * canvasW
  const cy = canvasH / 2 + (tf.y || 0) / 100 * canvasH
  ctx.translate(cx, cy)
  ctx.rotate((tf.rotation || 0) * Math.PI / 180)
  ctx.scale((tf.flipH ? -1 : 1) * (tf.scale || 1), (tf.flipV ? -1 : 1) * (tf.scale || 1))

  drawFn(ctx, tf, canvasW, canvasH)
  ctx.restore()
}

function renderTextClip(ctx, clip, canvasW, canvasH, currentTime) {
  // textOptions is the canonical shape written by TextControls
  const opts = clip.textOptions || clip.textFormat || {}

  // Animation progress 0..1 over the first second of the clip
  const elapsed   = currentTime - clip.timelineStart
  const duration  = clip.trimEnd - clip.trimStart
  const progress  = Math.min(1, elapsed / Math.min(1, duration * 0.4))  // 40% of clip or 1s
  const animation = opts.animation || 'none'

  ctx.save()
  let alpha = opts.opacity ?? 1
  let offsetX = 0, offsetY = 0, scale = 1

  if (animation === 'fade-in')    alpha *= progress
  if (animation === 'fade-out')   alpha *= (1 - progress)
  if (animation === 'slide-left') offsetX = (1 - progress) * -canvasW * 0.3
  if (animation === 'slide-right') offsetX = (1 - progress) * canvasW * 0.3
  if (animation === 'pop')        scale = 0.5 + progress * 0.5
  // typewriter is handled by slicing text below

  ctx.globalAlpha = alpha
  const fontSize = Math.round((opts.size || 48) * (canvasW / BASE_W))
  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.italic ? 'italic ' : ''}${fontSize}px ${opts.font || 'Inter, sans-serif'}`
  ctx.fillStyle   = opts.color || '#ffffff'
  ctx.textAlign   = opts.align || 'center'
  ctx.textBaseline = 'middle'

  if (opts.shadow) {
    ctx.shadowColor   = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur    = 8 * (canvasW / BASE_W)
    ctx.shadowOffsetX = 2 * (canvasW / BASE_W)
    ctx.shadowOffsetY = 2 * (canvasW / BASE_W)
  }

  // Position: 0..100% of canvas
  const tx = ((opts.x ?? 50) / 100) * canvasW + offsetX
  const ty = ((opts.y ?? 90) / 100) * canvasH

  const displayText = animation === 'typewriter'
    ? (clip.text || '').slice(0, Math.ceil((clip.text || '').length * progress))
    : (clip.text || '')

  ctx.translate(tx, ty)
  if (scale !== 1) ctx.scale(scale, scale)
  ctx.translate(-tx, -ty)

  if (opts.stroke) {
    ctx.strokeStyle = opts.strokeColor || '#000000'
    ctx.lineWidth   = (opts.strokeWidth || 2) * (canvasW / BASE_W)
    ctx.strokeText(displayText, tx, ty)
  }
  ctx.fillText(displayText, tx, ty)
  ctx.restore()
}

function renderImageClip(ctx, clip, img, canvasW, canvasH) {
  const tf = clip.transform || {}
  applyClipTransform(ctx, clip, (ctx2, tf2) => {
    const nw = img.naturalWidth  || canvasW
    const nh = img.naturalHeight || canvasH
    const baseScale = Math.min(canvasW / nw, canvasH / nh)
    const w = nw * baseScale
    const h = nh * baseScale

    // Apply crop (percentage from each edge)
    const cropT = (tf2.cropTop    || 0) / 100
    const cropB = (tf2.cropBottom || 0) / 100
    const cropL = (tf2.cropLeft   || 0) / 100
    const cropR = (tf2.cropRight  || 0) / 100

    const sx = nw * cropL
    const sy = nh * cropT
    const sw = nw * (1 - cropL - cropR)
    const sh = nh * (1 - cropT - cropB)
    const dw = w  * (1 - cropL - cropR)
    const dh = h  * (1 - cropT - cropB)
    const dx = -w / 2 + w * cropL
    const dy = -h / 2 + h * cropT

    ctx2.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  }, canvasW, canvasH)
}

function getAspectRatioDimensions(ar, canvasW, canvasH) {
  const ratioMap = { '16:9': 16/9, '9:16': 9/16, '1:1': 1, '4:5': 4/5 }
  const ratio = ratioMap[ar]
  if (!ratio) return null
  // Fit the desired ratio inside the canvas
  let w = canvasW, h = canvasH
  if (w / h > ratio) { w = h * ratio } else { h = w / ratio }
  return { w, h }
}

function renderVideoClip(ctx, clip, vid, trackType, canvasW, canvasH) {
  applyClipTransform(ctx, clip, (ctx2, tf2) => {
    const vw = vid.videoWidth  || canvasW
    const vh = vid.videoHeight || canvasH
    let baseScale
    if (trackType === 'overlay') {
      baseScale = Math.min(canvasW / vw, canvasH / vh) * (clip.transform?.scale || 0.4)
    } else {
      baseScale = Math.min(canvasW / vw, canvasH / vh)
    }

    // Apply aspectRatio crop if set
    const arDims = getAspectRatioDimensions(tf2.aspectRatio, canvasW, canvasH)
    let w = vw * baseScale
    let h = vh * baseScale
    if (arDims) {
      // Scale so shortest side fills the target AR box, then crop
      const arScale = Math.max(arDims.w / w, arDims.h / h)
      w *= arScale; h *= arScale
    }

    const cropT = (tf2.cropTop    || 0) / 100
    const cropB = (tf2.cropBottom || 0) / 100
    const cropL = (tf2.cropLeft   || 0) / 100
    const cropR = (tf2.cropRight  || 0) / 100

    const sx = vw * cropL
    const sy = vh * cropT
    const sw = vw * (1 - cropL - cropR)
    const sh = vh * (1 - cropT - cropB)
    const dw = w  * (1 - cropL - cropR)
    const dh = h  * (1 - cropT - cropB)
    const dx = -w / 2 + w * cropL
    const dy = -h / 2 + h * cropT

    ctx2.drawImage(vid, sx, sy, sw, sh, dx, dy, dw, dh)
  }, canvasW, canvasH)
}

export default function PreviewPanel() {
  const {
    currentTime, setCurrentTime, isPlaying, setIsPlaying,
    playbackRate, setPlaybackRate,
    previewQuality, setPreviewQuality,
    timeline, activeModal,
  } = useEditorStore()

  const canvasRef    = useRef()
  const containerRef = useRef()
  const videoRefs    = useRef({})
  const audioRefs    = useRef({})
  const [muted,  setMuted]  = useState(false)
  const [volume, setVolume] = useState(1)

  const qualityScale = QUALITY_SCALES[previewQuality] || 1
  const canvasW = Math.round(BASE_W * qualityScale)
  const canvasH = Math.round(BASE_H * qualityScale)

  // Stop playback when export modal opens
  useEffect(() => {
    if (activeModal === 'export' && isPlaying) setIsPlaying(false)
  }, [activeModal])

  // Clean up removed clips
  useEffect(() => {
    const currentClipIds = new Set()
    timeline.tracks.forEach((t) => t.clips.forEach((c) => currentClipIds.add(c.id)))

    Object.keys(videoRefs.current).forEach((id) => {
      if (!currentClipIds.has(id)) {
        detachAudioEffect(videoRefs.current[id])
        videoRefs.current[id].pause()
        videoRefs.current[id].src = ''
        delete videoRefs.current[id]
      }
    })
    Object.keys(audioRefs.current).forEach((id) => {
      if (!currentClipIds.has(id)) {
        detachAudioEffect(audioRefs.current[id])
        audioRefs.current[id].pause()
        audioRefs.current[id].src = ''
        delete audioRefs.current[id]
      }
    })
  }, [timeline])

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Render in track order (top of list = bottom of composite)
    // Tracks are listed top-to-bottom in UI so we render them in order and
    // later tracks paint on top — matching what users expect from the track order.
    const tracks = [...timeline.tracks]

    tracks.forEach((track) => {
      if (track.hidden) return
      track.clips.forEach((clip) => {
        const clipEnd = clip.timelineStart + (clip.trimEnd - clip.trimStart)
        if (currentTime < clip.timelineStart || currentTime >= clipEnd) return

        if (clip.type === 'text') {
          renderTextClip(ctx, clip, canvasW, canvasH, currentTime)
        } else if (clip.type === 'image' && clip.url) {
          const img = getOrLoadImage(clip.url)
          if (img.complete && img.naturalWidth > 0) renderImageClip(ctx, clip, img, canvasW, canvasH)
        } else if ((clip.type === 'video' || clip.type === 'overlay') && clip.url) {
          let vid = videoRefs.current[clip.id]
          if (!vid) {
            vid = document.createElement('video')
            vid.src     = clip.url
            vid.preload = 'auto'
            vid.crossOrigin = 'anonymous'
            videoRefs.current[clip.id] = vid
          }

          const audioSettings = clip.audioSettings || {}
          const effectiveMute = muted || (audioSettings.muted ?? false) || track.muted
          vid.muted  = effectiveMute
          vid.volume = effectiveMute ? 0 : Math.min(1, volume)

          // Apply Web Audio effect chain (handles volume + effect processing)
          if (!effectiveMute) applyAudioEffect(vid, { ...audioSettings, volume })

          const vidTime = clip.trimStart + (currentTime - clip.timelineStart)
          // During playback use a larger threshold — the browser's media clock will
          // naturally stay in sync. Only hard-seek when truly out of sync (e.g. after
          // a scrub or a pause). During playback a 0.5s tolerance avoids constant
          // seeks that cause stutter; when paused we use tight sync (0.05s).
          const seekThreshold = isPlaying ? 0.5 : 0.05
          if (Math.abs(vid.currentTime - vidTime) > seekThreshold) vid.currentTime = vidTime
          if (isPlaying && vid.paused)  vid.play().catch(() => {})
          if (!isPlaying && !vid.paused) vid.pause()

          if (vid.readyState >= 2) renderVideoClip(ctx, clip, vid, track.type, canvasW, canvasH)
        } else if (clip.type === 'audio' && clip.url) {
          // Audio-only clips: manage an audio element
          let aud = audioRefs.current[clip.id]
          if (!aud) {
            aud = document.createElement('audio')
            aud.src        = clip.url
            aud.preload    = 'auto'
            aud.crossOrigin = 'anonymous'
            audioRefs.current[clip.id] = aud
          }
          const audioSettings = clip.audioSettings || {}
          const effectiveMute = muted || (audioSettings.muted ?? false) || track.muted

          // Compute fade in/out gain
          const clipDuration = clip.trimEnd - clip.trimStart
          const elapsed      = currentTime - clip.timelineStart
          const fadeIn       = audioSettings.fadeIn  ?? 0
          const fadeOut      = audioSettings.fadeOut ?? 0
          let fadeGain = 1
          if (fadeIn  > 0 && elapsed < fadeIn)                 fadeGain = elapsed / fadeIn
          if (fadeOut > 0 && elapsed > clipDuration - fadeOut) fadeGain = Math.min(fadeGain, (clipDuration - elapsed) / fadeOut)
          fadeGain = Math.max(0, Math.min(1, fadeGain))

          aud.muted  = effectiveMute
          aud.volume = effectiveMute ? 0 : Math.min(1, volume * fadeGain)

          if (!effectiveMute) applyAudioEffect(aud, { ...audioSettings, volume: volume * fadeGain })

          const audTime = clip.trimStart + elapsed
          const seekThreshold = isPlaying ? 0.5 : 0.05
          if (Math.abs(aud.currentTime - audTime) > seekThreshold) aud.currentTime = audTime
          if (isPlaying && aud.paused)  aud.play().catch(() => {})
          if (!isPlaying && !aud.paused) aud.pause()
        }
      })
    })
  }, [currentTime, timeline, isPlaying, muted, volume, canvasW, canvasH])

  // Pause all on unmount
  useEffect(() => () => {
    Object.values(videoRefs.current).forEach((v) => { detachAudioEffect(v); v.pause(); v.src = '' })
    Object.values(audioRefs.current).forEach((a) => { detachAudioEffect(a); a.pause(); a.src = '' })
  }, [])

  const handleScrubClick = (e) => {
    const rect  = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setCurrentTime(Math.max(0, Math.min(timeline.duration, ratio * timeline.duration)))
  }

  const progress = timeline.duration > 0 ? currentTime / timeline.duration : 0

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ background: '#000', minHeight: 0 }}
      >
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            display: 'block',
            imageRendering: previewQuality === '240p' ? 'pixelated' : 'auto',
          }}
        />
      </div>

      {/* Scrubber */}
      <div className="px-4 py-1 flex-shrink-0" style={{ background: 'var(--panel)' }}>
        <div
          className="h-2 rounded-full cursor-pointer relative"
          style={{ background: 'var(--border)' }}
          onClick={handleScrubClick}
        >
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: 'var(--accent)' }} />
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full border-2"
            style={{ left: `${progress * 100}%`, transform: 'translate(-50%,-50%)', background: 'white', borderColor: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Controls */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t flex-shrink-0 flex-wrap gap-y-1"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
      >
        <span className="text-xs font-mono" style={{ color: 'var(--muted)', minWidth: 100 }}>
          {formatTime(currentTime)} / {formatTime(timeline.duration)}
        </span>

        <div className="flex items-center gap-2">
          <CtrlBtn icon={<SkipBack size={14} />}    onClick={() => setCurrentTime(0)}                   title="Go to start" />
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            {isPlaying
              ? <Pause size={14} fill="white" color="white" />
              : <Play  size={14} fill="white" color="white" style={{ marginLeft: 1 }} />
            }
          </button>
          <CtrlBtn icon={<SkipForward size={14} />} onClick={() => setCurrentTime(timeline.duration)} title="Go to end" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(!muted)} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }}>
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(+e.target.value); if (+e.target.value > 0) setMuted(false) }}
            style={{ width: 64 }}
          />

          <select
            className="text-xs px-1 py-0.5 rounded outline-none"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            value={playbackRate}
            onChange={(e) => setPlaybackRate(+e.target.value)}
          >
            {SPEED_OPTIONS.map((s) => <option key={s} value={s}>{s}x</option>)}
          </select>

          <select
            className="text-xs px-1 py-0.5 rounded outline-none"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            value={previewQuality}
            onChange={(e) => setPreviewQuality(e.target.value)}
          >
            {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

function CtrlBtn({ icon, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-white/5 transition-colors"
      style={{ color: 'var(--muted)' }}
    >
      {icon}
    </button>
  )
}
