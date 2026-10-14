export type AppLanguage = 'es' | 'en' | 'pt';

export interface TranslationDictionary {
  // App header & brand
  appTitle: string;
  sanctuaryTitle: string;
  store: string;
  activeStreak: string;
  streakDaysUnit: string;
  streakDaysPlural: string;
  streakIgnitePrompt: string;
  streakShieldCount: (count: number) => string;
  streakShieldTooltip: string;
  openStoreTooltip: (gems: number) => string;
  
  // Navigation
  navigation: string;
  history: string;
  openHistory: string;
  closeHistory: string;
  settings: string;
  archived: string;
  newObjective: string;
  activeObjectivesCount: (count: number) => string;
  oneRowToggle: string;
  viewAllToggle: string;
  scrollLeft: string;
  scrollRight: string;
  archivedCount: (count: number) => string;
  
  // Quick settings
  ambientMusicOn: (style: string) => string;
  ambientMusicOff: string;
  ambientMusicTooltipOn: (style: string) => string;
  ambientMusicTooltipOff: (style: string) => string;
  soundHapticsOn: string;
  soundHapticsOff: string;
  soundHapticsTooltipOn: string;
  soundHapticsTooltipOff: string;
  languageSelect: string;
  languageLabel: string;
  
  // ASMR Sanctuary
  asmrTitle: string;
  asmrSubtitle: string;
  totalTaps: string;
  dailyGemsCap: (current: number, max: number) => string;
  dailyGemsTooltip: string;
  holdToStreamHint: string;
  tapOrbButton: string;
  harmonyChest: (current: number, max: number) => string;
  tapsRemaining: (count: number) => string;
  nextFreeOrb: (name: string, emoji: string, current: number, total: number) => string;
  asmrZenRule: (dailyCap: number) => string;
  filterAll: string;
  filterMyOrbs: string;
  filterTaps: string;
  filterSkins: string;
  inUse: string;
  ready: string;
  trySound: string;
  openArrow: string;
  asmrClickerButton: string;
  tryItBadge: string;
  playAsmrCta: string;
  calmSpark: string;
  
  // Daily quests & stamps
  dailyQuestsTitle: string;
  dailyQuestsHeader: (completed: number, total: number) => string;
  claimButton: string;
  sealChestClaimed: string;
  claimChestReward: string;
  chestProgress: (completed: number, total: number) => string;
  dailySealCompleteBonus: string;
  todayActive: string;
  todayPending: string;
  
  // Actions & Entries
  registerProgress: string;
  quickOrWrite: string;
  addAdvance: string;
  subtractExpense: string;
  customPlaceholder: (formatted: string) => string;
  optionalNotePlaceholder: string;
  registerButton: (formatted: string) => string;
  dailyTarget: string;
  completedStatus: string;
  streakLabel: string;
  editGoal: string;
  noActiveGoalsTitle: string;
  noActiveGoalsSub: string;
  createGoalButton: string;
  logHistoryToday: string;
  todayEmptyHistory: string;
  
  // Codex / Mascot
  mascotCodex: string;
  levelUnlockedInfo: (lvl: number) => string;
  touchMascotVoicePrompt: string;
  unlockedUntil: (lvl: number) => string;
  petMascotVoiceHint: string;
  dailyPetRewardNotice: (xp: number, gems: number) => string;
  levelAbbr: string;
  newSpeciesPrompt: string;
  codexLink: string;
  stageEvolutionTrack: (tier: number, sub: number) => string;
  nextSpeciesIn: (count: number) => string;
  supremeStageUnlocked: string;
  viewLevelInCodex: (lvl: number) => string;
  auraLabel: string;
  founderBonusBadge: string;
  
  // Boost Statistics Block
  statsTitle: string;
  statsSubtitle: string;
  statMovements: string;
  statInThisGoal: (count: number) => string;
  statBestEntry: string;
  statSingleEntry: string;
  statGuardianLevel: string;
  statTotalXp: string;
  statAccumulated: string;
  
  // Shop & Sanctuary Bank
  bankTitle: string;
  bankDescription: string;
  collectiblesCount: (count: number) => string;
  tabSkins: (count: number) => string;
  tabCardsAudio: (count: number) => string;
  tabBuffs: (count: number) => string;
  tabSupport: string;
  searchPlaceholder: string;
  equippedCurrent: string;
  equipNow: string;
  unlockCost: (gems: number) => string;
  antiSpoilerNotice: (userLvl: number) => string;
  myLevelBtn: (lvl: number) => string;
  founderTitle: string;
  redeemCode: string;
  licenseCodePlaceholder: string;
  redeemButton: string;
  launchOfferBannerBadge: string;
  launchMaxDiscount: string;
  launchOfferBannerTitle: string;
  launchOfferBannerSub: string;
  launchTimerLabel: string;
  daysShort: string;
  hoursShort: string;
  minsShort: string;
  secsShort: string;
  launchPerk1: string;
  launchPerk2: string;
  launchPerk3: string;
  launchPerk4: string;
  regularPriceLabel: string;
  launchPriceLabel: string;
  payWithMercadoPago: (price: string) => string;
  payWithPaypal: (price: string) => string;
  activeFounderBtn: string;
  supportTabPromoBadge: string;
  
  // Settings Panel & Goals
  objectiveSettings: string;
  customizeGoal: string;
  customizeGoalSub: string;
  bannerFrame: string;
  bannerFrameSub: string;
  archiveGoal: string;
  archiveGoalSub: string;
  deleteGoal: string;
  deleteGoalSub: string;
  devCredits: string;
  devCreditsSub: (gems: number) => string;
  
  // Modals & General actions
  createNewGoalTitle: string;
  editGoalTitle: string;
  goalNameLabel: string;
  goalTargetLabel: string;
  goalUnitLabel: string;
  goalIconLabel: string;
  goalThemeLabel: string;
  quickTemplatesLabel: string;
  saveGoalButton: string;
  cancelButton: string;
  confirmButton: string;
  closeButton: string;
  deleteButton: string;
  restoreButton: string;
  archivedGoalsTitle: string;
  noArchivedGoals: string;
  permanentDeleteButton: string;
  historyTitle: string;
  today: string;
  yesterday: string;
  noEntriesYet: string;
  deleteEntryConfirm: string;

  // Extra navigation & brand
  navObjective: string;
  navSanctuary: string;
  navAsmr: string;
  navRituals: string;
  navStats: string;
  navSettings: string;
  navHistory: string;
  navArchived: string;
  brandTagline: string;
  closeMenu: string;
  openNav: string;
  founderBadge: string;
  guardianTitleTooltip: string;
  changeGuardianTitle: string;
  manageArchived: string;
  openCodexButton: string;
  copyAddress: string;
  copiedToast: string;

  // Main Objective progress & card
  progressCurrent: string;
  dailyTargetProgress: string;
  dailyTargetCompleted: string;
  completedBadge: string;
  inProgressBadge: string;
  addAdvanceBtn: string;
  subtractExpenseBtn: string;
  completeTodayBtn: string;
  quickPresetsLabel: string;
  enterCustomAmount: string;
  saveEntryBtn: (val: string, xp: number) => string;
  optionalNote: string;

  // Mascot card
  mascotCompanion: string;
  mascotSubtitle: string;
  tapMascotHint: string;
  mascotLevelLabel: (lvl: number) => string;
  speciesMystery: string;
  streakSevenDays: string;
  dailyChestLabel: (c: number) => string;
  claimChestBonus: string;
  dailySealBonusNotice: string;
  dailySealCompleted: string;

  // ASMR Block
  asmrFlowing: string;
  slideStylesHint: string;
  scrollAsmrLeft: string;
  scrollAsmrRight: string;

  // Boost stats
  statMovementsLabel: string;
  statInGoal: (c: number) => string;
  statBestLabel: string;
  statSingle: string;
  statGuardianLabel: string;
  statCurrentRank: string;
  statTotalXpLabel: string;
  statTotalGems: (g: number) => string;

  // Sanctuary shop
  supportLetterTitle: string;
  customTipTitle: string;
  cryptoTitle: string;

  // Comprehensive app-wide localization additions
  sidebarActiveStreak: string;
  shieldsUnit: (c: number) => string;
  indieDevEmpathySidebar: string;
  sidebarFounderBadge: string;
  sidebarSupporterBadge: string;
  sidebarIndieProject: string;
  floatingMenuBtn: string;
  openNavAria: string;
  navAchievements: string;
  dateOverdue: string;
  dateTodayDue: string;
  daysRemaining: (d: number) => string;
  activeFrameTooltip: (name: string) => string;
  framesAndFx: string;
  customizeObjective: string;
  customizeObjectiveTooltip: string;
  changeBackground: string;
  changeBackgroundTooltip: string;
  changeIconTooltip: string;
  addPledgeOrDate: string;
  achievedBadge: string;
  progressAchieved: string;
  progressAdvance: string;
  finalGoalLabel: string;
  goalSurpassed: string;
  remainingToGoal: (amt: string) => string;
  milestoneTitle: (pct: string, amt: string) => string;
  nextMilestone: (pct: number, amt: string) => string;
  allMilestonesCompleted: string;
  entriesCountLabel: (c: number) => string;
  suggestedPace: (amt: string) => string;
  highestImpulse: (amt: string) => string;
  pledgeReward: (p: string) => string;
  definePledge: string;
  levelUpPreview: string;
  achievementsSectionTitle: string;
  achievementsSectionSubtitle: string;
  viewAllAchievements: string;
  secretAchievement: string;
  petMascotTooltipUnclaimed: string;
  petMascotTooltipPetted: string;
  petMascotRewardUnclaimed: string;
  petMascotRewardPetted: string;
  settingsEditGoalTitle: string;
  settingsEditGoalSubtitle: string;
  settingsBackgroundTitle: string;
  settingsBackgroundSubtitle: string;
  settingsArchiveTitle: string;
  settingsArchiveSubtitle: string;
  settingsDeleteTitle: string;
  settingsDeleteSubtitle: string;
  settingsIndieCardTitle: string;
  settingsIndieCardSub: (gems: number) => string;
  settingsSkinsBuffsBtn: string;
  settingsSupportDevBtn: string;
  currentBalanceLabel: string;
  historyFilterAll: string;
  historyFilterAdd: string;
  historyFilterSubtract: string;
  backButton: string;
  shopMainTitle: string;
  shopCollectiblesBadge: (c: number) => string;
  filterAllWithCount: (c: number) => string;
  filterFree: (c: number) => string;
  filterPremium: (c: number) => string;
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
}

export const TRANSLATIONS: Record<AppLanguage, TranslationDictionary> = {
  es: {
    appTitle: 'Objective Reacher',
    sanctuaryTitle: 'Santuario del Guardián',
    store: 'Tienda',
    activeStreak: 'Racha Activa',
    streakDaysUnit: 'día consecutivo',
    streakDaysPlural: 'días consecutivos',
    streakIgnitePrompt: '¡Mantén encendida la llama de tu racha! 🔥',
    streakShieldCount: (c) => `${c} ${c === 1 ? 'Escudo' : 'Escudos'}`,
    streakShieldTooltip: 'Escudos de Racha: te salvan automáticamente si un día no puedes registrar.',
    openStoreTooltip: (gems) => `Abrir Santuario Indie (${gems.toLocaleString()} gemas): Skins, Buffs y Apoyo al Creador`,
    navigation: 'Navegación',
    history: 'Registro de entradas',
    openHistory: 'Abrir historial de entradas',
    closeHistory: 'Cerrar historial',
    settings: 'Ajustes',
    archived: 'Archivados',
    newObjective: 'Nuevo objetivo',
    activeObjectivesCount: (c) => `${c} ${c === 1 ? 'objetivo activo' : 'objetivos activos'}`,
    oneRowToggle: '↔ 1 fila',
    viewAllToggle: '☷ Ver todos',
    scrollLeft: 'Desplazar a la izquierda',
    scrollRight: 'Desplazar a la derecha',
    archivedCount: (c) => `Archivados (${c})`,
    ambientMusicOn: (s) => `Música (${s}): ON`,
    ambientMusicOff: 'Música Ambiental: OFF',
    ambientMusicTooltipOn: (s) => `Música ambiental activa (${s}) · Toca para apagar`,
    ambientMusicTooltipOff: (s) => `Activar música ambiental procedural (${s})`,
    soundHapticsOn: 'Sonido y Haptic: ON',
    soundHapticsOff: 'Sonido y Haptic: OFF',
    soundHapticsTooltipOn: 'Efectos de sonido y vibración táctil activos (toca para silenciar)',
    soundHapticsTooltipOff: 'Sonido y vibración en silencio (toca para activar)',
    languageSelect: 'Idioma de la App',
    languageLabel: '🌐 Idioma / Language',
    asmrTitle: '🫧 SANTUARIO ASMR & CLICKER DEL GUARDIÁN',
    asmrSubtitle: 'Explora 16 Orbes ASMR con audio binaural y respuesta háptica continua.',
    totalTaps: 'Toques totales',
    dailyGemsCap: (c, m) => `💎 Hoy: ${c}/${m}`,
    dailyGemsTooltip: 'Tope diario de Gemas en el Clicker. Al llegar a 8/8 sigues ganando XP Zen y orbes por toques.',
    holdToStreamHint: '💡 Mantén pulsado el orbe para flujo binaural continuo.',
    tapOrbButton: 'TOCAR ORBE',
    harmonyChest: (c, m) => `✨ Cofre de Armonía (${c}/${m})`,
    tapsRemaining: (c) => `Faltan ${c} toques`,
    nextFreeOrb: (name, emoji, cur, tot) => `🎯 Próximo Orbe gratis: ${emoji} ${name} (${cur}/${tot} toques)`,
    asmrZenRule: (cap) => `💡 Cada 50 toques recibes +1 💎 y +10 XP (hasta ${cap} 💎/día; luego modo Zen +XP).`,
    filterAll: 'Todos',
    filterMyOrbs: '✓ Mis Orbes',
    filterTaps: '🎯 Por Toques',
    filterSkins: '💎 Skins Orbe',
    inUse: 'EN USO',
    ready: 'LISTO',
    trySound: '🔊 Probar',
    openArrow: 'Abrir →',
    asmrClickerButton: 'Clicker ASMR & Orbes (16)',
    tryItBadge: '¡PRUÉBALO! 🎧',
    playAsmrCta: 'JUGAR CLICKER ASMR ✨',
    calmSpark: '+Calma',
    dailyQuestsTitle: 'Misiones diarias',
    dailyQuestsHeader: (c, t) => `🎯 Misiones hoy (${c}/${t})`,
    claimButton: '¡RECLAMAR!',
    sealChestClaimed: '👑 Sello diario completado',
    claimChestReward: '🎁 Reclamar Cofre +40 XP',
    chestProgress: (c, t) => `Cofre: ${c}/${t}`,
    dailySealCompleteBonus: 'Completa las 3 misiones diarias para el Cofre de Sello (+40 XP)',
    todayActive: 'Hoy (Activo)',
    todayPending: 'Hoy (Pendiente)',
    registerProgress: 'Registrar Progreso',
    quickOrWrite: 'Elige un monto rápido o escribe el tuyo',
    addAdvance: 'Sumar avance',
    subtractExpense: 'Restar / Gasto',
    customPlaceholder: (f) => `Otro (${f})`,
    optionalNotePlaceholder: 'Nota opcional (ej. Ahorro semanal)',
    registerButton: (f) => `Registrar ${f}`,
    dailyTarget: 'Meta Diaria',
    completedStatus: 'Completado',
    streakLabel: 'Racha',
    editGoal: 'Editar objetivo',
    noActiveGoalsTitle: 'No tienes objetivos activos',
    noActiveGoalsSub: 'Crea tu primer objetivo para comenzar a construir tu racha diaria.',
    createGoalButton: 'Crear objetivo',
    logHistoryToday: 'Historial de hoy',
    todayEmptyHistory: 'Sin movimientos registrados hoy.',
    mascotCodex: '🐾 Códice de Mascotas (1–200)',
    levelUnlockedInfo: (lvl) => `Desbloqueado hasta Nv. ${lvl} · Toca una criatura para escuchar su voz.`,
    touchMascotVoicePrompt: 'Toca a tu mascota para interactuar',
    unlockedUntil: (lvl) => `Desbloqueado hasta Nv. ${lvl}`,
    petMascotVoiceHint: 'Toca tu mascota para sentir su alegría y ganar XP de vínculo.',
    dailyPetRewardNotice: (xp, gems) => `¡Caricia diaria recibida! +${xp} XP y +${gems} 💎 Gemas de vínculo 💖`,
    levelAbbr: 'NV.',
    newSpeciesPrompt: '¿Nueva especie?',
    codexLink: 'CÓDICE (1–200) →',
    stageEvolutionTrack: (tier, sub) => `Etapa ${tier}/20 · Evolución ${sub}/10`,
    nextSpeciesIn: (c) => `Próxima especie en ${c} nv.`,
    supremeStageUnlocked: 'Etapa Suprema Desbloqueada',
    viewLevelInCodex: (lvl) => `Ver Nivel ${lvl} en el Códice`,
    auraLabel: 'Aura',
    founderBonusBadge: '👑 +20% XP Fundador',
    statsTitle: 'Estadísticas de Impulso',
    statsSubtitle: 'Resumen claro de tu constancia y progreso',
    statMovements: 'MOVIMIENTOS',
    statInThisGoal: (c) => `${c} en este objetivo`,
    statBestEntry: 'MEJOR APORTE',
    statSingleEntry: 'en un solo registro',
    statGuardianLevel: 'NIVEL GUARDIÁN',
    statTotalXp: 'XP TOTAL',
    statAccumulated: 'acumulados',
    bankTitle: '💎 Cosméticos, Tarjetas, Audio & Apoyo Indie',
    bankDescription: 'Personaliza a tu guardián con auras, vitrinas y efectos sonoros.',
    collectiblesCount: (c) => `✨ ${c} COLECCIONABLES EN EL SANTUARIO`,
    tabSkins: (c) => `🎨 Skins (${c})`,
    tabCardsAudio: (c) => `✨ Tarjetas & Audio (${c})`,
    tabBuffs: (c) => `🧪 Buffs & Reliquias (${c})`,
    tabSupport: '💖 Apoyar al Dev',
    searchPlaceholder: '🔍 Buscar skin, marco, sonido, reliquia...',
    equippedCurrent: '✓ Equipada actualmente',
    equipNow: '✨ Equipar ahora',
    unlockCost: (g) => `Desbloquear · 💎 ${g}`,
    antiSpoilerNotice: (lvl) => `🔒 Niveles superiores a Nv. ${lvl} protegidos contra spoilers.`,
    myLevelBtn: (lvl) => `Mi Nv. (${lvl})`,
    founderTitle: 'Mecenas Fundador Vitalicio',
    redeemCode: 'Canjear Código',
    licenseCodePlaceholder: 'Código de licencia',
    redeemButton: 'Canjear',
    launchOfferBannerBadge: 'GRAN LANZAMIENTO GLOBAL v1.0',
    launchMaxDiscount: 'HASTA 53% OFF',
    launchOfferBannerTitle: '🚀 Ofertas de Estreno por Tiempo Limitado',
    launchOfferBannerSub: 'Celebramos el lanzamiento oficial de Objective Reacher. Precios promocionales exclusivos para apoyar el desarrollo indie y desbloquear la Bóveda.',
    launchTimerLabel: 'Finaliza en:',
    daysShort: 'Días',
    hoursShort: 'Horas',
    minsShort: 'Min',
    secsShort: 'Seg',
    launchPerk1: 'Precios de estreno asegurados',
    launchPerk2: 'Desbloqueo vitalicio sin suscripción',
    launchPerk3: 'Licencia PRO transferible',
    launchPerk4: 'Sin anuncios ni microtransacciones abusivas',
    regularPriceLabel: 'Regular',
    launchPriceLabel: 'Estreno',
    payWithMercadoPago: (p) => `🤝 Pagar con Mercado Pago (${p})`,
    payWithPaypal: (p) => `🌍 Pagar con PayPal / GPay (${p})`,
    activeFounderBtn: '👑 Pase Fundador Activo',
    supportTabPromoBadge: '🔥 -53% OFF',
    objectiveSettings: 'Ajustes del Objetivo',
    customizeGoal: 'Personalizar objetivo',
    customizeGoalSub: 'Nombre, meta, icono, fecha y premio',
    bannerFrame: 'Fondo y encuadre',
    bannerFrameSub: 'Cambiar paisaje o subir imagen',
    archiveGoal: 'Archivar en el baúl',
    archiveGoalSub: 'Guardar sin perder su progreso',
    deleteGoal: 'Eliminar objetivo',
    deleteGoalSub: 'Borrar permanentemente',
    devCredits: '💖 Creado por un Desarrollador Indie',
    devCreditsSub: (g) => `Personaliza tus 200 mascotas con Skins, Marcos y Sonidos con tus Gemas (💎 ${g}).`,
    createNewGoalTitle: 'Crear Nuevo Objetivo',
    editGoalTitle: 'Editar Objetivo',
    goalNameLabel: 'Nombre del objetivo',
    goalTargetLabel: 'Meta cuantitativa',
    goalUnitLabel: 'Unidad de medida',
    goalIconLabel: 'Icono representativo',
    goalThemeLabel: 'Color temático',
    quickTemplatesLabel: 'Plantillas rápidas',
    saveGoalButton: 'Guardar Objetivo',
    cancelButton: 'Cancelar',
    confirmButton: 'Confirmar',
    closeButton: 'Cerrar',
    deleteButton: 'Eliminar',
    restoreButton: 'Restaurar',
    archivedGoalsTitle: 'Objetivos Archivados',
    noArchivedGoals: 'No hay objetivos archivados.',
    permanentDeleteButton: 'Eliminar permanentemente',
    historyTitle: 'Historial de Registros',
    today: 'Hoy',
    yesterday: 'Ayer',
    noEntriesYet: 'Sin movimientos registrados aún.',
    deleteEntryConfirm: '¿Deseas eliminar este registro de progreso?',

    // Extra navigation & brand
    navObjective: '🎯 Objetivo actual',
    navSanctuary: '💎 Santuario & Colecciones',
    navAsmr: '🫧 Santuario ASMR',
    navRituals: '📅 Rituales Diarios',
    navStats: '▥ Estadísticas',
    navSettings: '⚙ Ajustes del Objetivo',
    navHistory: '📜 Historial de Registros',
    navArchived: '🗄 Objetivos Archivados',
    brandTagline: 'Tu progreso, a tu ritmo',
    closeMenu: 'Cerrar menú',
    openNav: 'Abrir navegación',
    founderBadge: '👑 FUNDADOR',
    guardianTitleTooltip: 'Cambiar Título de Guardián en el Banco del Santuario',
    changeGuardianTitle: 'Cambiar Título',
    manageArchived: 'Gestionar Archivados',
    openCodexButton: 'Códice de Mascotas (1–200)',
    copyAddress: 'Copiar dirección',
    copiedToast: '¡Copiado al portapapeles!',

    // Main Objective progress & card
    progressCurrent: 'Progreso actual',
    dailyTargetProgress: 'Meta del día',
    dailyTargetCompleted: 'Completada hoy',
    completedBadge: '¡Meta alcanzada!',
    inProgressBadge: 'En progreso',
    addAdvanceBtn: 'Registrar Avance',
    subtractExpenseBtn: 'Restar / Ajuste',
    completeTodayBtn: 'Completar meta de hoy',
    quickPresetsLabel: 'Valores rápidos:',
    enterCustomAmount: 'O escribe una cantidad personalizada',
    saveEntryBtn: (val, xp) => `Guardar ${val} (+${xp} XP)`,
    optionalNote: 'Nota o reflexión opcional...',

    // Mascot card
    mascotCompanion: 'Mascota Guardiana',
    mascotSubtitle: 'Compañero de Hábito',
    tapMascotHint: 'Toca a tu mascota para interactuar',
    mascotLevelLabel: (lvl) => `NV. ${lvl}`,
    speciesMystery: '¿Nueva especie?',
    streakSevenDays: '7 días de constancia',
    dailyChestLabel: (c) => `Cofre: ${c}/3`,
    claimChestBonus: '🎁 Reclamar Cofre +40 XP',
    dailySealBonusNotice: 'Completa las 3 misiones diarias para el Cofre de Sello (+40 XP)',
    dailySealCompleted: '👑 Sello diario completado',

    // ASMR Block
    asmrFlowing: 'FLUJO ASMR...',
    slideStylesHint: 'Desliza estilos →',
    scrollAsmrLeft: 'Desplazar estilos ASMR a la izquierda',
    scrollAsmrRight: 'Desplazar estilos ASMR a la derecha',

    // Boost stats
    statMovementsLabel: 'MOVIMIENTOS',
    statInGoal: (c) => `${c} en este objetivo`,
    statBestLabel: 'MEJOR REGISTRO',
    statSingle: 'En un solo registro',
    statGuardianLabel: 'NIVEL DE GUARDIÁN',
    statCurrentRank: 'Rango actual',
    statTotalXpLabel: 'XP TOTAL ACUMULADO',
    statTotalGems: (g) => `${g.toLocaleString()} gemas obtenidas`,

    // Sanctuary shop
    supportLetterTitle: 'Carta del Desarrollador',
    customTipTitle: '¿Deseas apoyar con una propina personalizada?',
    cryptoTitle: 'Respaldo Internacional & Cripto',

    // Comprehensive app-wide localization additions
    sidebarActiveStreak: 'Racha activa',
    shieldsUnit: (c) => `${c} ${c === 1 ? 'escudo' : 'escudos'}`,
    indieDevEmpathySidebar:
      'Creado por 1 dev independiente · 0% anuncios. Explora Skins, Buffs y cómo apoyar.',
    sidebarFounderBadge: '👑 FUNDADOR INDIE',
    sidebarSupporterBadge: '☕ SUPPORTER INDIE',
    sidebarIndieProject: '💖 PROYECTO 100% INDIE',
    floatingMenuBtn: 'Menú',
    openNavAria: 'Abrir navegación',
    navAchievements: '🏆   Logros / Títulos',
    dateOverdue: '⌛ Fecha cumplida',
    dateTodayDue: '⏳ ¡Hoy es la fecha meta!',
    daysRemaining: (d) => `⏳ ${d}d restantes`,
    activeFrameTooltip: (name) =>
      `Marco activo: ${name} (toca para explorar 48 marcos y 30 sonidos)`,
    framesAndFx: 'Marcos & FX',
    customizeObjective: 'Personalizar',
    customizeObjectiveTooltip: 'Personalizar objetivo',
    changeBackground: 'Fondo',
    changeBackgroundTooltip: 'Cambiar arte o foto de fondo',
    changeIconTooltip: 'Cambiar icono y estilo del objetivo',
    addPledgeOrDate: '＋ Añadir propósito o fecha límite…',
    achievedBadge: 'LOGRADO',
    progressAchieved: '¡LOGRADO!',
    progressAdvance: 'AVANCE',
    finalGoalLabel: 'META FINAL',
    goalSurpassed: '¡Meta superada! 🏆',
    remainingToGoal: (amt) => `Faltan ${amt}`,
    milestoneTitle: (pct, amt) => `Hito ${pct}: ${amt}`,
    nextMilestone: (pct, amt) => `Próximo hito (${pct}%): a ${amt}`,
    allMilestonesCompleted:
      '🏆 ¡Todos los hitos de este objetivo completados!',
    entriesCountLabel: (c) => `${c} ${c === 1 ? 'registro' : 'registros'}`,
    suggestedPace: (amt) => `Ritmo sugerido: ${amt} / día`,
    highestImpulse: (amt) => `Mayor impulso: +${amt}`,
    pledgeReward: (p) => `Premio: ${p}`,
    definePledge: '＋ Definir mi premio al lograrlo',
    levelUpPreview: '· ¡SUBES NV!',
    achievementsSectionTitle: 'Logros',
    achievementsSectionSubtitle:
      'Medallas e hitos desbloqueados en este objetivo',
    viewAllAchievements: 'VER TODOS →',
    secretAchievement: 'Logro misterioso',
    petMascotTooltipUnclaimed:
      '¡Acaricia a tu guardián para ganar +15 XP hoy!',
    petMascotTooltipPetted: 'Toca para interactuar con tu mascota',
    petMascotRewardUnclaimed: '👋 +15 XP',
    petMascotRewardPetted: '💖 Vínculo',
    settingsEditGoalTitle: 'Personalizar objetivo',
    settingsEditGoalSubtitle: 'Nombre, meta, icono, fecha y premio',
    settingsBackgroundTitle: 'Fondo y encuadre',
    settingsBackgroundSubtitle: 'Cambiar paisaje o subir imagen',
    settingsArchiveTitle: 'Archivar en el baúl',
    settingsArchiveSubtitle: 'Guardar sin perder su progreso',
    settingsDeleteTitle: 'Eliminar objetivo',
    settingsDeleteSubtitle: 'Borrar permanentemente',
    settingsIndieCardTitle: '💖 Creado por un Desarrollador Indie',
    settingsIndieCardSub: (gems) =>
      `Personaliza las 200 mascotas con Skins, equipa Marcos y Sonidos o activa Buffs con tus Gemas (💎 ${gems}).`,
    settingsSkinsBuffsBtn: '💎 Skins & Buffs',
    settingsSupportDevBtn: '💖 Apoyar al Dev',
    currentBalanceLabel: 'Saldo actual:',
    historyFilterAll: 'Todas',
    historyFilterAdd: 'Sumas',
    historyFilterSubtract: 'Restas',
    backButton: 'Volver',
    shopMainTitle: '💎 Cosméticos, Tarjetas, Audio & Apoyo Indie',
    shopCollectiblesBadge: (c) =>
      `✨ ${c} COLECCIONABLES EN EL SANTUARIO`,
    filterAllWithCount: (c) => `Todos (${c})`,
    filterFree: (c) => `🎁 Gratis (${c})`,
    filterPremium: (c) => `💎 Gemas (${c})`,

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
    levelUpCelebration: (lvl) => `¡Subiste al Nivel ${lvl}!`,
    petGreetNoEntry: '¡Qué alegría verte hoy! Un pequeño aporte encenderá nuestra racha 🔥',
    petGreetStreak: (d) => `¡Eso es! Ya llevamos ${d} ${d === 1 ? 'día' : 'días'} seguidos brillando ✨`,
    petGreetLevelsLeft: (l) => `¡Siento el poder crecer! Solo ${l} ${l === 1 ? 'nivel' : 'niveles'} más para descubrir una nueva especie 🐾`,
    petGreetMax: '¡Hemos alcanzado la cumbre cósmica juntos! 🪐',
    petGreetObjectiveSurpassed: (t) => `¡Completamos «${t}»! Eres imparable 🏆`,
    petGreetObjectiveRemaining: (t, a) => `¡Vamos por «${t}»! Faltan ${a} 🚀`,
    petGreetThanks: '¡Gracias por cuidarme! Cada paso tuyo me hace evolucionar 💖',
    creatureLockedYet: 'Criatura aún bloqueada',
    lockedLevelCreature: (lvl) => `🔒 Nivel ${lvl} · Criatura Misteriosa`,
    unlockedLevelCreature: (lvl, name) => `✨ Nivel ${lvl} · ${name}`,
    spyLevelSilhouette: (lvl, hint) => `Espiar silueta de Nivel ${lvl}: ${hint}`,
    reachLevelToUnlockSpecies: (lvl) => `Especie de Nivel ${lvl} aún bloqueada (Alcanza el Nivel ${lvl} para revelarla)`,
    reachLevelForSkinAura: (lvl, skin) => `🔒 Sube a Nivel ${lvl} para desbloquear esta especie sin spoilers. Puedes apreciar el anillo exterior de «${skin}» sobre su silueta.`,
    tapToHearBioVoice: 'Toca para escuchar la voz bio-acústica de esta especie',

    // ASMR Rewards
    asmrUnlockedTapStyle: (name, emoji, taps, gemsText, xp) => `🎉 ¡DESBLOQUEASTE «${name}» (${emoji}) por alcanzar ${taps} toques! ${gemsText}+${xp} XP`,
    asmrLuckBonus: (gems, cur, max, xp) => `🎁 ¡Suerte y Armonía ASMR! +${gems} 💎 (${cur}/${max} hoy) y +${xp} XP`,
    asmrZenCapBonus: (xp, max) => `🧘 ¡Armonía Zen! +${xp} XP de Calma (Tope diario de ${max} 💎 alcanzado hoy)`,

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
    changedGoalNameProtection: (oldT, newT) => `Cambiaste el objetivo «${oldT}» por «${newT}», una meta distinta.`,
    createGoalModalTitle: '＋ Crear Nuevo Objetivo',
    editGoalModalTitle: '🎨 Personalizar Objetivo',
    createGoalModalSub: 'Elige una plantilla prediseñada o crea tu meta a medida con sintonía total de color.',
    editGoalModalSub: 'Personaliza colores, fondo, fecha meta o premio. Si cambias de meta, protegemos tu historial.',
    defaultGoalTitle: 'Tu Próxima Gran Meta',
    pledgePreviewLabel: (p) => `🎁 Premio: ${p}`,
    liveColorTuningPreview: 'Vista previa en vivo con sintonía cromática completa',
    placeholderGoalTitle: 'Ej. Viaje a Japón, Fondo de Paz…',
    placeholderGoalCategory: 'Finanzas, Aventura, Salud, Hábito…',
    placeholderGoalPledge: 'Ej. Cena especial, día libre, festejar…',
    createGoalSubmit: '🚀 Crear Objetivo',
    saveGoalChangesSubmit: '✓ Guardar Cambios',
    cropImageHint: 'Selecciona una foto para encuadrarla aquí\narrastra para moverla',
    goalAmountInputLabel: 'Monto o cantidad meta',
    goalDateInputLabel: 'Fecha meta (opcional)',
    goalAccentThemeLabel: 'COLOR DE ENERGÍA (SINTONÍA TOTAL)',
    startCleanGoalPrompt: '💡 ¿Estás queriendo crear un Nuevo Objetivo en realidad?',
    startCleanGoalBtn: 'Empezar limpio',

    // Audio Packs & Audition
    soundPackSteps: ['1/5 · Toque UI', '2/5 · +Sumar Avance', '3/5 · −Restar Gasto', '4/5 · 🎯 Misión Diaria', '5/5 · 🏆 Fanfarria Meta'],
    soundPackPads: ['1·Toque', '2·+Suma', '3·−Resta', '4·Misión', '5·Logro'],
    soundPackAuditionTooltip: (step, name) => `Escuchar ${step} de ${name}`,
    soundPackActivatedNotice: (name) => `¡Pack de 5 Sonidos "${name}" activado!`,
    soundPackEngineNotice: (engine) => `Motor ${engine} activo en toda la app`,
    acousticEnginesBadge: (c) => `${c} motores acústicos`,

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
    payMpTipBtn: (usd, ars, gems) => `🤝 Aportar con Mercado Pago (${usd} USD · ~${ars} ARS)`,
    payPaypalTipBtn: (usd, gems) => `🌍 Aportar con PayPal / GPay (${usd} USD)`,
    equippedFrameNotice: (name) => `¡Marco "${name}" equipado en vivo!`,
    equippedFrameCardSub: (title) => `Míralo aplicado arriba en tu tarjeta «${title}»`,
    themeAppliedNotice: (title) => `Tu tarjeta «${title}» ya luce esta sintonía arriba y en el tablero`,
    applyThemeNow: '🌈 Aplicar Sintonía Ahora',
    themeEquipped: '✓ Sintonía Aplicada',
    titleEquippedBadge: '✓ Título Equipado',
    equipTitleBtn: '🏅 Equipar Título',
    relicInSanctuary: '✓ Reliquia en tu Santuario',
    blessingClaimed: '✓ Bendición Reclamada',
    requiresGuardianLevel: (lvl) => `🔒 Requiere Guardián Nv. ${lvl}`,
    copyCodeBtn: '📋 Copiar Código',
    codeCopiedBtn: '✓ Copiado',
    licenseInputPlaceholder: 'Pega aquí tu código OR-PRO-...',
    astralGemsTooltip: 'Tus Gemas Astrales (toca para obtener más o apoyar al creador)',
    tabThemesVault: (c) => `🌈 Sintonías (${c})`,
    tabTitlesVault: (c) => `🏅 Títulos (${c})`,
    categoryFallback: 'Objetivo',

    // Serene Progress Mode
    sereneFocusMode: '🌱 Modo Enfoque Sereno',
    sereneFocusSubtitle: 'Prioriza tu meta y números reales sin saturación',
    projectedRemaining: (rem, pct) => `Quedan ${rem} (${pct}%) para tu meta`,
    dailyBonusIncluded: 'incluye bono diario',
    streakMultiplier: (d) => `racha x${d}d`,
    goalCompletedCelebration: '¡Objetivo completado!',
    remainingToGoalShort: (amt) => `¡A solo ${amt} de la meta! Un último impulso 🚀`,
  },
  en: {
    appTitle: 'Objective Reacher',
    sanctuaryTitle: 'Guardian Sanctuary',
    store: 'Store',
    activeStreak: 'Active Streak',
    streakDaysUnit: 'consecutive day',
    streakDaysPlural: 'consecutive days',
    streakIgnitePrompt: 'Keep your streak flame burning bright! 🔥',
    streakShieldCount: (c) => `${c} ${c === 1 ? 'Shield' : 'Shields'}`,
    streakShieldTooltip: 'Streak Shields: automatically saves your streak if you miss a day.',
    openStoreTooltip: (gems) => `Open Indie Sanctuary (${gems.toLocaleString()} gems): Skins, Buffs & Dev Support`,
    navigation: 'Navigation',
    history: 'Entry History',
    openHistory: 'Open entry history',
    closeHistory: 'Close history',
    settings: 'Settings',
    archived: 'Archived',
    newObjective: 'New Goal',
    activeObjectivesCount: (c) => `${c} active ${c === 1 ? 'goal' : 'goals'}`,
    oneRowToggle: '↔ 1 row',
    viewAllToggle: '☷ View all',
    scrollLeft: 'Scroll left',
    scrollRight: 'Scroll right',
    archivedCount: (c) => `Archived (${c})`,
    ambientMusicOn: (s) => `Music (${s}): ON`,
    ambientMusicOff: 'Ambient Music: OFF',
    ambientMusicTooltipOn: (s) => `Ambient music playing (${s}) · Tap to mute`,
    ambientMusicTooltipOff: (s) => `Enable procedural ambient music (${s})`,
    soundHapticsOn: 'Sound & Haptics: ON',
    soundHapticsOff: 'Sound & Haptics: OFF',
    soundHapticsTooltipOn: 'Sound effects and haptics enabled (tap to mute)',
    soundHapticsTooltipOff: 'Muted (tap to enable sound and vibration)',
    languageSelect: 'App Language',
    languageLabel: '🌐 Language / Idioma',
    asmrTitle: '🫧 ASMR SANCTUARY & GUARDIAN CLICKER',
    asmrSubtitle: 'Explore 16 ASMR Orbs with binaural sound and continuous haptic pulse.',
    totalTaps: 'Total Taps',
    dailyGemsCap: (c, m) => `💎 Today: ${c}/${m}`,
    dailyGemsTooltip: 'Daily Clicker Gem cap. Reach 8/8 to enter Zen mode (+continuous XP).',
    holdToStreamHint: '💡 Hold the orb down for a smooth binaural stream.',
    tapOrbButton: 'TAP ORB',
    harmonyChest: (c, m) => `✨ Harmony Chest (${c}/${m})`,
    tapsRemaining: (c) => `${c} taps left`,
    nextFreeOrb: (name, emoji, cur, tot) => `🎯 Next Free Orb: ${emoji} ${name} (${cur}/${tot} taps)`,
    asmrZenRule: (cap) => `💡 Every 50 taps awards +1 💎 and +10 XP (up to ${cap} 💎/day; then Zen XP).`,
    filterAll: 'All',
    filterMyOrbs: '✓ My Orbs',
    filterTaps: '🎯 By Taps',
    filterSkins: '💎 Orb Skins',
    inUse: 'IN USE',
    ready: 'READY',
    trySound: '🔊 Preview',
    openArrow: 'Unlock →',
    asmrClickerButton: 'ASMR Clicker & Orbs (16)',
    tryItBadge: 'TRY IT! 🎧',
    playAsmrCta: 'PLAY ASMR CLICKER ✨',
    calmSpark: '+Calm',
    dailyQuestsTitle: 'Daily Quests',
    dailyQuestsHeader: (c, t) => `🎯 Today Quests (${c}/${t})`,
    claimButton: 'CLAIM!',
    sealChestClaimed: '👑 Daily Seal Claimed',
    claimChestReward: '🎁 Claim Chest +40 XP',
    chestProgress: (c, t) => `Chest: ${c}/${t}`,
    dailySealCompleteBonus: 'Complete all 3 daily quests to claim the Seal Chest (+40 XP)',
    todayActive: 'Today (Active)',
    todayPending: 'Today (Pending)',
    registerProgress: 'Log Progress',
    quickOrWrite: 'Pick a quick amount or enter your own',
    addAdvance: 'Add Progress',
    subtractExpense: 'Deduct / Expense',
    customPlaceholder: (f) => `Custom (${f})`,
    optionalNotePlaceholder: 'Optional note (e.g. Weekly savings)',
    registerButton: (f) => `Log ${f}`,
    dailyTarget: 'Daily Target',
    completedStatus: 'Completed',
    streakLabel: 'Streak',
    editGoal: 'Edit Goal',
    noActiveGoalsTitle: 'No active goals',
    noActiveGoalsSub: 'Create your first goal to start building your daily streak.',
    createGoalButton: 'Create goal',
    logHistoryToday: 'Today history',
    todayEmptyHistory: 'No activity logged today.',
    mascotCodex: '🐾 Pet Codex (1–200)',
    levelUnlockedInfo: (lvl) => `Unlocked up to Lv. ${lvl} · Tap a creature to hear its bio-voice.`,
    touchMascotVoicePrompt: 'Tap your pet to interact',
    unlockedUntil: (lvl) => `Unlocked up to Lv. ${lvl}`,
    petMascotVoiceHint: 'Pet your guardian daily to bond and earn bonus XP.',
    dailyPetRewardNotice: (xp, gems) => `Daily pet received! +${xp} XP & +${gems} 💎 bond gems 💖`,
    levelAbbr: 'LV.',
    newSpeciesPrompt: 'New species?',
    codexLink: 'CODEX (1–200) →',
    stageEvolutionTrack: (tier, sub) => `Tier ${tier}/20 · Evolution ${sub}/10`,
    nextSpeciesIn: (c) => `Next species in ${c} lv.`,
    supremeStageUnlocked: 'Supreme Tier Unlocked',
    viewLevelInCodex: (lvl) => `View Level ${lvl} in Codex`,
    auraLabel: 'Aura',
    founderBonusBadge: '👑 +20% XP Founder',
    statsTitle: 'Boost Statistics',
    statsSubtitle: 'Clear overview of your consistency and momentum',
    statMovements: 'ENTRIES',
    statInThisGoal: (c) => `${c} in this goal`,
    statBestEntry: 'BEST ENTRY',
    statSingleEntry: 'in a single entry',
    statGuardianLevel: 'GUARDIAN LEVEL',
    statTotalXp: 'TOTAL XP',
    statAccumulated: 'accumulated',
    bankTitle: '💎 Cosmetics, Cards, Audio & Indie Support',
    bankDescription: 'Customize your guardian with auras, frames and sound packs.',
    collectiblesCount: (c) => `✨ ${c} SANCTUARY COLLECTIBLES`,
    tabSkins: (c) => `🎨 Skins (${c})`,
    tabCardsAudio: (c) => `✨ Cards & Audio (${c})`,
    tabBuffs: (c) => `🧪 Buffs & Relics (${c})`,
    tabSupport: '💖 Support Dev',
    searchPlaceholder: '🔍 Search skin, frame, sound, relic...',
    equippedCurrent: '✓ Currently equipped',
    equipNow: '✨ Equip now',
    unlockCost: (g) => `Unlock · 💎 ${g}`,
    antiSpoilerNotice: (lvl) => `🔒 Levels above Lv. ${lvl} hidden to prevent spoilers.`,
    myLevelBtn: (lvl) => `My Lv. (${lvl})`,
    founderTitle: 'Lifetime Founder Patron',
    redeemCode: 'Redeem Code',
    licenseCodePlaceholder: 'License code',
    redeemButton: 'Redeem',
    launchOfferBannerBadge: 'GLOBAL LAUNCH v1.0',
    launchMaxDiscount: 'UP TO 53% OFF',
    launchOfferBannerTitle: '🚀 Limited-Time Premiere Deals',
    launchOfferBannerSub: 'Celebrating the official global launch of Objective Reacher. Exclusive promotional pricing to support indie development and unlock the full Vault.',
    launchTimerLabel: 'Offer ends in:',
    daysShort: 'Days',
    hoursShort: 'Hours',
    minsShort: 'Mins',
    secsShort: 'Secs',
    launchPerk1: 'Guaranteed premiere launch pricing',
    launchPerk2: 'Lifetime unlock with zero subscriptions',
    launchPerk3: 'Transferable cryptographic PRO license',
    launchPerk4: 'No ads, no aggressive microtransactions',
    regularPriceLabel: 'Regular',
    launchPriceLabel: 'Premiere',
    payWithMercadoPago: (p) => `🤝 Pay with Mercado Pago (${p})`,
    payWithPaypal: (p) => `🌍 Pay with PayPal / GPay (${p})`,
    activeFounderBtn: '👑 Founder Pass Active',
    supportTabPromoBadge: '🔥 -53% OFF',
    objectiveSettings: 'Goal Settings',
    customizeGoal: 'Customize goal',
    customizeGoalSub: 'Name, target, icon, deadline & pledge',
    bannerFrame: 'Banner & frame',
    bannerFrameSub: 'Change landscape or upload image',
    archiveGoal: 'Archive to vault',
    archiveGoalSub: 'Store without losing progress',
    deleteGoal: 'Delete goal',
    deleteGoalSub: 'Permanently remove',
    devCredits: '💖 Crafted by an Indie Developer',
    devCreditsSub: (g) => `Customize 200 pets with Skins, Frames and Sounds using your Gems (💎 ${g}).`,
    createNewGoalTitle: 'Create New Goal',
    editGoalTitle: 'Edit Goal',
    goalNameLabel: 'Goal title',
    goalTargetLabel: 'Target quantity',
    goalUnitLabel: 'Unit of measurement',
    goalIconLabel: 'Representative icon',
    goalThemeLabel: 'Theme color',
    quickTemplatesLabel: 'Quick templates',
    saveGoalButton: 'Save Goal',
    cancelButton: 'Cancel',
    confirmButton: 'Confirm',
    closeButton: 'Close',
    deleteButton: 'Delete',
    restoreButton: 'Restore',
    archivedGoalsTitle: 'Archived Goals',
    noArchivedGoals: 'No archived goals.',
    permanentDeleteButton: 'Delete permanently',
    historyTitle: 'Activity History',
    today: 'Today',
    yesterday: 'Yesterday',
    noEntriesYet: 'No activity recorded yet.',
    deleteEntryConfirm: 'Delete this progress entry?',

    // Extra navigation & brand
    navObjective: '🎯 Current Goal',
    navSanctuary: '💎 Sanctuary & Collections',
    navAsmr: '🫧 ASMR Sanctuary',
    navRituals: '📅 Daily Rituals',
    navStats: '▥ Statistics',
    navSettings: '⚙ Goal Settings',
    navHistory: '📜 Entry History',
    navArchived: '🗄 Archived Goals',
    brandTagline: 'Your progress, at your pace',
    closeMenu: 'Close menu',
    openNav: 'Open navigation',
    founderBadge: '👑 FOUNDER',
    guardianTitleTooltip: 'Change Guardian Title in Sanctuary Bank',
    changeGuardianTitle: 'Change Title',
    manageArchived: 'Manage Archived',
    openCodexButton: 'Pet Codex (1–200)',
    copyAddress: 'Copy address',
    copiedToast: 'Copied to clipboard!',

    // Main Objective progress & card
    progressCurrent: 'Current progress',
    dailyTargetProgress: 'Daily target',
    dailyTargetCompleted: 'Completed today',
    completedBadge: 'Goal reached!',
    inProgressBadge: 'In progress',
    addAdvanceBtn: 'Add Progress',
    subtractExpenseBtn: 'Deduct / Adjust',
    completeTodayBtn: 'Complete today\'s goal',
    quickPresetsLabel: 'Quick amounts:',
    enterCustomAmount: 'Or enter custom amount',
    saveEntryBtn: (val, xp) => `Save ${val} (+${xp} XP)`,
    optionalNote: 'Optional note or reflection...',

    // Mascot card
    mascotCompanion: 'Guardian Pet',
    mascotSubtitle: 'Habit Companion',
    tapMascotHint: 'Tap your pet to interact',
    mascotLevelLabel: (lvl) => `LV. ${lvl}`,
    speciesMystery: 'New species?',
    streakSevenDays: '7-day consistency',
    dailyChestLabel: (c) => `Chest: ${c}/3`,
    claimChestBonus: '🎁 Claim Chest +40 XP',
    dailySealBonusNotice: 'Complete all 3 daily quests for the Seal Chest (+40 XP)',
    dailySealCompleted: '👑 Daily seal completed',

    // ASMR Block
    asmrFlowing: 'ASMR FLOW...',
    slideStylesHint: 'Slide styles →',
    scrollAsmrLeft: 'Scroll ASMR styles left',
    scrollAsmrRight: 'Scroll ASMR styles right',

    // Boost stats
    statMovementsLabel: 'ENTRIES',
    statInGoal: (c) => `${c} in this goal`,
    statBestLabel: 'BEST ENTRY',
    statSingle: 'In a single entry',
    statGuardianLabel: 'GUARDIAN LEVEL',
    statCurrentRank: 'Current rank',
    statTotalXpLabel: 'TOTAL ACCUMULATED XP',
    statTotalGems: (g) => `${g.toLocaleString()} gems earned`,

    // Sanctuary shop
    supportLetterTitle: 'Developer Note',
    customTipTitle: 'Would you like to support with a custom tip?',
    cryptoTitle: 'International & Crypto Support',

    // Comprehensive app-wide localization additions
    sidebarActiveStreak: 'Active streak',
    shieldsUnit: (c) => `${c} ${c === 1 ? 'shield' : 'shields'}`,
    indieDevEmpathySidebar:
      'Crafted by 1 indie dev · 0% ads. Explore Skins, Buffs, and support options.',
    sidebarFounderBadge: '👑 INDIE FOUNDER',
    sidebarSupporterBadge: '☕ INDIE SUPPORTER',
    sidebarIndieProject: '💖 100% INDIE PROJECT',
    floatingMenuBtn: 'Menu',
    openNavAria: 'Open navigation',
    navAchievements: '🏆   Achievements / Titles',
    dateOverdue: '⌛ Target date passed',
    dateTodayDue: '⏳ Today is the target date!',
    daysRemaining: (d) => `⏳ ${d}d remaining`,
    activeFrameTooltip: (name) =>
      `Active Frame: ${name} (tap to explore 48 frames and 30 sounds)`,
    framesAndFx: 'Frames & FX',
    customizeObjective: 'Customize',
    customizeObjectiveTooltip: 'Customize goal',
    changeBackground: 'Background',
    changeBackgroundTooltip: 'Change scenery or background photo',
    changeIconTooltip: 'Change goal icon and styling',
    addPledgeOrDate: '＋ Add personal pledge or target date…',
    achievedBadge: 'ACHIEVED',
    progressAchieved: 'ACHIEVED!',
    progressAdvance: 'PROGRESS',
    finalGoalLabel: 'FINAL GOAL',
    goalSurpassed: 'Goal surpassed! 🏆',
    remainingToGoal: (amt) => `${amt} left`,
    milestoneTitle: (pct, amt) => `Milestone ${pct}: ${amt}`,
    nextMilestone: (pct, amt) => `Next milestone (${pct}%): ${amt} away`,
    allMilestonesCompleted: '🏆 All milestones for this goal completed!',
    entriesCountLabel: (c) => `${c} ${c === 1 ? 'entry' : 'entries'}`,
    suggestedPace: (amt) => `Suggested pace: ${amt} / day`,
    highestImpulse: (amt) => `Biggest push: +${amt}`,
    pledgeReward: (p) => `Reward: ${p}`,
    definePledge: '＋ Set my reward upon completion',
    levelUpPreview: '· LEVEL UP!',
    achievementsSectionTitle: 'Achievements',
    achievementsSectionSubtitle:
      'Badges and milestones unlocked in this goal',
    viewAllAchievements: 'VIEW ALL →',
    secretAchievement: 'Mystery Achievement',
    petMascotTooltipUnclaimed: 'Pet your guardian to earn +15 XP today!',
    petMascotTooltipPetted: 'Tap to interact with your pet',
    petMascotRewardUnclaimed: '👋 +15 XP',
    petMascotRewardPetted: '💖 Bond',
    settingsEditGoalTitle: 'Customize Goal',
    settingsEditGoalSubtitle: 'Name, target, icon, date, and reward',
    settingsBackgroundTitle: 'Background & Framing',
    settingsBackgroundSubtitle: 'Change scenery or upload image',
    settingsArchiveTitle: 'Archive to Vault',
    settingsArchiveSubtitle: 'Save safely without losing progress',
    settingsDeleteTitle: 'Delete Goal',
    settingsDeleteSubtitle: 'Permanently remove',
    settingsIndieCardTitle: '💖 Created by an Indie Developer',
    settingsIndieCardSub: (gems) =>
      `Customize all 200 pets with Skins, equip Frames and Sounds, or activate Buffs with your Gems (💎 ${gems}).`,
    settingsSkinsBuffsBtn: '💎 Skins & Buffs',
    settingsSupportDevBtn: '💖 Support Dev',
    currentBalanceLabel: 'Current balance:',
    historyFilterAll: 'All',
    historyFilterAdd: 'Additions',
    historyFilterSubtract: 'Subtractions',
    backButton: 'Back',
    shopMainTitle: '💎 Cosmetics, Cards, Audio & Indie Support',
    shopCollectiblesBadge: (c) =>
      `✨ ${c} COLLECTIBLES IN SANCTUARY`,
    filterAllWithCount: (c) => `All (${c})`,
    filterFree: (c) => `🎁 Free (${c})`,
    filterPremium: (c) => `💎 Gems (${c})`,

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
    levelUpCelebration: (lvl) => `Level Up! You reached Lv. ${lvl}!`,
    petGreetNoEntry: 'So glad to see you today! A small step keeps our flame burning bright 🔥',
    petGreetStreak: (d) => `That is it! We have been glowing for ${d} ${d === 1 ? 'day' : 'days'} in a row ✨`,
    petGreetLevelsLeft: (l) => `I feel the power growing! Just ${l} more ${l === 1 ? 'level' : 'levels'} to meet a new species 🐾`,
    petGreetMax: 'We have reached the cosmic pinnacle together! 🪐',
    petGreetObjectiveSurpassed: (t) => `We completed "${t}"! You are unstoppable 🏆`,
    petGreetObjectiveRemaining: (t, a) => `Let us reach "${t}"! Only ${a} left 🚀`,
    petGreetThanks: 'Thank you for taking care of me! Every step makes me evolve 💖',
    creatureLockedYet: 'Creature still locked',
    lockedLevelCreature: (lvl) => `🔒 Level ${lvl} · Mysterious Creature`,
    unlockedLevelCreature: (lvl, name) => `✨ Level ${lvl} · ${name}`,
    spyLevelSilhouette: (lvl, hint) => `Preview Level ${lvl} silhouette: ${hint}`,
    reachLevelToUnlockSpecies: (lvl) => `Level ${lvl} species locked (Reach Level ${lvl} to reveal)`,
    reachLevelForSkinAura: (lvl, skin) => `🔒 Reach Level ${lvl} to reveal this species spoiler-free. You can preview "${skin}" aura around its outline.`,
    tapToHearBioVoice: 'Tap to listen to this creature bio-acoustic voice',

    // ASMR Rewards
    asmrUnlockedTapStyle: (name, emoji, taps, gemsText, xp) => `🎉 UNLOCKED «${name}» (${emoji}) for reaching ${taps} taps! ${gemsText}+${xp} XP`,
    asmrLuckBonus: (gems, cur, max, xp) => `🎁 ASMR Luck & Harmony! +${gems} 💎 (${cur}/${max} today) and +${xp} XP`,
    asmrZenCapBonus: (xp, max) => `🧘 Zen Harmony! +${xp} Calm XP (Daily cap of ${max} 💎 reached today)`,

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
    changedGoalNameProtection: (oldT, newT) => `Changed goal from "${oldT}" to "${newT}", a different objective.`,
    createGoalModalTitle: '＋ Create New Goal',
    editGoalModalTitle: '🎨 Customize Goal',
    createGoalModalSub: 'Choose a preset template or create a custom goal with full color resonance.',
    editGoalModalSub: 'Customize colors, background, target date or reward. Your history remains safe.',
    defaultGoalTitle: 'Your Next Milestone',
    pledgePreviewLabel: (p) => `🎁 Reward: ${p}`,
    liveColorTuningPreview: 'Live preview with full chromatic resonance',
    placeholderGoalTitle: 'e.g. Trip to Japan, Peace Fund…',
    placeholderGoalCategory: 'Finances, Adventure, Health, Habit…',
    placeholderGoalPledge: 'e.g. Special dinner, day off, celebrate…',
    createGoalSubmit: '🚀 Create Goal',
    saveGoalChangesSubmit: '✓ Save Changes',
    cropImageHint: 'Select a photo to frame it here\ndrag to adjust position',
    goalAmountInputLabel: 'Target amount',
    goalDateInputLabel: 'Target date (optional)',
    goalAccentThemeLabel: 'ENERGY COLOR & CHROMATIC THEME',
    startCleanGoalPrompt: '💡 Are you looking to create a brand new goal instead?',
    startCleanGoalBtn: 'Start clean',

    // Audio Packs & Audition
    soundPackSteps: ['1/5 · UI Tap', '2/5 · +Add Progress', '3/5 · −Deduct Expense', '4/5 · 🎯 Daily Quest', '5/5 · 🏆 Goal Fanfare'],
    soundPackPads: ['1·Tap', '2·+Add', '3·−Deduct', '4·Quest', '5·Badge'],
    soundPackAuditionTooltip: (step, name) => `Listen to ${step} of ${name}`,
    soundPackActivatedNotice: (name) => `Sound pack of 5 "${name}" activated!`,
    soundPackEngineNotice: (engine) => `${engine} engine active across app`,
    acousticEnginesBadge: (c) => `${c} acoustic engines`,

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
    payMpTipBtn: (usd, ars, gems) => `🤝 Support with Mercado Pago (${usd} USD · ~${ars} ARS)`,
    payPaypalTipBtn: (usd, gems) => `🌍 Support with PayPal / GPay (${usd} USD)`,
    equippedFrameNotice: (name) => `Frame "${name}" equipped live!`,
    equippedFrameCardSub: (title) => `See it applied above on your card "${title}"`,
    themeAppliedNotice: (title) => `Your card "${title}" now shines with this theme`,
    applyThemeNow: '🌈 Apply Theme Now',
    themeEquipped: '✓ Theme Applied',
    titleEquippedBadge: '✓ Title Equipped',
    equipTitleBtn: '🏅 Equip Title',
    relicInSanctuary: '✓ Relic in Sanctuary',
    blessingClaimed: '✓ Blessing Claimed',
    requiresGuardianLevel: (lvl) => `🔒 Requires Guardian Lv. ${lvl}`,
    copyCodeBtn: '📋 Copy Code',
    codeCopiedBtn: '✓ Copied',
    licenseInputPlaceholder: 'Paste your OR-PRO-... code here',
    astralGemsTooltip: 'Your Astral Gems (tap to get more or support creator)',
    tabThemesVault: (c) => `🌈 Themes (${c})`,
    tabTitlesVault: (c) => `🏅 Titles (${c})`,
    categoryFallback: 'Goal',

    // Serene Progress Mode
    sereneFocusMode: '🌱 Serene Focus Mode',
    sereneFocusSubtitle: 'Prioritize your actual numbers and milestone without noise',
    projectedRemaining: (rem, pct) => `${rem} remaining (${pct}%) to target`,
    dailyBonusIncluded: 'includes daily bonus',
    streakMultiplier: (d) => `streak x${d}d`,
    goalCompletedCelebration: 'Goal Completed!',
    remainingToGoalShort: (amt) => `Only ${amt} to goal! One final push 🚀`,
  },
  pt: {
    appTitle: 'Objective Reacher',
    sanctuaryTitle: 'Santuário do Guardião',
    store: 'Loja',
    activeStreak: 'Sequência Ativa',
    streakDaysUnit: 'dia consecutivo',
    streakDaysPlural: 'dias consecutivos',
    streakIgnitePrompt: 'Mantenha acesa a chama da sua sequência! 🔥',
    streakShieldCount: (c) => `${c} ${c === 1 ? 'Escudo' : 'Escudos'}`,
    streakShieldTooltip: 'Escudos de Sequência: salvam sua racha se você esquecer um dia.',
    openStoreTooltip: (gems) => `Abrir Santuário Indie (${gems.toLocaleString()} gemas): Skins, Buffs & Apoio`,
    navigation: 'Navegação',
    history: 'Histórico de entradas',
    openHistory: 'Abrir histórico de entradas',
    closeHistory: 'Fechar histórico',
    settings: 'Ajustes',
    archived: 'Arquivados',
    newObjective: 'Nova meta',
    activeObjectivesCount: (c) => `${c} ${c === 1 ? 'meta ativa' : 'metas ativas'}`,
    oneRowToggle: '↔ 1 linha',
    viewAllToggle: '☷ Ver todas',
    scrollLeft: 'Rolar para a esquerda',
    scrollRight: 'Rolar para a direita',
    archivedCount: (c) => `Arquivados (${c})`,
    ambientMusicOn: (s) => `Música (${s}): LIGADA`,
    ambientMusicOff: 'Música Ambiente: DESLIGADA',
    ambientMusicTooltipOn: (s) => `Música ambiente tocando (${s}) · Toque para silenciar`,
    ambientMusicTooltipOff: (s) => `Ativar música ambiente (${s})`,
    soundHapticsOn: 'Som & Toque: LIGADO',
    soundHapticsOff: 'Som & Toque: DESLIGADO',
    soundHapticsTooltipOn: 'Efeitos sonoros e vibração ativados (toque para silenciar)',
    soundHapticsTooltipOff: 'Silenciado (toque para ativar som e vibração)',
    languageSelect: 'Idioma do Aplicativo',
    languageLabel: '🌐 Idioma / Language',
    asmrTitle: '🫧 SANTUÁRIO ASMR & CLICKER DO GUARDIÃO',
    asmrSubtitle: 'Explore 16 Orbes ASMR com áudio binaural e pulso tátil contínuo.',
    totalTaps: 'Toques totais',
    dailyGemsCap: (c, m) => `💎 Hoje: ${c}/${m}`,
    dailyGemsTooltip: 'Limite diário de Gemas no Clicker. Ao atingir 8/8, você entra no modo Zen.',
    holdToStreamHint: '💡 Mantenha pressionado o orbe para fluxo binaural contínuo.',
    tapOrbButton: 'TOCAR ORBE',
    harmonyChest: (c, m) => `✨ Baú da Harmonia (${c}/${m})`,
    tapsRemaining: (c) => `Faltam ${c} toques`,
    nextFreeOrb: (name, emoji, cur, tot) => `🎯 Próximo Orbe grátis: ${emoji} ${name} (${cur}/${tot} toques)`,
    asmrZenRule: (cap) => `💡 A cada 50 toques você ganha +1 💎 e +10 XP (até ${cap} 💎/dia; depois modo Zen).`,
    filterAll: 'Todos',
    filterMyOrbs: '✓ Meus Orbes',
    filterTaps: '🎯 Por Toques',
    filterSkins: '💎 Skins de Orbe',
    inUse: 'EM USO',
    ready: 'PRONTO',
    trySound: '🔊 Testar',
    openArrow: 'Abrir →',
    asmrClickerButton: 'Clicker ASMR & Orbes (16)',
    tryItBadge: 'EXPERIMENTE! 🎧',
    playAsmrCta: 'JOGAR CLICKER ASMR ✨',
    calmSpark: '+Calma',
    dailyQuestsTitle: 'Missões Diárias',
    dailyQuestsHeader: (c, t) => `🎯 Missões de hoje (${c}/${t})`,
    claimButton: 'RESGATAR!',
    sealChestClaimed: '👑 Selo diário concluído',
    claimChestReward: '🎁 Resgatar Baú +40 XP',
    chestProgress: (c, t) => `Baú: ${c}/${t}`,
    dailySealCompleteBonus: 'Complete as 3 missões diárias para o Baú do Selo (+40 XP)',
    todayActive: 'Hoje (Ativo)',
    todayPending: 'Hoje (Pendente)',
    registerProgress: 'Registrar Progresso',
    quickOrWrite: 'Escolha um valor rápido ou digite o seu',
    addAdvance: 'Somar progresso',
    subtractExpense: 'Deduzir / Despesa',
    customPlaceholder: (f) => `Outro (${f})`,
    optionalNotePlaceholder: 'Nota opcional (ex. Economia semanal)',
    registerButton: (f) => `Registrar ${f}`,
    dailyTarget: 'Meta Diária',
    completedStatus: 'Concluído',
    streakLabel: 'Sequência',
    editGoal: 'Editar meta',
    noActiveGoalsTitle: 'Nenhuma meta ativa',
    noActiveGoalsSub: 'Crie sua primeira meta para começar a construir sua sequência diária.',
    createGoalButton: 'Criar meta',
    logHistoryToday: 'Histórico de hoje',
    todayEmptyHistory: 'Nenhum registro hoje.',
    mascotCodex: '🐾 Códice de Mascotes (1–200)',
    levelUnlockedInfo: (lvl) => `Desbloqueado até Nível ${lvl} · Toque para ouvir a voz bioacústica.`,
    touchMascotVoicePrompt: 'Toque no mascote para interagir',
    unlockedUntil: (lvl) => `Desbloqueado até Nível ${lvl}`,
    petMascotVoiceHint: 'Acaricie seu guardião diariamente para fortalecer o vínculo.',
    dailyPetRewardNotice: (xp, gems) => `Carinho diário recebido! +${xp} XP e +${gems} 💎 gemas de vínculo 💖`,
    levelAbbr: 'NV.',
    newSpeciesPrompt: 'Nova espécie?',
    codexLink: 'CÓDICE (1–200) →',
    stageEvolutionTrack: (tier, sub) => `Etapa ${tier}/20 · Evolução ${sub}/10`,
    nextSpeciesIn: (c) => `Próxima espécie em ${c} nv.`,
    supremeStageUnlocked: 'Etapa Suprema Desbloqueada',
    viewLevelInCodex: (lvl) => `Ver Nível ${lvl} no Códice`,
    auraLabel: 'Aura',
    founderBonusBadge: '👑 +20% XP Fundador',
    statsTitle: 'Estatísticas de Impulso',
    statsSubtitle: 'Visão clara da sua consistência e evolução',
    statMovements: 'ENTRADAS',
    statInThisGoal: (c) => `${c} nesta meta`,
    statBestEntry: 'MELHOR ENTRADA',
    statSingleEntry: 'em um único registro',
    statGuardianLevel: 'NÍVEL DO GUARDIÃO',
    statTotalXp: 'XP TOTAL',
    statAccumulated: 'acumulados',
    bankTitle: '💎 Cosméticos, Cartões, Áudio & Apoio Indie',
    bankDescription: 'Personalize seu guardião com auras, molduras e sons.',
    collectiblesCount: (c) => `✨ ${c} COLECIONÁVEIS NO SANTUÁRIO`,
    tabSkins: (c) => `🎨 Skins (${c})`,
    tabCardsAudio: (c) => `✨ Cartões & Áudio (${c})`,
    tabBuffs: (c) => `🧪 Buffs & Relíquias (${c})`,
    tabSupport: '💖 Apoiar o Dev',
    searchPlaceholder: '🔍 Buscar skin, moldura, som, relíquia...',
    equippedCurrent: '✓ Equipado atualmente',
    equipNow: '✨ Equipar agora',
    unlockCost: (g) => `Desbloquear · 💎 ${g}`,
    antiSpoilerNotice: (lvl) => `🔒 Níveis superiores ao Nv. ${lvl} protegidos contra spoilers.`,
    myLevelBtn: (lvl) => `Meu Nv. (${lvl})`,
    founderTitle: 'Mecenas Fundador Vitalício',
    redeemCode: 'Resgatar Código',
    licenseCodePlaceholder: 'Código de licença',
    redeemButton: 'Resgatar',
    launchOfferBannerBadge: 'GRANDE LANÇAMENTO GLOBAL v1.0',
    launchMaxDiscount: 'ATÉ 53% OFF',
    launchOfferBannerTitle: '🚀 Ofertas de Estreia por Tempo Limitado',
    launchOfferBannerSub: 'Comemorando o lançamento oficial de Objective Reacher. Preços promocionais exclusivos para apoiar o desenvolvimento indie e desbloquear o Baú.',
    launchTimerLabel: 'Termina em:',
    daysShort: 'Dias',
    hoursShort: 'Horas',
    minsShort: 'Min',
    secsShort: 'Seg',
    launchPerk1: 'Preços de estreia garantidos',
    launchPerk2: 'Desbloqueio vitalício sem assinatura',
    launchPerk3: 'Licença PRO criptográfica transferível',
    launchPerk4: 'Sem anúncios ou microtransações invasivas',
    regularPriceLabel: 'Regular',
    launchPriceLabel: 'Estreia',
    payWithMercadoPago: (p) => `🤝 Pagar com Mercado Pago (${p})`,
    payWithPaypal: (p) => `🌍 Pagar com PayPal / GPay (${p})`,
    activeFounderBtn: '👑 Passe Fundador Ativo',
    supportTabPromoBadge: '🔥 -53% OFF',
    objectiveSettings: 'Ajustes da Meta',
    customizeGoal: 'Personalizar meta',
    customizeGoalSub: 'Nome, alvo, ícone, prazo e promessa',
    bannerFrame: 'Banner e moldura',
    bannerFrameSub: 'Trocar paisagem ou enviar imagem',
    archiveGoal: 'Arquivar no baú',
    archiveGoalSub: 'Guardar sem perder progresso',
    deleteGoal: 'Excluir meta',
    deleteGoalSub: 'Remover permanentemente',
    devCredits: '💖 Criado por um Desenvolvedor Indie',
    devCreditsSub: (g) => `Personalize seus 200 mascotes com Skins, Molduras e Sons usando Gemas (💎 ${g}).`,
    createNewGoalTitle: 'Criar Nova Meta',
    editGoalTitle: 'Editar Meta',
    goalNameLabel: 'Título da meta',
    goalTargetLabel: 'Alvo quantitativo',
    goalUnitLabel: 'Unidade de medida',
    goalIconLabel: 'Ícone representativo',
    goalThemeLabel: 'Cor temática',
    quickTemplatesLabel: 'Modelos rápidos',
    saveGoalButton: 'Salvar Meta',
    cancelButton: 'Cancelar',
    confirmButton: 'Confirmar',
    closeButton: 'Fechar',
    deleteButton: 'Excluir',
    restoreButton: 'Restaurar',
    archivedGoalsTitle: 'Metas Arquivadas',
    noArchivedGoals: 'Nenhuma meta arquivada.',
    permanentDeleteButton: 'Excluir permanentemente',
    historyTitle: 'Histórico de Atividades',
    today: 'Hoje',
    yesterday: 'Ontem',
    noEntriesYet: 'Nenhum registro ainda.',
    deleteEntryConfirm: 'Deseja excluir esta entrada de progresso?',

    // Extra navigation & brand
    navObjective: '🎯 Objetivo atual',
    navSanctuary: '💎 Santuário & Coleções',
    navAsmr: '🫧 Santuário ASMR',
    navRituals: '📅 Rituais Diários',
    navStats: '▥ Estatísticas',
    navSettings: '⚙ Ajustes do Objetivo',
    navHistory: '📜 Histórico de Registros',
    navArchived: '🗄 Objetivos Arquivados',
    brandTagline: 'Seu progresso, no seu ritmo',
    closeMenu: 'Fechar menu',
    openNav: 'Abrir navegação',
    founderBadge: '👑 FUNDADOR',
    guardianTitleTooltip: 'Mudar Título de Guardião no Banco do Santuário',
    changeGuardianTitle: 'Mudar Título',
    manageArchived: 'Gerenciar Arquivados',
    openCodexButton: 'Códice de Mascotes (1–200)',
    copyAddress: 'Copiar endereço',
    copiedToast: 'Copiado para a área de transferência!',

    // Main Objective progress & card
    progressCurrent: 'Progresso atual',
    dailyTargetProgress: 'Meta do dia',
    dailyTargetCompleted: 'Concluída hoje',
    completedBadge: 'Meta alcançada!',
    inProgressBadge: 'Em progresso',
    addAdvanceBtn: 'Registrar Avanço',
    subtractExpenseBtn: 'Subtrair / Ajuste',
    completeTodayBtn: 'Completar meta de hoje',
    quickPresetsLabel: 'Valores rápidos:',
    enterCustomAmount: 'Ou digite uma quantidade personalizada',
    saveEntryBtn: (val, xp) => `Salvar ${val} (+${xp} XP)`,
    optionalNote: 'Nota ou reflexão opcional...',

    // Mascot card
    mascotCompanion: 'Mascote Guardião',
    mascotSubtitle: 'Companheiro de Hábito',
    tapMascotHint: 'Toque no seu mascote para interagir',
    mascotLevelLabel: (lvl) => `NV. ${lvl}`,
    speciesMystery: 'Nova espécie?',
    streakSevenDays: '7 dias de constância',
    dailyChestLabel: (c) => `Baú: ${c}/3`,
    claimChestBonus: '🎁 Resgatar Baú +40 XP',
    dailySealBonusNotice: 'Complete as 3 missões diárias para o Baú de Selo (+40 XP)',
    dailySealCompleted: '👑 Selo diário concluído',

    // ASMR Block
    asmrFlowing: 'FLUXO ASMR...',
    slideStylesHint: 'Deslize estilos →',
    scrollAsmrLeft: 'Deslocar estilos ASMR para esquerda',
    scrollAsmrRight: 'Deslocar estilos ASMR para direita',

    // Boost stats
    statMovementsLabel: 'MOVIMENTOS',
    statInGoal: (c) => `${c} neste objetivo`,
    statBestLabel: 'MELHOR REGISTRO',
    statSingle: 'Em um único registro',
    statGuardianLabel: 'NÍVEL DE GUARDIÃO',
    statCurrentRank: 'Classificação atual',
    statTotalXpLabel: 'XP TOTAL ACUMULADO',
    statTotalGems: (g) => `${g.toLocaleString()} gemas obtidas`,

    // Sanctuary shop
    supportLetterTitle: 'Carta do Desenvolvedor',
    customTipTitle: 'Gostaria de apoiar com uma gorjeta personalizada?',
    cryptoTitle: 'Apoio Internacional & Cripto',

    // Comprehensive app-wide localization additions
    sidebarActiveStreak: 'Sequência ativa',
    shieldsUnit: (c) => `${c} ${c === 1 ? 'escudo' : 'escudos'}`,
    indieDevEmpathySidebar:
      'Criado por 1 dev indie · 0% anúncios. Explore Skins, Buffs e opções de apoio.',
    sidebarFounderBadge: '👑 FUNDADOR INDIE',
    sidebarSupporterBadge: '☕ APOIADOR INDIE',
    sidebarIndieProject: '💖 PROJETO 100% INDIE',
    floatingMenuBtn: 'Menu',
    openNavAria: 'Abrir navegação',
    navAchievements: '🏆   Conquistas / Títulos',
    dateOverdue: '⌛ Data cumprida',
    dateTodayDue: '⏳ Hoje é a data meta!',
    daysRemaining: (d) => `⏳ ${d}d restantes`,
    activeFrameTooltip: (name) =>
      `Moldura ativa: ${name} (toque para explorar 48 molduras e 30 sons)`,
    framesAndFx: 'Molduras & FX',
    customizeObjective: 'Personalizar',
    customizeObjectiveTooltip: 'Personalizar meta',
    changeBackground: 'Fundo',
    changeBackgroundTooltip: 'Alterar arte ou foto de fundo',
    changeIconTooltip: 'Alterar ícone e estilo da meta',
    addPledgeOrDate: '＋ Adicionar propósito ou data limite…',
    achievedBadge: 'CONQUISTADO',
    progressAchieved: 'CONQUISTADO!',
    progressAdvance: 'AVANÇO',
    finalGoalLabel: 'META FINAL',
    goalSurpassed: 'Meta superada! 🏆',
    remainingToGoal: (amt) => `Faltam ${amt}`,
    milestoneTitle: (pct, amt) => `Marco ${pct}: ${amt}`,
    nextMilestone: (pct, amt) => `Próximo marco (${pct}%): a ${amt}`,
    allMilestonesCompleted:
      '🏆 Todos os marcos desta meta foram concluídos!',
    entriesCountLabel: (c) => `${c} ${c === 1 ? 'registro' : 'registros'}`,
    suggestedPace: (amt) => `Ritmo sugerido: ${amt} / dia`,
    highestImpulse: (amt) => `Maior impulso: +${amt}`,
    pledgeReward: (p) => `Prêmio: ${p}`,
    definePledge: '＋ Definir meu prêmio ao conquistar',
    levelUpPreview: '· SUBIDA DE NÍVEL!',
    achievementsSectionTitle: 'Conquistas',
    achievementsSectionSubtitle:
      'Medalhas e marcos desbloqueados nesta meta',
    viewAllAchievements: 'VER TODOS →',
    secretAchievement: 'Conquista Misteriosa',
    petMascotTooltipUnclaimed:
      'Faça carinho no seu guardião para ganhar +15 XP hoje!',
    petMascotTooltipPetted: 'Toque para interagir com seu guardião',
    petMascotRewardUnclaimed: '👋 +15 XP',
    petMascotRewardPetted: '💖 Vínculo',
    settingsEditGoalTitle: 'Personalizar Meta',
    settingsEditGoalSubtitle: 'Nome, meta, ícone, data e prêmio',
    settingsBackgroundTitle: 'Fundo e Enquadramento',
    settingsBackgroundSubtitle: 'Alterar cenário ou enviar imagem',
    settingsArchiveTitle: 'Arquivar no Baú',
    settingsArchiveSubtitle: 'Guardar com segurança sem perder progresso',
    settingsDeleteTitle: 'Excluir Meta',
    settingsDeleteSubtitle: 'Remover permanentemente',
    settingsIndieCardTitle: '💖 Criado por um Desenvolvedor Indie',
    settingsIndieCardSub: (gems) =>
      `Personalize os 200 mascotes com Skins, equipe Molduras e Sons ou ative Buffs com suas Gemas (💎 ${gems}).`,
    settingsSkinsBuffsBtn: '💎 Skins & Buffs',
    settingsSupportDevBtn: '💖 Apoiar o Dev',
    currentBalanceLabel: 'Saldo atual:',
    historyFilterAll: 'Todas',
    historyFilterAdd: 'Adições',
    historyFilterSubtract: 'Subtrações',
    backButton: 'Voltar',
    shopMainTitle: '💎 Cosméticos, Cartões, Áudio & Apoio Indie',
    shopCollectiblesBadge: (c) =>
      `✨ ${c} COLECIONÁVEIS NO SANTUÁRIO`,
    filterAllWithCount: (c) => `Todos (${c})`,
    filterFree: (c) => `🎁 Grátis (${c})`,
    filterPremium: (c) => `💎 Gemas (${c})`,

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
    levelUpCelebration: (lvl) => `Você subiu para o Nível ${lvl}!`,
    petGreetNoEntry: 'Que alegria ver você hoje! Um pequeno passo mantém nossa chama acesa 🔥',
    petGreetStreak: (d) => `É isso aí! Já são ${d} ${d === 1 ? 'dia' : 'dias'} seguidos brilhando ✨`,
    petGreetLevelsLeft: (l) => `Sinto o poder crescer! Apenas mais ${l} ${l === 1 ? 'nível' : 'níveis'} para uma nova espécie 🐾`,
    petGreetMax: 'Alcançamos o ápice cósmico juntos! 🪐',
    petGreetObjectiveSurpassed: (t) => `Concluímos «${t}»! Você é imparável 🏆`,
    petGreetObjectiveRemaining: (t, a) => `Vamos rumo a «${t}»! Faltam apenas ${a} 🚀`,
    petGreetThanks: 'Obrigado pelo carinho! Cada passo seu me faz evoluir 💖',
    creatureLockedYet: 'Criatura ainda bloqueada',
    lockedLevelCreature: (lvl) => `🔒 Nível ${lvl} · Criatura Misteriosa`,
    unlockedLevelCreature: (lvl, name) => `✨ Nível ${lvl} · ${name}`,
    spyLevelSilhouette: (lvl, hint) => `Espiar silhueta de Nível ${lvl}: ${hint}`,
    reachLevelToUnlockSpecies: (lvl) => `Espécie de Nível ${lvl} bloqueada (Alcance o Nível ${lvl} para revelar)`,
    reachLevelForSkinAura: (lvl, skin) => `🔒 Alcance o Nível ${lvl} para revelar sem spoilers. Você pode ver o anel de «${skin}» na silhueta.`,
    tapToHearBioVoice: 'Toque para ouvir a voz bioacústica desta criatura',

    // ASMR Rewards
    asmrUnlockedTapStyle: (name, emoji, taps, gemsText, xp) => `🎉 DESBLOQUEOU «${name}» (${emoji}) por alcançar ${taps} toques! ${gemsText}+${xp} XP`,
    asmrLuckBonus: (gems, cur, max, xp) => `🎁 Sorte e Harmonia ASMR! +${gems} 💎 (${cur}/${max} hoje) e +${xp} XP`,
    asmrZenCapBonus: (xp, max) => `🧘 Harmonia Zen! +${xp} XP de Calma (Limite diário de ${max} 💎 atingido hoje)`,

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
    changedGoalNameProtection: (oldT, newT) => `Você alterou a meta «${oldT}» para «${newT}», um objetivo diferente.`,
    createGoalModalTitle: '＋ Criar Novo Objetivo',
    editGoalModalTitle: '🎨 Personalizar Meta',
    createGoalModalSub: 'Escolha um modelo predefinido ou crie sua meta sob medida com ressonância cromática.',
    editGoalModalSub: 'Personalize cores, plano de fundo, data meta ou prêmio. Seu histórico permanece seguro.',
    defaultGoalTitle: 'Seu Próximo Marco',
    pledgePreviewLabel: (p) => `🎁 Prêmio: ${p}`,
    liveColorTuningPreview: 'Pré-visualização ao vivo com afinação cromática completa',
    placeholderGoalTitle: 'Ex. Viagem ao Japão, Fundo de Paz…',
    placeholderGoalCategory: 'Finanças, Aventura, Saúde, Hábito…',
    placeholderGoalPledge: 'Ex. Jantar especial, folga, comemorar…',
    createGoalSubmit: '🚀 Criar Meta',
    saveGoalChangesSubmit: '✓ Salvar Alterações',
    cropImageHint: 'Selecione uma foto para enquadrá-la aqui\narraste para ajustar',
    goalAmountInputLabel: 'Valor ou quantidade meta',
    goalDateInputLabel: 'Data meta (opcional)',
    goalAccentThemeLabel: 'COR DE ENERGIA (SINTONIA TOTAL)',
    startCleanGoalPrompt: '💡 Deseja criar um Novo Objetivo limpo em vez disso?',
    startCleanGoalBtn: 'Começar limpo',

    // Audio Packs & Audition
    soundPackSteps: ['1/5 · Toque na UI', '2/5 · +Registrar Avanço', '3/5 · −Subtrair Gasto', '4/5 · 🎯 Missão Diária', '5/5 · 🏆 Fanfarra da Meta'],
    soundPackPads: ['1·Toque', '2·+Soma', '3·−Resta', '4·Missão', '5·Conquista'],
    soundPackAuditionTooltip: (step, name) => `Ouvir ${step} de ${name}`,
    soundPackActivatedNotice: (name) => `Pacote de 5 Sons "${name}" ativado!`,
    soundPackEngineNotice: (engine) => `Motor ${engine} ativo em todo o app`,
    acousticEnginesBadge: (c) => `${c} motores acústicos`,

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
    payMpTipBtn: (usd, ars, gems) => `🤝 Apoiar com Mercado Pago (${usd} USD · ~${ars} ARS)`,
    payPaypalTipBtn: (usd, gems) => `🌍 Apoiar com PayPal / GPay (${usd} USD)`,
    equippedFrameNotice: (name) => `Moldura "${name}" equipada ao vivo!`,
    equippedFrameCardSub: (title) => `Veja aplicada acima no seu cartão «${title}»`,
    themeAppliedNotice: (title) => `Seu cartão «${title}» agora brilha com esta sintonia`,
    applyThemeNow: '🌈 Aplicar Sintonia Agora',
    themeEquipped: '✓ Sintonia Aplicada',
    titleEquippedBadge: '✓ Título Equipado',
    equipTitleBtn: '🏅 Equipar Título',
    relicInSanctuary: '✓ Relíquia no Santuário',
    blessingClaimed: '✓ Bênção Resgatada',
    requiresGuardianLevel: (lvl) => `🔒 Requer Guardião Nv. ${lvl}`,
    copyCodeBtn: '📋 Copiar Código',
    codeCopiedBtn: '✓ Copiado',
    licenseInputPlaceholder: 'Cole aqui seu código OR-PRO-...',
    astralGemsTooltip: 'Suas Gemas Astrais (toque para obter mais ou apoiar o criador)',
    tabThemesVault: (c) => `🌈 Sintonias (${c})`,
    tabTitlesVault: (c) => `🏅 Títulos (${c})`,
    categoryFallback: 'Objetivo',

    // Serene Progress Mode
    sereneFocusMode: '🌱 Modo Foco Sereno',
    sereneFocusSubtitle: 'Priorize seus números reais e meta sem ruído de XP',
    projectedRemaining: (rem, pct) => `Faltam ${rem} (${pct}%) para a meta`,
    dailyBonusIncluded: 'inclui bônus diário',
    streakMultiplier: (d) => `sequência x${d}d`,
    goalCompletedCelebration: 'Meta Concluída!',
    remainingToGoalShort: (amt) => `A apenas ${amt} da meta! Um último impulso 🚀`,
  },
};

const LANG_STORAGE_KEY = 'objectivereacher_app_language_v1';

export function loadAppLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'es' || saved === 'en' || saved === 'pt') return saved;
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('en')) return 'en';
  } catch {
    // fallback
  }
  return 'es';
}

export function saveAppLanguage(lang: AppLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}
