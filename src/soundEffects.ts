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
}

const SENSORY_STORAGE_KEY = 'ObjectiveReacher.SensoryPrefs.v1';

let currentPrefs: SensoryPreferences = loadSensoryPreferences();

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
      };
    }
  } catch {
    // ignore storage errors
  }
  return { soundEnabled: true, hapticsEnabled: true };
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

  // Warm Lydian-Pentatonic intervals (C5, D5, E5, G5, A5, C6)
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const baseFreq = scale[Math.abs(pitchIndex) % scale.length];

  playRichVoice({
    freq: baseFreq,
    endFreq: baseFreq * 1.03,
    type: 'sine',
    duration: 0.085,
    gain: 0.11,
    attack: 0.003,
    fmRatio: 3,
    fmDepth: baseFreq * 0.35,
    woodClick: true,
    reverbSend: 0.35,
  });
}

/**
 * 2. Positive Progress Registered (+ Sumar)
 * Warm sub-bass pulse + shimmering stereo kalimba-crystal chord arpeggio.
 */
export function playAddEntrySound(): void {
  triggerHaptic([14, 32, 26]);
  const eng = getEngine();
  if (!eng) return;

  const now = eng.ctx.currentTime;

  // Tactile low-end body punch
  playRichVoice({
    freq: 155,
    endFreq: 68,
    type: 'sine',
    startTime: now,
    duration: 0.13,
    gain: 0.18,
    attack: 0.004,
    reverbSend: 0.1,
  });

  // Ascending Maj9 crystal-kalimba arpeggio (C5 -> E5 -> G5 -> B5 -> D6)
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
  const pans = [-0.25, -0.1, 0, 0.15, 0.25];

  notes.forEach((freq, idx) => {
    const isFinal = idx === notes.length - 1;
    playRichVoice({
      freq,
      type: 'sine',
      startTime: now + idx * 0.048,
      duration: isFinal ? 0.38 : 0.19,
      gain: isFinal ? 0.14 : 0.1,
      attack: 0.005,
      detuneCents: isFinal ? 7 : 4,
      fmRatio: 2,
      fmDepth: freq * 0.4,
      woodClick: idx === 0 || isFinal,
      filterFreq: 4800,
      reverbSend: isFinal ? 0.95 : 0.55,
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
