import React, { useRef, useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, Volume2, VolumeX, Trash2, ZoomIn, ZoomOut, GripVertical } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
// useEditorStore is also used directly (getState) for one-shot history saves during drag
import { formatTime } from '../../utils/mediaUtils'

const TRACK_HEIGHT = 40
const HEADER_WIDTH = 148
const RULER_HEIGHT = 24

const TRACK_COLORS = {
  video:   'rgba(124, 92, 191, 0.75)',
  overlay: 'rgba(201, 168, 76, 0.75)',
  text:    'rgba(76, 175, 201, 0.75)',
  audio:   'rgba(76, 175, 125, 0.75)',
}

export default function TimelinePanel() {
  const {
    timeline, setTimelineZoom, setTimelineScroll,
    currentTime, setCurrentTime,
    addTrack, removeTrack, setTrackProp, moveTrack, renameTrack,
    addClipToTrack, updateClip, removeClip, splitClip,
    selectedClips, selectClip, clearSelection,
    mediaAssets,
  } = useEditorStore()

  const { tracks, zoom, scrollLeft, duration } = timeline
  const scrollRef       = useRef()
  const headerScrollRef = useRef()
  const [draggingClip,  setDraggingClip]  = useState(null)
  const [resizingClip,  setResizingClip]  = useState(null)
  const [vertScroll,    setVertScroll]    = useState(0)
  const [dragTrack,     setDragTrack]     = useState(null) // { index, overIndex }
  const [renamingTrack, setRenamingTrack] = useState(null)
  const [renameVal,     setRenameVal]     = useState('')

  // Sync vertical scroll between header column and track area
  const onTrackAreaScroll = (e) => {
    const el = e.currentTarget
    setVertScroll(el.scrollTop)
    if (scrollRef.current) setTimelineScroll(scrollRef.current.scrollLeft)
  }

  useEffect(() => {
    if (headerScrollRef.current) headerScrollRef.current.scrollTop = vertScroll
  }, [vertScroll])

  // Zoom via ctrl+wheel
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setTimelineZoom(zoom * (e.deltaY < 0 ? 1.15 : 0.87))
    }
  }

  // Ruler click (seek)
  const onRulerClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0)
    setCurrentTime(Math.max(0, x / zoom))
  }

  // Drop from media panel
  const onDrop = (e, trackId) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/goblin-asset')
    if (!data) return
    const { assetId } = JSON.parse(data)
    const asset = mediaAssets.find((a) => a.id === assetId)
    if (!asset) return

    const track = tracks.find((t) => t.id === trackId)
    if (!track || track.locked) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x    = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0)
    const pos  = Math.max(0, x / zoom)

    addClipToTrack(trackId, {
      assetId:       asset.id,
      url:           asset.url,
      type:          asset.type,
      name:          asset.name,
      timelineStart: pos,
      trimStart:     0,
      trimEnd:       asset.duration || 5,
      thumbnail:     asset.thumbnail,
      transform:     { x: 0, y: 0, scale: track.type === 'overlay' ? 0.4 : 1, opacity: 1, rotation: 0, flipH: false, flipV: false },
    })
  }

  // Clip drag
  const startClipDrag = (e, trackId, clipId) => {
    e.stopPropagation()
    const track = tracks.find((t) => t.id === trackId)
    const clip  = track?.clips.find((c) => c.id === clipId)
    if (!clip || track.locked) return
    // Save history ONCE here, not on every mousemove
    useEditorStore.getState()._saveHistory()
    setDraggingClip({ trackId, clipId, startX: e.clientX, startPos: clip.timelineStart })
  }

  useEffect(() => {
    if (!draggingClip) return
    const move = (e) => {
      const dx  = e.clientX - draggingClip.startX
      const pos = Math.max(0, draggingClip.startPos + dx / zoom)
      // skipHistory=true: history already saved at drag start
      updateClip(draggingClip.trackId, draggingClip.clipId, { timelineStart: pos }, true)
    }
    const up = () => setDraggingClip(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [draggingClip, zoom])

  // Clip resize
  const startResize = (e, trackId, clipId, edge) => {
    e.stopPropagation()
    const track = tracks.find((t) => t.id === trackId)
    const clip  = track?.clips.find((c) => c.id === clipId)
    if (!clip) return
    // Save history ONCE here
    useEditorStore.getState()._saveHistory()
    setResizingClip({ trackId, clipId, edge, startX: e.clientX, trimStart: clip.trimStart, trimEnd: clip.trimEnd, timelineStart: clip.timelineStart })
  }

  useEffect(() => {
    if (!resizingClip) return
    const move = (e) => {
      const dx = (e.clientX - resizingClip.startX) / zoom
      if (resizingClip.edge === 'left') {
        const newTrimStart = Math.max(0, resizingClip.trimStart + dx)
        const newStart     = Math.max(0, resizingClip.timelineStart + dx)
        updateClip(resizingClip.trackId, resizingClip.clipId, { trimStart: newTrimStart, timelineStart: newStart }, true)
      } else {
        const newTrimEnd = Math.max(resizingClip.trimStart + 0.1, resizingClip.trimEnd + dx)
        updateClip(resizingClip.trackId, resizingClip.clipId, { trimEnd: newTrimEnd }, true)
      }
    }
    const up = () => setResizingClip(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [resizingClip, zoom])

  // Track drag-to-reorder
  const onTrackDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/goblin-track', String(index))
    setDragTrack({ from: index, over: index })
  }
  const onTrackDragOver = (e, index) => {
    e.preventDefault()
    setDragTrack((prev) => prev ? { ...prev, over: index } : null)
  }
  const onTrackDrop = (e, toIndex) => {
    e.preventDefault()
    if (dragTrack && dragTrack.from !== toIndex) moveTrack(dragTrack.from, toIndex)
    setDragTrack(null)
  }
  const onTrackDragEnd = () => setDragTrack(null)

  // Ruler ticks
  const totalWidth   = Math.max(duration * zoom + 600, 2000)
  const tickInterval = zoom < 30 ? 10 : zoom < 80 ? 5 : zoom < 200 ? 1 : 0.5
  const ticks = []
  const visStart = scrollLeft / zoom
  const visEnd   = visStart + 4000 / zoom
  for (let t = Math.floor(visStart / tickInterval) * tickInterval; t <= visEnd + tickInterval; t += tickInterval) {
    const x = t * zoom
    ticks.push({ t: Math.round(t * 1000) / 1000, x, major: Number.isInteger(Math.round(t * 10) / 10) })
  }

  const cursorX      = currentTime * zoom
  const totalTracksH = tracks.length * TRACK_HEIGHT

  return (
    <div className="flex flex-col h-full select-none" style={{ background: 'var(--panel)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', height: 32 }}>
        <span className="font-cinzel text-xs tracking-widest" style={{ color: 'var(--gold)' }}>TIMELINE</span>
        <div className="flex-1" />
        <button onClick={() => setTimelineZoom(zoom * 0.8)} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }} title="Zoom out"><ZoomOut size={13} /></button>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{Math.round(zoom)}px/s</span>
        <button onClick={() => setTimelineZoom(zoom * 1.25)} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }} title="Zoom in"><ZoomIn size={13} /></button>
        <div className="w-px mx-1" style={{ height: 16, background: 'var(--border)' }} />
        {[
          { type: 'video',   label: '+ Video' },
          { type: 'audio',   label: '+ Audio' },
          { type: 'text',    label: '+ Text' },
          { type: 'overlay', label: '+ Overlay' },
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => addTrack(type)}
            className="px-2 py-0.5 text-xs rounded hover:bg-white/5 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div className="flex-shrink-0 flex flex-col border-r" style={{ width: HEADER_WIDTH, borderColor: 'var(--border)' }}>
          <div style={{ height: RULER_HEIGHT, background: 'var(--surface)', borderBottom: `1px solid var(--border)`, flexShrink: 0 }} />
          <div ref={headerScrollRef} className="flex-1 overflow-hidden">
            <div style={{ height: totalTracksH }}>
              {tracks.map((track, index) => (
                <TrackHeader
                  key={track.id}
                  track={track}
                  index={index}
                  isDragOver={dragTrack?.over === index && dragTrack?.from !== index}
                  setTrackProp={setTrackProp}
                  removeTrack={removeTrack}
                  renameTrack={renameTrack}
                  renamingTrack={renamingTrack}
                  setRenamingTrack={setRenamingTrack}
                  renameVal={renameVal}
                  setRenameVal={setRenameVal}
                  onDragStart={onTrackDragStart}
                  onDragOver={onTrackDragOver}
                  onDrop={onTrackDrop}
                  onDragEnd={onTrackDragEnd}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable track area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto relative"
          onWheel={onWheel}
          onScroll={onTrackAreaScroll}
          onClick={() => clearSelection()}
          style={{ cursor: draggingClip ? 'grabbing' : 'default' }}
        >
          <div style={{ width: totalWidth, height: Math.max(totalTracksH + RULER_HEIGHT, '100%'), position: 'relative' }}>

            {/* Ruler */}
            <div
              className="sticky top-0 z-20"
              style={{ height: RULER_HEIGHT, background: 'var(--surface)', borderBottom: `1px solid var(--border)`, cursor: 'pointer' }}
              onClick={onRulerClick}
            >
              <svg width={totalWidth} height={RULER_HEIGHT}>
                {ticks.map(({ t, x, major }) => (
                  <g key={t}>
                    <line x1={x} y1={major ? 4 : 14} x2={x} y2={RULER_HEIGHT} stroke="var(--border)" strokeWidth={major ? 1 : 0.5} />
                    {major && <text x={x + 3} y={16} fill="var(--muted)" fontSize={10} fontFamily="Inter">{formatTime(t)}</text>}
                  </g>
                ))}
              </svg>
              <div style={{ position: 'absolute', top: 0, left: cursorX, width: 1, height: RULER_HEIGHT, background: 'var(--gold)', pointerEvents: 'none' }}>
                <div style={{ width: 9, height: 9, background: 'var(--gold)', borderRadius: '50% 50% 0 50%', transform: 'translateX(-4px) rotate(-45deg)', position: 'absolute', top: 0 }} />
              </div>
            </div>

            {/* Tracks */}
            {tracks.map((track, index) => (
              <div
                key={track.id}
                style={{
                  height: TRACK_HEIGHT, position: 'relative',
                  borderBottom: `1px solid var(--border)`,
                  background: dragTrack?.over === index && dragTrack?.from !== index
                    ? 'rgba(124,92,191,0.08)' : 'var(--panel)',
                  transition: 'background 0.1s',
                }}
                onDragOver={(e) => { e.preventDefault(); onTrackDragOver(e, index) }}
                onDrop={(e) => {
                  // check if it's a track drag or asset drop
                  const trackData = e.dataTransfer.getData('application/goblin-track')
                  if (trackData !== '') { onTrackDrop(e, index); return }
                  onDrop(e, track.id)
                }}
              >
                {track.clips.map((clip) => {
                  const clipW      = (clip.trimEnd - clip.trimStart) * zoom
                  const clipX      = clip.timelineStart * zoom
                  const isSelected = selectedClips.some((s) => s.clipId === clip.id)
                  return (
                    <div
                      key={clip.id}
                      style={{
                        position:    'absolute',
                        left:        clipX,
                        top:         3,
                        width:       Math.max(8, clipW),
                        height:      TRACK_HEIGHT - 6,
                        background:  TRACK_COLORS[track.type] || 'rgba(100,100,100,0.7)',
                        borderRadius: 4,
                        border:      `1.5px solid ${isSelected ? 'white' : 'transparent'}`,
                        cursor:      track.locked ? 'not-allowed' : 'grab',
                        overflow:    'hidden',
                        display:     'flex',
                        alignItems:  'center',
                      }}
                      onClick={(e) => { e.stopPropagation(); selectClip(track.id, clip.id, e.shiftKey) }}
                      onMouseDown={(e) => startClipDrag(e, track.id, clip.id)}
                    >
                      {clip.thumbnail && (
                        <img src={clip.thumbnail} style={{ height: '100%', width: 'auto', opacity: 0.4, flexShrink: 0 }} alt="" />
                      )}
                      <span style={{ fontSize: 10, color: 'white', padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 3px rgba(0,0,0,0.8)', flexShrink: 1 }}>
                        {clip.name || clip.text || 'Clip'}
                      </span>

                      <div
                        style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', cursor: 'w-resize', background: 'rgba(255,255,255,0.2)', borderRadius: '4px 0 0 4px' }}
                        onMouseDown={(e) => startResize(e, track.id, clip.id, 'left')}
                      />
                      <div
                        style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'e-resize', background: 'rgba(255,255,255,0.2)', borderRadius: '0 4px 4px 0' }}
                        onMouseDown={(e) => startResize(e, track.id, clip.id, 'right')}
                      />
                    </div>
                  )
                })}

                <div style={{ position: 'absolute', top: 0, left: cursorX, width: 1, height: '100%', background: 'rgba(201,168,76,0.5)', pointerEvents: 'none', zIndex: 10 }} />
              </div>
            ))}

            {/* Full-height playhead */}
            <div
              style={{
                position: 'absolute', top: RULER_HEIGHT, left: cursorX,
                width: 1, height: totalTracksH,
                background: 'var(--gold)',
                pointerEvents: 'none',
                zIndex: 30,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackHeader({
  track, index, isDragOver,
  setTrackProp, removeTrack, renameTrack,
  renamingTrack, setRenamingTrack, renameVal, setRenameVal,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const commitRename = () => {
    if (renamingTrack === track.id) {
      renameTrack(track.id, renameVal.trim() || track.label)
      setRenamingTrack(null)
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className="flex items-center gap-1 px-1 border-b"
      style={{
        height: TRACK_HEIGHT,
        borderColor: 'var(--border)',
        borderLeft: `3px solid ${TRACK_COLORS[track.type]}`,
        background: isDragOver ? 'rgba(124,92,191,0.12)' : 'var(--panel)',
        cursor: 'grab',
        transition: 'background 0.1s',
      }}
    >
      {/* Grip handle */}
      <GripVertical size={12} style={{ color: 'var(--border)', flexShrink: 0 }} />

      {/* Label / rename */}
      {renamingTrack === track.id ? (
        <input
          autoFocus
          className="text-xs flex-1 min-w-0 bg-transparent outline-none border-b"
          style={{ borderColor: 'var(--accent)', color: 'var(--text)', fontSize: 11 }}
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingTrack(null) }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="text-xs flex-1 truncate cursor-text"
          style={{ color: 'var(--text)', fontSize: 11 }}
          title="Double-click to rename"
          onDoubleClick={() => { setRenamingTrack(track.id); setRenameVal(track.label) }}
        >
          {track.label}
        </span>
      )}

      <button
        onClick={() => setTrackProp(track.id, 'muted', !track.muted)}
        className="p-0.5 rounded hover:bg-white/5"
        style={{ color: track.muted ? 'var(--danger)' : 'var(--muted)' }}
        title={track.muted ? 'Unmute' : 'Mute'}
      >
        {track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
      </button>
      <button
        onClick={() => setTrackProp(track.id, 'hidden', !track.hidden)}
        className="p-0.5 rounded hover:bg-white/5"
        style={{ color: track.hidden ? 'var(--muted)' : 'var(--text)' }}
        title={track.hidden ? 'Show' : 'Hide'}
      >
        {track.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
      <button
        onClick={() => setTrackProp(track.id, 'locked', !track.locked)}
        className="p-0.5 rounded hover:bg-white/5"
        style={{ color: track.locked ? 'var(--gold)' : 'var(--muted)' }}
        title={track.locked ? 'Unlock' : 'Lock'}
      >
        <Lock size={11} />
      </button>
      <button
        onClick={() => removeTrack(track.id)}
        className="p-0.5 rounded hover:bg-white/5"
        style={{ color: 'var(--muted)' }}
        title="Remove track"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}
