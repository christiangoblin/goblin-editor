import { create } from 'zustand'
import { nanoid } from '../utils/nanoid'

const MAX_HISTORY = 100

const initialTimeline = {
  tracks: [
    { id: 'track-v1', type: 'video',   label: 'Video 1',   clips: [], muted: false, locked: false, hidden: false },
    { id: 'track-v2', type: 'overlay', label: 'Overlay 1', clips: [], muted: false, locked: false, hidden: false },
    { id: 'track-t1', type: 'text',    label: 'Text 1',    clips: [], muted: false, locked: false, hidden: false },
    { id: 'track-a1', type: 'audio',   label: 'Audio 1',   clips: [], muted: false, locked: false, hidden: false },
    { id: 'track-a2', type: 'audio',   label: 'Audio 2',   clips: [], muted: false, locked: false, hidden: false },
  ],
  duration: 0,
  zoom: 60,
  scrollLeft: 0,
}

export const useEditorStore = create((set, get) => ({
  // ── Project ──────────────────────────────────────────────
  projectName: 'Untitled Project',
  setProjectName: (name) => set({ projectName: name }),

  // ── Media Library ─────────────────────────────────────────
  mediaAssets: [],

  addMediaAsset: (asset) => set((s) => ({
    mediaAssets: [...s.mediaAssets, { id: nanoid(), ...asset }],
  })),

  removeMediaAsset: (id) => set((s) => ({
    mediaAssets: s.mediaAssets.filter((a) => a.id !== id),
  })),

  renameMediaAsset: (id, name) => set((s) => ({
    mediaAssets: s.mediaAssets.map((a) => a.id === id ? { ...a, name } : a),
  })),

  // ── Performance warning ────────────────────────────────────
  systemTier: null,
  setSystemTier: (tier) => set({ systemTier: tier }),

  perfWarning: null,
  setPerfWarning: (msg) => set({ perfWarning: msg }),
  dismissPerfWarning: () => set({ perfWarning: null }),

  // ── Timeline ──────────────────────────────────────────────
  timeline: initialTimeline,

  setTimelineZoom: (zoom) => set((s) => ({
    timeline: { ...s.timeline, zoom: Math.max(10, Math.min(500, zoom)) },
  })),

  setTimelineScroll: (scrollLeft) => set((s) => ({
    timeline: { ...s.timeline, scrollLeft },
  })),

  addClipToTrack: (trackId, clip) => {
    get()._saveHistory()
    set((s) => ({
      timeline: {
        ...s.timeline,
        tracks: s.timeline.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: [...t.clips, { id: nanoid(), ...clip }] }
            : t
        ),
      },
    }))
    get()._recalcDuration()
    get()._checkPerfWarning()
  },

  removeClip: (trackId, clipId) => {
    get()._saveHistory()
    set((s) => ({
      timeline: {
        ...s.timeline,
        tracks: s.timeline.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
            : t
        ),
      },
    }))
    get()._recalcDuration()
  },

  updateClip: (trackId, clipId, updates, skipHistory = false) => {
    if (!skipHistory) get()._saveHistory()
    set((s) => ({
      timeline: {
        ...s.timeline,
        tracks: s.timeline.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, ...updates } : c) }
            : t
        ),
      },
    }))
    get()._recalcDuration()
  },

  splitClip: (trackId, clipId, splitTime) => {
    get()._saveHistory()
    set((s) => {
      const track = s.timeline.tracks.find((t) => t.id === trackId)
      const clip  = track?.clips.find((c) => c.id === clipId)
      if (!clip) return s
      const relTime = splitTime - clip.timelineStart
      if (relTime <= 0 || relTime >= (clip.trimEnd - clip.trimStart)) return s
      const left  = { ...clip, id: nanoid(), trimEnd: clip.trimStart + relTime }
      const right = { ...clip, id: nanoid(), trimStart: clip.trimStart + relTime, timelineStart: splitTime }
      return {
        timeline: {
          ...s.timeline,
          tracks: s.timeline.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: t.clips.flatMap((c) => c.id === clipId ? [left, right] : [c]) }
              : t
          ),
        },
      }
    })
    get()._recalcDuration()
  },

  setTrackProp: (trackId, prop, value) => set((s) => ({
    timeline: {
      ...s.timeline,
      tracks: s.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, [prop]: value } : t
      ),
    },
  })),

  // ── Track reordering ──────────────────────────────────────
  moveTrack: (fromIndex, toIndex) => {
    get()._saveHistory()
    set((s) => {
      const tracks = [...s.timeline.tracks]
      const [moved] = tracks.splice(fromIndex, 1)
      tracks.splice(toIndex, 0, moved)
      return { timeline: { ...s.timeline, tracks } }
    })
  },

  addTrack: (type) => set((s) => {
    const count = s.timeline.tracks.filter((t) => t.type === type).length + 1
    const labels = { video: 'Video', overlay: 'Overlay', text: 'Text', audio: 'Audio' }
    return {
      timeline: {
        ...s.timeline,
        tracks: [
          ...s.timeline.tracks,
          {
            id: nanoid(),
            type,
            label: `${labels[type] || type} ${count}`,
            clips: [],
            muted: false,
            locked: false,
            hidden: false,
          },
        ],
      },
    }
  }),

  removeTrack: (trackId) => set((s) => ({
    timeline: {
      ...s.timeline,
      tracks: s.timeline.tracks.filter((t) => t.id !== trackId),
    },
  })),

  renameTrack: (trackId, label) => set((s) => ({
    timeline: {
      ...s.timeline,
      tracks: s.timeline.tracks.map((t) => t.id === trackId ? { ...t, label } : t),
    },
  })),

  _recalcDuration: () => {
    const s = get()
    let max = 0
    s.timeline.tracks.forEach((t) =>
      t.clips.forEach((c) => {
        const end = c.timelineStart + (c.trimEnd - c.trimStart)
        if (end > max) max = end
      })
    )
    set((s2) => ({ timeline: { ...s2.timeline, duration: max } }))
  },

  _checkPerfWarning: () => {
    const { timeline, mediaAssets, systemTier } = get()
    const totalClips = timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0)
    const videoAssets = mediaAssets.filter((a) => a.type === 'video')
    const totalVideoMB = videoAssets.reduce((sum, a) => sum + (a.size || 0), 0) / (1024 * 1024)

    let warning = null
    if (systemTier === 'low') {
      if (totalClips > 6)          warning = 'Your system is low-performance — more than 6 clips may cause slowdowns or crashes.'
      else if (totalVideoMB > 200) warning = 'Over 200 MB of video loaded on a low-performance system. Expect slowdowns during preview and export.'
    } else if (systemTier === 'medium') {
      if (totalClips > 20)         warning = 'You have many clips on a moderate system. Consider keeping projects under 20 clips for best performance.'
      else if (totalVideoMB > 800) warning = 'Over 800 MB of video loaded. Large projects may slow down preview and export on your system.'
    } else {
      if (totalClips > 50)         warning = 'Very large project detected. Performance may degrade with 50+ clips even on high-end hardware.'
    }

    if (warning) get().setPerfWarning(warning)
  },

  // ── Playback ──────────────────────────────────────────────
  currentTime:    0,
  isPlaying:      false,
  playbackRate:   1,
  previewQuality: '720p',

  setCurrentTime:    (t) => set({ currentTime: t }),
  setIsPlaying:      (v) => set({ isPlaying: v }),
  setPlaybackRate:   (r) => set({ playbackRate: r }),
  setPreviewQuality: (q) => set({ previewQuality: q }),

  // ── Selection ─────────────────────────────────────────────
  selectedClips: [],
  selectedAssetId: null,

  selectClip: (trackId, clipId, multi = false) => set((s) => {
    const already = s.selectedClips.some((sc) => sc.clipId === clipId)
    if (multi) {
      return {
        selectedClips: already
          ? s.selectedClips.filter((sc) => sc.clipId !== clipId)
          : [...s.selectedClips, { trackId, clipId }],
      }
    }
    return { selectedClips: already && s.selectedClips.length === 1 ? [] : [{ trackId, clipId }] }
  }),

  clearSelection: () => set({ selectedClips: [] }),
  selectAsset:    (id) => set({ selectedAssetId: id }),

  // ── Active panel / modal ───────────────────────────────────
  activeModal: null,
  setActiveModal: (m) => set({ activeModal: m }),

  // ── Undo / Redo ───────────────────────────────────────────
  _history: [],
  _future:  [],

  _saveHistory: () => set((s) => ({
    _history: [...s._history.slice(-MAX_HISTORY), { timeline: s.timeline }],
    _future:  [],
  })),

  undo: () => set((s) => {
    if (!s._history.length) return s
    const prev = s._history[s._history.length - 1]
    const rest = s._history.slice(0, -1)
    return { ...prev, _history: rest, _future: [{ timeline: s.timeline }, ...s._future] }
  }),

  redo: () => set((s) => {
    if (!s._future.length) return s
    const next = s._future[0]
    const rest = s._future.slice(1)
    return { ...next, _history: [...s._history, { timeline: s.timeline }], _future: rest }
  }),

  canUndo: () => get()._history.length > 0,
  canRedo: () => get()._future.length > 0,

  // ── Export settings ───────────────────────────────────────
  exportSettings: {
    format:       'mp4',
    resolution:   '1080p',
    fps:          30,
    videoBitrate: 'high',
    audioBitrate: '192k',
  },
  setExportSettings: (updates) => set((s) => ({
    exportSettings: { ...s.exportSettings, ...updates },
  })),

  // ── App panels ────────────────────────────────────────────
  leftPanelWidth:  280,
  rightPanelWidth: 280,
  timelineHeight:  240,

  setLeftPanelWidth:  (w) => set({ leftPanelWidth:  Math.max(180, Math.min(500, w)) }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: Math.max(180, Math.min(500, w)) }),
  setTimelineHeight:  (h) => set({ timelineHeight:  Math.max(140, Math.min(500, h)) }),

  // ── Clipboard ─────────────────────────────────────────────
  clipboard: null,

  copySelectedClips: () => {
    const { selectedClips, timeline } = get()
    const clips = selectedClips.map(({ trackId, clipId }) => {
      const track = timeline.tracks.find((t) => t.id === trackId)
      const clip  = track?.clips.find((c) => c.id === clipId)
      return clip ? { ...clip, _trackId: trackId } : null
    }).filter(Boolean)
    if (clips.length) set({ clipboard: clips })
  },

  pasteClips: () => {
    const { clipboard, currentTime } = get()
    if (!clipboard?.length) return
    get()._saveHistory()
    // Find the earliest clip start to offset pasting relative to playhead
    const minStart = Math.min(...clipboard.map((c) => c.timelineStart))
    set((s) => {
      const tracks = s.timeline.tracks.map((t) => {
        const toPaste = clipboard.filter((c) => c._trackId === t.id)
        if (!toPaste.length) return t
        const newClips = toPaste.map((c) => ({
          ...c,
          id: nanoid(),
          timelineStart: currentTime + (c.timelineStart - minStart),
        }))
        return { ...t, clips: [...t.clips, ...newClips] }
      })
      return { timeline: { ...s.timeline, tracks } }
    })
    get()._recalcDuration()
  },
}))
