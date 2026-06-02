/**
 * Extract metadata and generate thumbnail from a video file.
 */
export async function extractVideoMeta(file) {
  return new Promise((resolve, reject) => {
    const url   = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload  = 'metadata'
    video.muted    = true
    video.src      = url

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(1, video.duration * 0.1)
    })

    video.addEventListener('seeked', () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, 160, 90)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(url)
      resolve({
        duration:    video.duration,
        width:       video.videoWidth,
        height:      video.videoHeight,
        thumbnail,
        aspectRatio: video.videoWidth / video.videoHeight,
      })
    })

    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    })
  })
}

/**
 * Extract metadata from an audio file.
 */
export async function extractAudioMeta(file) {
  return new Promise((resolve, reject) => {
    const url   = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src     = url

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve({ duration: audio.duration })
    })
    audio.addEventListener('error', (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    })
  })
}

/**
 * Generate thumbnail from an image file.
 */
export async function extractImageMeta(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 160, 90)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight, thumbnail })
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00.00'
  const h  = Math.floor(seconds / 3600)
  const m  = Math.floor((seconds % 3600) / 60)
  const s  = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
}

export function getAssetType(file) {
  const t = file.type
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  if (t.startsWith('image/')) return 'image'
  return 'unknown'
}

// Broad check — accept anything the browser reports as video/audio/image
export function isSupported(file) {
  const t = file.type
  return t.startsWith('video/') || t.startsWith('audio/') || t.startsWith('image/')
}
