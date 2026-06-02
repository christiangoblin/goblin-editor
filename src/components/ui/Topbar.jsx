import React, { useState } from 'react'
import { Scissors, Undo2, Redo2, Download, Keyboard, Save, HelpCircle } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { saveProject } from '../../utils/db'

export default function Topbar() {
  const {
    projectName, setProjectName,
    undo, redo,
    _history, _future,
    setActiveModal,
    timeline, mediaAssets, exportSettings,
  } = useEditorStore()

  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(projectName)

  const handleSave = async () => {
    await saveProject({ id: 'default-project', name: projectName, timeline, mediaAssets, exportSettings })
  }

  const canUndo = _history.length > 0
  const canRedo = _future.length > 0

  return (
    <header
      className="flex items-center justify-between px-4 flex-shrink-0 border-b"
      style={{ height: 48, background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Scissors size={18} style={{ color: 'var(--gold)' }} />
        <span className="font-cinzel text-sm font-semibold tracking-widest" style={{ color: 'var(--gold)' }}>
          GOBLIN EDITOR
        </span>
      </div>

      {/* Project name */}
      <div className="flex-1 flex justify-center">
        {editing ? (
          <input
            autoFocus
            className="text-sm text-center bg-transparent outline-none border-b"
            style={{ borderColor: 'var(--accent)', color: 'var(--text)', width: 260 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { setProjectName(draft); setEditing(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setProjectName(draft); setEditing(false) } }}
          />
        ) : (
          <button
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }}
            onClick={() => { setDraft(projectName); setEditing(true) }}
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <TopbarBtn icon={<Undo2 size={15} />} label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
        <TopbarBtn icon={<Redo2 size={15} />} label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo} />

        <div className="w-px mx-2" style={{ height: 20, background: 'var(--border)' }} />

        <TopbarBtn icon={<Save size={15} />}       label="Save"      onClick={handleSave} />
        <TopbarBtn icon={<HelpCircle size={15} />} label="How to use Goblin Editor" onClick={() => setActiveModal('help')} />
        <TopbarBtn icon={<Keyboard size={15} />}   label="Shortcuts" onClick={() => setActiveModal('shortcuts')} />

        <button
          onClick={() => setActiveModal('export')}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold ml-2 transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Download size={13} />
          Export
        </button>
      </div>
    </header>
  )
}

function TopbarBtn({ icon, label, onClick, disabled }) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="p-2 rounded transition-colors hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ color: 'var(--muted)' }}
    >
      {icon}
    </button>
  )
}
