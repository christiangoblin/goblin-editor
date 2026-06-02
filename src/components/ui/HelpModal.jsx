import React, { useState } from 'react'
import { X, Film, Layers, Music, Type, Sliders, Download, Keyboard, BookOpen, LayoutTemplate } from 'lucide-react'

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: BookOpen },
  { id: 'media',      label: 'Media',      icon: Film },
  { id: 'timeline',   label: 'Timeline',   icon: LayoutTemplate },
  { id: 'inspector',  label: 'Inspector',  icon: Sliders },
  { id: 'export',     label: 'Export',     icon: Download },
  { id: 'shortcuts',  label: 'Shortcuts',  icon: Keyboard },
]

const Section = ({ title, children }) => (
  <div className="mb-5">
    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)', fontSize: 10 }}>{title}</p>
    <div className="space-y-1.5">{children}</div>
  </div>
)

const Item = ({ label, desc }) => (
  <div className="flex gap-2">
    <span className="text-xs font-medium flex-shrink-0 w-32" style={{ color: 'var(--text)' }}>{label}</span>
    <span className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</span>
  </div>
)

const ShortcutRow = ({ keys, action }) => (
  <div className="flex items-center gap-3">
    <div className="flex gap-1 flex-shrink-0">
      {keys.map((k) => (
        <kbd key={k} className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>{k}</kbd>
      ))}
    </div>
    <span className="text-xs" style={{ color: 'var(--muted)' }}>{action}</span>
  </div>
)

const Tip = ({ children }) => (
  <div className="p-2.5 rounded text-xs leading-relaxed" style={{ background: 'rgba(124,92,191,0.08)', border: '1px solid rgba(124,92,191,0.2)', color: 'var(--muted)' }}>
    {children}
  </div>
)

export default function HelpModal({ onClose }) {
  const [tab, setTab] = useState('overview')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl mx-4 rounded-xl border overflow-hidden animate-slide-up" style={{ background: 'var(--panel)', borderColor: 'var(--border)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: 'var(--gold)' }} />
            <span className="font-cinzel text-sm font-semibold tracking-widest" style={{ color: 'var(--gold)' }}>HOW TO USE GOBLIN EDITOR</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }}><X size={16} /></button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs flex-shrink-0 transition-colors"
              style={{
                color: tab === id ? 'var(--accent)' : 'var(--muted)',
                borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {tab === 'overview' && (
            <>
              <Tip>Goblin Editor is a fully browser-based video editor. No files ever leave your device — everything runs locally in your browser.</Tip>
              <div className="mt-4 space-y-4">
                <Section title="Basic workflow">
                  <Item label="1. Import media" desc="Drag video, audio, or image files into the Media panel on the left, or click the + button." />
                  <Item label="2. Build timeline" desc="Drag assets from the Media panel onto the tracks in the Timeline at the bottom." />
                  <Item label="3. Edit clips" desc="Click a clip to select it. Use the Inspector panel on the right to adjust transform, color, text, and audio." />
                  <Item label="4. Preview" desc="Press Space to play. Click anywhere on the scrubber or timeline ruler to seek." />
                  <Item label="5. Export" desc="Press Ctrl+E or click Export in the top bar. Your file downloads directly — no upload required." />
                </Section>
                <Section title="Track types">
                  <Item label="Video" desc="Primary video clips. Plays full-screen on the canvas." />
                  <Item label="Overlay" desc="Video or images that sit on top of your main video. Great for picture-in-picture or lower thirds." />
                  <Item label="Text" desc="Animated text elements with full font, color, and shadow control." />
                  <Item label="Audio" desc="Background music, voiceover, or any audio-only clip." />
                </Section>
                <Section title="Saving">
                  <Item label="Autosave" desc="Your project saves automatically every 30 seconds to your browser's local storage (IndexedDB)." />
                  <Item label="Manual save" desc="Click the floppy disk icon in the top bar, or use Ctrl+S." />
                  <Item label="Restore" desc="Reopen Goblin Editor in the same browser and your project will load automatically." />
                </Section>
              </div>
            </>
          )}

          {tab === 'media' && (
            <>
              <Tip>All media stays on your device. Files are referenced by your browser — nothing is uploaded to any server.</Tip>
              <div className="mt-4 space-y-4">
                <Section title="Importing files">
                  <Item label="Drag & drop" desc="Drag files directly onto the Media panel from your file manager." />
                  <Item label="Click to import" desc="Click the + button in the Media panel header to open a file picker." />
                  <Item label="Supported formats" desc="Video: MP4, MOV, WebM · Audio: MP3, WAV, OGG · Images: PNG, JPG, GIF, WebP" />
                </Section>
                <Section title="Managing assets">
                  <Item label="Rename" desc="Hover an asset and click the pencil icon to rename it." />
                  <Item label="Delete" desc="Hover an asset and click the trash icon. This removes it from the library (clips on the timeline still exist)." />
                  <Item label="Search" desc="Use the search bar to filter assets by name." />
                  <Item label="Sort" desc="Use the sort dropdown to sort by name, type, or duration." />
                </Section>
                <Section title="Adding to timeline">
                  <Item label="Drag to track" desc="Drag any asset from the Media panel and drop it onto a track in the Timeline. Drop position sets where the clip starts." />
                  <Item label="Track types" desc="Video assets go on Video or Overlay tracks. Audio goes on Audio tracks. Images go anywhere. Text clips are created directly on Text tracks." />
                </Section>
              </div>
            </>
          )}

          {tab === 'timeline' && (
            <>
              <Tip>The timeline is where you arrange and edit all your clips. Each row is a track. Tracks are composited top-to-bottom — overlay tracks appear on top of video tracks.</Tip>
              <div className="mt-4 space-y-4">
                <Section title="Clips">
                  <Item label="Move" desc="Click and drag a clip left or right to reposition it in time." />
                  <Item label="Trim" desc="Drag the left or right edge of a clip to trim it (shorten without removing footage — it can be expanded again)." />
                  <Item label="Split" desc="Select a clip, position the playhead where you want to cut, then press S." />
                  <Item label="Delete" desc="Select a clip and press Delete or Backspace." />
                  <Item label="Multi-select" desc="Hold Shift and click multiple clips to select them all." />
                </Section>
                <Section title="Tracks">
                  <Item label="Add tracks" desc="Use the + Video, + Audio, + Text, + Overlay buttons in the timeline toolbar." />
                  <Item label="Mute" desc="Click the speaker icon on a track to silence its audio during playback." />
                  <Item label="Hide" desc="Click the eye icon to hide a track from the canvas preview." />
                  <Item label="Lock" desc="Click the lock icon to prevent accidental edits to clips on that track." />
                  <Item label="Remove track" desc="Click the trash icon on a track header to delete the entire track and its clips." />
                </Section>
                <Section title="Navigation & zoom">
                  <Item label="Zoom" desc="Ctrl+Scroll over the timeline, or use the zoom buttons in the toolbar." />
                  <Item label="Scroll" desc="Scroll horizontally to navigate long timelines. Scroll vertically to see more tracks." />
                  <Item label="Ruler" desc="Click anywhere on the ruler (top of the timeline) to move the playhead to that position." />
                </Section>
                <Section title="Overlay / picture-in-picture">
                  <Item label="How it works" desc="Add a video or image clip to an Overlay track. It will appear on top of your main video during playback and export." />
                  <Item label="Position & size" desc="Select the overlay clip, then use the Transform tab in the Inspector to adjust its position, scale, and opacity." />
                  <Item label="Multiple overlays" desc="Add more Overlay tracks for multiple simultaneous overlays." />
                </Section>
              </div>
            </>
          )}

          {tab === 'inspector' && (
            <>
              <Tip>Click any clip on the timeline to open its properties here. The Inspector has four tabs: Transform, Color, Audio, and Text.</Tip>
              <div className="mt-4 space-y-4">
                <Section title="Transform tab">
                  <Item label="Position X/Y" desc="Move the clip around the canvas. 0,0 is the center." />
                  <Item label="Scale" desc="Zoom in or out on the clip. 1.0 = original size." />
                  <Item label="Rotation" desc="Rotate the clip in degrees." />
                  <Item label="Opacity" desc="0 = invisible, 1 = fully visible." />
                  <Item label="Flip H / Flip V" desc="Mirror the clip horizontally or vertically." />
                  <Item label="Crop" desc="Trim the visible edges of the clip without affecting the underlying media." />
                </Section>
                <Section title="Color tab">
                  <Item label="Brightness" desc="Increase or decrease overall lightness." />
                  <Item label="Contrast" desc="Spread the darks and lights further apart or closer together." />
                  <Item label="Saturation" desc="Boost or drain color intensity. -100 = full black & white." />
                  <Item label="Hue" desc="Shift all colors around the color wheel (in degrees)." />
                  <Item label="Blur" desc="Apply a gaussian blur in pixels." />
                  <Item label="Presets" desc="One-click looks: Cinematic, B&W, Warm, Cool, Fade. Click again to remove." />
                </Section>
                <Section title="Audio tab">
                  <Item label="Volume" desc="Per-clip volume level, independent of track mute." />
                  <Item label="Fade In" desc="Smoothly ramp the audio up from silence at the start of the clip." />
                  <Item label="Fade Out" desc="Smoothly ramp the audio down to silence at the end of the clip." />
                  <Item label="Effects" desc="Bass boost, treble boost, and normalize options." />
                </Section>
                <Section title="Text tab (text clips only)">
                  <Item label="Content" desc="The text to display." />
                  <Item label="Font & size" desc="Choose from available fonts and set the point size." />
                  <Item label="Color" desc="Text fill color." />
                  <Item label="Bold / Italic / Align" desc="Standard text formatting." />
                  <Item label="Shadow" desc="Drop shadow toggle." />
                  <Item label="Stroke" desc="Outline around the text, with color and width controls." />
                  <Item label="Animation" desc="Fade in, slide in, or typewriter effect for the text clip." />
                </Section>
              </div>
            </>
          )}

          {tab === 'export' && (
            <>
              <Tip>Export runs entirely in your browser using FFmpeg.wasm. No files are uploaded. Large exports can take several minutes and may make the tab unresponsive — this is normal.</Tip>
              <div className="mt-4 space-y-4">
                <Section title="Settings">
                  <Item label="Format" desc="MP4 (H.264 + AAC) — widest compatibility. WebM (VP9 + Opus) — smaller files, slower to encode." />
                  <Item label="Resolution" desc="480p, 720p, 1080p, or 1440p. Higher = larger file and longer encode time." />
                  <Item label="Frame rate" desc="24fps (cinematic), 30fps (standard), 60fps (smooth/gaming). Match your source footage for best results." />
                  <Item label="Video quality" desc="Low (~1 Mbps), Medium (~4 Mbps), High (~8 Mbps). High is recommended for final exports." />
                  <Item label="Audio bitrate" desc="192k is a good default. 320k for audiophile quality, 96k for smaller files." />
                </Section>
                <Section title="Requirements">
                  <Item label="Browser" desc="Chrome or Edge required for FFmpeg.wasm (SharedArrayBuffer support). Firefox and Safari will show an export warning." />
                  <Item label="Headers" desc="If hosting yourself, your server must send COOP and COEP headers. See the README for details." />
                </Section>
                <Section title="Tips">
                  <Item label="Expected time" desc="A rough guide: 1 minute of 1080p30 footage takes ~2–5 minutes to encode on a modern machine." />
                  <Item label="Tab unresponsive" desc="This is normal during encoding — FFmpeg is using all available CPU. Don't close the tab." />
                  <Item label="Cancel" desc="Click Cancel during export to abort cleanly. You can then change settings and try again." />
                </Section>
              </div>
            </>
          )}

          {tab === 'shortcuts' && (
            <div className="space-y-5">
              <Section title="Playback">
                <ShortcutRow keys={['Space']} action="Play / Pause" />
                <ShortcutRow keys={['←']} action="Step one frame back" />
                <ShortcutRow keys={['→']} action="Step one frame forward" />
                <ShortcutRow keys={['Shift', '←']} action="Jump 1 second back" />
                <ShortcutRow keys={['Shift', '→']} action="Jump 1 second forward" />
                <ShortcutRow keys={['Home']} action="Go to start" />
                <ShortcutRow keys={['End']} action="Go to end" />
              </Section>
              <Section title="Editing">
                <ShortcutRow keys={['S']} action="Split selected clip at playhead" />
                <ShortcutRow keys={['Delete']} action="Remove selected clip(s)" />
                <ShortcutRow keys={['Ctrl', 'C']} action="Copy selected clips" />
                <ShortcutRow keys={['Ctrl', 'Z']} action="Undo" />
                <ShortcutRow keys={['Ctrl', 'Y']} action="Redo" />
                <ShortcutRow keys={['Ctrl', 'Shift', 'Z']} action="Redo (alternate)" />
              </Section>
              <Section title="Timeline">
                <ShortcutRow keys={['Ctrl', '+']} action="Zoom timeline in" />
                <ShortcutRow keys={['Ctrl', '-']} action="Zoom timeline out" />
                <ShortcutRow keys={['Ctrl', 'Scroll']} action="Zoom timeline with mouse wheel" />
              </Section>
              <Section title="App">
                <ShortcutRow keys={['Ctrl', 'E']} action="Open Export" />
                <ShortcutRow keys={['?']} action="Open shortcuts help" />
              </Section>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
