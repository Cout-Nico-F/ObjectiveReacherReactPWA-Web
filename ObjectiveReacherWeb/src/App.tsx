import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_IDS,
  BANNER_PRESETS,
  CUSTOM_UNIT_ID,
  findObjectiveUnit,
  formatObjectiveAmount,
  OBJECTIVE_UNITS,
} from './catalog';
import {
  AchievementCondition,
  AchievementDefinition,
  CelebrationData,
  DashboardState,
  Objective,
  ObjectiveEntry,
} from './types';

const STORAGE_KEY = 'objectivereacher_dashboard_v5';

function createEmptyState(): DashboardState {
  const id = crypto.randomUUID();
  return {
    version: 5,
    objectives: [
      {
        id,
        title: 'Mi objetivo',
        description: '',
        goalAmount: 1,
        currentAmount: 0,
        unitId: CUSTOM_UNIT_ID,
        customUnitLabel: '$',
        bannerId: 'gradient',
        bannerOffsetX: 0,
        bannerOffsetY: 0,
        isArchived: false,
        entries: [],
        unlockedAchievementIds: [],
      },
    ],
    selectedObjectiveId: id,
    gamification: {
      totalXp: 0,
      bonusXp: 0,
      lastPetDateKey: '',
      claimedQuestsByDay: {},
    },
  };
}

function calculateLevelFromXp(xp: number): number {
  return Math.floor((Math.sqrt(1 + (4 * Math.max(0, xp)) / 25) - 1) / 2) + 1;
}

function calculateSingleEntryXp(
  amount: number,
  goalAmount: number,
  isFirstOfDay: boolean,
  streakDays: number
): number {
  if (amount > 0) {
    const baseAdditionXp = 35;
    const impactRatio =
      goalAmount > 0 ? Math.min(1, Math.max(0, amount / goalAmount)) : 0;
    const impactBonus = Math.round(5 + impactRatio * 60);
    const firstOfDayBonus = isFirstOfDay ? 25 : 0;
    const streakBonus = streakDays > 1 ? Math.min(45, (streakDays - 1) * 3) : 0;
    return baseAdditionXp + impactBonus + firstOfDayBonus + streakBonus;
  }
  const baseSubtractionXp = 15;
  return baseSubtractionXp + (isFirstOfDay ? 10 : 0);
}

function recalculateAllXp(objectives: Objective[], bonusXp = 0): number {
  let total = Math.max(0, bonusXp);
  const seenDays = new Set<string>();
  const allEntries = objectives
    .flatMap((obj) => obj.entries.map((entry) => ({ obj, entry })))
    .sort(
      (a, b) =>
        new Date(a.entry.createdAt).getTime() -
        new Date(b.entry.createdAt).getTime()
    );

  for (const { obj, entry } of allEntries) {
    const dayKey = toLocalDateKey(entry.createdAt);
    const isFirstOfDay = !seenDays.has(dayKey);
    seenDays.add(dayKey);
    total += calculateSingleEntryXp(
      entry.amount,
      obj.goalAmount,
      isFirstOfDay,
      seenDays.size
    );
  }

  for (const obj of objectives) {
    for (const id of obj.unlockedAchievementIds) {
      const ach = ACHIEVEMENT_CATALOG.find((a) => a.id === id);
      if (ach) total += ach.rewardXp;
    }
  }

  return Math.max(0, total);
}

function loadState(): DashboardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as DashboardState;
    if (
      parsed &&
      parsed.version === 5 &&
      Array.isArray(parsed.objectives) &&
      parsed.objectives.length > 0 &&
      parsed.gamification &&
      typeof parsed.gamification.totalXp === 'number'
    ) {
      const bonusXp =
        typeof parsed.gamification.bonusXp === 'number'
          ? parsed.gamification.bonusXp
          : 0;
      const recalculated = recalculateAllXp(parsed.objectives, bonusXp);
      parsed.gamification.totalXp = Math.max(
        parsed.gamification.totalXp,
        recalculated
      );
      parsed.gamification.bonusXp = bonusXp;
      parsed.gamification.lastPetDateKey =
        parsed.gamification.lastPetDateKey || '';
      parsed.gamification.claimedQuestsByDay =
        parsed.gamification.claimedQuestsByDay || {};
      return parsed;
    }
  } catch {
    // Fallback to empty state
  }
  return createEmptyState();
}

function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function calculateCurrentStreak(objectives: Objective[]): number {
  const activeDays = new Set<string>();
  for (const obj of objectives) {
    for (const entry of obj.entries) {
      activeDays.add(toLocalDateKey(entry.createdAt));
    }
  }

  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(day.toISOString());

  if (!activeDays.has(todayKey)) {
    day.setDate(day.getDate() - 1);
  }

  let streak = 0;
  while (activeDays.has(toLocalDateKey(day.toISOString()))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

function isSecretAchievementMet(
  achievement: AchievementDefinition,
  objective: Objective,
  progress: number,
  streak: number
): boolean {
  const entries = objective.entries;
  switch (achievement.condition) {
    case AchievementCondition.EntryCount:
      return entries.length >= achievement.threshold;
    case AchievementCondition.StreakDays:
      return streak >= achievement.threshold;
    case AchievementCondition.ProgressPercent:
      return progress * 100 >= achievement.threshold;
    case AchievementCondition.LargestContributionPercent: {
      if (objective.goalAmount <= 0) return false;
      const maxPositive = entries
        .filter((e) => e.amount > 0)
        .reduce((max, e) => Math.max(max, e.amount), 0);
      return (maxPositive / objective.goalAmount) * 100 >= achievement.threshold;
    }
    case AchievementCondition.WeekendEntryCount: {
      const weekendCount = entries.filter((e) => {
        const day = new Date(e.createdAt).getDay();
        return day === 0 || day === 6;
      }).length;
      return weekendCount >= achievement.threshold;
    }
    case AchievementCondition.EarlyEntryCount: {
      const earlyCount = entries.filter((e) => new Date(e.createdAt).getHours() < 8)
        .length;
      return earlyCount >= achievement.threshold;
    }
    case AchievementCondition.LateEntryCount: {
      const lateCount = entries.filter(
        (e) => new Date(e.createdAt).getHours() >= 21
      ).length;
      return lateCount >= achievement.threshold;
    }
    default:
      return false;
  }
}

function evaluateObjectiveAchievements(
  objective: Objective,
  allObjectives: Objective[],
  gamification: { totalXp: number }
): string[] {
  const newlyUnlockedTitles: string[] = [];
  const unlock = (id: string) => {
    if (objective.unlockedAchievementIds.includes(id)) return;
    const def = ACHIEVEMENT_CATALOG.find((a) => a.id === id);
    if (!def) return;
    objective.unlockedAchievementIds.push(id);
    gamification.totalXp += def.rewardXp;
    newlyUnlockedTitles.push(def.title);
  };

  if (objective.entries.length > 0) {
    unlock(ACHIEVEMENT_IDS.FirstEntry);
  }

  const streak = calculateCurrentStreak(allObjectives);
  if (streak >= 3) {
    unlock(ACHIEVEMENT_IDS.ThreeDayStreak);
  }
  if (streak >= 7) {
    unlock(ACHIEVEMENT_IDS.SevenDayStreak);
  }

  const progress =
    objective.goalAmount <= 0 ? 0 : objective.currentAmount / objective.goalAmount;
  if (progress >= 0.25) {
    unlock(ACHIEVEMENT_IDS.Progress25);
  }
  if (progress >= 0.5) {
    unlock(ACHIEVEMENT_IDS.Progress50);
  }
  if (progress >= 1) {
    unlock(ACHIEVEMENT_IDS.Progress100);
    unlock(ACHIEVEMENT_IDS.GoalComplete);
  }

  for (const achievement of ACHIEVEMENT_CATALOG) {
    if (achievement.isSecret) {
      if (isSecretAchievementMet(achievement, objective, progress, streak)) {
        unlock(achievement.id);
      }
    }
  }

  return newlyUnlockedTitles;
}

function formatEntryTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const entryDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (entryDay.getTime() === today.getTime()) {
    return `Hoy, ${timeStr}`;
  }
  if (entryDay.getTime() === yesterday.getTime()) {
    return `Ayer, ${timeStr}`;
  }
  const monthDay = date.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
  });
  return `${monthDay}, ${timeStr}`;
}

export function App() {
  const [state, setState] = useState<DashboardState>(() => loadState());
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(50);
  const [customAmountText, setCustomAmountText] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [isAddition, setIsAddition] = useState<boolean>(true);
  const [newEntryDescription, setNewEntryDescription] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'add' | 'subtract'>('all');
  const [persistenceMessage, setPersistenceMessage] = useState<string>('');

  // Layout & Drawers
  const [activeNav, setActiveNav] = useState<string>('objective');
  const [isNavigationOpen, setIsNavigationOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isDraftObjective, setIsDraftObjective] = useState<boolean>(false);
  const [previousObjectiveId, setPreviousObjectiveId] = useState<string | null>(null);

  const [isBannerPickerOpen, setIsBannerPickerOpen] = useState<boolean>(false);
  const [isAllAchievementsOpen, setIsAllAchievementsOpen] = useState<boolean>(false);
  const [isMascotGalleryOpen, setIsMascotGalleryOpen] = useState<boolean>(false);
  const [mascotGalleryStartLevel, setMascotGalleryStartLevel] = useState<number | null>(null);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState<boolean>(false);

  // Interactive Mascot Sanctuary & Daily Ritual (Unified A + B + C)
  const [mascotJoyId, setMascotJoyId] = useState<number>(0);
  const [mascotSpeech, setMascotSpeech] = useState<string | null>(null);
  const mascotSpeechTimerRef = useRef<number | null>(null);
  const [isDailyRitualOpen, setIsDailyRitualOpen] = useState<boolean>(false);

  const [selectedAchievementDetail, setSelectedAchievementDetail] = useState<{
    title: string;
    detail: string;
    status: string;
  } | null>(null);

  const [editingEntry, setEditingEntry] = useState<ObjectiveEntry | null>(null);
  const [entryActionTarget, setEntryActionTarget] = useState<ObjectiveEntry | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Celebration overlay
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const [xpBurst, setXpBurst] = useState<{
    id: number;
    xp: number;
    leveledUp: boolean;
  } | null>(null);
  const [showFloatingMenuBtn, setShowFloatingMenuBtn] = useState<boolean>(false);
  const touchEdgeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setShowFloatingMenuBtn(window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Section refs for smooth scrolling
  const objectiveRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef<HTMLDivElement>(null);
  const achievementsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setPersistenceMessage(
        'No se pudo guardar el progreso. Los cambios podrían perderse al cerrar la app.'
      );
    }
  }, [state]);

  const activeObjectives = useMemo(
    () => state.objectives.filter((o) => !o.isArchived),
    [state.objectives]
  );

  const archivedObjectives = useMemo(
    () => state.objectives.filter((o) => o.isArchived),
    [state.objectives]
  );

  const currentObjective = useMemo(() => {
    return (
      state.objectives.find(
        (o) => o.id === state.selectedObjectiveId && !o.isArchived
      ) ||
      activeObjectives[0] ||
      state.objectives[0]
    );
  }, [state.objectives, state.selectedObjectiveId, activeObjectives]);

  // Derived gamification properties
  const totalXp = state.gamification.totalXp;
  const level = calculateLevelFromXp(totalXp);
  const experienceText = `Nivel ${level} · ${totalXp} XP`;
  const xpAtLevelStart = 25 * (level - 1) * level;
  const xpForCurrentLevel = 50 * level;
  const xpAtNextLevel = 25 * level * (level + 1);
  const levelProgress = Math.min(
    1,
    Math.max(0, (totalXp - xpAtLevelStart) / xpForCurrentLevel)
  );
  const levelProgressText = `${totalXp - xpAtLevelStart}/${
    xpAtNextLevel - xpAtLevelStart
  } XP para el siguiente nivel`;

  const mascotTier = Math.floor((Math.min(200, Math.max(1, level)) - 1) / 10);
  const mascotEmojis = [
    '🌱',
    '🐱',
    '🦊',
    '🦉',
    '🐺',
    '🐯',
    '🦁',
    '🦌',
    '🦅',
    '🪽',
    '🔥',
    '💎',
    '🐉',
    '⚡',
    '🌌',
    '🔮',
    '✨',
    '🌊',
    '👑',
    '🪐',
  ];
  const mascotEmoji = mascotEmojis[mascotTier] || '🪐';
  const mascotMessages = [
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
    '¡Singularidad Cósmica! Leyenda suprema del universo',
  ];
  const mascotMessage = mascotMessages[mascotTier] || mascotMessages[0];

  const streakDays = useMemo(
    () => calculateCurrentStreak(state.objectives),
    [state.objectives]
  );
  const streakText =
    streakDays === 0
      ? '¡Mantén encendida la llama de tu racha! 🔥'
      : streakDays === 1
      ? '1 día consecutivo'
      : `${streakDays} días consecutivos`;

  const totalEntryCount = useMemo(
    () => state.objectives.reduce((sum, o) => sum + o.entries.length, 0),
    [state.objectives]
  );

  // Daily Ritual & Sanctuary derived metrics
  const todayDateKey = toLocalDateKey(new Date().toISOString());

  const activeDayKeysSet = useMemo(() => {
    const s = new Set<string>();
    for (const obj of state.objectives) {
      for (const entry of obj.entries) {
        s.add(toLocalDateKey(entry.createdAt));
      }
    }
    return s;
  }, [state.objectives]);

  const todayEntries = useMemo(() => {
    return state.objectives.flatMap((obj) =>
      obj.entries.filter((e) => toLocalDateKey(e.createdAt) === todayDateKey)
    );
  }, [state.objectives, todayDateKey]);

  const hasEntryToday = todayEntries.length > 0;
  const hasPositiveNoteToday = todayEntries.some(
    (e) =>
      e.amount > 0 &&
      e.description.trim() !== '' &&
      e.description.trim() !== 'Aporte' &&
      e.description.trim() !== 'Gasto'
  );
  const hasPettedToday = state.gamification.lastPetDateKey === todayDateKey;
  const claimedToday =
    state.gamification.claimedQuestsByDay?.[todayDateKey] || [];

  const dailyQuests = useMemo(
    () => [
      {
        id: 'pet_guardian',
        title: 'Vínculo con tu Guardián',
        subtitle: 'Toca a tu mascota para animarla hoy',
        rewardXp: 15,
        isCompleted: hasPettedToday,
        isClaimed: claimedToday.includes('pet_guardian'),
        icon: '💖',
      },
      {
        id: 'daily_entry',
        title: 'Impulso del Día',
        subtitle: 'Registra al menos 1 movimiento hoy',
        rewardXp: 25,
        isCompleted: hasEntryToday,
        isClaimed: claimedToday.includes('daily_entry'),
        icon: '⚡',
      },
      {
        id: 'mindful_contribution',
        title: 'Aporte con Propósito',
        subtitle: 'Suma un aporte con nota personalizada hoy',
        rewardXp: 30,
        isCompleted: hasPositiveNoteToday,
        isClaimed: claimedToday.includes('mindful_contribution'),
        icon: '🎯',
      },
    ],
    [hasPettedToday, hasEntryToday, hasPositiveNoteToday, claimedToday]
  );

  const completedQuestsCount = dailyQuests.filter((q) => q.isCompleted).length;
  const unclaimedReadyQuestsCount = dailyQuests.filter(
    (q) => q.isCompleted && !q.isClaimed
  ).length;
  const isAllDailyBonusClaimed = claimedToday.includes('all_daily_bonus');
  const canClaimAllDailyBonus =
    completedQuestsCount === dailyQuests.length && !isAllDailyBonusClaimed;

  // 7-Day Rolling Week Strip (Mon -> Sun of current week)
  const weekDaysStrip = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 Sun .. 6 Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return labels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const key = toLocalDateKey(d.toISOString());
      const isToday = key === todayDateKey;
      const isFuture = d.getTime() > now.getTime() && !isToday;
      const isActive = activeDayKeysSet.has(key) || (isToday && hasPettedToday);
      return { label, key, isToday, isFuture, isActive };
    });
  }, [activeDayKeysSet, todayDateKey, hasPettedToday]);

  // Mascot Emotional State (A)
  const mascotMood = useMemo(() => {
    if (mascotJoyId > 0 && Date.now() - mascotJoyId < 4000) {
      return {
        badge: '💖 Radiante',
        color: '#FF80AB',
        bg: 'rgba(255, 128, 171, 0.14)',
        border: 'rgba(255, 128, 171, 0.45)',
      };
    }
    if (hasEntryToday && streakDays >= 3) {
      return {
        badge: `🔥 En Racha (${streakDays}d)`,
        color: '#FFD54F',
        bg: 'rgba(255, 213, 79, 0.14)',
        border: 'rgba(255, 213, 79, 0.45)',
      };
    }
    if (hasEntryToday) {
      return {
        badge: '✨ Energizado',
        color: '#82E59B',
        bg: 'rgba(130, 229, 155, 0.14)',
        border: 'rgba(130, 229, 155, 0.45)',
      };
    }
    return {
      badge: '💤 Esperando impulso',
      color: '#C7A4FF',
      bg: 'rgba(199, 164, 255, 0.12)',
      border: 'rgba(199, 164, 255, 0.3)',
    };
  }, [mascotJoyId, hasEntryToday, streakDays]);

  // Evolution Path (C)
  const tierStartLevel = mascotTier * 10 + 1;
  const nextSpeciesLevel = Math.min(200, (mascotTier + 1) * 10 + 1);
  const nextSpeciesTier = Math.min(19, mascotTier + 1);
  const levelsToNextSpecies = Math.max(0, nextSpeciesLevel - level);
  const currentSubLevelIndex = (Math.min(200, Math.max(1, level)) - 1) % 10; // 0..9

  const triggerMascotSpeech = (text: string) => {
    if (mascotSpeechTimerRef.current) {
      window.clearTimeout(mascotSpeechTimerRef.current);
    }
    setMascotSpeech(text);
    mascotSpeechTimerRef.current = window.setTimeout(() => {
      setMascotSpeech(null);
    }, 3800);
  };

  const awardBonusXp = (xpAmount: number, reasonTitle: string, reasonEmoji = '✨') => {
    const prevLevel = level;
    const prevTier = mascotTier;
    const nextTotalXp = state.gamification.totalXp + xpAmount;
    const nextBonusXp = (state.gamification.bonusXp || 0) + xpAmount;
    const nextLevel = calculateLevelFromXp(nextTotalXp);
    const nextTier = Math.floor((Math.min(200, Math.max(1, nextLevel)) - 1) / 10);

    setState((prev) => ({
      ...prev,
      gamification: {
        ...prev.gamification,
        totalXp: prev.gamification.totalXp + xpAmount,
        bonusXp: (prev.gamification.bonusXp || 0) + xpAmount,
      },
    }));

    setXpBurst({
      id: Date.now(),
      xp: xpAmount,
      leveledUp: nextLevel > prevLevel,
    });

    if (nextTier > prevTier) {
      triggerCelebration(
        '¡Nueva especie desbloqueada!',
        `Nivel ${nextLevel} · +${xpAmount} XP · ${mascotMessages[nextTier] || ''}`,
        mascotEmojis[nextTier] || '🪐',
        '#FFD54F',
        true
      );
    } else if (nextLevel > prevLevel) {
      triggerCelebration(
        `¡Subiste al Nivel ${nextLevel}!`,
        `${reasonTitle} (+${xpAmount} XP)`,
        mascotEmojis[nextTier] || reasonEmoji,
        '#B58BFF'
      );
    }
  };

  const handlePetMascot = () => {
    const nowId = Date.now();
    setMascotJoyId(nowId);

    const remainingAmountFormatted = formatObjectiveAmount(
      Math.max(0, currentObjective.goalAmount - currentObjective.currentAmount),
      currentObjective
    );

    const contextualPhrases = [
      !hasEntryToday
        ? '¡Qué alegría verte hoy! Un pequeño aporte encenderá nuestra racha 🔥'
        : `¡Eso es! Ya llevamos ${streakDays} ${streakDays === 1 ? 'día' : 'días'} seguidos brillando ✨`,
      levelsToNextSpecies > 0
        ? `¡Siento el poder crecer! Solo ${levelsToNextSpecies} ${
            levelsToNextSpecies === 1 ? 'nivel' : 'niveles'
          } más para descubrir una nueva especie 🐾`
        : '¡Hemos alcanzado la cumbre cósmica juntos! 🪐',
      currentObjective.currentAmount >= currentObjective.goalAmount
        ? `¡Completamos "${currentObjective.title}"! Eres imparable 🏆`
        : `¡Vamos por "${currentObjective.title}"! Faltan ${remainingAmountFormatted} 🚀`,
      '¡Gracias por cuidarme! Cada paso tuyo me hace evolucionar 💖',
    ];

    if (!hasPettedToday) {
      const petXp = 15;
      const prevLevel = level;
      const nextTotalXp = state.gamification.totalXp + petXp;
      const nextLevel = calculateLevelFromXp(nextTotalXp);

      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          totalXp: prev.gamification.totalXp + petXp,
          bonusXp: (prev.gamification.bonusXp || 0) + petXp,
          lastPetDateKey: todayDateKey,
        },
      }));

      setXpBurst({
        id: nowId,
        xp: petXp,
        leveledUp: nextLevel > prevLevel,
      });

      triggerMascotSpeech('¡Caricia diaria recibida! +15 XP de vínculo 💖✨');
    } else {
      const randomPhrase =
        contextualPhrases[Math.floor(Math.random() * contextualPhrases.length)];
      triggerMascotSpeech(randomPhrase);
    }
  };

  const handleClaimQuest = (questId: string, rewardXp: number, title: string) => {
    if (claimedToday.includes(questId)) return;
    const prevLevel = level;
    const nextTotalXp = state.gamification.totalXp + rewardXp;
    const nextLevel = calculateLevelFromXp(nextTotalXp);

    setState((prev) => {
      const prevClaimed = prev.gamification.claimedQuestsByDay?.[todayDateKey] || [];
      if (prevClaimed.includes(questId)) return prev;
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          totalXp: prev.gamification.totalXp + rewardXp,
          bonusXp: (prev.gamification.bonusXp || 0) + rewardXp,
          claimedQuestsByDay: {
            ...(prev.gamification.claimedQuestsByDay || {}),
            [todayDateKey]: [...prevClaimed, questId],
          },
        },
      };
    });

    setMascotJoyId(Date.now());
    setXpBurst({
      id: Date.now(),
      xp: rewardXp,
      leveledUp: nextLevel > prevLevel,
    });
    triggerMascotSpeech(`¡Misión "${title}" completada! +${rewardXp} XP 🎯`);
  };

  const handleClaimAllDailyBonus = () => {
    if (!canClaimAllDailyBonus) return;
    const bonusXp = 40;
    const prevLevel = level;
    const nextTotalXp = state.gamification.totalXp + bonusXp;
    const nextLevel = calculateLevelFromXp(nextTotalXp);

    setState((prev) => {
      const prevClaimed = prev.gamification.claimedQuestsByDay?.[todayDateKey] || [];
      if (prevClaimed.includes('all_daily_bonus')) return prev;
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          totalXp: prev.gamification.totalXp + bonusXp,
          bonusXp: (prev.gamification.bonusXp || 0) + bonusXp,
          claimedQuestsByDay: {
            ...(prev.gamification.claimedQuestsByDay || {}),
            [todayDateKey]: [...prevClaimed, 'all_daily_bonus'],
          },
        },
      };
    });

    setMascotJoyId(Date.now());
    setXpBurst({
      id: Date.now(),
      xp: bonusXp,
      leveledUp: nextLevel > prevLevel,
    });
    triggerCelebration(
      '¡Sello Diario Maestro!',
      `Completaste las 3 misiones de hoy · +${bonusXp} XP extra`,
      '👑',
      '#FFD54F'
    );
  };

  // Derived objective properties
  const progress =
    currentObjective.goalAmount <= 0
      ? 0
      : Math.min(
          1,
          Math.max(0, currentObjective.currentAmount / currentObjective.goalAmount)
        );
  const progressText = `${Math.floor(progress * 100)}%`;
  const remainingText =
    currentObjective.currentAmount >= currentObjective.goalAmount
      ? '¡Objetivo completado!'
      : `¡A solo ${formatObjectiveAmount(
          currentObjective.goalAmount - currentObjective.currentAmount,
          currentObjective
        )} de la meta! Un último impulso 🚀`;

  const hasValidSelectedAmount = useMemo(() => {
    if (selectedQuickAmount !== null) return true;
    const parsed = Number(customAmountText.replace(',', '.'));
    return !Number.isNaN(parsed) && parsed > 0;
  }, [selectedQuickAmount, customAmountText]);

  const liveXpPreview = useMemo(() => {
    if (!hasValidSelectedAmount) return null;
    const effectiveAmount = isAddition
      ? selectedAmount
      : -Math.min(selectedAmount, Math.max(1, currentObjective.currentAmount));
    const todayKey = toLocalDateKey(new Date().toISOString());
    const hadEntryToday = state.objectives.some((obj) =>
      obj.entries.some((e) => toLocalDateKey(e.createdAt) === todayKey)
    );
    const previewStreak = hadEntryToday ? streakDays : streakDays + 1;
    const estimatedXp = calculateSingleEntryXp(
      effectiveAmount,
      currentObjective.goalAmount,
      !hadEntryToday,
      previewStreak
    );
    const projectedTotalXp = totalXp + estimatedXp;
    const willLevelUp = projectedTotalXp >= xpAtNextLevel;
    const projectedProgress = Math.min(
      1,
      Math.max(0, (projectedTotalXp - xpAtLevelStart) / xpForCurrentLevel)
    );
    const bonusTag = !hadEntryToday
      ? 'incluye bono diario'
      : isAddition && previewStreak > 1
      ? `racha x${previewStreak}d`
      : '';
    return {
      estimatedXp,
      willLevelUp,
      projectedProgress,
      bonusTag,
    };
  }, [
    hasValidSelectedAmount,
    isAddition,
    selectedAmount,
    currentObjective.currentAmount,
    currentObjective.goalAmount,
    state.objectives,
    streakDays,
    totalXp,
    xpAtNextLevel,
    xpAtLevelStart,
    xpForCurrentLevel,
  ]);

  const filteredEntries = useMemo(() => {
    return currentObjective.entries.filter((entry) => {
      if (historyFilter === 'add') return entry.amount > 0;
      if (historyFilter === 'subtract') return entry.amount < 0;
      return true;
    });
  }, [currentObjective.entries, historyFilter]);

  const triggerCelebration = (
    title: string,
    message: string,
    emoji: string,
    color: string,
    requiresDismissal = false
  ) => {
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }
    setCelebration({ title, message, emoji, color, requiresDismissal });
    if (!requiresDismissal) {
      celebrationTimerRef.current = window.setTimeout(() => {
        setCelebration(null);
      }, 2100);
    }
  };

  const highlightSection = (sectionKey: string, ref: React.RefObject<HTMLDivElement | null>) => {
    setActiveNav(sectionKey);
    setIsNavigationOpen(false);
    setIsHistoryOpen(false);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightedSection(sectionKey);
    window.setTimeout(() => {
      setHighlightedSection((prev) => (prev === sectionKey ? null : prev));
    }, 1000);
  };

  const handleSelectQuickAmount = (amount: number) => {
    setSelectedQuickAmount(amount);
    setSelectedAmount(amount);
    setCustomAmountText('');
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmountText(val);
    setSelectedQuickAmount(null);
    const parsed = Number(val.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed > 0) {
      setSelectedAmount(parsed);
    }
  };

  const handleAddEntry = () => {
    if (!hasValidSelectedAmount) {
      setPersistenceMessage(
        'Escribe un importe mayor que cero o selecciona un acceso rápido.'
      );
      return;
    }

    const amount = isAddition
      ? selectedAmount
      : -Math.min(selectedAmount, currentObjective.currentAmount);

    if (amount === 0) {
      setPersistenceMessage('No hay saldo disponible para registrar una resta.');
      return;
    }

    const description =
      newEntryDescription.trim() === ''
        ? isAddition
          ? 'Aporte'
          : 'Gasto'
        : newEntryDescription.trim();

    const previousProgress = progress;
    const previousLevel = level;
    const previousXp = totalXp;
    const previousTier = mascotTier;

    const nowIso = new Date().toISOString();
    const todayKey = toLocalDateKey(nowIso);
    const hadEntryToday = state.objectives.some((obj) =>
      obj.entries.some((e) => toLocalDateKey(e.createdAt) === todayKey)
    );

    const nextObjectives = state.objectives.map((o) =>
      o.id === currentObjective.id
        ? {
            ...o,
            currentAmount: o.currentAmount + amount,
            entries: [
              {
                id: crypto.randomUUID(),
                description,
                amount,
                createdAt: nowIso,
              },
              ...o.entries,
            ],
            unlockedAchievementIds: [...o.unlockedAchievementIds],
          }
        : { ...o, entries: [...o.entries], unlockedAchievementIds: [...o.unlockedAchievementIds] }
    );

    const updatedObj = nextObjectives.find((o) => o.id === currentObjective.id)!;
    const nextStreak = calculateCurrentStreak(nextObjectives);
    const entryXp = calculateSingleEntryXp(
      amount,
      updatedObj.goalAmount,
      !hadEntryToday,
      nextStreak
    );
    const nextGamification = {
      ...state.gamification,
      totalXp: state.gamification.totalXp + entryXp,
    };
    const newlyUnlocked = evaluateObjectiveAchievements(
      updatedObj,
      nextObjectives,
      nextGamification
    );

    const totalGainedXp = Math.max(entryXp, nextGamification.totalXp - previousXp);
    const nextLevel = calculateLevelFromXp(nextGamification.totalXp);
    const nextTier = Math.floor((Math.min(200, Math.max(1, nextLevel)) - 1) / 10);
    const nextMascotEmoji = mascotEmojis[nextTier] || '🪐';
    const nextMascotMessage = mascotMessages[nextTier] || mascotMessages[0];
    const nextExperienceText = `Nivel ${nextLevel} · ${nextGamification.totalXp} XP`;
    const newProgress =
      updatedObj.goalAmount <= 0
        ? 0
        : Math.min(1, Math.max(0, updatedObj.currentAmount / updatedObj.goalAmount));

    setState({
      ...state,
      objectives: nextObjectives,
      gamification: nextGamification,
    });
    setNewEntryDescription('');
    setPersistenceMessage('');
    setXpBurst({
      id: Date.now(),
      xp: totalGainedXp,
      leveledUp: nextLevel > previousLevel,
    });

    if (amount > 0 && previousProgress < 1 && newProgress >= 1) {
      triggerCelebration(
        '¡Objetivo completado!',
        `¡Lo lograste! +${totalGainedXp} XP · ${nextExperienceText}`,
        '🏆',
        '#E5B945',
        true
      );
    } else if (nextTier > previousTier) {
      triggerCelebration(
        '¡Nueva especie desbloqueada!',
        `Nivel ${nextLevel} · +${totalGainedXp} XP · ${nextMascotMessage}`,
        nextMascotEmoji,
        '#FFD54F',
        true
      );
    } else if (nextLevel > previousLevel) {
      triggerCelebration(
        `¡Subiste al Nivel ${nextLevel}!`,
        `+${totalGainedXp} XP · ${
          newlyUnlocked.length > 0
            ? 'Logro: ' + newlyUnlocked.join(' · ')
            : 'Tu mascota sigue evolucionando'
        }`,
        nextMascotEmoji,
        '#B58BFF'
      );
    } else if (newlyUnlocked.length > 0) {
      triggerCelebration(
        '¡Nuevo logro!',
        `${newlyUnlocked.join(' · ')} (+${totalGainedXp} XP)`,
        '🏅',
        '#B58BFF'
      );
    } else {
      triggerCelebration(
        amount > 0 ? '¡Gran impulso!' : 'Registro actualizado',
        `+${totalGainedXp} XP · ${nextExperienceText}`,
        amount > 0 ? '✨' : '📝',
        '#65DB85'
      );
    }
  };

  const handleSelectObjective = (id: string) => {
    setState((prev) => ({ ...prev, selectedObjectiveId: id }));
    setHistoryFilter('all');
    setActiveNav('objective');
    setHighlightedSection('objective');
    window.setTimeout(() => {
      setHighlightedSection((prev) => (prev === 'objective' ? null : prev));
    }, 1000);
  };

  const handleStartNewObjective = () => {
    const newId = crypto.randomUUID();
    const newObj: Objective = {
      id: newId,
      title: `Objetivo ${state.objectives.length + 1}`,
      description: '',
      goalAmount: 1,
      currentAmount: 0,
      unitId: CUSTOM_UNIT_ID,
      customUnitLabel: '$',
      bannerId: 'gradient',
      bannerOffsetX: 0,
      bannerOffsetY: 0,
      isArchived: false,
      entries: [],
      unlockedAchievementIds: [],
    };
    setPreviousObjectiveId(currentObjective.id);
    setIsDraftObjective(true);
    setHistoryFilter('all');
    setState((prev) => ({
      ...prev,
      objectives: [...prev.objectives, newObj],
      selectedObjectiveId: newId,
    }));
    setIsEditorOpen(true);
  };

  const handleCancelObjectiveEditor = () => {
    if (isDraftObjective) {
      setState((prev) => {
        const remaining = prev.objectives.filter(
          (o) => o.id !== prev.selectedObjectiveId
        );
        const fallbackId =
          previousObjectiveId && remaining.some((o) => o.id === previousObjectiveId)
            ? previousObjectiveId
            : remaining[0]?.id || '';
        return {
          ...prev,
          objectives: remaining,
          selectedObjectiveId: fallbackId,
        };
      });
      setIsDraftObjective(false);
      setPreviousObjectiveId(null);
    }
    setIsEditorOpen(false);
  };

  const handleSaveObjectiveEditor = (input: {
    title: string;
    description: string;
    goalAmount: number;
    unitId: string;
    customUnitLabel: string;
  }) => {
    setState((prev) => {
      const nextObjectives = prev.objectives.map((o) =>
        o.id === currentObjective.id
          ? {
              ...o,
              title: input.title.trim(),
              description: input.description.trim(),
              goalAmount: input.goalAmount,
              unitId: input.unitId,
              customUnitLabel:
                input.unitId === CUSTOM_UNIT_ID ? input.customUnitLabel.trim() : '',
              unlockedAchievementIds: [...o.unlockedAchievementIds],
            }
          : o
      );
      const updatedObj = nextObjectives.find((o) => o.id === currentObjective.id)!;
      const nextGamification = {
        ...prev.gamification,
        totalXp: prev.gamification.totalXp,
      };
      evaluateObjectiveAchievements(updatedObj, nextObjectives, nextGamification);
      return {
        ...prev,
        objectives: nextObjectives,
        gamification: nextGamification,
      };
    });
    setIsDraftObjective(false);
    setPreviousObjectiveId(null);
    setIsEditorOpen(false);
  };

  const handleArchiveCurrentObjective = () => {
    setConfirmDialog({
      title: 'Archivar objetivo',
      message: `¿Archivar '${currentObjective.title}'? Podrás restaurarlo desde Archivados.`,
      confirmText: 'Archivar',
      onConfirm: () => {
        setConfirmDialog(null);
        const otherActive = state.objectives.filter(
          (o) => !o.isArchived && o.id !== currentObjective.id
        );
        if (otherActive.length === 0) {
          setAlertDialog({
            title: 'No se pudo archivar',
            message: 'Debe quedar al menos un objetivo activo.',
          });
          return;
        }
        setState((prev) => ({
          ...prev,
          objectives: prev.objectives.map((o) =>
            o.id === currentObjective.id ? { ...o, isArchived: true } : o
          ),
          selectedObjectiveId: otherActive[0].id,
        }));
      },
    });
  };

  const handleDeleteObjective = (target: Objective) => {
    setConfirmDialog({
      title: 'Eliminar objetivo',
      message: `¿Eliminar '${target.title}' y todas sus entradas? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: () => {
        setConfirmDialog(null);
        const activeCount = state.objectives.filter((o) => !o.isArchived).length;
        if (!target.isArchived && activeCount <= 1) {
          setAlertDialog({
            title: 'No se pudo eliminar',
            message: 'No se puede eliminar el único objetivo activo.',
          });
          return;
        }
        setState((prev) => {
          const remaining = prev.objectives.filter((o) => o.id !== target.id);
          const nextSelected =
            prev.selectedObjectiveId === target.id
              ? (remaining.find((o) => !o.isArchived) || remaining[0]).id
              : prev.selectedObjectiveId;
          return {
            ...prev,
            objectives: remaining,
            selectedObjectiveId: nextSelected,
            gamification: {
              ...prev.gamification,
              totalXp: recalculateAllXp(remaining, prev.gamification.bonusXp || 0),
            },
          };
        });
      },
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    setConfirmDialog({
      title: 'Eliminar entrada',
      message: '¿Eliminar esta entrada del historial?',
      confirmText: 'Eliminar',
      onConfirm: () => {
        setConfirmDialog(null);
        setState((prev) => {
          const entry = currentObjective.entries.find((e) => e.id === entryId);
          if (!entry) return prev;

          const nextObjectives = prev.objectives.map((o) =>
            o.id === currentObjective.id
              ? {
                  ...o,
                  currentAmount: o.currentAmount - entry.amount,
                  entries: o.entries.filter((e) => e.id !== entryId),
                  unlockedAchievementIds: [],
                }
              : o
          );

          const updatedObj = nextObjectives.find(
            (o) => o.id === currentObjective.id
          )!;
          const dummyGamification = { totalXp: 0 };
          evaluateObjectiveAchievements(
            updatedObj,
            nextObjectives,
            dummyGamification
          );

          return {
            ...prev,
            objectives: nextObjectives,
            gamification: {
              ...prev.gamification,
              totalXp: recalculateAllXp(
                nextObjectives,
                prev.gamification.bonusXp || 0
              ),
            },
          };
        });
      },
    });
  };

  const handleSaveEntryEdit = (
    entryId: string,
    newDescription: string,
    positiveAmount: number
  ) => {
    setState((prev) => {
      const entry = currentObjective.entries.find((e) => e.id === entryId);
      if (!entry) return prev;

      const sign = entry.amount < 0 ? -1 : 1;
      const updatedAmount = positiveAmount * sign;
      const diff = updatedAmount - entry.amount;

      const nextObjectives = prev.objectives.map((o) =>
        o.id === currentObjective.id
          ? {
              ...o,
              currentAmount: o.currentAmount + diff,
              entries: o.entries.map((e) =>
                e.id === entryId
                  ? {
                      ...e,
                      description:
                        newDescription.trim() === ''
                          ? 'Entrada'
                          : newDescription.trim(),
                      amount: updatedAmount,
                    }
                  : e
              ),
              unlockedAchievementIds: [],
            }
          : o
      );

      const updatedObj = nextObjectives.find((o) => o.id === currentObjective.id)!;
      const dummyGamification = { totalXp: 0 };
      evaluateObjectiveAchievements(updatedObj, nextObjectives, dummyGamification);

      return {
        ...prev,
        objectives: nextObjectives,
        gamification: {
          ...prev.gamification,
          totalXp: recalculateAllXp(
            nextObjectives,
            prev.gamification.bonusXp || 0
          ),
        },
      };
    });
    setEditingEntry(null);
  };

  const handleApplyBanner = (bannerId: string, offsetX = 0, offsetY = 0) => {
    setState((prev) => ({
      ...prev,
      objectives: prev.objectives.map((o) =>
        o.id === currentObjective.id
          ? {
              ...o,
              bannerId,
              bannerOffsetX: Math.max(-1, Math.min(1, offsetX)),
              bannerOffsetY: Math.max(-1, Math.min(1, offsetY)),
            }
          : o
      ),
    }));
    setIsBannerPickerOpen(false);
  };

  const handleAchievementClick = (def: AchievementDefinition) => {
    const isUnlocked = currentObjective.unlockedAchievementIds.includes(def.id);
    const title =
      def.isSecret && !isUnlocked ? 'Logro oculto' : `${def.icon} ${def.title}`;
    const detail =
      def.isSecret && !isUnlocked
        ? `Pista: ${def.description}`
        : def.description;
    const statusText = isUnlocked
      ? `Desbloqueado · +${def.rewardXp} XP`
      : 'Por desbloquear';
    const status = isUnlocked
      ? statusText
      : `${statusText} · Recompensa: ${def.rewardXp} XP`;

    setSelectedAchievementDetail({ title, detail, status });
  };

  // Hero background style
  const heroPreset =
    BANNER_PRESETS.find((p) => p.id === currentObjective.bannerId) ||
    BANNER_PRESETS[0];
  const customBannerDataUrl = currentObjective.bannerId.startsWith('custom:')
    ? currentObjective.bannerId.slice('custom:'.length)
    : null;
  const bannerImageSrc = customBannerDataUrl || heroPreset.imageUrl;

  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t && t.clientX <= 28 && !isNavigationOpen && !isHistoryOpen) {
          touchEdgeStartRef.current = { x: t.clientX, y: t.clientY };
        } else {
          touchEdgeStartRef.current = null;
        }
      }}
      onTouchMove={(e) => {
        if (!touchEdgeStartRef.current) return;
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - touchEdgeStartRef.current.x;
        const dy = Math.abs(t.clientY - touchEdgeStartRef.current.y);
        if (dx > 42 && dx > dy * 1.4) {
          touchEdgeStartRef.current = null;
          setIsHistoryOpen(false);
          setIsNavigationOpen(true);
        }
      }}
      onTouchEnd={() => {
        touchEdgeStartRef.current = null;
      }}
      className="min-h-screen bg-[#11121C] text-[#F4F1FF] relative overflow-x-clip"
    >
      {/* Celebration Overlay */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/30 backdrop-blur-[2px]">
          <div className="w-[270px] rounded-[24px] border-2 border-[#806F62] bg-[#1C1C2B]/95 px-6 py-5 shadow-2xl flex flex-col items-center text-center space-y-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-[54px] leading-none">{celebration.emoji}</div>
            <div
              className="text-[22px] font-bold"
              style={{ color: celebration.color }}
            >
              {celebration.title}
            </div>
            <div className="text-[13px] text-[#E6E0F2]">{celebration.message}</div>
            {celebration.requiresDismissal && (
              <button
                onClick={() => setCelebration(null)}
                className="mt-2 px-5 py-2 rounded-[10px] bg-[#604094] text-white font-semibold text-sm hover:bg-[#7549B8] transition"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer Scrim */}
      {(isNavigationOpen || isHistoryOpen) && (
        <div
          onClick={() => {
            setIsNavigationOpen(false);
            setIsHistoryOpen(false);
          }}
          className="fixed inset-0 z-30 bg-[#070810]/65 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Floating Left-Edge Quick Access Button for Thumb Reach when Scrolled (Ultra-thin Portrait & Landscape) */}
      {!isNavigationOpen && !isHistoryOpen && showFloatingMenuBtn && (
        <button
          onClick={() => {
            setIsHistoryOpen(false);
            setIsNavigationOpen(true);
          }}
          aria-label="Abrir barra lateral"
          title="Abrir navegación"
          className="lg:hidden fixed left-2.5 bottom-4 z-30 h-11 px-3.5 rounded-full bg-[#242238]/95 border border-[#5B4588] text-[#E6D9FF] shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md flex items-center gap-2 active:scale-95 transition"
        >
          <span className="text-[18px] leading-none">☰</span>
          <span className="text-[11px] font-semibold tracking-wide">Menú</span>
        </button>
      )}

      {/* Main 3-Column Grid matching MainPage.xaml */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] min-h-screen items-start">
        {/* Left Navigation Panel: Sticky on 16:9 Desktop, Scrollable Drawer on Portrait & Landscape Mobile */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[268px] max-w-[82vw] lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:max-w-none bg-[#171723] border-r border-[#29283C] p-3.5 sm:p-4 flex flex-col justify-between overflow-y-auto overscroll-contain transition-transform duration-200 ${
            isNavigationOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="space-y-3 sm:space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[17px] sm:text-[19px] font-bold text-[#F4F1FF] truncate">
                  🎯 ObjectiveReacher
                </div>
                <div className="text-[11px] sm:text-[12px] text-[#AAA5BB]">
                  Tu progreso, a tu ritmo
                </div>
              </div>
              <button
                onClick={() => setIsNavigationOpen(false)}
                aria-label="Cerrar menú"
                className="lg:hidden w-8 h-8 rounded-[10px] bg-[#242238] text-[#D9C9FF] text-sm flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            <nav className="grid grid-cols-1 max-[920px]:landscape:grid-cols-2 gap-1.5">
              {[
                {
                  key: 'objective',
                  label: '🎯   Objetivo actual',
                  action: () => highlightSection('objective', objectiveRef),
                },
                {
                  key: 'entries',
                  label: '＋   Entradas',
                  action: () => highlightSection('entries', entriesRef),
                },
                {
                  key: 'history',
                  label: '▤   Historial',
                  action: () => {
                    setActiveNav('history');
                    setIsNavigationOpen(false);
                    if (window.innerWidth < 1024) {
                      setIsHistoryOpen(true);
                    } else {
                      highlightSection('entries', entriesRef);
                    }
                  },
                },
                {
                  key: 'stats',
                  label: '▥   Estadísticas',
                  action: () => highlightSection('stats', statsRef),
                },
                {
                  key: 'achievements',
                  label: '🏆   Logros',
                  action: () => highlightSection('achievements', achievementsRef),
                },
                {
                  key: 'settings',
                  label: '⚙   Ajustes',
                  action: () => highlightSection('settings', settingsRef),
                },
              ].map((item) => {
                const isSelected = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={item.action}
                    className={`w-full h-[42px] sm:h-[48px] px-3.5 rounded-[12px] text-left font-medium text-[13px] sm:text-sm transition flex items-center truncate ${
                      isSelected
                        ? 'bg-[#302747] text-[#E6D9FF]'
                        : 'bg-transparent text-[#F4F1FF] hover:bg-[#242238]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="rounded-[14px] border border-[#343046] bg-[#211F30] p-3 space-y-1 mt-4 shrink-0">
            <div className="text-[13px] text-[#FFC45D]">🔥</div>
            <div className="text-[12px] text-[#E4DFED]">{streakText}</div>
          </div>
        </aside>

        {/* Center Dashboard ScrollView */}
        <main className="px-2.5 sm:px-4 pb-16 lg:pb-8 space-y-3.5 min-w-0">
          {/* Sticky Header Row: Always accessible without scrolling to top */}
          <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-4 px-2.5 sm:px-4 py-2 bg-[#11121C]/90 backdrop-blur-md border-b border-[#29283C]/70 flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setIsHistoryOpen(false);
                setIsNavigationOpen(true);
              }}
              aria-label="Abrir navegación"
              className="lg:hidden w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[12px] bg-[#242238] text-[#D9C9FF] text-[20px] flex items-center justify-center shrink-0 hover:bg-[#302747] active:scale-95 transition"
            >
              ☰
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <span className="text-[20px] sm:text-[23px] shrink-0">🎯</span>
              <h1 className="text-[15px] sm:text-[18px] font-bold text-[#F4F1FF] truncate">
                {currentObjective.title || 'Objetivo Actual'}
              </h1>
            </div>

            <button
              onClick={() => setIsEditorOpen(true)}
              aria-label="Editar objetivo"
              className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[12px] bg-[#242238] text-[#D9C9FF] text-[18px] sm:text-[19px] flex items-center justify-center hover:bg-[#302747] transition shrink-0"
            >
              ✎
            </button>

            <button
              onClick={() => {
                setIsNavigationOpen(false);
                setIsHistoryOpen(true);
              }}
              aria-label="Abrir historial de entradas"
              className="lg:hidden w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[12px] bg-[#242238] text-[#D9C9FF] text-[19px] sm:text-[20px] flex items-center justify-center shrink-0 hover:bg-[#302747] active:scale-95 transition"
            >
              ☷
            </button>
          </div>

          {/* Objective Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {activeObjectives.map((obj) => {
              const isSelected = obj.id === currentObjective.id;
              return (
                <button
                  key={obj.id}
                  onClick={() => handleSelectObjective(obj.id)}
                  className={`px-4 py-2 rounded-[12px] text-sm font-medium whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-[#604094] text-white'
                      : 'bg-[#252437] text-[#C9C2D8] hover:bg-[#302747]'
                  }`}
                >
                  {obj.title}
                </button>
              );
            })}
          </div>

          {/* Subheader: Count + Archivados + Nuevo objetivo */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-[#A8A3B8]">
              {activeObjectives.length} objetivos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (archivedObjectives.length === 0) {
                    setAlertDialog({
                      title: 'Archivados',
                      message: 'No hay objetivos archivados.',
                    });
                  } else {
                    setIsArchivedModalOpen(true);
                  }
                }}
                className="px-2.5 py-1.5 rounded-[10px] bg-[#302747] text-white text-[12px] hover:bg-[#3e335c] transition"
              >
                Archivados
              </button>
              <button
                onClick={handleStartNewObjective}
                className="px-3 py-1.5 rounded-[10px] bg-[#7549B8] text-white text-[12px] font-medium hover:bg-[#8658cc] transition"
              >
                ＋ Nuevo objetivo
              </button>
            </div>
          </div>

          {/* Hero Objective Section */}
          <div
            ref={objectiveRef}
            style={{
              background: `linear-gradient(135deg, ${heroPreset.startColor}, ${heroPreset.endColor})`,
            }}
            className={`relative h-[370px] rounded-[22px] overflow-hidden transition-all ${
              highlightedSection === 'objective'
                ? 'border-[3px] border-[#C7A4FF]'
                : 'border border-[#3C3158]'
            }`}
          >
            {bannerImageSrc && (
              <img
                src={bannerImageSrc}
                alt=""
                style={{
                  objectPosition: `${50 - currentObjective.bannerOffsetX * 50}% ${
                    50 - currentObjective.bannerOffsetY * 50
                  }%`,
                }}
                className="absolute inset-0 w-full h-full object-cover opacity-72 pointer-events-none select-none"
              />
            )}
            <div className="absolute inset-0 bg-[#211D35]/60 pointer-events-none" />

            <div className="relative z-10 h-full p-[18px] flex flex-col justify-between">
              {/* Top Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <h2 className="text-[21px] font-bold text-white leading-tight">
                    {currentObjective.title}
                  </h2>
                  {currentObjective.description && (
                    <p className="text-[13px] text-[#D0C5E7]">
                      {currentObjective.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsBannerPickerOpen(true)}
                  className="px-3 py-2 rounded-[12px] bg-[#211D35]/70 text-white text-[12px] hover:bg-[#211D35]/90 transition shrink-0"
                >
                  ▧  Fondo
                </button>
              </div>

              {/* Middle Row: Ahorrado | Circular Progress | Meta */}
              <div className="grid grid-cols-[1fr_76px_1fr] items-center gap-1.5 py-1">
                <div className="text-center space-y-1">
                  <div className="text-[11px] font-bold text-[#9AF0AE] tracking-wide">
                    AHORRADO
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-bold text-white break-words tabular-nums transition-transform duration-300">
                    {formatObjectiveAmount(
                      currentObjective.currentAmount,
                      currentObjective
                    )}
                  </div>
                </div>

                {/* CircularProgressView */}
                <div className="w-[70px] h-[70px] mx-auto relative flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(229,185,69,0.25)]" viewBox="0 0 70 70">
                    <circle
                      cx="35"
                      cy="35"
                      r="29"
                      fill="none"
                      stroke="#51436C"
                      strokeWidth="5.25"
                    />
                    {progress > 0 && (
                      <circle
                        cx="35"
                        cy="35"
                        r="29"
                        fill="none"
                        stroke="#E5B945"
                        strokeWidth="5.25"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 29}
                        strokeDashoffset={2 * Math.PI * 29 * (1 - progress)}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>
                  <span className="absolute text-[18px] font-bold text-white tabular-nums">
                    {progressText}
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-[11px] font-bold text-[#DEC2FF] tracking-wide">
                    META
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-bold text-white break-words tabular-nums">
                    {formatObjectiveAmount(
                      currentObjective.goalAmount,
                      currentObjective
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Progress Bar & Remaining Text */}
              <div className="space-y-2">
                <div className="w-full h-[12px] rounded-full bg-[#51436C]/90 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#45B965] via-[#58D477] to-[#82E59B] transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: `${progress * 100}%` }}
                  >
                    <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#F0EAF8]">
                    {remainingText}
                  </span>
                  <span className="text-[11px] text-[#D8D1E5] shrink-0">
                    {activeObjectives.length} objetivos
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Entries Section (Registrar Progreso) */}
          <div
            ref={entriesRef}
            className={`p-3.5 rounded-[18px] bg-[#1C1C2A] space-y-3 transition-all ${
              highlightedSection === 'entries'
                ? 'border-[3px] border-[#C7A4FF]'
                : 'border border-[#29283C]'
            }`}
          >
            <div className="space-y-0.5">
              <h3 className="text-[17px] font-bold text-[#F4F1FF]">
                Registrar Progreso
              </h3>
              <p className="text-[11px] text-[#A8A3B8]">
                Cada pequeño aporte te acerca a tu meta
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setIsAddition(true)}
                style={{
                  backgroundColor: isAddition ? '#23563B' : '#29332F',
                }}
                className="h-[54px] rounded-[12px] font-bold text-[#BFF5CE] text-sm transition"
              >
                ＋ SUMAR
              </button>
              <button
                onClick={() => setIsAddition(false)}
                style={{
                  backgroundColor: isAddition ? '#3B2932' : '#5A2E3B',
                }}
                className="h-[54px] rounded-[12px] font-bold text-[#FFD1D7] text-sm transition"
              >
                − RESTAR
              </button>
            </div>

            <div className="text-[10px] font-bold text-[#A8A3B8] tracking-wider">
              ACCESOS RÁPIDOS
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 500, 1000].map((amt) => {
                const isSelected = selectedQuickAmount === amt;
                return (
                  <button
                    key={amt}
                    onClick={() => handleSelectQuickAmount(amt)}
                    style={{
                      backgroundColor: isSelected ? '#604094' : '#29283D',
                    }}
                    className="h-[42px] px-1 rounded-[10px] text-[12px] text-[#E2D8FF] font-medium truncate transition"
                  >
                    {formatObjectiveAmount(amt, currentObjective)}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5">
              <label className="text-[11px] text-[#A8A3B8] shrink-0">
                Otro importe
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={customAmountText}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Escribe un importe"
                className="flex-1 h-[44px] px-3 rounded-[10px] bg-[#151520] text-[#F4F1FF] placeholder-[#88849A] text-sm border border-[#29283C] focus:outline-none focus:border-[#7549B8]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] text-[#BDB6CE] tabular-nums">
                Monto seleccionado:{' '}
                <span className="font-semibold text-[#F4F1FF]">
                  {formatObjectiveAmount(selectedAmount, currentObjective)}
                </span>
              </div>
              {liveXpPreview && (
                <div
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-[8px] border bg-[#231F35] flex items-center gap-1.5 transition-all duration-200 ${
                    liveXpPreview.willLevelUp
                      ? 'border-[#FFD54F]/60 text-[#FFD54F] shadow-[0_0_12px_rgba(255,213,79,0.2)]'
                      : isAddition
                      ? 'border-[#3D3559] text-[#82E59B]'
                      : 'border-[#3D3559] text-[#D8C5FF]'
                  }`}
                >
                  <span>
                    ⚡ +{liveXpPreview.estimatedXp} XP con este registro
                    {liveXpPreview.bonusTag ? ` · ${liveXpPreview.bonusTag}` : ''}
                  </span>
                  {liveXpPreview.willLevelUp && (
                    <span className="text-[10px] font-extrabold text-[#FFE082]">
                      · ¡SUBES DE NIVEL!
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newEntryDescription}
                onChange={(e) => setNewEntryDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEntry();
                }}
                placeholder="¿Qué fue esta entrada? (opcional)"
                className="flex-1 h-[48px] px-3 rounded-[11px] bg-[#151520] text-[#F4F1FF] placeholder-[#88849A] text-sm border border-[#29283C] focus:outline-none focus:border-[#7549B8] transition"
              />
              <button
                onClick={handleAddEntry}
                disabled={!hasValidSelectedAmount}
                className="h-[48px] px-5 rounded-[11px] bg-gradient-to-r from-[#7549B8] to-[#8C5CE0] text-white font-bold text-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow-[0_4px_14px_rgba(117,73,184,0.35)] shrink-0"
              >
                AGREGAR
              </button>
            </div>

            {persistenceMessage && (
              <div className="text-[11px] text-[#F2A5A5]">
                {persistenceMessage}
              </div>
            )}
          </div>

          {/* Achievements Horizontal Section */}
          <div
            ref={achievementsRef}
            className={`p-3.5 rounded-[18px] bg-[#1C1C2A] space-y-2.5 transition-all ${
              highlightedSection === 'achievements'
                ? 'border-[3px] border-[#C7A4FF]'
                : 'border border-[#29283C]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[#F4F1FF]">
                🏆 Logros
              </h3>
              <button
                onClick={() => setIsAllAchievementsOpen(true)}
                className="text-[10px] font-bold text-[#C7A4FF] hover:underline"
              >
                VER TODOS
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const isUnlocked =
                  currentObjective.unlockedAchievementIds.includes(ach.id);
                const title =
                  ach.isSecret && !isUnlocked ? 'Logro oculto' : ach.title;
                const icon = ach.isSecret && !isUnlocked ? '❔' : ach.icon;
                const statusText = isUnlocked
                  ? `Desbloqueado · +${ach.rewardXp} XP`
                  : 'Por desbloquear';

                return (
                  <button
                    key={ach.id}
                    onClick={() => handleAchievementClick(ach)}
                    style={{
                      backgroundColor: isUnlocked ? '#202D2A' : '#232231',
                      borderColor: isUnlocked ? '#82E59B' : '#A8A3B8',
                    }}
                    className="w-[210px] shrink-0 p-2.5 rounded-[12px] border text-left flex items-center gap-2 hover:brightness-110 transition"
                  >
                    <span className="text-[22px] shrink-0">{icon}</span>
                    <div className="min-w-0 space-y-0.5">
                      <div
                        style={{
                          color: isUnlocked ? '#82E59B' : '#A8A3B8',
                        }}
                        className="text-[12px] font-bold truncate"
                      >
                        {title}
                      </div>
                      <div className="text-[10px] text-[#C3C0CC] line-clamp-2">
                        {ach.description}
                      </div>
                      <div className="text-[9px] text-[#D8D1E5]">
                        {statusText}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unified Santuario Evolutivo & Ritual Diario (Pilares A + B + C) */}
          <div className="p-3.5 sm:p-4 rounded-[20px] border border-[#342D4B] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)]">
            {/* Ambient subtle glow matching mascot tier */}
            <div className="pointer-events-none absolute -top-12 -left-10 w-36 h-36 rounded-full bg-[#7549B8]/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-10 w-36 h-36 rounded-full bg-[#65DB85]/10 blur-2xl" />

            {xpBurst && (
              <div
                key={xpBurst.id}
                className="pointer-events-none absolute right-4 top-2.5 z-30 text-xs font-extrabold text-[#82E59B] drop-shadow-[0_2px_8px_rgba(101,219,133,0.45)] animate-xp-float"
              >
                +{xpBurst.xp} XP ✨
              </div>
            )}

            {/* Speech bubble when mascot is petted or reacts */}
            {mascotSpeech && (
              <div
                key={mascotJoyId}
                className="relative z-20 px-3 py-1.5 rounded-[12px] bg-[#29233E]/95 border border-[#B58BFF]/40 text-[11px] font-medium text-[#F4F1FF] flex items-center justify-between gap-2 shadow-md animate-in fade-in slide-in-from-bottom-1 duration-200"
              >
                <span>💬 {mascotSpeech}</span>
                <button
                  onClick={() => setMascotSpeech(null)}
                  className="text-[#A8A3B8] hover:text-white text-xs shrink-0"
                >
                  ×
                </button>
              </div>
            )}

            {/* Top Row: Interactive Mascot + Level & XP Progress */}
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="relative shrink-0 flex flex-col items-center">
                <button
                  onClick={handlePetMascot}
                  title={
                    !hasPettedToday
                      ? '¡Acaricia a tu guardián para ganar +15 XP hoy!'
                      : 'Toca para interactuar con tu mascota'
                  }
                  className="relative group focus:outline-none"
                >
                  {/* Unclaimed daily pet pulse ring */}
                  {!hasPettedToday && (
                    <span className="pointer-events-none absolute -inset-1 rounded-full border border-[#FF80AB]/60 animate-ping opacity-40" />
                  )}
                  <div
                    key={
                      mascotJoyId
                        ? `joy-${mascotJoyId}`
                        : xpBurst
                        ? `burst-${xpBurst.id}`
                        : `lvl-${level}`
                    }
                    className={
                      mascotJoyId && Date.now() - mascotJoyId < 900
                        ? 'animate-mascot-joy'
                        : 'animate-mascot-float'
                    }
                  >
                    <MascotAvatarSvg level={level} size={66} />
                  </div>
                  {/* Floating heart/sparkle badge */}
                  <span
                    className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border shadow-sm transition-transform group-hover:scale-110 ${
                      !hasPettedToday
                        ? 'bg-[#3A1E36] text-[#FF9EC2] border-[#FF80AB]/60'
                        : 'bg-[#262238] text-[#D8C5FF] border-[#51436C]'
                    }`}
                  >
                    {!hasPettedToday ? '👋 +15 XP' : '💖 Vínculo'}
                  </span>
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[15px] font-bold text-[#F4F1FF] tabular-nums truncate">
                      {experienceText}
                    </span>
                    <span
                      style={{
                        color: mascotMood.color,
                        backgroundColor: mascotMood.bg,
                        borderColor: mascotMood.border,
                      }}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                    >
                      {mascotMood.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#B8B2C8] text-right tabular-nums">
                    {levelProgressText}
                  </div>
                </div>

                {/* XP Bar with Live Preview */}
                <div className="w-full h-[9px] rounded-full bg-[#322C47] overflow-hidden relative">
                  {liveXpPreview && (
                    <div
                      className="absolute inset-y-0 left-0 bg-[#82E59B]/40 transition-all duration-300"
                      style={{
                        width: `${liveXpPreview.projectedProgress * 100}%`,
                      }}
                    />
                  )}
                  <div
                    className="h-full bg-gradient-to-r from-[#8C5CE0] via-[#B58BFF] to-[#E2D4FF] transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: `${levelProgress * 100}%` }}
                  >
                    <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#C6C0D6] truncate">
                    {mascotMessage}
                  </div>
                  <button
                    onClick={() => {
                      setMascotGalleryStartLevel(level);
                      setIsMascotGalleryOpen(true);
                    }}
                    className="text-[10px] font-bold text-[#C7A4FF] hover:text-white hover:underline transition shrink-0"
                  >
                    CÓDICE (1–200) →
                  </button>
                </div>
              </div>
            </div>

            {/* Pillar C: 10-Node Species Evolution Track + Next Mystery Species Teaser (Zeigarnik Effect) */}
            <div className="pt-2 border-t border-[#2B263D]/90 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span className="font-semibold text-[#D8C5FF] truncate">
                    Etapa {mascotTier + 1}/20 · Evolución {currentSubLevelIndex + 1}/10
                  </span>
                  <span className="text-[#9AF0AE] font-mono-tabular shrink-0">
                    {mascotTier < 19
                      ? `Próxima especie en ${levelsToNextSpecies} nv.`
                      : 'Etapa Suprema Desbloqueada'}
                  </span>
                </div>

                {/* 10 Sub-level Rune Nodes */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }, (_, idx) => {
                    const nodeLevel = tierStartLevel + idx;
                    const isPassed = idx < currentSubLevelIndex;
                    const isCurrent = idx === currentSubLevelIndex;
                    return (
                      <button
                        key={nodeLevel}
                        onClick={() => {
                          setMascotGalleryStartLevel(nodeLevel);
                          setIsMascotGalleryOpen(true);
                        }}
                        title={`Ver Nivel ${nodeLevel} en el Códice`}
                        className={`h-[7px] flex-1 rounded-full transition-all ${
                          isCurrent
                            ? 'bg-gradient-to-r from-[#FFD54F] to-[#82E59B] shadow-[0_0_8px_rgba(255,213,79,0.65)] scale-y-125'
                            : isPassed
                            ? 'bg-[#8C5CE0] hover:bg-[#B58BFF]'
                            : 'bg-[#2C273F] hover:bg-[#3B3454]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Next Species Mystery Silhouette Medallion */}
              {mascotTier < 19 && (
                <button
                  onClick={() => {
                    setMascotGalleryStartLevel(nextSpeciesLevel);
                    setIsMascotGalleryOpen(true);
                  }}
                  title={`Espiar silueta de Nivel ${nextSpeciesLevel}: ${MASCOT_STAGE_HINTS[nextSpeciesTier]}`}
                  className="shrink-0 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-[12px] bg-[#221E33] border border-[#4D3E73] hover:border-[#C7A4FF] transition group animate-mystery-beacon"
                >
                  <div className="relative">
                    <MascotAvatarSvg
                      level={nextSpeciesLevel}
                      size={30}
                      isLocked={level < nextSpeciesLevel}
                    />
                    <span className="absolute -top-1 -right-1 text-[9px]">
                      ❔
                    </span>
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-[9px] font-extrabold text-[#FFD54F] group-hover:text-white transition">
                      NV. {nextSpeciesLevel}
                    </div>
                    <div className="text-[8px] text-[#C7A4FF]">
                      ¿Nueva especie?
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Pillar B: 7-Day Streak Stamp Bar + Expandable Daily Micro-Quests */}
            <div className="pt-2 border-t border-[#2B263D]/90 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* 7-Day Week Stamps */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#FFC45D] mr-0.5">
                    🔥 {streakDays}d
                  </span>
                  <div className="flex items-center gap-1">
                    {weekDaysStrip.map((d) => (
                      <div
                        key={d.key}
                        title={
                          d.isToday
                            ? `Hoy (${d.isActive ? 'Activo' : 'Pendiente'})`
                            : d.key
                        }
                        className={`w-[22px] h-[22px] rounded-[7px] text-[9px] font-bold flex items-center justify-center border transition-all ${
                          d.isActive
                            ? 'bg-gradient-to-b from-[#3E7B52] to-[#234931] border-[#82E59B] text-white shadow-[0_0_6px_rgba(130,229,155,0.3)]'
                            : d.isToday
                            ? 'bg-[#2B253E] border-[#FFD54F] text-[#FFD54F]'
                            : d.isFuture
                            ? 'bg-[#171624] border-[#262338] text-[#635E78]'
                            : 'bg-[#1B1A29] border-[#2C293E] text-[#7D7894]'
                        }`}
                      >
                        {d.isActive ? '✓' : d.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggle Daily Quests Button */}
                <button
                  onClick={() => setIsDailyRitualOpen((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-[9px] text-[10px] font-bold border flex items-center gap-1.5 transition ${
                    unclaimedReadyQuestsCount > 0 || canClaimAllDailyBonus
                      ? 'bg-[#35294F] border-[#FFD54F] text-[#FFE082] shadow-[0_0_10px_rgba(255,213,79,0.25)]'
                      : 'bg-[#252136] border-[#3D3559] text-[#D8C5FF] hover:bg-[#2F2A44]'
                  }`}
                >
                  <span>
                    🎯 Misiones hoy ({completedQuestsCount}/{dailyQuests.length})
                  </span>
                  {(unclaimedReadyQuestsCount > 0 || canClaimAllDailyBonus) && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FFD54F] text-[#1A162B] text-[9px] font-extrabold">
                      ¡RECLAMAR!
                    </span>
                  )}
                  <span className="text-[9px] opacity-80">
                    {isDailyRitualOpen ? '▲' : '▼'}
                  </span>
                </button>
              </div>

              {/* Collapsible Daily Quests Drawer (Auto-highlights if unclaimed rewards or opened) */}
              {(isDailyRitualOpen ||
                unclaimedReadyQuestsCount > 0 ||
                canClaimAllDailyBonus) && (
                <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2E2942] space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                    <span>
                      Completa las 3 misiones diarias para el Cofre de Sello (+40 XP)
                    </span>
                    {isAllDailyBonusClaimed ? (
                      <span className="text-[#82E59B] font-bold">
                        👑 Sello diario completado
                      </span>
                    ) : canClaimAllDailyBonus ? (
                      <button
                        onClick={handleClaimAllDailyBonus}
                        className="px-2.5 py-0.5 rounded-[7px] bg-gradient-to-r from-[#E5B945] to-[#FFD54F] text-[#1A162B] font-extrabold text-[10px] hover:brightness-110 active:scale-95 transition shadow"
                      >
                        🎁 Reclamar Cofre +40 XP
                      </button>
                    ) : (
                      <span className="text-[#FFD54F] font-mono-tabular">
                        Cofre: {completedQuestsCount}/3
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {dailyQuests.map((q) => {
                      const canClaim = q.isCompleted && !q.isClaimed;
                      return (
                        <div
                          key={q.id}
                          className={`p-2 rounded-[10px] border flex items-center justify-between gap-2 transition ${
                            q.isClaimed
                              ? 'bg-[#1B2623]/70 border-[#3A6B52]/60'
                              : canClaim
                              ? 'bg-[#2B2342] border-[#FFD54F]/80'
                              : 'bg-[#1B1A29] border-[#2B283E]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{q.icon}</span>
                            <div className="min-w-0">
                              <div
                                className={`text-[11px] font-bold truncate ${
                                  q.isClaimed
                                    ? 'text-[#82E59B]'
                                    : 'text-[#F4F1FF]'
                                }`}
                              >
                                {q.title}
                              </div>
                              <div className="text-[9px] text-[#A8A3B8] truncate">
                                {q.subtitle}
                              </div>
                            </div>
                          </div>

                          {q.isClaimed ? (
                            <span className="text-[9px] font-bold text-[#82E59B] px-1.5 py-0.5 rounded bg-[#1F3A2E] shrink-0">
                              ✓ +{q.rewardXp}
                            </span>
                          ) : canClaim ? (
                            <button
                              onClick={() =>
                                handleClaimQuest(q.id, q.rewardXp, q.title)
                              }
                              className="px-2 py-1 rounded-[7px] bg-[#82E59B] text-[#102618] font-extrabold text-[10px] hover:brightness-110 active:scale-95 transition shrink-0 shadow-sm"
                            >
                              +{q.rewardXp} XP
                            </button>
                          ) : (
                            <span className="text-[9px] font-mono-tabular text-[#88839E] shrink-0">
                              +{q.rewardXp} XP
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics Section */}
          <div
            ref={statsRef}
            className={`p-3.5 rounded-[18px] bg-[#1C1C2A] space-y-2 transition-all ${
              highlightedSection === 'stats'
                ? 'border-[3px] border-[#C7A4FF]'
                : 'border border-[#29283C]'
            }`}
          >
            <h3 className="text-[17px] font-bold text-[#F4F1FF]">
              ▥ Estadísticas
            </h3>
            <div className="text-sm text-[#F4F1FF]">
              Entradas totales: {totalEntryCount}
            </div>
            <div className="text-sm text-[#FFC45D]">
              Racha global: {streakText}
            </div>
            <div className="text-sm text-[#C7A4FF]">{experienceText}</div>
          </div>

          {/* Settings Section */}
          <div
            ref={settingsRef}
            className={`p-3.5 rounded-[18px] bg-[#1C1C2A] space-y-2 transition-all ${
              highlightedSection === 'settings'
                ? 'border-[3px] border-[#C7A4FF]'
                : 'border border-[#29283C]'
            }`}
          >
            <h3 className="text-[17px] font-bold text-[#F4F1FF]">
              ⚙ Ajustes del objetivo
            </h3>
            <div className="flex flex-col items-start gap-2">
              <button
                onClick={() => setIsBannerPickerOpen(true)}
                className="px-3.5 py-2 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-sm hover:bg-[#3e335c] transition"
              >
                Cambiar banner
              </button>
              <button
                onClick={() => setIsEditorOpen(true)}
                className="px-3.5 py-2 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-sm hover:bg-[#3e335c] transition"
              >
                Editar nombre, monto y unidad
              </button>
              <button
                onClick={handleArchiveCurrentObjective}
                className="px-3.5 py-2 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-sm hover:bg-[#3e335c] transition"
              >
                Archivar objetivo
              </button>
              <button
                onClick={() => handleDeleteObjective(currentObjective)}
                className="px-3.5 py-2 rounded-[10px] bg-[#542A38] text-white text-sm hover:bg-[#6b3547] transition"
              >
                Eliminar objetivo
              </button>
            </div>
          </div>
        </main>

        {/* Right History Panel */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-[320px] lg:static lg:w-auto lg:block bg-[#171723] border-l border-[#29283C] p-4 flex flex-col gap-3.5 transition-transform duration-200 ${
            isHistoryOpen
              ? 'translate-x-0'
              : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-[17px] font-bold text-[#F4F1FF]">
                Registro de entradas
              </h3>
              <div className="text-[12px] text-[#A8A3B8]">
                Saldo actual:{' '}
                {formatObjectiveAmount(
                  currentObjective.currentAmount,
                  currentObjective
                )}
              </div>
            </div>
            <button
              onClick={() => setIsHistoryOpen(false)}
              aria-label="Cerrar historial"
              className="lg:hidden w-[42px] h-[42px] rounded-[12px] bg-[#242238] text-[#F4F1FF] text-[22px] flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'add', label: 'Sumas' },
              { id: 'subtract', label: 'Restas' },
            ].map((tab) => {
              const isSelected = historyFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setHistoryFilter(tab.id as 'all' | 'add' | 'subtract')
                  }
                  style={{
                    backgroundColor: isSelected ? '#604094' : '#252437',
                  }}
                  className={`h-[40px] rounded-[10px] text-[11px] font-medium transition ${
                    isSelected ? 'text-white' : 'text-[#C8C2D6]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* History Entries List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filteredEntries.length === 0 ? (
              <div className="text-center text-xs text-[#A8A3B8] py-8">
                Aún no hay entradas registradas.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isPositive = entry.amount >= 0;
                const amountFormatted = `${
                  isPositive ? '+' : '−'
                }${formatObjectiveAmount(
                  Math.abs(entry.amount),
                  currentObjective
                )}`;
                return (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-[12px] border border-[#2E2C40] bg-[#201F2E] flex items-center gap-2"
                  >
                    <span className="text-[17px] shrink-0">
                      {isPositive ? '🟢' : '🔴'}
                    </span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="text-[13px] font-bold text-[#F3F0FA] truncate">
                        {entry.description}
                      </div>
                      <div className="text-[10px] text-[#A8A3B8]">
                        {formatEntryTime(entry.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        color: isPositive ? '#65DB85' : '#F27783',
                      }}
                      className="text-[13px] font-bold shrink-0"
                    >
                      {amountFormatted}
                    </div>
                    <button
                      onClick={() => setEntryActionTarget(entry)}
                      className="w-[34px] h-[38px] text-white text-lg flex items-center justify-center rounded-lg hover:bg-[#2E2C40] shrink-0"
                    >
                      ⋯
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Modal: ObjectiveEditorPage */}
      {isEditorOpen && (
        <ObjectiveEditorModal
          objective={currentObjective}
          onCancel={handleCancelObjectiveEditor}
          onSave={handleSaveObjectiveEditor}
          onAlert={(title, message) => setAlertDialog({ title, message })}
        />
      )}

      {/* Modal: BannerPickerPage */}
      {isBannerPickerOpen && (
        <BannerPickerModal
          onCancel={() => setIsBannerPickerOpen(false)}
          onApply={handleApplyBanner}
          onAlert={(title, message) => setAlertDialog({ title, message })}
        />
      )}

      {/* Modal: MascotGalleryPage (200 evolutions) */}
      {isMascotGalleryOpen && (
        <MascotGalleryModal
          initialLevel={level}
          initialPreviewLevel={mascotGalleryStartLevel ?? level}
          onClose={() => {
            setIsMascotGalleryOpen(false);
            setMascotGalleryStartLevel(null);
          }}
        />
      )}

      {/* Modal: AchievementsPage */}
      {isAllAchievementsOpen && (
        <div className="fixed inset-0 z-50 bg-[#11121C] flex flex-col p-[18px] overflow-hidden">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-[22px] font-bold text-[#F4F1FF]">
                  🏆 Todos los logros
                </h2>
                <p className="text-[12px] text-[#A8A3B8]">
                  Toca una tarjeta para ver su pista o recompensa.
                </p>
              </div>
              <button
                onClick={() => setIsAllAchievementsOpen(false)}
                className="px-4 py-2 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-sm font-medium hover:bg-[#3e335c]"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const isUnlocked =
                  currentObjective.unlockedAchievementIds.includes(ach.id);
                const title =
                  ach.isSecret && !isUnlocked ? 'Logro oculto' : ach.title;
                const icon = ach.isSecret && !isUnlocked ? '❔' : ach.icon;
                const statusText = isUnlocked
                  ? `Desbloqueado · +${ach.rewardXp} XP`
                  : 'Por desbloquear';

                return (
                  <button
                    key={ach.id}
                    onClick={() => handleAchievementClick(ach)}
                    style={{
                      backgroundColor: isUnlocked ? '#202D2A' : '#232231',
                      borderColor: isUnlocked ? '#82E59B' : '#A8A3B8',
                    }}
                    className="h-[110px] p-3 rounded-[12px] border text-left flex flex-col justify-center gap-1 hover:brightness-110 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{icon}</span>
                      <span
                        style={{
                          color: isUnlocked ? '#82E59B' : '#A8A3B8',
                        }}
                        className="text-[12px] font-bold"
                      >
                        {title}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#C3C0CC] line-clamp-2">
                      {ach.description}
                    </div>
                    <div className="text-[9px] text-[#D8D1E5]">{statusText}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Archived Objectives */}
      {isArchivedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-5 space-y-4">
            <h3 className="text-lg font-bold text-[#F4F1FF]">
              Objetivos archivados
            </h3>
            {archivedObjectives.length === 0 ? (
              <p className="text-sm text-[#A8A3B8]">
                No hay objetivos archivados.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {archivedObjectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="p-3 rounded-[12px] bg-[#242238] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {obj.title}
                      </div>
                      <div className="text-xs text-[#A8A3B8]">
                        {formatObjectiveAmount(obj.currentAmount, obj)} /{' '}
                        {formatObjectiveAmount(obj.goalAmount, obj)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setState((prev) => ({
                            ...prev,
                            objectives: prev.objectives.map((o) =>
                              o.id === obj.id ? { ...o, isArchived: false } : o
                            ),
                            selectedObjectiveId: obj.id,
                          }));
                          setIsArchivedModalOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#604094] text-white text-xs font-medium"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => {
                          setIsArchivedModalOpen(false);
                          handleDeleteObjective(obj);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#542A38] text-white text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setIsArchivedModalOpen(false)}
                className="px-4 py-2 rounded-[10px] bg-[#302E42] text-[#F4F1FF] text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Entry Action Sheet (Editar / Eliminar) */}
      {entryActionTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-4 space-y-2.5">
            <h4 className="text-base font-bold text-[#F4F1FF] text-center">
              Entrada
            </h4>
            <button
              onClick={() => {
                const target = entryActionTarget;
                setEntryActionTarget(null);
                setEditingEntry(target);
              }}
              className="w-full py-2.5 rounded-[10px] bg-[#302747] text-white text-sm font-medium hover:bg-[#3e335c]"
            >
              Editar
            </button>
            <button
              onClick={() => {
                const id = entryActionTarget.id;
                setEntryActionTarget(null);
                handleDeleteEntry(id);
              }}
              className="w-full py-2.5 rounded-[10px] bg-[#542A38] text-white text-sm font-medium hover:bg-[#6b3547]"
            >
              Eliminar
            </button>
            <button
              onClick={() => setEntryActionTarget(null)}
              className="w-full py-2.5 rounded-[10px] bg-[#242238] text-[#A8A3B8] text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Edit Entry Prompt */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onCancel={() => setEditingEntry(null)}
          onSave={handleSaveEntryEdit}
          onAlert={(title, message) => setAlertDialog({ title, message })}
        />
      )}

      {/* Modal: Achievement Detail Alert */}
      {selectedAchievementDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-5 space-y-3">
            <h3 className="text-lg font-bold text-[#F4F1FF]">
              {selectedAchievementDetail.title}
            </h3>
            <p className="text-sm text-[#E6E0F2]">
              {selectedAchievementDetail.detail}
            </p>
            <p className="text-xs text-[#C7A4FF]">
              {selectedAchievementDetail.status}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAchievementDetail(null)}
                className="px-4 py-2 rounded-[10px] bg-[#7549B8] text-white text-sm font-semibold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-5 space-y-4">
            <h3 className="text-lg font-bold text-[#F4F1FF]">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-[#A8A3B8]">{confirmDialog.message}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="py-2.5 rounded-[10px] bg-[#302E42] text-[#F4F1FF] text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="py-2.5 rounded-[10px] bg-[#7549B8] text-white text-sm font-bold"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alert Dialog */}
      {alertDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-5 space-y-4">
            <h3 className="text-lg font-bold text-[#F4F1FF]">
              {alertDialog.title}
            </h3>
            <p className="text-sm text-[#A8A3B8]">{alertDialog.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertDialog(null)}
                className="px-5 py-2 rounded-[10px] bg-[#7549B8] text-white text-sm font-bold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MASCOT_STAGE_NAMES = [
  'Brote Esmeralda',
  'Espíritu Neko',
  'Zorro Kitsune',
  'Búho Sabio',
  'Lobo Boreal',
  'Tigre Guardián',
  'León Solar',
  'Ciervo del Bosque',
  'Fénix Carmesí',
  'Gólem de Cristal',
  'Kraken Abisal',
  'Cronos Autómata',
  'Dragón Imperial',
  'Polilla Astral',
  'Serafín Ophanim',
  'Hidra Tricéfala',
  'Djinn Astral',
  'Valkiria Celestial',
  'Arquitecto Merkaba',
  'Singularidad Cósmica',
];

const MASCOT_STAGE_HINTS = [
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
  'Un quásar viviente coronado en el centro del universo.',
];

const MascotGridCard = React.memo(function MascotGridCard({
  lvl,
  itemTier,
  isSelected,
  isItemLocked,
  onSelect,
}: {
  lvl: number;
  itemTier: number;
  isSelected: boolean;
  isItemLocked: boolean;
  onSelect: (level: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(lvl)}
      className={`p-2 rounded-[14px] border flex flex-col items-center gap-1 transition ${
        isSelected
          ? 'border-[#C7A4FF] bg-[#302747]'
          : isItemLocked
          ? 'border-[#252438] bg-[#151521] hover:bg-[#1E1D2E]'
          : 'border-[#4A3B6E] bg-[#1C1C2A] hover:bg-[#242238]'
      }`}
    >
      <MascotAvatarSvg level={lvl} size={48} isLocked={isItemLocked} />
      <span
        className={`text-[11px] font-bold ${
          isItemLocked ? 'text-[#88839E]' : 'text-[#F4F1FF]'
        }`}
      >
        {isItemLocked ? `🔒 Nv. ${lvl}` : `Nv. ${lvl}`}
      </span>
      <span className="text-[9px] text-[#A8A3B8] truncate w-full text-center">
        {isItemLocked ? '？？？' : MASCOT_STAGE_NAMES[itemTier]}
      </span>
    </button>
  );
});

function MascotGalleryModal({
  initialLevel,
  initialPreviewLevel,
  onClose,
}: {
  initialLevel: number;
  initialPreviewLevel?: number;
  onClose: () => void;
}) {
  const unlockedLevel = Math.max(1, initialLevel);
  const [previewLevel, setPreviewLevel] = useState<number>(() =>
    Math.min(200, Math.max(1, initialPreviewLevel ?? unlockedLevel))
  );

  const tier = Math.floor((previewLevel - 1) / 10);
  const subLevel = ((previewLevel - 1) % 10) + 1;
  const isPreviewLocked = previewLevel > unlockedLevel;

  return (
    <div className="fixed inset-0 z-50 bg-[#11121C] flex flex-col p-3 sm:p-[18px] overflow-hidden">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-3 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-[17px] sm:text-[20px] font-bold text-[#F4F1FF] truncate">
              🐾 Códice de Mascotas (1–200)
            </h2>
            <p className="text-[11px] sm:text-[12px] text-[#A8A3B8] truncate">
              Arrastra la barra libremente del nivel 1 al 200 o toca cualquier tarjeta.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-sm font-medium hover:bg-[#3e335c] shrink-0"
          >
            Cerrar
          </button>
        </div>

        {/* Interactive Slider Preview (Fixed-height rows so slider never shifts while dragging) */}
        <div className="p-3 sm:p-3.5 rounded-[18px] border border-[#29283C] bg-[#1C1C2A] flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="shrink-0">
            <div className="animate-mascot-float">
              <MascotAvatarSvg
                level={previewLevel}
                size={80}
                isLocked={isPreviewLocked}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[14px] sm:text-[16px] font-bold text-[#D8C5FF] truncate">
                {isPreviewLocked
                  ? `🔒 Nivel ${previewLevel} · Criatura Misteriosa`
                  : `✨ Nivel ${previewLevel} · ${MASCOT_STAGE_NAMES[tier]}`}
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#302747] text-[#E6D9FF] whitespace-nowrap shrink-0">
                Etapa {tier + 1}/20 · Evol. {subLevel}/10{' '}
                {isPreviewLocked ? '🔒' : '✓'}
              </span>
            </div>
            <div className="text-[11px] text-[#C7A4FF] truncate">
              {isPreviewLocked
                ? `Pista (Nv. ${previewLevel}): ${MASCOT_STAGE_HINTS[tier]}`
                : MASCOT_STAGE_HINTS[tier]}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] font-mono-tabular text-[#88839E] shrink-0">
                1
              </span>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={previewLevel}
                onInput={(e) =>
                  setPreviewLevel(Number((e.target as HTMLInputElement).value))
                }
                onChange={(e) => setPreviewLevel(Number(e.target.value))}
                className="w-full h-6 accent-[#B58BFF] cursor-grab active:cursor-grabbing touch-none"
              />
              <span className="text-[10px] font-mono-tabular text-[#88839E] shrink-0">
                200
              </span>
            </div>
          </div>
        </div>

        {/* Grid of all 200 Mini-Images */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 pr-1">
          {Array.from({ length: 200 }, (_, idx) => {
            const lvl = idx + 1;
            const itemTier = Math.floor((lvl - 1) / 10);
            return (
              <MascotGridCard
                key={lvl}
                lvl={lvl}
                itemTier={itemTier}
                isSelected={lvl === previewLevel}
                isItemLocked={lvl > unlockedLevel}
                onSelect={setPreviewLevel}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MascotAvatarSvg({
  level,
  size = 56,
  isLocked = false,
}: {
  level: number;
  size?: number;
  isLocked?: boolean;
}) {
  const palettes = [
    ['#2E7D5B', '#65DB85', '#BFF5CE', '#1E4635'], // 0: Brote Esmeralda
    ['#3B5BA5', '#7DA6FF', '#D6E4FF', '#203059'], // 1: Espíritu Neko
    ['#B84A39', '#FF8A65', '#FFE0B2', '#4E221B'], // 2: Zorro Kitsune
    ['#5D4037', '#BCAAA4', '#FFE082', '#32231E'], // 3: Búho Sabio
    ['#28667E', '#64D8FF', '#E0F7FA', '#163745'], // 4: Lobo Boreal
    ['#C66900', '#FFB74D', '#FFF3E0', '#4D2C08'], // 5: Tigre Guardián
    ['#C79100', '#FFD54F', '#FFFDE7', '#4F3B05'], // 6: León Solar
    ['#2E6B4E', '#81C784', '#E8F5E9', '#193A2A'], // 7: Ciervo del Bosque
    ['#C62828', '#FF7043', '#FFD54F', '#4F1010'], // 8: Fénix Carmesí
    ['#455A64', '#80CBC4', '#A7FFEB', '#1C262B'], // 9: Gólem de Cristal
    ['#00695C', '#26A69A', '#64FFDA', '#042F2B'], // 10: Kraken Abisal
    ['#8D6E63', '#FFD54F', '#FFF8E1', '#3E2723'], // 11: Cronos Autómata
    ['#6A1B9A', '#CE93D8', '#FFD54F', '#330D4B'], // 12: Dragón Imperial
    ['#283593', '#7986CB', '#F8BBD0', '#141A46'], // 13: Polilla Astral
    ['#AD8700', '#FFE082', '#FFFFFF', '#4A3A00'], // 14: Serafín Ophanim
    ['#2E7D32', '#66BB6A', '#DCE775', '#153817'], // 15: Hidra Tricéfala
    ['#4A148C', '#B388FF', '#FF80AB', '#240846'], // 16: Djinn Astral
    ['#1565C0', '#90CAF9', '#FFD740', '#0B2948'], // 17: Valkiria Celestial
    ['#00838F', '#4DD0E1', '#E040FB', '#052C33'], // 18: Arquitecto Merkaba
    ['#311B92', '#E040FB', '#FFD740', '#120836'], // 19: Singularidad Cósmica
  ];

  const clamped = Math.min(200, Math.max(1, level));
  const tier = Math.floor((clamped - 1) / 10);
  const subLevel = (clamped - 1) % 10;
  const subProgress = subLevel / 9;
  const [realPrimary, realSecondary, realAccent, realGlow] =
    palettes[tier] || palettes[0];

  const primary = isLocked ? '#232136' : realPrimary;
  const secondary = isLocked ? '#181726' : realSecondary;
  const accent = isLocked ? realPrimary : realAccent;
  const glow = isLocked ? '#0E0E17' : realGlow;
  const eyeColor = isLocked ? realPrimary : '#171725';

  const starCount = subLevel + 1;
  const scale = 0.72 + subProgress * 0.26;
  const cx = 28;
  const cy = 28;
  const radius = 25.5;
  const u = radius * scale;

  const renderEyes = (
    eyeY: number,
    offset: number,
    r: number,
    drawShine: boolean,
    customColor?: string
  ) => (
    <g>
      <circle
        cx={cx - offset}
        cy={eyeY}
        r={r}
        fill={customColor || eyeColor}
        opacity={isLocked ? 0.65 : 1}
      />
      <circle
        cx={cx + offset}
        cy={eyeY}
        r={r}
        fill={customColor || eyeColor}
        opacity={isLocked ? 0.65 : 1}
      />
      {drawShine && !isLocked && (
        <>
          <circle
            cx={cx - offset - r * 0.25}
            cy={eyeY - r * 0.25}
            r={r * 0.4}
            fill="#FFFFFF"
          />
          <circle
            cx={cx + offset - r * 0.25}
            cy={eyeY - r * 0.25}
            r={r * 0.4}
            fill="#FFFFFF"
          />
        </>
      )}
    </g>
  );

  const renderWings = (wingCy: number, wingU: number, color: string) => {
    const span = wingU * (0.82 + subLevel * 0.025);
    const height = wingU * (0.52 + subLevel * 0.02);
    return (
      <g fill={color}>
        <path
          d={`M ${cx - wingU * 0.2} ${wingCy + wingU * 0.08} C ${cx - span} ${
            wingCy - height
          }, ${cx - span} ${wingCy + height * 0.35}, ${cx - wingU * 0.25} ${
            wingCy + wingU * 0.35
          } Z`}
        />
        <path
          d={`M ${cx + wingU * 0.2} ${wingCy + wingU * 0.08} C ${cx + span} ${
            wingCy - height
          }, ${cx + span} ${wingCy + height * 0.35}, ${cx + wingU * 0.25} ${
            wingCy + wingU * 0.35
          } Z`}
        />
      </g>
    );
  };

  const renderPointedEars = (heightFactor: number) => {
    const earH = u * heightFactor;
    return (
      <g fill={primary}>
        <polygon
          points={`${cx - u * 0.42},${cy - u * 0.12} ${cx - u * 0.54},${
            cy - u * 0.3 - earH
          } ${cx - u * 0.1},${cy - u * 0.38}`}
        />
        <polygon
          points={`${cx + u * 0.42},${cy - u * 0.12} ${cx + u * 0.54},${
            cy - u * 0.3 - earH
          } ${cx + u * 0.1},${cy - u * 0.38}`}
        />
      </g>
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className="shrink-0 select-none"
    >
      {/* 1. Medallion */}
      <circle cx={cx} cy={cy} r={radius} fill={glow} />
      <circle
        cx={cx}
        cy={cy}
        r={radius * 0.92}
        fill="none"
        stroke={isLocked ? realPrimary : primary}
        strokeWidth={1.8 + subProgress * 1.1}
        opacity={isLocked ? 0.35 : 0.65 + subProgress * 0.3}
      />

      {/* 1b. Sub-Level Evolution Background Aura Layers (Clean circular halo for Tier 0 Brote Esmeralda, geometric rays for higher tiers) */}
      {subLevel >= 2 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius * 0.72}
          fill="none"
          stroke={primary}
          strokeWidth={1}
          opacity={isLocked ? 0.25 : 0.45}
        />
      )}
      {tier === 0 && subLevel >= 6 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius * (0.58 + (subLevel - 6) * 0.03)}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          opacity={isLocked ? 0.22 : 0.38}
        />
      )}
      {tier > 0 && subLevel >= 4 && (
        <g
          stroke={accent}
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={isLocked ? 0.25 : 0.65}
        >
          <line
            x1={cx - radius * 0.48}
            y1={cy + radius * 0.1}
            x2={cx - radius * (0.76 + (subLevel - 4) * 0.03)}
            y2={cy - radius * 0.18}
          />
          <line
            x1={cx + radius * 0.48}
            y1={cy + radius * 0.1}
            x2={cx + radius * (0.76 + (subLevel - 4) * 0.03)}
            y2={cy - radius * 0.18}
          />
          {subLevel >= 6 && (
            <>
              <line
                x1={cx - radius * 0.45}
                y1={cy + radius * 0.24}
                x2={cx - radius * (0.7 + (subLevel - 4) * 0.025)}
                y2={cy + radius * 0.06}
              />
              <line
                x1={cx + radius * 0.45}
                y1={cy + radius * 0.24}
                x2={cx + radius * (0.7 + (subLevel - 4) * 0.025)}
                y2={cy + radius * 0.06}
              />
            </>
          )}
        </g>
      )}
      {tier > 0 && subLevel >= 6 && (
        <polygon
          points={`${cx},${cy - radius * (0.58 + (subLevel - 6) * 0.035)} ${
            cx + radius * (0.58 + (subLevel - 6) * 0.035)
          },${cy} ${cx},${cy + radius * (0.58 + (subLevel - 6) * 0.035)} ${
            cx - radius * (0.58 + (subLevel - 6) * 0.035)
          },${cy}`}
          fill="none"
          stroke={accent}
          strokeWidth={1.1}
          opacity={isLocked ? 0.25 : 0.55}
        />
      )}
      {tier > 0 && subLevel === 9 && (
        <g
          stroke={accent}
          strokeWidth={1.15}
          strokeLinecap="round"
          opacity={isLocked ? 0.3 : 0.75}
        >
          {Array.from({ length: 8 }).map((_, r) => {
            const ang = Math.PI / 8 + r * (Math.PI / 4);
            return (
              <line
                key={r}
                x1={cx + Math.cos(ang) * radius * 0.62}
                y1={cy + Math.sin(ang) * radius * 0.62}
                x2={cx + Math.cos(ang) * radius * 0.88}
                y2={cy + Math.sin(ang) * radius * 0.88}
              />
            );
          })}
        </g>
      )}

      {/* 2. Orbital Stars */}
      {Array.from({ length: starCount }).map((_, i) => {
        const angle =
          -Math.PI / 2 + i * ((Math.PI * 2) / Math.max(3, starCount));
        const sx = cx + Math.cos(angle) * (radius * 0.82);
        const sy = cy + Math.sin(angle) * (radius * 0.82);
        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={1.1 + (i % 2) * 0.4 + subProgress * 0.35}
            fill={isLocked ? realPrimary : accent}
            opacity={isLocked ? 0.3 : 0.85}
          />
        );
      })}

      {/* 3. 20 Distinct Creature Forms with Progressive Sub-Level Evolution */}
      {tier === 0 && (
        <g>
          {/* Soft base shadow / cushion */}
          <ellipse
            cx={cx}
            cy={cy + u * 0.24}
            rx={u * (0.43 + subProgress * 0.05)}
            ry={u * (0.34 + subProgress * 0.04)}
            fill={secondary}
          />
          {/* Subtle inner belly highlight on higher subLevels */}
          {subLevel >= 2 && (
            <ellipse
              cx={cx}
              cy={cy + u * 0.28}
              rx={u * 0.26}
              ry={u * 0.16}
              fill={accent}
              opacity={isLocked ? 0.18 : 0.35}
            />
          )}
          {(() => {
            const stemH = u * (0.2 + subProgress * 0.24);
            const stemTopY = cy - u * 0.06 - stemH;
            const leafW = u * (0.14 + subProgress * 0.07);
            const leafH = leafW * 0.58;
            const leafY = cy - u * 0.08 - stemH * 0.62;
            return (
              <>
                {/* Single clean organic stem */}
                <line
                  x1={cx}
                  y1={cy - u * 0.05}
                  x2={cx}
                  y2={stemTopY}
                  stroke={accent}
                  strokeWidth={Math.max(2, u * 0.095)}
                  strokeLinecap="round"
                />
                {/* Maximum 1 pair of smooth sprout leaves (2 cotiledones) */}
                <ellipse
                  cx={cx - leafW * 0.95}
                  cy={leafY}
                  rx={leafW}
                  ry={leafH}
                  transform={`rotate(-22 ${cx - leafW * 0.95} ${leafY})`}
                  fill={accent}
                />
                {subLevel >= 1 && (
                  <ellipse
                    cx={cx + leafW * 0.95}
                    cy={leafY}
                    rx={leafW}
                    ry={leafH}
                    transform={`rotate(22 ${cx + leafW * 0.95} ${leafY})`}
                    fill={accent}
                  />
                )}
                {/* Levels 5-6: Clean little lotus bud at the tip */}
                {subLevel >= 4 && subLevel < 7 && (
                  <ellipse
                    cx={cx}
                    cy={stemTopY - leafW * 0.35}
                    rx={leafW * 0.48}
                    ry={leafW * 0.62}
                    fill={isLocked ? primary : '#FFD54F'}
                  />
                )}
                {/* Levels 8-10: Clean 3-petal blossom crowning the stem */}
                {subLevel >= 7 && (
                  <g>
                    <ellipse
                      cx={cx - leafW * 0.52}
                      cy={stemTopY - leafW * 0.25}
                      rx={leafW * 0.44}
                      ry={leafW * 0.62}
                      transform={`rotate(-28 ${cx - leafW * 0.52} ${
                        stemTopY - leafW * 0.25
                      })`}
                      fill={isLocked ? primary : '#FFB74D'}
                    />
                    <ellipse
                      cx={cx + leafW * 0.52}
                      cy={stemTopY - leafW * 0.25}
                      rx={leafW * 0.44}
                      ry={leafW * 0.62}
                      transform={`rotate(28 ${cx + leafW * 0.52} ${
                        stemTopY - leafW * 0.25
                      })`}
                      fill={isLocked ? primary : '#FFB74D'}
                    />
                    <ellipse
                      cx={cx}
                      cy={stemTopY - leafW * 0.42}
                      rx={leafW * 0.5}
                      ry={leafW * 0.7}
                      fill={isLocked ? accent : '#FFD54F'}
                    />
                    {subLevel >= 8 && (
                      <circle
                        cx={cx}
                        cy={stemTopY - leafW * 0.42}
                        r={leafW * 0.22}
                        fill={isLocked ? primary : '#FFF8E1'}
                      />
                    )}
                  </g>
                )}
              </>
            );
          })()}
          {renderEyes(cy + u * 0.2, u * 0.18, u * 0.08, true)}
        </g>
      )}

      {tier === 1 && (
        <g>
          {subLevel >= 5 && (
            <g
              stroke={primary}
              strokeWidth={Math.max(2, u * 0.1)}
              strokeLinecap="round"
            >
              <line
                x1={cx - u * 0.3}
                y1={cy + u * 0.3}
                x2={cx - u * 0.68}
                y2={cy - u * 0.15}
              />
              {subLevel >= 7 && (
                <line
                  x1={cx + u * 0.3}
                  y1={cy + u * 0.3}
                  x2={cx + u * 0.68}
                  y2={cy - u * 0.15}
                />
              )}
            </g>
          )}
          {renderPointedEars(0.42 + subLevel * 0.018)}
          <circle cx={cx} cy={cy + u * 0.06} r={u * 0.48} fill={secondary} />
          <g
            stroke={accent}
            strokeWidth={Math.max(1.1, u * 0.045)}
            strokeLinecap="round"
          >
            {Array.from({ length: 1 + Math.floor(subLevel / 4) }).map(
              (_, w) => {
                const wy = cy + u * (0.08 + w * 0.09);
                return (
                  <g key={w}>
                    <line
                      x1={cx - u * 0.28}
                      y1={wy}
                      x2={cx - u * 0.62}
                      y2={wy - u * 0.04}
                    />
                    <line
                      x1={cx + u * 0.28}
                      y1={wy}
                      x2={cx + u * 0.62}
                      y2={wy - u * 0.04}
                    />
                  </g>
                );
              }
            )}
          </g>
          {renderEyes(cy + u * 0.02, u * 0.2, u * 0.09, true)}
          {subLevel >= 2 && (
            <circle
              cx={cx}
              cy={cy + u * 0.48}
              r={u * (0.09 + subLevel * 0.005)}
              fill={isLocked ? primary : '#FFD54F'}
            />
          )}
        </g>
      )}

      {tier === 2 && (
        <g>
          {Array.from({ length: Math.min(9, 1 + subLevel) }).map(
            (_, t, arr) => {
              const tails = arr.length;
              const off =
                tails === 1
                  ? 0
                  : (t - (tails - 1) / 2) * (1.5 / Math.max(2, tails - 1));
              return (
                <ellipse
                  key={t}
                  cx={cx + off * u * 0.55}
                  cy={cy - u * 0.3 + Math.abs(off) * u * 0.22}
                  rx={u * 0.13}
                  ry={u * 0.33}
                  fill={primary}
                />
              );
            }
          )}
          {renderPointedEars(0.58 + subLevel * 0.015)}
          <polygon
            points={`${cx},${cy - u * 0.38} ${cx + u * 0.52},${
              cy + u * 0.04
            } ${cx},${cy + u * 0.54} ${cx - u * 0.52},${cy + u * 0.04}`}
            fill={secondary}
          />
          {renderEyes(cy + u * 0.04, u * 0.19, u * 0.085, true)}
        </g>
      )}

      {tier === 3 && (
        <g>
          {subLevel >= 4 &&
            renderWings(cy + u * 0.05, u * (0.75 + subLevel * 0.03), primary)}
          <g
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.09)}
            strokeLinecap="round"
          >
            <line
              x1={cx - u * 0.22}
              y1={cy - u * 0.28}
              x2={cx - u * 0.48}
              y2={cy - u * (0.53 + subLevel * 0.035)}
            />
            <line
              x1={cx + u * 0.22}
              y1={cy - u * 0.28}
              x2={cx + u * 0.48}
              y2={cy - u * (0.53 + subLevel * 0.035)}
            />
          </g>
          <ellipse
            cx={cx}
            cy={cy + u * 0.08}
            rx={u * 0.46}
            ry={u * 0.44}
            fill={secondary}
          />
          <circle
            cx={cx - u * 0.22}
            cy={cy - u * 0.02}
            r={u * (0.19 + subLevel * 0.005)}
            fill={primary}
          />
          <circle
            cx={cx + u * 0.22}
            cy={cy - u * 0.02}
            r={u * (0.19 + subLevel * 0.005)}
            fill={primary}
          />
          {renderEyes(cy - u * 0.02, u * 0.22, u * 0.1, true)}
          <polygon
            points={`${cx - u * 0.12},${cy + u * 0.1} ${cx + u * 0.12},${
              cy + u * 0.1
            } ${cx},${cy + u * 0.27}`}
            fill={isLocked ? accent : '#FFD54F'}
          />
        </g>
      )}

      {tier === 4 && (
        <g>
          {renderPointedEars(0.48 + subLevel * 0.02)}
          {Array.from({ length: 1 + Math.floor(subLevel / 3) }).map((_, s) => {
            const sy = cy - u * 0.02 + s * u * 0.14;
            return (
              <g key={s} fill={primary}>
                <ellipse
                  cx={cx - u * 0.54}
                  cy={sy}
                  rx={u * 0.18}
                  ry={u * 0.07}
                />
                <ellipse
                  cx={cx + u * 0.54}
                  cy={sy}
                  rx={u * 0.18}
                  ry={u * 0.07}
                />
              </g>
            );
          })}
          <polygon
            points={`${cx},${cy - u * 0.45} ${cx + u * 0.56},${
              cy + u * 0.06
            } ${cx},${cy + u * 0.56} ${cx - u * 0.56},${cy + u * 0.06}`}
            fill={secondary}
          />
          {renderEyes(cy + u * 0.02, u * 0.2, u * 0.085, true)}
        </g>
      )}

      {tier === 5 && (
        <g>
          <circle
            cx={cx - u * 0.36}
            cy={cy - u * 0.34}
            r={u * 0.18}
            fill={primary}
          />
          <circle
            cx={cx + u * 0.36}
            cy={cy - u * 0.34}
            r={u * 0.18}
            fill={primary}
          />
          <ellipse
            cx={cx}
            cy={cy + u * 0.04}
            rx={u * 0.52}
            ry={u * 0.42}
            fill={secondary}
          />
          <g
            stroke={primary}
            strokeWidth={Math.max(1.6, u * 0.07)}
            strokeLinecap="round"
          >
            {Array.from({ length: 1 + Math.floor(subLevel / 3) }).map(
              (_, st) => {
                const sy = cy - u * 0.12 + st * u * 0.13;
                return (
                  <g key={st}>
                    <line
                      x1={cx - u * 0.48}
                      y1={sy}
                      x2={cx - u * 0.28}
                      y2={sy}
                    />
                    <line
                      x1={cx + u * 0.28}
                      y1={sy}
                      x2={cx + u * 0.48}
                      y2={sy}
                    />
                  </g>
                );
              }
            )}
          </g>
          <ellipse
            cx={cx - u * 0.19}
            cy={cy + u * (0.35 + subLevel * 0.01)}
            rx={u * 0.05}
            ry={u * (0.07 + subLevel * 0.011)}
            fill={accent}
          />
          <ellipse
            cx={cx + u * 0.19}
            cy={cy + u * (0.35 + subLevel * 0.01)}
            rx={u * 0.05}
            ry={u * (0.07 + subLevel * 0.011)}
            fill={accent}
          />
          {renderEyes(cy + u * 0.02, u * 0.21, u * 0.085, true)}
        </g>
      )}

      {tier === 6 && (
        <g>
          {Array.from({ length: 8 + subLevel }).map((_, r, arr) => {
            const ang = r * ((Math.PI * 2) / arr.length);
            const dist = u * (0.5 + (r % 2 === 0 ? subLevel * 0.015 : 0));
            return (
              <circle
                key={r}
                cx={cx + Math.cos(ang) * dist}
                cy={cy + Math.sin(ang) * dist}
                r={u * 0.19}
                fill={primary}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={u * 0.45} fill={secondary} />
          {renderEyes(cy - u * 0.02, u * 0.19, u * 0.085, true)}
        </g>
      )}

      {tier === 7 && (
        <g>
          {(() => {
            const hornH = u * (0.45 + subLevel * 0.038);
            const tines = 1 + Math.floor(subLevel / 3);
            return (
              <g
                stroke={accent}
                strokeWidth={Math.max(2, u * 0.09)}
                strokeLinecap="round"
              >
                <line
                  x1={cx - u * 0.18}
                  y1={cy - u * 0.22}
                  x2={cx - u * 0.55}
                  y2={cy - u * 0.22 - hornH}
                />
                <line
                  x1={cx + u * 0.18}
                  y1={cy - u * 0.22}
                  x2={cx + u * 0.55}
                  y2={cy - u * 0.22 - hornH}
                />
                {Array.from({ length: tines }).map((_, t) => {
                  const frac = (t + 1) / (tines + 1);
                  const bx = u * (0.18 + 0.37 * frac);
                  const by = cy - u * 0.22 - hornH * frac;
                  return (
                    <g key={t}>
                      <line
                        x1={cx - bx}
                        y1={by}
                        x2={cx - bx + u * 0.18}
                        y2={by - u * 0.22}
                      />
                      <line
                        x1={cx + bx}
                        y1={by}
                        x2={cx + bx - u * 0.18}
                        y2={by - u * 0.22}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })()}
          <ellipse
            cx={cx}
            cy={cy + u * 0.13}
            rx={u * 0.38}
            ry={u * 0.35}
            fill={secondary}
          />
          {renderEyes(cy + u * 0.1, u * 0.18, u * 0.08, true)}
        </g>
      )}

      {tier === 8 && (
        <g>
          {Array.from({ length: 1 + Math.floor(subLevel / 4) }).map(
            (_, wl) => (
              <g key={wl}>
                {renderWings(
                  cy + wl * u * 0.12,
                  u * (1 - wl * 0.12),
                  wl % 2 === 0 ? primary : accent
                )}
              </g>
            )
          )}
          {Array.from({ length: 1 + Math.floor(subLevel / 3) * 2 }).map(
            (_, c, arr) => {
              const off = c - (arr.length - 1) / 2;
              return (
                <ellipse
                  key={c}
                  cx={cx + off * u * 0.13}
                  cy={cy - u * 0.56 + Math.abs(off) * u * 0.08}
                  rx={u * 0.05}
                  ry={u * 0.18}
                  fill={accent}
                />
              );
            }
          )}
          <circle cx={cx} cy={cy + u * 0.06} r={u * 0.4} fill={secondary} />
          {renderEyes(cy + u * 0.02, u * 0.16, u * 0.075, true)}
          <polygon
            points={`${cx - u * 0.11},${cy + u * 0.1} ${cx + u * 0.11},${
              cy + u * 0.1
            } ${cx},${cy + u * 0.25}`}
            fill={accent}
          />
        </g>
      )}

      {tier === 9 && (
        <g>
          {Array.from({ length: Math.floor((subLevel * 2) / 3) }).map(
            (_, s, arr) => {
              const ang =
                -Math.PI / 2 + s * ((Math.PI * 2) / Math.max(1, arr.length));
              return (
                <circle
                  key={s}
                  cx={cx + Math.cos(ang) * u * 0.76}
                  cy={cy + Math.sin(ang) * u * 0.76}
                  r={u * 0.1}
                  fill={accent}
                />
              );
            }
          )}
          <polygon
            points={Array.from({ length: 6 })
              .map((_, i) => {
                const ang = -Math.PI / 2 + i * (Math.PI / 3);
                return `${cx + Math.cos(ang) * u * 0.6},${
                  cy + Math.sin(ang) * u * 0.6
                }`;
              })
              .join(' ')}
            fill={secondary}
          />
          <rect
            x={cx - u * 0.34}
            y={cy - u * 0.12}
            width={u * 0.68}
            height={u * 0.22}
            rx={u * 0.08}
            fill={primary}
          />
          <circle
            cx={cx}
            cy={cy - u * 0.01}
            r={u * (0.09 + subLevel * 0.008)}
            fill={accent}
          />
        </g>
      )}

      {tier === 10 && (
        <g>
          {Array.from({ length: 3 + Math.floor((subLevel * 7) / 9) }).map(
            (_, t, arr) => {
              const tx =
                cx +
                (t - (arr.length - 1) / 2) * u * (1.0 / Math.max(3, arr.length));
              return (
                <line
                  key={t}
                  x1={tx}
                  y1={cy + u * 0.15}
                  x2={tx + (t % 2 === 0 ? -1 : 1) * u * 0.12}
                  y2={cy + u * (0.55 + subLevel * 0.02)}
                  stroke={primary}
                  strokeWidth={Math.max(1.8, u * 0.095)}
                  strokeLinecap="round"
                />
              );
            }
          )}
          <polygon
            points={`${cx},${cy - u * (0.62 + subLevel * 0.015)} ${
              cx + u * 0.52
            },${cy + u * 0.05} ${cx - u * 0.52},${cy + u * 0.05}`}
            fill={secondary}
          />
          <circle cx={cx} cy={cy + u * 0.05} r={u * 0.42} fill={secondary} />
          {renderEyes(cy + u * 0.08, u * 0.22, u * 0.08, false, accent)}
          {subLevel >= 3 && (
            <circle cx={cx} cy={cy - u * 0.12} r={u * 0.09} fill={accent} />
          )}
        </g>
      )}

      {tier === 11 && (
        <g>
          {Array.from({ length: 6 + subLevel }).map((_, i, arr) => {
            const ang = i * ((Math.PI * 2) / arr.length);
            return (
              <circle
                key={i}
                cx={cx + Math.cos(ang) * u * 0.6}
                cy={cy + Math.sin(ang) * u * 0.6}
                r={u * 0.12}
                fill={primary}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={u * 0.52} fill={secondary} />
          <circle cx={cx} cy={cy} r={u * 0.36} fill={primary} />
          {subLevel >= 4 && (
            <circle
              cx={cx}
              cy={cy}
              r={u * 0.26}
              fill="none"
              stroke={accent}
              strokeWidth={1.1}
            />
          )}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - u * (0.24 + subLevel * 0.01)}
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.08)}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + u * 0.22}
            y2={cy + u * 0.1}
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.08)}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={u * 0.09} fill={accent} />
        </g>
      )}

      {tier === 12 && (
        <g>
          {subLevel >= 2 &&
            renderWings(cy, u * (0.85 + subLevel * 0.02), primary)}
          <g
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.09)}
            strokeLinecap="round"
          >
            <line
              x1={cx - u * 0.22}
              y1={cy - u * 0.3}
              x2={cx - u * 0.48}
              y2={cy - u * (0.62 + subLevel * 0.02)}
            />
            <line
              x1={cx + u * 0.22}
              y1={cy - u * 0.3}
              x2={cx + u * 0.48}
              y2={cy - u * (0.62 + subLevel * 0.02)}
            />
            <line
              x1={cx - u * 0.3}
              y1={cy + u * 0.15}
              x2={cx - u * (0.65 + subLevel * 0.02)}
              y2={cy + u * 0.05}
            />
            <line
              x1={cx + u * 0.3}
              y1={cy + u * 0.15}
              x2={cx + u * (0.65 + subLevel * 0.02)}
              y2={cy + u * 0.05}
            />
          </g>
          <circle cx={cx} cy={cy + u * 0.04} r={u * 0.44} fill={secondary} />
          {renderEyes(cy, u * 0.19, u * 0.085, true)}
          {subLevel >= 4 && (
            <circle cx={cx} cy={cy + u * 0.42} r={u * 0.11} fill={accent} />
          )}
        </g>
      )}

      {tier === 13 && (
        <g>
          {(() => {
            const wg = 0.82 + subLevel * 0.025;
            return (
              <>
                <ellipse
                  cx={cx - u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  rx={u * 0.36 * wg}
                  ry={u * 0.29}
                  fill={secondary}
                />
                <ellipse
                  cx={cx + u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  rx={u * 0.36 * wg}
                  ry={u * 0.29}
                  fill={secondary}
                />
                <ellipse
                  cx={cx - u * 0.34 * wg}
                  cy={cy + u * 0.22}
                  rx={u * 0.27 * wg}
                  ry={u * 0.27}
                  fill={primary}
                />
                <ellipse
                  cx={cx + u * 0.34 * wg}
                  cy={cy + u * 0.22}
                  rx={u * 0.27 * wg}
                  ry={u * 0.27}
                  fill={primary}
                />
                <circle
                  cx={cx - u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  r={u * 0.11}
                  fill={accent}
                />
                <circle
                  cx={cx + u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  r={u * 0.11}
                  fill={accent}
                />
                {subLevel >= 4 && (
                  <>
                    <circle
                      cx={cx - u * 0.32 * wg}
                      cy={cy + u * 0.22}
                      r={u * 0.08}
                      fill={accent}
                    />
                    <circle
                      cx={cx + u * 0.32 * wg}
                      cy={cy + u * 0.22}
                      r={u * 0.08}
                      fill={accent}
                    />
                  </>
                )}
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={u * 0.14}
                  ry={u * 0.45}
                  fill={primary}
                />
              </>
            );
          })()}
        </g>
      )}

      {tier === 14 && (
        <g>
          {renderWings(cy, u * (0.9 + subLevel * 0.02), primary)}
          <ellipse
            cx={cx}
            cy={cy}
            rx={u * 0.68}
            ry={u * 0.24}
            fill="none"
            stroke={secondary}
            strokeWidth={Math.max(2, u * 0.1)}
          />
          {subLevel >= 2 && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={u * 0.24}
              ry={u * 0.68}
              fill="none"
              stroke={secondary}
              strokeWidth={Math.max(2, u * 0.1)}
            />
          )}
          {subLevel >= 6 && (
            <circle
              cx={cx}
              cy={cy}
              r={u * 0.56}
              fill="none"
              stroke={secondary}
              strokeWidth={Math.max(1.8, u * 0.08)}
            />
          )}
          <circle cx={cx} cy={cy} r={u * 0.25} fill={accent} />
          <circle cx={cx} cy={cy} r={u * 0.11} fill={eyeColor} />
        </g>
      )}

      {tier === 15 && (
        <g>
          {(() => {
            const heads =
              subLevel < 2 ? 1 : subLevel < 5 ? 2 : subLevel < 8 ? 3 : 5;
            const hr =
              u * (heads <= 2 ? 0.26 : heads === 3 ? 0.23 : 0.19);
            return (
              <>
                <g
                  stroke={primary}
                  strokeWidth={Math.max(2.2, u * 0.12)}
                  strokeLinecap="round"
                >
                  {Array.from({ length: heads }).map((_, h) => {
                    const off =
                      heads === 1
                        ? 0
                        : (h - (heads - 1) / 2) *
                          (1.15 / Math.max(1, heads - 1));
                    const hx = cx + off * u * 0.52;
                    const hy = cy - u * 0.28 + Math.abs(off) * u * 0.26;
                    return (
                      <line
                        key={h}
                        x1={cx}
                        y1={cy + u * 0.55}
                        x2={hx}
                        y2={hy}
                      />
                    );
                  })}
                </g>
                {Array.from({ length: heads }).map((_, h) => {
                  const off =
                    heads === 1
                      ? 0
                      : (h - (heads - 1) / 2) *
                        (1.15 / Math.max(1, heads - 1));
                  const hx = cx + off * u * 0.52;
                  const hy = cy - u * 0.28 + Math.abs(off) * u * 0.26;
                  return (
                    <g key={h}>
                      <circle cx={hx} cy={hy} r={hr} fill={secondary} />
                      <circle cx={hx} cy={hy} r={hr * 0.34} fill={accent} />
                    </g>
                  );
                })}
              </>
            );
          })()}
        </g>
      )}

      {tier === 16 && (
        <g>
          <polygon
            points={`${cx - u * 0.42},${cy + u * 0.05} ${cx + u * 0.42},${
              cy + u * 0.05
            } ${cx},${cy + u * 0.72}`}
            fill={primary}
          />
          {Array.from({ length: Math.floor(subLevel / 2) }).map((_, w) => {
            const side = w % 2 === 0 ? -1 : 1;
            const row = Math.floor(w / 2);
            return (
              <circle
                key={w}
                cx={cx + side * u * (0.58 + row * 0.08)}
                cy={cy - u * 0.05 + row * u * 0.22}
                r={u * 0.085}
                fill={accent}
              />
            );
          })}
          <circle cx={cx} cy={cy - u * 0.12} r={u * 0.36} fill={secondary} />
          <ellipse
            cx={cx}
            cy={cy - u * 0.35}
            rx={u * 0.42}
            ry={u * 0.17}
            fill={primary}
          />
          <circle
            cx={cx}
            cy={cy - u * 0.38}
            r={u * (0.09 + subLevel * 0.005)}
            fill={accent}
          />
          {renderEyes(cy - u * 0.08, u * 0.16, u * 0.07, false, accent)}
        </g>
      )}

      {tier === 17 && (
        <g>
          {renderWings(
            cy - u * 0.1,
            u * (0.82 + subLevel * 0.025),
            accent
          )}
          {subLevel >= 4 && (
            <g
              stroke={primary}
              strokeWidth={Math.max(1.8, u * 0.08)}
              strokeLinecap="round"
            >
              <line
                x1={cx - u * 0.65}
                y1={cy + u * 0.55}
                x2={cx + u * 0.65}
                y2={cy - u * 0.55}
              />
              <line
                x1={cx + u * 0.65}
                y1={cy + u * 0.55}
                x2={cx - u * 0.65}
                y2={cy - u * 0.55}
              />
            </g>
          )}
          <polygon
            points={`${cx},${cy - u * 0.65} ${cx + u * 0.46},${
              cy - u * 0.15
            } ${cx + u * 0.34},${cy + u * 0.52} ${cx},${cy + u * 0.65} ${
              cx - u * 0.34
            },${cy + u * 0.52} ${cx - u * 0.46},${cy - u * 0.15}`}
            fill={secondary}
          />
          <line
            x1={cx - u * 0.26}
            y1={cy - u * 0.05}
            x2={cx + u * 0.26}
            y2={cy - u * 0.05}
            stroke={isLocked ? primary : '#171725'}
            strokeWidth={Math.max(2.5, u * 0.11)}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy - u * 0.05}
            x2={cx}
            y2={cy + u * 0.42}
            stroke={isLocked ? primary : '#171725'}
            strokeWidth={Math.max(2.5, u * 0.11)}
            strokeLinecap="round"
          />
        </g>
      )}

      {tier === 18 && (
        <g>
          <polygon
            points={`${cx},${cy - u * 0.72} ${cx + u * 0.64},${
              cy + u * 0.38
            } ${cx - u * 0.64},${cy + u * 0.38}`}
            fill={secondary}
          />
          {subLevel >= 1 && (
            <polygon
              points={`${cx},${cy + u * 0.72} ${cx + u * 0.64},${
                cy - u * 0.38
              } ${cx - u * 0.64},${cy - u * 0.38}`}
              fill={primary}
              opacity={0.85}
            />
          )}
          {subLevel >= 4 &&
            Array.from({ length: subLevel >= 7 ? 6 : 3 }).map((_, n, arr) => {
              const ang = -Math.PI / 2 + n * ((Math.PI * 2) / arr.length);
              return (
                <circle
                  key={n}
                  cx={cx + Math.cos(ang) * u * 0.72}
                  cy={cy + Math.sin(ang) * u * 0.72}
                  r={u * 0.08}
                  fill={accent}
                />
              );
            })}
          <circle
            cx={cx}
            cy={cy}
            r={u * (0.2 + subLevel * 0.008)}
            fill={accent}
          />
          <circle cx={cx} cy={cy} r={u * 0.1} fill={eyeColor} />
        </g>
      )}

      {tier >= 19 && (
        <g>
          <ellipse
            cx={cx}
            cy={cy}
            rx={u * 0.82}
            ry={u * 0.26}
            fill="none"
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.09)}
          />
          {subLevel >= 3 && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={u * 0.26}
              ry={u * 0.82}
              fill="none"
              stroke={accent}
              strokeWidth={Math.max(2, u * 0.09)}
            />
          )}
          <polygon
            points={`${cx - u * 0.42},${cy - u * 0.35} ${cx - u * 0.32},${
              cy - u * 0.72
            } ${cx - u * 0.12},${cy - u * 0.48} ${cx},${cy - u * 0.82} ${
              cx + u * 0.12
            },${cy - u * 0.48} ${cx + u * 0.32},${cy - u * 0.72} ${
              cx + u * 0.42
            },${cy - u * 0.35}`}
            fill={isLocked ? primary : '#FFD740'}
          />
          <circle cx={cx} cy={cy} r={u * 0.44} fill={secondary} />
          <circle
            cx={cx}
            cy={cy}
            r={u * 0.28}
            fill={isLocked ? primary : '#0B0719'}
          />
          <circle
            cx={cx - u * 0.1}
            cy={cy - u * 0.04}
            r={u * 0.06}
            fill={accent}
          />
          <circle
            cx={cx + u * 0.1}
            cy={cy - u * 0.04}
            r={u * 0.06}
            fill={accent}
          />
        </g>
      )}

      {/* 3b. Sub-Level Forehead Gem / Apex Diadem (Skip spiky crown on Tier 0 since its lotus blossom is the crown) */}
      {tier > 0 && subLevel >= 5 && subLevel < 8 && (
        <circle
          cx={cx}
          cy={cy - u * 0.78}
          r={u * 0.075}
          fill={accent}
          opacity={isLocked ? 0.4 : 0.95}
        />
      )}
      {tier > 0 && subLevel >= 8 && (
        <polygon
          points={`${cx - u * 0.22},${cy - u * 0.72} ${cx - u * 0.16},${
            cy - u * 0.9
          } ${cx - u * 0.06},${cy - u * 0.79} ${cx},${cy - u * 0.96} ${
            cx + u * 0.06
          },${cy - u * 0.79} ${cx + u * 0.16},${cy - u * 0.9} ${
            cx + u * 0.22
          },${cy - u * 0.72}`}
          fill={isLocked ? primary : '#FFD54F'}
        />
      )}

      {/* 4. Solid Tilted Bar Reaching Circle Edges with 90% Opacity & 2/3 Scaled Zigzag */}
      {isLocked && (
        <g transform={`rotate(-26 ${cx} ${cy})`}>
          {/* Drop shadow */}
          <rect
            x={cx - radius * 0.92}
            y={cy - radius * 0.16 + 0.9}
            width={radius * 1.84}
            height={radius * 0.32}
            rx={radius * 0.08}
            fill="#050509"
            opacity={0.6}
          />
          {/* Solid tilted bar body (90% opacity, spanning full inner circle diameter) */}
          <rect
            x={cx - radius * 0.92}
            y={cy - radius * 0.16}
            width={radius * 1.84}
            height={radius * 0.32}
            rx={radius * 0.08}
            fill="#231F36"
            fillOpacity={0.9}
            stroke={realPrimary}
            strokeOpacity={0.65}
            strokeWidth={0.9}
          />
          {/* Zigzag line across the bar (2/3 scaled height & stroke) */}
          <polyline
            points={Array.from({ length: 15 }, (_, i) => {
              const barW = radius * 1.84;
              const barH = radius * 0.32;
              const margin = barW * 0.08;
              const startX = cx - barW / 2 + margin;
              const span = barW - margin * 2;
              const amp = barH * 0.24;
              const zx = startX + span * (i / 14);
              const zy =
                i === 0 || i === 14 ? cy : cy + (i % 2 === 1 ? -amp : amp);
              return `${zx},${zy}`;
            }).join(' ')}
            fill="none"
            stroke={realPrimary}
            strokeOpacity={0.85}
            strokeWidth={0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

function ObjectiveEditorModal({
  objective,
  onCancel,
  onSave,
  onAlert,
}: {
  objective: Objective;
  onCancel: () => void;
  onSave: (input: {
    title: string;
    description: string;
    goalAmount: number;
    unitId: string;
    customUnitLabel: string;
  }) => void;
  onAlert: (title: string, message: string) => void;
}) {
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description);
  const [goalAmountText, setGoalAmountText] = useState(
    String(objective.goalAmount)
  );
  const [unitId, setUnitId] = useState(
    findObjectiveUnit(objective.unitId)?.id || CUSTOM_UNIT_ID
  );
  const [customUnitLabel, setCustomUnitLabel] = useState(
    objective.customUnitLabel
  );

  const isGoalNumeric =
    goalAmountText.trim() === '' ||
    !Number.isNaN(Number(goalAmountText.replace(',', '.')));

  const handleSubmit = () => {
    if (!title.trim() || !unitId) {
      onAlert('Revisa los datos', 'Escribe un nombre y selecciona una unidad.');
      return;
    }
    const parsed = Number(goalAmountText.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      onAlert(
        'Monto no válido',
        'El monto objetivo debe ser un número mayor que cero.'
      );
      return;
    }
    if (unitId === CUSTOM_UNIT_ID && !customUnitLabel.trim()) {
      onAlert(
        'Falta la unidad',
        'Escribe una unidad como kg, libros o pasos.'
      );
      return;
    }
    onSave({
      title,
      description,
      goalAmount: parsed,
      unitId,
      customUnitLabel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#11121C] flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-[24px] font-bold text-[#F4F1FF]">
          Personaliza tu objetivo
        </h2>
        <p className="text-[13px] text-[#A8A3B8]">
          Todo queda junto en un solo formulario.
        </p>

        <div className="space-y-1.5">
          <label className="text-sm text-[#F4F1FF]">Nombre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Viaje a Japón"
            className="w-full h-11 px-3 rounded-[10px] bg-[#1C1C2A] text-[#F4F1FF] border border-[#29283C] focus:outline-none focus:border-[#7549B8]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#F4F1FF]">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿Para qué estás ahorrando o avanzando?"
            className="w-full h-11 px-3 rounded-[10px] bg-[#1C1C2A] text-[#F4F1FF] border border-[#29283C] focus:outline-none focus:border-[#7549B8]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#F4F1FF]">Monto objetivo</label>
          <input
            type="text"
            inputMode="decimal"
            value={goalAmountText}
            onChange={(e) => setGoalAmountText(e.target.value)}
            placeholder="0"
            style={{ color: isGoalNumeric ? '#F4F1FF' : '#FF4500' }}
            className="w-full h-11 px-3 rounded-[10px] bg-[#1C1C2A] border border-[#29283C] focus:outline-none focus:border-[#7549B8]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#F4F1FF]">Unidad</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full h-11 px-3 rounded-[10px] bg-[#1C1C2A] text-[#F4F1FF] border border-[#29283C] focus:outline-none focus:border-[#7549B8]"
          >
            {OBJECTIVE_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>

        {unitId === CUSTOM_UNIT_ID && (
          <div className="space-y-1.5">
            <label className="text-sm text-[#F4F1FF]">
              Unidad personalizada
            </label>
            <input
              type="text"
              value={customUnitLabel}
              onChange={(e) => setCustomUnitLabel(e.target.value)}
              placeholder="kg, libros, pasos…"
              className="w-full h-11 px-3 rounded-[10px] bg-[#1C1C2A] text-[#F4F1FF] border border-[#29283C] focus:outline-none focus:border-[#7549B8]"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-[10px] bg-[#302E42] text-[#F4F1FF] font-medium hover:bg-[#3d3b54] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="h-11 rounded-[10px] bg-[#7549B8] text-white font-bold hover:bg-[#8658cc] transition"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerPickerModal({
  onCancel,
  onApply,
  onAlert,
}: {
  onCancel: () => void;
  onApply: (bannerId: string, offsetX?: number, offsetY?: number) => void;
  onAlert: (title: string, message: string) => void;
}) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
        setPanX(0);
        setPanY(0);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#11111B] flex flex-col p-[18px] overflow-y-auto">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-between gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="w-[42px] h-[42px] rounded-[12px] bg-[#242238] text-white text-[26px] flex items-center justify-center leading-none"
          >
            ‹
          </button>
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-bold text-[#F5F2FA]">
              Fondo del objetivo
            </h2>
            <p className="text-[12px] text-[#AAA5BB]">
              Elige un diseño o una foto propia
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3.5 my-auto">
          <div className="text-[11px] font-bold text-[#AAA5BB]">DISEÑOS</div>
          <div className="grid grid-cols-2 gap-3">
            {BANNER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApply(preset.id, 0, 0)}
                style={{
                  background: `linear-gradient(135deg, ${preset.startColor}, ${preset.endColor})`,
                }}
                className="relative h-[102px] rounded-[16px] border border-[#51436C] overflow-hidden flex items-center justify-center hover:brightness-110 transition"
              >
                {preset.imageUrl && (
                  <img
                    src={preset.imageUrl}
                    alt={preset.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-62 pointer-events-none"
                  />
                )}
                <span className="relative z-10 text-[32px] text-white">
                  {preset.emoji}
                </span>
                <span className="absolute left-3 bottom-2.5 z-10 text-[12px] font-bold text-white">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] font-bold text-[#AAA5BB] pt-2">
            TU FOTO
          </div>

          <div
            onPointerDown={(e) => {
              if (!photoDataUrl) return;
              draggingRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                initialPanX: panX,
                initialPanY: panY,
              };
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current.active || !photoDataUrl) return;
              const dx = (e.clientX - draggingRef.current.startX) / 150;
              const dy = (e.clientY - draggingRef.current.startY) / 150;
              setPanX(
                Math.max(-1, Math.min(1, draggingRef.current.initialPanX + dx))
              );
              setPanY(
                Math.max(-1, Math.min(1, draggingRef.current.initialPanY + dy))
              );
            }}
            onPointerUp={() => {
              draggingRef.current.active = false;
            }}
            onPointerLeave={() => {
              draggingRef.current.active = false;
            }}
            className="relative h-[260px] sm:h-[320px] rounded-[18px] border border-[#51436C] overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
          >
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Vista previa"
                style={{
                  objectPosition: `${50 - panX * 50}% ${50 - panY * 50}%`,
                }}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="text-center text-[13px] text-[#E7E1F0] px-4 whitespace-pre-line">
                {'Selecciona una foto para encuadrarla aquí\narrastra para moverla'}
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#AAA5BB]">
            La imagen se recorta al marco; arrástrala para mostrar la parte que
            quieras.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[48px] rounded-[12px] bg-[#302747] text-[#F5F2FA] text-sm font-medium hover:bg-[#3e335c] transition"
          >
            Elegir foto de la galería…
          </button>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="h-11 rounded-[12px] bg-[#302747] text-white font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!photoDataUrl) {
                onAlert(
                  'Elige una foto',
                  'Selecciona primero una imagen de la galería.'
                );
                return;
              }
              onApply(`custom:${photoDataUrl}`, panX, panY);
            }}
            className="h-11 rounded-[12px] bg-[#604094] text-white font-semibold"
          >
            Aplicar foto
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEntryModal({
  entry,
  onCancel,
  onSave,
  onAlert,
}: {
  entry: ObjectiveEntry;
  onCancel: () => void;
  onSave: (entryId: string, description: string, positiveAmount: number) => void;
  onAlert: (title: string, message: string) => void;
}) {
  const [description, setDescription] = useState(entry.description);
  const [amountText, setAmountText] = useState(String(Math.abs(entry.amount)));

  const handleSave = () => {
    const parsed = Number(amountText.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      onAlert('Importe no válido', 'Escribe un importe mayor que cero.');
      return;
    }
    onSave(entry.id, description, parsed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-5 space-y-4">
        <h3 className="text-lg font-bold text-[#F4F1FF]">Editar entrada</h3>
        <div className="space-y-1.5">
          <label className="text-xs text-[#A8A3B8]">Descripción</label>
          <input
            type="text"
            maxLength={80}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-11 px-3 rounded-[10px] bg-[#151520] text-[#F4F1FF] border border-[#29283C]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#A8A3B8]">
            Importe positivo (se conserva si fue suma/resta)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="w-full h-11 px-3 rounded-[10px] bg-[#151520] text-[#F4F1FF] border border-[#29283C]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="py-2.5 rounded-[10px] bg-[#302E42] text-[#F4F1FF] text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="py-2.5 rounded-[10px] bg-[#7549B8] text-white text-sm font-bold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
