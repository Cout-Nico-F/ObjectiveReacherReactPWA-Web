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

export type SynthArchitecture =
  | 'kalimba_mallet'
  | 'liquid_aquatic'
  | 'chime_crystal'
  | 'felt_lofi'
  | 'plucked_strings'
  | 'meditation_bowl'
  | 'chiptune_8bit'
  | 'synthwave_cyber'
  | 'clockwork_box'
  | 'cathedral_cosmic'
  | 'imperial_phoenix';

export interface SoundPackDSPProfile {
  arch: SynthArchitecture;
  pitchMult: number;
  wave: OscillatorType;
  fmRatio: number;
  fmDepthMult: number;
  detune: number;
  woodClick: boolean;
  reverbBoost: number;
  binauralBeatHz?: number;
  vibratoHz?: number;
  vibratoCents?: number;
  scaleRatios: [number, number, number, number, number, number];
}

export const SOUND_PACK_STEP_LABELS: [string, string, string, string, string] = [
  '1/5 · Toque UI',
  '2/5 · +Sumar Avance',
  '3/5 · −Restar Gasto',
  '4/5 · 🎯 Misión Diaria',
  '5/5 · 🏆 Fanfarria Meta',
];

const SOUND_PACK_PROFILES: Record<string, SoundPackDSPProfile> = {
  snd_kalimba_zen: { arch: 'kalimba_mallet', pitchMult: 1.0, wave: 'sine', fmRatio: 3, fmDepthMult: 0.35, detune: 5, woodClick: true, reverbBoost: 1.0, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_marimba_wood: { arch: 'kalimba_mallet', pitchMult: 0.72, wave: 'triangle', fmRatio: 4, fmDepthMult: 0.18, detune: 3, woodClick: true, reverbBoost: 0.7, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.782] },
  snd_rain_drops: { arch: 'liquid_aquatic', pitchMult: 1.12, wave: 'sine', fmRatio: 2.5, fmDepthMult: 0.25, detune: 6, woodClick: false, reverbBoost: 1.4, scaleRatios: [1, 1.122, 1.335, 1.498, 1.782, 2.0] },
  snd_wind_chimes: { arch: 'chime_crystal', pitchMult: 1.45, wave: 'sine', fmRatio: 3.73, fmDepthMult: 0.85, detune: 11, woodClick: false, reverbBoost: 1.5, scaleRatios: [1, 1.189, 1.335, 1.498, 1.782, 2.245] },
  snd_night_piano: { arch: 'felt_lofi', pitchMult: 0.68, wave: 'triangle', fmRatio: 2, fmDepthMult: 0.22, detune: 7, woodClick: true, reverbBoost: 1.3, scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.782] },
  snd_bamboo_forest: { arch: 'kalimba_mallet', pitchMult: 0.88, wave: 'sine', fmRatio: 2.82, fmDepthMult: 0.45, detune: 4, woodClick: true, reverbBoost: 0.85, scaleRatios: [1, 1.059, 1.335, 1.498, 1.587, 2.0] },
  snd_lofi_velvet: { arch: 'felt_lofi', pitchMult: 0.64, wave: 'triangle', fmRatio: 1.5, fmDepthMult: 0.15, detune: 16, vibratoHz: 4.2, vibratoCents: 22, woodClick: false, reverbBoost: 1.25, scaleRatios: [1, 1.189, 1.335, 1.498, 1.682, 1.888] },
  snd_morning_harp: { arch: 'plucked_strings', pitchMult: 0.96, wave: 'triangle', fmRatio: 2, fmDepthMult: 0.4, detune: 8, woodClick: true, reverbBoost: 1.4, scaleRatios: [1, 1.122, 1.26, 1.414, 1.498, 1.888] },
  snd_celesta_dream: { arch: 'chime_crystal', pitchMult: 1.28, wave: 'sine', fmRatio: 4, fmDepthMult: 0.65, detune: 6, woodClick: true, reverbBoost: 1.35, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_tibetan_432: { arch: 'meditation_bowl', pitchMult: 0.824, wave: 'sine', fmRatio: 2.756, fmDepthMult: 0.65, detune: 12, binauralBeatHz: 4.5, woodClick: false, reverbBoost: 1.55, scaleRatios: [1, 1.125, 1.25, 1.5, 1.667, 2.0] },
  snd_crystal_quartz: { arch: 'chime_crystal', pitchMult: 1.34, wave: 'sine', fmRatio: 3.14, fmDepthMult: 0.95, detune: 9, woodClick: false, reverbBoost: 1.5, scaleRatios: [1, 1.122, 1.26, 1.414, 1.587, 2.0] },
  snd_sakura_koto: { arch: 'plucked_strings', pitchMult: 1.02, wave: 'triangle', fmRatio: 2.5, fmDepthMult: 0.55, detune: 6, woodClick: true, reverbBoost: 1.15, scaleRatios: [1, 1.059, 1.335, 1.498, 1.587, 2.0] },
  snd_8bit_arcade: { arch: 'chiptune_8bit', pitchMult: 1.15, wave: 'square', fmRatio: 1, fmDepthMult: 0.0, detune: 0, woodClick: false, reverbBoost: 0.15, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 2.0] },
  snd_synthwave_84: { arch: 'synthwave_cyber', pitchMult: 0.76, wave: 'sawtooth', fmRatio: 2, fmDepthMult: 0.35, detune: 18, woodClick: false, reverbBoost: 1.35, scaleRatios: [1, 1.189, 1.335, 1.498, 1.782, 2.0] },
  snd_hang_drum: { arch: 'meditation_bowl', pitchMult: 0.74, wave: 'sine', fmRatio: 2.0, fmDepthMult: 0.55, detune: 9, binauralBeatHz: 3.0, woodClick: true, reverbBoost: 1.45, scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.682] },
  snd_music_box: { arch: 'clockwork_box', pitchMult: 1.48, wave: 'sine', fmRatio: 5, fmDepthMult: 0.7, detune: 4, woodClick: true, reverbBoost: 1.25, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682] },
  snd_cyber_glitch: { arch: 'synthwave_cyber', pitchMult: 1.08, wave: 'sawtooth', fmRatio: 3.5, fmDepthMult: 0.9, detune: 14, woodClick: true, reverbBoost: 0.9, scaleRatios: [1, 1.059, 1.26, 1.414, 1.498, 1.888] },
  snd_seraph_choir: { arch: 'cathedral_cosmic', pitchMult: 0.96, wave: 'triangle', fmRatio: 2, fmDepthMult: 0.25, detune: 16, vibratoHz: 5.5, vibratoCents: 18, woodClick: false, reverbBoost: 1.6, scaleRatios: [1, 1.26, 1.498, 1.682, 1.888, 2.0] },
  snd_imperial_bells: { arch: 'imperial_phoenix', pitchMult: 0.88, wave: 'sine', fmRatio: 3.46, fmDepthMult: 0.95, detune: 8, woodClick: true, reverbBoost: 1.45, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_solfeggio_528: { arch: 'meditation_bowl', pitchMult: 1.009, wave: 'sine', fmRatio: 2, fmDepthMult: 0.32, detune: 8, binauralBeatHz: 6.0, woodClick: false, reverbBoost: 1.5, scaleRatios: [1, 1.125, 1.25, 1.333, 1.5, 2.0] },
  snd_cosmic_organ: { arch: 'cathedral_cosmic', pitchMult: 0.62, wave: 'triangle', fmRatio: 1.5, fmDepthMult: 0.45, detune: 14, woodClick: false, reverbBoost: 1.6, scaleRatios: [1, 1.122, 1.335, 1.498, 1.682, 2.0] },
  snd_obsidian_gong: { arch: 'meditation_bowl', pitchMult: 0.56, wave: 'sine', fmRatio: 2.41, fmDepthMult: 1.1, detune: 12, binauralBeatHz: 3.5, woodClick: true, reverbBoost: 1.55, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_arctic_glass: { arch: 'chime_crystal', pitchMult: 1.42, wave: 'sine', fmRatio: 3.8, fmDepthMult: 0.8, detune: 6, woodClick: false, reverbBoost: 1.4, scaleRatios: [1, 1.189, 1.26, 1.498, 1.682, 2.0] },
  snd_tropical_steel: { arch: 'kalimba_mallet', pitchMult: 1.14, wave: 'triangle', fmRatio: 2.9, fmDepthMult: 0.65, detune: 13, vibratoHz: 6.0, vibratoCents: 15, woodClick: true, reverbBoost: 1.15, scaleRatios: [1, 1.122, 1.26, 1.335, 1.498, 1.682] },
  snd_steampunk_clock: { arch: 'clockwork_box', pitchMult: 1.18, wave: 'triangle', fmRatio: 4.2, fmDepthMult: 0.65, detune: 5, woodClick: true, reverbBoost: 0.8, scaleRatios: [1, 1.122, 1.189, 1.414, 1.498, 1.782] },
  snd_astral_flute: { arch: 'cathedral_cosmic', pitchMult: 1.05, wave: 'sine', fmRatio: 1.5, fmDepthMult: 0.16, detune: 9, vibratoHz: 6.2, vibratoCents: 26, woodClick: false, reverbBoost: 1.45, scaleRatios: [1, 1.122, 1.26, 1.498, 1.682, 2.0] },
  snd_emerald_lute: { arch: 'plucked_strings', pitchMult: 0.86, wave: 'triangle', fmRatio: 2.2, fmDepthMult: 0.48, detune: 7, woodClick: true, reverbBoost: 1.2, scaleRatios: [1, 1.122, 1.189, 1.335, 1.498, 1.682] },
  snd_phoenix_ember: { arch: 'imperial_phoenix', pitchMult: 1.06, wave: 'sawtooth', fmRatio: 2.5, fmDepthMult: 0.5, detune: 11, woodClick: true, reverbBoost: 1.35, scaleRatios: [1, 1.122, 1.26, 1.414, 1.498, 2.0] },
  snd_abyssal_sonar: { arch: 'liquid_aquatic', pitchMult: 0.75, wave: 'sine', fmRatio: 1.8, fmDepthMult: 0.35, detune: 8, woodClick: false, reverbBoost: 1.6, scaleRatios: [1, 1.189, 1.335, 1.498, 1.587, 2.0] },
  snd_quasar_symphony: { arch: 'imperial_phoenix', pitchMult: 1.0, wave: 'triangle', fmRatio: 3.0, fmDepthMult: 0.65, detune: 14, woodClick: true, reverbBoost: 1.55, scaleRatios: [1, 1.122, 1.26, 1.414, 1.682, 2.0] },
};

const packPreviewStepCursors: Record<string, number> = {};

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
 * Synthesizes a single note using the pack's specific SynthArchitecture
 * so different packs have radically different physical/electronic timbres, envelopes, and transients.
 */
function triggerPackArchitectureVoice(
  prof: SoundPackDSPProfile,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  pan = 0,
  isAccent = false
): void {
  const eng = getEngine();
  if (!eng) return;

  switch (prof.arch) {
    case 'chiptune_8bit': {
      // Authentic 8-bit console: fast dry square wave pulse + rapid chiptune arpeggio on accents (0 reverb)
      playRichVoice({
        freq,
        endFreq: isAccent ? freq * 1.25 : freq,
        type: 'square',
        startTime,
        duration: Math.min(duration, 0.16),
        gain: gain * 0.68,
        attack: 0.001,
        filterFreq: 4500,
        reverbSend: 0.0, // Authentic crisp dry 8-bit arcade
        pan,
      });
      // Instant arpeggio flourish (note + minor/major third + fifth)
      playRichVoice({
        freq: freq * (isAccent ? 1.5 : 1.25),
        type: 'square',
        startTime: startTime + 0.024,
        duration: 0.08,
        gain: gain * 0.52,
        attack: 0.001,
        filterFreq: 4800,
        reverbSend: 0.0,
        pan: pan * 0.5,
      });
      if (isAccent) {
        playRichVoice({
          freq: freq * 2,
          type: 'square',
          startTime: startTime + 0.048,
          duration: 0.1,
          gain: gain * 0.58,
          attack: 0.001,
          filterFreq: 5000,
          reverbSend: 0.0,
          pan: -pan * 0.5,
        });
      }
      break;
    }

    case 'liquid_aquatic': {
      // Hydro-acoustic droplet cavitation: upward pitch bend + echoed ripple droplet
      playRichVoice({
        freq: freq * 0.68,
        endFreq: freq * 1.48,
        type: 'sine',
        startTime,
        duration: Math.min(duration, 0.16),
        gain: gain * 1.05,
        attack: 0.003,
        filterFreq: 3800,
        reverbSend: 1.45,
        pan,
      });
      playRichVoice({
        freq: freq * 1.42,
        endFreq: freq * 1.65,
        type: 'sine',
        startTime: startTime + 0.065,
        duration: 0.12,
        gain: gain * 0.45,
        attack: 0.004,
        reverbSend: 1.45,
        pan: -pan * 0.7,
      });
      break;
    }

    case 'plucked_strings': {
      // Plucked string (Harp / Koto / Elven Lute): bright plectrum attack + warm body resonance + octave harmonic
      playRichVoice({
        freq,
        type: 'triangle',
        startTime,
        duration: duration * 1.25,
        gain: gain * 1.0,
        attack: 0.003,
        detuneCents: prof.detune,
        fmRatio: prof.fmRatio,
        fmDepth: freq * prof.fmDepthMult,
        woodClick: true,
        filterFreq: 4600,
        reverbSend: 1.15 * prof.reverbBoost,
        pan,
      });
      playRichVoice({
        freq: freq * 2,
        type: 'sine',
        startTime: startTime + 0.012,
        duration: duration * 0.7,
        gain: gain * 0.38,
        attack: 0.004,
        reverbSend: 1.2,
        pan: pan * 0.5,
      });
      break;
    }

    case 'felt_lofi': {
      // Acoustic Felt Piano / Lo-Fi Tape: soft hammer + warm 3rd/7th harmonic + tape wow/flutter vibrato
      playRichVoice({
        freq,
        type: 'triangle',
        startTime,
        duration: duration * 1.3,
        gain: gain * 1.05,
        attack: 0.012,
        detuneCents: prof.detune,
        vibratoHz: prof.vibratoHz || 4.0,
        vibratoCents: prof.vibratoCents || 16,
        woodClick: prof.woodClick,
        filterFreq: 1850,
        reverbSend: 1.15,
        pan,
      });
      playRichVoice({
        freq: freq * 1.498,
        type: 'sine',
        startTime: startTime + 0.01,
        duration: duration * 1.1,
        gain: gain * 0.36,
        attack: 0.018,
        filterFreq: 1400,
        reverbSend: 1.2,
        pan: -pan * 0.5,
      });
      break;
    }

    case 'meditation_bowl': {
      // Tibetan Bowl / Gong / Handpan / Solfeggio: binaural beating pair + inharmonic metallic shimmer
      const beatHz = prof.binauralBeatHz || 4.5;
      playRichVoice({
        freq,
        type: 'sine',
        startTime,
        duration: duration * 1.65,
        gain: gain * 0.95,
        attack: 0.022,
        fmRatio: prof.fmRatio,
        fmDepth: freq * prof.fmDepthMult,
        woodClick: prof.woodClick && isAccent,
        reverbSend: 1.45,
        pan: -0.25,
      });
      playRichVoice({
        freq: freq + beatHz,
        type: 'sine',
        startTime: startTime + 0.008,
        duration: duration * 1.65,
        gain: gain * 0.85,
        attack: 0.028,
        reverbSend: 1.45,
        pan: 0.25,
      });
      break;
    }

    case 'synthwave_cyber': {
      // Analog Sawtooth + Filter Sweep + Sub-Octave Synth Bass
      playRichVoice({
        freq,
        endFreq: isAccent ? freq * 1.02 : freq,
        type: 'sawtooth',
        startTime,
        duration: duration * 1.1,
        gain: gain * 0.72,
        attack: 0.006,
        detuneCents: prof.detune,
        fmRatio: prof.fmRatio,
        fmDepth: freq * prof.fmDepthMult,
        filterFreq: isAccent ? 4200 : 2600,
        reverbSend: 1.1 * prof.reverbBoost,
        pan,
      });
      playRichVoice({
        freq: freq * 0.5,
        type: 'triangle',
        startTime,
        duration: duration * 0.9,
        gain: gain * 0.55,
        attack: 0.005,
        filterFreq: 1200,
        reverbSend: 0.5,
        pan: 0,
      });
      break;
    }

    case 'clockwork_box': {
      // Precision escapement gear double-tick + crystalline music-box tine
      playRichVoice({
        freq: 2800,
        endFreq: 1900,
        type: 'triangle',
        startTime,
        duration: 0.022,
        gain: gain * 0.45,
        attack: 0.001,
        woodClick: true,
        reverbSend: 0.2,
        pan: -0.2,
      });
      playRichVoice({
        freq,
        type: 'sine',
        startTime: startTime + 0.016,
        duration: duration * 1.2,
        gain: gain * 0.95,
        attack: 0.003,
        fmRatio: prof.fmRatio,
        fmDepth: freq * prof.fmDepthMult,
        reverbSend: 1.2,
        pan,
      });
      break;
    }

    case 'cathedral_cosmic': {
      // Slow-swelling pipe organ / seraphic choir / pan flute with harmonic fifth + octave
      playRichVoice({
        freq,
        type: prof.wave,
        startTime,
        duration: duration * 1.45,
        gain: gain * 0.9,
        attack: 0.042,
        detuneCents: prof.detune,
        vibratoHz: prof.vibratoHz || 5.5,
        vibratoCents: prof.vibratoCents || 18,
        filterFreq: 3200,
        reverbSend: 1.5,
        pan,
      });
      playRichVoice({
        freq: freq * 1.498,
        type: 'sine',
        startTime: startTime + 0.015,
        duration: duration * 1.35,
        gain: gain * 0.48,
        attack: 0.05,
        reverbSend: 1.5,
        pan: -pan,
      });
      break;
    }

    case 'chime_crystal': {
      // High-purity quartz / wind-chime / celesta with ethereal FM harmonics and dual shimmer
      playRichVoice({
        freq,
        type: 'sine',
        startTime,
        duration: duration * 1.4,
        gain: gain * 0.95,
        attack: 0.003,
        detuneCents: prof.detune,
        fmRatio: prof.fmRatio || 3.1415,
        fmDepth: freq * (prof.fmDepthMult || 0.85),
        woodClick: false,
        reverbSend: 1.55,
        pan,
      });
      // Shimmering crystalline overtone
      playRichVoice({
        freq: freq * 2.756,
        type: 'sine',
        startTime: startTime + 0.015,
        duration: duration * 0.75,
        gain: gain * 0.35,
        attack: 0.002,
        reverbSend: 1.6,
        pan: -pan * 0.8,
      });
      // Higher harmonic sparkle
      if (isAccent) {
        playRichVoice({
          freq: freq * 4.236,
          type: 'sine',
          startTime: startTime + 0.03,
          duration: duration * 0.5,
          gain: gain * 0.22,
          attack: 0.002,
          reverbSend: 1.65,
          pan: pan * 0.7,
        });
      }
      break;
    }

    case 'imperial_phoenix': {
      // Royal Bronze Bell / Phoenix Fire / Quasar Symphony: rich triad + warm sub-foundation
      playRichVoice({
        freq,
        type: prof.wave,
        startTime,
        duration: duration * 1.3,
        gain: gain * 0.95,
        attack: 0.005,
        detuneCents: prof.detune,
        fmRatio: prof.fmRatio,
        fmDepth: freq * prof.fmDepthMult,
        woodClick: true,
        filterFreq: 4800,
        reverbSend: 1.4,
        pan,
      });
      if (isAccent) {
        playRichVoice({
          freq: freq * 0.5,
          type: 'triangle',
          startTime,
          duration: duration * 1.2,
          gain: gain * 0.5,
          attack: 0.008,
          reverbSend: 0.9,
          pan: 0,
        });
      }
      break;
    }

    case 'kalimba_mallet':
    default: {
      // Organic Wooden Kalimba / Marimba / Bamboo / Steel Drum with tactile physical transient
      playRichVoice({
        freq,
        endFreq: freq * 1.012,
        type: prof.wave,
        startTime,
        duration,
        gain: gain * 1.05,
        attack: 0.002,
        detuneCents: prof.detune,
        fmRatio: prof.fmRatio,
        fmDepth: freq * prof.fmDepthMult,
        vibratoHz: prof.vibratoHz,
        vibratoCents: prof.vibratoCents,
        woodClick: true, // Distinct organic mallet knock
        filterFreq: 4600,
        reverbSend: Math.min(1.3, 0.55 * prof.reverbBoost),
        pan,
      });
      // Warm woody hollow body resonance
      playRichVoice({
        freq: freq * 0.5,
        type: 'sine',
        startTime: startTime + 0.004,
        duration: duration * 0.45,
        gain: gain * 0.38,
        attack: 0.004,
        filterFreq: 850,
        reverbSend: 0.35,
        pan: pan * 0.3,
      });
      break;
    }
  }
}

/**
 * Plays 1 of the 5 distinct sounds of a given Sound Pack (`packId`):
 * - step 0: 1/5 · Toque UI (Tactile tap + harmonic grace note)
 * - step 1: 2/5 · +Sumar Avance (Rhythmic ascending impulse + bass punch)
 * - step 2: 3/5 · −Restar Gasto (Expressive descending two-step resolution)
 * - step 3: 4/5 · 🎯 Misión Diaria (Syncopated treasure unlock chord)
 * - step 4: 5/5 · 🏆 Fanfarria Meta (Grand multi-voice celebration finale)
 */
export function playPackEventByStep(
  packId: string,
  stepIndex: number,
  pitchVariant = 0
): void {
  const eng = getEngine();
  if (!eng) return;

  const prof = getActiveSoundPackProfile(packId);
  const now = eng.ctx.currentTime;
  const root = 523.25 * prof.pitchMult;
  const s = prof.scaleRatios;

  const normalizedStep = ((stepIndex % 5) + 5) % 5;

  if (normalizedStep === 0) {
    // SOUND 1/5: Tactile UI Tap (Distinct per architecture!)
    const ratio = s[Math.abs(pitchVariant) % s.length];
    const baseFreq = root * ratio;
    triggerPackArchitectureVoice(prof, baseFreq, now, 0.11, 0.11, -0.08, false);
    if (
      prof.arch === 'plucked_strings' ||
      prof.arch === 'chime_crystal' ||
      prof.arch === 'clockwork_box'
    ) {
      triggerPackArchitectureVoice(
        prof,
        baseFreq * 1.25,
        now + 0.038,
        0.09,
        0.065,
        0.12,
        false
      );
    }
    return;
  }

  if (normalizedStep === 1) {
    // SOUND 2/5: +Sumar Avance (Sub-bass body + characteristic rhythmic motif)
    playRichVoice({
      freq: 155 * Math.max(0.75, Math.min(1.25, prof.pitchMult)),
      endFreq: 68,
      type: prof.arch === 'chiptune_8bit' ? 'square' : 'sine',
      startTime: now,
      duration: 0.13,
      gain: prof.arch === 'chiptune_8bit' ? 0.1 : 0.17,
      attack: 0.004,
      reverbSend: 0.1,
    });

    const stepSpacing =
      prof.arch === 'chiptune_8bit'
        ? 0.032
        : prof.arch === 'plucked_strings'
        ? 0.038
        : prof.arch === 'meditation_bowl' || prof.arch === 'cathedral_cosmic'
        ? 0.075
        : 0.052;

    const indices = [0, 1, 2, 3, 5];
    const pans = [-0.25, -0.1, 0, 0.15, 0.25];
    indices.forEach((scaleIdx, idx) => {
      const isFinal = idx === indices.length - 1;
      const freq = root * s[scaleIdx];
      triggerPackArchitectureVoice(
        prof,
        freq,
        now + idx * stepSpacing,
        isFinal ? 0.38 : 0.18,
        isFinal ? 0.125 : 0.095,
        pans[idx],
        isFinal
      );
    });
    return;
  }

  if (normalizedStep === 2) {
    // SOUND 3/5: −Restar Gasto (Expressive descending 3-note damped motif in pack timbre)
    const descIndices = [3, 2, 0];
    const descSpacing = prof.arch === 'chiptune_8bit' ? 0.045 : 0.07;
    descIndices.forEach((scaleIdx, idx) => {
      const freq = root * 0.75 * s[scaleIdx];
      triggerPackArchitectureVoice(
        prof,
        freq,
        now + idx * descSpacing,
        idx === 2 ? 0.26 : 0.14,
        0.1,
        (1 - idx) * 0.15,
        idx === 0
      );
    });
    return;
  }

  if (normalizedStep === 3) {
    // SOUND 4/5: 🎯 Misión / Racha Reclamada (Syncopated double-pickup + bright triad bloom)
    const melody = [
      { ratio: s[0], delay: 0, dur: 0.12, accent: false },
      { ratio: s[2], delay: 0.055, dur: 0.12, accent: false },
      { ratio: s[4], delay: 0.11, dur: 0.16, accent: false },
      { ratio: s[5], delay: 0.185, dur: 0.42, accent: true },
    ];
    melody.forEach((note, idx) => {
      triggerPackArchitectureVoice(
        prof,
        root * note.ratio,
        now + note.delay,
        note.dur,
        note.accent ? 0.13 : 0.1,
        (idx - 1.5) * 0.16,
        note.accent
      );
    });
    return;
  }

  // SOUND 5/5: 🏆 Fanfarria de Logro / Nivel (Majestic multi-voice cascade + sustained chord)
  playRichVoice({
    freq: 130.81 * Math.max(0.75, Math.min(1.2, prof.pitchMult)),
    endFreq: 65.41,
    type: 'sine',
    startTime: now,
    duration: 0.34,
    gain: 0.19,
    attack: 0.006,
    reverbSend: 0.28,
  });

  const fanfareIndices = [0, 2, 3, 4, 5];
  const fanfareSpacing = prof.arch === 'chiptune_8bit' ? 0.042 : 0.062;
  fanfareIndices.forEach((scaleIdx, i) => {
    const isLast = i === fanfareIndices.length - 1;
    const t = now + i * fanfareSpacing;
    const freq = root * s[scaleIdx];
    triggerPackArchitectureVoice(
      prof,
      freq,
      t,
      isLast ? 0.65 : 0.24,
      isLast ? 0.135 : 0.1,
      (i / fanfareIndices.length - 0.5) * 0.55,
      isLast
    );
    if (isLast) {
      // Polyphonic harmony chord on the finale
      triggerPackArchitectureVoice(
        prof,
        root * s[0],
        t + 0.01,
        0.6,
        0.075,
        -0.25,
        false
      );
      triggerPackArchitectureVoice(
        prof,
        root * s[2],
        t + 0.02,
        0.6,
        0.075,
        0.25,
        false
      );
    }
  });
}

/**
 * 1. Crisp Tactile Tap for UI chips, tabs & switches shaped by active Sound Pack.
 */
export function playUiTap(pitchIndex = 0): void {
  triggerHaptic(10);
  playPackEventByStep(activeSoundPackId, 0, pitchIndex);
}

/**
 * 1b. Multi-Sound Pack Audition:
 * Every tap on "🔊 Probar" cycles through the 5 distinct sounds of that pack
 * (1/5 Toque -> 2/5 +Avance -> 3/5 -Resta -> 4/5 Misión -> 5/5 Fanfarria),
 * or plays a specific forcedStepIndex (0..4) when the user clicks an individual sound pill!
 */
export function playSoundPackPreview(
  packId: string,
  forcedStepIndex?: number
): {
  stepIndex: number;
  stepLabel: string;
  totalSteps: number;
} {
  const stepIndex =
    typeof forcedStepIndex === 'number'
      ? ((forcedStepIndex % 5) + 5) % 5
      : packPreviewStepCursors[packId] ?? 0;

  packPreviewStepCursors[packId] = (stepIndex + 1) % 5;

  const hapticPatterns: Array<number | number[]> = [
    12,
    [14, 28, 22],
    [18, 24, 12],
    [14, 24, 18, 32],
    [22, 35, 22, 35, 45],
  ];
  triggerHaptic(hapticPatterns[stepIndex] || [12, 24, 18]);

  playPackEventByStep(packId, stepIndex, stepIndex);

  return {
    stepIndex,
    stepLabel: SOUND_PACK_STEP_LABELS[stepIndex],
    totalSteps: 5,
  };
}

/**
 * 2. Positive Progress Registered (+ Sumar)
 * Uses the active Sound Pack's Sound 2/5 synthesis architecture.
 */
export function playAddEntrySound(): void {
  triggerHaptic([14, 32, 26]);
  playPackEventByStep(activeSoundPackId, 1);
}

/**
 * 3. Expense / Subtraction Registered (- Restar)
 * Uses the active Sound Pack's Sound 3/5 synthesis architecture.
 */
export function playSubtractEntrySound(): void {
  triggerHaptic([18, 25, 12]);
  playPackEventByStep(activeSoundPackId, 2);
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
 * Uses the active Sound Pack's Sound 4/5 (or 5/5 for chest) synthesis architecture.
 */
export function playQuestClaimSound(isChest = false): void {
  triggerHaptic(
    isChest ? [16, 30, 18, 30, 22, 40, 45] : [14, 26, 22]
  );
  playPackEventByStep(activeSoundPackId, isChest ? 4 : 3);
}

/**
 * 6. Grand Studio Fanfare (Level Up, New Species Evolution, Goal Completed)
 * Uses the active Sound Pack's Sound 5/5 synthesis architecture.
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
  playPackEventByStep(activeSoundPackId, 4);
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
  '#1DE9B6': {
    name: 'Dojo Samurái de Jade',
    rootHz: 293.66, // D4
    scaleRatios: [1, 1.059, 1.335, 1.498, 1.587, 2.0],
    chordRatios: [0.5, 0.749, 1.0],
    padWave: 'triangle',
    melodyWave: 'sine',
    filterCutoff: 1050,
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
// 8. ASMR CLICKER SYNTHESIZER (16 TACTILE BINAURAL TEXTURES & ORB SKINS)
// ============================================================================
export interface AsmrTextureOption {
  id:
    | 'bubbles'
    | 'wood'
    | 'purr'
    | 'rain'
    | 'chimes'
    | 'velvet_switch'
    | 'singing_bowl'
    | 'campfire'
    | 'jade_koto'
    | 'crystal_harp'
    | 'cyber_neon'
    | 'ocean_shell'
    | 'music_box'
    | 'aurora_ice'
    | 'cathedral_halo'
    | 'cosmic_quasar';
  name: string;
  emoji: string;
  subtitle: string;
  accentColor: string;
  secondaryColor: string;
  orbGradient: string;
  ringStyle: 'solid' | 'dashed' | 'double' | 'prismatic';
  unlockKind: 'free' | 'taps' | 'gems';
  requiredTaps: number;
  gemCost: number;
  badge: string;
}

export const ASMR_TEXTURES: AsmrTextureOption[] = [
  // --- 4 FREE STARTER STYLES ---
  {
    id: 'bubbles',
    name: 'Burbuja Cristalina',
    emoji: '🫧',
    subtitle: 'Pop binaural de agua y cuarzo líquido',
    accentColor: '#64D8FF',
    secondaryColor: '#1DE9B6',
    orbGradient: 'radial-gradient(circle at 32% 28%, #366B8A 0%, #1B2C42 52%, #111827 100%)',
    ringStyle: 'solid',
    unlockKind: 'free',
    requiredTaps: 0,
    gemCost: 0,
    badge: 'GRATIS',
  },
  {
    id: 'wood',
    name: 'Bambú del Bosque Zen',
    emoji: '🎋',
    subtitle: 'Toque hueco de caña de bambú y mokugyo',
    accentColor: '#82E59B',
    secondaryColor: '#FFB74D',
    orbGradient: 'radial-gradient(circle at 32% 28%, #2E6B47 0%, #1C3A2B 55%, #111D18 100%)',
    ringStyle: 'solid',
    unlockKind: 'free',
    requiredTaps: 0,
    gemCost: 0,
    badge: 'GRATIS',
  },
  {
    id: 'purr',
    name: 'Ronroneo Felino & Calidez',
    emoji: '🐾',
    subtitle: 'Rumble rítmico de afecto felino y armónico dulce',
    accentColor: '#FF80AB',
    secondaryColor: '#CE93D8',
    orbGradient: 'radial-gradient(circle at 32% 28%, #6B2D5C 0%, #321C38 55%, #181122 100%)',
    ringStyle: 'solid',
    unlockKind: 'free',
    requiredTaps: 0,
    gemCost: 0,
    badge: 'GRATIS',
  },
  {
    id: 'rain',
    name: 'Gotas en Cueva Astral',
    emoji: '🌧️',
    subtitle: 'Rocío resonante con eco profundo',
    accentColor: '#64FFDA',
    secondaryColor: '#536DFE',
    orbGradient: 'radial-gradient(circle at 32% 28%, #1E5B63 0%, #172A3A 55%, #0E1522 100%)',
    ringStyle: 'dashed',
    unlockKind: 'free',
    requiredTaps: 0,
    gemCost: 0,
    badge: 'GRATIS',
  },

  // --- 4 TAP-PROGRESSION UNLOCKABLE STYLES (FREE BY PLAYING) ---
  {
    id: 'chimes',
    name: 'Campanas de Viento',
    emoji: '🎐',
    subtitle: 'Armónicos etéreos de cristal en estéreo',
    accentColor: '#D8C5FF',
    secondaryColor: '#80DEEA',
    orbGradient: 'radial-gradient(circle at 32% 28%, #4F3B78 0%, #271F42 55%, #141126 100%)',
    ringStyle: 'dashed',
    unlockKind: 'taps',
    requiredTaps: 50,
    gemCost: 0,
    badge: 'META 50 TOQUES',
  },
  {
    id: 'velvet_switch',
    name: 'Switch Mecánico Crema',
    emoji: '⌨️',
    subtitle: 'Thock táctil de teclado custom lubed',
    accentColor: '#FFD54F',
    secondaryColor: '#FFAB91',
    orbGradient: 'radial-gradient(circle at 32% 28%, #6E5326 0%, #332718 55%, #1B1612 100%)',
    ringStyle: 'double',
    unlockKind: 'taps',
    requiredTaps: 150,
    gemCost: 0,
    badge: 'META 150 TOQUES',
  },
  {
    id: 'singing_bowl',
    name: 'Cuenco Tibetano Dorado',
    emoji: '🥣',
    subtitle: 'Batimento armónico de bronce sagrado',
    accentColor: '#FFAB40',
    secondaryColor: '#FFE082',
    orbGradient: 'radial-gradient(circle at 32% 28%, #7C4D1B 0%, #3E2613 55%, #1C130C 100%)',
    ringStyle: 'double',
    unlockKind: 'taps',
    requiredTaps: 300,
    gemCost: 0,
    badge: 'META 300 TOQUES',
  },
  {
    id: 'campfire',
    name: 'Brasa & Fuego de Hogar',
    emoji: '🔥',
    subtitle: 'Crujido cálido de leña y chispa resonante',
    accentColor: '#FF7043',
    secondaryColor: '#FFD54F',
    orbGradient: 'radial-gradient(circle at 32% 28%, #7F2B1D 0%, #3D1614 55%, #1C0D10 100%)',
    ringStyle: 'dashed',
    unlockKind: 'taps',
    requiredTaps: 500,
    gemCost: 0,
    badge: 'META 500 TOQUES',
  },

  // --- 8 COSMETIC ORB SKINS & BINAURAL SYNTHS (LIGHT GEM MONETIZATION) ---
  {
    id: 'jade_koto',
    name: 'Koto de Jade Samurái',
    emoji: '🐉',
    subtitle: 'Skin de Orbe Jade + punteo de seda oriental',
    accentColor: '#1DE9B6',
    secondaryColor: '#FFD54F',
    orbGradient: 'radial-gradient(circle at 30% 25%, #0F6954 0%, #093B31 55%, #061D19 100%)',
    ringStyle: 'double',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 45,
    badge: 'SKIN ASMR · ORIENTAL',
  },
  {
    id: 'crystal_harp',
    name: 'Arpa de Cuarzo Rosa',
    emoji: '💎',
    subtitle: 'Skin de Orbe Cuarzo + verrofono cristalino',
    accentColor: '#FF80AB',
    secondaryColor: '#80D8FF',
    orbGradient: 'radial-gradient(circle at 30% 25%, #752C58 0%, #381A3B 55%, #1A0F24 100%)',
    ringStyle: 'prismatic',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 55,
    badge: 'SKIN ASMR · CRISTAL',
  },
  {
    id: 'cyber_neon',
    name: 'Pulso Synthwave Neón',
    emoji: '⚡',
    subtitle: 'Skin Holográfica + pluck analógico retro 80s',
    accentColor: '#00E5FF',
    secondaryColor: '#FF4081',
    orbGradient: 'radial-gradient(circle at 30% 25%, #511E78 0%, #1B2454 55%, #0D1029 100%)',
    ringStyle: 'prismatic',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 60,
    badge: 'SKIN ASMR · CYBER',
  },
  {
    id: 'ocean_shell',
    name: 'Caracola de Marea Lunar',
    emoji: '🐚',
    subtitle: 'Skin Perla Abisal + eco líquido submarino',
    accentColor: '#4DD0E1',
    secondaryColor: '#B388FF',
    orbGradient: 'radial-gradient(circle at 30% 25%, #1B5878 0%, #152D4E 55%, #0B1528 100%)',
    ringStyle: 'double',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 65,
    badge: 'SKIN ASMR · OCÉANO',
  },
  {
    id: 'music_box',
    name: 'Cajita Musical Suiza',
    emoji: '🩰',
    subtitle: 'Skin Relojería + peine de plata mecánica',
    accentColor: '#FFE082',
    secondaryColor: '#F48FB1',
    orbGradient: 'radial-gradient(circle at 30% 25%, #6B4C35 0%, #362421 55%, #1A1215 100%)',
    ringStyle: 'dashed',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 75,
    badge: 'SKIN ASMR · RELOJERÍA',
  },
  {
    id: 'aurora_ice',
    name: 'Glaciar de Aurora Boreal',
    emoji: '❄️',
    subtitle: 'Skin Hielo Polar + resonancia ártica pura',
    accentColor: '#80DEEA',
    secondaryColor: '#69F0AE',
    orbGradient: 'radial-gradient(circle at 30% 25%, #1E6873 0%, #163C4D 55%, #0C1E2B 100%)',
    ringStyle: 'prismatic',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 80,
    badge: 'SKIN ASMR · BOREAL',
  },
  {
    id: 'cathedral_halo',
    name: 'Coro Celeste de Cristal',
    emoji: '👼',
    subtitle: 'Skin Serafín + acorde coral con eco infinito',
    accentColor: '#FFD54F',
    secondaryColor: '#E1BEE7',
    orbGradient: 'radial-gradient(circle at 30% 25%, #665229 0%, #332640 55%, #171224 100%)',
    ringStyle: 'prismatic',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 90,
    badge: 'SKIN ASMR · CELESTIAL',
  },
  {
    id: 'cosmic_quasar',
    name: 'Singularidad Quásar 3D',
    emoji: '🪐',
    subtitle: 'Skin Mítica + onda gravitacional binaural',
    accentColor: '#E040FB',
    secondaryColor: '#FFD740',
    orbGradient: 'radial-gradient(circle at 30% 25%, #5C1978 0%, #261447 55%, #0E0821 100%)',
    ringStyle: 'prismatic',
    unlockKind: 'gems',
    requiredTaps: 0,
    gemCost: 95,
    badge: 'SKIN ASMR · MÍTICA',
  },
];

let internalAsmrTapCounter = 0;

export function playAsmrClickSound(
  textureId: string = 'bubbles',
  comboCount = 0,
  isPrizeDrop = false
): void {
  triggerHaptic(isPrizeDrop ? [14, 28, 22, 35] : 8);
  const eng = getEngine();
  if (!eng) return;

  internalAsmrTapCounter += 1;
  const effectiveCount = comboCount > 0 ? comboCount : internalAsmrTapCounter;

  const now = eng.ctx.currentTime;
  const pan = ((effectiveCount % 5) - 2) * 0.22 + (Math.random() * 0.16 - 0.08);
  const scaleBubbles = [1, 1.122, 1.26, 1.498, 1.682, 2.0];
  const scaleWood = [1, 1.2, 1.335, 1.6, 1.8];
  const scalePurr = [1, 1.189, 1.335, 1.498, 1.782];
  const scaleRain = [1, 1.122, 1.26, 1.414, 1.682, 2.0];
  const scaleChimes = [1, 1.189, 1.335, 1.498, 1.782, 2.245];
  const scaleSwitch = [1, 1.25, 1.5, 1.75];
  const scaleBowl = [1, 1.125, 1.25, 1.5, 1.667, 2.0];
  const scaleCampfire = [1, 1.122, 1.335, 1.587, 2.0];
  const scaleKoto = [1, 1.059, 1.335, 1.498, 1.587, 2.0];
  const scaleHarp = [1, 1.189, 1.335, 1.5, 1.782, 2.0];
  const scaleCyber = [1, 1.2, 1.335, 1.5, 1.782, 2.0];
  const scaleOcean = [1, 1.122, 1.335, 1.498, 1.782];
  const scaleMusicBox = [1, 1.122, 1.26, 1.335, 1.498, 1.682, 2.0];
  const scaleIce = [1, 1.189, 1.26, 1.498, 1.682, 2.0];
  const scaleChoir = [1, 1.26, 1.498, 1.682, 1.888, 2.0];
  const scaleQuasar = [1, 1.122, 1.26, 1.414, 1.682, 2.0];

  const microJitter = 0.982 + Math.random() * 0.036;

  switch (textureId) {
    case 'wood': {
      const scaleRatio = scaleWood[effectiveCount % scaleWood.length];
      const freq = 340 * scaleRatio * microJitter;
      playRichVoice({
        freq,
        endFreq: freq * 0.91,
        type: 'triangle',
        startTime: now,
        duration: 0.14,
        gain: 0.135,
        attack: 0.002,
        fmRatio: 4,
        fmDepth: freq * 0.38,
        woodClick: true,
        filterFreq: 1950,
        reverbSend: 0.65,
        pan,
      });
      break;
    }
    case 'purr': {
      // Authentic cat purr rumble + warm velvet cuddling chime
      const scaleRatio = scalePurr[effectiveCount % scalePurr.length];
      const purrRumbleFreq = 30 + (effectiveCount % 3) * 5;
      playRichVoice({
        freq: purrRumbleFreq,
        endFreq: purrRumbleFreq * 1.4,
        type: 'sawtooth',
        startTime: now,
        duration: 0.35,
        gain: 0.16,
        attack: 0.045,
        vibratoHz: 28,
        vibratoCents: 60,
        filterFreq: 300,
        reverbSend: 0.45,
        pan: pan * 0.3,
      });
      playRichVoice({
        freq: 440 * scaleRatio * microJitter,
        endFreq: 523.25 * scaleRatio,
        type: 'sine',
        startTime: now + 0.03,
        duration: 0.25,
        gain: 0.09,
        attack: 0.012,
        filterFreq: 1800,
        reverbSend: 1.2,
        pan,
      });
      break;
    }
    case 'rain': {
      const scaleRatio = scaleRain[effectiveCount % scaleRain.length];
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
      const scaleRatio = scaleChimes[effectiveCount % scaleChimes.length];
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
    case 'velvet_switch': {
      const scaleRatio = scaleSwitch[effectiveCount % scaleSwitch.length];
      const thockFreq = (195 + (effectiveCount % 7) * 8) * scaleRatio * microJitter;
      playRichVoice({
        freq: thockFreq * 1.6,
        endFreq: thockFreq * 0.72,
        type: 'triangle',
        startTime: now,
        duration: 0.055,
        gain: 0.15,
        attack: 0.002,
        woodClick: true,
        filterFreq: 1350,
        reverbSend: 0.32,
        pan,
      });
      playRichVoice({
        freq: thockFreq * 1.25 * (0.95 + (effectiveCount % 4) * 0.04),
        endFreq: thockFreq * 0.88,
        type: 'sine',
        startTime: now + 0.036,
        duration: 0.065,
        gain: 0.11,
        attack: 0.002,
        woodClick: true,
        filterFreq: 1650,
        reverbSend: 0.38,
        pan: -pan * 0.4,
      });
      break;
    }
    case 'singing_bowl': {
      const scaleRatio = scaleBowl[effectiveCount % scaleBowl.length];
      const bowlFreq = 392 * scaleRatio * microJitter;
      playRichVoice({
        freq: bowlFreq,
        type: 'sine',
        startTime: now,
        duration: 0.42,
        gain: 0.105,
        attack: 0.012,
        detuneCents: 6,
        fmRatio: 2.756,
        fmDepth: bowlFreq * 0.28,
        filterFreq: 2600,
        reverbSend: 1.3,
        pan,
      });
      playRichVoice({
        freq: bowlFreq * 1.006,
        type: 'sine',
        startTime: now + 0.008,
        duration: 0.44,
        gain: 0.075,
        attack: 0.018,
        reverbSend: 1.35,
        pan: -pan,
      });
      break;
    }
    case 'campfire': {
      const scaleRatio = scaleCampfire[effectiveCount % scaleCampfire.length];
      const emberFreq = 260 * scaleRatio * microJitter;
      playRichVoice({
        freq: emberFreq * 2.4,
        endFreq: emberFreq * 0.9,
        type: 'sawtooth',
        startTime: now,
        duration: 0.045,
        gain: 0.07,
        attack: 0.002,
        woodClick: true,
        filterFreq: 1800,
        reverbSend: 0.5,
        pan,
      });
      playRichVoice({
        freq: emberFreq,
        endFreq: emberFreq * 0.84,
        type: 'triangle',
        startTime: now + 0.015,
        duration: 0.2,
        gain: 0.115,
        attack: 0.01,
        filterFreq: 1100,
        reverbSend: 0.85,
        pan: pan * 0.6,
      });
      break;
    }
    case 'jade_koto': {
      const scaleRatio = scaleKoto[effectiveCount % scaleKoto.length];
      const kotoFreq = 440 * scaleRatio * microJitter;
      playRichVoice({
        freq: kotoFreq,
        endFreq: kotoFreq * 0.992,
        type: 'sawtooth',
        startTime: now,
        duration: 0.24,
        gain: 0.11,
        attack: 0.003,
        fmRatio: 2,
        fmDepth: kotoFreq * 0.65,
        woodClick: true,
        filterFreq: 2700,
        reverbSend: 1.05,
        pan,
      });
      playRichVoice({
        freq: kotoFreq * 1.5,
        type: 'sine',
        startTime: now + 0.032,
        duration: 0.2,
        gain: 0.065,
        attack: 0.005,
        reverbSend: 1.15,
        pan: -pan * 0.7,
      });
      break;
    }
    case 'crystal_harp': {
      const scaleRatio = scaleHarp[effectiveCount % scaleHarp.length];
      const glassFreq = 740 * scaleRatio * microJitter;
      playRichVoice({
        freq: glassFreq,
        type: 'sine',
        startTime: now,
        duration: 0.34,
        gain: 0.1,
        attack: 0.014,
        detuneCents: 9,
        fmRatio: 3.0,
        fmDepth: glassFreq * 0.55,
        filterFreq: 5800,
        reverbSend: 1.4,
        pan,
      });
      break;
    }
    case 'cyber_neon': {
      const scaleRatio = scaleCyber[effectiveCount % scaleCyber.length];
      const neonFreq = 330 * scaleRatio * microJitter;
      playRichVoice({
        freq: neonFreq * 1.01,
        endFreq: neonFreq,
        type: 'sawtooth',
        startTime: now,
        duration: 0.18,
        gain: 0.1,
        attack: 0.004,
        detuneCents: 14,
        fmRatio: 1.5,
        fmDepth: neonFreq * 0.45,
        filterFreq: 2900,
        reverbSend: 0.95,
        pan,
      });
      playRichVoice({
        freq: neonFreq * 0.5,
        type: 'triangle',
        startTime: now,
        duration: 0.16,
        gain: 0.09,
        attack: 0.004,
        filterFreq: 900,
        reverbSend: 0.5,
        pan: 0,
      });
      break;
    }
    case 'ocean_shell': {
      const scaleRatio = scaleOcean[effectiveCount % scaleOcean.length];
      const tideFreq = 370 * scaleRatio * microJitter;
      playRichVoice({
        freq: tideFreq * 0.65,
        endFreq: tideFreq * 1.35,
        type: 'sine',
        startTime: now,
        duration: 0.16,
        gain: 0.11,
        attack: 0.006,
        vibratoHz: 9,
        vibratoCents: 22,
        filterFreq: 2400,
        reverbSend: 1.35,
        pan,
      });
      playRichVoice({
        freq: tideFreq * 1.5,
        endFreq: tideFreq * 1.85,
        type: 'sine',
        startTime: now + 0.04,
        duration: 0.14,
        gain: 0.065,
        attack: 0.004,
        reverbSend: 1.35,
        pan: -pan,
      });
      break;
    }
    case 'music_box': {
      const scaleRatio = scaleMusicBox[effectiveCount % scaleMusicBox.length];
      const boxFreq = 987.77 * scaleRatio * microJitter;
      playRichVoice({
        freq: 2600,
        endFreq: 1400,
        type: 'triangle',
        startTime: now,
        duration: 0.022,
        gain: 0.055,
        attack: 0.001,
        woodClick: true,
        pan,
      });
      playRichVoice({
        freq: boxFreq,
        type: 'sine',
        startTime: now + 0.008,
        duration: 0.28,
        gain: 0.095,
        attack: 0.003,
        fmRatio: 4.0,
        fmDepth: boxFreq * 0.4,
        filterFreq: 6200,
        reverbSend: 1.15,
        pan,
      });
      break;
    }
    case 'aurora_ice': {
      const scaleRatio = scaleIce[effectiveCount % scaleIce.length];
      const iceFreq = 783.99 * scaleRatio * microJitter;
      playRichVoice({
        freq: iceFreq,
        endFreq: iceFreq * 1.12,
        type: 'sine',
        startTime: now,
        duration: 0.24,
        gain: 0.095,
        attack: 0.003,
        detuneCents: 11,
        fmRatio: 3.5,
        fmDepth: iceFreq * 0.7,
        filterFreq: 5600,
        reverbSend: 1.35,
        pan,
      });
      playRichVoice({
        freq: iceFreq * 0.25,
        type: 'sine',
        startTime: now,
        duration: 0.22,
        gain: 0.085,
        attack: 0.01,
        reverbSend: 0.8,
        pan: 0,
      });
      break;
    }
    case 'cathedral_halo': {
      const scaleRatio = scaleChoir[effectiveCount % scaleChoir.length];
      const choirFreq = 440 * scaleRatio * microJitter;
      [1, 1.25, 1.5].forEach((mult, idx) => {
        playRichVoice({
          freq: choirFreq * mult,
          type: idx === 1 ? 'triangle' : 'sine',
          startTime: now + idx * 0.018,
          duration: 0.38,
          gain: 0.065,
          attack: 0.025,
          detuneCents: 8,
          filterFreq: 3200,
          reverbSend: 1.45,
          pan: (idx - 1) * 0.35,
        });
      });
      break;
    }
    case 'cosmic_quasar': {
      const scaleRatio = scaleQuasar[effectiveCount % scaleQuasar.length];
      const quasarFreq = 392 * scaleRatio * microJitter;
      playRichVoice({
        freq: quasarFreq * 0.5,
        endFreq: quasarFreq * 1.5,
        type: 'sine',
        startTime: now,
        duration: 0.26,
        gain: 0.11,
        attack: 0.008,
        vibratoHz: 11,
        vibratoCents: 28,
        fmRatio: 2.0,
        fmDepth: quasarFreq * 0.5,
        filterFreq: 4200,
        reverbSend: 1.4,
        pan,
      });
      playRichVoice({
        freq: quasarFreq * 2.0,
        endFreq: quasarFreq * 2.5,
        type: 'triangle',
        startTime: now + 0.035,
        duration: 0.24,
        gain: 0.07,
        attack: 0.005,
        reverbSend: 1.45,
        pan: -pan,
      });
      break;
    }
    case 'bubbles':
    default: {
      const scaleRatio = scaleBubbles[effectiveCount % scaleBubbles.length];
      const popFreq = 440 * scaleRatio * microJitter;
      playRichVoice({
        freq: popFreq * 0.55,
        endFreq: popFreq * (1.42 + (effectiveCount % 4) * 0.1),
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

