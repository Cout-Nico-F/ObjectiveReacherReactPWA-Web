import fs from 'fs';

let content = fs.readFileSync('src/i18n.ts', 'utf8');

const newInterfaceProps = `
  // Daily Quests Localized
  questPetTitle: string;
  questPetSub: string;
  questEntryTitle: string;
  questEntrySub: string;
  questMindfulTitle: string;
  questMindfulSub: string;

  // Mascot Stages & Dialogs
  mascotStageNames: string[];
  mascotStageHints: string[];
  mascotMessages: string[];
  newSpeciesUnlocked: string;
  levelUpCelebration: (lvl: number) => string;
  petGreetNoEntry: string;
  petGreetStreak: (days: number) => string;
  petGreetLevelsLeft: (levels: number) => string;
  petGreetMax: string;
  petGreetObjectiveSurpassed: (title: string) => string;
  petGreetObjectiveRemaining: (title: string, amt: string) => string;
  petGreetThanks: string;
  creatureLockedYet: string;
  lockedLevelCreature: (lvl: number) => string;
  unlockedLevelCreature: (lvl: number, name: string) => string;
  spyLevelSilhouette: (lvl: number, hint: string) => string;
  reachLevelToUnlockSpecies: (lvl: number) => string;
  reachLevelForSkinAura: (lvl: number, skinName: string) => string;
  tapToHearBioVoice: string;

  // ASMR Rewards
  asmrUnlockedTapStyle: (name: string, emoji: string, taps: number, gemsText: string, xp: number) => string;
  asmrLuckBonus: (gems: number, cur: number, max: number, xp: number) => string;
  asmrZenCapBonus: (xp: number, max: number) => string;

  // Objective Editor & Form Alerts
  saveErrorAlert: string;
  deleteEntryHistoryPrompt: string;
  deleteConfirmAction: string;
  invalidGoalAmountAlert: string;
  invalidGoalAmountDesc: string;
  maxGoalAmountReachedAlert: string;
  selectGalleryImageFirstAlert: string;
  invalidAmountAlert: string;
  invalidAmountDesc: string;
  maxAmountExceededAlert: string;
  changedGoalNameProtection: (oldT: string, newT: string) => string;
  createGoalModalTitle: string;
  editGoalModalTitle: string;
  createGoalModalSub: string;
  editGoalModalSub: string;
  defaultGoalTitle: string;
  pledgePreviewLabel: (pledge: string) => string;
  liveColorTuningPreview: string;
  placeholderGoalTitle: string;
  placeholderGoalCategory: string;
  placeholderGoalPledge: string;
  createGoalSubmit: string;
  saveGoalChangesSubmit: string;
  cropImageHint: string;
  goalAmountInputLabel: string;
  goalDateInputLabel: string;
  goalAccentThemeLabel: string;
  startCleanGoalPrompt: string;
  startCleanGoalBtn: string;

  // Audio Packs & Audition
  soundPackSteps: [string, string, string, string, string];
  soundPackPads: [string, string, string, string, string];
  soundPackAuditionTooltip: (step: string, name: string) => string;
  soundPackActivatedNotice: (name: string) => string;
  soundPackEngineNotice: (engine: string) => string;
  acousticEnginesBadge: (c: number) => string;

  // Portrait Monetization & Indie Support
  headerSupportDev: string;
  headerSupportDevTooltip: string;
  freeTipTag: string;
  tipCardTitle: string;
  tipCardSubtitle: string;
  tipGratitudeReward: string;
  tipFounderIncluded: string;
  tipCustomAmountBtn: string;
  tipCustomAmountSub: string;
  tipPresets: Array<{ amount: string; label: string; tag: string }>;
  tipInputAria: string;
  payMpTipBtn: (usd: string, ars: string, gems: number) => string;
  payPaypalTipBtn: (usd: string, gems: number) => string;
  equippedFrameNotice: (name: string) => string;
  equippedFrameCardSub: (title: string) => string;
  themeAppliedNotice: (title: string) => string;
  applyThemeNow: string;
  themeEquipped: string;
  titleEquippedBadge: string;
  equipTitleBtn: string;
  relicInSanctuary: string;
  blessingClaimed: string;
  requiresGuardianLevel: (lvl: number) => string;
  copyCodeBtn: string;
  codeCopiedBtn: string;
  licenseInputPlaceholder: string;
  astralGemsTooltip: string;
  tabThemesVault: (c: number) => string;
  tabTitlesVault: (c: number) => string;
  categoryFallback: string;

  // Serene Progress Mode
  sereneFocusMode: string;
  sereneFocusSubtitle: string;
  projectedRemaining: (rem: string, pct: number) => string;
  dailyBonusIncluded: string;
  streakMultiplier: (days: number) => string;
  goalCompletedCelebration: string;
  remainingToGoalShort: (amt: string) => string;
`;

const esAdditions = `
    // Daily Quests Localized
    questPetTitle: 'Vínculo con tu Guardián',
    questPetSub: 'Toca a tu mascota para animarla hoy',
    questEntryTitle: 'Impulso del Día',
    questEntrySub: 'Registra al menos 1 movimiento hoy',
    questMindfulTitle: 'Aporte con Propósito',
    questMindfulSub: 'Suma un aporte con nota personalizada hoy',

    // Mascot Stages & Dialogs
    mascotStageNames: [
      'Brote Esmeralda', 'Espíritu Neko', 'Zorro Kitsune', 'Búho Sabio', 'Lobo Boreal',
      'Tigre Guardián', 'León Solar', 'Ciervo del Bosque', 'Fénix Carmesí', 'Gólem de Cristal',
      'Kraken Abisal', 'Cronos Autómata', 'Dragón Imperial', 'Polilla Astral', 'Serafín Ophanim',
      'Hidra Tricéfala', 'Djinn Astral', 'Valkiria Celestial', 'Arquitecto Merkaba', 'Singularidad Cósmica'
    ],
    mascotStageHints: [
      'Una pequeña semilla que germina con tus primeros pasos.',
      'Un espíritu felino curioso que trae fortuna a quienes perseveran.',
      'Sus colas místicas se multiplican con cada nuevo nivel.',
      'Sus grandes ojos ven la meta incluso en la noche más oscura.',
      'Aúlla bajo la aurora boreal guiando tu racha.',
      'Sus colmillos y rayas protegen el progreso alcanzado.',
      'Una melena de fuego solar que arde con tu disciplina.',
      'En sus astas milenarias florece la constancia del bosque.',
      'Renace de las cenizas desplegando alas incandescentes.',
      'Un coloso hexagonal tallado en cristal rúnico viviente.',
      'Sus tentáculos emergen de las profundidades abisales.',
      'Engranajes eternos y agujas doradas que dominan el tiempo.',
      'Custodia la perla imperial entre las nubes orientales.',
      'Cuatro alas lunares con ocelos que reflejan las galaxias.',
      'Anillos entrelazados y seis alas de fuego sagrado.',
      'Tres cabezas legendarias que jamás retroceden ante un reto.',
      'Emerge de un vórtice estelar para conceder grandes metas.',
      'Yelmo alado y visor resplandeciente de los salones eternos.',
      'Geometría sagrada multidimensional que trasciende el espacio.',
      'Un quásar viviente coronado en el centro del universo.'
    ],
    mascotMessages: [
      'Brote Esmeralda · Tu viaje acaba de comenzar 💪',
      'Espíritu Neko · ¡Buen comienzo, sigue así!',
      'Zorro Kitsune · Tu constancia multiplica tu energía',
      'Búho Sabio · Visión clara hacia tu objetivo',
      'Lobo Boreal · Paso firme bajo la aurora',
      'Tigre Guardián · ¡Tu esfuerzo está creciendo!',
      'León Solar · Tu disciplina brilla con fuerza',
      'Ciervo del Bosque · Armonía y avance constante',
      'Fénix Carmesí · Volando alto con alas de fuego',
      'Gólem de Cristal · Fortaleza rúnica inquebrantable',
      'Kraken Abisal · ¡Has superado el nivel 100!',
      'Cronos Autómata · Dominando cada segundo hacia la meta',
      'Dragón Imperial · ¡Has superado los 120 niveles!',
      'Polilla Astral · Alas lunares que cruzan el cosmos',
      'Serafín Ophanim · Seis alas y anillos de fuego sagrado',
      'Hidra Tricéfala · Tres voluntades unidas por tu objetivo',
      'Djinn Astral · Poder místico desatado a tu favor',
      'Valkiria Celestial · Honor y victoria en cada aporte',
      'Arquitecto Merkaba · Geometría sagrada del progreso',
      '¡Singularidad Cósmica! Leyenda suprema del universo'
    ],
    newSpeciesUnlocked: '¡Nueva especie desbloqueada!',
    levelUpCelebration: (lvl) => \`¡Subiste al Nivel \${lvl}!\`,
    petGreetNoEntry: '¡Qué alegría verte hoy! Un pequeño aporte encenderá nuestra racha 🔥',
    petGreetStreak: (d) => \`¡Eso es! Ya llevamos \${d} \${d === 1 ? 'día' : 'días'} seguidos brillando ✨\`,
    petGreetLevelsLeft: (l) => \`¡Siento el poder crecer! Solo \${l} \${l === 1 ? 'nivel' : 'niveles'} más para descubrir una nueva especie 🐾\`,
    petGreetMax: '¡Hemos alcanzado la cumbre cósmica juntos! 🪐',
    petGreetObjectiveSurpassed: (t) => \`¡Completamos «\${t}»! Eres imparable 🏆\`,
    petGreetObjectiveRemaining: (t, a) => \`¡Vamos por «\${t}»! Faltan \${a} 🚀\`,
    petGreetThanks: '¡Gracias por cuidarme! Cada paso tuyo me hace evolucionar 💖',
    creatureLockedYet: 'Criatura aún bloqueada',
    lockedLevelCreature: (lvl) => \`🔒 Nivel \${lvl} · Criatura Misteriosa\`,
    unlockedLevelCreature: (lvl, name) => \`✨ Nivel \${lvl} · \${name}\`,
    spyLevelSilhouette: (lvl, hint) => \`Espiar silueta de Nivel \${lvl}: \${hint}\`,
    reachLevelToUnlockSpecies: (lvl) => \`Especie de Nivel \${lvl} aún bloqueada (Alcanza el Nivel \${lvl} para revelarla)\`,
    reachLevelForSkinAura: (lvl, skin) => \`🔒 Sube a Nivel \${lvl} para desbloquear esta especie sin spoilers. Puedes apreciar el anillo exterior de «\${skin}» sobre su silueta.\`,
    tapToHearBioVoice: 'Toca para escuchar la voz bio-acústica de esta especie',

    // ASMR Rewards
    asmrUnlockedTapStyle: (name, emoji, taps, gemsText, xp) => \`🎉 ¡DESBLOQUEASTE «\${name}» (\${emoji}) por alcanzar \${taps} toques! \${gemsText}+\${xp} XP\`,
    asmrLuckBonus: (gems, cur, max, xp) => \`🎁 ¡Suerte y Armonía ASMR! +\${gems} 💎 (\${cur}/\${max} hoy) y +\${xp} XP\`,
    asmrZenCapBonus: (xp, max) => \`🧘 ¡Armonía Zen! +\${xp} XP de Calma (Tope diario de \${max} 💎 alcanzado hoy)\`,

    // Objective Editor & Form Alerts
    saveErrorAlert: 'No se pudo guardar el progreso. Los cambios podrían perderse al cerrar la app.',
    deleteEntryHistoryPrompt: '¿Eliminar esta entrada del historial?',
    deleteConfirmAction: 'Eliminar',
    invalidGoalAmountAlert: 'Monto no válido',
    invalidGoalAmountDesc: 'El monto objetivo debe ser un número mayor que cero.',
    maxGoalAmountReachedAlert: 'Meta máxima alcanzada',
    selectGalleryImageFirstAlert: 'Selecciona primero una imagen de la galería.',
    invalidAmountAlert: 'Importe no válido',
    invalidAmountDesc: 'Escribe un importe mayor que cero.',
    maxAmountExceededAlert: 'Importe máximo superado',
    changedGoalNameProtection: (oldT, newT) => \`Cambiaste el objetivo «\${oldT}» por «\${newT}», una meta distinta.\`,
    createGoalModalTitle: '＋ Crear Nuevo Objetivo',
    editGoalModalTitle: '🎨 Personalizar Objetivo',
    createGoalModalSub: 'Elige una plantilla prediseñada o crea tu meta a medida con sintonía total de color.',
    editGoalModalSub: 'Personaliza colores, fondo, fecha meta o premio. Si cambias de meta, protegemos tu historial.',
    defaultGoalTitle: 'Tu Próxima Gran Meta',
    pledgePreviewLabel: (p) => \`🎁 Premio: \${p}\`,
    liveColorTuningPreview: 'Vista previa en vivo con sintonía cromática completa',
    placeholderGoalTitle: 'Ej. Viaje a Japón, Fondo de Paz…',
    placeholderGoalCategory: 'Finanzas, Aventura, Salud, Hábito…',
    placeholderGoalPledge: 'Ej. Cena especial, día libre, festejar…',
    createGoalSubmit: '🚀 Crear Objetivo',
    saveGoalChangesSubmit: '✓ Guardar Cambios',
    cropImageHint: 'Selecciona una foto para encuadrarla aquí\\narrastra para moverla',
    goalAmountInputLabel: 'Monto o cantidad meta',
    goalDateInputLabel: 'Fecha meta (opcional)',
    goalAccentThemeLabel: 'COLOR DE ENERGÍA (SINTONÍA TOTAL)',
    startCleanGoalPrompt: '💡 ¿Estás queriendo crear un Nuevo Objetivo en realidad?',
    startCleanGoalBtn: 'Empezar limpio',

    // Audio Packs & Audition
    soundPackSteps: ['1/5 · Toque UI', '2/5 · +Sumar Avance', '3/5 · −Restar Gasto', '4/5 · 🎯 Misión Diaria', '5/5 · 🏆 Fanfarria Meta'],
    soundPackPads: ['1·Toque', '2·+Suma', '3·−Resta', '4·Misión', '5·Logro'],
    soundPackAuditionTooltip: (step, name) => \`Escuchar \${step} de \${name}\`,
    soundPackActivatedNotice: (name) => \`¡Pack de 5 Sonidos "\${name}" activado!\`,
    soundPackEngineNotice: (engine) => \`Motor \${engine} activo en toda la app\`,
    acousticEnginesBadge: (c) => \`\${c} motores acústicos\`,

    // Portrait Monetization & Indie Support
    headerSupportDev: '💎 Apoyar',
    headerSupportDevTooltip: 'Apoyar al creador independiente y obtener gemas',
    freeTipTag: '💖 PROPINA LIBRE · TÚ ELIGES EL MONTO',
    tipCardTitle: '☕ Propina al Desarrollador (Editable al instante)',
    tipCardSubtitle: 'Elige un botón rápido o edita manualmente la cantidad exacta que quieras aportar:',
    tipGratitudeReward: 'Recompensa de agradecimiento:',
    tipFounderIncluded: '👑 ¡Incluye Pase Fundador Indie!',
    tipCustomAmountBtn: '✏️ Otro monto',
    tipCustomAmountSub: 'Editar libremente',
    tipPresets: [
      { amount: '1.00', label: '$1 USD', tag: '🧉 Un Mate' },
      { amount: '2.00', label: '$2 USD', tag: '☕ Café Indie' },
      { amount: '5.00', label: '$5 USD', tag: '👑 Pase Fundador' },
      { amount: '10.00', label: '$10 USD', tag: '🚀 Impulso Épico' }
    ],
    tipInputAria: 'Monto de propina en USD',
    payMpTipBtn: (usd, ars, gems) => \`🤝 Aportar con Mercado Pago ($\${usd} USD · ~$\${ars} ARS)\`,
    payPaypalTipBtn: (usd, gems) => \`🌍 Aportar con PayPal / GPay ($\${usd} USD)\`,
    equippedFrameNotice: (name) => \`¡Marco "\${name}" equipado en vivo!\`,
    equippedFrameCardSub: (title) => \`Míralo aplicado arriba en tu tarjeta «\${title}»\`,
    themeAppliedNotice: (title) => \`Tu tarjeta «\${title}» ya luce esta sintonía arriba y en el tablero\`,
    applyThemeNow: '🌈 Aplicar Sintonía Ahora',
    themeEquipped: '✓ Sintonía Aplicada',
    titleEquippedBadge: '✓ Título Equipado',
    equipTitleBtn: '🏅 Equipar Título',
    relicInSanctuary: '✓ Reliquia en tu Santuario',
    blessingClaimed: '✓ Bendición Reclamada',
    requiresGuardianLevel: (lvl) => \`🔒 Requiere Guardián Nv. \${lvl}\`,
    copyCodeBtn: '📋 Copiar Código',
    codeCopiedBtn: '✓ Copiado',
    licenseInputPlaceholder: 'Pega aquí tu código OR-PRO-...',
    astralGemsTooltip: 'Tus Gemas Astrales (toca para obtener más o apoyar al creador)',
    tabThemesVault: (c) => \`🌈 Sintonías (\${c})\`,
    tabTitlesVault: (c) => \`🏅 Títulos (\${c})\`,
    categoryFallback: 'Objetivo',

    // Serene Progress Mode
    sereneFocusMode: '🌱 Modo Enfoque Sereno',
    sereneFocusSubtitle: 'Prioriza tu meta y números reales sin saturación',
    projectedRemaining: (rem, pct) => \`Quedan \${rem} (\${pct}%) para tu meta\`,
    dailyBonusIncluded: 'incluye bono diario',
    streakMultiplier: (d) => \`racha x\${d}d\`,
    goalCompletedCelebration: '¡Objetivo completado!',
    remainingToGoalShort: (amt) => \`¡A solo \${amt} de la meta! Un último impulso 🚀\`,
`;

const enAdditions = `
    // Daily Quests Localized
    questPetTitle: 'Bond with Guardian',
    questPetSub: 'Tap your pet to cheer it up today',
    questEntryTitle: 'Daily Impulse',
    questEntrySub: 'Log at least 1 movement today',
    questMindfulTitle: 'Mindful Contribution',
    questMindfulSub: 'Log a progress entry with a custom note today',

    // Mascot Stages & Dialogs
    mascotStageNames: [
      'Emerald Sprout', 'Neko Spirit', 'Kitsune Fox', 'Wise Owl', 'Boreal Wolf',
      'Guardian Tiger', 'Solar Lion', 'Forest Stag', 'Crimson Phoenix', 'Crystal Golem',
      'Abyssal Kraken', 'Chronos Automaton', 'Imperial Dragon', 'Astral Moth', 'Seraph Ophanim',
      'Three-Headed Hydra', 'Astral Djinn', 'Celestial Valkyrie', 'Merkaba Architect', 'Cosmic Singularity'
    ],
    mascotStageHints: [
      'A tiny seed germinating with your very first steps.',
      'A curious feline spirit bringing fortune to persistent minds.',
      'Its mystic tails multiply with every new milestone.',
      'Its wide eyes watch the goal even through the darkest night.',
      'Howling beneath the northern lights to guide your streak.',
      'Fangs and stripes guarding your hard-earned progress.',
      'A mane of solar fire burning alongside your discipline.',
      'Ancient antlers blooming with steady forest perseverance.',
      'Rising from ashes spreading incandescent wings.',
      'A living runic crystal colossus of unbreakable will.',
      'Tentacles emerging from the deep abyssal trenches.',
      'Timeless brass gears mastering every passing second.',
      'Guarding the imperial pearl high above eastern clouds.',
      'Four lunar wings with celestial eyes reflecting galaxies.',
      'Interlocking golden wheels and six wings of holy flame.',
      'Three legendary heads that never back away from a challenge.',
      'Emerging from a stellar vortex to fulfill monumental goals.',
      'Winged helmet and shining visor from eternal halls.',
      'Sacred multidimensional geometry transcending physical space.',
      'A living quasar crowned at the heart of the universe.'
    ],
    mascotMessages: [
      'Emerald Sprout · Your journey has just begun 💪',
      'Neko Spirit · Great start, keep going!',
      'Kitsune Fox · Your consistency multiplies your energy',
      'Wise Owl · Clear vision straight toward your goal',
      'Boreal Wolf · Steady stride beneath the aurora',
      'Guardian Tiger · Your efforts are growing strong!',
      'Solar Lion · Your discipline shines bright',
      'Forest Stag · Harmony and continuous forward motion',
      'Crimson Phoenix · Soaring high on fiery wings',
      'Crystal Golem · Unbreakable runic strength',
      'Abyssal Kraken · You have pushed past level 100!',
      'Chronos Automaton · Mastering every second toward success',
      'Imperial Dragon · You have surpassed 120 levels!',
      'Astral Moth · Lunar wings crossing the cosmos',
      'Seraph Ophanim · Six wings and rings of holy fire',
      'Three-Headed Hydra · Three wills united for your objective',
      'Astral Djinn · Mystical energy unleashed for you',
      'Celestial Valkyrie · Honor and victory in every step',
      'Merkaba Architect · Sacred geometry of self-mastery',
      'Cosmic Singularity! Supreme legend of the universe'
    ],
    newSpeciesUnlocked: 'New species unlocked!',
    levelUpCelebration: (lvl) => \`Level Up! You reached Lv. \${lvl}!\`,
    petGreetNoEntry: 'So glad to see you today! A small step keeps our flame burning bright 🔥',
    petGreetStreak: (d) => \`That is it! We have been glowing for \${d} \${d === 1 ? 'day' : 'days'} in a row ✨\`,
    petGreetLevelsLeft: (l) => \`I feel the power growing! Just \${l} more \${l === 1 ? 'level' : 'levels'} to meet a new species 🐾\`,
    petGreetMax: 'We have reached the cosmic pinnacle together! 🪐',
    petGreetObjectiveSurpassed: (t) => \`We completed "\${t}"! You are unstoppable 🏆\`,
    petGreetObjectiveRemaining: (t, a) => \`Let us reach "\${t}"! Only \${a} left 🚀\`,
    petGreetThanks: 'Thank you for taking care of me! Every step makes me evolve 💖',
    creatureLockedYet: 'Creature still locked',
    lockedLevelCreature: (lvl) => \`🔒 Level \${lvl} · Mysterious Creature\`,
    unlockedLevelCreature: (lvl, name) => \`✨ Level \${lvl} · \${name}\`,
    spyLevelSilhouette: (lvl, hint) => \`Preview Level \${lvl} silhouette: \${hint}\`,
    reachLevelToUnlockSpecies: (lvl) => \`Level \${lvl} species locked (Reach Level \${lvl} to reveal)\`,
    reachLevelForSkinAura: (lvl, skin) => \`🔒 Reach Level \${lvl} to reveal this species spoiler-free. You can preview "\${skin}" aura around its outline.\`,
    tapToHearBioVoice: 'Tap to listen to this creature bio-acoustic voice',

    // ASMR Rewards
    asmrUnlockedTapStyle: (name, emoji, taps, gemsText, xp) => \`🎉 UNLOCKED «\${name}» (\${emoji}) for reaching \${taps} taps! \${gemsText}+\${xp} XP\`,
    asmrLuckBonus: (gems, cur, max, xp) => \`🎁 ASMR Luck & Harmony! +\${gems} 💎 (\${cur}/\${max} today) and +\${xp} XP\`,
    asmrZenCapBonus: (xp, max) => \`🧘 Zen Harmony! +\${xp} Calm XP (Daily cap of \${max} 💎 reached today)\`,

    // Objective Editor & Form Alerts
    saveErrorAlert: 'Could not save progress. Changes might be lost if you close the app.',
    deleteEntryHistoryPrompt: 'Delete this history entry?',
    deleteConfirmAction: 'Delete',
    invalidGoalAmountAlert: 'Invalid goal amount',
    invalidGoalAmountDesc: 'Target amount must be a number greater than zero.',
    maxGoalAmountReachedAlert: 'Maximum goal amount reached',
    selectGalleryImageFirstAlert: 'Please choose an image from your device first.',
    invalidAmountAlert: 'Invalid amount',
    invalidAmountDesc: 'Please enter an amount greater than zero.',
    maxAmountExceededAlert: 'Maximum safe amount exceeded',
    changedGoalNameProtection: (oldT, newT) => \`Changed goal from "\${oldT}" to "\${newT}", a different objective.\`,
    createGoalModalTitle: '＋ Create New Goal',
    editGoalModalTitle: '🎨 Customize Goal',
    createGoalModalSub: 'Choose a preset template or create a custom goal with full color resonance.',
    editGoalModalSub: 'Customize colors, background, target date or reward. Your history remains safe.',
    defaultGoalTitle: 'Your Next Milestone',
    pledgePreviewLabel: (p) => \`🎁 Reward: \${p}\`,
    liveColorTuningPreview: 'Live preview with full chromatic resonance',
    placeholderGoalTitle: 'e.g. Trip to Japan, Peace Fund…',
    placeholderGoalCategory: 'Finances, Adventure, Health, Habit…',
    placeholderGoalPledge: 'e.g. Special dinner, day off, celebrate…',
    createGoalSubmit: '🚀 Create Goal',
    saveGoalChangesSubmit: '✓ Save Changes',
    cropImageHint: 'Select a photo to frame it here\\ndrag to adjust position',
    goalAmountInputLabel: 'Target amount',
    goalDateInputLabel: 'Target date (optional)',
    goalAccentThemeLabel: 'ENERGY COLOR & CHROMATIC THEME',
    startCleanGoalPrompt: '💡 Are you looking to create a brand new goal instead?',
    startCleanGoalBtn: 'Start clean',

    // Audio Packs & Audition
    soundPackSteps: ['1/5 · UI Tap', '2/5 · +Add Progress', '3/5 · −Deduct Expense', '4/5 · 🎯 Daily Quest', '5/5 · 🏆 Goal Fanfare'],
    soundPackPads: ['1·Tap', '2·+Add', '3·−Deduct', '4·Quest', '5·Badge'],
    soundPackAuditionTooltip: (step, name) => \`Listen to \${step} of \${name}\`,
    soundPackActivatedNotice: (name) => \`Sound pack of 5 "\${name}" activated!\`,
    soundPackEngineNotice: (engine) => \`\${engine} engine active across app\`,
    acousticEnginesBadge: (c) => \`\${c} acoustic engines\`,

    // Portrait Monetization & Indie Support
    headerSupportDev: '💎 Support',
    headerSupportDevTooltip: 'Support indie creator and unlock gems',
    freeTipTag: '💖 OPEN TIP · YOU CHOOSE THE AMOUNT',
    tipCardTitle: '☕ Tip the Developer (Instantly editable)',
    tipCardSubtitle: 'Pick a fast button or type the exact contribution you wish to give:',
    tipGratitudeReward: 'Gratitude reward:',
    tipFounderIncluded: '👑 Includes Indie Founder Pass!',
    tipCustomAmountBtn: '✏️ Other amount',
    tipCustomAmountSub: 'Freely editable',
    tipPresets: [
      { amount: '1.00', label: '$1 USD', tag: '🧉 A Mate' },
      { amount: '2.00', label: '$2 USD', tag: '☕ Indie Coffee' },
      { amount: '5.00', label: '$5 USD', tag: '👑 Founder Pass' },
      { amount: '10.00', label: '$10 USD', tag: '🚀 Epic Boost' }
    ],
    tipInputAria: 'Tip amount in USD',
    payMpTipBtn: (usd, ars, gems) => \`🤝 Support with Mercado Pago ($\${usd} USD · ~$\${ars} ARS)\`,
    payPaypalTipBtn: (usd, gems) => \`🌍 Support with PayPal / GPay ($\${usd} USD)\`,
    equippedFrameNotice: (name) => \`Frame "\${name}" equipped live!\`,
    equippedFrameCardSub: (title) => \`See it applied above on your card "\${title}"\`,
    themeAppliedNotice: (title) => \`Your card "\${title}" now shines with this theme\`,
    applyThemeNow: '🌈 Apply Theme Now',
    themeEquipped: '✓ Theme Applied',
    titleEquippedBadge: '✓ Title Equipped',
    equipTitleBtn: '🏅 Equip Title',
    relicInSanctuary: '✓ Relic in Sanctuary',
    blessingClaimed: '✓ Blessing Claimed',
    requiresGuardianLevel: (lvl) => \`🔒 Requires Guardian Lv. \${lvl}\`,
    copyCodeBtn: '📋 Copy Code',
    codeCopiedBtn: '✓ Copied',
    licenseInputPlaceholder: 'Paste your OR-PRO-... code here',
    astralGemsTooltip: 'Your Astral Gems (tap to get more or support creator)',
    tabThemesVault: (c) => \`🌈 Themes (\${c})\`,
    tabTitlesVault: (c) => \`🏅 Titles (\${c})\`,
    categoryFallback: 'Goal',

    // Serene Progress Mode
    sereneFocusMode: '🌱 Serene Focus Mode',
    sereneFocusSubtitle: 'Prioritize your actual numbers and milestone without noise',
    projectedRemaining: (rem, pct) => \`\${rem} remaining (\${pct}%) to target\`,
    dailyBonusIncluded: 'includes daily bonus',
    streakMultiplier: (d) => \`streak x\${d}d\`,
    goalCompletedCelebration: 'Goal Completed!',
    remainingToGoalShort: (amt) => \`Only \${amt} to goal! One final push 🚀\`,
`;

const ptAdditions = `
    // Daily Quests Localized
    questPetTitle: 'Vínculo com o Guardião',
    questPetSub: 'Toque no seu mascote para animá-lo hoje',
    questEntryTitle: 'Impulso do Dia',
    questEntrySub: 'Registre pelo menos 1 movimento hoje',
    questMindfulTitle: 'Aporte com Propósito',
    questMindfulSub: 'Registre um avanço com nota personalizada hoje',

    // Mascot Stages & Dialogs
    mascotStageNames: [
      'Broto Esmeralda', 'Espírito Neko', 'Raposa Kitsune', 'Coruja Sábia', 'Lobo Boreal',
      'Tigre Guardião', 'Leão Solar', 'Cervo da Floresta', 'Fênix Carmesim', 'Golem de Cristal',
      'Kraken Abissal', 'Cronos Autômato', 'Dragão Imperial', 'Mariposa Astral', 'Serafim Ofanim',
      'Hidra Tricéfala', 'Djinn Astral', 'Valquíria Celestial', 'Arquiteto Merkaba', 'Singularidade Cósmica'
    ],
    mascotStageHints: [
      'Uma semente germinando com seus primeiros passos.',
      'Um espírito felino curioso que traz fortuna a quem persevera.',
      'Suas caudas místicas se multiplicam a cada novo nível.',
      'Seus grandes olhos enxergam a meta mesmo na noite mais escura.',
      'Uivando sob a aurora boreal guiando sua constância.',
      'Garras e listras protegendo cada progresso conquistado.',
      'Juba de fogo solar ardendo com sua disciplina.',
      'Chifres milenares florescendo com constância serena.',
      'Renasce das cinzas desdobrando asas incandescentes.',
      'Colosso hexagonal esculpido em cristal rúnico vivo.',
      'Tentáculos emergindo das profundezas abissais.',
      'Engrenagens eternas e ponteiros dourados dominando o tempo.',
      'Guardando a pérola imperial nas nuvens orientais.',
      'Quatro asas lunares com ocelos refletindo galáxias.',
      'Rodas entrelaçadas e seis asas de fogo sagrado.',
      'Três cabeças lendárias que jamais recuam diante de um desafio.',
      'Emergindo de um vórtice estelar para conceder grandes conquistas.',
      'Elmo alado e visor reluzente dos salões eternos.',
      'Geometria sagrada multidimensional transcendendo o espaço.',
      'Um quasar vivo coroado no centro do universo.'
    ],
    mascotMessages: [
      'Broto Esmeralda · Sua jornada acabou de começar 💪',
      'Espírito Neko · Ótimo começo, continue assim!',
      'Raposa Kitsune · Sua constância multiplica sua energia',
      'Coruja Sábia · Visão clara rumo ao seu objetivo',
      'Lobo Boreal · Passo firme sob a aurora',
      'Tigre Guardião · Seu esforço está crescendo!',
      'Leão Solar · Sua disciplina brilha com força',
      'Cervo da Floresta · Harmonia e avanço constante',
      'Fênix Carmesim · Voando alto com asas de fogo',
      'Golem de Cristal · Fortaleza rúnica inabalável',
      'Kraken Abissal · Você superou o nível 100!',
      'Cronos Autômato · Dominando cada segundo rumo à meta',
      'Dragão Imperial · Você superou os 120 níveis!',
      'Mariposa Astral · Asas lunares cruzando o cosmos',
      'Serafim Ofanim · Seis asas e anéis de fogo sagrado',
      'Hidra Tricéfala · Três vontades unidas pelo seu objetivo',
      'Djinn Astral · Poder místico desbloqueado a seu favor',
      'Valquíria Celestial · Honra e vitória a cada passo',
      'Arquiteto Merkaba · Geometria sagrada do progresso',
      'Singularidade Cósmica! Lenda suprema do universo'
    ],
    newSpeciesUnlocked: 'Nova espécie desbloqueada!',
    levelUpCelebration: (lvl) => \`Você subiu para o Nível \${lvl}!\`,
    petGreetNoEntry: 'Que alegria ver você hoje! Um pequeno passo mantém nossa chama acesa 🔥',
    petGreetStreak: (d) => \`É isso aí! Já são \${d} \${d === 1 ? 'dia' : 'dias'} seguidos brilhando ✨\`,
    petGreetLevelsLeft: (l) => \`Sinto o poder crescer! Apenas mais \${l} \${l === 1 ? 'nível' : 'níveis'} para uma nova espécie 🐾\`,
    petGreetMax: 'Alcançamos o ápice cósmico juntos! 🪐',
    petGreetObjectiveSurpassed: (t) => \`Concluímos «\${t}»! Você é imparável 🏆\`,
    petGreetObjectiveRemaining: (t, a) => \`Vamos rumo a «\${t}»! Faltam apenas \${a} 🚀\`,
    petGreetThanks: 'Obrigado pelo carinho! Cada passo seu me faz evoluir 💖',
    creatureLockedYet: 'Criatura ainda bloqueada',
    lockedLevelCreature: (lvl) => \`🔒 Nível \${lvl} · Criatura Misteriosa\`,
    unlockedLevelCreature: (lvl, name) => \`✨ Nivel \${lvl} · \${name}\`,
    spyLevelSilhouette: (lvl, hint) => \`Espiar silhueta de Nível \${lvl}: \${hint}\`,
    reachLevelToUnlockSpecies: (lvl) => \`Espécie de Nível \${lvl} bloqueada (Alcance o Nível \${lvl} para revelar)\`,
    reachLevelForSkinAura: (lvl, skin) => \`🔒 Alcance o Nível \${lvl} para revelar sem spoilers. Você pode ver o anel de «\${skin}» na silhueta.\`,
    tapToHearBioVoice: 'Toque para ouvir a voz bioacústica desta criatura',

    // ASMR Rewards
    asmrUnlockedTapStyle: (name, emoji, taps, gemsText, xp) => \`🎉 DESBLOQUEOU «\${name}» (\${emoji}) por alcançar \${taps} toques! \${gemsText}+\${xp} XP\`,
    asmrLuckBonus: (gems, cur, max, xp) => \`🎁 Sorte e Harmonia ASMR! +\${gems} 💎 (\${cur}/\${max} hoje) e +\${xp} XP\`,
    asmrZenCapBonus: (xp, max) => \`🧘 Harmonia Zen! +\${xp} XP de Calma (Limite diário de \${max} 💎 atingido hoje)\`,

    // Objective Editor & Form Alerts
    saveErrorAlert: 'Não foi possível salvar o progresso. As alterações podem ser perdidas ao fechar o app.',
    deleteEntryHistoryPrompt: 'Deseja excluir este registro do histórico?',
    deleteConfirmAction: 'Excluir',
    invalidGoalAmountAlert: 'Valor não válido',
    invalidGoalAmountDesc: 'O valor da meta deve ser um número maior que zero.',
    maxGoalAmountReachedAlert: 'Meta máxima atingida',
    selectGalleryImageFirstAlert: 'Selecione primeiro uma imagem da galeria.',
    invalidAmountAlert: 'Valor não válido',
    invalidAmountDesc: 'Digite um valor maior que zero.',
    maxAmountExceededAlert: 'Valor máximo seguro superado',
    changedGoalNameProtection: (oldT, newT) => \`Você alterou a meta «\${oldT}» para «\${newT}», um objetivo diferente.\`,
    createGoalModalTitle: '＋ Criar Novo Objetivo',
    editGoalModalTitle: '🎨 Personalizar Meta',
    createGoalModalSub: 'Escolha um modelo predefinido ou crie sua meta sob medida com ressonância cromática.',
    editGoalModalSub: 'Personalize cores, plano de fundo, data meta ou prêmio. Seu histórico permanece seguro.',
    defaultGoalTitle: 'Seu Próximo Marco',
    pledgePreviewLabel: (p) => \`🎁 Prêmio: \${p}\`,
    liveColorTuningPreview: 'Pré-visualização ao vivo com afinação cromática completa',
    placeholderGoalTitle: 'Ex. Viagem ao Japão, Fundo de Paz…',
    placeholderGoalCategory: 'Finanças, Aventura, Saúde, Hábito…',
    placeholderGoalPledge: 'Ex. Jantar especial, folga, comemorar…',
    createGoalSubmit: '🚀 Criar Meta',
    saveGoalChangesSubmit: '✓ Salvar Alterações',
    cropImageHint: 'Selecione uma foto para enquadrá-la aqui\\narraste para ajustar',
    goalAmountInputLabel: 'Valor ou quantidade meta',
    goalDateInputLabel: 'Data meta (opcional)',
    goalAccentThemeLabel: 'COR DE ENERGIA (SINTONIA TOTAL)',
    startCleanGoalPrompt: '💡 Deseja criar um Novo Objetivo limpo em vez disso?',
    startCleanGoalBtn: 'Começar limpo',

    // Audio Packs & Audition
    soundPackSteps: ['1/5 · Toque na UI', '2/5 · +Registrar Avanço', '3/5 · −Subtrair Gasto', '4/5 · 🎯 Missão Diária', '5/5 · 🏆 Fanfarra da Meta'],
    soundPackPads: ['1·Toque', '2·+Soma', '3·−Resta', '4·Missão', '5·Conquista'],
    soundPackAuditionTooltip: (step, name) => \`Ouvir \${step} de \${name}\`,
    soundPackActivatedNotice: (name) => \`Pacote de 5 Sons "\${name}" ativado!\`,
    soundPackEngineNotice: (engine) => \`Motor \${engine} ativo em todo o app\`,
    acousticEnginesBadge: (c) => \`\${c} motores acústicos\`,

    // Portrait Monetization & Indie Support
    headerSupportDev: '💎 Apoiar',
    headerSupportDevTooltip: 'Apoiar o criador independente e obter gemas',
    freeTipTag: '💖 GORJETA LIVRE · VOCÊ ESCOLHE O VALOR',
    tipCardTitle: '☕ Gorjeta para o Desenvolvedor (Editável na hora)',
    tipCardSubtitle: 'Escolha um botão rápido ou digite livremente o valor exato que deseja apoiar:',
    tipGratitudeReward: 'Recompensa de gratidão:',
    tipFounderIncluded: '👑 Inclui Passe Fundador Indie!',
    tipCustomAmountBtn: '✏️ Outro valor',
    tipCustomAmountSub: 'Editar livremente',
    tipPresets: [
      { amount: '1.00', label: '$1 USD', tag: '🧉 Um Mate' },
      { amount: '2.00', label: '$2 USD', tag: '☕ Café Indie' },
      { amount: '5.00', label: '$5 USD', tag: '👑 Passe Fundador' },
      { amount: '10.00', label: '$10 USD', tag: '🚀 Impulso Épico' }
    ],
    tipInputAria: 'Valor de apoio em USD',
    payMpTipBtn: (usd, ars, gems) => \`🤝 Apoiar com Mercado Pago ($\${usd} USD · ~$\${ars} ARS)\`,
    payPaypalTipBtn: (usd, gems) => \`🌍 Apoiar com PayPal / GPay ($\${usd} USD)\`,
    equippedFrameNotice: (name) => \`Moldura "\${name}" equipada ao vivo!\`,
    equippedFrameCardSub: (title) => \`Veja aplicada acima no seu cartão «\${title}»\`,
    themeAppliedNotice: (title) => \`Seu cartão «\${title}» agora brilha com esta sintonia\`,
    applyThemeNow: '🌈 Aplicar Sintonia Agora',
    themeEquipped: '✓ Sintonia Aplicada',
    titleEquippedBadge: '✓ Título Equipado',
    equipTitleBtn: '🏅 Equipar Título',
    relicInSanctuary: '✓ Relíquia no Santuário',
    blessingClaimed: '✓ Bênção Resgatada',
    requiresGuardianLevel: (lvl) => \`🔒 Requer Guardião Nv. \${lvl}\`,
    copyCodeBtn: '📋 Copiar Código',
    codeCopiedBtn: '✓ Copiado',
    licenseInputPlaceholder: 'Cole aqui seu código OR-PRO-...',
    astralGemsTooltip: 'Suas Gemas Astrais (toque para obter mais ou apoiar o criador)',
    tabThemesVault: (c) => \`🌈 Sintonias (\${c})\`,
    tabTitlesVault: (c) => \`🏅 Títulos (\${c})\`,
    categoryFallback: 'Objetivo',

    // Serene Progress Mode
    sereneFocusMode: '🌱 Modo Foco Sereno',
    sereneFocusSubtitle: 'Priorize seus números reais e meta sem ruído de XP',
    projectedRemaining: (rem, pct) => \`Faltam \${rem} (\${pct}%) para a meta\`,
    dailyBonusIncluded: 'inclui bônus diário',
    streakMultiplier: (d) => \`sequência x\${d}d\`,
    goalCompletedCelebration: 'Meta Concluída!',
    remainingToGoalShort: (amt) => \`A apenas \${amt} da meta! Um último impulso 🚀\`,
`;

// Insert into TranslationDictionary interface
const ifaceEndStr = "searchPlaceholder: string;\n}";
const newIfaceEndStr = `searchPlaceholder: string;${newInterfaceProps}}`;
content = content.replace(ifaceEndStr, newIfaceEndStr);

// Insert into es
const esSearchStr = "searchPlaceholder: '🔍 Buscar skin, marco, sonido, reliquia...',\n  },";
const newEsStr = `searchPlaceholder: '🔍 Buscar skin, marco, sonido, reliquia...',\n${esAdditions}  },`;
content = content.replace(esSearchStr, newEsStr);

// Insert into en
const enSearchStr = "searchPlaceholder: '🔍 Search skin, frame, sound, relic...',\n  },";
const newEnStr = `searchPlaceholder: '🔍 Search skin, frame, sound, relic...',\n${enAdditions}  },`;
content = content.replace(enSearchStr, newEnStr);

// Insert into pt
const ptSearchStr = "searchPlaceholder: '🔍 Buscar skin, moldura, som, relíquia...',\n  },";
const newPtStr = `searchPlaceholder: '🔍 Buscar skin, moldura, som, relíquia...',\n${ptAdditions}  },`;
content = content.replace(ptSearchStr, newPtStr);

fs.writeFileSync('src/i18n.ts', content, 'utf8');
console.log('Successfully updated src/i18n.ts');
