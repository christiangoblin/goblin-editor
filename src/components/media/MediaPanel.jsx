import React, { useRef, useState, useCallback } from 'react'
import { Upload, Search, Film, Music, Image, Trash2, Edit3, Plus, AlertCircle } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { extractVideoMeta, extractAudioMeta, extractImageMeta, getAssetType, isSupported, formatTime } from '../../utils/mediaUtils'

const TYPE_ICON  = { video: Film, audio: Music, image: Image }
const TYPE_COLOR = { video: 'var(--accent)', audio: 'var(--success)', image: 'var(--gold)' }

export default function MediaPanel() {
  const { mediaAssets, addMediaAsset, removeMediaAsset, renameMediaAsset, selectAsset, selectedAssetId, _checkPerfWarning } = useEditorStore()
  const [search,     setSearch]     = useState('')
  const [sortBy,     setSortBy]     = useState('name')
  const [dragging,   setDragging]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [errors,     setErrors]     = useState([])   // { name, reason }
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal,  setRenameVal]  = useState('')
  const fileInputRef = useRef()

  const handleFiles = useCallback(async (files) => {
    setLoading(true)
    setErrors([])
    const newErrors = []

    for (const file of files) {
      if (!isSupported(file)) {
        newErrors.push({ name: file.name, reason: 'Unsupported type' })
        continue
      }

      const type = getAssetType(file)
      let meta   = {}

      try {
        if      (type === 'video') meta = await extractVideoMeta(file)
        else if (type === 'audio') meta = await extractAudioMeta(file)
        else if (type === 'image') meta = await extractImageMeta(file)
      } catch (e) {
        console.warn('Meta extraction failed for', file.name, e)
        // non-fatal — continue with no thumbnail/duration
      }

      const blobUrl = URL.createObjectURL(file)
      addMediaAsset({
        name:      file.name,
        type,
        url:       blobUrl,
        size:      file.size,
        mimeType:  file.type,
        thumbnail: meta.thumbnail  || null,
        duration:  meta.duration   || null,
        width:     meta.width      || null,
        height:    meta.height     || null,
      })
    }

    if (newErrors.length) setErrors(newErrors)
    _checkPerfWarning()
    setLoading(false)
  }, [addMediaAsset])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles([...e.dataTransfer.files])
  }

  const filtered = mediaAssets
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      if (sortBy === 'type')     return a.type.localeCompare(b.type)
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0)
      return 0
    })

  const startRename  = (asset) => { setRenamingId(asset.id); setRenameVal(asset.name) }
  const commitRename = () => { if (renamingId) { renameMediaAsset(renamingId, renameVal); setRenamingId(null) } }

  const onDragStart = (e, asset) => {
    e.dataTransfer.setData('application/goblin-asset', JSON.stringify({ assetId: asset.id, type: asset.type }))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <span className="font-cinzel text-xs tracking-widest" style={{ color: 'var(--gold)' }}>MEDIA</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1 rounded hover:bg-white/5"
          style={{ color: 'var(--muted)' }}
          title="Import files"
        >
          <Plus size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={(e) => { handleFiles([...e.target.files]); e.target.value = '' }}
        />
      </div>

      {/* Search + Sort */}
      <div className="px-3 py-2 space-y-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'var(--surface)' }}>
          <Search size={12} style={{ color: 'var(--muted)' }} />
          <input
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--text)' }}
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-full text-xs px-2 py-1 rounded outline-none"
          style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort: Name</option>
          <option value="type">Sort: Type</option>
          <option value="duration">Sort: Duration</option>
        </select>
      </div>

      {/* Error notices */}
      {errors.length > 0 && (
        <div className="mx-2 mt-2 p-2 rounded text-xs flex gap-2" style={{ background: 'rgba(201,76,76,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            {errors.map((er) => <div key={er.name}>{er.name}: {er.reason}</div>)}
          </div>
        </div>
      )}

      {/* Drop zone / asset list */}
      <div
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
        onDrop={onDrop}
        style={{ background: dragging ? 'rgba(124,92,191,0.08)' : undefined, outline: dragging ? '2px dashed var(--accent)' : undefined, outlineOffset: -2 }}
      >
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} style={{ color: 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {loading ? 'Importing…' : 'Drop files here or click to import'}
            </p>
            <p className="text-xs" style={{ color: 'var(--border)' }}>MP4 · MOV · WebM · MP3 · WAV · PNG · JPG</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {loading && (
              <div className="text-xs px-2 py-1 animate-pulse" style={{ color: 'var(--muted)' }}>Importing…</div>
            )}
            {filtered.map((asset) => {
              const Icon     = TYPE_ICON[asset.type] || Film
              const selected = selectedAssetId === asset.id
              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, asset)}
                  onClick={() => selectAsset(asset.id)}
                  className="group flex items-center gap-2 p-1.5 rounded cursor-grab active:cursor-grabbing transition-colors"
                  style={{
                    background: selected ? 'rgba(124,92,191,0.18)' : 'transparent',
                    border:     `1px solid ${selected ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-7 rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: 'var(--surface)' }}>
                    {asset.thumbnail
                      ? <img src={asset.thumbnail} className="w-full h-full object-cover" alt="" />
                      : <Icon size={14} style={{ color: TYPE_COLOR[asset.type] }} />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {renamingId === asset.id ? (
                      <input
                        autoFocus
                        className="text-xs w-full bg-transparent outline-none border-b"
                        style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-xs truncate" style={{ color: 'var(--text)' }}>{asset.name}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Icon size={9} style={{ color: TYPE_COLOR[asset.type] }} />
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                        {asset.type}
                        {asset.duration ? ` · ${formatTime(asset.duration)}` : ''}
                        {asset.width    ? ` · ${asset.width}×${asset.height}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions — fixed: parent now has `group` class */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1 rounded hover:bg-white/10"
                      style={{ color: 'var(--muted)' }}
                      onClick={(e) => { e.stopPropagation(); startRename(asset) }}
                      title="Rename"
                    ><Edit3 size={11} /></button>
                    <button
                      className="p-1 rounded hover:bg-white/10"
                      style={{ color: 'var(--danger)' }}
                      onClick={(e) => { e.stopPropagation(); removeMediaAsset(asset.id) }}
                      title="Remove"
                    ><Trash2 size={11} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>
          {mediaAssets.length} asset{mediaAssets.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
