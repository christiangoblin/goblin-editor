import React, { useState, useRef, useEffect } from 'react'
import { X, Download, AlertCircle, Clock } from 'lucide-react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useEditorStore } from '../../store/editorStore'

const RESOLUTIONS = { '480p': [854,480], '720p': [1280,720], '1080p': [1920,1080], '1440p': [2560,1440] }
const BITRATES    = { low: '1M', medium: '4M', high: '8M' }

// Rough estimate: seconds of encode time per second of video, per resolution tier
const ENCODE_RATE = {
  '480p':  { low: 0.3, medium: 0.5, high: 0.8 },
  '720p':  { low: 0.6, medium: 1.0, high: 1.5 },
  '1080p': { low: 1.2, medium: 2.0, high: 3.5 },
  '1440p': { low: 2.5, medium: 4.5, high: 7.0 },
}

function formatDuration(secs) {
  if (!secs || secs < 1) return 'less than a minute'
  const m = Math.round(secs / 60)
  if (m < 1) return 'less than a minute'
  return `~${m} minute${m !== 1 ? 's' : ''}`
}

export default function ExportModal({ onClose }) {
  const { exportSettings, setExportSettings, timeline, mediaAssets, setIsPlaying } = useEditorStore()
  const [progress, setProgress] = useState(0)
  const [status,   setStatus]   = useState('idle')
  const [log,      setLog]      = useState('')
  const [elapsed,  setElapsed]  = useState(0)
  const ffmpegRef  = useRef(null)
  const abortRef   = useRef(false)
  const startRef   = useRef(null)
  const timerRef   = useRef(null)

  // Stop playback when modal opens
  useEffect(() => {
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const contentDuration = timeline.duration || 0
  const rate = ENCODE_RATE[exportSettings.resolution]?.[exportSettings.videoBitrate] || 2
  const estimatedSecs = contentDuration * rate
  const estimateLabel = formatDuration(estimatedSecs)

  const start = async () => {
    try {
      setStatus('loading')
      setLog('Loading FFmpeg…')
      setProgress(0)
      setElapsed(0)
      abortRef.current  = false
      startRef.current  = Date.now()
      timerRef.current  = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)

      const ffmpeg = new FFmpeg()
      ffmpegRef.current = ffmpeg

      ffmpeg.on('log',      ({ message }) => setLog(message))
      ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)))

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      if (abortRef.current) return

      setStatus('exporting')
      setLog('Preparing media files…')

      // Collect video clips (primary video track)
      const videoTrack = timeline.tracks.find((t) => t.type === 'video')
      const clips = videoTrack
        ? [...videoTrack.clips].sort((a, b) => a.timelineStart - b.timelineStart)
        : []

      if (!clips.length) {
        setStatus('error')
        setLog('No video clips on the Video track. Add clips to the timeline first.')
        clearInterval(timerRef.current)
        return
      }

      const inputFiles = []
      for (let i = 0; i < clips.length; i++) {
        const clip  = clips[i]
        const asset = mediaAssets.find((a) => a.id === clip.assetId)
        if (!asset?.url) continue
        const name = `input_${i}.mp4`
        setLog(`Loading clip ${i + 1}/${clips.length}: ${asset.name}`)
        await ffmpeg.writeFile(name, await fetchFile(asset.url))
        inputFiles.push({ name, clip })
      }

      if (!inputFiles.length) {
        setStatus('error'); setLog('Could not load any video files.')
        clearInterval(timerRef.current)
        return
      }

      // Collect audio-only clips from audio tracks
      const audioTracks  = timeline.tracks.filter((t) => t.type === 'audio' && !t.muted)
      const audioInputs  = []
      for (const track of audioTracks) {
        for (const clip of track.clips) {
          const asset = mediaAssets.find((a) => a.id === clip.assetId)
          if (!asset?.url) continue
          const name = `audio_${audioInputs.length}.mp3`
          setLog(`Loading audio: ${asset.name}`)
          await ffmpeg.writeFile(name, await fetchFile(asset.url))
          audioInputs.push({ name, clip })
        }
      }

      // Build concat list for primary video
      const concatContent = inputFiles.map(({ name, clip }) =>
        `file '${name}'\ninpoint ${clip.trimStart.toFixed(3)}\noutpoint ${clip.trimEnd.toFixed(3)}`
      ).join('\n')
      await ffmpeg.writeFile('concat.txt', concatContent)

      const [w, h] = RESOLUTIONS[exportSettings.resolution] || [1280, 720]
      const vbr    = BITRATES[exportSettings.videoBitrate]   || '4M'
      const ext    = exportSettings.format === 'webm' ? 'webm' : 'mp4'
      const isWebm = exportSettings.format === 'webm'
      const outFile = `output.${ext}`
      // Intermediate video file must use the correct container for the chosen codec
      const videoOnlyFile = isWebm ? 'video_only.webm' : 'video_only.mp4'

      // Step 1: encode primary video track
      setLog('Encoding primary video track…')
      await ffmpeg.exec([
        '-f',        'concat',
        '-safe',     '0',
        '-i',        'concat.txt',
        '-vf',       `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
        '-r',        String(exportSettings.fps),
        '-b:v',      vbr,
        '-an',  // no audio yet — mixed separately
        '-c:v',  isWebm ? 'libvpx-vp9' : 'libx264',
        ...(isWebm ? [] : ['-preset', 'fast']),
        videoOnlyFile,
      ])

      // Step 2: mix audio tracks (if any) with amix
      let finalAudioFile = null
      if (audioInputs.length > 0) {
        setLog('Mixing audio tracks…')
        const audioArgs = []
        audioInputs.forEach(({ name, clip }) => {
          audioArgs.push('-itsoffset', clip.timelineStart.toFixed(3), '-i', name)
        })
        audioArgs.push(
          '-filter_complex', `amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=2`,
          '-b:a', exportSettings.audioBitrate,
          '-c:a', isWebm ? 'libopus' : 'aac',
          'mixed_audio.aac'
        )
        await ffmpeg.exec(audioArgs)
        finalAudioFile = 'mixed_audio.aac'
      }

      // Step 3: also extract audio from primary video track clips (if they have audio)
      // Mux everything together
      setLog('Muxing final output…')
      const muxArgs = ['-i', videoOnlyFile]
      if (finalAudioFile) muxArgs.push('-i', finalAudioFile)
      // Also pull audio from original video inputs
      inputFiles.forEach(({ name }) => muxArgs.push('-i', name))

      const audioSourceCount = (finalAudioFile ? 1 : 0) + inputFiles.length
      if (audioSourceCount > 0) {
        const inputs = Array.from({ length: audioSourceCount }, (_, i) => `[${i + 1}:a]`).join('')
        muxArgs.push(
          '-filter_complex', `${inputs}amix=inputs=${audioSourceCount}:duration=first:dropout_transition=2[aout]`,
          '-map', '0:v',
          '-map', '[aout]',
        )
      } else {
        muxArgs.push('-map', '0:v')
      }

      muxArgs.push(
        '-c:v', 'copy',
        '-b:a', exportSettings.audioBitrate,
        '-c:a', isWebm ? 'libopus' : 'aac',
        ...(isWebm ? [] : ['-movflags', '+faststart']),
        outFile,
      )
      await ffmpeg.exec(muxArgs)

      clearInterval(timerRef.current)

      const data = await ffmpeg.readFile(outFile)
      const blob = new Blob([data.buffer], { type: exportSettings.format === 'webm' ? 'video/webm' : 'video/mp4' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `export.${ext}`
      a.click()
      URL.revokeObjectURL(url)

      setStatus('done')
      setLog('Export complete!')
      setProgress(100)
    } catch (err) {
      clearInterval(timerRef.current)
      console.error(err)
      setStatus('error')
      setLog(err.message || 'Export failed')
    }
  }

  const cancel = () => {
    abortRef.current = true
    clearInterval(timerRef.current)
    // Terminate the FFmpeg worker so in-progress exec() calls are actually stopped
    try { ffmpegRef.current?.terminate() } catch {}
    ffmpegRef.current = null
    setStatus('idle')
    setProgress(0)
    setLog('')
    setElapsed(0)
  }

  const elapsedLabel = elapsed > 0 ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} elapsed` : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg w-full max-w-md mx-4 border animate-slide-up" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-cinzel text-sm tracking-widest" style={{ color: 'var(--gold)' }}>EXPORT</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }}><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {status === 'idle' && (
            <>
              <Row label="Format">
                <SelInput value={exportSettings.format} onChange={(v) => setExportSettings({ format: v })}>
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                </SelInput>
              </Row>
              <Row label="Resolution">
                <SelInput value={exportSettings.resolution} onChange={(v) => setExportSettings({ resolution: v })}>
                  {Object.keys(RESOLUTIONS).map((r) => <option key={r} value={r}>{r}</option>)}
                </SelInput>
              </Row>
              <Row label="FPS">
                <SelInput value={exportSettings.fps} onChange={(v) => setExportSettings({ fps: +v })}>
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </SelInput>
              </Row>
              <Row label="Video Quality">
                <SelInput value={exportSettings.videoBitrate} onChange={(v) => setExportSettings({ videoBitrate: v })}>
                  <option value="low">Low (~1 Mbps)</option>
                  <option value="medium">Medium (~4 Mbps)</option>
                  <option value="high">High (~8 Mbps)</option>
                </SelInput>
              </Row>
              <Row label="Audio Bitrate">
                <SelInput value={exportSettings.audioBitrate} onChange={(v) => setExportSettings({ audioBitrate: v })}>
                  <option value="96k">96k</option>
                  <option value="128k">128k</option>
                  <option value="192k">192k</option>
                  <option value="320k">320k</option>
                </SelInput>
              </Row>

              {/* Estimated time */}
              {contentDuration > 0 && (
                <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Clock size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Estimated encode time: <strong style={{ color: 'var(--text)' }}>{estimateLabel}</strong>
                    {' '}for {Math.round(contentDuration)}s of content at {exportSettings.resolution}
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <AlertCircle size={14} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Export runs entirely in your browser using FFmpeg.wasm. No files are uploaded.
                  The tab may become unresponsive during encoding — this is normal.
                </p>
              </div>
            </>
          )}

          {(status === 'loading' || status === 'exporting') && (
            <div className="space-y-3">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
              </div>
              <div className="flex justify-between">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{progress}%</p>
                {elapsedLabel && <p className="text-xs" style={{ color: 'var(--muted)' }}>{elapsedLabel}</p>}
              </div>
              <p className="text-xs font-mono break-all" style={{ color: 'var(--muted)', fontSize: 10 }}>{log}</p>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Export complete!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Your file has been downloaded. Total time: {elapsedLabel.replace(' elapsed', '')}.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 rounded" style={{ background: 'rgba(201,76,76,0.1)', border: '1px solid var(--danger)' }}>
              <p className="text-xs" style={{ color: 'var(--danger)' }}>{log}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex gap-2 justify-end" style={{ borderColor: 'var(--border)' }}>
          {status === 'idle' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-xs rounded border hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
              <button onClick={start} className="flex items-center gap-2 px-4 py-2 text-xs rounded font-semibold hover:opacity-80 transition-opacity" style={{ background: 'var(--accent)', color: 'white' }}>
                <Download size={13} /> Export
              </button>
            </>
          )}
          {(status === 'loading' || status === 'exporting') && (
            <button onClick={cancel} className="px-4 py-2 text-xs rounded border hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
          )}
          {(status === 'done' || status === 'error') && (
            <button onClick={() => { setStatus('idle'); setProgress(0); setLog(''); setElapsed(0) }} className="px-4 py-2 text-xs rounded border hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Back</button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      {children}
    </div>
  )
}

function SelInput({ value, onChange, children }) {
  return (
    <select
      className="flex-1 text-xs px-2 py-1.5 rounded outline-none"
      style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  )
}
