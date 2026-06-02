/**
 * Web Audio API effect chain builder.
 * Creates and connects audio nodes for each supported effect.
 */

const _audioCtx = { current: null }

export function getAudioContext() {
  if (!_audioCtx.current) {
    _audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
  }
  return _audioCtx.current
}

// Map: element id → { source, gainNode, effectNodes, connectedEffect }
const _chains = new Map()

/**
 * Attach (or update) a Web Audio effect chain to an HTMLMediaElement.
 * Call this whenever audioSettings change.
 */
export function applyAudioEffect(element, audioSettings = {}) {
  const ctx    = getAudioContext()
  const effect = audioSettings.effect || 'none'
  const volume = audioSettings.muted ? 0 : Math.min(2, audioSettings.volume ?? 1)

  let chain = _chains.get(element)

  // Build chain if not yet created OR effect changed
  if (!chain || chain.connectedEffect !== effect) {
    // Disconnect old chain
    if (chain) {
      chain.source.disconnect()
      chain.gainNode.disconnect()
      chain.effectNodes.forEach((n) => { try { n.disconnect() } catch {} })
    }

    const source   = chain?.source || ctx.createMediaElementSource(element)
    const gainNode = ctx.createGain()
    const effectNodes = buildEffectNodes(ctx, effect)

    // Connect: source → effects → gain → destination
    let prev = source
    effectNodes.forEach((node) => { prev.connect(node); prev = node })
    prev.connect(gainNode)
    gainNode.connect(ctx.destination)

    chain = { source, gainNode, effectNodes, connectedEffect: effect }
    _chains.set(element, chain)
  }

  chain.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.01)
}

function buildEffectNodes(ctx, effect) {
  switch (effect) {
    case 'bass-boost': {
      const filter = ctx.createBiquadFilter()
      filter.type      = 'lowshelf'
      filter.frequency.value = 200
      filter.gain.value      = 10
      return [filter]
    }
    case 'low-pass': {
      const filter = ctx.createBiquadFilter()
      filter.type      = 'lowpass'
      filter.frequency.value = 800
      filter.Q.value         = 0.7
      return [filter]
    }
    case 'high-pass': {
      const filter = ctx.createBiquadFilter()
      filter.type      = 'highpass'
      filter.frequency.value = 2000
      filter.Q.value         = 0.7
      return [filter]
    }
    case 'normalize': {
      // Approximate normalize via DynamicsCompressor
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -24
      comp.knee.value      = 10
      comp.ratio.value     = 12
      comp.attack.value    = 0.003
      comp.release.value   = 0.25
      return [comp]
    }
    case 'echo': {
      // Splitter lets dry signal pass through; wet signal goes through delay
      const input    = ctx.createGain()   // entry point
      const delay    = ctx.createDelay(1.0)
      const feedback = ctx.createGain()
      const wetGain  = ctx.createGain()
      const output   = ctx.createGain()   // exit point

      delay.delayTime.value = 0.3
      feedback.gain.value   = 0.4
      wetGain.gain.value    = 0.5

      // Dry path: input → output
      input.connect(output)
      // Wet path: input → delay → wetGain → output
      input.connect(delay)
      delay.connect(wetGain)
      wetGain.connect(output)
      // Feedback loop: delay → feedback → delay
      delay.connect(feedback)
      feedback.connect(delay)

      // Return as a two-node chain so the caller does: source → input → ... → output → gainNode
      return [input, output]
    }
    case 'reverb': {
      const convolver = ctx.createConvolver()
      convolver.buffer = createReverbBuffer(ctx, 1.5, 3)
      return [convolver]
    }
    default:
      return []
  }
}

/** Synthetic impulse response for reverb */
function createReverbBuffer(ctx, duration, decay) {
  const rate    = ctx.sampleRate
  const length  = Math.floor(rate * duration)
  const buffer  = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return buffer
}

/** Clean up when an element is removed */
export function detachAudioEffect(element) {
  const chain = _chains.get(element)
  if (!chain) return
  chain.source.disconnect()
  chain.gainNode.disconnect()
  chain.effectNodes.forEach((n) => { try { n.disconnect() } catch {} })
  _chains.delete(element)
}
