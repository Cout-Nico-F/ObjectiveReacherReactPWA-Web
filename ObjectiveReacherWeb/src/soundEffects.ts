// Studio-Grade Procedural Sound & Haptic Engine (Web Audio DSP + Navigator Vibration API)
// Features:
// - In-memory Algorithmic Stereo Reverb Convolver (spatial bloom, 0 KB external files)
// - Master Dynamics Compressor (warmth, zero clipping on polyphonic chords)
// - FM (Frequency Modulation) & Mallet Transient Synthesis (kalimba, crystal, coin, marimba textures)
// - Vibrato LFOs & Formant Sweeps for 20 distinct Mascot Species Voices (Levels 1–200)
// - Calibrated Multi-Pulse Tactile Haptic Choreography

export interface SensoryPreferences {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  musicEnabled?: boolean;
}

const SENSORY_STORAGE_KEY = 'ObjectiveReacher.SensoryPrefs.v1';

let currentPrefs: SensoryPreferences = loadSensoryPreferences();
let activeSoundPackId = 'snd_kalimba_zen';

export interface SoundPackDSPProfile {
  pitchMult: number;
  wave: OscillatorType;
  fmRatio: number;
  fmDepthMult: number;
  detune: number;
  woodClick: boolean;
  reverbBoost: number;
  scaleRatios: [number, number, number, number, number, number];
}

const SOUND_PACK_PROFILES: Record<string, SoundPackDSPProfile> = {
  snd_kalimba_zen: { pitchMult: 1.0, wave: 'sine', fmRatio: 3, fmDepthMult: 0.35, detune: 5, woodClick: true, reverbBoost: 1.0, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_marimba_wood: { pitchMult: 0.84, wave: 'triangle', fmRatio: 4, fmDepthMult: 0.2, detune: 3, woodClick: true, reverbBoost: 0.75, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_rain_drops: { pitchMult: 1.18, wave: 'sine', fmRatio: 2.5, fmDepthMult: 0.25, detune: 6, woodClick: false, reverbBoost: 1.35, scaleRatios: [1, 1.122, 1.335, 1.498, 1.782, 2.0] },
  snd_wind_chimes: { pitchMult: 1.42, wave: 'sine', fmRatio: 3.5, fmDepthMult: 0.65, detune: 9, woodClick: false, reverbBoost: 1.45, scaleRatios: [1, 1.189, 1.335, 1.498, 1.782, 2.0] },
  snd_night_piano: { pitchMult: 0.78, wave: 'triangle', fmRatio: 2, fmDepthMult: 0.3, detune: 7, woodClick: true, reverbBoost: 1.25, scaleRatios: [1, 1.122, 1.189, 1.498, 1.587, 2.0] },
  snd_bamboo_forest: { pitchMult: 0.94, wave: 'sine', fmRatio: 2.8, fmDepthMult: 0.18, detune: 4, woodClick: true, reverbBoost: 0.9, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_lofi_velvet: { pitchMult: 0.74, wave: 'triangle', fmRatio: 1.5, fmDepthMult: 0.15, detune: 14, woodClick: false, reverbBoost: 1.2, scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.782] },
  snd_morning_harp: { pitchMult: 1.12, wave: 'triangle', fmRatio: 2, fmDepthMult: 0.35, detune: 8, woodClick: true, reverbBoost: 1.35, scaleRatios: [1, 1.122, 1.26, 1.414, 1.498, 1.888] },
  snd_celesta_dream: { pitchMult: 1.3, wave: 'sine', fmRatio: 4, fmDepthMult: 0.55, detune: 6, woodClick: true, reverbBoost: 1.3, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_tibetan_432: { pitchMult: 0.825, wave: 'sine', fmRatio: 2.75, fmDepthMult: 0.5, detune: 11, woodClick: false, reverbBoost: 1.5, scaleRatios: [1, 1.125, 1.25, 1.5, 1.667, 2.0] },
  snd_crystal_quartz: { pitchMult: 1.35, wave: 'sine', fmRatio: 3.14, fmDepthMult: 0.75, detune: 8, woodClick: false, reverbBoost: 1.45, scaleRatios: [1, 1.122, 1.26, 1.414, 1.587, 2.0] },
  snd_sakura_koto: { pitchMult: 1.05, wave: 'triangle', fmRatio: 2.5, fmDepthMult: 0.45, detune: 6, woodClick: true, reverbBoost: 1.1, scaleRatios: [1, 1.059, 1.335, 1.498, 1.587, 2.0] },
  snd_8bit_arcade: { pitchMult: 1.15, wave: 'square', fmRatio: 1, fmDepthMult: 0.05, detune: 2, woodClick: false, reverbBoost: 0.35, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 2.0] },
  snd_synthwave_84: { pitchMult: 0.88, wave: 'sawtooth', fmRatio: 2, fmDepthMult: 0.35, detune: 15, woodClick: false, reverbBoost: 1.3, scaleRatios: [1, 1.189, 1.335, 1.498, 1.782, 2.0] },
  snd_hang_drum: { pitchMult: 0.79, wave: 'sine', fmRatio: 2.0, fmDepthMult: 0.48, detune: 9, woodClick: true, reverbBoost: 1.4, scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.682] },
  snd_music_box: { pitchMult: 1.52, wave: 'sine', fmRatio: 5, fmDepthMult: 0.65, detune: 4, woodClick: true, reverbBoost: 1.25, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682] },
  snd_cyber_glitch: { pitchMult: 1.08, wave: 'sawtooth', fmRatio: 3.5, fmDepthMult: 0.85, detune: 12, woodClick: true, reverbBoost: 0.85, scaleRatios: [1, 1.059, 1.26, 1.414, 1.498, 1.888] },
  snd_seraph_choir: { pitchMult: 1.0, wave: 'triangle', fmRatio: 2, fmDepthMult: 0.28, detune: 16, woodClick: false, reverbBoost: 1.55, scaleRatios: [1, 1.26, 1.498, 1.682, 1.888, 2.0] },
  snd_imperial_bells: { pitchMult: 0.92, wave: 'sine', fmRatio: 3.46, fmDepthMult: 0.8, detune: 7, woodClick: true, reverbBoost: 1.4, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_solfeggio_528: { pitchMult: 1.009, wave: 'sine', fmRatio: 2, fmDepthMult: 0.3, detune: 8, woodClick: false, reverbBoost: 1.5, scaleRatios: [1, 1.125, 1.25, 1.333, 1.5, 2.0] },
  snd_cosmic_organ: { pitchMult: 0.72, wave: 'triangle', fmRatio: 1.5, fmDepthMult: 0.42, detune: 13, woodClick: false, reverbBoost: 1.5, scaleRatios: [1, 1.122, 1.335, 1.498, 1.682, 2.0] },
  snd_obsidian_gong: { pitchMult: 0.65, wave: 'sine', fmRatio: 2.41, fmDepthMult: 0.9, detune: 10, woodClick: true, reverbBoost: 1.5, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_arctic_glass: { pitchMult: 1.46, wave: 'sine', fmRatio: 3.8, fmDepthMult: 0.7, detune: 6, woodClick: false, reverbBoost: 1.38, scaleRatios: [1, 1.189, 1.26, 1.498, 1.682, 2.0] },
  snd_tropical_steel: { pitchMult: 1.14, wave: 'triangle', fmRatio: 2.9, fmDepthMult: 0.55, detune: 11, woodClick: true, reverbBoost: 1.1, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682] },
  snd_steampunk_clock: { pitchMult: 1.22, wave: 'triangle', fmRatio: 4.2, fmDepthMult: 0.6, detune: 5, woodClick: true, reverbBoost: 0.8, scaleRatios: [1, 1.122, 1.189, 1.414, 1.498, 1.782] },
  snd_astral_flute: { pitchMult: 1.06, wave: 'sine', fmRatio: 1.5, fmDepthMult: 0.18, detune: 9, woodClick: false, reverbBoost: 1.4, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_emerald_lute: { pitchMult: 0.96, wave: 'triangle', fmRatio: 2.2, fmDepthMult: 0.38, detune: 7, woodClick: true, reverbBoost: 1.15, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682] },
  snd_phoenix_ember: { pitchMult: 1.1, wave: 'sawtooth', fmRatio: 2.5, fmDepthMult: 0.45, detune: 10, woodClick: true, reverbBoost: 1.3, scaleRatios: [1, 1.122, 1.26, 1.414, 1.498, 2.0] },
  snd_abyssal_sonar: { pitchMult: 0.76, wave: 'sine', fmRatio: 1.8, fmDepthMult: 0.35, detune: 8, woodClick: false, reverbBoost: 1.55, scaleRatios: [1, 1.189, 1.335, 1.498, 1.587, 2.0] },
  snd_quasar_symphony: { pitchMult: 1.04, wave: 'triangle', fmRatio: 3.0, fmDepthMult: 0.6, detune: 14, woodClick: true, reverbBoost: 1.5, scaleRatios: [1, 1.122, 1.26, 1.414, 1.682, 2.0] },
};

export function setActiveSoundPack(packId: string): void {
  activeSoundPackId = packId || 'snd_kalimba_zen';
}

export function getActiveSoundPackProfile(packId?: string): SoundPackDSPProfile {
  return SOUND_PACK_PROFILES[packId || activeSoundPackId] || SOUND_PACK_PROFILES.snd_kalimba_zen;
}

interface AudioEngineNodes {
  ctx: AudioContext;
  dryGain: GainNode;
  wetGain: GainNode;
  compressor: DynamicsCompressorNode;
  noiseBuffer: AudioBuffer;
}

let engine: AudioEngineNodes | null = null;

export function loadSensoryPreferences(): SensoryPreferences {
  try {
    const raw = localStorage.getItem(SENSORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        soundEnabled: parsed.soundEnabled !== false,
        hapticsEnabled: parsed.hapticsEnabled !== false,
        musicEnabled: Boolean(parsed.musicEnabled),
      };
    }
  } catch {
    // ignore storage errors
  }
  return { soundEnabled: true, hapticsEnabled: true, musicEnabled: false };
}

export function saveSensoryPreferences(prefs: SensoryPreferences): void {
  currentPrefs = prefs;
  try {
    localStorage.setItem(SENSORY_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function getSensoryPreferences(): SensoryPreferences {
  return currentPrefs;
}

/**
 * Initializes the studio DSP bus (Dry + Algorithmic Velvet Reverb -> Master Compressor -> Destination)
 */
function getEngine(): AudioEngineNodes | null {
  if (!currentPrefs.soundEnabled) return null;
  if (typeof window === 'undefined') return null;

  if (!engine) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.004, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);
    compressor.connect(ctx.destination);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.88, ctx.currentTime);
    dryGain.connect(compressor);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.26, ctx.currentTime);

    // Build a lush 0.55s stereo algorithmic reverb impulse response in memory
    const sampleRate = ctx.sampleRate;
    const irLength = Math.floor(sampleRate * 0.55);
    const impulse = ctx.createBuffer(2, irLength, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < irLength; i++) {
        const progress = i / irLength;
        // Exponential decay with early pre-delay smoothing
        const env = Math.pow(1 - progress, 2.8) * Math.min(1, i / (sampleRate * 0.008));
        data[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;

    // Warm low-pass on reverb tail so highs stay silky
    const reverbFilter = ctx.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.setValueAtTime(3400, ctx.currentTime);

    wetGain.connect(convolver);
    convolver.connect(reverbFilter);
    reverbFilter.connect(compressor);

    // Pre-generate a short velvet noise buffer for mallet/pluck physical transients
    const noiseLen = Math.floor(sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, noiseLen, sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.012));
    }

    engine = { ctx, dryGain, wetGain, compressor, noiseBuffer };
  }

  if (engine.ctx.state === 'suspended') {
    engine.ctx.resume().catch(() => {});
  }
  return engine;
}

/**
 * Triggers calibrated physical haptic feedback on supported mobile devices.
 */
export function triggerHaptic(pattern: number | number[]): void {
  if (!currentPrefs.hapticsEnabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore on unsupported platforms
  }
}

interface SynthNoteOptions {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  startTime?: number;
  duration: number;
  gain: number;
  attack?: number;
  filterFreq?: number;
  detuneCents?: number;
  fmRatio?: number;
  fmDepth?: number;
  vibratoHz?: number;
  vibratoCents?: number;
  woodClick?: boolean;
  reverbSend?: number;
  pan?: number;
}

/**
 * Studio voice synthesizer: supports unison chorus detuning, FM bell harmonics,
 * LFO vibrato, physical mallet transient click, stereo panning, and reverb send.
 */
function playRichVoice(opts: SynthNoteOptions): void {
  const eng = getEngine();
  if (!eng) return;

  const { ctx, dryGain, wetGain, noiseBuffer } = eng;
  const now = opts.startTime ?? ctx.currentTime;
  const attack = opts.attack ?? 0.008;
  const duration = opts.duration;

  const voiceOut = ctx.createGain();
  voiceOut.gain.setValueAtTime(0.0001, now);
  voiceOut.gain.linearRampToValueAtTime(opts.gain, now + attack);
  voiceOut.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // Optional stereo panner
  let destinationNode: AudioNode = voiceOut;
  if (typeof ctx.createStereoPanner === 'function' && opts.pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), now);
    voiceOut.connect(panner);
    destinationNode = panner;
  }

  destinationNode.connect(dryGain);
  if ((opts.reverbSend ?? 1) > 0) {
    const sendGain = ctx.createGain();
    sendGain.gain.setValueAtTime(opts.reverbSend ?? 0.75, now);
    destinationNode.connect(sendGain);
    sendGain.connect(wetGain);
  }

  // Optional lowpass filter with gentle envelope sweep
  let targetInput: AudioNode = voiceOut;
  if (opts.filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.4, now);
    filter.frequency.setValueAtTime(opts.filterFreq * 1.4, now);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(120, opts.filterFreq * 0.65),
      now + duration
    );
    filter.connect(voiceOut);
    targetInput = filter;
  }

  // Main Oscillator
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(Math.max(35, opts.freq), now);
  if (opts.endFreq && opts.endFreq > 35) {
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + duration);
  }
  osc.connect(targetInput);
  osc.start(now);
  osc.stop(now + duration + 0.025);

  // Optional Unison Chorus Oscillator (warmth & thickness)
  if (opts.detuneCents) {
    const osc2 = ctx.createOscillator();
    osc2.type = opts.type === 'sine' ? 'triangle' : 'sine';
    osc2.frequency.setValueAtTime(Math.max(35, opts.freq), now);
    if (opts.endFreq && opts.endFreq > 35) {
      osc2.frequency.exponentialRampToValueAtTime(opts.endFreq, now + duration);
    }
    osc2.detune.setValueAtTime(opts.detuneCents, now);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.45, now);
    osc2.connect(osc2Gain);
    osc2Gain.connect(targetInput);
    osc2.start(now);
    osc2.stop(now + duration + 0.025);
  }

  // Optional FM (Frequency Modulation) for crystalline / bell / metallic harmonics
  if (opts.fmRatio && opts.fmDepth) {
    const modOsc = ctx.createOscillator();
    const modGain = ctx.createGain();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(opts.freq * opts.fmRatio, now);
    modGain.gain.setValueAtTime(opts.fmDepth, now);
    modGain.gain.exponentialRampToValueAtTime(0.1, now + duration * 0.75);
    modOsc.connect(modGain);
    modGain.connect(osc.frequency);
    modOsc.start(now);
    modOsc.stop(now + duration + 0.025);
  }

  // Optional Vibrato LFO for expressive creature voices
  if (opts.vibratoHz && opts.vibratoCents) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(opts.vibratoHz, now);
    lfoGain.gain.setValueAtTime(opts.vibratoCents, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);
    lfo.start(now);
    lfo.stop(now + duration + 0.025);
  }

  // Optional Physical Mallet / Kalimba Wood Click Transient
  if (opts.woodClick) {
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(Math.min(4800, opts.freq * 2.5), now);
    bp.Q.setValueAtTime(3.0, now);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(opts.gain * 0.55, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
    noiseSrc.connect(bp);
    bp.connect(clickGain);
    clickGain.connect(dryGain);
    noiseSrc.start(now);
  }
}

/**
 * 1. Crisp Kalimba / Marimba Tactile Tap for UI chips, tabs & switches.
 * Scales smoothly in pitch so higher quick amounts feel progressively brighter.
 */
export function playUiTap(pitchIndex = 0): void {
  triggerHaptic(10);
  const eng = getEngine();
  if (!eng) return;

  const prof = getActiveSoundPackProfile();
  const root = 523.25 * prof.pitchMult;
  const ratio = prof.scaleRatios[Math.abs(pitchIndex) % prof.scaleRatios.length];
  const baseFreq = root * ratio;

  playRichVoice({
    freq: baseFreq,
    endFreq: baseFreq * 1.03,
    type: prof.wave,
    duration: 0.088,
    gain: prof.wave === 'square' || prof.wave === 'sawtooth' ? 0.075 : 0.11,
    attack: 0.003,
    detuneCents: prof.detune,
    fmRatio: prof.fmRatio,
    fmDepth: baseFreq * prof.fmDepthMult,
    woodClick: prof.woodClick,
    filterFreq: prof.wave === 'sawtooth' || prof.wave === 'square' ? 2800 : 5200,
    reverbSend: Math.min(1.2, 0.35 * prof.reverbBoost),
  });
}

/**
 * 1b. Preview a specific Sound Pack with a 4-note harmonic signature
 */
export function playSoundPackPreview(packId: string): void {
  triggerHaptic([12, 24, 18]);
  const eng = getEngine();
  if (!eng) return;

  const prof = getActiveSoundPackProfile(packId);
  const now = eng.ctx.currentTime;
  const root = 523.25 * prof.pitchMult;
  const indices = [0, 2, 3, 5];
  const pans = [-0.25, -0.08, 0.1, 0.25];

  indices.forEach((scaleIdx, i) => {
    const isLast = i === indices.length - 1;
    const freq = root * prof.scaleRatios[scaleIdx];
    playRichVoice({
      freq,
      type: prof.wave,
      startTime: now + i * 0.06,
      duration: isLast ? 0.42 : 0.18,
      gain: prof.wave === 'square' || prof.wave === 'sawtooth' ? 0.085 : 0.125,
      attack: 0.005,
      detuneCents: prof.detune,
      fmRatio: prof.fmRatio,
      fmDepth: freq * prof.fmDepthMult,
      woodClick: prof.woodClick && (i === 0 || isLast),
      filterFreq: prof.wave === 'sawtooth' || prof.wave === 'square' ? 3200 : 5400,
      reverbSend: Math.min(1.3, (isLast ? 0.9 : 0.5) * prof.reverbBoost),
      pan: pans[i],
    });
  });
}

/**
 * 2. Positive Progress Registered (+ Sumar)
 * Warm sub-bass pulse + shimmering stereo arpeggio shaped by active Sound Pack.
 */
export function playAddEntrySound(): void {
  triggerHaptic([14, 32, 26]);
  const eng = getEngine();
  if (!eng) return;

  const prof = getActiveSoundPackProfile();
  const now = eng.ctx.currentTime;

  // Tactile low-end body punch
  playRichVoice({
    freq: 155 * Math.max(0.8, Math.min(1.2, prof.pitchMult)),
    endFreq: 68,
    type: 'sine',
    startTime: now,
    duration: 0.13,
    gain: 0.18,
    attack: 0.004,
    reverbSend: 0.1,
  });

  const root = 523.25 * prof.pitchMult;
  const indices = [0, 1, 2, 3, 5];
  const pans = [-0.25, -0.1, 0, 0.15, 0.25];

  indices.forEach((scaleIdx, idx) => {
    const isFinal = idx === indices.length - 1;
    const freq = root * prof.scaleRatios[scaleIdx];
    playRichVoice({
      freq,
      type: prof.wave,
      startTime: now + idx * 0.048,
      duration: isFinal ? 0.38 : 0.19,
      gain:
        (prof.wave === 'square' || prof.wave === 'sawtooth' ? 0.085 : 0.12) *
        (isFinal ? 1.15 : 0.9),
      attack: 0.005,
      detuneCents: isFinal ? prof.detune + 3 : prof.detune,
      fmRatio: prof.fmRatio,
      fmDepth: freq * prof.fmDepthMult,
      woodClick: prof.woodClick && (idx === 0 || isFinal),
      filterFreq: prof.wave === 'sawtooth' || prof.wave === 'square' ? 3200 : 4800,
      reverbSend: Math.min(1.3, (isFinal ? 0.95 : 0.55) * prof.reverbBoost),
      pan: pans[idx],
    });
  });
}

/**
 * 3. Expense / Subtraction Registered (- Restar)
 * Soft, damped wooden marimba two-note step down.
 */
export function playSubtractEntrySound(): void {
  triggerHaptic([18, 25, 12]);
  const eng = getEngine();
  if (!eng) return;

  const now = eng.ctx.currentTime;
  playRichVoice({
    freq: 440.0, // A4
    endFreq: 415.3,
    type: 'triangle',
    startTime: now,
    duration: 0.13,
    gain: 0.11,
    woodClick: true,
    filterFreq: 1500,
    reverbSend: 0.35,
  });
  playRichVoice({
    freq: 329.63, // E4
    endFreq: 293.66, // D4
    type: 'sine',
    startTime: now + 0.075,
    duration: 0.22,
    gain: 0.13,
    woodClick: true,
    filterFreq: 1100,
    reverbSend: 0.45,
  });
}

/**
 * 4. Studio Mascot Bio-Acoustic Synthesizer (20 Species Personalities, Levels 1–200)
 * Each species tier has a unique acoustic signature combining FM harmonics, vibrato, and pitch contours.
 */
export function playMascotVoice(level: number, isFirstDailyPet = false): void {
  triggerHaptic(
    isFirstDailyPet ? [14, 28, 16, 28, 18, 35, 30] : [12, 24, 18, 24, 14]
  );
  const eng = getEngine();
  if (!eng) return;

  const clampedLevel = Math.min(200, Math.max(1, level));
  const tier = Math.floor((clampedLevel - 1) / 10); // 0..19
  const subLevel = (clampedLevel - 1) % 10; // 0..9
  const now = eng.ctx.currentTime;

  // Sub-levels 1..10 gently brighten the harmonic pitch
  const subPitch = 1 + subLevel * 0.016;

  // Unique root frequencies per species tier so every creature has its own vocal register
  const tierRoots = [
    523.25, // 0: Brote Esmeralda (Organic kalimba sprout chirp)
    659.25, // 1: Espíritu Neko (Purr-vibrato + lucky bell meow)
    587.33, // 2: Zorro Kitsune (Mystical bamboo flute yip)
    349.23, // 3: Búho Sabio (Deep resonant night hoot + stardust)
    440.0,  // 4: Lobo Boreal (Aurora harmonic glide + ice chime)
    392.0,  // 5: Tigre Guardián (Warm brassy purr-roar)
    493.88, // 6: León Solar (Radiant golden chord)
    554.37, // 7: Ciervo del Bosque (Woodland harp arpeggio)
    698.46, // 8: Fénix Carmesí (Rising solar firebird trill)
    783.99, // 9: Gólem de Cristal (FM resonant crystal glass chime)
    311.13, // 10: Kraken Abisal (Deep oceanic sonar + bubble)
    622.25, // 11: Cronos Autómata (Clockwork escapement ticks + chime)
    466.16, // 12: Dragón Imperial (Oriental pentatonic pearl resonance)
    739.99, // 13: Polilla Astral (Fluttering lunar vibrato)
    880.0,  // 14: Serafín Ophanim (Angelic 3-voice halo choir)
    369.99, // 15: Hidra Tricéfala (Triple-head synchronized triad)
    587.33, // 16: Djinn Astral (Mystic phrygian vortex shimmer)
    659.25, // 17: Valkiria Celestial (Heroic valkyrie horn fifth)
    830.61, // 18: Arquitecto Merkaba (Sacred geometry harmonic crystal)
    523.25, // 19: Singularidad Cósmica (Grand pulsar octave symphony)
  ];

  const root = (tierRoots[tier] || 523.25) * subPitch;

  switch (tier % 5) {
    case 0: {
      // Organic / Woodland / Sprout: Playful kalimba-chirp with expressive vibrato
      playRichVoice({
        freq: root * 0.85,
        endFreq: root * 1.25,
        type: 'sine',
        startTime: now,
        duration: 0.12,
        gain: 0.13,
        woodClick: true,
        vibratoHz: 12,
        vibratoCents: 25,
      });
      playRichVoice({
        freq: root * 1.2,
        endFreq: root * 1.65,
        type: 'triangle',
        startTime: now + 0.085,
        duration: 0.22,
        gain: 0.13,
        detuneCents: 8,
        fmRatio: 2,
        fmDepth: root * 0.3,
        filterFreq: 3800,
        reverbSend: 0.85,
      });
      break;
    }
    case 1: {
      // Spirit Neko / Cronos / Djinn: Purr trill + lucky bell overtone
      [0, 0.045, 0.09].forEach((offset, idx) => {
        playRichVoice({
          freq: root * (0.75 + idx * 0.18),
          endFreq: root * (0.95 + idx * 0.22),
          type: 'triangle',
          startTime: now + offset,
          duration: 0.14,
          gain: 0.11,
          woodClick: idx === 0,
          fmRatio: 3,
          fmDepth: root * 0.45,
          filterFreq: 3600,
        });
      });
      playRichVoice({
        freq: root * 1.5,
        endFreq: root * 1.35,
        type: 'sine',
        startTime: now + 0.13,
        duration: 0.26,
        gain: 0.12,
        vibratoHz: 8,
        vibratoCents: 35,
        reverbSend: 0.9,
      });
      break;
    }
    case 2: {
      // Kitsune / Ciervo / Dragón / Valkiria: Melodic pentatonic grace-note flute/harp
      const melody = [1, 1.25, 1.5, 2];
      melody.forEach((ratio, idx) => {
        playRichVoice({
          freq: root * ratio * 0.8,
          type: 'sine',
          startTime: now + idx * 0.045,
          duration: idx === 3 ? 0.32 : 0.16,
          gain: 0.11,
          detuneCents: 6,
          vibratoHz: 6.5,
          vibratoCents: 18,
          woodClick: idx === 0,
          reverbSend: 0.9,
          pan: (idx - 1.5) * 0.15,
        });
      });
      break;
    }
    case 3: {
      // Búho / Fénix / Polilla / Merkaba: Resonant vocal call + shimmering harmonic tail
      playRichVoice({
        freq: root,
        endFreq: root * 1.18,
        type: 'sine',
        startTime: now,
        duration: 0.16,
        gain: 0.14,
        vibratoHz: 9,
        vibratoCents: 30,
      });
      playRichVoice({
        freq: root * 0.75,
        endFreq: root * 1.5,
        type: 'triangle',
        startTime: now + 0.11,
        duration: 0.28,
        gain: 0.13,
        detuneCents: 10,
        fmRatio: 2.5,
        fmDepth: root * 0.5,
        filterFreq: 4200,
        reverbSend: 1.0,
      });
      break;
    }
    default: {
      // Lobo / Gólem / Serafín / Singularidad: Lush Crystalline / Cosmic Choir Chord
      [1, 1.25, 1.5, 2].forEach((ratio, idx) => {
        playRichVoice({
          freq: root * ratio * 0.75,
          endFreq: root * ratio * 0.78,
          type: idx % 2 === 0 ? 'sine' : 'triangle',
          startTime: now + idx * 0.03,
          duration: 0.36,
          gain: 0.095,
          detuneCents: 9,
          fmRatio: 2,
          fmDepth: root * 0.6,
          filterFreq: 4500,
          reverbSend: 1.0,
          pan: (idx - 1.5) * 0.2,
        });
      });
      break;
    }
  }

  // Sparkling bond-heart cascade when claiming the +15 XP daily pet bonus
  if (isFirstDailyPet) {
    [1.5, 2, 2.5].forEach((mult, idx) => {
      playRichVoice({
        freq: root * mult,
        type: 'sine',
        startTime: now + 0.18 + idx * 0.045,
        duration: 0.25,
        gain: 0.095,
        fmRatio: 3,
        fmDepth: root * 0.5,
        reverbSend: 0.95,
      });
    });
  }
}

/**
 * 5. Quest / Daily Chest Reward Claimed
 * Crisp treasure chest lock-open click + golden shimmering chord cascade.
 */
export function playQuestClaimSound(isChest = false): void {
  triggerHaptic(
    isChest ? [16, 30, 18, 30, 22, 40, 45] : [14, 26, 22]
  );
  const eng = getEngine();
  if (!eng) return;

  const now = eng.ctx.currentTime;
  const notes = isChest
    ? [587.33, 739.99, 880.0, 1174.66, 1479.98, 1760.0] // D Major 9 treasure cascade
    : [659.25, 830.61, 987.77, 1318.51]; // E Major bright badge chime

  notes.forEach((freq, idx) => {
    const isLast = idx === notes.length - 1;
    playRichVoice({
      freq,
      type: 'sine',
      startTime: now + idx * 0.045,
      duration: isLast ? 0.42 : 0.2,
      gain: isLast ? 0.13 : 0.1,
      detuneCents: 6,
      fmRatio: 2,
      fmDepth: freq * 0.5,
      woodClick: idx === 0,
      filterFreq: 5200,
      reverbSend: 0.9,
      pan: (idx / notes.length - 0.5) * 0.5,
    });
  });
}

/**
 * 6. Grand Studio Fanfare (Level Up, New Species Evolution, Goal Completed)
 */
export function playCelebrationFanfare(
  kind: 'levelUp' | 'species' | 'goal' = 'levelUp'
): void {
  triggerHaptic(
    kind === 'goal'
      ? [25, 40, 25, 40, 35, 50, 75]
      : kind === 'species'
      ? [20, 35, 20, 35, 30, 45, 55]
      : [18, 32, 20, 36, 45]
  );
  const eng = getEngine();
  if (!eng) return;

  const now = eng.ctx.currentTime;

  // Deep warm timpani/sub foundation
  playRichVoice({
    freq: 130.81, // C3
    endFreq: 65.41, // C2
    type: 'sine',
    startTime: now,
    duration: 0.35,
    gain: 0.2,
    attack: 0.008,
    reverbSend: 0.3,
  });

  const arpeggio =
    kind === 'goal'
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0] // Grand C5 -> C7 Victory
      : kind === 'species'
      ? [440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51] // Mystical Evolution A Major
      : [523.25, 659.25, 783.99, 987.77, 1046.5]; // Uplifting Level Up

  arpeggio.forEach((freq, i) => {
    const isLast = i === arpeggio.length - 1;
    const startTime = now + i * 0.058;

    playRichVoice({
      freq,
      type: isLast ? 'triangle' : 'sine',
      startTime,
      duration: isLast ? 0.75 : 0.28,
      gain: isLast ? 0.14 : 0.1,
      detuneCents: 8,
      fmRatio: 2,
      fmDepth: freq * 0.45,
      woodClick: i === 0 || isLast,
      filterFreq: 5000,
      reverbSend: 1.0,
      pan: (i / arpeggio.length - 0.5) * 0.6,
    });

    // Rich polyphonic chord pad on the final sustained note
    if (isLast) {
      [0.5, 0.625, 0.75].forEach((harmonicRatio) => {
        playRichVoice({
          freq: freq * harmonicRatio,
          type: 'sine',
          startTime,
          duration: 0.75,
          gain: 0.08,
          detuneCents: -7,
          reverbSend: 1.0,
        });
      });
    }
  });
}

// ============================================================================
// 7. PROCEDURAL AMBIENT BACKGROUND MUSIC (ADAPTIVE TO OBJECTIVE STYLE + MILD RANDOM)
// ============================================================================
interface AmbientMoodProfile {
  name: string;
  rootHz: number;
  scaleRatios: number[];
  chordRatios: [number, number, number];
  padWave: OscillatorType;
  melodyWave: OscillatorType;
  filterCutoff: number;
}

const AMBIENT_STYLE_PROFILES: Record<string, AmbientMoodProfile> = {
  '#65DB85': {
    name: 'Bosque Lidio Zen',
    rootHz: 261.63, // C4
    scaleRatios: [1, 1.122, 1.26, 1.414, 1.498, 1.682, 1.888, 2.0],
    chordRatios: [0.5, 0.749, 0.944],
    padWave: 'sine',
    melodyWave: 'sine',
    filterCutoff: 1100,
  },
  '#9B6BFF': {
    name: 'Nebulosa Astral',
    rootHz: 220.0, // A3
    scaleRatios: [1, 1.122, 1.189, 1.498, 1.682, 1.782, 2.0],
    chordRatios: [0.5, 0.749, 1.0],
    padWave: 'triangle',
    melodyWave: 'sine',
    filterCutoff: 950,
  },
  '#FFD54F': {
    name: 'Alba Dorada Maj7',
    rootHz: 293.66, // D4
    scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 1.888, 2.0],
    chordRatios: [0.5, 0.63, 0.944],
    padWave: 'triangle',
    melodyWave: 'triangle',
    filterCutoff: 1250,
  },
  '#4DD0E1': {
    name: 'Aurora Boreal Cristalina',
    rootHz: 246.94, // B3
    scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.682, 1.782, 2.0],
    chordRatios: [0.5, 0.667, 0.891],
    padWave: 'sine',
    melodyWave: 'sine',
    filterCutoff: 1350,
  },
  '#FF7043': {
    name: 'Brasa Acústica Cálida',
    rootHz: 196.0, // G3
    scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682, 2.0],
    chordRatios: [0.5, 0.63, 0.749],
    padWave: 'triangle',
    melodyWave: 'triangle',
    filterCutoff: 980,
  },
  '#FF80AB': {
    name: 'Jardín Sakura Pentatónico',
    rootHz: 277.18, // C#4
    scaleRatios: [1, 1.059, 1.335, 1.498, 1.587, 2.0],
    chordRatios: [0.5, 0.667, 0.794],
    padWave: 'sine',
    melodyWave: 'triangle',
    filterCutoff: 1180,
  },
  '#FF5252': {
    name: 'Santuario Carmesí',
    rootHz: 220.0, // A3
    scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0],
    chordRatios: [0.5, 0.749, 1.122],
    padWave: 'triangle',
    melodyWave: 'sine',
    filterCutoff: 1050,
  },
  '#64FFDA': {
    name: 'Rocío Ártico Lo-Fi',
    rootHz: 233.08, // Bb3
    scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2.0],
    chordRatios: [0.5, 0.63, 0.841],
    padWave: 'sine',
    melodyWave: 'sine',
    filterCutoff: 1080,
  },
  '#FFAB40': {
    name: 'Cuenco de Cobre Solar',
    rootHz: 207.65, // G#3
    scaleRatios: [1, 1.125, 1.25, 1.5, 1.667, 2.0],
    chordRatios: [0.5, 0.75, 1.0],
    padWave: 'sine',
    melodyWave: 'sine',
    filterCutoff: 960,
  },
  '#536DFE': {
    name: 'Océano Abisal Profundo',
    rootHz: 174.61, // F3
    scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.587, 1.782, 2.0],
    chordRatios: [0.5, 0.749, 0.891],
    padWave: 'sine',
    melodyWave: 'sine',
    filterCutoff: 820,
  },
};

let ambientTimerId: number | null = null;
let currentAmbientAccent = '#65DB85';
let currentAmbientBanner = 'gradient';
let ambientStepCounter = 0;
let lastNoteIndex = 0;

export function getAmbientMusicStyleName(accentColor?: string): string {
  const profile =
    (accentColor && AMBIENT_STYLE_PROFILES[accentColor]) ||
    AMBIENT_STYLE_PROFILES['#65DB85'];
  return profile.name;
}

function scheduleNextAmbientStep(): void {
  if (ambientTimerId !== null) {
    window.clearTimeout(ambientTimerId);
    ambientTimerId = null;
  }

  if (!currentPrefs.soundEnabled || !currentPrefs.musicEnabled) {
    return;
  }

  // Mild random timing between 2600ms and 4100ms so the background music breathes organically
  const nextDelayMs = 2600 + Math.floor(Math.random() * 1500);
  ambientTimerId = window.setTimeout(() => {
    playProceduralAmbientPhrase();
    scheduleNextAmbientStep();
  }, nextDelayMs);
}

function playProceduralAmbientPhrase(): void {
  if (!currentPrefs.soundEnabled || !currentPrefs.musicEnabled) return;
  if (typeof document !== 'undefined' && document.hidden) return;

  const eng = getEngine();
  if (!eng) return;

  const mood =
    AMBIENT_STYLE_PROFILES[currentAmbientAccent] ||
    AMBIENT_STYLE_PROFILES['#65DB85'];
  const soundPack = getActiveSoundPackProfile();
  const now = eng.ctx.currentTime;

  // Slight banner-based pitch coloration so changing banner also subtly shifts the atmosphere
  const bannerShift =
    currentAmbientBanner === 'galaxy' || currentAmbientBanner === 'aurora'
      ? 1.059
      : currentAmbientBanner === 'ocean' || currentAmbientBanner === 'abyss'
      ? 0.944
      : 1.0;

  const baseRoot =
    mood.rootHz *
    bannerShift *
    (0.85 + Math.min(1.2, Math.max(0.8, soundPack.pitchMult)) * 0.15);

  ambientStepCounter++;

  // 1. Warm breathing pad chord on every 2nd step (or with 65% probability)
  if (ambientStepCounter % 2 === 1 || Math.random() < 0.65) {
    const chordInversionShift = Math.random() < 0.28 ? 1.122 : 1.0;
    mood.chordRatios.forEach((ratio, idx) => {
      const freq = baseRoot * ratio * chordInversionShift;
      playRichVoice({
        freq,
        type: mood.padWave,
        startTime: now + idx * 0.08,
        duration: 3.4 + Math.random() * 0.9,
        gain: 0.022 + Math.random() * 0.008,
        attack: 0.95,
        detuneCents: (idx - 1) * 6 + (Math.random() * 4 - 2),
        filterFreq: mood.filterCutoff,
        reverbSend: 1.15,
        pan: (idx - 1) * 0.35,
      });
    });
  }

  // 2. Delicate Markov-walk melodic droplet (1 to 3 gentle notes)
  const noteCount = Math.random() < 0.35 ? 3 : Math.random() < 0.75 ? 2 : 1;
  for (let n = 0; n < noteCount; n++) {
    // Gentle step walk (-2, -1, +1, +2) with occasional leap
    const stepDelta =
      Math.random() < 0.75
        ? (Math.random() < 0.5 ? -1 : 1)
        : (Math.random() < 0.5 ? -2 : 2);
    lastNoteIndex =
      (lastNoteIndex + stepDelta + mood.scaleRatios.length) %
      mood.scaleRatios.length;

    const ratio = mood.scaleRatios[lastNoteIndex];
    const octaveMult = Math.random() < 0.22 ? 2.0 : 1.0;
    const noteFreq = baseRoot * ratio * octaveMult;
    const noteOffset = 0.25 + n * (0.48 + Math.random() * 0.28);

    playRichVoice({
      freq: noteFreq,
      type: mood.melodyWave,
      startTime: now + noteOffset,
      duration: 1.15 + Math.random() * 0.45,
      gain: 0.032 + Math.random() * 0.012,
      attack: 0.045,
      detuneCents: soundPack.detune * 0.6,
      fmRatio: soundPack.fmRatio,
      fmDepth: noteFreq * soundPack.fmDepthMult * 0.25,
      woodClick: false,
      filterFreq: mood.filterCutoff * 1.8,
      reverbSend: 1.2,
      pan: (Math.random() * 2 - 1) * 0.45,
    });
  }
}

export function setAmbientMusicContext(
  accentColor?: string,
  bannerId?: string
): void {
  const nextAccent = accentColor || '#65DB85';
  const nextBanner = bannerId || 'gradient';
  const changed =
    nextAccent !== currentAmbientAccent || nextBanner !== currentAmbientBanner;
  currentAmbientAccent = nextAccent;
  currentAmbientBanner = nextBanner;

  if (currentPrefs.soundEnabled && currentPrefs.musicEnabled) {
    if (ambientTimerId === null) {
      playProceduralAmbientPhrase();
      scheduleNextAmbientStep();
    } else if (changed) {
      // Gently trigger a transition phrase in the new objective's key
      playProceduralAmbientPhrase();
    }
  }
}

export function syncAmbientMusic(): void {
  if (currentPrefs.soundEnabled && currentPrefs.musicEnabled) {
    playProceduralAmbientPhrase();
    scheduleNextAmbientStep();
  } else if (ambientTimerId !== null) {
    window.clearTimeout(ambientTimerId);
    ambientTimerId = null;
  }
}

// ============================================================================
// 8. ASMR CLICKER SYNTHESIZER (5 TACTILE BINAURAL TEXTURES + PRIZE CHIME)
// ============================================================================
export interface AsmrTextureOption {
  id: 'bubbles' | 'wood' | 'purr' | 'rain' | 'chimes';
  name: string;
  emoji: string;
  subtitle: string;
  accentColor: string;
}

export const ASMR_TEXTURES: AsmrTextureOption[] = [
  {
    id: 'bubbles',
    name: 'Burbujas Cristalinas',
    emoji: '🫧',
    subtitle: 'Pop binaural de agua y cuarzo',
    accentColor: '#64D8FF',
  },
  {
    id: 'wood',
    name: 'Bambú & Madera Zen',
    emoji: '🪵',
    subtitle: 'Toque hueco de mokugyo y marimba',
    accentColor: '#FFB74D',
  },
  {
    id: 'purr',
    name: 'Ronroneo & Caricias',
    emoji: '🐾',
    subtitle: 'Pulso cálido del guardián + destello',
    accentColor: '#FF80AB',
  },
  {
    id: 'rain',
    name: 'Gotas en Cueva Astral',
    emoji: '🌧️',
    subtitle: 'Rocío resonante con eco profundo',
    accentColor: '#64FFDA',
  },
  {
    id: 'chimes',
    name: 'Campanas de Viento',
    emoji: '🎐',
    subtitle: 'Armónicos etéreos en estéreo',
    accentColor: '#D8C5FF',
  },
];

export function playAsmrClickSound(
  textureId: string = 'bubbles',
  comboCount = 0,
  isPrizeDrop = false
): void {
  triggerHaptic(isPrizeDrop ? [14, 28, 22, 35] : 8);
  const eng = getEngine();
  if (!eng) return;

  const now = eng.ctx.currentTime;
  const pan = ((comboCount % 5) - 2) * 0.22 + (Math.random() * 0.16 - 0.08);
  const pentatonic = [1, 1.122, 1.26, 1.498, 1.682, 2.0];
  const scaleRatio = pentatonic[comboCount % pentatonic.length];
  const microJitter = 0.985 + Math.random() * 0.03;

  switch (textureId) {
    case 'wood': {
      const freq = 340 * scaleRatio * microJitter;
      playRichVoice({
        freq,
        endFreq: freq * 0.92,
        type: 'triangle',
        startTime: now,
        duration: 0.14,
        gain: 0.13,
        attack: 0.003,
        fmRatio: 4,
        fmDepth: freq * 0.35,
        woodClick: true,
        filterFreq: 1900,
        reverbSend: 0.65,
        pan,
      });
      break;
    }
    case 'purr': {
      const subFreq = 110 * microJitter;
      playRichVoice({
        freq: subFreq,
        endFreq: subFreq * 1.18,
        type: 'triangle',
        startTime: now,
        duration: 0.22,
        gain: 0.12,
        attack: 0.025,
        vibratoHz: 18,
        vibratoCents: 35,
        filterFreq: 680,
        reverbSend: 0.5,
        pan: pan * 0.5,
      });
      playRichVoice({
        freq: 523.25 * scaleRatio * microJitter,
        type: 'sine',
        startTime: now + 0.02,
        duration: 0.16,
        gain: 0.06,
        attack: 0.01,
        reverbSend: 0.95,
        pan,
      });
      break;
    }
    case 'rain': {
      const dropFreq = 680 * scaleRatio * microJitter;
      playRichVoice({
        freq: dropFreq * 0.72,
        endFreq: dropFreq * 1.38,
        type: 'sine',
        startTime: now,
        duration: 0.11,
        gain: 0.11,
        attack: 0.004,
        fmRatio: 2.5,
        fmDepth: dropFreq * 0.2,
        filterFreq: 3600,
        reverbSend: 1.35,
        pan,
      });
      break;
    }
    case 'chimes': {
      const chimeFreq = 880 * scaleRatio * microJitter;
      [1, 1.498].forEach((mult, idx) => {
        playRichVoice({
          freq: chimeFreq * mult,
          type: 'sine',
          startTime: now + idx * 0.022,
          duration: 0.28,
          gain: idx === 0 ? 0.085 : 0.055,
          attack: 0.006,
          detuneCents: 8,
          fmRatio: 3.5,
          fmDepth: chimeFreq * 0.45,
          filterFreq: 5400,
          reverbSend: 1.25,
          pan: idx === 0 ? pan : -pan,
        });
      });
      break;
    }
    case 'bubbles':
    default: {
      const popFreq = 440 * scaleRatio * microJitter;
      playRichVoice({
        freq: popFreq * 0.55,
        endFreq: popFreq * 1.65,
        type: 'sine',
        startTime: now,
        duration: 0.095,
        gain: 0.12,
        attack: 0.003,
        filterFreq: 3200,
        reverbSend: 0.85,
        pan,
      });
      break;
    }
  }

  if (isPrizeDrop) {
    [587.33, 880.0, 1174.66, 1760.0].forEach((f, idx) => {
      playRichVoice({
        freq: f,
        type: 'sine',
        startTime: now + 0.04 + idx * 0.04,
        duration: 0.3,
        gain: 0.095,
        fmRatio: 2,
        fmDepth: f * 0.4,
        reverbSend: 1.1,
        pan: (idx - 1.5) * 0.25,
      });
    });
  }
}

