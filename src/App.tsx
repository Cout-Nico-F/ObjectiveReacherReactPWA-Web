import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_IDS,
  BANNER_PRESETS,
  clampSafeAmount,
  CUSTOM_UNIT_ID,
  findAccentTheme,
  findBannerPreset,
  findObjectiveUnit,
  formatObjectiveAmount,
  MAX_SAFE_AMOUNT,
  OBJECTIVE_ACCENT_THEMES,
  OBJECTIVE_ICONS,
  OBJECTIVE_TEMPLATES,
  OBJECTIVE_UNITS,
} from './catalog';
import {
  CARD_COSMETICS,
  CardCosmeticDefinition,
  CARD_STYLE_VAULT,
  CardStyleVaultItem,
  findCardCosmetic,
  findCardStyleVaultItem,
  findGuardianTitle,
  findMascotSkin,
  formatRemainingBuffTime,
  GUARDIAN_TITLES,
  GuardianTitleItem,
  INDIE_SUPPORT_PACKS,
  IndieSupportPack,
  isTimestampActive,
  MASCOT_SKINS,
  MascotSkinDefinition,
  PaymentGatewayChoice,
  SANCTUARY_BUFFS,
  SanctuaryBuffDefinition,
  SOUND_PACKS,
  SoundPackCatalogItem,
  triggerStoreCheckout,
  VAULT_STATS,
  verifyAndRedeemLicenseCode,
} from './monetization';
import {
  ASMR_TEXTURES,
  AsmrTextureOption,
  getAmbientMusicStyleName,
  loadSensoryPreferences,
  playAddEntrySound,
  playAsmrClickSound,
  playCelebrationFanfare,
  playMascotVoice,
  playQuestClaimSound,
  playSoundPackPreview,
  playSubtractEntrySound,
  playUiTap,
  saveSensoryPreferences,
  SensoryPreferences,
  setActiveSoundPack,
  setAmbientMusicContext,
  SOUND_PACK_STEP_LABELS,
  syncAmbientMusic,
} from './soundEffects';
import {
  AchievementCondition,
  AchievementDefinition,
  CelebrationData,
  DashboardState,
  Objective,
  ObjectiveEntry,
} from './types';

const STORAGE_KEY = 'objectivereacher_dashboard_v6';
const LEGACY_STORAGE_KEYS = [
  'objectivereacher_dashboard_v5',
  'objectivereacher_dashboard_v4',
  'objectivereacher_dashboard_v3',
];

function createEmptyState(): DashboardState {
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  return {
    version: 6,
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
        icon: '🎯',
        category: 'Personal',
        accentColor: '#65DB85',
        targetDate: '',
        pledge: '',
        createdAt: nowIso,
        lastUsedAt: nowIso,
      },
    ],
    selectedObjectiveId: id,
    gamification: {
      totalXp: 0,
      bonusXp: 0,
      lastPetDateKey: '',
      claimedQuestsByDay: {},
      gems: 0,
      unlockedSkins: ['default'],
      equippedSkinId: 'default',
      unlockedVaultIds: ['frame_default', 'snd_kalimba_zen', 'title_seed'],
      equippedCardFrameId: 'frame_default',
      equippedSoundPackId: 'snd_kalimba_zen',
      equippedTitleId: 'title_seed',
      streakShields: 0,
      xpBoostUntil: '',
      gemMagnetUntil: '',
      isIndieFounder: false,
      supporterTier: 'none',
      asmrTotalTaps: 0,
      asmrPreferredTexture: 'bubbles',
      redeemedLicenseTxIds: [],
      lastIssuedLicenseCode: '',
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
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as DashboardState;
    if (
      parsed &&
      parsed.version === 6 &&
      Array.isArray(parsed.objectives) &&
      parsed.objectives.length > 0 &&
      parsed.gamification &&
      typeof parsed.gamification.totalXp === 'number'
    ) {
      const baseTimeMs = Date.now() - parsed.objectives.length * 60000;
      parsed.objectives = parsed.objectives.map((obj, idx) => {
        const sanitizedEntries = Array.isArray(obj.entries)
          ? obj.entries.map((e) => ({
              ...e,
              amount: clampSafeAmount(
                e.amount || 0,
                -MAX_SAFE_AMOUNT,
                MAX_SAFE_AMOUNT
              ),
            }))
          : [];
        const latestEntryIso = sanitizedEntries[0]?.createdAt;
        const fallbackIso = new Date(baseTimeMs + idx * 60000).toISOString();
        return {
          ...obj,
          goalAmount: clampSafeAmount(obj.goalAmount || 1, 1, MAX_SAFE_AMOUNT),
          currentAmount: clampSafeAmount(
            obj.currentAmount || 0,
            -MAX_SAFE_AMOUNT,
            MAX_SAFE_AMOUNT * 2
          ),
          entries: sanitizedEntries,
          createdAt: obj.createdAt || fallbackIso,
          lastUsedAt: obj.lastUsedAt || latestEntryIso || obj.createdAt || fallbackIso,
        };
      });
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
      parsed.gamification.gems =
        typeof parsed.gamification.gems === 'number'
          ? parsed.gamification.gems
          : 0;
      parsed.gamification.unlockedSkins = Array.isArray(
        parsed.gamification.unlockedSkins
      )
        ? parsed.gamification.unlockedSkins
        : ['default'];
      parsed.gamification.equippedSkinId =
        parsed.gamification.equippedSkinId || 'default';
      parsed.gamification.unlockedVaultIds = Array.isArray(
        parsed.gamification.unlockedVaultIds
      )
        ? parsed.gamification.unlockedVaultIds
        : ['frame_default', 'snd_kalimba_zen', 'title_seed'];
      parsed.gamification.equippedCardFrameId =
        parsed.gamification.equippedCardFrameId || 'frame_default';
      parsed.gamification.equippedSoundPackId =
        parsed.gamification.equippedSoundPackId || 'snd_kalimba_zen';
      parsed.gamification.equippedTitleId =
        parsed.gamification.equippedTitleId || 'title_seed';
      parsed.gamification.streakShields =
        typeof parsed.gamification.streakShields === 'number'
          ? parsed.gamification.streakShields
          : 0;
      parsed.gamification.xpBoostUntil =
        parsed.gamification.xpBoostUntil || '';
      parsed.gamification.gemMagnetUntil =
        parsed.gamification.gemMagnetUntil || '';
      parsed.gamification.isIndieFounder = Boolean(
        parsed.gamification.isIndieFounder
      );
      parsed.gamification.supporterTier =
        parsed.gamification.supporterTier || 'none';
      parsed.gamification.asmrTotalTaps =
        typeof parsed.gamification.asmrTotalTaps === 'number'
          ? parsed.gamification.asmrTotalTaps
          : 0;
      parsed.gamification.asmrPreferredTexture =
        parsed.gamification.asmrPreferredTexture || 'bubbles';
      parsed.gamification.redeemedLicenseTxIds = Array.isArray(
        parsed.gamification.redeemedLicenseTxIds
      )
        ? parsed.gamification.redeemedLicenseTxIds
        : [];
      parsed.gamification.lastIssuedLicenseCode =
        parsed.gamification.lastIssuedLicenseCode || '';
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

function calculateCurrentStreak(
  objectives: Objective[],
  availableShields = 0
): number {
  const activeDays = new Set<string>();
  for (const obj of objectives) {
    for (const entry of obj.entries) {
      activeDays.add(toLocalDateKey(entry.createdAt));
    }
  }

  if (activeDays.size === 0) return 0;

  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(day.toISOString());

  if (!activeDays.has(todayKey)) {
    day.setDate(day.getDate() - 1);
  }

  let streak = 0;
  let shieldsLeft = Math.max(0, availableShields);

  while (true) {
    const key = toLocalDateKey(day.toISOString());
    if (activeDays.has(key)) {
      streak++;
      day.setDate(day.getDate() - 1);
    } else if (shieldsLeft > 0 && streak > 0) {
      // Check if there was activity the day before this gap so a shield bridges it
      const prevDay = new Date(day);
      prevDay.setDate(prevDay.getDate() - 1);
      if (activeDays.has(toLocalDateKey(prevDay.toISOString()))) {
        shieldsLeft--;
        streak++;
        day.setDate(day.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
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

function useHorizontalScrollProps() {
  const dragStateRef = useRef<{
    el: HTMLDivElement | null;
    startX: number;
    startScrollLeft: number;
    hasDragged: boolean;
  }>({
    el: null,
    startX: 0,
    startScrollLeft: 0,
    hasDragged: false,
  });

  return () => ({
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
      }
    },
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const el = e.currentTarget;
      dragStateRef.current = {
        el,
        startX: e.clientX,
        startScrollLeft: el.scrollLeft,
        hasDragged: false,
      };
    },
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      const st = dragStateRef.current;
      if (!st.el || st.el !== e.currentTarget) return;
      const dx = e.clientX - st.startX;
      if (Math.abs(dx) > 5) {
        st.hasDragged = true;
        st.el.scrollLeft = st.startScrollLeft - dx;
      }
    },
    onMouseUp: () => {
      const st = dragStateRef.current;
      if (!st.el) return;
      st.el = null;
      window.setTimeout(() => {
        dragStateRef.current.hasDragged = false;
      }, 40);
    },
    onMouseLeave: () => {
      const st = dragStateRef.current;
      if (!st.el) return;
      st.el = null;
      window.setTimeout(() => {
        dragStateRef.current.hasDragged = false;
      }, 40);
    },
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragStateRef.current.hasDragged) {
        e.stopPropagation();
        e.preventDefault();
        dragStateRef.current.hasDragged = false;
      }
    },
  });
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
  const [isIndieShopOpen, setIsIndieShopOpen] = useState<boolean>(false);
  const [indieShopInitialTab, setIndieShopInitialTab] = useState<
    'skins' | 'cards_audio' | 'buffs' | 'support'
  >('skins');

  // Interactive Mascot Sanctuary, ASMR Clicker & Daily Ritual
  const [mascotJoyId, setMascotJoyId] = useState<number>(0);
  const [mascotSpeech, setMascotSpeech] = useState<string | null>(null);
  const mascotSpeechTimerRef = useRef<number | null>(null);
  const [isDailyRitualOpen, setIsDailyRitualOpen] = useState<boolean>(false);
  const [isAsmrSanctuaryOpen, setIsAsmrSanctuaryOpen] = useState<boolean>(false);
  const [asmrFloatingSparks, setAsmrFloatingSparks] = useState<
    Array<{ id: number; text: string; color: string; xOffset: number }>
  >([]);
  const [lastAsmrPrizeNotice, setLastAsmrPrizeNotice] = useState<string | null>(
    null
  );
  const asmrTapCooldownCounterRef = useRef<number>(0);
  const [sensoryPrefs, setSensoryPrefs] = useState<SensoryPreferences>(() =>
    loadSensoryPreferences()
  );

  const toggleSoundAndHaptics = () => {
    const nextEnabled = !sensoryPrefs.soundEnabled;
    const nextPrefs: SensoryPreferences = {
      soundEnabled: nextEnabled,
      hapticsEnabled: nextEnabled,
      musicEnabled: nextEnabled ? sensoryPrefs.musicEnabled : false,
    };
    saveSensoryPreferences(nextPrefs);
    setSensoryPrefs(nextPrefs);
    syncAmbientMusic();
    if (nextEnabled) {
      playUiTap(2);
    }
  };

  const toggleAmbientMusic = () => {
    const nextMusic = !sensoryPrefs.musicEnabled;
    const nextPrefs: SensoryPreferences = {
      soundEnabled: nextMusic ? true : sensoryPrefs.soundEnabled,
      hapticsEnabled: nextMusic ? true : sensoryPrefs.hapticsEnabled,
      musicEnabled: nextMusic,
    };
    saveSensoryPreferences(nextPrefs);
    setSensoryPrefs(nextPrefs);
    syncAmbientMusic();
    if (nextMusic) {
      playUiTap(3);
    }
  };

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
  const objectiveTabsScrollRef = useRef<HTMLDivElement>(null);
  const [isObjectiveTabsWrapped, setIsObjectiveTabsWrapped] = useState<boolean>(false);
  const getHorizontalScrollProps = useHorizontalScrollProps();
  const entriesRef = useRef<HTMLDivElement>(null);
  const achievementsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const asmrSanctuaryRef = useRef<HTMLDivElement>(null);
  const asmrSkinsScrollRef = useRef<HTMLDivElement>(null);
  const [asmrFilterCategory, setAsmrFilterCategory] = useState<
    'all' | 'unlocked' | 'taps' | 'skins'
  >('all');

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

  // Smart Objective Tab Ordering:
  // 1st position: Newest created objective (highest createdAt)
  // 1st/2nd position: Last used objective (highest lastUsedAt — 1st if it is the newest, 2nd right after the newest otherwise)
  // Remaining objectives: ordered by lastUsedAt desc, then createdAt desc
  const activeObjectives = useMemo(() => {
    const unarchived = state.objectives.filter((o) => !o.isArchived);
    if (unarchived.length <= 1) return unarchived;

    const getCreatedMs = (o: Objective, idx: number) => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return Number.isNaN(t) || t === 0 ? idx : t;
    };
    const getUsedMs = (o: Objective, idx: number) => {
      const t = o.lastUsedAt ? new Date(o.lastUsedAt).getTime() : 0;
      return Number.isNaN(t) || t === 0 ? getCreatedMs(o, idx) : t;
    };

    const indexed = unarchived.map((obj, idx) => ({
      obj,
      createdMs: getCreatedMs(obj, idx),
      usedMs: getUsedMs(obj, idx),
    }));

    const newestEntry = [...indexed].sort((a, b) => b.createdMs - a.createdMs)[0];
    const lastUsedEntry = [...indexed].sort((a, b) => b.usedMs - a.usedMs)[0];

    const result: Objective[] = [];
    const placedIds = new Set<string>();

    if (newestEntry) {
      result.push(newestEntry.obj);
      placedIds.add(newestEntry.obj.id);
    }

    if (lastUsedEntry && !placedIds.has(lastUsedEntry.obj.id)) {
      result.push(lastUsedEntry.obj);
      placedIds.add(lastUsedEntry.obj.id);
    }

    const remaining = indexed
      .filter((item) => !placedIds.has(item.obj.id))
      .sort((a, b) => b.usedMs - a.usedMs || b.createdMs - a.createdMs);

    for (const item of remaining) {
      result.push(item.obj);
    }

    return result;
  }, [state.objectives]);

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

  useEffect(() => {
    if (isObjectiveTabsWrapped) return;
    const container = objectiveTabsScrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLElement>(
      `[data-objective-tab="${currentObjective.id}"]`
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentObjective.id, isObjectiveTabsWrapped]);

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
    () =>
      calculateCurrentStreak(
        state.objectives,
        state.gamification.streakShields || 0
      ),
    [state.objectives, state.gamification.streakShields]
  );
  const streakText =
    streakDays === 0
      ? '¡Mantén encendida la llama de tu racha! 🔥'
      : streakDays === 1
      ? '1 día consecutivo'
      : `${streakDays} días consecutivos`;

  // Indie Monetization, Cosmetics & Active Buffs derived properties
  const gems = state.gamification.gems ?? 80;
  const unlockedSkins = state.gamification.unlockedSkins || ['default'];
  const equippedSkinId = state.gamification.equippedSkinId || 'default';
  const equippedSkin = useMemo(
    () => findMascotSkin(equippedSkinId),
    [equippedSkinId]
  );
  const unlockedVaultIds = state.gamification.unlockedVaultIds || [
    'frame_default',
    'snd_kalimba_zen',
    'title_seed',
  ];
  const equippedCardFrameId =
    state.gamification.equippedCardFrameId || 'frame_default';
  const equippedCardCosmetic = useMemo(
    () => findCardCosmetic(equippedCardFrameId),
    [equippedCardFrameId]
  );
  const equippedCardStyleId = state.gamification.equippedCardStyleId;
  const equippedSoundPackId =
    state.gamification.equippedSoundPackId || 'snd_kalimba_zen';
  const equippedTitleId = state.gamification.equippedTitleId || 'title_seed';
  const equippedGuardianTitle = useMemo(
    () => findGuardianTitle(equippedTitleId),
    [equippedTitleId]
  );

  // Sync active sound pack and procedural background music with Web Audio synthesizer
  useEffect(() => {
    setActiveSoundPack(equippedSoundPackId);
  }, [equippedSoundPackId]);

  useEffect(() => {
    setAmbientMusicContext(
      currentObjective.accentColor || '#65DB85',
      currentObjective.bannerId || 'gradient'
    );
  }, [
    currentObjective.accentColor,
    currentObjective.bannerId,
    equippedSoundPackId,
    sensoryPrefs.musicEnabled,
    sensoryPrefs.soundEnabled,
  ]);

  // Lock background page scroll whenever a full-screen modal is open so the outer scrollbar never moves dead space
  useEffect(() => {
    const anyModalOpen =
      isIndieShopOpen ||
      isEditorOpen ||
      isBannerPickerOpen ||
      isMascotGalleryOpen ||
      isAllAchievementsOpen ||
      isArchivedModalOpen;
    if (anyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [
    isIndieShopOpen,
    isEditorOpen,
    isBannerPickerOpen,
    isMascotGalleryOpen,
    isAllAchievementsOpen,
    isArchivedModalOpen,
  ]);
  const streakShields = state.gamification.streakShields ?? 1;
  const isIndieFounder = Boolean(state.gamification.isIndieFounder);
  const supporterTier = state.gamification.supporterTier || 'none';
  const isXpBoostActive = isTimestampActive(state.gamification.xpBoostUntil);
  const isGemMagnetActive = isTimestampActive(state.gamification.gemMagnetUntil);
  const xpBoostRemainingText = formatRemainingBuffTime(
    state.gamification.xpBoostUntil
  );
  const gemMagnetRemainingText = formatRemainingBuffTime(
    state.gamification.gemMagnetUntil
  );
  const activeXpMultiplier =
    1 + (isXpBoostActive ? 0.5 : 0) + (isIndieFounder ? 0.2 : 0);
  const activeGemMultiplier = isGemMagnetActive ? 2 : 1;

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
      playMascotVoice(level, true);
      const petXp = Math.round(15 * activeXpMultiplier);
      const petGems = 5 * activeGemMultiplier;
      const prevLevel = level;
      const nextTotalXp = state.gamification.totalXp + petXp;
      const nextLevel = calculateLevelFromXp(nextTotalXp);

      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          totalXp: prev.gamification.totalXp + petXp,
          bonusXp: (prev.gamification.bonusXp || 0) + petXp,
          gems: (prev.gamification.gems ?? 80) + petGems,
          lastPetDateKey: todayDateKey,
        },
      }));

      setXpBurst({
        id: nowId,
        xp: petXp,
        leveledUp: nextLevel > prevLevel,
      });

      triggerMascotSpeech(
        `¡Caricia diaria recibida! +${petXp} XP y +${petGems} 💎 Gemas de vínculo 💖`
      );
    } else {
      playMascotVoice(level, false);
      const randomPhrase =
        contextualPhrases[Math.floor(Math.random() * contextualPhrases.length)];
      triggerMascotSpeech(randomPhrase);
    }
  };

  const handleClaimQuest = (questId: string, rewardXp: number, title: string) => {
    if (claimedToday.includes(questId)) return;
    playQuestClaimSound(false);
    const boostedXp = Math.round(rewardXp * activeXpMultiplier);
    const questGems = 5 * activeGemMultiplier;
    const prevLevel = level;
    const nextTotalXp = state.gamification.totalXp + boostedXp;
    const nextLevel = calculateLevelFromXp(nextTotalXp);

    setState((prev) => {
      const prevClaimed = prev.gamification.claimedQuestsByDay?.[todayDateKey] || [];
      if (prevClaimed.includes(questId)) return prev;
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          totalXp: prev.gamification.totalXp + boostedXp,
          bonusXp: (prev.gamification.bonusXp || 0) + boostedXp,
          gems: (prev.gamification.gems ?? 80) + questGems,
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
      xp: boostedXp,
      leveledUp: nextLevel > prevLevel,
    });
    triggerMascotSpeech(
      `¡Misión "${title}" completada! +${boostedXp} XP y +${questGems} 💎 🎯`
    );
  };

  const handleClaimAllDailyBonus = () => {
    if (!canClaimAllDailyBonus) return;
    playQuestClaimSound(true);
    const bonusXp = Math.round(40 * activeXpMultiplier);
    const chestGems = 15 * activeGemMultiplier;
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
          gems: (prev.gamification.gems ?? 80) + chestGems,
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
      `Completaste las 3 misiones de hoy · +${bonusXp} XP y +${chestGems} 💎 Gemas Astrales`,
      '👑',
      '#FFD54F'
    );
  };

  const openIndieShop = (
    tab: 'skins' | 'cards_audio' | 'buffs' | 'support' = 'skins'
  ) => {
    playUiTap(3);
    setIsNavigationOpen(false);
    setIsHistoryOpen(false);
    setIndieShopInitialTab(tab);
    setIsIndieShopOpen(true);
  };

  const DAILY_ASMR_GEM_CAP = 12;
  const ASMR_CYCLE_TAPS = 50;
  const asmrTotalTaps = state.gamification.asmrTotalTaps ?? 0;
  const asmrPreferredTexture =
    state.gamification.asmrPreferredTexture || 'bubbles';
  const asmrCycleProgress = asmrTotalTaps % ASMR_CYCLE_TAPS;
  const asmrGemsEarnedToday =
    state.gamification.asmrGemsDateKey === todayDateKey
      ? state.gamification.asmrGemsEarnedToday ?? 0
      : 0;
  const asmrRemainingDailyGems = Math.max(
    0,
    DAILY_ASMR_GEM_CAP - asmrGemsEarnedToday
  );
  const activeAsmrTextureObj =
    ASMR_TEXTURES.find((t) => t.id === asmrPreferredTexture) || ASMR_TEXTURES[0];

  const isAsmrStyleUnlocked = (tex: AsmrTextureOption): boolean => {
    if (tex.unlockKind === 'free') return true;
    if (isIndieFounder) return true;
    if (tex.unlockKind === 'taps') {
      return (
        asmrTotalTaps >= tex.requiredTaps ||
        unlockedVaultIds.includes(`asmr_skin_${tex.id}`)
      );
    }
    return unlockedVaultIds.includes(`asmr_skin_${tex.id}`);
  };

  const openAndScrollToAsmrSanctuary = () => {
    playUiTap(3);
    setIsNavigationOpen(false);
    setIsHistoryOpen(false);
    setIsAsmrSanctuaryOpen(true);
    window.setTimeout(() => {
      asmrSanctuaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 90);
  };

  const scrollAsmrCarousel = (direction: 'left' | 'right') => {
    playUiTap(1);
    if (!asmrSkinsScrollRef.current) return;
    const offset = direction === 'left' ? -240 : 240;
    asmrSkinsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleSelectAsmrTexture = (tex: AsmrTextureOption) => {
    const unlocked = isAsmrStyleUnlocked(tex);
    // Always play a binaural preview sample so the user can feel every texture
    playAsmrClickSound(tex.id, asmrTotalTaps, false);

    if (unlocked) {
      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          asmrPreferredTexture: tex.id,
        },
      }));
      triggerMascotSpeech(
        `${tex.emoji} ¡Orbe ASMR «${tex.name}» equipado! Toca el orbe para sentir su textura binaural.`
      );
      return;
    }

    if (tex.unlockKind === 'taps') {
      const remainingTaps = Math.max(1, tex.requiredTaps - asmrTotalTaps);
      triggerMascotSpeech(
        `🔒 «${tex.name}» (${tex.emoji}) se desbloquea GRATIS en ${remainingTaps} toques más (${asmrTotalTaps}/${tex.requiredTaps}). ¡Sigue tocando el Orbe!`
      );
      return;
    }

    // Cosmetic Orb Skin unlockable with Gems (light monetization)
    if (gems < tex.gemCost) {
      playUiTap(0);
      setAlertDialog({
        title: `Skin de Orbe ASMR: ${tex.name}`,
        message: `Escuchaste una muestra de «${tex.name}» (${tex.emoji}). Necesitas ${tex.gemCost} 💎 para desbloquear esta Skin de Orbe ASMR (tienes ${gems} 💎).`,
      });
      return;
    }

    const vaultSkinKey = `asmr_skin_${tex.id}`;
    playCelebrationFanfare('levelUp');
    setState((prev) => {
      const prevVault = prev.gamification.unlockedVaultIds || [];
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - tex.gemCost),
          unlockedVaultIds: prevVault.includes(vaultSkinKey)
            ? prevVault
            : [...prevVault, vaultSkinKey],
          asmrPreferredTexture: tex.id,
        },
      };
    });
    setMascotJoyId(Date.now());
    triggerCelebration(
      `¡Skin ASMR: ${tex.name}!`,
      `Desbloqueaste el orbe y sonido binaural «${tex.name}» ${tex.emoji}`,
      tex.emoji,
      tex.accentColor
    );
  };

  const handleAsmrClick = () => {
    const nextTaps = asmrTotalTaps + 1;
    asmrTapCooldownCounterRef.current += 1;

    const isMilestonePrize = nextTaps % ASMR_CYCLE_TAPS === 0;
    const isLuckyRandomPrize =
      !isMilestonePrize &&
      asmrTapCooldownCounterRef.current >= 30 &&
      Math.random() < 0.025;
    const dropsPrize = isMilestonePrize || isLuckyRandomPrize;

    if (dropsPrize) {
      asmrTapCooldownCounterRef.current = 0;
    }

    // Check if this tap unlocks a new Tap-Milestone ASMR Style (50, 150, 300, 500)
    const newlyUnlockedTapStyle = ASMR_TEXTURES.find(
      (t) => t.unlockKind === 'taps' && t.requiredTaps === nextTaps
    );

    playAsmrClickSound(
      newlyUnlockedTapStyle ? newlyUnlockedTapStyle.id : asmrPreferredTexture,
      nextTaps,
      dropsPrize || Boolean(newlyUnlockedTapStyle)
    );

    const nowId = Date.now() + Math.floor(Math.random() * 999);
    setMascotJoyId(Date.now());

    let awardedGems = 0;
    let awardedXp = 0;
    let prizeText = '';

    if (dropsPrize) {
      const baseRawGems =
        (isMilestonePrize ? 2 : 1) * activeGemMultiplier;
      awardedGems = Math.min(asmrRemainingDailyGems, baseRawGems);
      awardedXp = Math.round(
        (isMilestonePrize ? 10 : 5) * activeXpMultiplier
      );

      if (newlyUnlockedTapStyle) {
        prizeText = `🎉 ¡DESBLOQUEASTE «${newlyUnlockedTapStyle.name}» (${newlyUnlockedTapStyle.emoji}) por alcanzar ${nextTaps} toques! ${
          awardedGems > 0 ? `+${awardedGems} 💎 y ` : ''
        }+${awardedXp} XP`;
      } else if (awardedGems > 0) {
        const nextEarnedToday = asmrGemsEarnedToday + awardedGems;
        prizeText = `🎁 ¡Armonía ASMR! +${awardedGems} 💎 (${nextEarnedToday}/${DAILY_ASMR_GEM_CAP} hoy) y +${awardedXp} XP`;
      } else {
        prizeText = `🧘 ¡Armonía Zen! +${awardedXp} XP de Calma (Tope diario de ${DAILY_ASMR_GEM_CAP} 💎 alcanzado hoy)`;
      }
      setLastAsmrPrizeNotice(prizeText);
      triggerMascotSpeech(prizeText);
    }

    const sparkText = newlyUnlockedTapStyle
      ? `🔓 ¡${newlyUnlockedTapStyle.emoji} ${newlyUnlockedTapStyle.name}!`
      : dropsPrize
      ? awardedGems > 0
        ? `🎁 +${awardedGems} 💎 · +${awardedXp} XP`
        : `🧘 +${awardedXp} XP Zen`
      : `${activeAsmrTextureObj.emoji} +Calma`;
    const sparkColor =
      dropsPrize || newlyUnlockedTapStyle
        ? '#FFD54F'
        : activeAsmrTextureObj.accentColor;
    const xOffset = Math.floor(Math.random() * 90) - 45;

    setAsmrFloatingSparks((prev) => [
      ...prev.slice(-5),
      { id: nowId, text: sparkText, color: sparkColor, xOffset },
    ]);

    setState((prev) => {
      const prevEarnedToday =
        prev.gamification.asmrGemsDateKey === todayDateKey
          ? prev.gamification.asmrGemsEarnedToday ?? 0
          : 0;
      const prevVault = prev.gamification.unlockedVaultIds || [];
      const unlockedKey = newlyUnlockedTapStyle
        ? `asmr_skin_${newlyUnlockedTapStyle.id}`
        : null;
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          asmrTotalTaps: (prev.gamification.asmrTotalTaps ?? 0) + 1,
          asmrPreferredTexture: newlyUnlockedTapStyle
            ? newlyUnlockedTapStyle.id
            : prev.gamification.asmrPreferredTexture || 'bubbles',
          asmrGemsDateKey: todayDateKey,
          asmrGemsEarnedToday: prevEarnedToday + awardedGems,
          gems: (prev.gamification.gems ?? 80) + awardedGems,
          totalXp: prev.gamification.totalXp + awardedXp,
          bonusXp: (prev.gamification.bonusXp || 0) + awardedXp,
          unlockedVaultIds:
            unlockedKey && !prevVault.includes(unlockedKey)
              ? [...prevVault, unlockedKey]
              : prevVault,
        },
      };
    });
  };

  const handleSelectCardCosmetic = (cosmetic: CardCosmeticDefinition) => {
    const isOwned =
      isIndieFounder ||
      cosmetic.gemCost === 0 ||
      unlockedVaultIds.includes(cosmetic.id);

    if (isOwned) {
      playUiTap(4);
      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          equippedCardFrameId: cosmetic.id,
        },
      }));
      triggerMascotSpeech(
        `🖼️ ¡Marco "${cosmetic.name}" aplicado a tu tarjeta principal!`
      );
      return;
    }

    if (gems < cosmetic.gemCost) {
      playUiTap(0);
      setIndieShopInitialTab('support');
      setAlertDialog({
        title: 'Gemas Astrales insuficientes',
        message: `Necesitas ${cosmetic.gemCost} 💎 para desbloquear "${cosmetic.name}" (tienes ${gems} 💎). Puedes ganar más en misiones diarias o apoyar al dev con una propina editable.`,
      });
      return;
    }

    playCelebrationFanfare('levelUp');
    setState((prev) => {
      const prevVault = prev.gamification.unlockedVaultIds || [];
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - cosmetic.gemCost),
          unlockedVaultIds: prevVault.includes(cosmetic.id)
            ? prevVault
            : [...prevVault, cosmetic.id],
          equippedCardFrameId: cosmetic.id,
        },
      };
    });
    triggerCelebration(
      `¡Marco Desbloqueado: ${cosmetic.name}!`,
      `Se aplicó a tu tarjeta principal ${cosmetic.emoji}`,
      cosmetic.emoji,
      cosmetic.borderColor
    );
  };

  const handleSelectSoundPack = (pack: SoundPackCatalogItem) => {
    const isOwned =
      isIndieFounder ||
      pack.gemCost === 0 ||
      unlockedVaultIds.includes(pack.id);

    if (isOwned) {
      setActiveSoundPack(pack.id);
      playSoundPackPreview(pack.id, 1);
      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          equippedSoundPackId: pack.id,
        },
      }));
      triggerMascotSpeech(
        `🎵 ¡Pack de 5 Sonidos "${pack.name}" (${pack.scaleName}) activado!`
      );
      return;
    }

    if (gems < pack.gemCost) {
      playUiTap(0);
      setIndieShopInitialTab('support');
      setAlertDialog({
        title: 'Gemas Astrales insuficientes',
        message: `Necesitas ${pack.gemCost} 💎 para desbloquear el pack de 5 sonidos "${pack.name}" (tienes ${gems} 💎).`,
      });
      return;
    }

    setActiveSoundPack(pack.id);
    playSoundPackPreview(pack.id, 4);
    setState((prev) => {
      const prevVault = prev.gamification.unlockedVaultIds || [];
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - pack.gemCost),
          unlockedVaultIds: prevVault.includes(pack.id)
            ? prevVault
            : [...prevVault, pack.id],
          equippedSoundPackId: pack.id,
        },
      };
    });
    triggerCelebration(
      `¡Pack de 5 Sonidos: ${pack.name}!`,
      `Tus toques, avances, restas, misiones y logros ahora suenan en ${pack.scaleName} ${pack.emoji}`,
      pack.emoji,
      pack.accentColor
    );
  };

  const handleApplyVaultCardStyle = (styleItem: CardStyleVaultItem) => {
    const isOwned =
      isIndieFounder ||
      styleItem.gemCost === 0 ||
      unlockedVaultIds.includes(styleItem.id);

    if (!isOwned && gems < styleItem.gemCost) {
      playUiTap(0);
      setIndieShopInitialTab('support');
      setAlertDialog({
        title: 'Gemas Astrales insuficientes',
        message: `Necesitas ${styleItem.gemCost} 💎 para desbloquear la sintonía "${styleItem.name}" (tienes ${gems} 💎).`,
      });
      return;
    }

    if (isOwned) {
      playQuestClaimSound(false);
    } else {
      playCelebrationFanfare('levelUp');
    }

    setState((prev) => {
      const prevVault = prev.gamification.unlockedVaultIds || [];
      return {
        ...prev,
        objectives: prev.objectives.map((o) =>
          o.id === currentObjective.id
            ? {
                ...o,
                accentColor: styleItem.accentColor,
                bannerId: styleItem.bannerId,
              }
            : o
        ),
        gamification: {
          ...prev.gamification,
          gems: isOwned
            ? prev.gamification.gems ?? 80
            : Math.max(0, (prev.gamification.gems ?? 80) - styleItem.gemCost),
          unlockedVaultIds:
            isOwned || prevVault.includes(styleItem.id)
              ? prevVault
              : [...prevVault, styleItem.id],
          equippedCardStyleId: styleItem.id,
        },
      };
    });

    if (!isOwned) {
      triggerCelebration(
        `¡Estilo Desbloqueado: ${styleItem.name}!`,
        `Se aplicó en sintonía total a tu tarjeta «${currentObjective.title}» ${styleItem.emoji}`,
        styleItem.emoji,
        styleItem.accentColor
      );
    } else {
      triggerMascotSpeech(
        `🌈 ¡Estilo "${styleItem.name}" aplicado en sintonía total a "${currentObjective.title}"!`
      );
    }
  };

  const handleSelectGuardianTitle = (titleItem: GuardianTitleItem) => {
    const isOwned =
      isIndieFounder ||
      titleItem.gemCost === 0 ||
      unlockedVaultIds.includes(titleItem.id);

    if (isOwned) {
      playUiTap(3);
      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          equippedTitleId: titleItem.id,
        },
      }));
      triggerMascotSpeech(
        `🏅 ¡Título equipado: ${titleItem.emoji} ${titleItem.title}!`
      );
      return;
    }

    if (gems < titleItem.gemCost) {
      playUiTap(0);
      setIndieShopInitialTab('support');
      setAlertDialog({
        title: 'Gemas Astrales insuficientes',
        message: `Necesitas ${titleItem.gemCost} 💎 para desbloquear el título "${titleItem.title}" (tienes ${gems} 💎).`,
      });
      return;
    }

    playQuestClaimSound(true);
    setState((prev) => {
      const prevVault = prev.gamification.unlockedVaultIds || [];
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - titleItem.gemCost),
          unlockedVaultIds: prevVault.includes(titleItem.id)
            ? prevVault
            : [...prevVault, titleItem.id],
          equippedTitleId: titleItem.id,
        },
      };
    });
    triggerCelebration(
      `¡Nuevo Título: ${titleItem.title}!`,
      `Ya luce junto a tu nombre en el Santuario ${titleItem.emoji}`,
      titleItem.emoji,
      titleItem.color
    );
  };

  const handleUnlockOrEquipSkin = (skin: MascotSkinDefinition) => {
    const isUnlocked =
      isIndieFounder ||
      skin.gemCost === 0 ||
      unlockedSkins.includes(skin.id);

    if (isUnlocked) {
      playMascotVoice(level, false);
      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          equippedSkinId: skin.id,
        },
      }));
      triggerMascotSpeech(
        `¡Equipaste el aura "${skin.name}" ${skin.emoji}! Tu guardián brilla con nueva energía.`
      );
      return;
    }

    if (gems < skin.gemCost) {
      playUiTap(0);
      setIndieShopInitialTab('support');
      setAlertDialog({
        title: 'Gemas Astrales insuficientes',
        message: `Necesitas ${skin.gemCost} 💎 para desbloquear "${skin.name}" (tienes ${gems} 💎). Puedes ganar más cumpliendo misiones diarias o desbloquear TODAS las skins al instante con el Pase Fundador Indie.`,
      });
      return;
    }

    playCelebrationFanfare('levelUp');
    setState((prev) => {
      const currentUnlocked = prev.gamification.unlockedSkins || ['default'];
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - skin.gemCost),
          unlockedSkins: currentUnlocked.includes(skin.id)
            ? currentUnlocked
            : [...currentUnlocked, skin.id],
          equippedSkinId: skin.id,
        },
      };
    });
    setMascotJoyId(Date.now());
    triggerCelebration(
      `¡Nueva Skin: ${skin.name}!`,
      `Se aplicó a las 200 evoluciones de tu guardián ${skin.emoji}`,
      skin.emoji,
      skin.auraRingColor
    );
  };

  const handleActivateBuff = (buff: SanctuaryBuffDefinition) => {
    const alreadyClaimedFree =
      buff.kind === 'free_blessing' && unlockedVaultIds.includes(buff.id);
    if (alreadyClaimedFree) {
      playUiTap(1);
      triggerMascotSpeech('✓ Ya reclamaste esta bendición gratuita del Santuario.');
      return;
    }

    if (buff.kind === 'free_blessing' && (buff.requiredLevel || 1) > level) {
      playUiTap(0);
      setAlertDialog({
        title: 'Nivel requerido',
        message: `Alcanza el Nivel ${buff.requiredLevel} con tu guardián para reclamar gratis "${buff.name}" (tu nivel actual es Nv. ${level}).`,
      });
      return;
    }

    const alreadyOwnedRelic =
      buff.kind === 'relic' && unlockedVaultIds.includes(buff.id);
    if (alreadyOwnedRelic) {
      playUiTap(2);
      triggerMascotSpeech(
        `${buff.icon} "${buff.name}" ya brilla en tu vitrina de reliquias del Santuario.`
      );
      return;
    }

    if (gems < buff.gemCost) {
      playUiTap(0);
      setIndieShopInitialTab('support');
      setAlertDialog({
        title: 'Gemas Astrales insuficientes',
        message: `Necesitas ${buff.gemCost} 💎 para activar "${buff.name}" (tienes ${gems} 💎). Suma avances, reclama misiones o apoya al dev indie para obtener más gemas.`,
      });
      return;
    }

    const nowMs = Date.now();

    if (buff.kind === 'xp_boost') {
      playQuestClaimSound(true);
      const currentUntilMs = isTimestampActive(state.gamification.xpBoostUntil)
        ? new Date(state.gamification.xpBoostUntil!).getTime()
        : nowMs;
      const nextUntilIso = new Date(
        currentUntilMs + 24 * 60 * 60 * 1000
      ).toISOString();

      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - buff.gemCost),
          xpBoostUntil: nextUntilIso,
        },
      }));
      triggerMascotSpeech('🧪 ¡Elixir ×1.5 XP activado por 24 horas!');
      return;
    }

    if (buff.kind === 'gem_magnet') {
      playQuestClaimSound(true);
      const currentUntilMs = isTimestampActive(state.gamification.gemMagnetUntil)
        ? new Date(state.gamification.gemMagnetUntil!).getTime()
        : nowMs;
      const nextUntilIso = new Date(
        currentUntilMs + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      setState((prev) => ({
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - buff.gemCost),
          gemMagnetUntil: nextUntilIso,
        },
      }));
      triggerMascotSpeech('🧲 ¡Amuleto Cosechador activo! Doble 💎 durante 7 días.');
      return;
    }

    // Handle shield, instant_xp, relic, and free_blessing
    const rawXp = buff.xpAmount || 0;
    const awardedXp =
      rawXp > 0 ? Math.round(rawXp * activeXpMultiplier) : 0;
    const addedShields = buff.shieldsAmount || 0;
    const prevLevel = level;
    const nextTotalXp = state.gamification.totalXp + awardedXp;
    const nextLevel = calculateLevelFromXp(nextTotalXp);

    if (awardedXp > 0) {
      playMascotVoice(level, true);
    } else {
      playQuestClaimSound(false);
    }

    setState((prev) => {
      const prevVault = prev.gamification.unlockedVaultIds || [];
      const shouldRecordId =
        buff.kind === 'free_blessing' || buff.kind === 'relic';
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: Math.max(0, (prev.gamification.gems ?? 80) - buff.gemCost),
          totalXp: prev.gamification.totalXp + awardedXp,
          bonusXp: (prev.gamification.bonusXp || 0) + awardedXp,
          streakShields:
            (prev.gamification.streakShields ?? 1) + addedShields,
          unlockedVaultIds:
            shouldRecordId && !prevVault.includes(buff.id)
              ? [...prevVault, buff.id]
              : prevVault,
        },
      };
    });

    if (awardedXp > 0) {
      setMascotJoyId(nowMs);
      setXpBurst({
        id: nowMs,
        xp: awardedXp,
        leveledUp: nextLevel > prevLevel,
      });
    }

    if (nextLevel > prevLevel) {
      playCelebrationFanfare('levelUp');
      triggerCelebration(
        `¡Subiste al Nivel ${nextLevel}!`,
        `${buff.name} otorgó +${awardedXp} XP${
          addedShields > 0 ? ` y +${addedShields} 🛡️` : ''
        }`,
        buff.icon,
        buff.accentColor
      );
    } else {
      triggerMascotSpeech(
        `${buff.icon} ¡${buff.name} activado!${
          awardedXp > 0 ? ` +${awardedXp} XP` : ''
        }${addedShields > 0 ? ` +${addedShields} 🛡️ Escudo` : ''}`
      );
    }
  };

  const handlePurchaseSupportPack = async (
    pack: IndieSupportPack,
    gateway: PaymentGatewayChoice = 'mercadopago'
  ) => {
    playUiTap(3);
    const result = await triggerStoreCheckout({
      id: pack.id,
      title: pack.title,
      usdPrice: pack.usdPrice,
      usdNumeric: pack.usdNumeric,
      googlePlaySku: pack.googlePlaySku,
      preferredGateway: gateway,
    });
    if (!result.success) return;

    playCelebrationFanfare('goal');
    const allSkinIds = MASCOT_SKINS.map((s) => s.id);
    const allVaultIds = [
      ...CARD_COSMETICS.map((c) => c.id),
      ...SOUND_PACKS.map((s) => s.id),
      ...CARD_STYLE_VAULT.map((st) => st.id),
      ...GUARDIAN_TITLES.map((t) => t.id),
    ];

    setState((prev) => {
      const prevUnlocked = prev.gamification.unlockedSkins || ['default'];
      const prevVault = prev.gamification.unlockedVaultIds || [];
      const prevTxIds = prev.gamification.redeemedLicenseTxIds || [];
      const nextUnlocked = pack.unlocksAllSkins
        ? Array.from(new Set([...prevUnlocked, ...allSkinIds]))
        : prevUnlocked;
      const nextVault = pack.unlocksAllSkins
        ? Array.from(new Set([...prevVault, ...allVaultIds]))
        : prevVault;
      const nextTier =
        pack.id === 'pack_founder' || prev.gamification.isIndieFounder
          ? 'founder'
          : 'coffee';

      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: (prev.gamification.gems ?? 80) + pack.gemsIncluded,
          streakShields:
            (prev.gamification.streakShields ?? 1) + pack.shieldsIncluded,
          unlockedSkins: nextUnlocked,
          unlockedVaultIds: nextVault,
          equippedSkinId:
            pack.id === 'pack_founder'
              ? 'skin_prismatic_founder'
              : prev.gamification.equippedSkinId || 'default',
          equippedTitleId:
            pack.id === 'pack_founder'
              ? 'title_founder'
              : prev.gamification.equippedTitleId || 'title_seed',
          isIndieFounder:
            Boolean(prev.gamification.isIndieFounder) ||
            pack.id === 'pack_founder',
          supporterTier: nextTier,
          redeemedLicenseTxIds: result.receiptId
            ? Array.from(new Set([...prevTxIds, result.receiptId]))
            : prevTxIds,
          lastIssuedLicenseCode:
            result.licenseCode || prev.gamification.lastIssuedLicenseCode || '',
        },
      };
    });

    const gatewayLabel =
      result.gateway === 'mercadopago'
        ? 'Mercado Pago (LatAm)'
        : result.gateway === 'paypal_googlepay'
        ? 'PayPal / Google Pay'
        : 'Google Play Billing';

    setMascotJoyId(Date.now());
    triggerCelebration(
      pack.id === 'pack_founder'
        ? '¡Gracias, Fundador Indie! 👑'
        : `¡Gracias por apoyar (${gatewayLabel})! ${pack.emoji}`,
      `Recibiste +${pack.gemsIncluded} 💎 Gemas, +${pack.shieldsIncluded} 🛡️ Escudos${
        pack.unlocksAllSkins
          ? ', TODOS los cosméticos del Banco y +20% XP permanente'
          : ''
      }.${
        result.licenseCode
          ? ' Tu Código PRO de respaldo quedó guardado en la pestaña Apoyar al Dev.'
          : ''
      }`,
      pack.emoji,
      pack.highlightColor,
      true
    );
  };

  const handleCustomTipSupport = async (
    usdAmount: number,
    gateway: PaymentGatewayChoice = 'mercadopago'
  ) => {
    const cleanUsd = Math.max(0.5, Math.min(500, Number(usdAmount.toFixed(2))));
    playUiTap(4);
    const result = await triggerStoreCheckout({
      id: 'custom_tip',
      title: `Propina Indie Libre ($${cleanUsd.toFixed(2)} USD)`,
      usdPrice: `$${cleanUsd.toFixed(2)} USD`,
      usdNumeric: cleanUsd,
      googlePlaySku: 'or_custom_indie_tip',
      preferredGateway: gateway,
    });
    if (!result.success) return;

    playCelebrationFanfare('goal');
    const rewardedGems = Math.round(cleanUsd * 140);
    const rewardedShields = Math.max(1, Math.floor(cleanUsd / 1.5));
    const unlocksFounder = cleanUsd >= 4.99;
    const allSkinIds = MASCOT_SKINS.map((s) => s.id);
    const allVaultIds = [
      ...CARD_COSMETICS.map((c) => c.id),
      ...SOUND_PACKS.map((s) => s.id),
      ...CARD_STYLE_VAULT.map((st) => st.id),
      ...GUARDIAN_TITLES.map((t) => t.id),
    ];

    setState((prev) => {
      const prevUnlocked = prev.gamification.unlockedSkins || ['default'];
      const prevVault = prev.gamification.unlockedVaultIds || [];
      const prevTxIds = prev.gamification.redeemedLicenseTxIds || [];
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: (prev.gamification.gems ?? 80) + rewardedGems,
          streakShields:
            (prev.gamification.streakShields ?? 1) + rewardedShields,
          unlockedSkins: unlocksFounder
            ? Array.from(new Set([...prevUnlocked, ...allSkinIds]))
            : prevUnlocked,
          unlockedVaultIds: unlocksFounder
            ? Array.from(new Set([...prevVault, ...allVaultIds]))
            : prevVault,
          isIndieFounder:
            Boolean(prev.gamification.isIndieFounder) || unlocksFounder,
          supporterTier:
            unlocksFounder || prev.gamification.isIndieFounder
              ? 'founder'
              : 'coffee',
          redeemedLicenseTxIds: result.receiptId
            ? Array.from(new Set([...prevTxIds, result.receiptId]))
            : prevTxIds,
          lastIssuedLicenseCode:
            result.licenseCode || prev.gamification.lastIssuedLicenseCode || '',
        },
      };
    });

    const gatewayLabel =
      result.gateway === 'mercadopago'
        ? 'Mercado Pago'
        : result.gateway === 'paypal_googlepay'
        ? 'PayPal / Google Pay'
        : 'Google Play';

    setMascotJoyId(Date.now());
    triggerCelebration(
      unlocksFounder
        ? `¡Propina de Fundador ($${cleanUsd.toFixed(2)} USD · ${gatewayLabel})! 👑`
        : `¡Gracias por tu Propina ($${cleanUsd.toFixed(2)} USD · ${gatewayLabel})! 💖`,
      `Como agradecimiento recibiste +${rewardedGems} 💎 Gemas Astrales y +${rewardedShields} 🛡️ Escudos${
        unlocksFounder
          ? ' + Desbloqueo Total del Pase Fundador Indie'
          : ''
      }.${
        result.licenseCode
          ? ' Tu Código PRO de respaldo fue generado y guardado.'
          : ''
      }`,
      unlocksFounder ? '👑' : '💖',
      unlocksFounder ? '#FFD54F' : '#82E59B',
      true
    );
  };

  const handleRedeemLicenseCode = async (rawCode: string): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const clean = rawCode.trim();
    if (!clean) {
      return { ok: false, message: 'Ingresa un código OR-PRO- válido.' };
    }
    const res = await verifyAndRedeemLicenseCode(clean);
    if (!res.valid || !res.payload) {
      playUiTap(0);
      return {
        ok: false,
        message: res.reason || 'El código ingresado no es válido.',
      };
    }

    const { txId, gems: codeGems, shields: codeShields, unlocksFounder } =
      res.payload;
    const alreadyRedeemed = (
      state.gamification.redeemedLicenseTxIds || []
    ).includes(txId);

    if (alreadyRedeemed && !unlocksFounder) {
      playUiTap(0);
      return {
        ok: false,
        message: `Este código (${txId}) ya fue acreditado en este dispositivo.`,
      };
    }

    playCelebrationFanfare('goal');
    const allSkinIds = MASCOT_SKINS.map((s) => s.id);
    const allVaultIds = [
      ...CARD_COSMETICS.map((c) => c.id),
      ...SOUND_PACKS.map((s) => s.id),
      ...CARD_STYLE_VAULT.map((st) => st.id),
      ...GUARDIAN_TITLES.map((t) => t.id),
    ];

    setState((prev) => {
      const prevUnlocked = prev.gamification.unlockedSkins || ['default'];
      const prevVault = prev.gamification.unlockedVaultIds || [];
      const prevTxIds = prev.gamification.redeemedLicenseTxIds || [];
      const isAlreadyInState = prevTxIds.includes(txId);

      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: isAlreadyInState
            ? prev.gamification.gems ?? 0
            : (prev.gamification.gems ?? 0) + codeGems,
          streakShields: isAlreadyInState
            ? prev.gamification.streakShields ?? 0
            : (prev.gamification.streakShields ?? 0) + codeShields,
          unlockedSkins: unlocksFounder
            ? Array.from(new Set([...prevUnlocked, ...allSkinIds]))
            : prevUnlocked,
          unlockedVaultIds: unlocksFounder
            ? Array.from(new Set([...prevVault, ...allVaultIds]))
            : prevVault,
          isIndieFounder:
            Boolean(prev.gamification.isIndieFounder) || unlocksFounder,
          supporterTier:
            unlocksFounder || prev.gamification.isIndieFounder
              ? 'founder'
              : 'coffee',
          redeemedLicenseTxIds: Array.from(new Set([...prevTxIds, txId])),
          lastIssuedLicenseCode: clean,
        },
      };
    });

    setMascotJoyId(Date.now());
    triggerCelebration(
      unlocksFounder
        ? '¡Pase Fundador Restaurado! 👑'
        : '¡Código PRO Canjeado con Éxito! 🔑',
      `Se acreditaron +${codeGems} 💎 Gemas, +${codeShields} 🛡️ Escudos${
        unlocksFounder ? ' y TODOS los cosméticos de Fundador' : ''
      } (Recibo ${txId}).`,
      '🔑',
      '#FFD54F',
      true
    );

    return {
      ok: true,
      message: `¡Código verificado! +${codeGems} 💎 y +${codeShields} 🛡️ acreditados.`,
    };
  };

  // Detectar retorno automático desde pasarela externa (Mercado Pago / PayPal / Google Pay)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment_status');
    const packId = params.get('pack');
    const gatewayParam = (params.get('gateway') ||
      'mercadopago') as PaymentGatewayChoice;
    const usdParam = Number(params.get('usd') || '1.99');

    if (status === 'approved' && packId) {
      // Limpiar la URL inmediatamente para evitar doble acreditación al recargar
      window.history.replaceState({}, '', window.location.pathname);

      fetch('/api/payments/issue-receipt-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId,
          customUsdAmount: usdParam,
          gateway: gatewayParam,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.licenseCode) {
            handleRedeemLicenseCode(data.licenseCode);
          }
        })
        .catch(() => {
          // Si falla la red al volver, igual abrimos la tienda en soporte
        });
    }
  }, []);

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
    const rawEstimatedXp = calculateSingleEntryXp(
      effectiveAmount,
      currentObjective.goalAmount,
      !hadEntryToday,
      previewStreak
    );
    const estimatedXp = Math.round(rawEstimatedXp * activeXpMultiplier);
    const projectedTotalXp = totalXp + estimatedXp;
    const willLevelUp = projectedTotalXp >= xpAtNextLevel;
    const projectedProgress = Math.min(
      1,
      Math.max(0, (projectedTotalXp - xpAtLevelStart) / xpForCurrentLevel)
    );
    const bonusTag =
      activeXpMultiplier > 1
        ? `buff ×${activeXpMultiplier.toFixed(1)} XP`
        : !hadEntryToday
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
    const idx = quickPresetAmounts.indexOf(amount);
    playUiTap(idx >= 0 ? idx : 1);
    setSelectedQuickAmount(amount);
    setSelectedAmount(amount);
    setCustomAmountText('');
  };

  const handleCustomAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.,]/g, '');
    const parsed = Number(cleaned.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed > MAX_SAFE_AMOUNT) {
      setCustomAmountText(String(MAX_SAFE_AMOUNT));
      setSelectedQuickAmount(null);
      setSelectedAmount(MAX_SAFE_AMOUNT);
      setPersistenceMessage(
        `El monto máximo por movimiento es ${MAX_SAFE_AMOUNT.toLocaleString(
          'es-ES'
        )} para cuidar el diseño responsive.`
      );
      return;
    }
    setCustomAmountText(cleaned);
    setSelectedQuickAmount(null);
    setPersistenceMessage('');
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

    const safeSelected = clampSafeAmount(selectedAmount, 0, MAX_SAFE_AMOUNT);
    if (safeSelected <= 0) {
      setPersistenceMessage('Escribe un importe válido mayor que cero.');
      return;
    }

    const amount = isAddition
      ? safeSelected
      : -Math.min(safeSelected, Math.max(0, currentObjective.currentAmount));

    if (amount === 0) {
      setPersistenceMessage('No hay saldo disponible para registrar una resta.');
      return;
    }

    if (
      isAddition &&
      currentObjective.currentAmount + amount > MAX_SAFE_AMOUNT * 2
    ) {
      setPersistenceMessage(
        `Has alcanzado el límite seguro de saldo acumulado (${(
          MAX_SAFE_AMOUNT * 2
        ).toLocaleString('es-ES')}).`
      );
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
            currentAmount: clampSafeAmount(
              o.currentAmount + amount,
              0,
              MAX_SAFE_AMOUNT * 2
            ),
            lastUsedAt: nowIso,
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
    const nextStreak = calculateCurrentStreak(
      nextObjectives,
      state.gamification.streakShields || 0
    );
    const baseEntryXp = calculateSingleEntryXp(
      amount,
      updatedObj.goalAmount,
      !hadEntryToday,
      nextStreak
    );
    const entryXp = Math.round(baseEntryXp * activeXpMultiplier);
    const boostBonusXp = Math.max(0, entryXp - baseEntryXp);
    const nextGamification = {
      ...state.gamification,
      totalXp: state.gamification.totalXp + entryXp,
      bonusXp: (state.gamification.bonusXp || 0) + boostBonusXp,
    };
    const newlyUnlocked = evaluateObjectiveAchievements(
      updatedObj,
      nextObjectives,
      nextGamification
    );

    const totalGainedXp = Math.max(entryXp, nextGamification.totalXp - previousXp);
    const nextLevel = calculateLevelFromXp(nextGamification.totalXp);
    const levelsGained = Math.max(0, nextLevel - previousLevel);
    const earnedGems =
      ((!hadEntryToday ? 4 : 2) +
        newlyUnlocked.length * 15 +
        levelsGained * 15) *
      activeGemMultiplier;
    nextGamification.gems = (state.gamification.gems ?? 80) + earnedGems;
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
      playCelebrationFanfare('goal');
      triggerCelebration(
        '¡Objetivo completado!',
        `¡Lo lograste! +${totalGainedXp} XP · ${nextExperienceText}`,
        '🏆',
        '#E5B945',
        true
      );
    } else if (nextTier > previousTier) {
      playCelebrationFanfare('species');
      triggerCelebration(
        '¡Nueva especie desbloqueada!',
        `Nivel ${nextLevel} · +${totalGainedXp} XP · ${nextMascotMessage}`,
        nextMascotEmoji,
        '#FFD54F',
        true
      );
    } else if (nextLevel > previousLevel) {
      playCelebrationFanfare('levelUp');
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
      playCelebrationFanfare('levelUp');
      triggerCelebration(
        '¡Nuevo logro!',
        `${newlyUnlocked.join(' · ')} (+${totalGainedXp} XP)`,
        '🏅',
        '#B58BFF'
      );
    } else {
      if (amount > 0) {
        playAddEntrySound();
      } else {
        playSubtractEntrySound();
      }
      triggerCelebration(
        amount > 0 ? '¡Gran impulso!' : 'Registro actualizado',
        `+${totalGainedXp} XP · ${nextExperienceText}`,
        amount > 0 ? '✨' : '📝',
        '#65DB85'
      );
    }
  };

  const handleSelectObjective = (id: string) => {
    playUiTap(1);
    const nowIso = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      selectedObjectiveId: id,
      objectives: prev.objectives.map((o) =>
        o.id === id ? { ...o, lastUsedAt: nowIso } : o
      ),
    }));
    setHistoryFilter('all');
    setActiveNav('objective');
    setHighlightedSection('objective');
    window.setTimeout(() => {
      setHighlightedSection((prev) => (prev === 'objective' ? null : prev));
    }, 1000);
  };

  const handleStartNewObjective = () => {
    const newId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const newObj: Objective = {
      id: newId,
      title: `Objetivo ${state.objectives.length + 1}`,
      description: '',
      goalAmount: 1000,
      currentAmount: 0,
      unitId: CUSTOM_UNIT_ID,
      customUnitLabel: '$',
      bannerId: 'gradient',
      bannerOffsetX: 0,
      bannerOffsetY: 0,
      isArchived: false,
      entries: [],
      unlockedAchievementIds: [],
      icon: '🎯',
      category: 'Personal',
      accentColor: '#65DB85',
      targetDate: '',
      pledge: '',
      createdAt: nowIso,
      lastUsedAt: nowIso,
    };
    setPreviousObjectiveId(currentObjective.id);
    setIsDraftObjective(true);
    setHistoryFilter('all');
    setState((prev) => ({
      ...prev,
      objectives: [newObj, ...prev.objectives],
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

  const handleSaveObjectiveEditor = (
    input: {
      title: string;
      description: string;
      goalAmount: number;
      unitId: string;
      customUnitLabel: string;
      icon: string;
      category: string;
      accentColor: string;
      bannerId: string;
      targetDate: string;
      pledge: string;
    },
    saveMode: 'update_keep' | 'create_new' | 'overwrite_reset' = 'update_keep'
  ) => {
    const wasDraft = isDraftObjective;
    const nowIso = new Date().toISOString();
    const safeGoalAmount = clampSafeAmount(input.goalAmount, 1, MAX_SAFE_AMOUNT);

    if (!wasDraft && saveMode === 'create_new') {
      const newId = crypto.randomUUID();
      const newObj: Objective = {
        id: newId,
        title: input.title.trim(),
        description: input.description.trim(),
        goalAmount: safeGoalAmount,
        currentAmount: 0,
        unitId: input.unitId,
        customUnitLabel:
          input.unitId === CUSTOM_UNIT_ID ? input.customUnitLabel.trim() : '',
        bannerId: input.bannerId || 'gradient',
        bannerOffsetX: 0,
        bannerOffsetY: 0,
        isArchived: false,
        entries: [],
        unlockedAchievementIds: [],
        icon: input.icon || '🎯',
        category: input.category.trim() || 'Personal',
        accentColor: input.accentColor || '#65DB85',
        targetDate: input.targetDate || '',
        pledge: input.pledge.trim(),
        createdAt: nowIso,
        lastUsedAt: nowIso,
      };

      setState((prev) => ({
        ...prev,
        objectives: [newObj, ...prev.objectives],
        selectedObjectiveId: newId,
      }));
      setHistoryFilter('all');
      setIsDraftObjective(false);
      setPreviousObjectiveId(null);
      setIsEditorOpen(false);
      playCelebrationFanfare('levelUp');
      triggerCelebration(
        '¡Nuevo Objetivo Creado!',
        `Conservamos "${currentObjective.title}" intacto y creamos "${newObj.title}" listo para empezar`,
        newObj.icon || '🚀',
        newObj.accentColor || '#65DB85'
      );
      return;
    }

    setState((prev) => {
      const nextObjectives = prev.objectives.map((o) =>
        o.id === currentObjective.id
          ? {
              ...o,
              title: input.title.trim(),
              description: input.description.trim(),
              goalAmount: safeGoalAmount,
              currentAmount:
                saveMode === 'overwrite_reset' ? 0 : o.currentAmount,
              entries: saveMode === 'overwrite_reset' ? [] : [...o.entries],
              unitId: input.unitId,
              customUnitLabel:
                input.unitId === CUSTOM_UNIT_ID ? input.customUnitLabel.trim() : '',
              icon: input.icon || '🎯',
              category: input.category.trim() || 'Personal',
              accentColor: input.accentColor || '#65DB85',
              bannerId: input.bannerId || o.bannerId || 'gradient',
              targetDate: input.targetDate || '',
              pledge: input.pledge.trim(),
              createdAt: wasDraft ? nowIso : o.createdAt || nowIso,
              lastUsedAt: nowIso,
              unlockedAchievementIds:
                saveMode === 'overwrite_reset'
                  ? []
                  : [...o.unlockedAchievementIds],
            }
          : o
      );
      const updatedObj = nextObjectives.find((o) => o.id === currentObjective.id)!;
      const nextGamification = {
        ...prev.gamification,
        totalXp:
          saveMode === 'overwrite_reset'
            ? recalculateAllXp(nextObjectives, prev.gamification.bonusXp || 0)
            : prev.gamification.totalXp,
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
    if (wasDraft || saveMode === 'overwrite_reset') {
      triggerCelebration(
        wasDraft ? '¡Objetivo Creado!' : '¡Tarjeta Reiniciada a 0!',
        `${input.icon || '🎯'} ${input.title.trim()} está listo para tu primer impulso`,
        input.icon || '🚀',
        input.accentColor || '#65DB85'
      );
    }
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
    const safePositive = clampSafeAmount(positiveAmount, 0.01, MAX_SAFE_AMOUNT);
    setState((prev) => {
      const entry = currentObjective.entries.find((e) => e.id === entryId);
      if (!entry) return prev;

      const sign = entry.amount < 0 ? -1 : 1;
      const updatedAmount = safePositive * sign;
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

  // Hero background & customization style
  const heroPreset = useMemo(
    () => findBannerPreset(currentObjective.bannerId),
    [currentObjective.bannerId]
  );
  const customBannerDataUrl = currentObjective.bannerId.startsWith('custom:')
    ? currentObjective.bannerId.slice('custom:'.length)
    : null;
  const bannerImageSrc = customBannerDataUrl || heroPreset.imageUrl;

  const currentAccentTheme = useMemo(() => {
    return findAccentTheme(currentObjective.accentColor);
  }, [currentObjective.accentColor]);

  const currentIcon = currentObjective.icon || '🎯';
  const currentCategory = currentObjective.category || 'Objetivo';

  // Projected objective progress when user selects an amount
  const projectedObjectiveProgress = useMemo(() => {
    if (!hasValidSelectedAmount || currentObjective.goalAmount <= 0)
      return progress;
    const delta = isAddition ? selectedAmount : -selectedAmount;
    return Math.min(
      1,
      Math.max(0, (currentObjective.currentAmount + delta) / currentObjective.goalAmount)
    );
  }, [
    hasValidSelectedAmount,
    isAddition,
    selectedAmount,
    currentObjective.currentAmount,
    currentObjective.goalAmount,
    progress,
  ]);

  // Smart Pace & Deadline Metrics
  const objectiveInsights = useMemo(() => {
    const remaining = Math.max(
      0,
      currentObjective.goalAmount - currentObjective.currentAmount
    );
    const positiveEntries = currentObjective.entries.filter((e) => e.amount > 0);
    const bestEntry = positiveEntries.reduce(
      (max, e) => Math.max(max, e.amount),
      0
    );

    let daysLeft: number | null = null;
    let dailyPaceNeeded: number | null = null;

    if (currentObjective.targetDate) {
      const [y, m, d] = currentObjective.targetDate.split('-').map(Number);
      if (y && m && d) {
        const target = new Date(y, m - 1, d, 23, 59, 59);
        const now = new Date();
        const diffDays = Math.ceil(
          (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        daysLeft = diffDays;
        if (diffDays > 0 && remaining > 0) {
          dailyPaceNeeded = remaining / diffDays;
        }
      }
    }

    const nextMilestonePct =
      progress < 0.25
        ? 25
        : progress < 0.5
        ? 50
        : progress < 0.75
        ? 75
        : progress < 1
        ? 100
        : null;
    const amountToNextMilestone =
      nextMilestonePct !== null
        ? Math.max(
            0,
            currentObjective.goalAmount * (nextMilestonePct / 100) -
              currentObjective.currentAmount
          )
        : 0;

    return {
      remaining,
      bestEntry,
      daysLeft,
      dailyPaceNeeded,
      nextMilestonePct,
      amountToNextMilestone,
    };
  }, [currentObjective, progress]);

  // Smart quick amounts adapted to the objective's scale so small goals (e.g. 30 sessions) and large goals both feel natural
  const quickPresetAmounts = useMemo(() => {
    const g = currentObjective.goalAmount;
    if (g > 0 && g <= 100) return [1, 2, 5, 10];
    if (g > 100 && g <= 1000) return [10, 25, 50, 100];
    return [50, 100, 500, 1000];
  }, [currentObjective.goalAmount]);

  useEffect(() => {
    if (customAmountText === '' && !quickPresetAmounts.includes(selectedAmount)) {
      const fallback = quickPresetAmounts[0];
      setSelectedQuickAmount(fallback);
      setSelectedAmount(fallback);
    }
  }, [currentObjective.id, quickPresetAmounts, customAmountText, selectedAmount]);

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
      {/* Celebration Overlay (z-[70] so it always shines above modals & shop) */}
      {celebration && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-auto bg-black/45 backdrop-blur-[3px] p-4">
          <div className="w-full max-w-[300px] rounded-[24px] border-2 border-[#806F62] bg-[#1C1C2B]/95 px-5 py-5 shadow-2xl flex flex-col items-center text-center space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-2.5 py-0.5 rounded-full bg-[#29233E] border border-[#5B4588]/60 text-[9px] font-extrabold tracking-widest uppercase text-[#C7A4FF] inline-flex items-center gap-1">
              <span className="leading-none">🎯</span>
              <span>OBJECTIVE REACHER</span>
            </div>
            <div className="text-[54px] leading-none">{celebration.emoji}</div>
            <div
              className="text-[20px] sm:text-[22px] font-bold leading-snug break-words"
              style={{ color: celebration.color }}
            >
              {celebration.title}
            </div>
            <div className="text-[13px] text-[#E6E0F2] leading-relaxed break-words">
              {celebration.message}
            </div>
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
          className={`fixed inset-y-0 left-0 z-40 w-[268px] max-w-[82vw] lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:max-w-none bg-[#171723] border-r border-[#29283C] pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pl-[max(0.875rem,calc(env(safe-area-inset-left,0px)+0.5rem))] pr-3.5 sm:p-4 flex flex-col justify-between overflow-y-auto overscroll-contain transition-transform duration-200 ${
            isNavigationOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="space-y-3 sm:space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Objective Reacher"
                  className="w-10 h-10 rounded-[13px] object-cover border border-[#B58BFF]/50 shadow-[0_0_16px_rgba(140,92,224,0.35)] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[16px] sm:text-[17px] font-extrabold tracking-tight leading-tight">
                    <span className="text-[#F4F1FF]">Objective</span>{' '}
                    <span className="text-[#82E59B]">Reacher</span>
                  </div>
                  <div className="text-[11px] text-[#AAA5BB] leading-tight">
                    Tu progreso, a tu ritmo
                  </div>
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
                  key: 'asmr_clicker',
                  label: `🫧   Clicker ASMR & Orbes (${ASMR_TEXTURES.length})`,
                  action: () => openAndScrollToAsmrSanctuary(),
                },
                {
                  key: 'indie_shop',
                  label: `💎   Skins, Buffs & Indie (${gems})`,
                  action: () => openIndieShop('skins'),
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

          <div className="space-y-2.5 mt-4 shrink-0">
            <div className="rounded-[14px] border border-[#343046] bg-[#211F30] p-3 space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#FFC45D] font-bold">🔥 Racha activa</span>
                <span className="text-[11px] text-[#82E59B] font-mono-tabular">
                  🛡️ {streakShields} {streakShields === 1 ? 'escudo' : 'escudos'}
                </span>
              </div>
              <div className="text-[12px] text-[#E4DFED]">{streakText}</div>
            </div>

            {/* Indie Developer Empathy Card in Sidebar */}
            <button
              type="button"
              onClick={() => openIndieShop('support')}
              className="w-full text-left rounded-[14px] border border-[#4D3B72] bg-gradient-to-br from-[#271F3D] to-[#1B172B] p-3 space-y-1.5 hover:border-[#B58BFF] transition group"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFD54F]">
                  {isIndieFounder
                    ? '👑 FUNDADOR INDIE'
                    : supporterTier === 'coffee'
                    ? '☕ SUPPORTER INDIE'
                    : '💖 PROYECTO 100% INDIE'}
                </span>
                <span className="text-[11px] font-mono-tabular font-bold text-[#9AF0AE]">
                  💎 {gems}
                </span>
              </div>
              <div className="text-[11px] text-[#E6D9FF] leading-snug">
                Creado por 1 dev independiente · <strong>0% anuncios</strong>.
                Explora Skins, Buffs y cómo apoyar.
              </div>
            </button>
          </div>
        </aside>

        {/* Center Dashboard ScrollView */}
        <main className="w-full max-w-[100vw] lg:max-w-full overflow-x-hidden px-2.5 sm:px-4 pb-16 lg:pb-8 space-y-3.5 min-w-0">
          {/* Sticky Header Bar: Relative Full-Width Single-Row Layout with Notch Safe-Area Protection */}
          <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-4 pt-[max(clamp(0.42rem,1.8vw,0.6rem),calc(env(safe-area-inset-top,0px)+0.35rem))] pb-[clamp(0.42rem,1.8vw,0.6rem)] pl-[max(clamp(0.5rem,2.4vw,1rem),calc(env(safe-area-inset-left,0px)+0.35rem))] pr-[max(clamp(0.5rem,2.4vw,1rem),calc(env(safe-area-inset-right,0px)+0.35rem))] bg-[#11121C]/95 backdrop-blur-md border-b border-[#29283C]/85 shadow-[0_6px_20px_rgba(7,8,16,0.45)]">
            <div className="flex flex-nowrap items-center justify-between w-full gap-[clamp(0.35rem,1.6vw,0.65rem)]">
              {/* Left: Menu Drawer Button + Fluid Brand Emblem & Name */}
              <div className="flex items-center gap-[clamp(0.28rem,1.3vw,0.5rem)] min-w-0 flex-1 sm:flex-initial">
                <button
                  onClick={() => {
                    playUiTap(1);
                    setIsHistoryOpen(false);
                    setIsNavigationOpen(true);
                  }}
                  aria-label="Abrir navegación"
                  className="lg:hidden w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] bg-[#242238] border border-[#383252] text-[#D9C9FF] text-[clamp(0.8rem,3.5vw,0.95rem)] flex items-center justify-center shrink-0 hover:bg-[#302747] active:scale-95 transition"
                >
                  ☰
                </button>

                <div className="h-[clamp(1.85rem,8vw,2.2rem)] inline-flex items-center gap-[clamp(0.3rem,1.4vw,0.5rem)] px-[clamp(0.45rem,2vw,0.75rem)] rounded-[clamp(8px,2.2vw,10px)] bg-[#1A1829] border border-[#453A6B] shadow-[0_2px_10px_rgba(0,0,0,0.3)] min-w-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="Objective Reacher"
                    className="w-[clamp(1.15rem,5vw,1.4rem)] h-[clamp(1.15rem,5vw,1.4rem)] rounded-[clamp(5px,1.5vw,7px)] object-cover border border-[#B58BFF]/45 shrink-0"
                  />
                  <div className="flex items-center gap-[clamp(0.2rem,0.9vw,0.35rem)] leading-none min-w-0">
                    <span className="text-[clamp(0.62rem,2.75vw,0.8rem)] font-black uppercase tracking-[0.04em] sm:tracking-[0.06em] text-[#F4F1FF] truncate">
                      OBJECTIVE
                    </span>
                    <span className="text-[clamp(0.62rem,2.75vw,0.8rem)] font-black uppercase tracking-[0.05em] sm:tracking-[0.08em] text-[#82E59B] truncate">
                      REACHER
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openIndieShop('cards_audio')}
                  style={{
                    color: equippedGuardianTitle.color,
                    borderColor: `${equippedGuardianTitle.color}55`,
                  }}
                  className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-[#1C192B] border text-[9px] font-extrabold hover:brightness-110 transition whitespace-nowrap shrink-0"
                  title="Cambiar Título de Guardián en el Banco del Santuario"
                >
                  {equippedGuardianTitle.emoji} {equippedGuardianTitle.title}
                </button>
                {isIndieFounder && (
                  <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full bg-[#3A2E14] border border-[#FFD54F]/60 text-[9px] font-extrabold text-[#FFD54F] whitespace-nowrap shrink-0">
                    👑 FUNDADOR
                  </span>
                )}
              </div>

              {/* Right Quick Toolbar: Gems + Music + Sound + History */}
              <div className="flex items-center justify-end gap-[clamp(0.22rem,1.1vw,0.42rem)] shrink-0">
                <button
                  onClick={() => openIndieShop('skins')}
                  title={`Abrir Santuario Indie (${gems.toLocaleString()} gemas): Skins, Buffs y Apoyo al Creador`}
                  className="h-[clamp(1.85rem,8vw,2.2rem)] px-[clamp(0.45rem,1.9vw,0.75rem)] rounded-[clamp(8px,2.2vw,10px)] bg-gradient-to-r from-[#2B2144] to-[#212B38] border border-[#65499C] hover:border-[#B58BFF] text-[#F4F1FF] text-[clamp(0.62rem,2.7vw,0.78rem)] font-extrabold flex items-center justify-center gap-[clamp(0.22rem,1vw,0.35rem)] transition shrink-0 shadow-[0_2px_10px_rgba(140,92,224,0.22)] active:scale-95"
                >
                  <span className="text-[clamp(0.68rem,2.9vw,0.82rem)] leading-none shrink-0">
                    💎
                  </span>
                  <span className="font-mono-tabular text-[#9AF0AE]">
                    {gems >= 10000
                      ? `${(gems / 1000).toFixed(gems >= 100000 ? 0 : 1)}k`
                      : gems}
                  </span>
                  <span className="hidden sm:inline text-[10px] font-bold text-[#D8C5FF]">
                    · Tienda
                  </span>
                </button>

                <button
                  onClick={toggleAmbientMusic}
                  aria-label={
                    sensoryPrefs.musicEnabled
                      ? 'Desactivar música ambiental procedural'
                      : 'Activar música ambiental procedural'
                  }
                  title={
                    sensoryPrefs.musicEnabled
                      ? `Música ambiental activa (${getAmbientMusicStyleName(
                          currentObjective.accentColor
                        )}) · Toca para apagar`
                      : `Activar música ambiental procedural (${getAmbientMusicStyleName(
                          currentObjective.accentColor
                        )})`
                  }
                  className={`w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] text-[clamp(0.75rem,3.3vw,0.92rem)] flex items-center justify-center transition shrink-0 border ${
                    sensoryPrefs.musicEnabled
                      ? 'bg-gradient-to-r from-[#2D2149] to-[#1D352E] border-[#82E59B]/60 text-[#9AF0AE] shadow-[0_0_10px_rgba(130,229,155,0.25)]'
                      : 'bg-[#1A1928] border-[#29283C] text-[#7D7894] hover:bg-[#242238] hover:text-[#D9C9FF]'
                  }`}
                >
                  🎵
                </button>

                <button
                  onClick={toggleSoundAndHaptics}
                  aria-label={
                    sensoryPrefs.soundEnabled
                      ? 'Silenciar sonidos y vibración'
                      : 'Activar sonidos y vibración'
                  }
                  title={
                    sensoryPrefs.soundEnabled
                      ? 'Efectos de sonido y vibración activos (toca para silenciar)'
                      : 'Sonido y vibración en silencio (toca para activar)'
                  }
                  className={`w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] text-[clamp(0.75rem,3.3vw,0.92rem)] flex items-center justify-center transition shrink-0 border ${
                    sensoryPrefs.soundEnabled
                      ? 'bg-[#242238] border-[#3E355B] text-[#D9C9FF] hover:bg-[#302747]'
                      : 'bg-[#1A1928] border-[#29283C] text-[#7D7894] hover:bg-[#242238]'
                  }`}
                >
                  {sensoryPrefs.soundEnabled ? '🔊' : '🔇'}
                </button>

                <button
                  onClick={() => {
                    playUiTap(1);
                    setIsNavigationOpen(false);
                    setIsHistoryOpen(true);
                  }}
                  aria-label="Abrir historial de entradas"
                  title="Ver historial de movimientos"
                  className="lg:hidden w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] bg-[#242238] border border-[#383252] text-[#D9C9FF] text-[clamp(0.78rem,3.4vw,0.92rem)] flex items-center justify-center shrink-0 hover:bg-[#302747] active:scale-95 transition"
                >
                  ☷
                </button>
              </div>
            </div>
          </div>

          {/* Objective Tabs: Full touch swipe + mouse drag + wheel + scrollbar + arrow buttons + wrap toggle */}
          <div className="w-full max-w-full min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 w-full max-w-full min-w-0">
              {!isObjectiveTabsWrapped && activeObjectives.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playUiTap(1);
                    objectiveTabsScrollRef.current?.scrollBy({
                      left: -180,
                      behavior: 'smooth',
                    });
                  }}
                  aria-label="Desplazar objetivos a la izquierda"
                  title="Desplazar a la izquierda"
                  className="w-7 h-9 rounded-[10px] bg-[#1F1E2E] border border-[#34304B] text-[#D9C9FF] hover:bg-[#2B2740] active:scale-95 transition flex items-center justify-center shrink-0 text-sm font-bold"
                >
                  ‹
                </button>
              )}

              <div
                ref={objectiveTabsScrollRef}
                {...(!isObjectiveTabsWrapped ? getHorizontalScrollProps() : {})}
                className={
                  isObjectiveTabsWrapped
                    ? 'flex flex-wrap items-center gap-2 w-full max-w-full min-w-0 pb-1'
                    : 'flex flex-nowrap items-center gap-2 w-full max-w-full min-w-0 overflow-x-auto pb-1.5 pt-0.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing'
                }
              >
                {activeObjectives.map((obj) => {
                  const isSelected = obj.id === currentObjective.id;
                  const tabIcon = obj.icon || '🎯';
                  const tabTheme = findAccentTheme(obj.accentColor);
                  const tabAccent = tabTheme.primary;
                  const objProg =
                    obj.goalAmount > 0
                      ? Math.min(
                          100,
                          Math.floor((obj.currentAmount / obj.goalAmount) * 100)
                        )
                      : 0;
                  return (
                    <button
                      key={obj.id}
                      data-objective-tab={obj.id}
                      onClick={() => handleSelectObjective(obj.id)}
                      style={
                        isSelected
                          ? {
                              borderColor: tabAccent,
                              backgroundColor: tabTheme.surfaceDark,
                              boxShadow: `0 4px 14px -4px ${tabTheme.glow}`,
                            }
                          : undefined
                      }
                      className={`shrink-0 px-3.5 py-2 rounded-[13px] text-xs sm:text-sm font-medium whitespace-nowrap transition flex items-center gap-2 border select-none ${
                        isSelected
                          ? 'text-white'
                          : 'bg-[#1F1E2E] border-[#2C2A40] text-[#C9C2D8] hover:bg-[#29263D]'
                      }`}
                    >
                      <span>{tabIcon}</span>
                      <span>{obj.title}</span>
                      <span
                        style={{
                          color: isSelected ? tabAccent : '#9E97B0',
                        }}
                        className="text-[10px] font-mono-tabular font-bold"
                      >
                        {objProg}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {!isObjectiveTabsWrapped && activeObjectives.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playUiTap(1);
                    objectiveTabsScrollRef.current?.scrollBy({
                      left: 180,
                      behavior: 'smooth',
                    });
                  }}
                  aria-label="Desplazar objetivos a la derecha"
                  title="Desplazar a la derecha"
                  className="w-7 h-9 rounded-[10px] bg-[#1F1E2E] border border-[#34304B] text-[#D9C9FF] hover:bg-[#2B2740] active:scale-95 transition flex items-center justify-center shrink-0 text-sm font-bold"
                >
                  ›
                </button>
              )}
            </div>
          </div>

          {/* Subheader: Count + Ver todos toggle + Archivados + Nuevo objetivo */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#A8A3B8]">
                {activeObjectives.length}{' '}
                {activeObjectives.length === 1 ? 'objetivo activo' : 'objetivos activos'}
              </span>
              {activeObjectives.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playUiTap(1);
                    setIsObjectiveTabsWrapped((prev) => !prev);
                  }}
                  className="px-2 py-0.5 rounded-[8px] bg-[#211E32] border border-[#383350] text-[#C7A4FF] text-[11px] font-semibold hover:bg-[#2C2844] transition"
                >
                  {isObjectiveTabsWrapped ? '↔ 1 fila' : '☷ Ver todos'}
                </button>
              )}
            </div>
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
                className="px-2.5 py-1.5 rounded-[10px] bg-[#262338] border border-[#383350] text-[#E2D8FF] text-[12px] hover:bg-[#322D49] transition"
              >
                Archivados ({archivedObjectives.length})
              </button>
              <button
                onClick={handleStartNewObjective}
                style={{
                  background: `linear-gradient(90deg, ${currentAccentTheme.secondary}, ${currentAccentTheme.primary})`,
                  color: currentAccentTheme.buttonText,
                  boxShadow: `0 4px 14px -2px ${currentAccentTheme.glow}`,
                }}
                className="px-3.5 py-1.5 rounded-[11px] text-[12px] font-extrabold hover:brightness-110 active:scale-95 transition flex items-center gap-1"
              >
                <span>＋</span>
                <span>Nuevo objetivo</span>
              </button>
            </div>
          </div>

          {/* Hero Objective Section (Upgraded Customizable Sanctuary Card with Full Chromatic Harmony & Equipped Frame FX) */}
          <div
            ref={objectiveRef}
            style={{
              background: `linear-gradient(135deg, ${heroPreset.startColor}, ${heroPreset.endColor})`,
              borderColor:
                highlightedSection === 'objective'
                  ? currentAccentTheme.primary
                  : equippedCardCosmetic.id !== 'frame_default'
                  ? equippedCardCosmetic.borderColor
                  : `${currentAccentTheme.primary}66`,
              boxShadow:
                equippedCardCosmetic.id !== 'frame_default'
                  ? `0 12px 34px -8px rgba(8, 7, 16, 0.75), 0 0 28px -3px ${equippedCardCosmetic.glowColor}`
                  : `0 12px 34px -8px rgba(8, 7, 16, 0.7), 0 0 26px -5px ${currentAccentTheme.glow}`,
            }}
            className={`relative min-h-[385px] rounded-[24px] overflow-hidden transition-all ${
              highlightedSection === 'objective'
                ? 'border-[3px]'
                : equippedCardCosmetic.id !== 'frame_default'
                ? 'border-2'
                : 'border'
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
                className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none select-none transition-all duration-500"
              />
            )}
            {/* Multi-layer atmospheric vignette harmonized with the chosen Accent Theme */}
            <div
              style={{ background: currentAccentTheme.vignetteGradient }}
              className="absolute inset-0 pointer-events-none transition-all duration-500"
            />
            {equippedCardCosmetic.id !== 'frame_default' && (
              <div
                style={{ background: equippedCardCosmetic.overlayGradient }}
                className="absolute inset-0 pointer-events-none transition-all duration-500"
              />
            )}
            <div
              style={{ backgroundColor: currentAccentTheme.primary }}
              className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-20 blur-3xl transition-colors duration-500"
            />
            <div
              style={{ backgroundColor: currentAccentTheme.secondary }}
              className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-15 blur-3xl transition-colors duration-500"
            />

            <div className="relative z-10 h-full p-4 sm:p-[20px] flex flex-col justify-between gap-3.5">
              {/* Top Section: Utility Strip (Category/Deadline + Customize Actions) separated from Full-Width Objective Title */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      style={{
                        color: currentAccentTheme.primary,
                        backgroundColor: currentAccentTheme.softBg,
                        borderColor: `${currentAccentTheme.primary}55`,
                      }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border backdrop-blur-sm"
                    >
                      {currentCategory}
                    </span>

                    {objectiveInsights.daysLeft !== null && (
                      <span
                        style={
                          objectiveInsights.daysLeft > 7
                            ? {
                                backgroundColor: currentAccentTheme.surfaceDark,
                                borderColor: `${currentAccentTheme.primary}38`,
                                color: currentAccentTheme.textSoft,
                              }
                            : undefined
                        }
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${
                          objectiveInsights.daysLeft < 0
                            ? 'bg-[#4A202A]/80 border-[#F27783]/50 text-[#FFD1D7]'
                            : objectiveInsights.daysLeft <= 7
                            ? 'bg-[#443318]/80 border-[#FFD54F]/60 text-[#FFE082]'
                            : ''
                        }`}
                      >
                        {objectiveInsights.daysLeft < 0
                          ? '⌛ Fecha cumplida'
                          : objectiveInsights.daysLeft === 0
                          ? '⏳ ¡Hoy es la fecha meta!'
                          : `⏳ ${objectiveInsights.daysLeft}d restantes`}
                      </span>
                    )}
                  </div>

                  {/* Floating Glass Customization Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openIndieShop('cards_audio')}
                      title={`Marco activo: ${equippedCardCosmetic.name} (toca para explorar 48 marcos y 30 sonidos)`}
                      style={{
                        backgroundColor: currentAccentTheme.surfaceDark,
                        borderColor:
                          equippedCardCosmetic.id !== 'frame_default'
                            ? equippedCardCosmetic.borderColor
                            : `${currentAccentTheme.primary}40`,
                        color: currentAccentTheme.textSoft,
                      }}
                      className="px-2.5 py-1.5 rounded-[11px] hover:brightness-110 border backdrop-blur-md text-[11px] font-semibold transition flex items-center gap-1"
                    >
                      <span>{equippedCardCosmetic.cornerCrest || '✨'}</span>
                      <span className="hidden sm:inline">Marcos & FX</span>
                    </button>
                    <button
                      onClick={() => setIsEditorOpen(true)}
                      title="Personalizar objetivo"
                      style={{
                        backgroundColor: currentAccentTheme.surfaceDark,
                        borderColor: `${currentAccentTheme.primary}40`,
                        color: currentAccentTheme.textSoft,
                      }}
                      className="px-2.5 py-1.5 rounded-[11px] hover:brightness-110 border backdrop-blur-md text-[11px] font-semibold transition flex items-center gap-1"
                    >
                      <span>🎨</span>
                      <span className="hidden sm:inline">Personalizar</span>
                    </button>
                    <button
                      onClick={() => setIsBannerPickerOpen(true)}
                      title="Cambiar arte o foto de fondo"
                      style={{
                        backgroundColor: currentAccentTheme.surfaceDark,
                        borderColor: `${currentAccentTheme.primary}40`,
                        color: currentAccentTheme.textSoft,
                      }}
                      className="px-2.5 py-1.5 rounded-[11px] hover:brightness-110 border backdrop-blur-md text-[11px] font-semibold transition flex items-center gap-1"
                    >
                      <span>▧</span>
                      <span className="hidden sm:inline">Fondo</span>
                    </button>
                  </div>
                </div>

                {/* Full-Width Objective Identity Row (Emblem + Title + Description) */}
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => setIsEditorOpen(true)}
                    title="Cambiar icono y estilo del objetivo"
                    style={{
                      borderColor: `${currentAccentTheme.primary}88`,
                      backgroundColor: currentAccentTheme.surfaceDark,
                      boxShadow: `0 0 18px ${currentAccentTheme.softBg}`,
                    }}
                    className="w-12 h-12 rounded-[16px] border backdrop-blur-md flex items-center justify-center text-[25px] shrink-0 hover:scale-105 active:scale-95 transition"
                  >
                    {currentIcon}
                  </button>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h2 className="text-[19px] sm:text-[23px] font-extrabold text-white leading-snug break-words drop-shadow-sm select-copyable">
                      {currentObjective.title}
                    </h2>
                    {currentObjective.description ? (
                      <p
                        style={{ color: currentAccentTheme.textSoft }}
                        className="text-[12px] sm:text-[13px] leading-snug break-words select-copyable"
                      >
                        {currentObjective.description}
                      </p>
                    ) : (
                      <button
                        onClick={() => setIsEditorOpen(true)}
                        style={{ color: currentAccentTheme.primary }}
                        className="text-[11px] font-semibold hover:underline text-left"
                      >
                        ＋ Añadir propósito o fecha límite…
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Row: Frosted Glass Stat Pods + Energy Ring with Live Projection */}
              <div className="grid grid-cols-[1fr_92px_1fr] sm:grid-cols-[1fr_104px_1fr] items-center gap-2 sm:gap-3 my-1">
                {/* Saved Pod */}
                <div
                  style={{
                    backgroundColor: currentAccentTheme.surfaceDark,
                    borderColor: `${currentAccentTheme.primary}33`,
                  }}
                  className="p-2.5 sm:p-3 rounded-[16px] backdrop-blur-md border text-center space-y-0.5"
                >
                  <div
                    style={{ color: currentAccentTheme.primary }}
                    className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase"
                  >
                    LOGRADO
                  </div>
                  <div className="text-[18px] sm:text-[22px] font-extrabold text-white break-words tabular-nums leading-tight select-copyable">
                    {formatObjectiveAmount(
                      currentObjective.currentAmount,
                      currentObjective
                    )}
                  </div>
                  {hasValidSelectedAmount && (
                    <div
                      style={
                        isAddition
                          ? { color: currentAccentTheme.primary }
                          : undefined
                      }
                      className={`text-[10px] font-mono-tabular font-bold ${
                        isAddition ? '' : 'text-[#FFD1D7]'
                      }`}
                    >
                      {isAddition ? '▲ +' : '▼ −'}
                      {formatObjectiveAmount(selectedAmount, currentObjective)}
                    </div>
                  )}
                </div>

                {/* Central Energy Ring */}
                <div className="w-[86px] h-[86px] sm:w-[96px] sm:h-[96px] mx-auto relative flex items-center justify-center">
                  <div
                    style={{ backgroundColor: currentAccentTheme.primary }}
                    className="pointer-events-none absolute inset-2 rounded-full opacity-20 blur-md"
                  />
                  <svg
                    className="w-full h-full -rotate-90"
                    style={{
                      filter: `drop-shadow(0 0 10px ${currentAccentTheme.glow})`,
                    }}
                    viewBox="0 0 80 80"
                  >
                    {/* Track */}
                    <circle
                      cx="40"
                      cy="40"
                      r="33"
                      fill={currentAccentTheme.surfaceDark}
                      stroke={`${currentAccentTheme.primary}30`}
                      strokeWidth="6"
                    />
                    {/* Ghost Projected Progress Arc */}
                    {projectedObjectiveProgress > progress && (
                      <circle
                        cx="40"
                        cy="40"
                        r="33"
                        fill="none"
                        stroke={currentAccentTheme.primary}
                        strokeOpacity="0.35"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 33}
                        strokeDashoffset={
                          2 * Math.PI * 33 * (1 - projectedObjectiveProgress)
                        }
                        className="transition-all duration-300"
                      />
                    )}
                    {/* Active Progress Arc */}
                    {progress > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="33"
                        fill="none"
                        stroke={currentAccentTheme.primary}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 33}
                        strokeDashoffset={2 * Math.PI * 33 * (1 - progress)}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[19px] sm:text-[21px] font-extrabold text-white tabular-nums leading-none">
                      {progressText}
                    </span>
                    <span
                      style={{ color: currentAccentTheme.textSoft }}
                      className="text-[9px] font-bold mt-0.5"
                    >
                      {progress >= 1 ? '¡LOGRADO!' : 'AVANCE'}
                    </span>
                  </div>
                </div>

                {/* Goal Pod */}
                <div
                  style={{
                    backgroundColor: currentAccentTheme.surfaceDark,
                    borderColor: `${currentAccentTheme.primary}33`,
                  }}
                  className="p-2.5 sm:p-3 rounded-[16px] backdrop-blur-md border text-center space-y-0.5"
                >
                  <div
                    style={{ color: currentAccentTheme.textSoft }}
                    className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase"
                  >
                    META FINAL
                  </div>
                  <div className="text-[18px] sm:text-[22px] font-extrabold text-white break-words tabular-nums leading-tight select-copyable">
                    {formatObjectiveAmount(
                      currentObjective.goalAmount,
                      currentObjective
                    )}
                  </div>
                  <div
                    style={{ color: currentAccentTheme.textMuted }}
                    className="text-[10px] leading-tight break-words"
                  >
                    {objectiveInsights.remaining > 0
                      ? `Faltan ${formatObjectiveAmount(
                          objectiveInsights.remaining,
                          currentObjective
                        )}`
                      : '¡Meta superada! 🏆'}
                  </div>
                </div>
              </div>

              {/* Bottom Section: Milestone Bar (25/50/75/100%) + Smart Pace & Personal Pledge */}
              <div className="space-y-2.5">
                {/* Progress Bar with 4 Milestone Checkpoints */}
                <div className="space-y-1">
                  <div className="relative pt-1 pb-1">
                    <div
                      style={{
                        backgroundColor: currentAccentTheme.surfaceDark,
                        borderColor: `${currentAccentTheme.primary}35`,
                      }}
                      className="w-full h-[13px] rounded-full border overflow-hidden relative"
                    >
                      {/* Projected preview bar */}
                      {projectedObjectiveProgress > progress && (
                        <div
                          style={{
                            width: `${projectedObjectiveProgress * 100}%`,
                            backgroundColor: currentAccentTheme.primary,
                          }}
                          className="absolute inset-y-0 left-0 opacity-30 transition-all duration-300"
                        />
                      )}
                      {/* Actual progress bar */}
                      <div
                        style={{
                          width: `${progress * 100}%`,
                          background: `linear-gradient(90deg, ${currentAccentTheme.secondary}, ${currentAccentTheme.primary})`,
                        }}
                        className="h-full transition-all duration-700 ease-out relative overflow-hidden rounded-full"
                      >
                        <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
                      </div>
                    </div>

                    {/* Milestone Gems (25%, 50%, 75%, 100%) */}
                    {[0.25, 0.5, 0.75, 1].map((m) => {
                      const reached = progress >= m;
                      const pctLabel = `${m * 100}%`;
                      return (
                        <div
                          key={m}
                          style={{
                            left: `${m * 100}%`,
                            borderColor: reached
                              ? currentAccentTheme.primary
                              : `${currentAccentTheme.primary}45`,
                            backgroundColor: reached
                              ? currentAccentTheme.secondary
                              : currentAccentTheme.surfaceDark,
                          }}
                          title={`Hito ${pctLabel}: ${formatObjectiveAmount(
                            currentObjective.goalAmount * m,
                            currentObjective
                          )}`}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all ${
                            reached
                              ? 'text-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                              : 'text-[#9E97B0]'
                          }`}
                        >
                          {reached ? '✓' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Milestone Sub-info — Portrait-friendly wrapping */}
                  <div
                    style={{ color: currentAccentTheme.textSoft }}
                    className="flex items-center justify-between gap-2 flex-wrap text-[11px] px-0.5"
                  >
                    <span className="font-medium leading-snug">
                      {objectiveInsights.nextMilestonePct !== null
                        ? `Próximo hito (${objectiveInsights.nextMilestonePct}%): a ${formatObjectiveAmount(
                            objectiveInsights.amountToNextMilestone,
                            currentObjective
                          )}`
                        : '🏆 ¡Todos los hitos de este objetivo completados!'}
                    </span>
                    <span
                      style={{ color: currentAccentTheme.textMuted }}
                      className="text-[10px] font-mono-tabular shrink-0"
                    >
                      {currentObjective.entries.length}{' '}
                      {currentObjective.entries.length === 1
                        ? 'registro'
                        : 'registros'}
                    </span>
                  </div>
                </div>

                {/* Smart Pace & Personal Pledge Banner — Portrait-friendly full text */}
                <div
                  style={{
                    backgroundColor: currentAccentTheme.surfaceDark,
                    borderColor: `${currentAccentTheme.primary}35`,
                  }}
                  className="px-3 py-2 rounded-[13px] backdrop-blur-md border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                >
                  <div
                    style={{ color: currentAccentTheme.textSoft }}
                    className="flex items-start sm:items-center gap-1.5 text-[11px] min-w-0 leading-snug"
                  >
                    <span className="shrink-0">⚡</span>
                    <span className="break-words">
                      {objectiveInsights.dailyPaceNeeded !== null
                        ? `Ritmo sugerido: ${formatObjectiveAmount(
                            objectiveInsights.dailyPaceNeeded,
                            currentObjective
                          )} / día`
                        : objectiveInsights.bestEntry > 0
                        ? `Mayor impulso: +${formatObjectiveAmount(
                            objectiveInsights.bestEntry,
                            currentObjective
                          )}`
                        : remainingText}
                    </span>
                  </div>

                  {currentObjective.pledge ? (
                    <div
                      style={{ color: currentAccentTheme.primary }}
                      className="text-[11px] font-bold flex items-start sm:items-center gap-1 leading-snug break-words"
                    >
                      <span className="shrink-0">🎁</span>
                      <span>Premio: {currentObjective.pledge}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditorOpen(true)}
                      style={{ color: currentAccentTheme.primary }}
                      className="text-[10px] font-bold hover:underline text-left sm:text-right shrink-0"
                    >
                      ＋ Definir mi premio al lograrlo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Entries Section (Registrar Progreso — Unified Sanctuary Card) */}
          <div
            ref={entriesRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${
              highlightedSection === 'entries'
                ? 'border-[2px] border-[#C7A4FF]'
                : 'border border-[#342D4B]'
            }`}
          >
            <div
              style={{
                backgroundColor: isAddition
                  ? currentAccentTheme.primary
                  : '#FF6B8B',
              }}
              className="pointer-events-none absolute -top-14 -right-14 w-36 h-36 rounded-full opacity-10 blur-2xl transition-colors duration-300"
            />

            {/* Header Row with Live XP Pill */}
            <div className="flex items-center justify-between gap-2 flex-wrap relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[10px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-sm shrink-0">
                  {isAddition ? '⚡' : '📉'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F4F1FF] leading-tight">
                    Registrar Progreso
                  </h3>
                  <p className="text-[11px] text-[#A8A3B8] leading-snug">
                    Elige un monto rápido o escribe el tuyo
                  </p>
                </div>
              </div>

              {liveXpPreview && (
                <div
                  className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all duration-200 shrink-0 ${
                    liveXpPreview.willLevelUp
                      ? 'bg-[#2E2519] border-[#FFD54F]/70 text-[#FFD54F] shadow-[0_0_12px_rgba(255,213,79,0.25)]'
                      : isAddition
                      ? 'bg-[#182923] border-[#65DB85]/45 text-[#82E59B]'
                      : 'bg-[#241E36] border-[#4B3F6B] text-[#D8C5FF]'
                  }`}
                >
                  <span>
                    +{liveXpPreview.estimatedXp} XP
                    {liveXpPreview.bonusTag ? ` · ${liveXpPreview.bonusTag}` : ''}
                  </span>
                  {liveXpPreview.willLevelUp && (
                    <span className="text-[9px] font-extrabold text-[#FFE082]">
                      · ¡SUBES NV!
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Segmented Mode Switcher (+ Sumar / - Restar) */}
            <div className="p-1 rounded-[14px] bg-[#13121E] border border-[#2B263D] grid grid-cols-2 gap-1.5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  playUiTap(2);
                  setIsAddition(true);
                }}
                className={`h-[42px] rounded-[10px] font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-all ${
                  isAddition
                    ? 'bg-gradient-to-r from-[#1F4E37] to-[#193C2B] border border-[#65DB85]/60 text-[#B8F7C8] shadow-[0_2px_12px_rgba(101,219,133,0.2)]'
                    : 'bg-transparent border border-transparent text-[#8F89A3] hover:text-[#D5CFE6]'
                }`}
              >
                <span className="text-sm leading-none">＋</span>
                <span>Sumar avance</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiTap(0);
                  setIsAddition(false);
                }}
                className={`h-[42px] rounded-[10px] font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-all ${
                  !isAddition
                    ? 'bg-gradient-to-r from-[#522435] to-[#3B1A26] border border-[#FF7A8A]/60 text-[#FFD1D7] shadow-[0_2px_12px_rgba(242,119,131,0.2)]'
                    : 'bg-transparent border border-transparent text-[#8F89A3] hover:text-[#D5CFE6]'
                }`}
              >
                <span className="text-sm leading-none">−</span>
                <span>Restar / Gasto</span>
              </button>
            </div>

            {/* Adaptive Quick Amount Chips */}
            <div className="grid grid-cols-4 gap-1.5 relative z-10">
              {quickPresetAmounts.map((amt) => {
                const isSelected = selectedQuickAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectQuickAmount(amt)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: currentAccentTheme.surfaceDark,
                            borderColor: currentAccentTheme.primary,
                            color: '#FFFFFF',
                            boxShadow: `0 0 12px ${currentAccentTheme.glow}`,
                          }
                        : undefined
                    }
                    className={`h-[40px] px-1.5 rounded-[11px] text-[12px] font-mono-tabular font-bold truncate border transition-all active:scale-95 ${
                      isSelected
                        ? ''
                        : 'bg-[#141320]/90 border-[#2B273D] text-[#C9C2D8] hover:border-[#4A4068] hover:bg-[#1B192B]'
                    }`}
                  >
                    {isAddition ? '+' : '−'}
                    {formatObjectiveAmount(amt, currentObjective)}
                  </button>
                );
              })}
            </div>

            {/* Unified Custom Amount + Optional Note + Primary Action Row */}
            <div className="grid grid-cols-1 sm:grid-cols-[145px_1fr_auto] gap-2 relative z-10">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={customAmountText}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddEntry();
                  }}
                  placeholder={`Otro (${formatObjectiveAmount(
                    selectedAmount,
                    currentObjective
                  )})`}
                  className="w-full h-[44px] px-3 rounded-[12px] bg-[#141320] text-[#F4F1FF] placeholder-[#8A849E] text-xs sm:text-[13px] font-mono-tabular border border-[#2D2840] focus:outline-none focus:border-[#9B6BFF] transition"
                />
              </div>

              <input
                type="text"
                value={newEntryDescription}
                onChange={(e) => setNewEntryDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEntry();
                }}
                placeholder="Nota opcional (ej. Ahorro semanal)"
                className="w-full h-[44px] px-3 rounded-[12px] bg-[#141320] text-[#F4F1FF] placeholder-[#8A849E] text-xs sm:text-[13px] border border-[#2D2840] focus:outline-none focus:border-[#9B6BFF] transition"
              />

              <button
                type="button"
                onClick={handleAddEntry}
                disabled={!hasValidSelectedAmount}
                style={
                  isAddition
                    ? {
                        background: `linear-gradient(90deg, ${currentAccentTheme.secondary}, ${currentAccentTheme.primary})`,
                        color: currentAccentTheme.buttonText,
                        boxShadow: `0 4px 14px -2px ${currentAccentTheme.glow}`,
                      }
                    : undefined
                }
                className={`h-[44px] px-4 rounded-[12px] font-extrabold text-xs sm:text-[13px] hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                  isAddition
                    ? ''
                    : 'bg-gradient-to-r from-[#8E354A] to-[#B5435E] text-white shadow-[0_4px_14px_rgba(181,67,94,0.35)]'
                }`}
              >
                <span>{isAddition ? '＋' : '−'}</span>
                <span>
                  Registrar{' '}
                  {hasValidSelectedAmount
                    ? formatObjectiveAmount(selectedAmount, currentObjective)
                    : ''}
                </span>
              </button>
            </div>

            {persistenceMessage && (
              <div className="text-[11px] text-[#FF9EAB] bg-[#291520] border border-[#542A38] px-3 py-1.5 rounded-[10px]">
                {persistenceMessage}
              </div>
            )}
          </div>

          {/* Achievements Horizontal Section (Unified Sanctuary Medals) */}
          <div
            ref={achievementsRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${
              highlightedSection === 'achievements'
                ? 'border-[2px] border-[#C7A4FF]'
                : 'border border-[#342D4B]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[10px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-sm shrink-0">
                  🏆
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F4F1FF] leading-tight">
                      Logros
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#252138] border border-[#3E355B] text-[10px] font-mono-tabular font-bold text-[#D8C5FF]">
                      {currentObjective.unlockedAchievementIds.length}/
                      {ACHIEVEMENT_CATALOG.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A8A3B8] leading-snug">
                    Medallas e hitos desbloqueados en este objetivo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAllAchievementsOpen(true)}
                className="text-[10px] font-bold text-[#C7A4FF] hover:text-white hover:underline transition shrink-0"
              >
                VER TODOS →
              </button>
            </div>

            <div
              {...getHorizontalScrollProps()}
              className="flex gap-2 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
            >
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const isUnlocked =
                  currentObjective.unlockedAchievementIds.includes(ach.id);
                const title =
                  ach.isSecret && !isUnlocked ? 'Logro misterioso' : ach.title;
                const icon = ach.isSecret && !isUnlocked ? '❔' : ach.icon;

                return (
                  <button
                    key={ach.id}
                    onClick={() => handleAchievementClick(ach)}
                    className={`w-[235px] shrink-0 p-2.5 rounded-[14px] border text-left flex items-start gap-2.5 transition-all active:scale-98 ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-[#1B312A] to-[#14221E] border-[#65DB85]/50 shadow-[0_4px_14px_rgba(101,219,133,0.12)] hover:border-[#82E59B]'
                        : 'bg-[#141320]/90 border-[#2B273D] hover:border-[#463D63] hover:bg-[#191728]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-[11px] border flex items-center justify-center text-[20px] shrink-0 mt-0.5 ${
                        isUnlocked
                          ? 'bg-[#12221C] border-[#65DB85]/45 shadow-[0_0_10px_rgba(101,219,133,0.2)]'
                          : 'bg-[#1C1A2B] border-[#2C283E] opacity-75'
                      }`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className={`text-[12px] font-bold leading-snug break-words ${
                          isUnlocked ? 'text-[#9AF0AE]' : 'text-[#D5CFE6]'
                        }`}
                      >
                        {title}
                      </div>
                      <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                        {ach.description}
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <span
                          className={`text-[9px] font-mono-tabular font-bold px-1.5 py-0.2 rounded ${
                            isUnlocked
                              ? 'bg-[#1E3B2E] text-[#82E59B]'
                              : 'bg-[#221F33] text-[#B58BFF]'
                          }`}
                        >
                          {isUnlocked
                            ? `✓ +${ach.rewardXp} XP`
                            : `+${ach.rewardXp} XP`}
                        </span>
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
                    <MascotAvatarSvg
                      level={level}
                      size={66}
                      skinId={equippedSkinId}
                    />
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
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[14px] sm:text-[15px] font-bold text-[#F4F1FF] tabular-nums">
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

                {/* Mascot Status Message + Direct ASMR Clicker CTA & Códice Link */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <div className="text-[11px] text-[#C6C0D6] leading-snug break-words">
                    {mascotMessage}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={openAndScrollToAsmrSanctuary}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-gradient-to-r from-[#17363E] via-[#1E2E4A] to-[#2B2046] border border-[#64D8FF] text-[#E0F7FA] hover:border-[#FFD54F] hover:scale-105 active:scale-95 transition shadow-[0_0_12px_rgba(100,216,255,0.3)] flex items-center gap-1"
                    >
                      <span>{activeAsmrTextureObj.emoji}</span>
                      <span>JUGAR CLICKER ASMR ✨</span>
                    </button>
                    <button
                      onClick={() => {
                        playUiTap(3);
                        setMascotGalleryStartLevel(level);
                        setIsMascotGalleryOpen(true);
                      }}
                      className="text-[10px] font-bold text-[#C7A4FF] hover:text-white hover:underline transition"
                    >
                      CÓDICE (1–200) →
                    </button>
                  </div>
                </div>

                {/* Active Buffs & Skin Bar inside Mascot Sanctuary */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <button
                    type="button"
                    onClick={() => openIndieShop('skins')}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1C192B] border border-[#3B3356] text-[#D8C5FF] hover:border-[#B58BFF] transition"
                  >
                    {equippedSkin.emoji} Aura: {equippedSkin.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => openIndieShop('buffs')}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#18262F] border border-[#355A6E] text-[#90E0FF] hover:border-[#64D8FF] transition"
                  >
                    🛡️ {streakShields} {streakShields === 1 ? 'Escudo' : 'Escudos'}
                  </button>
                  {isXpBoostActive && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#2D1F42] border border-[#B58BFF]/60 text-[#E6D9FF]">
                      🧪 ×1.5 XP ({xpBoostRemainingText})
                    </span>
                  )}
                  {isGemMagnetActive && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#193026] border border-[#65DB85]/60 text-[#9AF0AE]">
                      🧲 ×2 💎 ({gemMagnetRemainingText})
                    </span>
                  )}
                  {isIndieFounder && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#362B14] border border-[#FFD54F]/60 text-[#FFD54F]">
                      👑 +20% XP Fundador
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pillar C: 10-Node Species Evolution Track + Next Mystery Species Teaser (Zeigarnik Effect) */}
            <div className="pt-2 border-t border-[#2B263D]/90 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1.5 flex-wrap text-[10px] text-[#A8A3B8]">
                  <span className="font-semibold text-[#D8C5FF]">
                    Etapa {mascotTier + 1}/20 · Evolución {currentSubLevelIndex + 1}/10
                  </span>
                  <span className="text-[#9AF0AE] font-mono-tabular">
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

                {/* Action Buttons: Prominent ASMR Clicker + Daily Quests */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(2);
                      setIsAsmrSanctuaryOpen((prev) => !prev);
                    }}
                    className={`px-3 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-extrabold border flex items-center gap-1.5 transition ${
                      isAsmrSanctuaryOpen
                        ? 'bg-gradient-to-r from-[#1F3A42] to-[#2B2248] border-[#64D8FF] text-[#E0F7FA] shadow-[0_0_14px_rgba(100,216,255,0.35)]'
                        : 'bg-gradient-to-r from-[#1A2D38] to-[#231D3A] border-[#64D8FF]/75 text-[#E0F7FA] hover:border-[#FFD54F] shadow-[0_0_10px_rgba(100,216,255,0.2)]'
                    }`}
                  >
                    <span>{activeAsmrTextureObj.emoji} Clicker ASMR & Orbes (16)</span>
                    {asmrTotalTaps === 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FFD54F] text-[#1A1305] text-[9px] font-extrabold animate-pulse">
                        ¡PRUÉBALO! 🎧
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#13252C] text-[#64D8FF] text-[9px] font-mono-tabular font-extrabold">
                        {asmrCycleProgress}/{ASMR_CYCLE_TAPS}
                      </span>
                    )}
                    <span className="text-[9px] opacity-85">
                      {isAsmrSanctuaryOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* Toggle Daily Quests Button */}
                  <button
                    onClick={() => setIsDailyRitualOpen((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-bold border flex items-center gap-1.5 transition ${
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
              </div>

              {/* Expandable ASMR Clicker Mini-Game Sanctuary (16 Scrollable & Unlockable Styles + Anti-Exploit Cap) */}
              {isAsmrSanctuaryOpen && (
                <div
                  ref={asmrSanctuaryRef}
                  className="p-3 sm:p-4 rounded-[18px] bg-gradient-to-b from-[#161B2E] via-[#141526] to-[#11101C] border border-[#446088] space-y-3 relative overflow-hidden shadow-[0_8px_26px_rgba(8,12,26,0.65)] animate-in fade-in duration-150"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64D8FF]">
                          🫧 SANTUARIO ASMR & CLICKER DEL GUARDIÁN
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1C2A38] border border-[#64D8FF]/40 text-[9px] font-mono-tabular font-bold text-[#9AF0AE]">
                          Toques totales: {asmrTotalTaps}
                        </span>
                        <span
                          title="Tope diario anti-exploit de Gemas en el Clicker. Al llegar a 12/12 sigues ganando XP Zen y desbloqueando orbes por toques."
                          className={`px-2 py-0.5 rounded-full border text-[9px] font-mono-tabular font-extrabold ${
                            asmrRemainingDailyGems > 0
                              ? 'bg-[#231F38] border-[#FFD54F]/50 text-[#FFE082]'
                              : 'bg-[#1D3028] border-[#82E59B]/50 text-[#9AF0AE]'
                          }`}
                        >
                          💎 Hoy: {asmrGemsEarnedToday}/{DAILY_ASMR_GEM_CAP}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C8C2D8] leading-snug">
                        Explora <strong>16 Orbes ASMR</strong> (4 iniciales como Burbuja y Bambú, 4 desbloqueables gratis por toques y 8 Skins de Orbe).
                      </p>
                    </div>

                    {/* Procedural Ambient Music Quick Switch inside ASMR Corner */}
                    <button
                      type="button"
                      onClick={toggleAmbientMusic}
                      className={`px-2.5 py-1.5 rounded-[10px] border text-[10px] font-extrabold shrink-0 flex items-center gap-1.5 transition ${
                        sensoryPrefs.musicEnabled
                          ? 'bg-[#1D352E] border-[#82E59B]/60 text-[#9AF0AE]'
                          : 'bg-[#1E1B2E] border-[#383252] text-[#C8C2D8] hover:text-white'
                      }`}
                    >
                      <span>🎵</span>
                      <span>
                        {sensoryPrefs.musicEnabled
                          ? `Ambiental: ${getAmbientMusicStyleName(
                              currentObjective.accentColor
                            )} (ON)`
                          : 'Música Ambiental'}
                      </span>
                    </button>
                  </div>

                  {/* Filter Tabs + Horizontal Scroll Controls for the 16 ASMR Styles */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { id: 'all', label: `Todos (${ASMR_TEXTURES.length})` },
                        {
                          id: 'unlocked',
                          label: `✓ Mis Orbes (${
                            ASMR_TEXTURES.filter((t) => isAsmrStyleUnlocked(t))
                              .length
                          })`,
                        },
                        { id: 'taps', label: '🎯 Por Toques (4)' },
                        { id: 'skins', label: '💎 Skins Orbe (8)' },
                      ].map((tab) => {
                        const active = asmrFilterCategory === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              playUiTap(1);
                              setAsmrFilterCategory(
                                tab.id as 'all' | 'unlocked' | 'taps' | 'skins'
                              );
                            }}
                            className={`px-2 py-1 rounded-[8px] text-[10px] font-bold border transition ${
                              active
                                ? 'bg-[#24344D] border-[#64D8FF] text-white'
                                : 'bg-[#171625] border-[#2C2840] text-[#A8A3B8] hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-[#9E97B0] hidden sm:inline mr-1">
                        Desliza estilos →
                      </span>
                      <button
                        type="button"
                        onClick={() => scrollAsmrCarousel('left')}
                        aria-label="Desplazar estilos ASMR a la izquierda"
                        className="w-7 h-7 rounded-[8px] bg-[#1D1B2E] border border-[#383252] text-[#D8C5FF] hover:bg-[#2A2642] text-xs flex items-center justify-center transition"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollAsmrCarousel('right')}
                        aria-label="Desplazar estilos ASMR a la derecha"
                        className="w-7 h-7 rounded-[8px] bg-[#1D1B2E] border border-[#383252] text-[#D8C5FF] hover:bg-[#2A2642] text-xs flex items-center justify-center transition"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Scrollable 16 ASMR Orb Style Cards */}
                  <div
                    ref={asmrSkinsScrollRef}
                    className="flex items-stretch gap-2 overflow-x-auto pb-1.5 pt-0.5 scroll-smooth"
                  >
                    {ASMR_TEXTURES.filter((tex) => {
                      if (asmrFilterCategory === 'unlocked')
                        return isAsmrStyleUnlocked(tex);
                      if (asmrFilterCategory === 'taps')
                        return tex.unlockKind === 'taps';
                      if (asmrFilterCategory === 'skins')
                        return tex.unlockKind === 'gems';
                      return true;
                    }).map((tex) => {
                      const unlocked = isAsmrStyleUnlocked(tex);
                      const isSelected = asmrPreferredTexture === tex.id;
                      const tapProgPct =
                        tex.unlockKind === 'taps' && tex.requiredTaps > 0
                          ? Math.min(
                              100,
                              Math.floor((asmrTotalTaps / tex.requiredTaps) * 100)
                            )
                          : 100;

                      return (
                        <button
                          key={tex.id}
                          type="button"
                          onClick={() => handleSelectAsmrTexture(tex)}
                          style={
                            isSelected
                              ? {
                                  borderColor: tex.accentColor,
                                  boxShadow: `0 0 16px -3px ${tex.secondaryColor}`,
                                }
                              : undefined
                          }
                          className={`min-w-[148px] max-w-[164px] p-2.5 rounded-[13px] border text-left shrink-0 transition flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-[#1D253A] text-white scale-[1.02]'
                              : unlocked
                              ? 'bg-[#171625] border-[#2F2B46] text-[#E6E0F2] hover:border-[#64D8FF]/60'
                              : 'bg-[#13121E]/90 border-[#28243C] text-[#A8A3B8] hover:border-[#FFD54F]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            {/* Mini Orb Skin Preview */}
                            <div
                              style={{
                                background: tex.orbGradient,
                                borderColor: tex.accentColor,
                                boxShadow: `0 0 10px ${tex.secondaryColor}`,
                              }}
                              className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm shrink-0 ${
                                tex.ringStyle === 'dashed'
                                  ? 'border-dashed'
                                  : tex.ringStyle === 'double'
                                  ? 'border-2'
                                  : ''
                              }`}
                            >
                              {tex.emoji}
                            </div>

                            {isSelected ? (
                              <span
                                style={{
                                  color: tex.accentColor,
                                  borderColor: `${tex.accentColor}66`,
                                }}
                                className="px-1.5 py-0.5 rounded-full bg-black/40 border text-[8px] font-extrabold uppercase"
                              >
                                ✓ EN USO
                              </span>
                            ) : unlocked ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#1C3329] text-[#82E59B] text-[8px] font-extrabold">
                                ✓ LISTO
                              </span>
                            ) : tex.unlockKind === 'taps' ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#242038] border border-[#64D8FF]/40 text-[#90E0FF] text-[8px] font-mono-tabular font-extrabold">
                                🎯 {asmrTotalTaps}/{tex.requiredTaps}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#2B223C] border border-[#FFD54F]/50 text-[#FFD54F] text-[8px] font-mono-tabular font-extrabold">
                                💎 {tex.gemCost}
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="text-[11px] font-extrabold leading-tight break-words">
                              {tex.name}
                            </div>
                            <div className="text-[9px] text-[#9E97B0] leading-tight mt-0.5 break-words">
                              {tex.subtitle}
                            </div>
                          </div>

                          {!unlocked && tex.unlockKind === 'taps' && (
                            <div className="w-full h-1.5 rounded-full bg-[#221F33] overflow-hidden">
                              <div
                                style={{
                                  width: `${tapProgPct}%`,
                                  backgroundColor: tex.accentColor,
                                }}
                                className="h-full rounded-full transition-all"
                              />
                            </div>
                          )}

                          {!unlocked && tex.unlockKind === 'gems' && (
                            <div className="text-[8px] font-bold text-[#FFD54F] flex items-center justify-between pt-0.5 border-t border-white/5">
                              <span>🔊 Toca para probar</span>
                              <span>Desbloquear →</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive ASMR Clicker Stage + Harmony Progress */}
                  <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-3.5 p-3 rounded-[16px] bg-[#100F1A]/95 border border-[#2B2842]">
                    <div className="relative flex justify-center py-1">
                      {/* Floating ASMR Sparks */}
                      {asmrFloatingSparks.map((sp) => (
                        <span
                          key={sp.id}
                          style={{
                            color: sp.color,
                            transform: `translateX(${sp.xOffset}px)`,
                          }}
                          className="pointer-events-none absolute -top-3 z-20 text-[11px] font-extrabold drop-shadow animate-xp-float whitespace-nowrap"
                        >
                          {sp.text}
                        </span>
                      ))}

                      <button
                        type="button"
                        onClick={handleAsmrClick}
                        style={{
                          background: activeAsmrTextureObj.orbGradient,
                          borderColor: activeAsmrTextureObj.accentColor,
                          boxShadow: `0 0 28px -2px ${activeAsmrTextureObj.secondaryColor}`,
                        }}
                        className={`w-28 h-28 sm:w-24 sm:h-24 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 active:scale-90 hover:scale-105 transition select-none cursor-pointer relative ${
                          activeAsmrTextureObj.ringStyle === 'dashed'
                            ? 'border-dashed'
                            : activeAsmrTextureObj.ringStyle === 'double'
                            ? 'ring-2 ring-white/25'
                            : ''
                        }`}
                      >
                        <span className="text-3xl leading-none drop-shadow">
                          {activeAsmrTextureObj.emoji}
                        </span>
                        <span className="text-[10px] font-extrabold text-white tracking-wide drop-shadow">
                          TOCAR ORBE
                        </span>
                        <span
                          style={{ color: activeAsmrTextureObj.accentColor }}
                          className="text-[8px] font-extrabold uppercase tracking-wider bg-black/45 px-1.5 py-0.2 rounded-full"
                        >
                          {activeAsmrTextureObj.name}
                        </span>
                      </button>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[11px] flex-wrap">
                        <span className="font-bold text-[#E6E0F2]">
                          ✨ Cofre de Armonía ({asmrCycleProgress}/{ASMR_CYCLE_TAPS})
                        </span>
                        <span className="text-[10px] font-mono-tabular text-[#FFD54F]">
                          Faltan {ASMR_CYCLE_TAPS - asmrCycleProgress} toques
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-[#232036] overflow-hidden border border-white/5">
                        <div
                          style={{
                            width: `${(asmrCycleProgress / ASMR_CYCLE_TAPS) * 100}%`,
                            background: `linear-gradient(90deg, ${activeAsmrTextureObj.accentColor}, #FFD54F)`,
                          }}
                          className="h-full transition-all duration-150 rounded-full"
                        />
                      </div>

                      {/* Next Tap-Milestone Skin Progress Indicator */}
                      {(() => {
                        const nextTapSkin = ASMR_TEXTURES.find(
                          (t) =>
                            t.unlockKind === 'taps' &&
                            t.requiredTaps > asmrTotalTaps
                        );
                        if (!nextTapSkin) return null;
                        return (
                          <div className="flex items-center justify-between text-[10px] text-[#90E0FF] bg-[#161F30] px-2.5 py-1 rounded-[8px] border border-[#64D8FF]/25">
                            <span>
                              🎯 Próximo Orbe gratis: <strong>{nextTapSkin.emoji} {nextTapSkin.name}</strong>
                            </span>
                            <span className="font-mono-tabular font-bold">
                              {asmrTotalTaps}/{nextTapSkin.requiredTaps} toques
                            </span>
                          </div>
                        );
                      })()}

                      {lastAsmrPrizeNotice ? (
                        <div className="px-2.5 py-1.5 rounded-[9px] bg-[#242038] border border-[#FFD54F]/50 text-[10px] font-bold text-[#FFE082] flex items-center justify-between gap-2">
                          <span>{lastAsmrPrizeNotice}</span>
                          <button
                            type="button"
                            onClick={() => setLastAsmrPrizeNotice(null)}
                            className="text-xs opacity-75 hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#9E97B0] leading-snug">
                          💡 Cada 50 toques recibes +2 💎 y +10 XP (hasta {DAILY_ASMR_GEM_CAP} 💎/día para cuidar el equilibrio del juego; luego modo Zen +XP infinito).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                                className={`text-[11px] font-bold leading-snug break-words ${
                                  q.isClaimed
                                    ? 'text-[#82E59B]'
                                    : 'text-[#F4F1FF]'
                                }`}
                              >
                                {q.title}
                              </div>
                              <div className="text-[9px] text-[#A8A3B8] leading-snug break-words">
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

          {/* Statistics Section (Unified Sanctuary Bento Grid) */}
          <div
            ref={statsRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${
              highlightedSection === 'stats'
                ? 'border-[2px] border-[#C7A4FF]'
                : 'border border-[#342D4B]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-sm shrink-0">
                  📊
                </div>
                <div>
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F4F1FF] leading-tight">
                    Estadísticas de Impulso
                  </h3>
                  <p className="text-[11px] text-[#A8A3B8]">
                    Resumen claro de tu constancia y progreso
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>MOVIMIENTOS</span>
                  <span>📝</span>
                </div>
                <div className="text-[17px] font-extrabold font-mono-tabular text-[#F4F1FF]">
                  {totalEntryCount}
                </div>
                <div className="text-[10px] text-[#8F89A3] leading-tight break-words">
                  {currentObjective.entries.length} en este objetivo
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>RACHA ACTIVA</span>
                  <span>🔥</span>
                </div>
                <div className="text-[17px] font-extrabold font-mono-tabular text-[#FFC45D]">
                  {streakDays} {streakDays === 1 ? 'día' : 'días'}
                </div>
                <div className="text-[10px] text-[#8F89A3] leading-tight break-words">
                  {streakDays > 0 ? '¡Sigue sumando hoy!' : 'Registra hoy para iniciar'}
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>MAYOR IMPULSO</span>
                  <span>🚀</span>
                </div>
                <div
                  style={{ color: currentAccentTheme.primary }}
                  className="text-[16px] sm:text-[17px] font-extrabold font-mono-tabular leading-tight break-words"
                >
                  {objectiveInsights.bestEntry > 0
                    ? `+${formatObjectiveAmount(
                        objectiveInsights.bestEntry,
                        currentObjective
                      )}`
                    : '—'}
                </div>
                <div className="text-[10px] text-[#8F89A3] leading-tight break-words">
                  Mejor aporte único
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>NIVEL GUARDIÁN</span>
                  <span>✨</span>
                </div>
                <div className="text-[17px] font-extrabold font-mono-tabular text-[#D8C5FF]">
                  Nv. {level}
                </div>
                <div className="text-[10px] text-[#8F89A3] font-mono-tabular leading-tight break-words">
                  {state.gamification.totalXp} XP acumulados
                </div>
              </div>
            </div>
          </div>

          {/* Settings Section (Unified Sanctuary 2x2 Action Grid) */}
          <div
            ref={settingsRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${
              highlightedSection === 'settings'
                ? 'border-[2px] border-[#C7A4FF]'
                : 'border border-[#342D4B]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-sm shrink-0">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F4F1FF] leading-tight">
                    Ajustes del Objetivo
                  </h3>
                  <p className="text-[11px] text-[#A8A3B8]">
                    Personaliza, archiva o administra esta meta
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={toggleAmbientMusic}
                  className={`px-3 py-1.5 rounded-[11px] border text-[11px] font-bold flex items-center gap-1.5 transition ${
                    sensoryPrefs.musicEnabled
                      ? 'bg-[#1F2D2B] border-[#65DB85]/45 text-[#9AF0AE]'
                      : 'bg-[#181726] border-[#2E2A42] text-[#9E97B0]'
                  }`}
                >
                  <span>🎵</span>
                  <span>
                    {sensoryPrefs.musicEnabled
                      ? `Música (${getAmbientMusicStyleName(
                          currentObjective.accentColor
                        )}): ON`
                      : 'Música Ambiental: OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleSoundAndHaptics}
                  className={`px-3 py-1.5 rounded-[11px] border text-[11px] font-bold flex items-center gap-1.5 transition ${
                    sensoryPrefs.soundEnabled
                      ? 'bg-[#1F2D2B] border-[#65DB85]/45 text-[#9AF0AE]'
                      : 'bg-[#181726] border-[#2E2A42] text-[#9E97B0]'
                  }`}
                >
                  <span>{sensoryPrefs.soundEnabled ? '🔊' : '🔇'}</span>
                  <span>
                    {sensoryPrefs.soundEnabled
                      ? 'Sonido y Haptic: ON'
                      : 'Sonido y Haptic: OFF'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playUiTap(2);
                  setIsEditorOpen(true);
                }}
                className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] hover:border-[#635091] hover:bg-[#1C1A2E] flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[#26213B] border border-[#413663] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  🎨
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                    Personalizar objetivo
                  </div>
                  <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                    Nombre, meta, icono, fecha y premio
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTap(2);
                  setIsBannerPickerOpen(true);
                }}
                className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] hover:border-[#635091] hover:bg-[#1C1A2E] flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[#26213B] border border-[#413663] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  🖼️
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                    Fondo y encuadre
                  </div>
                  <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                    Cambiar paisaje o subir imagen
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTap(1);
                  handleArchiveCurrentObjective();
                }}
                className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] hover:border-[#635091] hover:bg-[#1C1A2E] flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[#26213B] border border-[#413663] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  📦
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                    Archivar en el baúl
                  </div>
                  <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                    Guardar sin perder su progreso
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTap(0);
                  handleDeleteObjective(currentObjective);
                }}
                className="p-2.5 rounded-[14px] bg-[#1E141C]/90 border border-[#472534] hover:border-[#853B55] hover:bg-[#291823] flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[#331B27] border border-[#5E2D41] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  🗑️
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-[#FFB8C2] leading-snug break-words">
                    Eliminar objetivo
                  </div>
                  <div className="text-[10px] text-[#C48B96] leading-snug break-words">
                    Borrar permanentemente
                  </div>
                </div>
              </button>
            </div>

            {/* Indie Sanctuary Banner + Android Release Keystore Access inside Ajustes */}
            <div className="p-3 rounded-[15px] bg-gradient-to-r from-[#241D38] via-[#1E2235] to-[#1A2926] border border-[#4A3B6E] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-extrabold text-[#F4F1FF] flex items-center gap-1.5 flex-wrap">
                  <span>💖 Creado por un Desarrollador Indie</span>
                </div>
                <p className="text-[11px] text-[#C6C0D6] leading-snug break-words">
                  Personaliza las 200 mascotas con Skins, equipa Marcos y Sonidos o activa Buffs con tus Gemas (💎 {gems}).
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => openIndieShop('skins')}
                  className="px-3 py-2 rounded-[11px] bg-gradient-to-r from-[#7549B8] to-[#9B6BFF] text-white text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition shadow"
                >
                  💎 Skins & Buffs
                </button>
                <button
                  type="button"
                  onClick={() => openIndieShop('support')}
                  className="px-3 py-2 rounded-[11px] bg-[#252138] border border-[#4A3E6D] text-[#E6D9FF] text-[11px] font-bold hover:bg-[#312B4B] transition"
                >
                  💖 Apoyar al Dev
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right History Panel */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-[320px] max-w-[86vw] lg:static lg:w-auto lg:max-w-none lg:block bg-[#171723] border-l border-[#29283C] pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pr-[max(1rem,calc(env(safe-area-inset-right,0px)+0.5rem))] pl-4 sm:p-4 flex flex-col gap-3.5 transition-transform duration-200 ${
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
          <div className="p-1 rounded-[12px] bg-[#12111C] border border-[#2B263D] grid grid-cols-3 gap-1">
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
                  className={`h-[34px] rounded-[9px] text-[11px] font-bold transition ${
                    isSelected
                      ? 'bg-[#32264D] text-white border border-[#5B4588]/60 shadow-sm'
                      : 'text-[#9E97B0] hover:text-[#E2D8FF]'
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
              <div className="text-center text-xs text-[#A8A3B8] py-10 px-4 rounded-[14px] border border-dashed border-[#2B273D] bg-[#141320]/50">
                Aún no hay movimientos registrados en esta vista.
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
                    className="p-2.5 rounded-[13px] border border-[#2B273D] bg-[#141320]/90 hover:border-[#3E3759] flex items-center gap-2.5 transition"
                  >
                    <div
                      className={`w-8 h-8 rounded-[9px] border flex items-center justify-center text-xs font-extrabold shrink-0 ${
                        isPositive
                          ? 'bg-[#162B22] border-[#65DB85]/40 text-[#82E59B]'
                          : 'bg-[#2D1822] border-[#FF7A8A]/40 text-[#FF9EAB]'
                      }`}
                    >
                      {isPositive ? '＋' : '−'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="text-[12px] font-bold text-[#F3F0FA] truncate select-copyable">
                        {entry.description}
                      </div>
                      <div className="text-[10px] text-[#9E97B0]">
                        {formatEntryTime(entry.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        color: isPositive ? '#82E59B' : '#FF8A98',
                      }}
                      className="text-[12px] font-mono-tabular font-extrabold shrink-0 select-copyable"
                    >
                      {amountFormatted}
                    </div>
                    <button
                      onClick={() => setEntryActionTarget(entry)}
                      className="w-[30px] h-[30px] text-[#B8B2C8] hover:text-white text-base flex items-center justify-center rounded-lg hover:bg-[#262238] shrink-0 transition"
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

      {/* Modal: ObjectiveEditorPage (Forja de Objetivo) */}
      {isEditorOpen && (
        <ObjectiveEditorModal
          objective={currentObjective}
          isNewDraft={isDraftObjective}
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
          skinId={equippedSkinId}
          onOpenSkins={() => {
            setIsMascotGalleryOpen(false);
            openIndieShop('skins');
          }}
          onClose={() => {
            setIsMascotGalleryOpen(false);
            setMascotGalleryStartLevel(null);
          }}
        />
      )}

      {/* Modal: Indie Sanctuary Emporium (216-Item Vault: Skins, Card FX, Sound Packs, Buffs & Indie Support) */}
      {isIndieShopOpen && (
        <IndieEmporiumModal
          initialTab={indieShopInitialTab}
          currentObjective={currentObjective}
          level={level}
          gems={gems}
          unlockedSkins={unlockedSkins}
          equippedSkinId={equippedSkinId}
          unlockedVaultIds={unlockedVaultIds}
          equippedCardFrameId={equippedCardFrameId}
          equippedCardStyleId={equippedCardStyleId}
          equippedSoundPackId={equippedSoundPackId}
          equippedTitleId={equippedTitleId}
          activeAccentColor={currentObjective.accentColor || '#65DB85'}
          activeBannerId={currentObjective.bannerId}
          streakShields={streakShields}
          isXpBoostActive={isXpBoostActive}
          xpBoostRemainingText={xpBoostRemainingText}
          isGemMagnetActive={isGemMagnetActive}
          gemMagnetRemainingText={gemMagnetRemainingText}
          isIndieFounder={isIndieFounder}
          supporterTier={supporterTier}
          lastIssuedLicenseCode={
            state.gamification.lastIssuedLicenseCode || ''
          }
          onSelectSkin={handleUnlockOrEquipSkin}
          onSelectCardCosmetic={handleSelectCardCosmetic}
          onSelectSoundPack={handleSelectSoundPack}
          onApplyVaultCardStyle={handleApplyVaultCardStyle}
          onSelectGuardianTitle={handleSelectGuardianTitle}
          onActivateBuff={handleActivateBuff}
          onPurchasePack={handlePurchaseSupportPack}
          onCustomTipSupport={handleCustomTipSupport}
          onRedeemLicenseCode={handleRedeemLicenseCode}
          onJumpToBoard={() => {
            setIsIndieShopOpen(false);
            highlightSection('objective', objectiveRef);
          }}
          onClose={() => setIsIndieShopOpen(false)}
        />
      )}

      {/* Modal: AchievementsPage */}
      {isAllAchievementsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0D0E17]/95 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-hidden">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <h2 className="text-[18px] sm:text-[21px] font-bold text-[#F4F1FF]">
                    Todos los Logros ({currentObjective.unlockedAchievementIds.length}/
                    {ACHIEVEMENT_CATALOG.length})
                  </h2>
                  <p className="text-[12px] text-[#A8A3B8]">
                    Toca cualquier medalla para conocer su historia o pista secreta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAllAchievementsOpen(false)}
                className="px-4 py-2 rounded-[11px] bg-[#252138] border border-[#3E355B] text-[#F4F1FF] text-xs sm:text-sm font-bold hover:bg-[#322C4B] transition"
              >
                ← Volver
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const isUnlocked =
                  currentObjective.unlockedAchievementIds.includes(ach.id);
                const title =
                  ach.isSecret && !isUnlocked ? 'Logro misterioso' : ach.title;
                const icon = ach.isSecret && !isUnlocked ? '❔' : ach.icon;

                return (
                  <button
                    key={ach.id}
                    onClick={() => handleAchievementClick(ach)}
                    className={`p-3.5 rounded-[16px] border text-left flex items-center gap-3 transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-[#1B312A] to-[#14221E] border-[#65DB85]/55 shadow-[0_4px_14px_rgba(101,219,133,0.12)] hover:border-[#82E59B]'
                        : 'bg-[#161522]/90 border-[#2B273D] hover:border-[#463D63]'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-[13px] border flex items-center justify-center text-[24px] shrink-0 ${
                        isUnlocked
                          ? 'bg-[#12221C] border-[#65DB85]/45'
                          : 'bg-[#1E1C2D] border-[#2E2A42] opacity-75'
                      }`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[13px] font-bold truncate ${
                            isUnlocked ? 'text-[#9AF0AE]' : 'text-[#E2D8FF]'
                          }`}
                        >
                          {title}
                        </span>
                        <span
                          className={`text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isUnlocked
                              ? 'bg-[#1E3B2E] text-[#82E59B]'
                              : 'bg-[#242036] text-[#B58BFF]'
                          }`}
                        >
                          {isUnlocked
                            ? `✓ +${ach.rewardXp} XP`
                            : `+${ach.rewardXp} XP`}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A8A3B8] line-clamp-2">
                        {ach.description}
                      </div>
                    </div>
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
  skinId,
  onSelect,
}: {
  lvl: number;
  itemTier: number;
  isSelected: boolean;
  isItemLocked: boolean;
  skinId?: string;
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
      <MascotAvatarSvg
        level={lvl}
        size={48}
        isLocked={isItemLocked}
        skinId={skinId}
      />
      <span
        className={`text-[11px] font-bold ${
          isItemLocked ? 'text-[#88839E]' : 'text-[#F4F1FF]'
        }`}
      >
        {isItemLocked ? `🔒 Nv. ${lvl}` : `Nv. ${lvl}`}
      </span>
      <span className="text-[9px] text-[#A8A3B8] leading-tight w-full text-center break-words">
        {isItemLocked ? '？？？' : MASCOT_STAGE_NAMES[itemTier]}
      </span>
    </button>
  );
});

function MascotGalleryModal({
  initialLevel,
  initialPreviewLevel,
  skinId = 'default',
  onOpenSkins,
  onClose,
}: {
  initialLevel: number;
  initialPreviewLevel?: number;
  skinId?: string;
  onOpenSkins?: () => void;
  onClose: () => void;
}) {
  const unlockedLevel = Math.max(1, initialLevel);
  const [previewLevel, setPreviewLevel] = useState<number>(() =>
    Math.min(200, Math.max(1, initialPreviewLevel ?? unlockedLevel))
  );

  const tier = Math.floor((previewLevel - 1) / 10);
  const subLevel = ((previewLevel - 1) % 10) + 1;
  const isPreviewLocked = previewLevel > unlockedLevel;
  const activeSkin = findMascotSkin(skinId);

  return (
    <div className="fixed inset-0 z-50 bg-[#11121C] flex flex-col p-3 sm:p-[18px] overflow-hidden">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-3 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#C7A4FF]">
              🎯 OBJECTIVE REACHER · SANTUARIO
            </div>
            <h2 className="text-[16px] sm:text-[20px] font-bold text-[#F4F1FF] leading-snug break-words">
              🐾 Códice de Mascotas (1–200)
            </h2>
            <p className="text-[11px] sm:text-[12px] text-[#A8A3B8] leading-snug">
              Arrastra la barra del 1 al 200 o toca una criatura para escuchar su voz.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenSkins && (
              <button
                onClick={onOpenSkins}
                className="px-3 py-2 rounded-[10px] bg-[#28203F] border border-[#65499C] text-[#E6D9FF] text-xs font-extrabold hover:border-[#FFD54F] transition"
              >
                {activeSkin.emoji} Skins
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-sm font-medium hover:bg-[#3e335c] shrink-0"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Interactive Slider Preview (Portrait-friendly wrapping) */}
        <div className="p-3 sm:p-3.5 rounded-[18px] border border-[#342D4B] bg-gradient-to-b from-[#1E1C2E] to-[#171624] flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!isPreviewLocked) {
                playMascotVoice(previewLevel, false);
              } else {
                playUiTap(0);
              }
            }}
            title={
              isPreviewLocked
                ? 'Criatura aún bloqueada'
                : 'Toca para escuchar la voz sintetizada de esta especie'
            }
            className="shrink-0 relative group focus:outline-none"
          >
            <div className="animate-mascot-float">
              <MascotAvatarSvg
                level={previewLevel}
                size={80}
                isLocked={isPreviewLocked}
                skinId={skinId}
              />
            </div>
            {!isPreviewLocked && (
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#262238] border border-[#51436C] text-[9px] font-bold text-[#D8C5FF] group-hover:scale-105 transition">
                🔊 Voz
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="text-[13px] sm:text-[16px] font-bold text-[#D8C5FF] leading-snug break-words">
                {isPreviewLocked
                  ? `🔒 Nivel ${previewLevel} · Criatura Misteriosa`
                  : `✨ Nivel ${previewLevel} · ${MASCOT_STAGE_NAMES[tier]}`}
              </div>
              <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[#302747] text-[#E6D9FF] whitespace-nowrap shrink-0">
                Etapa {tier + 1}/20 · Evol. {subLevel}/10{' '}
                {isPreviewLocked ? '🔒' : '✓'}
              </span>
            </div>
            <div className="text-[11px] text-[#C7A4FF] leading-snug break-words">
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
                skinId={skinId}
                onSelect={(selectedLvl) => {
                  setPreviewLevel(selectedLvl);
                  if (selectedLvl <= unlockedLevel) {
                    playMascotVoice(selectedLvl, false);
                  } else {
                    playUiTap(0);
                  }
                }}
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
  skinId = 'default',
}: {
  level: number;
  size?: number;
  isLocked?: boolean;
  skinId?: string;
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
  const activeSkin = findMascotSkin(skinId);
  const [realPrimary, realSecondary, realAccent, realGlow] =
    !isLocked && activeSkin.paletteOverride
      ? activeSkin.paletteOverride
      : palettes[tier] || palettes[0];

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
      {!isLocked && activeSkin.id !== 'default' && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={radius * 0.98}
            fill="none"
            stroke={activeSkin.auraRingColor}
            strokeWidth={1.5}
            strokeDasharray="3.5 2.5"
            opacity={0.85}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius * 0.84}
            fill="none"
            stroke={activeSkin.auraSecondaryColor}
            strokeWidth={0.9}
            opacity={0.55}
          />
        </>
      )}
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

function doTitlesShareCoreMeaning(oldTitle: string, newTitle: string): boolean {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

  const a = clean(oldTitle);
  const b = clean(newTitle);
  if (a.length === 0 || b.length === 0) return true;
  if (
    oldTitle.trim().toLowerCase() === 'mi objetivo' ||
    oldTitle.trim().toLowerCase().startsWith('objetivo ')
  ) {
    return true;
  }
  return a.some((w) => b.includes(w));
}

function ObjectiveEditorModal({
  objective,
  isNewDraft = false,
  onCancel,
  onSave,
  onAlert,
}: {
  objective: Objective;
  isNewDraft?: boolean;
  onCancel: () => void;
  onSave: (
    input: {
      title: string;
      description: string;
      goalAmount: number;
      unitId: string;
      customUnitLabel: string;
      icon: string;
      category: string;
      accentColor: string;
      bannerId: string;
      targetDate: string;
      pledge: string;
    },
    saveMode?: 'update_keep' | 'create_new' | 'overwrite_reset'
  ) => void;
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
  const [icon, setIcon] = useState(objective.icon || '🎯');
  const [category, setCategory] = useState(objective.category || 'Personal');
  const [accentColor, setAccentColor] = useState(
    objective.accentColor || '#65DB85'
  );
  const [bannerId, setBannerId] = useState(objective.bannerId || 'gradient');
  const [targetDate, setTargetDate] = useState(objective.targetDate || '');
  const [pledge, setPledge] = useState(objective.pledge || '');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Smart Guard states to prevent accidentally corrupting an objective that already has history
  const hasRecordedHistory =
    !isNewDraft && (objective.entries.length > 0 || objective.currentAmount > 0);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [identityShiftPrompt, setIdentityShiftPrompt] = useState<{
    reason: string;
    payload: {
      title: string;
      description: string;
      goalAmount: number;
      unitId: string;
      customUnitLabel: string;
      icon: string;
      category: string;
      accentColor: string;
      bannerId: string;
      targetDate: string;
      pledge: string;
    };
  } | null>(null);

  const isGoalNumeric =
    goalAmountText.trim() === '' ||
    !Number.isNaN(Number(goalAmountText.replace(',', '.')));

  const parsedGoal = useMemo(() => {
    const n = Number(goalAmountText.replace(',', '.'));
    return !Number.isNaN(n) && n > 0
      ? clampSafeAmount(n, 1, MAX_SAFE_AMOUNT)
      : 1000;
  }, [goalAmountText]);

  const previewObjective: Objective = useMemo(
    () => ({
      ...objective,
      title: title.trim() || 'Tu Próxima Gran Meta',
      description: description.trim(),
      goalAmount: parsedGoal,
      unitId,
      customUnitLabel,
      icon,
      category: category.trim() || 'Personal',
      accentColor,
      bannerId,
      targetDate,
      pledge: pledge.trim(),
    }),
    [
      objective,
      title,
      description,
      parsedGoal,
      unitId,
      customUnitLabel,
      icon,
      category,
      accentColor,
      bannerId,
      targetDate,
      pledge,
    ]
  );

  const previewPreset = useMemo(
    () => findBannerPreset(bannerId),
    [bannerId]
  );
  const previewAccentTheme = useMemo(
    () => findAccentTheme(accentColor),
    [accentColor]
  );
  const customBannerUrl = bannerId.startsWith('custom:')
    ? bannerId.slice('custom:'.length)
    : null;
  const previewBannerImg = customBannerUrl || previewPreset.imageUrl;

  const dailyPacePreview = useMemo(() => {
    if (!targetDate) return null;
    const [y, m, d] = targetDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    const target = new Date(y, m - 1, d, 23, 59, 59);
    const diffDays = Math.ceil(
      (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 0) return null;
    const rem = Math.max(0, parsedGoal - objective.currentAmount);
    return {
      days: diffDays,
      perDay: formatObjectiveAmount(rem / diffDays, previewObjective),
    };
  }, [targetDate, parsedGoal, objective.currentAmount, previewObjective]);

  const applyFullTemplateFields = (tplId: string) => {
    const tpl = OBJECTIVE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setActiveTemplateId(tplId);
    if (tpl.title) setTitle(tpl.title);
    setDescription(tpl.description);
    setIcon(tpl.icon);
    setCategory(tpl.category);
    setGoalAmountText(String(tpl.goalAmount));
    setUnitId(tpl.unitId);
    setCustomUnitLabel(tpl.customUnitLabel);
    setBannerId(tpl.bannerId);
    setAccentColor(tpl.accentColor);
    setPledge(tpl.pledge);
    setPendingTemplateId(null);
  };

  const applyVisualStyleOnly = (tplId: string) => {
    const tpl = OBJECTIVE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    playUiTap(2);
    setActiveTemplateId(tplId);
    setIcon(tpl.icon);
    setBannerId(tpl.bannerId);
    setAccentColor(tpl.accentColor);
    setPendingTemplateId(null);
  };

  const applyTemplate = (tplId: string) => {
    playUiTap(1);
    if (hasRecordedHistory && tplId !== 'custom') {
      setPendingTemplateId(tplId);
      return;
    }
    applyFullTemplateFields(tplId);
  };

  const buildPayload = () => {
    const parsed = clampSafeAmount(
      Number(goalAmountText.replace(',', '.')),
      1,
      MAX_SAFE_AMOUNT
    );
    return {
      title,
      description,
      goalAmount: parsed,
      unitId,
      customUnitLabel,
      icon,
      category,
      accentColor,
      bannerId,
      targetDate,
      pledge,
    };
  };

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
    if (parsed > MAX_SAFE_AMOUNT) {
      setGoalAmountText(String(MAX_SAFE_AMOUNT));
      onAlert(
        'Meta máxima alcanzada',
        `Por seguridad visual y diseño responsive, la meta máxima es ${MAX_SAFE_AMOUNT.toLocaleString(
          'es-ES'
        )}.`
      );
      return;
    }
    if (unitId === CUSTOM_UNIT_ID && !customUnitLabel.trim()) {
      onAlert(
        'Falta la unidad',
        'Escribe una unidad como $, kg, libros o sesiones.'
      );
      return;
    }

    const payload = buildPayload();

    // Smart Identity Shift Detection when editing an objective that already has entries
    if (hasRecordedHistory) {
      const oldUnitLabel =
        objective.unitId === CUSTOM_UNIT_ID
          ? (objective.customUnitLabel || '').trim()
          : objective.unitId;
      const newUnitLabel =
        unitId === CUSTOM_UNIT_ID ? customUnitLabel.trim() : unitId;

      const unitChanged =
        oldUnitLabel.toLowerCase() !== newUnitLabel.toLowerCase();
      const titleRadicallyChanged = !doTitlesShareCoreMeaning(
        objective.title,
        title
      );

      if (unitChanged || titleRadicallyChanged) {
        playUiTap(0);
        const reason =
          unitChanged && titleRadicallyChanged
            ? `Cambiaste «${objective.title}» (${oldUnitLabel || 'unidad anterior'}) por «${title.trim()}» (${newUnitLabel || 'nueva unidad'}).`
            : unitChanged
            ? `Cambiaste la unidad de «${oldUnitLabel}» a «${newUnitLabel}» en una tarjeta que ya tiene registros.`
            : `Cambiaste el objetivo «${objective.title}» por «${title.trim()}», una meta distinta.`;

        setIdentityShiftPrompt({ reason, payload });
        return;
      }
    }

    onSave(payload, 'update_keep');
  };

  const pendingTemplate = useMemo(
    () => OBJECTIVE_TEMPLATES.find((t) => t.id === pendingTemplateId) || null,
    [pendingTemplateId]
  );
  const getModalHorizontalScrollProps = useHorizontalScrollProps();

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0E18]/95 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        style={{ borderColor: `${previewAccentTheme.primary}45` }}
        className="w-full max-w-2xl rounded-[24px] border bg-[#171625] p-4 sm:p-6 space-y-4 my-auto shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[20px] sm:text-[24px] font-extrabold text-[#F4F1FF] flex items-center gap-2">
              <span>{isNewDraft ? '＋ Crear Nuevo Objetivo' : '🎨 Personalizar Objetivo'}</span>
            </h2>
            <p className="text-[12px] text-[#A8A3B8]">
              {isNewDraft
                ? 'Elige una plantilla prediseñada o crea tu meta a medida con sintonía total de color.'
                : 'Personaliza colores, fondo, fecha meta o premio. Si cambias de meta, protegemos tu historial.'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-[11px] bg-[#262338] text-[#D8C5FF] hover:text-white flex items-center justify-center text-lg shrink-0"
          >
            ×
          </button>
        </div>

        {/* 1-Tap Inspiration Templates (11 Pre-designed Harmonious Styles) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div
              style={{ color: previewAccentTheme.primary }}
              className="text-[10px] font-extrabold uppercase tracking-wider"
            >
              ⚡ Estilos y Plantillas Prediseñadas ({OBJECTIVE_TEMPLATES.length})
            </div>
            {hasRecordedHistory && (
              <span className="text-[10px] text-[#A8A3B8]">
                💡 Al tocar una plantilla podrás elegir solo su estilo o crear un objetivo nuevo
              </span>
            )}
          </div>
          <div
            {...getModalHorizontalScrollProps()}
            className="flex gap-2 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
          >
            {OBJECTIVE_TEMPLATES.map((tpl) => {
              const isSelected = activeTemplateId === tpl.id;
              const tplTheme = findAccentTheme(tpl.accentColor);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  style={
                    isSelected
                      ? {
                          borderColor: tplTheme.primary,
                          backgroundColor: tplTheme.surfaceDark,
                          boxShadow: `0 4px 12px -4px ${tplTheme.glow}`,
                        }
                      : undefined
                  }
                  className={`px-3 py-2 rounded-[12px] border text-left shrink-0 transition flex items-center gap-2 ${
                    isSelected
                      ? 'text-white'
                      : 'bg-[#1F1E2E] border-[#2E2B42] text-[#D8D1E5] hover:bg-[#28253B]'
                  }`}
                >
                  <span className="text-base">{tpl.icon}</span>
                  <div>
                    <div className="text-[11px] font-bold leading-tight">
                      {tpl.label.replace(/^[^\s]+\s/, '')}
                    </div>
                    <div
                      style={{
                        color: isSelected ? tplTheme.textSoft : '#9E97B0',
                      }}
                      className="text-[9px]"
                    >
                      {tpl.category}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inline Smart Guard when clicking a Template on an Objective with History */}
          {pendingTemplate && (
            <div className="p-3.5 rounded-[16px] bg-gradient-to-r from-[#28203E] via-[#211C34] to-[#1A2628] border border-[#FFD54F]/65 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold text-[#FFD54F] flex items-center gap-1.5">
                    <span>💡 ¿Estás queriendo crear un Nuevo Objetivo en realidad?</span>
                  </div>
                  <p className="text-[11px] text-[#E6E0F2] leading-snug">
                    Tu tarjeta actual <strong>«{objective.title}»</strong> ya tiene{' '}
                    <strong>{objective.entries.length} registros</strong> (
                    {formatObjectiveAmount(objective.currentAmount, objective)}). Si la
                    reemplazas por <strong>«{pendingTemplate.title || pendingTemplate.label}»</strong>,
                    los ingresos y egresos anteriores no corresponderían.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingTemplateId(null)}
                  className="text-xs text-[#A8A3B8] hover:text-white px-1.5"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSave(
                      {
                        title: pendingTemplate.title || 'Nuevo Objetivo',
                        description: pendingTemplate.description,
                        goalAmount: pendingTemplate.goalAmount,
                        unitId: pendingTemplate.unitId,
                        customUnitLabel: pendingTemplate.customUnitLabel,
                        icon: pendingTemplate.icon,
                        category: pendingTemplate.category,
                        accentColor: pendingTemplate.accentColor,
                        bannerId: pendingTemplate.bannerId,
                        targetDate: '',
                        pledge: pendingTemplate.pledge,
                      },
                      'create_new'
                    );
                  }}
                  className="px-3 py-2 rounded-[10px] bg-gradient-to-r from-[#E5B945] to-[#FFD54F] text-[#1A1305] text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition shadow"
                >
                  ✨ Crear como Nuevo Objetivo
                </button>

                <button
                  type="button"
                  onClick={() => applyVisualStyleOnly(pendingTemplate.id)}
                  className="px-3 py-2 rounded-[10px] bg-[#2D2546] border border-[#8C5CE0]/60 text-[#F4F1FF] text-[11px] font-bold hover:bg-[#392F59] transition"
                >
                  🎨 Usar solo sus Colores y Fondo
                </button>

                <button
                  type="button"
                  onClick={() => applyFullTemplateFields(pendingTemplate.id)}
                  className="px-3 py-2 rounded-[10px] bg-[#1D1B2B] border border-[#383350] text-[#C8C2D8] text-[11px] font-medium hover:text-white transition"
                >
                  ✏️ Cargar datos aquí igualmente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Interactive Mini-Hero Card Preview with Full Chromatic Harmony (Portrait-First layout so text never squeezes into 2 words per line) */}
        <div
          style={{
            background: `linear-gradient(135deg, ${previewPreset.startColor}, ${previewPreset.endColor})`,
            borderColor: `${previewAccentTheme.primary}80`,
            boxShadow: `0 8px 24px -6px ${previewAccentTheme.glow}`,
          }}
          className="relative rounded-[18px] border p-3.5 sm:p-4 overflow-hidden transition-all"
        >
          {previewBannerImg && (
            <img
              src={previewBannerImg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none"
            />
          )}
          <div
            style={{ background: previewAccentTheme.vignetteGradient }}
            className="absolute inset-0 pointer-events-none transition-all duration-300"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div
                style={{
                  borderColor: previewAccentTheme.primary,
                  backgroundColor: previewAccentTheme.surfaceDark,
                  boxShadow: `0 0 12px ${previewAccentTheme.softBg}`,
                }}
                className="w-11 h-11 rounded-[14px] border flex items-center justify-center text-[22px] shrink-0"
              >
                {icon}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    style={{
                      color: previewAccentTheme.primary,
                      backgroundColor: previewAccentTheme.softBg,
                      borderColor: `${previewAccentTheme.primary}55`,
                    }}
                    className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase border"
                  >
                    {previewObjective.category}
                  </span>
                  <span
                    style={{ color: previewAccentTheme.textMuted }}
                    className="text-[10px] font-semibold"
                  >
                    · {previewAccentTheme.name} + {previewPreset.name}
                  </span>
                </div>
                <div className="text-[16px] sm:text-[18px] font-extrabold text-white leading-snug break-words">
                  {previewObjective.title}
                </div>
                <div
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-[11px] sm:text-[12px] leading-snug break-words"
                >
                  {previewObjective.pledge
                    ? `🎁 Premio: ${previewObjective.pledge}`
                    : previewObjective.description ||
                      'Vista previa en vivo con sintonía cromática completa'}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: previewAccentTheme.surfaceDark,
                borderColor: `${previewAccentTheme.primary}45`,
              }}
              className="w-full sm:w-auto sm:shrink-0 px-3 py-2 rounded-[12px] border flex sm:flex-col items-center sm:items-end justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-[9px] font-extrabold uppercase tracking-wider"
                >
                  META FINAL
                </span>
                {dailyPacePreview && (
                  <span className="text-[9px] text-[#FFE082] font-semibold">
                    · ⏳ {dailyPacePreview.days}d ({dailyPacePreview.perDay}/día)
                  </span>
                )}
              </div>
              <div
                style={{ color: previewAccentTheme.primary }}
                className="text-[15px] sm:text-[17px] font-extrabold font-mono-tabular leading-tight"
              >
                {formatObjectiveAmount(parsedGoal, previewObjective)}
              </div>
            </div>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 min-w-0">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="block w-full text-xs font-semibold leading-snug"
            >
              Nombre del objetivo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Viaje a Japón, Fondo de Paz…"
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="space-y-1 min-w-0">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="block w-full text-xs font-semibold leading-snug"
            >
              Categoría / Etiqueta
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Finanzas, Aventura, Salud, Hábito…"
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="space-y-1">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span>Monto o cantidad meta</span>
              <span className="text-[10px] opacity-75 font-mono-tabular">
                Máx. 999.999.999
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={goalAmountText}
              onChange={(e) => {
                const rawVal = e.target.value.replace(/[^0-9.,]/g, '');
                const num = Number(rawVal.replace(',', '.'));
                if (!Number.isNaN(num) && num > MAX_SAFE_AMOUNT) {
                  setGoalAmountText(String(MAX_SAFE_AMOUNT));
                } else {
                  setGoalAmountText(rawVal);
                }
              }}
              placeholder="1000"
              style={{ color: isGoalNumeric ? '#F4F1FF' : '#FF4500' }}
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-sm font-mono-tabular border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label
                style={{ color: previewAccentTheme.textSoft }}
                className="text-xs font-semibold"
              >
                Unidad
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full h-10 px-2.5 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-xs border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
              >
                {OBJECTIVE_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            {unitId === CUSTOM_UNIT_ID ? (
              <div className="space-y-1">
                <label
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-xs font-semibold"
                >
                  Símbolo / Sufijo
                </label>
                <input
                  type="text"
                  value={customUnitLabel}
                  onChange={(e) => setCustomUnitLabel(e.target.value)}
                  placeholder="$, km, libros…"
                  className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-xs font-semibold"
                >
                  Fecha límite (opc.)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-xs border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Motivation, Pledge & Optional Target Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="text-xs font-semibold"
            >
              Propósito (¿Por qué es importante?)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Vivir una experiencia inolvidable…"
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#FFE082]">
              🎁 Tu premio o promesa al lograrlo
            </label>
            <input
              type="text"
              value={pledge}
              onChange={(e) => setPledge(e.target.value)}
              placeholder="Ej. Cena especial, día libre, festejar…"
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#FFD54F]"
            />
          </div>
        </div>

        {unitId === CUSTOM_UNIT_ID && (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-[12px] bg-[#12111D] border border-[#29263E]">
            <div className="text-xs text-[#C8C2D6]">
              ⏳ <strong>Fecha meta (opcional)</strong>: calcula tu ritmo diario sugerido
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-9 px-2.5 rounded-[9px] bg-[#1C1B2B] text-[#F4F1FF] text-xs border border-[#383350]"
            />
          </div>
        )}

        {/* Visual Identity: Icon + Accent Color + Atmospheric Banner */}
        <div className="space-y-3 pt-1 border-t border-[#29263E]">
          {/* Icon Picker */}
          <div className="space-y-1.5">
            <div
              style={{ color: previewAccentTheme.primary }}
              className="text-[11px] font-bold"
            >
              EMBLEMA DEL OBJETIVO
            </div>
            <div
              {...getModalHorizontalScrollProps()}
              className="flex items-center gap-1.5 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
            >
              {OBJECTIVE_ICONS.map((ic) => {
                const isSelected = icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    style={
                      isSelected
                        ? {
                            borderColor: previewAccentTheme.primary,
                            backgroundColor: previewAccentTheme.surfaceDark,
                          }
                        : undefined
                    }
                    className={`w-9 h-9 rounded-[10px] border text-lg flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? 'scale-110 shadow'
                        : 'bg-[#12111D] border-[#28253B] hover:bg-[#1E1C2E]'
                    }`}
                  >
                    {ic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color & Banner Preset Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div
                style={{ color: previewAccentTheme.primary }}
                className="text-[11px] font-bold flex items-center justify-between"
              >
                <span>COLOR DE ENERGÍA (SINTONÍA TOTAL)</span>
                <span className="text-[10px] opacity-90">
                  {previewAccentTheme.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {OBJECTIVE_ACCENT_THEMES.map((theme) => {
                  const isSelected = accentColor === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        playUiTap(1);
                        setAccentColor(theme.id);
                      }}
                      style={{
                        backgroundColor: theme.primary,
                        boxShadow: isSelected
                          ? `0 0 0 3px #171625, 0 0 0 5px ${theme.primary}`
                          : undefined,
                      }}
                      title={theme.name}
                      className={`w-7 h-7 rounded-full transition ${
                        isSelected ? 'scale-110' : 'opacity-75 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div
                style={{ color: previewAccentTheme.primary }}
                className="text-[11px] font-bold flex items-center justify-between"
              >
                <span>ATMÓSFERA DE FONDO ({BANNER_PRESETS.length})</span>
                <span className="text-[10px] opacity-90">
                  {previewPreset.name}
                </span>
              </div>
              <div
                {...getModalHorizontalScrollProps()}
                className="flex items-center gap-1.5 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
              >
                {BANNER_PRESETS.map((preset) => {
                  const isSelected = bannerId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        playUiTap(1);
                        setBannerId(preset.id);
                      }}
                      style={{
                        background: `linear-gradient(135deg, ${preset.startColor}, ${preset.endColor})`,
                        borderColor: isSelected
                          ? previewAccentTheme.primary
                          : '#383350',
                      }}
                      className={`px-2.5 py-1.5 rounded-[10px] border text-[11px] font-bold text-white shrink-0 flex items-center gap-1 transition ${
                        isSelected ? 'scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Identity Shift Confirmation Overlay when saving a radically changed card with history */}
        {identityShiftPrompt && (
          <div className="p-4 rounded-[18px] bg-[#1D182E] border-2 border-[#FFD54F] space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-[#FFD54F] flex items-center gap-1.5">
                <span>⚠️ ¿No estarás queriendo crear un Nuevo Objetivo?</span>
              </div>
              <p className="text-xs text-[#F0EAF8] leading-relaxed">
                {identityShiftPrompt.reason} Como esta tarjeta ya tiene{' '}
                <strong>{objective.entries.length} movimientos registrados</strong> (
                {formatObjectiveAmount(objective.currentAmount, objective)}), los valores
                ingresados y egresados anteriores no corresponderían del todo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() =>
                  onSave(identityShiftPrompt.payload, 'create_new')
                }
                className="w-full py-2.5 px-3 rounded-[11px] bg-gradient-to-r from-[#E5B945] to-[#FFD54F] text-[#1A1305] text-xs font-extrabold hover:brightness-110 active:scale-95 transition shadow text-left flex items-center justify-between"
              >
                <span>
                  ✨ Sí, crear «{identityShiftPrompt.payload.title.trim()}» como Nuevo Objetivo
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-black/15">
                  Conservar «{objective.title}» intacto
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSave(identityShiftPrompt.payload, 'overwrite_reset')
                }
                className="w-full py-2.5 px-3 rounded-[11px] bg-[#33223A] border border-[#FF8A65]/50 text-[#FFD8CC] text-xs font-bold hover:bg-[#422B4B] transition text-left flex items-center justify-between"
              >
                <span>
                  🧹 Transformar esta tarjeta y reiniciar su historial a 0
                </span>
                <span className="text-[10px] opacity-80">Empezar limpio</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSave(identityShiftPrompt.payload, 'update_keep')
                }
                className="w-full py-2 px-3 rounded-[11px] bg-[#252238] border border-[#3E385B] text-[#C8C2D8] text-xs font-medium hover:text-white transition text-left"
              >
                ✏️ Solo actualizar los datos conservando el saldo e historial actual (
                {formatObjectiveAmount(objective.currentAmount, objective)})
              </button>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-[12px] bg-[#28253B] text-[#F4F1FF] font-medium hover:bg-[#34304C] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              background: `linear-gradient(90deg, ${previewAccentTheme.secondary}, ${previewAccentTheme.primary})`,
              color: previewAccentTheme.buttonText,
              boxShadow: `0 4px 16px -2px ${previewAccentTheme.glow}`,
            }}
            className="h-11 rounded-[12px] font-extrabold hover:brightness-110 active:scale-95 transition"
          >
            {isNewDraft ? '🚀 Crear Objetivo' : '✓ Guardar Cambios'}
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
    if (parsed > MAX_SAFE_AMOUNT) {
      setAmountText(String(MAX_SAFE_AMOUNT));
      onAlert(
        'Importe máximo superado',
        `El importe máximo permitido es ${MAX_SAFE_AMOUNT.toLocaleString(
          'es-ES'
        )}.`
      );
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

function IndieEmporiumModal({
  initialTab,
  currentObjective,
  level,
  gems,
  unlockedSkins,
  equippedSkinId,
  unlockedVaultIds,
  equippedCardFrameId,
  equippedCardStyleId,
  equippedSoundPackId,
  equippedTitleId,
  activeAccentColor,
  activeBannerId,
  streakShields,
  isXpBoostActive,
  xpBoostRemainingText,
  isGemMagnetActive,
  gemMagnetRemainingText,
  isIndieFounder,
  supporterTier,
  lastIssuedLicenseCode,
  onSelectSkin,
  onSelectCardCosmetic,
  onSelectSoundPack,
  onApplyVaultCardStyle,
  onSelectGuardianTitle,
  onActivateBuff,
  onPurchasePack,
  onCustomTipSupport,
  onRedeemLicenseCode,
  onJumpToBoard,
  onClose,
}: {
  initialTab: 'skins' | 'cards_audio' | 'buffs' | 'support';
  currentObjective: Objective;
  level: number;
  gems: number;
  unlockedSkins: string[];
  equippedSkinId: string;
  unlockedVaultIds: string[];
  equippedCardFrameId: string;
  equippedCardStyleId?: string;
  equippedSoundPackId: string;
  equippedTitleId: string;
  activeAccentColor: string;
  activeBannerId: string;
  streakShields: number;
  isXpBoostActive: boolean;
  xpBoostRemainingText: string;
  isGemMagnetActive: boolean;
  gemMagnetRemainingText: string;
  isIndieFounder: boolean;
  supporterTier: 'none' | 'coffee' | 'founder';
  lastIssuedLicenseCode: string;
  onSelectSkin: (skin: MascotSkinDefinition) => void;
  onSelectCardCosmetic: (cosmetic: CardCosmeticDefinition) => void;
  onSelectSoundPack: (pack: SoundPackCatalogItem) => void;
  onApplyVaultCardStyle: (styleItem: CardStyleVaultItem) => void;
  onSelectGuardianTitle: (titleItem: GuardianTitleItem) => void;
  onActivateBuff: (buff: SanctuaryBuffDefinition) => void;
  onPurchasePack: (
    pack: IndieSupportPack,
    gateway: PaymentGatewayChoice
  ) => void;
  onCustomTipSupport: (
    usdAmount: number,
    gateway: PaymentGatewayChoice
  ) => void;
  onRedeemLicenseCode: (
    code: string
  ) => Promise<{ ok: boolean; message: string }>;
  onJumpToBoard: () => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    'skins' | 'cards_audio' | 'buffs' | 'support'
  >(initialTab);
  const [vaultSubTab, setVaultSubTab] = useState<
    'frames' | 'sounds' | 'styles' | 'titles'
  >('frames');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewSkinId, setPreviewSkinId] = useState<string>(equippedSkinId);
  const [previewMascotLevel, setPreviewMascotLevel] = useState<number>(level);

  // Track which sound step (0..4) was most recently auditioned for each Sound Pack
  const [auditionedPackSteps, setAuditionedPackSteps] = useState<
    Record<string, { stepIndex: number; stepLabel: string }>
  >({});

  // Live feedback banner when user equips/buys a Card Style, Frame, Sound Pack, or Title
  const [liveEquippedNotice, setLiveEquippedNotice] = useState<{
    id: number;
    emoji: string;
    title: string;
    subtitle: string;
    color: string;
  } | null>(null);

  // PedidosYa-style Editable Donation / Tip state + Dual Payment Gateway Selector
  const [tipAmountText, setTipAmountText] = useState<string>('2.00');
  const [isCustomTipEditing, setIsCustomTipEditing] = useState<boolean>(false);
  const tipCustomInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedGateway, setSelectedGateway] =
    useState<PaymentGatewayChoice>('mercadopago');
  const [mpArsRate, setMpArsRate] = useState<number>(1250);
  const [gatewayConfigStatus, setGatewayConfigStatus] = useState<{
    mpReady: boolean;
    globalReady: boolean;
  }>({ mpReady: false, globalReady: false });
  const [licenseInputText, setLicenseInputText] = useState<string>('');
  const [licenseFeedback, setLicenseFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [copiedCodeNotice, setCopiedCodeNotice] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/payments/config-status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.mercadopago?.usdToArsRate) {
          setMpArsRate(Number(data.mercadopago.usdToArsRate));
        }
        setGatewayConfigStatus({
          mpReady: Boolean(data?.mercadopago?.ready),
          globalReady: Boolean(data?.globalGateway?.ready),
        });
      })
      .catch(() => {
        // Fallback silencioso
      });
  }, []);

  useEffect(() => {
    setPreviewSkinId(equippedSkinId);
  }, [equippedSkinId]);

  const previewSkin = findMascotSkin(previewSkinId);
  const previewTier = Math.floor(
    (Math.min(200, Math.max(1, previewMascotLevel)) - 1) / 10
  );

  // Live Card & Audio Stage derived state
  const liveAccentTheme = useMemo(
    () => findAccentTheme(activeAccentColor),
    [activeAccentColor]
  );
  const liveBannerPreset = useMemo(
    () => findBannerPreset(activeBannerId),
    [activeBannerId]
  );
  const liveCustomBannerUrl = activeBannerId.startsWith('custom:')
    ? activeBannerId.slice('custom:'.length)
    : null;
  const liveBannerImg = liveCustomBannerUrl || liveBannerPreset.imageUrl;
  const liveFrameCosmetic = useMemo(
    () => findCardCosmetic(equippedCardFrameId),
    [equippedCardFrameId]
  );
  const liveStyleItem = useMemo(
    () =>
      findCardStyleVaultItem(
        equippedCardStyleId,
        activeAccentColor,
        activeBannerId
      ),
    [equippedCardStyleId, activeAccentColor, activeBannerId]
  );
  const liveSoundPackItem = useMemo(
    () =>
      SOUND_PACKS.find((s) => s.id === equippedSoundPackId) || SOUND_PACKS[0],
    [equippedSoundPackId]
  );
  const liveGuardianTitleItem = useMemo(
    () => findGuardianTitle(equippedTitleId),
    [equippedTitleId]
  );
  const liveObjProgressPct =
    currentObjective.goalAmount > 0
      ? Math.min(
          100,
          Math.floor(
            (currentObjective.currentAmount / currentObjective.goalAmount) * 100
          )
        )
      : 0;

  const handleAuditionSoundPack = (packId: string, forcedStep?: number) => {
    const res = playSoundPackPreview(packId, forcedStep);
    setAuditionedPackSteps((prev) => ({
      ...prev,
      [packId]: { stepIndex: res.stepIndex, stepLabel: res.stepLabel },
    }));
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesFilterAndSearch = (
    name: string,
    subtitle: string,
    gemCost: number
  ) => {
    if (tierFilter === 'free' && gemCost > 0) return false;
    if (tierFilter === 'premium' && gemCost === 0) return false;
    if (!normalizedSearch) return true;
    return (
      name.toLowerCase().includes(normalizedSearch) ||
      subtitle.toLowerCase().includes(normalizedSearch)
    );
  };

  const filteredSkins = useMemo(
    () =>
      MASCOT_SKINS.filter((s) =>
        matchesFilterAndSearch(s.name, s.subtitle, s.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredFrames = useMemo(
    () =>
      CARD_COSMETICS.filter((c) =>
        matchesFilterAndSearch(c.name, c.subtitle, c.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredSounds = useMemo(
    () =>
      SOUND_PACKS.filter((s) =>
        matchesFilterAndSearch(
          `${s.name} ${s.scaleName}`,
          s.subtitle,
          s.gemCost
        )
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredStyles = useMemo(
    () =>
      CARD_STYLE_VAULT.filter((st) =>
        matchesFilterAndSearch(st.name, st.subtitle, st.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredTitles = useMemo(
    () =>
      GUARDIAN_TITLES.filter((t) =>
        matchesFilterAndSearch(t.title, t.subtitle, t.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredBuffs = useMemo(
    () =>
      SANCTUARY_BUFFS.filter((b) =>
        matchesFilterAndSearch(b.name, b.description, b.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const parsedTipUsd = useMemo(() => {
    const n = Number(tipAmountText.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0) return 0;
    return Math.min(500, n);
  }, [tipAmountText]);

  const tipRewardGems = Math.round(Math.max(0.5, parsedTipUsd) * 140);
  const tipRewardShields = Math.max(1, Math.floor(Math.max(0.5, parsedTipUsd) / 1.5));
  const tipUnlocksFounder = parsedTipUsd >= 4.99;

  const adjustTipBy = (delta: number) => {
    playUiTap(2);
    const next = Math.max(0.5, Math.min(500, (parsedTipUsd || 2) + delta));
    setTipAmountText(next.toFixed(2));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0E17]/96 backdrop-blur-md flex flex-col overflow-hidden">
      {/* Pinned Top Header + Navigation Bar */}
      <div className="w-full bg-[#131221]/95 border-b border-[#2C2742] px-3 sm:px-5 pt-3 pb-2.5 shrink-0">
        <div className="max-w-5xl w-full mx-auto space-y-2.5">
          <div className="flex items-start sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest">
                  <span className="text-xs leading-none">🎯</span>
                  <span className="text-[#F4F1FF]">OBJECTIVE</span>{' '}
                  <span className="text-[#82E59B]">REACHER</span>{' '}
                  <span className="text-[#FFD54F]">· BANCO DEL SANTUARIO</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#1E1A32] border border-[#65499C]/60 text-[9px] font-extrabold text-[#E2D4FF]">
                  ✨ {VAULT_STATS.totalItems} COLECCIONABLES EN EL SANTUARIO
                </span>
              </div>
              <h2 className="text-[16px] sm:text-[20px] font-extrabold text-[#F4F1FF] leading-snug break-words">
                💎 Cosméticos, Tarjetas, Sintetizador & Apoyo Indie
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                onClick={() => {
                  playUiTap(1);
                  setActiveTab('support');
                }}
                title="Tus Gemas Astrales (toca para obtener más o enviar propina)"
                className="px-3 py-1.5 rounded-[11px] bg-[#1F1C30] border border-[#53417D] hover:border-[#B58BFF] cursor-pointer flex items-center gap-1.5 transition"
              >
                <span className="text-sm">💎</span>
                <span className="text-xs sm:text-sm font-mono-tabular font-extrabold text-[#9AF0AE]">
                  {gems}
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-[11px] bg-[#2D2644] text-[#F4F1FF] text-xs sm:text-sm font-bold hover:bg-[#3B3258] transition"
              >
                ← Volver
              </button>
            </div>
          </div>

          {/* 4 Primary Navigation Tabs */}
          <div className="p-1 rounded-[13px] bg-[#0E0D18] border border-[#29243D] grid grid-cols-2 sm:grid-cols-4 gap-1">
            {[
              { id: 'skins', label: `🎨 Skins (${MASCOT_SKINS.length})` },
              {
                id: 'cards_audio',
                label: `✨ Tarjetas & Audio (${
                  CARD_COSMETICS.length +
                  SOUND_PACKS.length +
                  CARD_STYLE_VAULT.length +
                  GUARDIAN_TITLES.length
                })`,
              },
              { id: 'buffs', label: `🧪 Buffs & Reliquias (${SANCTUARY_BUFFS.length})` },
              { id: 'support', label: '💖 Apoyar al Dev' },
            ].map((t) => {
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    playUiTap(1);
                    setActiveTab(
                      t.id as 'skins' | 'cards_audio' | 'buffs' | 'support'
                    );
                  }}
                  className={`h-[36px] px-2 rounded-[9px] text-[11px] sm:text-xs font-extrabold transition truncate ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#593596] to-[#7A4FD1] text-white border border-[#B58BFF]/60 shadow'
                      : 'text-[#A8A3B8] hover:text-[#F4F1FF] hover:bg-[#1A182B]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Filter & Search Bar for Content Vault Tabs (Skins, Cards/Audio, Buffs) */}
          {(activeTab === 'skins' ||
            activeTab === 'cards_audio' ||
            activeTab === 'buffs') && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1 bg-[#0E0D18] p-1 rounded-[10px] border border-[#262238]">
                {[
                  {
                    id: 'all',
                    label: `Todos (${VAULT_STATS.totalItems})`,
                  },
                  {
                    id: 'free',
                    label: `🎁 Gratis (${VAULT_STATS.freeItems})`,
                  },
                  {
                    id: 'premium',
                    label: `💎 Con Gemas (${VAULT_STATS.premiumItems})`,
                  },
                ].map((f) => {
                  const active = tierFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        playUiTap(1);
                        setTierFilter(f.id as 'all' | 'free' | 'premium');
                      }}
                      className={`px-2.5 py-1 rounded-[7px] text-[10px] sm:text-[11px] font-bold transition ${
                        active
                          ? 'bg-[#2E2546] text-[#FFD54F] border border-[#FFD54F]/45'
                          : 'text-[#A8A3B8] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Buscar skin, marco, sonido, reliquia..."
                  className="w-full h-[32px] pl-3 pr-7 rounded-[9px] bg-[#0E0D18] border border-[#2C2742] text-[11px] text-[#F4F1FF] placeholder-[#7D7894] focus:outline-none focus:border-[#B58BFF]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#A8A3B8] hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Scrollable Viewport Body (Right-edge native scrollbar controls this directly) */}
      <div className="flex-1 w-full overflow-y-scroll overscroll-contain px-3 sm:px-5 py-4">
        <div className="max-w-5xl w-full mx-auto space-y-4 pb-10">
          {/* TAB 1: 36 MASCOT SKINS & AURAS */}
          {activeTab === 'skins' && (
            <div className="space-y-3.5">
              {/* Interactive Mascot Skin & Evolution Stage Preview */}
              <div className="p-3.5 sm:p-4 rounded-[20px] border border-[#443868] bg-gradient-to-b from-[#211D34] to-[#161524] space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => playMascotVoice(previewMascotLevel, false)}
                      className="relative shrink-0 group focus:outline-none"
                      title="Toca para escuchar la voz bio-acústica de esta especie"
                    >
                      <div className="animate-mascot-float">
                        <MascotAvatarSvg
                          level={previewMascotLevel}
                          size={82}
                          skinId={previewSkin.id}
                        />
                      </div>
                    </button>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          style={{
                            color: previewSkin.auraRingColor,
                            borderColor: `${previewSkin.auraRingColor}66`,
                          }}
                          className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-black/40"
                        >
                          {previewSkin.badge}
                        </span>
                        <span className="text-[11px] text-[#C8C2D8] font-semibold">
                          Probando en Nv. {previewMascotLevel} ({MASCOT_STAGE_NAMES[previewTier]})
                        </span>
                      </div>
                      <div className="text-[16px] sm:text-[18px] font-extrabold text-white leading-snug break-words">
                        {previewSkin.emoji} {previewSkin.name}
                      </div>
                      <div className="text-[11px] text-[#C8C2D8] leading-snug break-words">
                        {previewSkin.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectSkin(previewSkin)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-[#7549B8] to-[#9B6BFF] text-white text-xs font-extrabold hover:brightness-110 active:scale-95 transition shadow"
                    >
                      {equippedSkinId === previewSkin.id
                        ? '✓ Equipada actualmente'
                        : isIndieFounder ||
                          previewSkin.gemCost === 0 ||
                          unlockedSkins.includes(previewSkin.id)
                        ? '✨ Equipar ahora'
                        : `Desbloquear · 💎 ${previewSkin.gemCost}`}
                    </button>
                  </div>
                </div>

                {/* Evolution Slider to test the skin across all 200 levels */}
                <div className="pt-2 border-t border-[#322B4B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-[#A8A3B8]">
                    🎚️ Desliza para probar cómo luce <strong>{previewSkin.name}</strong> en las 20 especies (Nv. 1–200):
                  </span>
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <input
                      type="range"
                      min={1}
                      max={200}
                      value={previewMascotLevel}
                      onChange={(e) => setPreviewMascotLevel(Number(e.target.value))}
                      className="w-full accent-[#B58BFF] cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewMascotLevel(level)}
                      className="px-2 py-1 rounded bg-[#2B2540] text-[10px] font-bold text-[#D8C5FF] hover:text-white shrink-0"
                    >
                      Mi Nv. ({level})
                    </button>
                  </div>
                </div>
              </div>

              {/* Skins Grid (36 items) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredSkins.map((skin) => {
                  const isOwned =
                    isIndieFounder ||
                    skin.gemCost === 0 ||
                    unlockedSkins.includes(skin.id);
                  const isEquipped = equippedSkinId === skin.id;
                  const isPreviewing = previewSkinId === skin.id;

                  return (
                    <div
                      key={skin.id}
                      onClick={() => {
                        playUiTap(1);
                        setPreviewSkinId(skin.id);
                      }}
                      className={`p-3 rounded-[16px] border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isEquipped
                          ? 'bg-gradient-to-br from-[#272242] to-[#1B182E] border-[#82E59B]/70 shadow-[0_4px_16px_rgba(130,229,155,0.15)]'
                          : isPreviewing
                          ? 'bg-[#231F38] border-[#C7A4FF]'
                          : 'bg-[#171625] border-[#2C2840] hover:border-[#4D4270]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MascotAvatarSvg
                          level={previewMascotLevel}
                          size={54}
                          skinId={skin.id}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              style={{ color: skin.auraRingColor }}
                              className="text-[9px] font-extrabold uppercase"
                            >
                              {skin.badge}
                            </span>
                            {isEquipped ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#1C3829] text-[#82E59B]">
                                ACTIVA
                              </span>
                            ) : skin.gemCost === 0 ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#1F332B] text-[#9AF0AE]">
                                GRATIS
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                            {skin.emoji} {skin.name}
                          </div>
                          <div className="text-[10px] text-[#A8A3B8] leading-snug break-words">
                            {skin.subtitle}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSkinId(skin.id);
                          onSelectSkin(skin);
                        }}
                        className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                          isEquipped
                            ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                            : isOwned
                            ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                            : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                        }`}
                      >
                        {isEquipped
                          ? '✓ Aura Equipada'
                          : isOwned
                          ? '✨ Equipar Aura'
                          : `Desbloquear · 💎 ${skin.gemCost}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TARJETAS, SONIDOS, ESTILOS & TÍTULOS (156 ITEMS) */}
          {activeTab === 'cards_audio' && (
            <div className="space-y-3.5">
              {/* LIVE INTERACTIVE HERO CARD & AUDIO STAGE (Shows immediate visual/audio transformation right inside the shop!) */}
              <div
                key={liveEquippedNotice?.id || 'live-stage'}
                style={{
                  background: `linear-gradient(135deg, ${liveBannerPreset.startColor}, ${liveBannerPreset.endColor})`,
                  borderColor:
                    liveFrameCosmetic.id !== 'frame_default'
                      ? liveFrameCosmetic.borderColor
                      : `${liveAccentTheme.primary}99`,
                  boxShadow:
                    liveFrameCosmetic.id !== 'frame_default'
                      ? `0 10px 30px -6px rgba(8, 7, 16, 0.8), 0 0 24px -2px ${liveFrameCosmetic.glowColor}`
                      : `0 10px 28px -6px ${liveAccentTheme.glow}`,
                }}
                className="relative rounded-[20px] border-2 p-3.5 sm:p-4 overflow-hidden transition-all duration-300"
              >
                {liveBannerImg && (
                  <img
                    src={liveBannerImg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none select-none transition-all duration-500"
                  />
                )}
                <div
                  style={{ background: liveAccentTheme.vignetteGradient }}
                  className="absolute inset-0 pointer-events-none transition-all duration-500"
                />
                {liveFrameCosmetic.id !== 'frame_default' && (
                  <div
                    style={{ background: liveFrameCosmetic.overlayGradient }}
                    className="absolute inset-0 pointer-events-none transition-all duration-500"
                  />
                )}

                <div className="relative z-10 space-y-2.5">
                  {/* Live Transformation Banner when an item is equipped/unlocked */}
                  {liveEquippedNotice && (
                    <div
                      style={{
                        borderColor: `${liveEquippedNotice.color}88`,
                        backgroundColor: 'rgba(16, 15, 28, 0.9)',
                      }}
                      className="px-3 py-2 rounded-[12px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">
                          {liveEquippedNotice.emoji}
                        </span>
                        <div className="min-w-0">
                          <div
                            style={{ color: liveEquippedNotice.color }}
                            className="text-xs font-extrabold leading-tight break-words"
                          >
                            {liveEquippedNotice.title}
                          </div>
                          <div className="text-[10px] text-[#E6E0F2] leading-tight break-words">
                            {liveEquippedNotice.subtitle}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onJumpToBoard}
                        style={{
                          backgroundColor: liveAccentTheme.primary,
                          color: liveAccentTheme.buttonText,
                        }}
                        className="px-3 py-1.5 rounded-[9px] text-[11px] font-extrabold shrink-0 hover:brightness-110 active:scale-95 transition shadow"
                      >
                        👁️ Ver en mi Tablero Principal →
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div
                        style={{
                          borderColor: liveAccentTheme.primary,
                          backgroundColor: liveAccentTheme.surfaceDark,
                          boxShadow: `0 0 14px ${liveAccentTheme.softBg}`,
                        }}
                        className="w-12 h-12 rounded-[15px] border flex items-center justify-center text-2xl shrink-0"
                      >
                        {currentObjective.icon || '🎯'}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            style={{
                              color: liveAccentTheme.primary,
                              backgroundColor: liveAccentTheme.softBg,
                              borderColor: `${liveAccentTheme.primary}66`,
                            }}
                            className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border"
                          >
                            VISTA EN VIVO DE TU TARJETA
                          </span>
                          <span
                            style={{
                              color: liveGuardianTitleItem.color,
                              borderColor: `${liveGuardianTitleItem.color}55`,
                            }}
                            className="px-2 py-0.5 rounded-full bg-black/45 border text-[9px] font-extrabold"
                          >
                            {liveGuardianTitleItem.emoji}{' '}
                            {liveGuardianTitleItem.title}
                          </span>
                        </div>

                        <div className="text-[16px] sm:text-[18px] font-extrabold text-white leading-snug break-words">
                          {currentObjective.title}
                        </div>

                        {/* Equipped Cosmetics Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span
                            style={{
                              backgroundColor: liveAccentTheme.surfaceDark,
                              borderColor: `${liveAccentTheme.primary}55`,
                              color: liveAccentTheme.textSoft,
                            }}
                            className="px-2 py-0.5 rounded-md border font-bold"
                          >
                            🌈 Estilo:{' '}
                            {liveStyleItem
                              ? `${liveStyleItem.emoji} ${liveStyleItem.name}`
                              : `${liveAccentTheme.name} + ${liveBannerPreset.name}`}
                          </span>
                          <span
                            style={{
                              backgroundColor: liveAccentTheme.surfaceDark,
                              borderColor: `${liveFrameCosmetic.borderColor}66`,
                              color: liveFrameCosmetic.shimmerColor,
                            }}
                            className="px-2 py-0.5 rounded-md border font-bold"
                          >
                            🖼️ Marco: {liveFrameCosmetic.emoji}{' '}
                            {liveFrameCosmetic.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleAuditionSoundPack(liveSoundPackItem.id)
                            }
                            style={{
                              backgroundColor: liveAccentTheme.surfaceDark,
                              borderColor: `${liveSoundPackItem.accentColor}66`,
                              color: liveSoundPackItem.accentColor,
                            }}
                            className="px-2 py-0.5 rounded-md border font-bold hover:brightness-125 transition"
                            title="Toca para escuchar el Pack de Sonido activo"
                          >
                            🎵 Audio: {liveSoundPackItem.emoji}{' '}
                            {liveSoundPackItem.name} 🔊
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Mini Live Progress Bar & Board Jump */}
                    <div
                      style={{
                        backgroundColor: liveAccentTheme.surfaceDark,
                        borderColor: `${liveAccentTheme.primary}45`,
                      }}
                      className="w-full sm:w-[215px] shrink-0 p-2.5 rounded-[13px] border space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          style={{ color: liveAccentTheme.textSoft }}
                          className="font-bold"
                        >
                          {formatObjectiveAmount(
                            currentObjective.currentAmount,
                            currentObjective
                          )}{' '}
                          /{' '}
                          {formatObjectiveAmount(
                            currentObjective.goalAmount,
                            currentObjective
                          )}
                        </span>
                        <span
                          style={{ color: liveAccentTheme.primary }}
                          className="font-mono-tabular font-extrabold"
                        >
                          {liveObjProgressPct}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-black/45 overflow-hidden border border-white/10">
                        <div
                          style={{
                            width: `${Math.max(12, liveObjProgressPct)}%`,
                            background:
                              liveFrameCosmetic.id !== 'frame_default'
                                ? `linear-gradient(90deg, ${liveFrameCosmetic.borderColor}, ${liveFrameCosmetic.shimmerColor})`
                                : `linear-gradient(90deg, ${liveAccentTheme.secondary}, ${liveAccentTheme.primary})`,
                          }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Category Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-[14px] bg-[#151423] border border-[#2E2946]">
                {[
                  {
                    id: 'frames',
                    label: `🖼️ Marcos & FX (${CARD_COSMETICS.length})`,
                    desc: 'Bordes y brillos de tarjeta',
                  },
                  {
                    id: 'sounds',
                    label: `🎵 Packs de 5 Sonidos (${SOUND_PACKS.length})`,
                    desc: '11 motores acústicos',
                  },
                  {
                    id: 'styles',
                    label: `🌈 Sintonías (${CARD_STYLE_VAULT.length})`,
                    desc: 'Temas y paisajes',
                  },
                  {
                    id: 'titles',
                    label: `🏅 Títulos (${GUARDIAN_TITLES.length})`,
                    desc: 'Emblemas de perfil',
                  },
                ].map((sub) => {
                  const active = vaultSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        playUiTap(2);
                        setVaultSubTab(
                          sub.id as 'frames' | 'sounds' | 'styles' | 'titles'
                        );
                      }}
                      className={`p-2 rounded-[10px] text-left transition border ${
                        active
                          ? 'bg-[#2C2346] border-[#B58BFF] text-white shadow'
                          : 'bg-[#1A1829] border-transparent text-[#A8A3B8] hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] sm:text-xs font-extrabold truncate">
                        {sub.label}
                      </div>
                      <div className="text-[9px] text-[#9E97B0] truncate">
                        {sub.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SUB-TAB A: 48 CARD FRAMES & FX */}
              {vaultSubTab === 'frames' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredFrames.map((frame) => {
                    const isOwned =
                      isIndieFounder ||
                      frame.gemCost === 0 ||
                      unlockedVaultIds.includes(frame.id);
                    const isEquipped = equippedCardFrameId === frame.id;

                    return (
                      <div
                        key={frame.id}
                        style={{
                          borderColor: isEquipped
                            ? '#82E59B'
                            : `${frame.borderColor}77`,
                          background: frame.overlayGradient,
                        }}
                        className="p-3 rounded-[16px] bg-[#171625] border flex flex-col justify-between gap-2.5 transition"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              style={{ color: frame.borderColor }}
                              className="text-[9px] font-extrabold uppercase tracking-wider"
                            >
                              {frame.badge}
                            </span>
                            <span
                              style={{
                                backgroundColor: `${frame.borderColor}25`,
                                borderColor: `${frame.borderColor}66`,
                                color: frame.shimmerColor,
                              }}
                              className="px-2 py-0.5 rounded-full border text-[9px] font-bold"
                            >
                              {frame.emoji} Vista Marco
                            </span>
                          </div>
                          <div className="text-[13px] font-extrabold text-white leading-snug">
                            {frame.emoji} {frame.name}
                          </div>
                          <p className="text-[10px] text-[#B8B2C8] leading-snug">
                            {frame.subtitle}
                          </p>
                          {/* Mini Progress Bar Shimmer Preview */}
                          <div className="h-2 w-full rounded-full bg-[#11101B] overflow-hidden border border-white/10">
                            <div
                              style={{
                                width: '72%',
                                background: `linear-gradient(90deg, ${frame.borderColor}, ${frame.shimmerColor})`,
                              }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectCardCosmetic(frame);
                            if (
                              isOwned ||
                              gems >= frame.gemCost
                            ) {
                              setLiveEquippedNotice({
                                id: Date.now(),
                                emoji: frame.emoji,
                                title: `¡Marco "${frame.name}" equipado en vivo!`,
                                subtitle: `Míralo aplicado arriba en tu tarjeta «${currentObjective.title}»`,
                                color: frame.borderColor,
                              });
                            }
                          }}
                          className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                            isEquipped
                              ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                              : isOwned
                              ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                              : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                          }`}
                        >
                          {isEquipped
                            ? '✓ Marco Activo en Tarjeta'
                            : isOwned
                            ? '🖼️ Aplicar a mi Tarjeta'
                            : `Desbloquear · 💎 ${frame.gemCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SUB-TAB B: 30 REAL-TIME WEB AUDIO 5-SOUND PACKS */}
              {vaultSubTab === 'sounds' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[13px] bg-[#161525] border border-[#342C50] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#D8D1E5]">
                    <div>
                      🎹 <strong>Cada Pack incluye 5 sonidos distintos</strong>{' '}
                      (Toque UI, +Sumar Avance, −Restar, 🎯 Misión y 🏆 Fanfarria).
                      Toca <strong>«🔊 Probar Pack»</strong> varias veces o toca cada botón 1–5 para escucharlos todos.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredSounds.map((snd) => {
                      const isOwned =
                        isIndieFounder ||
                        snd.gemCost === 0 ||
                        unlockedVaultIds.includes(snd.id);
                      const isEquipped = equippedSoundPackId === snd.id;
                      const auditionState = auditionedPackSteps[snd.id];

                      return (
                        <div
                          key={snd.id}
                          className={`p-3 rounded-[16px] border flex flex-col justify-between gap-2.5 transition ${
                            isEquipped
                              ? 'bg-gradient-to-br from-[#262140] to-[#19172B] border-[#82E59B]/70 shadow-[0_4px_16px_rgba(130,229,155,0.12)]'
                              : 'bg-[#171625] border-[#2C2840]'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span
                                style={{ color: snd.accentColor }}
                                className="text-[9px] font-extrabold uppercase tracking-wider"
                              >
                                {snd.badge} · {snd.scaleName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAuditionSoundPack(snd.id)}
                                className="px-2.5 py-1 rounded-md bg-[#2A2442] hover:bg-[#3A315A] text-[#FFE082] text-[10px] font-extrabold border border-[#6E5AA6] active:scale-95 transition flex items-center gap-1"
                                title="Toca varias veces para recorrer los 5 sonidos del pack"
                              >
                                <span>🔊</span>
                                <span>
                                  {auditionState
                                    ? `Sonando ${auditionState.stepLabel}`
                                    : 'Probar Pack (5 sonidos)'}
                                </span>
                              </button>
                            </div>

                            <div className="text-[13px] font-extrabold text-white leading-snug flex items-center justify-between gap-1">
                              <span>
                                {snd.emoji} {snd.name}
                              </span>
                            </div>

                            {snd.synthEngineLabel && (
                              <div className="text-[9px] font-bold text-[#C7A4FF]">
                                🎛️ Motor: {snd.synthEngineLabel}
                              </div>
                            )}

                            <p className="text-[10px] text-[#A8A3B8] leading-snug">
                              {snd.subtitle}
                            </p>

                            {/* 5 Direct Sound Audition Pads inside every Sound Pack Card */}
                            <div className="pt-1 grid grid-cols-5 gap-1">
                              {[
                                { idx: 0, short: '1·Toque' },
                                { idx: 1, short: '2·+Suma' },
                                { idx: 2, short: '3·−Resta' },
                                { idx: 3, short: '4·Misión' },
                                { idx: 4, short: '5·Logro' },
                              ].map((pad) => {
                                const isPadActive =
                                  auditionState?.stepIndex === pad.idx;
                                return (
                                  <button
                                    key={pad.idx}
                                    type="button"
                                    onClick={() =>
                                      handleAuditionSoundPack(snd.id, pad.idx)
                                    }
                                    title={`Escuchar ${SOUND_PACK_STEP_LABELS[pad.idx]} de ${snd.name}`}
                                    style={
                                      isPadActive
                                        ? {
                                            borderColor: snd.accentColor,
                                            color: snd.accentColor,
                                          }
                                        : undefined
                                    }
                                    className={`py-1 px-1 rounded-[7px] text-[9px] font-extrabold border text-center transition active:scale-95 ${
                                      isPadActive
                                        ? 'bg-[#292240] shadow-sm'
                                        : 'bg-[#12111D] border-[#29253C] text-[#9E97B0] hover:text-white hover:border-[#4A416A]'
                                    }`}
                                  >
                                    {pad.short}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectSoundPack(snd);
                              if (isOwned || gems >= snd.gemCost) {
                                setLiveEquippedNotice({
                                  id: Date.now(),
                                  emoji: snd.emoji,
                                  title: `¡Pack de 5 Sonidos "${snd.name}" activado!`,
                                  subtitle: `Motor ${snd.synthEngineLabel || snd.scaleName} activo en toda la app`,
                                  color: snd.accentColor,
                                });
                              }
                            }}
                            className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                              isEquipped
                                ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                                : isOwned
                                ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                                : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                            }`}
                          >
                            {isEquipped
                              ? '✓ Pack de 5 Sonidos Activo'
                              : isOwned
                              ? '🎵 Equipar Pack de 5 Sonidos'
                              : `Desbloquear Pack (5 Sonidos) · 💎 ${snd.gemCost}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-TAB C: 42 CHROMATIC CARD STYLES */}
              {vaultSubTab === 'styles' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredStyles.map((st) => {
                    const isOwned =
                      isIndieFounder ||
                      st.gemCost === 0 ||
                      unlockedVaultIds.includes(st.id);
                    const stTheme = findAccentTheme(st.accentColor);
                    const stPreset = findBannerPreset(st.bannerId);
                    const isCurrentStyle =
                      equippedCardStyleId === st.id ||
                      (liveAccentTheme.id === stTheme.id &&
                        activeBannerId.toLowerCase() ===
                          st.bannerId.toLowerCase());

                    return (
                      <div
                        key={st.id}
                        style={{
                          borderColor: isCurrentStyle
                            ? '#82E59B'
                            : `${st.accentColor}77`,
                        }}
                        className={`p-3 rounded-[16px] bg-[#171625] border flex flex-col justify-between gap-2.5 transition ${
                          isCurrentStyle
                            ? 'shadow-[0_4px_18px_rgba(130,229,155,0.18)]'
                            : ''
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Mini Atmospheric Banner + Color Harmony Preview Strip */}
                          <div
                            style={{
                              background: `linear-gradient(135deg, ${stPreset.startColor}, ${stPreset.endColor})`,
                              borderColor: `${st.accentColor}66`,
                            }}
                            className="h-10 rounded-[11px] border px-2.5 flex items-center justify-between relative overflow-hidden"
                          >
                            <span className="relative z-10 text-[10px] font-extrabold text-white drop-shadow flex items-center gap-1">
                              <span>{stPreset.emoji}</span>
                              <span>{stPreset.name}</span>
                            </span>
                            <div className="relative z-10 flex items-center gap-1">
                              <span
                                style={{ backgroundColor: st.accentColor }}
                                className="w-3.5 h-3.5 rounded-full inline-block border border-white/40 shadow"
                              />
                              <span
                                style={{
                                  backgroundColor: st.previewColorSecondary,
                                }}
                                className="w-3.5 h-3.5 rounded-full inline-block border border-white/40 shadow"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span
                              style={{ color: st.accentColor }}
                              className="text-[9px] font-extrabold uppercase"
                            >
                              {st.badge}
                            </span>
                            {isCurrentStyle && (
                              <span className="px-1.5 py-0.2 rounded bg-[#1E3B2E] text-[#82E59B] text-[9px] font-extrabold">
                                ACTIVO EN TU TARJETA
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] font-extrabold text-white leading-snug">
                            {st.emoji} {st.name}
                          </div>
                          <p className="text-[10px] text-[#A8A3B8] leading-snug">
                            {st.subtitle}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onApplyVaultCardStyle(st);
                            if (isOwned || gems >= st.gemCost) {
                              setLiveEquippedNotice({
                                id: Date.now(),
                                emoji: st.emoji,
                                title: `¡Estilo "${st.name}" aplicado en vivo!`,
                                subtitle: `Tu tarjeta «${currentObjective.title}» ya luce esta sintonía arriba y en el tablero`,
                                color: st.accentColor,
                              });
                            }
                          }}
                          className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                            isCurrentStyle
                              ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                              : isOwned
                              ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                              : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                          }`}
                        >
                          {isCurrentStyle
                            ? '✓ Estilo Aplicado en Tarjeta'
                            : isOwned
                            ? '🌈 Aplicar Sintonía Ahora'
                            : `Desbloquear · 💎 ${st.gemCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SUB-TAB D: 36 GUARDIAN PROFILE TITLES */}
              {vaultSubTab === 'titles' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredTitles.map((t) => {
                    const isOwned =
                      isIndieFounder ||
                      t.gemCost === 0 ||
                      unlockedVaultIds.includes(t.id);
                    const isEquipped = equippedTitleId === t.id;

                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-[16px] border flex flex-col justify-between gap-2.5 ${
                          isEquipped
                            ? 'bg-[#241F3B] border-[#82E59B]/70'
                            : 'bg-[#171625] border-[#2C2840]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              style={{ color: t.color }}
                              className="text-[9px] font-extrabold uppercase"
                            >
                              {t.badge}
                            </span>
                            {isEquipped && (
                              <span className="text-[9px] font-extrabold text-[#82E59B]">
                                EN USO
                              </span>
                            )}
                          </div>
                          <div
                            style={{ color: t.color }}
                            className="text-[13px] font-extrabold leading-snug"
                          >
                            {t.emoji} {t.title}
                          </div>
                          <p className="text-[10px] text-[#A8A3B8] leading-snug">
                            {t.subtitle}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectGuardianTitle(t);
                            if (isOwned || gems >= t.gemCost) {
                              setLiveEquippedNotice({
                                id: Date.now(),
                                emoji: t.emoji,
                                title: `¡Título "${t.title}" equipado en vivo!`,
                                subtitle: `Ya luce junto a tu nombre arriba y en la cabecera principal`,
                                color: t.color,
                              });
                            }
                          }}
                          className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                            isEquipped
                              ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                              : isOwned
                              ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                              : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                          }`}
                        >
                          {isEquipped
                            ? '✓ Título Equipado'
                            : isOwned
                            ? '🏅 Equipar Título'
                            : `Desbloquear · 💎 ${t.gemCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 24 BUFFS, FREE BLESSINGS & RELICS */}
          {activeTab === 'buffs' && (
            <div className="space-y-3.5">
              {/* Active Status Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-[13px] bg-[#181726] border border-[#2E2944] flex items-center justify-between">
                  <span className="text-[11px] text-[#C8C2D8]">
                    🛡️ Escudos de Racha:
                  </span>
                  <span className="text-xs font-mono-tabular font-extrabold text-[#64D8FF]">
                    {streakShields} en inventario
                  </span>
                </div>
                <div className="p-2.5 rounded-[13px] bg-[#181726] border border-[#2E2944] flex items-center justify-between">
                  <span className="text-[11px] text-[#C8C2D8]">
                    🧪 Impulso ×1.5 XP:
                  </span>
                  <span className="text-xs font-mono-tabular font-extrabold text-[#B58BFF]">
                    {isXpBoostActive ? `Activo (${xpBoostRemainingText})` : 'Inactivo'}
                  </span>
                </div>
                <div className="p-2.5 rounded-[13px] bg-[#181726] border border-[#2E2944] flex items-center justify-between">
                  <span className="text-[11px] text-[#C8C2D8]">
                    🧲 Cosechador ×2 💎:
                  </span>
                  <span className="text-xs font-mono-tabular font-extrabold text-[#82E59B]">
                    {isGemMagnetActive
                      ? `Activo (${gemMagnetRemainingText})`
                      : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredBuffs.map((buff) => {
                  const isFreeBlessing = buff.kind === 'free_blessing';
                  const isRelic = buff.kind === 'relic';
                  const isClaimedOrOwned =
                    (isFreeBlessing || isRelic) &&
                    unlockedVaultIds.includes(buff.id);
                  const levelLocked =
                    isFreeBlessing && (buff.requiredLevel || 1) > level;

                  return (
                    <div
                      key={buff.id}
                      className={`p-3.5 rounded-[16px] border flex flex-col justify-between gap-3 ${
                        isClaimedOrOwned
                          ? 'bg-[#182422] border-[#65DB85]/50'
                          : 'bg-[#171625] border-[#2E2944]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          style={{
                            borderColor: `${buff.accentColor}55`,
                            backgroundColor: '#221E35',
                          }}
                          className="w-12 h-12 rounded-[13px] border flex items-center justify-center text-2xl shrink-0"
                        >
                          {buff.icon}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span
                            style={{ color: buff.accentColor }}
                            className="text-[9px] font-extrabold uppercase tracking-wider"
                          >
                            {buff.badgeText}
                          </span>
                          <div className="text-[14px] font-bold text-[#F4F1FF] leading-snug break-words">
                            {buff.name}
                          </div>
                          <div className="text-[11px] text-[#A8A3B8] leading-snug break-words">
                            {buff.description}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onActivateBuff(buff)}
                        className={`w-full h-[38px] rounded-[11px] text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow ${
                          isClaimedOrOwned
                            ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                            : levelLocked
                            ? 'bg-[#232033] text-[#8E88A6] border border-[#35304C]'
                            : buff.gemCost === 0
                            ? 'bg-gradient-to-r from-[#2E7D32] to-[#65DB85] text-[#0E2214] hover:brightness-110'
                            : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110 active:scale-95'
                        }`}
                      >
                        {isClaimedOrOwned
                          ? isRelic
                            ? '✓ Reliquia en tu Santuario'
                            : '✓ Bendición Reclamada'
                          : levelLocked
                          ? `🔒 Requiere Guardián Nv. ${buff.requiredLevel}`
                          : buff.gemCost === 0
                          ? `🎁 Reclamar Gratis (${buff.subtitle})`
                          : `Activar · 💎 ${buff.gemCost}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: APOYAR AL DEV INDIE (ARQUITECTURA DUAL: MERCADO PAGO + PAYPAL / GOOGLE PAY + LICENCIAS PRO) */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              {/* Empathy Note from the Solo Indie Developer */}
              <div className="p-3.5 rounded-[18px] bg-gradient-to-r from-[#241D38] via-[#1E1B30] to-[#1A2826] border border-[#56447E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[12px] bg-[#2E2448] border border-[#B58BFF]/40 flex items-center justify-center text-xl shrink-0">
                    ❤️
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-[#E6E0F2] leading-relaxed break-words">
                    <strong>De un Desarrollador Indie para ti:</strong> Construí{' '}
                    <span className="text-[#FFD54F] font-bold">Objective Reacher</span>{' '}
                    con dedicación artesanal para ayudarte a cumplir tus metas. Puedes jugar y ganar{' '}
                    <strong className="text-[#9AF0AE]">💎 Gemas gratis</strong> todos los días, o apoyar el proyecto mediante nuestra{' '}
                    <strong className="text-[#64D8FF]">Pasarela Dual (Mercado Pago en ARS/LatAm o PayPal / Google Pay Global)</strong>.
                  </div>
                </div>
              </div>

              {/* Dual Payment Gateway Switcher (Mercado Pago vs PayPal / Google Pay) */}
              <div className="p-3.5 rounded-[18px] bg-[#161524] border border-[#3B315A] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#C7A4FF]">
                      🌐 PASARELA DE PAGO DUAL · ELIGE TU MÉTODO PREFERIDO
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      Selecciona cómo prefieres abonar tu Pack o Propina:
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1F1B33] border border-[#53427E] text-[10px] font-bold text-[#9AF0AE] self-start sm:self-auto">
                    {selectedGateway === 'mercadopago'
                      ? gatewayConfigStatus.mpReady
                        ? '🟢 Mercado Pago API Activa'
                        : '🛠️ Mercado Pago (Modo Placeholder Local)'
                      : gatewayConfigStatus.globalReady
                      ? '🟢 PayPal / Google Pay Activo'
                      : '🛠️ PayPal / Google Pay (Modo Placeholder Local)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(2);
                      setSelectedGateway('mercadopago');
                    }}
                    className={`p-3 rounded-[14px] border text-left transition flex items-start gap-3 ${
                      selectedGateway === 'mercadopago'
                        ? 'bg-gradient-to-r from-[#14304B] to-[#1A263D] border-[#00B1EA] shadow-[0_4px_18px_rgba(0,177,234,0.22)]'
                        : 'bg-[#12111D] border-[#2A263D] hover:border-[#494069]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[11px] bg-[#009EE3]/20 border border-[#00B1EA]/50 flex items-center justify-center text-xl shrink-0">
                      🤝
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          Mercado Pago (LatAm / ARS)
                        </span>
                        {selectedGateway === 'mercadopago' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#009EE3] text-white text-[9px] font-extrabold">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#B8D4E8] mt-0.5 leading-snug">
                        Dinero en cuenta MP, Transferencia, Débito y Crédito en pesos (~${mpArsRate} ARS/USD ref).
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(2);
                      setSelectedGateway('paypal_googlepay');
                    }}
                    className={`p-3 rounded-[14px] border text-left transition flex items-start gap-3 ${
                      selectedGateway === 'paypal_googlepay'
                        ? 'bg-gradient-to-r from-[#241E46] to-[#1C1936] border-[#FFD54F] shadow-[0_4px_18px_rgba(255,213,79,0.18)]'
                        : 'bg-[#12111D] border-[#2A263D] hover:border-[#494069]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[11px] bg-[#FFD54F]/15 border border-[#FFD54F]/50 flex items-center justify-center text-xl shrink-0">
                      🌍
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          PayPal · Google Pay · Tarjetas (USD)
                        </span>
                        {selectedGateway === 'paypal_googlepay' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#FFD54F] text-[#181226] text-[9px] font-extrabold">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#D8C5FF] mt-0.5 leading-snug">
                        Checkout internacional en USD con PayPal, billetera Google Pay y tarjetas globales.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* PedidosYa-Style Editable Tip / Donation Card */}
              <div className="p-4 sm:p-5 rounded-[20px] bg-gradient-to-b from-[#231D38] to-[#171526] border-2 border-[#8C5CE0] shadow-[0_8px_28px_rgba(140,92,224,0.2)] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#352656] text-[#FFD54F] border border-[#FFD54F]/40">
                      💖 PROPINA LIBRE · TÚ ELIGES EL MONTO
                    </span>
                    <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white mt-1">
                      ☕ Propina al Desarrollador (Editable al instante)
                    </h3>
                    <p className="text-[11px] text-[#C8C2D8]">
                      Elige un botón rápido o edita manualmente la cantidad exacta que quieras aportar:
                    </p>
                  </div>

                  {/* Live Reward Pill */}
                  <div className="px-3 py-2 rounded-[13px] bg-[#141222] border border-[#493A6E] text-right shrink-0">
                    <div className="text-[10px] text-[#A8A3B8]">
                      Recompensa de agradecimiento:
                    </div>
                    <div className="text-xs sm:text-sm font-mono-tabular font-extrabold text-[#9AF0AE]">
                      +{tipRewardGems} 💎 · +{tipRewardShields} 🛡️
                    </div>
                    {tipUnlocksFounder && (
                      <div className="text-[10px] font-extrabold text-[#FFD54F]">
                        👑 ¡Incluye Pase Fundador Indie!
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Tip Pills (PedidosYa style) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { amount: '1.00', label: '$1 USD', tag: '🧉 Un Mate' },
                    { amount: '2.00', label: '$2 USD', tag: '☕ Café Indie' },
                    { amount: '5.00', label: '$5 USD', tag: '👑 Pase Fundador' },
                    { amount: '10.00', label: '$10 USD', tag: '🚀 Impulso Épico' },
                  ].map((preset) => {
                    const isSelected =
                      !isCustomTipEditing &&
                      Math.abs(parsedTipUsd - Number(preset.amount)) < 0.01;
                    return (
                      <button
                        key={preset.amount}
                        type="button"
                        onClick={() => {
                          playUiTap(2);
                          setIsCustomTipEditing(false);
                          setTipAmountText(preset.amount);
                        }}
                        className={`p-2.5 rounded-[12px] border text-center transition ${
                          isSelected
                            ? 'bg-[#3A2B60] border-[#FFD54F] text-white shadow'
                            : 'bg-[#161524] border-[#2E2946] text-[#C8C2D8] hover:border-[#65499C]'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-mono-tabular font-extrabold text-white">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-[#FFD54F] font-semibold">
                          {preset.tag}
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(3);
                      setIsCustomTipEditing(true);
                      window.setTimeout(() => {
                        tipCustomInputRef.current?.focus();
                        tipCustomInputRef.current?.select();
                      }, 40);
                    }}
                    className={`p-2.5 rounded-[12px] border text-center transition ${
                      isCustomTipEditing
                        ? 'bg-[#3A2B60] border-[#82E59B] text-white shadow'
                        : 'bg-[#161524] border-[#2E2946] text-[#C8C2D8] hover:border-[#82E59B]'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-extrabold text-[#82E59B]">
                      ✏️ Otro monto
                    </div>
                    <div className="text-[10px] text-[#A8A3B8]">
                      Editar libremente
                    </div>
                  </button>
                </div>

                {/* Interactive Stepper + Direct Editable Input */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-[14px] bg-[#12111E] border border-[#2F2947]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustTipBy(-0.5)}
                      className="w-10 h-10 rounded-[10px] bg-[#25203B] hover:bg-[#332C50] text-white font-extrabold text-base border border-[#443968] transition"
                    >
                      −
                    </button>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-extrabold text-[#FFD54F]">
                        $
                      </span>
                      <input
                        ref={tipCustomInputRef}
                        type="number"
                        min="0.50"
                        max="500"
                        step="0.50"
                        value={tipAmountText}
                        onFocus={() => setIsCustomTipEditing(true)}
                        onChange={(e) => setTipAmountText(e.target.value)}
                        aria-label="Monto de propina en USD"
                        className="w-[125px] h-10 pl-7 pr-11 rounded-[10px] bg-[#1B182C] border border-[#65499C] text-white font-mono-tabular font-extrabold text-sm focus:outline-none focus:border-[#FFD54F]"
                      />
                      <span className="absolute right-2.5 text-[10px] font-bold text-[#A8A3B8]">
                        USD
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustTipBy(0.5)}
                      className="w-10 h-10 rounded-[10px] bg-[#25203B] hover:bg-[#332C50] text-white font-extrabold text-base border border-[#443968] transition"
                    >
                      ＋
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onCustomTipSupport(
                        Math.max(0.5, parsedTipUsd),
                        selectedGateway
                      )
                    }
                    className={`flex-1 h-[42px] px-4 rounded-[11px] text-xs sm:text-sm font-extrabold hover:brightness-110 active:scale-95 transition shadow flex items-center justify-center gap-2 ${
                      selectedGateway === 'mercadopago'
                        ? 'bg-gradient-to-r from-[#009EE3] to-[#00C4FF] text-[#051824]'
                        : 'bg-gradient-to-r from-[#65DB85] to-[#26E6A6] text-[#0D2116]'
                    }`}
                  >
                    <span>
                      {selectedGateway === 'mercadopago'
                        ? `🤝 Aportar con Mercado Pago ($${Math.max(
                            0.5,
                            parsedTipUsd
                          ).toFixed(2)} USD · ~$${Math.round(
                            Math.max(0.5, parsedTipUsd) * mpArsRate
                          ).toLocaleString('es-AR')} ARS)`
                        : `🌍 Aportar con PayPal / GPay ($${Math.max(
                            0.5,
                            parsedTipUsd
                          ).toFixed(2)} USD)`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] font-mono-tabular">
                      +{tipRewardGems} 💎
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Structured Support Packs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {INDIE_SUPPORT_PACKS.map((pack) => {
                  const isFounderPack = pack.id === 'pack_founder';
                  const alreadyFounder = isFounderPack && isIndieFounder;
                  const estimatedArs = Math.round(
                    pack.usdNumeric * mpArsRate
                  ).toLocaleString('es-AR');

                  return (
                    <div
                      key={pack.id}
                      style={{
                        borderColor: isFounderPack
                          ? '#FFD54F'
                          : `${pack.highlightColor}66`,
                      }}
                      className={`p-4 rounded-[18px] border flex flex-col justify-between gap-3 relative overflow-hidden ${
                        isFounderPack
                          ? 'bg-gradient-to-b from-[#2A223A] via-[#1F1A30] to-[#181526] shadow-[0_8px_26px_rgba(255,213,79,0.16)]'
                          : 'bg-[#171625]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            style={{ color: pack.highlightColor }}
                            className="text-[10px] font-extrabold uppercase tracking-wider"
                          >
                            {pack.badge}
                          </span>
                          <span className="text-xs font-mono-tabular font-extrabold text-white px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                            {pack.usdPrice}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{pack.emoji}</span>
                          <div>
                            <h4 className="text-[15px] font-extrabold text-white leading-snug">
                              {pack.title}
                            </h4>
                            <p className="text-[10px] text-[#9AF0AE] font-semibold">
                              {selectedGateway === 'mercadopago'
                                ? `Mercado Pago: ~$${estimatedArs} ARS`
                                : 'PayPal · Google Pay · Tarjeta Global'}
                            </p>
                          </div>
                        </div>

                        <p className="text-[11px] text-[#D8D1E5] leading-snug">
                          {pack.subtitle}
                        </p>

                        <ul className="space-y-1 pt-1">
                          {pack.perks.map((perk, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-[#E6E0F2] leading-snug flex items-start gap-1.5"
                            >
                              <span className="leading-snug">{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={alreadyFounder}
                        onClick={() => onPurchasePack(pack, selectedGateway)}
                        style={{
                          background: alreadyFounder
                            ? '#1E3B2E'
                            : selectedGateway === 'mercadopago' && !isFounderPack
                            ? 'linear-gradient(90deg, #008AD6, #00B1EA)'
                            : isFounderPack
                            ? 'linear-gradient(90deg, #E5B945, #FFD54F)'
                            : 'linear-gradient(90deg, #7549B8, #9B6BFF)',
                          color: alreadyFounder
                            ? '#82E59B'
                            : isFounderPack
                            ? '#191324'
                            : '#FFFFFF',
                        }}
                        className="w-full h-[42px] rounded-[12px] text-xs font-extrabold hover:brightness-110 active:scale-95 disabled:opacity-70 transition shadow"
                      >
                        {alreadyFounder
                          ? '👑 Pase Fundador Activo'
                          : selectedGateway === 'mercadopago'
                          ? `🤝 Pagar con Mercado Pago (${pack.usdPrice})`
                          : `🌍 Pagar con PayPal / GPay (${pack.usdPrice})`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Stateless PRO License Backup & Multi-Device Restore Card */}
              <div className="p-4 rounded-[18px] bg-[#141322] border border-[#382F54] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFD54F]">
                      🔑 RESPALDO CRIPTOGRÁFICO PRO · WEB & ANDROID
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      Código de Recuperación de Compras (Sin cuentas ni contraseñas)
                    </h4>
                    <p className="text-[11px] text-[#A8A3B8]">
                      Cada compra en Web o Android genera un código firmado con HMAC (`OR-PRO-...`). Guárdalo para restaurar tus Gemas o tu Pase Fundador si cambias de teléfono o usas la versión Web.
                    </p>
                  </div>
                </div>

                {lastIssuedLicenseCode && (
                  <div className="p-3 rounded-[12px] bg-[#1D1930] border border-[#65DB85]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#82E59B]">
                        ✓ Tu último Código de Respaldo PRO emitido:
                      </div>
                      <div className="text-xs font-mono-tabular text-white break-all select-all mt-0.5">
                        {lastIssuedLicenseCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(lastIssuedLicenseCode);
                        setCopiedCodeNotice(true);
                        window.setTimeout(() => setCopiedCodeNotice(false), 2200);
                      }}
                      className="px-3 py-1.5 rounded-[9px] bg-[#2B4238] text-[#9AF0AE] text-[11px] font-extrabold hover:brightness-110 shrink-0"
                    >
                      {copiedCodeNotice ? '✓ Copiado' : '📋 Copiar Código'}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={licenseInputText}
                    onChange={(e) => {
                      setLicenseInputText(e.target.value);
                      setLicenseFeedback(null);
                    }}
                    placeholder="Pega aquí tu código OR-PRO-..."
                    className="flex-1 h-10 px-3 rounded-[10px] bg-[#0E0D18] border border-[#2F2947] text-xs text-white font-mono-tabular placeholder-[#6E6885] focus:outline-none focus:border-[#FFD54F]"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await onRedeemLicenseCode(licenseInputText);
                      setLicenseFeedback(res);
                      if (res.ok) {
                        setLicenseInputText('');
                      }
                    }}
                    className="h-10 px-4 rounded-[10px] bg-[#342A52] hover:bg-[#45376B] border border-[#7559B8] text-white text-xs font-extrabold transition shrink-0"
                  >
                    🔓 Restaurar / Canjear Código
                  </button>
                </div>

                {licenseFeedback && (
                  <div
                    className={`text-[11px] font-bold px-3 py-2 rounded-[9px] ${
                      licenseFeedback.ok
                        ? 'bg-[#193328] text-[#82E59B] border border-[#65DB85]/40'
                        : 'bg-[#3A1D28] text-[#FF8A80] border border-[#FF5252]/40'
                    }`}
                  >
                    {licenseFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
