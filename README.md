# Goblin Editor

A fully browser-based, local-only video editor. No backend, no accounts, no cloud, no watermark.

## Stack
- React 18 + Vite
- Tailwind CSS
- Zustand (state)
- FFmpeg.wasm (export)
- IndexedDB (project saves)

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for GitHub Pages / Cloudflare Pages

```bash
npm run build
```

Deploy the `dist/` folder.

**Important:** The hosting environment must serve these headers for FFmpeg.wasm (SharedArrayBuffer) to work:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- GitHub Pages: add a `_headers` file (see below)
- Cloudflare Pages: add in dashboard → Settings → Headers

### `public/_headers` (Cloudflare Pages / Netlify)
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

## Project Structure

```
src/
  App.jsx                        # Layout root
  store/editorStore.js           # All state (Zustand)
  components/
    ui/         Topbar, ShortcutsModal
    media/      MediaPanel (import, library)
    preview/    PreviewPanel (canvas renderer, controls)
    timeline/   TimelinePanel (multi-track timeline)
    effects/    InspectorPanel, TransformControls, ColorEffects
    text/       TextControls
    audio/      AudioControls
    export/     ExportModal (FFmpeg.wasm)
  hooks/
    useKeyboardShortcuts.js
    usePlaybackEngine.js
    useAutosave.js
  utils/
    mediaUtils.js  (thumbnail gen, metadata)
    db.js          (IndexedDB)
    nanoid.js
```

## Features (V1)

- ✅ Drag-and-drop media import (MP4, MOV, WebM, MP3, WAV, PNG, JPG, GIF)
- ✅ Multi-track timeline (Video, Overlay, Text, Audio)
- ✅ Clip drag, resize (trim), split
- ✅ Track mute / hide / lock
- ✅ Canvas preview renderer
- ✅ Playback engine with speed control
- ✅ Transform controls (position, scale, rotation, opacity, flip, crop)
- ✅ Color effects (brightness, contrast, saturation, hue, blur, presets)
- ✅ Text system (font, size, color, shadow, stroke, position, animation)
- ✅ Audio settings per clip (volume, fade in/out, effects)
- ✅ Export via FFmpeg.wasm (MP4/WebM, 480p–1440p, 24/30/60fps)
- ✅ Undo / redo (100 steps)
- ✅ Keyboard shortcuts
- ✅ IndexedDB autosave
- ✅ Resizable panels

## Keyboard Shortcuts

| Key             | Action               |
|-----------------|----------------------|
| Space           | Play / Pause         |
| S               | Split clip           |
| Delete          | Remove clip          |
| Ctrl+Z          | Undo                 |
| Ctrl+Y          | Redo                 |
| Ctrl+E          | Export               |
| ← / →           | Frame step           |
| Shift+← / →     | 1 second step        |
| Home / End      | Start / End          |
| ?               | Shortcuts help       |
