import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/extracted/Sidebar';
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
  getLocalizedAchievement,
  getLocalizedTemplate,
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
  AppLanguage,
  loadAppLanguage,
  saveAppLanguage,
  TRANSLATIONS,
  TranslationDictionary,
} from './i18n';
import {
  calculateLevelFromXp,
  recalculateAllXp,
  toLocalDateKey,
  calculateCurrentStreak,
  evaluateObjectiveAchievements,
  calculateSingleEntryXp,
} from './utils/gamification';
import {
  AchievementCondition,
  AchievementDefinition,
  CelebrationData,
  DashboardState,
  Objective,
  ObjectiveEntry,
} from './types';
import { STORAGE_KEY, LEGACY_STORAGE_KEYS, LAUNCH_DEADLINE_STORAGE_KEY, MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } from "./constants";
import { MascotGalleryModal } from "./components/extracted/MascotGalleryModal";
import { MascotAvatarSvg } from "./components/extracted/MascotAvatarSvg";
import { ObjectiveEditorModal } from "./components/extracted/ObjectiveEditorModal";
import { BannerPickerModal } from "./components/extracted/BannerPickerModal";
import { EditEntryModal } from "./components/extracted/EditEntryModal";
import { IndieEmporiumModal } from "./components/shop/IndieEmporiumModal";
import { MascotGridCard } from "./components/extracted/MascotGridCard";
import { useHorizontalWheel } from '../src/Hooks/useHorizontalWheel';
import { PurchaseConfirmModal } from './components/shop/PurchaseConfirmModal';
import { useModalState } from './hooks/useModalState';

import { loadState } from './utils/storage';

export function formatEntryTime(isoString: string): string {
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

export function useHorizontalScrollProps() {
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

export function getLaunchEndTimestamp(): number {
  try {
    const saved = localStorage.getItem(LAUNCH_DEADLINE_STORAGE_KEY);
    if (saved) {
      const val = Number(saved);
      if (val > Date.now()) return val;
    }
    // Oferta especial de bienvenida: 6 días, 18 horas y 30 minutos desde la activación
    const newEnd = Date.now() + (6 * 24 * 3600 + 18 * 3600 + 30 * 60) * 1000;
    localStorage.setItem(LAUNCH_DEADLINE_STORAGE_KEY, String(newEnd));
    return newEnd;
  } catch {
    return Date.now() + 585000000;
  }
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

  // Cuenta regresiva en vivo para el Banner de Lanzamiento v1.0
  const [launchTimeLeft, setLaunchTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>(() => {
    const diff = Math.max(0, getLaunchEndTimestamp() - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  });

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.max(0, getLaunchEndTimestamp() - Date.now());
      setLaunchTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Layout & Drawers
  const [activeNav, setActiveNav] = useState<string>('objective');
  const [isNavigationOpen, setIsNavigationOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const { modals, actions } = useModalState();
  const [itemToPurchase, setItemToPurchase] = useState<any>(null);
  const [isDraftObjective, setIsDraftObjective] = useState<boolean>(false);
  const [previousObjectiveId, setPreviousObjectiveId] = useState<string | null>(null);


  // Interactive Mascot Sanctuary, ASMR Clicker & Daily Ritual
  const [mascotJoyId, setMascotJoyId] = useState<number>(0);
  const [mascotSpeech, setMascotSpeech] = useState<string | null>(null);
  const mascotSpeechTimerRef = useRef<number | null>(null);
  const [isDailyRitualOpen, setIsDailyRitualOpen] = useState<boolean>(false);
  const [isAsmrSanctuaryOpen, setIsAsmrSanctuaryOpen] = useState<boolean>(false);
  const [asmrFloatingSparks, setAsmrFloatingSparks] = useState<
    Array<{
      id: number;
      text: string;
      color: string;
      xOffset: number;
      yOffset?: number;
      rotDeg?: number;
    }>
  >([]);
  const [lastAsmrPrizeNotice, setLastAsmrPrizeNotice] = useState<string | null>(
    null
  );
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() =>
    loadAppLanguage()
  );
  const t = useMemo(() => TRANSLATIONS[appLanguage], [appLanguage]);

  const changeLanguage = (newLang: AppLanguage) => {
    playUiTap(2);
    setAppLanguage(newLang);
    saveAppLanguage(newLang);
  };

  const asmrTapCooldownCounterRef = useRef<number>(0);
  const asmrHoldTimerRef = useRef<number | null>(null);
  const asmrHoldIntervalRef = useRef<number>(255);
  const asmrHoldLastShiftTimeRef = useRef<number>(0);
  const isHoldingActiveRef = useRef<boolean>(false);
  const asmrHoldMouseDownFiredRef = useRef<boolean>(false);
  const asmrTotalTapsRef = useRef<number>(0);
  const asmrLastSparkTimeRef = useRef<number>(0);
  const asmrSparkLaneRef = useRef<number>(0);
  const [isAsmrHolding, setIsAsmrHolding] = useState<boolean>(false);

  const [isSereneMode, setIsSereneMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('objectivereacher_serene_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSereneMode = () => {
    playUiTap(1);
    setIsSereneMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('objectivereacher_serene_mode', String(next));
      } catch { }
      return next;
    });
  };

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

  // 💡 HOOKS DE SCROLL HORIZONTAL (Con la rueda del mouse)
  // 1. Pestañas de Objetivos (se deshabilita si están envueltas en varias filas)
  useHorizontalWheel(objectiveTabsScrollRef, !isObjectiveTabsWrapped);

  // 2. Sección de Logros
  useHorizontalWheel(achievementsRef);

  // 3. Skins/Accesorios (si también tiene scroll horizontal)
  useHorizontalWheel(asmrSkinsScrollRef);

  // 4. Tarjetas de estilos / Skins ASMR
  useHorizontalWheel(asmrSkinsScrollRef);

  const [asmrFilterCategory, setAsmrFilterCategory] = useState<
    'all' | 'unlocked' | 'taps' | 'skins'
  >('all');

  useEffect(() => {
    return () => {
      if (asmrHoldTimerRef.current !== null) {
        window.clearTimeout(asmrHoldTimerRef.current);
      }
    };
  }, []);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setPersistenceMessage(
        t.saveErrorAlert
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
  const levelProgressText = `${totalXp - xpAtLevelStart}/${xpAtNextLevel - xpAtLevelStart
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
  const mascotMessage = t.mascotMessages[mascotTier] || t.mascotMessages[0];

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
      ? t.streakIgnitePrompt
      : streakDays === 1
        ? `1 ${t.streakDaysUnit}`
        : `${streakDays} ${t.streakDaysPlural}`;

  // Indie Monetization, Cosmetics & Active Buffs derived properties
  const gems = state.gamification.gems ?? 0;
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
      modals.isIndieShopOpen ||
      modals.isEditorOpen ||
      modals.isBannerPickerOpen ||
      modals.isMascotGalleryOpen ||
      modals.isAllAchievementsOpen ||
      modals.isArchivedModalOpen;
    if (anyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [
    modals.isIndieShopOpen,
    modals.isEditorOpen,
    modals.isBannerPickerOpen,
    modals.isMascotGalleryOpen,
    modals.isAllAchievementsOpen,
    modals.isArchivedModalOpen,
  ]);
  const streakShields = state.gamification.streakShields ?? 0;
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
        title: t.questPetTitle,
        subtitle: t.questPetSub,
        rewardXp: 15,
        isCompleted: hasPettedToday,
        isClaimed: claimedToday.includes('pet_guardian'),
        icon: '💖',
      },
      {
        id: 'daily_entry',
        title: t.questEntryTitle,
        subtitle: t.questEntrySub,
        rewardXp: 25,
        isCompleted: hasEntryToday,
        isClaimed: claimedToday.includes('daily_entry'),
        icon: '⚡',
      },
      {
        id: 'mindful_contribution',
        title: t.questMindfulTitle,
        subtitle: t.questMindfulSub,
        rewardXp: 30,
        isCompleted: hasPositiveNoteToday,
        isClaimed: claimedToday.includes('mindful_contribution'),
        icon: '🎯',
      },
    ],
    [hasPettedToday, hasEntryToday, hasPositiveNoteToday, claimedToday, t]
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
      id: Date.now() + Math.random(),
      xp: xpAmount,
      leveledUp: nextLevel > prevLevel,
    });

    if (nextTier > prevTier) {
      triggerCelebration(
        t.newSpeciesUnlocked,
        `${t.levelAbbr} ${nextLevel} · +${xpAmount} XP · ${t.mascotMessages[nextTier] || ''}`,
        mascotEmojis[nextTier] || '🪐',
        '#FFD54F',
        true
      );
    } else if (nextLevel > prevLevel) {
      triggerCelebration(
        t.levelUpCelebration(nextLevel),
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
        ? t.petGreetNoEntry
        : t.petGreetStreak(streakDays),
      levelsToNextSpecies > 0
        ? t.petGreetLevelsLeft(levelsToNextSpecies)
        : t.petGreetMax,
      currentObjective.currentAmount >= currentObjective.goalAmount
        ? t.petGreetObjectiveSurpassed(currentObjective.title)
        : t.petGreetObjectiveRemaining(currentObjective.title, remainingAmountFormatted),
      t.petGreetThanks,
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
          gems: (prev.gamification.gems ?? 0) + petGems,
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
          gems: (prev.gamification.gems ?? 0) + questGems,
          claimedQuestsByDay: {
            ...(prev.gamification.claimedQuestsByDay || {}),
            [todayDateKey]: [...prevClaimed, questId],
          },
        },
      };
    });

    setMascotJoyId(Date.now());
    setXpBurst({
      id: Date.now() + Math.random(),
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
          gems: (prev.gamification.gems ?? 0) + chestGems,
          claimedQuestsByDay: {
            ...(prev.gamification.claimedQuestsByDay || {}),
            [todayDateKey]: [...prevClaimed, 'all_daily_bonus'],
          },
        },
      };
    });

    setMascotJoyId(Date.now());
    setXpBurst({
      id: Date.now() + Math.random(),
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
    actions.setIndieShopInitialTab(tab);
    actions.setIsIndieShopOpen(true);
  };

  const DAILY_ASMR_GEM_CAP = 8;
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
        `${tex.emoji} ¡Orbe ASMR «${tex.name}» equipado! Toca o mantén el orbe para sentir su textura binaural.`
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - tex.gemCost),
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
    asmrTotalTapsRef.current = Math.max(
      asmrTotalTapsRef.current,
      state.gamification.asmrTotalTaps ?? 0
    ) + 1;
    const nextTaps = asmrTotalTapsRef.current;
    asmrTapCooldownCounterRef.current += 1;

    // Rebalanced luck: cycle milestones give +1 gem (or +2 if magnet is active)
    // Random lucky prize requires at least 45 cooldown taps and a rare 1.2% chance
    const isMilestonePrize = nextTaps % ASMR_CYCLE_TAPS === 0;
    const isLuckyRandomPrize =
      !isMilestonePrize &&
      asmrTapCooldownCounterRef.current >= 45 &&
      Math.random() < 0.012;
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
      const baseRawGems = 1 * activeGemMultiplier;
      awardedGems = Math.min(asmrRemainingDailyGems, baseRawGems);
      awardedXp = Math.round(
        (isMilestonePrize ? 10 : 4) * activeXpMultiplier
      );

      if (newlyUnlockedTapStyle) {
        prizeText = t.asmrUnlockedTapStyle(
          newlyUnlockedTapStyle.name,
          newlyUnlockedTapStyle.emoji,
          nextTaps,
          awardedGems > 0 ? `+${awardedGems} 💎 ` : '',
          awardedXp
        );
      } else if (awardedGems > 0) {
        const nextEarnedToday = asmrGemsEarnedToday + awardedGems;
        prizeText = t.asmrLuckBonus(awardedGems, nextEarnedToday, DAILY_ASMR_GEM_CAP, awardedXp);
      } else {
        prizeText = t.asmrZenCapBonus(awardedXp, DAILY_ASMR_GEM_CAP);
      }
      setLastAsmrPrizeNotice(prizeText);
      triggerMascotSpeech(prizeText);
    }

    const nowTimestamp = Date.now();
    const isSpecialSpark =
      Boolean(dropsPrize) || Boolean(newlyUnlockedTapStyle);
    // When holding, throttle calm sparks to at least 720ms so labels never bunch up; special unlocks always show
    const shouldSpawnSpark =
      isSpecialSpark || nowTimestamp - asmrLastSparkTimeRef.current >= 720;

    if (shouldSpawnSpark) {
      asmrLastSparkTimeRef.current = nowTimestamp;
      // Staggered distinct lanes with wider horizontal spread:
      const sparkLanes = [-64, -32, 0, 32, 64];
      asmrSparkLaneRef.current =
        (asmrSparkLaneRef.current + 1) % sparkLanes.length;
      const xOffset = sparkLanes[asmrSparkLaneRef.current];
      // Vertical variation so consecutive sparks don't overlap on the exact same plane
      const yOffset = -((asmrSparkLaneRef.current % 3) * 8);
      const rotDeg =
        asmrSparkLaneRef.current % 2 === 0
          ? -3
          : 3;

      const sparkText = newlyUnlockedTapStyle
        ? `🔓 ¡${newlyUnlockedTapStyle.emoji} ${newlyUnlockedTapStyle.name}!`
        : dropsPrize
          ? awardedGems > 0
            ? `🎁 +${awardedGems} 💎 · +${awardedXp} XP`
            : `🧘 +${awardedXp} XP Zen`
          : `${activeAsmrTextureObj.emoji} ${t.calmSpark}`;
      const sparkColor =
        dropsPrize || newlyUnlockedTapStyle
          ? '#FFD54F'
          : activeAsmrTextureObj.accentColor;

      const newSpark = {
        id: nowId,
        text: sparkText,
        color: sparkColor,
        xOffset,
        yOffset,
        rotDeg,
      };

      setAsmrFloatingSparks((prev) => [...prev.slice(-3), newSpark]);

      // Automatically clean up spark after 2.8s
      window.setTimeout(() => {
        setAsmrFloatingSparks((prev) => prev.filter((s) => s.id !== nowId));
      }, 2800);
    }

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
          asmrTotalTaps: nextTaps,
          asmrPreferredTexture: newlyUnlockedTapStyle
            ? newlyUnlockedTapStyle.id
            : prev.gamification.asmrPreferredTexture || 'bubbles',
          asmrGemsDateKey: todayDateKey,
          asmrGemsEarnedToday: prevEarnedToday + awardedGems,
          gems: (prev.gamification.gems ?? 0) + awardedGems,
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

  const stopAsmrTimer = () => {
    if (asmrHoldTimerRef.current !== null) {
      window.clearTimeout(asmrHoldTimerRef.current);
      asmrHoldTimerRef.current = null;
    }
  };

  const handleStopAsmrHold = () => {
    setIsAsmrHolding(false);
    stopAsmrTimer();
  };

  const handleStartAsmrHold = (e?: React.SyntheticEvent) => {
    // Cancela la emulación de clic de ratón si el evento vino de pantalla táctil
    if (e && e.type === 'touchstart') {
      e.preventDefault();
    }

    // Destruye cualquier temporizador activo previo antes de instanciar uno nuevo
    stopAsmrTimer();

    setIsAsmrHolding(true);
    asmrHoldMouseDownFiredRef.current = true;
    asmrHoldIntervalRef.current = 235;
    asmrHoldLastShiftTimeRef.current = Date.now();

    // Primer disparo instantáneo (0 ms latencia)
    handleAsmrClick();

    const runHoldLoop = () => {
      const now = Date.now();
      if (now - asmrHoldLastShiftTimeRef.current >= 550) {
        asmrHoldLastShiftTimeRef.current = now;
        asmrHoldIntervalRef.current = Math.max(160, asmrHoldIntervalRef.current - 15);
      }

      handleAsmrClick();

      asmrHoldTimerRef.current = window.setTimeout(runHoldLoop, asmrHoldIntervalRef.current);
    };

    asmrHoldTimerRef.current = window.setTimeout(runHoldLoop, asmrHoldIntervalRef.current);
  };

  const handleClickOrb = () => {
    // If the tap was already triggered on mouseDown, consume the flag and avoid double-clicking
    if (asmrHoldMouseDownFiredRef.current) {
      asmrHoldMouseDownFiredRef.current = false;
      return;
    }
    handleAsmrClick();
  };

  useEffect(() => {
    return () => {
      isHoldingActiveRef.current = false;
      if (asmrHoldTimerRef.current) {
        window.clearTimeout(asmrHoldTimerRef.current);
      }
    };
  }, []);

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
      actions.setIndieShopInitialTab('support');
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - cosmetic.gemCost),
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
      actions.setIndieShopInitialTab('support');
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - pack.gemCost),
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
      actions.setIndieShopInitialTab('support');
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
            ? prev.gamification.gems ?? 0
            : Math.max(0, (prev.gamification.gems ?? 0) - styleItem.gemCost),
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
      actions.setIndieShopInitialTab('support');
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - titleItem.gemCost),
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
      actions.setIndieShopInitialTab('support');
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - skin.gemCost),
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
      actions.setIndieShopInitialTab('support');
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - buff.gemCost),
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - buff.gemCost),
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
          gems: Math.max(0, (prev.gamification.gems ?? 0) - buff.gemCost),
          totalXp: prev.gamification.totalXp + awardedXp,
          bonusXp: (prev.gamification.bonusXp || 0) + awardedXp,
          streakShields:
            (prev.gamification.streakShields ?? 0) + addedShields,
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
        `${buff.name} otorgó +${awardedXp} XP${addedShields > 0 ? ` y +${addedShields} 🛡️` : ''
        }`,
        buff.icon,
        buff.accentColor
      );
    } else {
      triggerMascotSpeech(
        `${buff.icon} ¡${buff.name} activado!${awardedXp > 0 ? ` +${awardedXp} XP` : ''
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
      const isFounderPack =
        pack.id === 'pack_founder' || pack.id === 'pack_bundle_ultimate';
      const nextTier =
        isFounderPack || prev.gamification.isIndieFounder
          ? 'founder'
          : 'coffee';

      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          gems: (prev.gamification.gems ?? 0) + pack.gemsIncluded,
          streakShields:
            (prev.gamification.streakShields ?? 0) + pack.shieldsIncluded,
          unlockedSkins: nextUnlocked,
          unlockedVaultIds: nextVault,
          equippedSkinId: isFounderPack
            ? 'skin_prismatic_founder'
            : prev.gamification.equippedSkinId || 'default',
          equippedTitleId: isFounderPack
            ? 'title_founder'
            : prev.gamification.equippedTitleId || 'title_seed',
          isIndieFounder:
            Boolean(prev.gamification.isIndieFounder) || isFounderPack,
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
    const isFounderPack =
      pack.id === 'pack_founder' || pack.id === 'pack_bundle_ultimate';
    triggerCelebration(
      isFounderPack
        ? '¡Gracias, Fundador Indie! 👑'
        : `¡Gracias por apoyar (${gatewayLabel})! ${pack.emoji}`,
      `Recibiste +${pack.gemsIncluded} 💎 Gemas, +${pack.shieldsIncluded} 🛡️ Escudos${pack.unlocksAllSkins
        ? `, TODOS los cosméticos del Banco y +${pack.permanentXpBonusPct}% XP permanente`
        : ''
      }.${result.licenseCode
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
          gems: (prev.gamification.gems ?? 0) + rewardedGems,
          streakShields:
            (prev.gamification.streakShields ?? 0) + rewardedShields,
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
      `Como agradecimiento recibiste +${rewardedGems} 💎 Gemas Astrales y +${rewardedShields} 🛡️ Escudos${unlocksFounder
        ? ' + Desbloqueo Total del Pase Fundador Indie'
        : ''
      }.${result.licenseCode
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
      `Se acreditaron +${codeGems} 💎 Gemas, +${codeShields} 🛡️ Escudos${unlocksFounder ? ' y TODOS los cosméticos de Fundador' : ''
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
      ? t.goalCompletedCelebration
      : t.remainingToGoalShort(
        formatObjectiveAmount(
          currentObjective.goalAmount - currentObjective.currentAmount,
          currentObjective
        )
      );

  const hasValidSelectedAmount = useMemo(() => {
    return true;
  }, [selectedQuickAmount, customAmountText]);

  const projectedGoalProgress = useMemo(() => {
    if (!hasValidSelectedAmount) return null;
    const effectiveAmount = isAddition
      ? selectedAmount
      : -Math.min(selectedAmount, Math.max(1, currentObjective.currentAmount));
    const nextAmount = Math.max(0, currentObjective.currentAmount + effectiveAmount);
    const nextPct = Math.min(100, Math.round((nextAmount / Math.max(1, currentObjective.goalAmount)) * 100));
    const nextRemaining = Math.max(0, currentObjective.goalAmount - nextAmount);
    return {
      nextAmount,
      nextPct,
      nextRemainingFormatted: formatObjectiveAmount(nextRemaining, currentObjective),
    };
  }, [hasValidSelectedAmount, isAddition, selectedAmount, currentObjective]);

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
          ? t.dailyBonusIncluded
          : isAddition && previewStreak > 1
            ? t.streakMultiplier(previewStreak)
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
    t,
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
    requiresDismissal = false,
    quote?: string
  ) => {
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }
    setCelebration({ title, message, quote, emoji, color, requiresDismissal: true });
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
    let parsedCustom = NaN;
    if (customAmountText.trim() !== '') {
      parsedCustom = Number(customAmountText.replace(',', '.'));
    }
    const effectiveAmount = !Number.isNaN(parsedCustom) && parsedCustom > 0
      ? parsedCustom
      : (selectedAmount > 0 ? selectedAmount : (quickPresetAmounts[0] || 1));

    const safeSelected = clampSafeAmount(effectiveAmount, 0, MAX_SAFE_AMOUNT);
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
    nextGamification.gems = (state.gamification.gems ?? 0) + earnedGems;
    const nextTier = Math.floor((Math.min(200, Math.max(1, nextLevel)) - 1) / 10);
    const nextMascotEmoji = mascotEmojis[nextTier] || '🪐';
    const nextMascotMessage = t.mascotMessages[nextTier] || t.mascotMessages[0];
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

    const remainingAmount = Math.max(0, updatedObj.goalAmount - updatedObj.currentAmount);
    const remainingFormatted = formatObjectiveAmount(remainingAmount, updatedObj);
    const percentCompleted = Math.min(100, Math.round(newProgress * 100));

    if (amount > 0 && previousProgress < 1 && newProgress >= 1) {
      playCelebrationFanfare('goal');
      triggerCelebration(
        '¡Felicitaciones! ¡Objetivo cumplido!',
        `Has alcanzado el 100% de tu meta. ¡Un logro excepcional de constancia y dedicación!`,
        '🏆',
        '#E5B945',
        true
      );
    } else if (nextTier > previousTier) {
      playCelebrationFanfare('species');
      triggerCelebration(
        '¡Gran avance en tu camino!',
        `${percentCompleted}% completado · Quedan ${remainingFormatted} para la meta. ¡Nueva etapa alcanzada!`,
        nextMascotEmoji,
        '#FFD54F',
        true
      );
    } else if (nextLevel > previousLevel) {
      playCelebrationFanfare('levelUp');
      triggerCelebration(
        `¡Excelente constancia (${percentCompleted}% completado)!`,
        `Quedan ${remainingFormatted} para tu meta. ${newlyUnlocked.length > 0
          ? 'Hito: ' + newlyUnlocked.join(' · ')
          : 'Cada paso te acerca más a tu objetivo.'
        }`,
        nextMascotEmoji,
        '#B58BFF'
      );
    } else if (newlyUnlocked.length > 0) {
      playCelebrationFanfare('levelUp');
      triggerCelebration(
        '¡Nuevo hito alcanzado!',
        `${newlyUnlocked.join(' · ')} · ${percentCompleted}% completado (${remainingFormatted} restantes)`,
        '🏅',
        '#B58BFF'
      );
    } else {
      if (amount > 0) {
        playAddEntrySound();
      } else {
        playSubtractEntrySound();
      }
      const motivationalQuotes = [
        'Cada pequeño esfuerzo cuenta y suma para tu meta.',
        'La constancia es la clave del éxito.',
        'Paso a paso, estás construyendo grandes resultados.',
        '¡Muy buen avance! Sigue con ese ritmo.',
        'Un día a la vez, más cerca de tu sueño.',
      ];
      const randomQuote = motivationalQuotes[Math.floor(Math.abs(amount * 17) % motivationalQuotes.length)];
      triggerCelebration(
        amount > 0 ? '¡Avance registrado!' : 'Registro actualizado',
        amount > 0
          ? `${percentCompleted}% completado · Quedan ${remainingFormatted} para la meta.`
          : `Saldo ajustado · Quedan ${remainingFormatted} para la meta.`,
        amount > 0 ? '✨' : '📝',
        '#65DB85',
        false,
        amount > 0 ? randomQuote : undefined
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
    actions.setIsEditorOpen(true);
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
    actions.setIsEditorOpen(false);
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
      actions.setIsEditorOpen(false);
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
    actions.setIsEditorOpen(false);
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
      confirmText: t.deleteConfirmAction,
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
      message: t.deleteEntryHistoryPrompt,
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
    actions.setIsBannerPickerOpen(false);
  };

  const handleAchievementClick = (rawDef: AchievementDefinition) => {
    const def = getLocalizedAchievement(rawDef, appLanguage);
    const isUnlocked = currentObjective.unlockedAchievementIds.includes(def.id);
    const title =
      def.isSecret && !isUnlocked ? t.secretAchievement : `${def.icon} ${def.title}`;
    const hintPrefix = appLanguage === 'es' ? 'Pista: ' : appLanguage === 'pt' ? 'Dica: ' : 'Hint: ';
    const detail =
      def.isSecret && !isUnlocked
        ? `${hintPrefix}${def.description}`
        : def.description;
    const unlockedLabel = appLanguage === 'es' ? 'Desbloqueado' : appLanguage === 'pt' ? 'Desbloqueado' : 'Unlocked';
    const lockedLabel = appLanguage === 'es' ? 'Por desbloquear' : appLanguage === 'pt' ? 'A desbloquear' : 'Locked';
    const rewardLabel = appLanguage === 'es' ? 'Recompensa' : appLanguage === 'pt' ? 'Recompensa' : 'Reward';
    const statusText = isUnlocked
      ? `${unlockedLabel} · +${def.rewardXp} XP`
      : lockedLabel;
    const status = isUnlocked
      ? statusText
      : `${statusText} · ${rewardLabel}: ${def.rewardXp} XP`;

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
  const currentCategory = currentObjective.category || t.categoryFallback;

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

  useEffect(() => {
    const container = objectiveTabsScrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Si el contenido entra completo y no necesita scroll horizontal, no interceptamos
      if (container.scrollWidth <= container.clientWidth) return;

      // Detiene el scroll vertical de la página principal
      e.preventDefault();

      // Mueve el contenedor horizontalmente según el giro de la rueda
      container.scrollLeft += e.deltaY;
    };

    // { passive: false } es la clave para que preventDefault() funcione correctamente
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };

  }, []);
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
              className="text-[19px] sm:text-[21px] font-bold leading-snug break-words"
              style={{ color: celebration.color }}
            >
              {celebration.title}
            </div>
            {celebration.quote && (
              <div className="w-full bg-[#2A2438] border border-[#7252A0]/70 text-[#F5EDFF] rounded-[14px] p-3 text-[14px] sm:text-[15px] italic font-medium leading-relaxed shadow-inner my-1">
                “{celebration.quote}”
              </div>
            )}
            <div className="text-[12px] sm:text-[13px] text-[#B8AFCE] leading-relaxed break-words">
              {celebration.message}
            </div>
            <button
              onClick={() => {
                playUiTap(1);
                setCelebration(null);
              }}
              className="w-full mt-3 py-2.5 rounded-[12px] bg-gradient-to-r from-[#7549B8] to-[#9B6BFF] text-white font-extrabold text-sm hover:brightness-110 active:scale-95 transition shadow-lg"
            >
              ¡Genial, continuar! 🚀
            </button>
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
          aria-label={t.openNavAria}
          title={t.openNavAria}
          className="lg:hidden fixed left-2.5 bottom-4 z-30 h-11 px-3.5 rounded-full bg-[#242238]/95 border border-[#5B4588] text-[#E6D9FF] shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md flex items-center gap-2 active:scale-95 transition"
        >
          <span className="text-[18px] leading-none">☰</span>
          <span className="text-[11px] font-semibold tracking-wide">
            {t.floatingMenuBtn}
          </span>
        </button>
      )}

      {/* Main 3-Column Grid matching MainPage.xaml */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] min-h-screen items-start">
        {/* Left Navigation Panel: Sticky on 16:9 Desktop, Scrollable Drawer on Portrait & Landscape Mobile */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[268px] max-w-[82vw] lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:max-w-none bg-[#171723] border-r border-[#29283C] pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pl-[max(0.875rem,calc(env(safe-area-inset-left,0px)+0.5rem))] pr-3.5 sm:p-4 flex flex-col justify-between overflow-y-auto overscroll-contain transition-transform duration-200 ${isNavigationOpen
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
                  <div className="text-[16px] sm:text-[17px] font-extrabold tracking-tight leading-tight whitespace-nowrap">
                    <span className="text-[#F4F1FF]">Objective</span>{' '}
                    <span className="text-[#82E59B]">Reacher</span>
                  </div>
                  <div className="text-[11px] text-[#AAA5BB] leading-tight whitespace-nowrap">
                    {t.brandTagline}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsNavigationOpen(false)}
                aria-label={t.closeMenu}
                className="lg:hidden w-8 h-8 rounded-[10px] bg-[#242238] text-[#D9C9FF] text-sm flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            <Sidebar
              currentLanguage={appLanguage}
              onSelectLanguage={(lang) => setAppLanguage(lang)}
              t={t}
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              setIsNavigationOpen={setIsNavigationOpen}
              setIsHistoryOpen={setIsHistoryOpen}
              highlightSection={highlightSection}
              openAndScrollToAsmrSanctuary={openAndScrollToAsmrSanctuary}
              openIndieShop={openIndieShop}
              refs={{
                objectiveRef,
                entriesRef,
                statsRef,
                achievementsRef,
                settingsRef,
              }}
            />
          </div>

          <div className="space-y-2.5 mt-4 shrink-0">
            <div className="rounded-[14px] border border-[#343046] bg-[#211F30] p-3 space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#FFC45D] font-bold">
                  🔥 {t.sidebarActiveStreak}
                </span>
                <span className="text-[11px] text-[#82E59B] font-mono-tabular">
                  🛡️ {t.shieldsUnit(streakShields)}
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
                    ? t.sidebarFounderBadge
                    : supporterTier === 'coffee'
                      ? t.sidebarSupporterBadge
                      : t.sidebarIndieProject}
                </span>
                <span className="text-[11px] font-mono-tabular font-bold text-[#9AF0AE]">
                  💎 {gems}
                </span>
              </div>
              <div className="text-[11px] text-[#E6D9FF] leading-snug">
                {t.indieDevEmpathySidebar}
              </div>
            </button>
          </div>
        </aside>

        {/* Center Dashboard ScrollView */}
        <main className="w-full max-w-[100vw] lg:max-w-full overflow-x-hidden px-2.5 sm:px-4 pb-16 lg:pb-8 space-y-3.5 min-w-0">
          {/* Sticky Header Bar: Relative Full-Width Single-Row Layout with Notch Safe-Area Protection */}
          <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-4 pt-[max(clamp(0.42rem,1.8vw,0.6rem),calc(env(safe-area-inset-top,0px)+0.35rem))] pb-[clamp(0.42rem,1.8vw,0.6rem)] pl-[max(clamp(0.5rem,2.4vw,1rem),calc(env(safe-area-inset-left,0px)+0.35rem))] pr-[max(clamp(0.5rem,2.4vw,1rem),calc(env(safe-area-inset-right,0px)+0.35rem))] bg-[#11121C]/95 backdrop-blur-md border-b border-[#29283C]/85 shadow-[0_6px_20px_rgba(7,8,16,0.45)]">
            <div className="flex flex-nowrap items-center justify-between w-full gap-[clamp(0.35rem,1.6vw,0.65rem)]">
              {/* Left: Menu Drawer Button + Fluid Brand Emblem & Name (Never truncated or ellipsized) */}
              <div className="flex items-center gap-[clamp(0.28rem,1.3vw,0.5rem)] shrink-0">
                <button
                  onClick={() => {
                    playUiTap(1);
                    setIsHistoryOpen(false);
                    setIsNavigationOpen(true);
                  }}
                  aria-label={t.openNav}
                  className="lg:hidden w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] bg-[#242238] border border-[#383252] text-[#D9C9FF] text-[clamp(0.8rem,3.5vw,0.95rem)] flex items-center justify-center shrink-0 hover:bg-[#302747] active:scale-95 transition"
                >
                  ☰
                </button>

                <div className="h-[clamp(1.85rem,8vw,2.2rem)] inline-flex items-center gap-[clamp(0.3rem,1.4vw,0.5rem)] px-[clamp(0.45rem,2vw,0.75rem)] rounded-[clamp(8px,2.2vw,10px)] bg-[#1A1829] border border-[#453A6B] shadow-[0_2px_10px_rgba(0,0,0,0.3)] shrink-0 flex-shrink-0 whitespace-nowrap min-w-max">
                  <img
                    src="/pwa-192x192.png"
                    alt="Objective Reacher"
                    className="w-[clamp(1.15rem,5vw,1.4rem)] h-[clamp(1.15rem,5vw,1.4rem)] rounded-[clamp(5px,1.5vw,7px)] object-cover border border-[#B58BFF]/45 shrink-0"
                  />
                  <div className="flex items-center gap-[clamp(0.2rem,0.9vw,0.35rem)] leading-none shrink-0 whitespace-nowrap">
                    <span className="text-[clamp(0.66rem,2.8vw,0.82rem)] font-black uppercase tracking-[0.04em] sm:tracking-[0.06em] text-[#F4F1FF] whitespace-nowrap select-none">
                      OBJECTIVE
                    </span>
                    <span className="text-[clamp(0.66rem,2.8vw,0.82rem)] font-black uppercase tracking-[0.05em] sm:tracking-[0.08em] text-[#82E59B] whitespace-nowrap select-none">
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
                  title={t.guardianTitleTooltip}
                >
                  {equippedGuardianTitle.emoji} {equippedGuardianTitle.title}
                </button>
                {isIndieFounder && (
                  <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full bg-[#3A2E14] border border-[#FFD54F]/60 text-[9px] font-extrabold text-[#FFD54F] whitespace-nowrap shrink-0">
                    {t.founderBadge}
                  </span>
                )}
              </div>

              {/* Right Quick Toolbar: Gems + Music + Sound + History */}
              <div className="flex items-center justify-end gap-[clamp(0.22rem,1.1vw,0.42rem)] shrink-0">
                <button
                  onClick={() => openIndieShop('skins')}
                  title={t.openStoreTooltip(gems)}
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
                    · {t.store}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openIndieShop('support')}
                  title={t.headerSupportDevTooltip}
                  className="h-[clamp(1.85rem,8vw,2.2rem)] px-[clamp(0.42rem,1.8vw,0.65rem)] rounded-[clamp(8px,2.2vw,10px)] bg-gradient-to-r from-[#3D2554] to-[#251A3B] border border-[#FFD54F]/60 hover:border-[#FFD54F] text-[#FFD54F] text-[clamp(0.62rem,2.7vw,0.78rem)] font-extrabold flex items-center justify-center gap-1 transition shrink-0 shadow-[0_2px_10px_rgba(255,213,79,0.2)] active:scale-95"
                >
                  <span className="leading-none text-[clamp(0.68rem,2.9vw,0.82rem)]">💖</span>
                  <span className="tracking-tight">{t.headerSupportDev}</span>
                </button>

                <button
                  onClick={toggleAmbientMusic}
                  aria-label={
                    sensoryPrefs.musicEnabled ? t.ambientMusicTooltipOn(getAmbientMusicStyleName(currentObjective.accentColor)) : t.ambientMusicTooltipOff(getAmbientMusicStyleName(currentObjective.accentColor))
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
                  className={`w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] text-[clamp(0.75rem,3.3vw,0.92rem)] flex items-center justify-center transition shrink-0 border ${sensoryPrefs.musicEnabled
                    ? 'bg-gradient-to-r from-[#2D2149] to-[#1D352E] border-[#82E59B]/60 text-[#9AF0AE] shadow-[0_0_10px_rgba(130,229,155,0.25)]'
                    : 'bg-[#1A1928] border-[#29283C] text-[#7D7894] hover:bg-[#242238] hover:text-[#D9C9FF]'
                    }`}
                >
                  🎵
                </button>

                <button
                  onClick={toggleSoundAndHaptics}
                  aria-label={
                    sensoryPrefs.soundEnabled ? t.soundHapticsTooltipOn : t.soundHapticsTooltipOff
                  }
                  title={
                    sensoryPrefs.soundEnabled
                      ? 'Efectos de sonido y vibración activos (toca para silenciar)'
                      : 'Sonido y vibración en silencio (toca para activar)'
                  }
                  className={`w-[clamp(1.85rem,8vw,2.2rem)] h-[clamp(1.85rem,8vw,2.2rem)] rounded-[clamp(8px,2.2vw,10px)] text-[clamp(0.75rem,3.3vw,0.92rem)] flex items-center justify-center transition shrink-0 border ${sensoryPrefs.soundEnabled
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
                  aria-label={t.openHistory}
                  title={t.history}
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
                      className={`shrink-0 px-3.5 py-2 rounded-[13px] text-xs sm:text-sm font-medium whitespace-nowrap transition flex items-center gap-2 border select-none ${isSelected
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
            </div>
          </div>

          {/* Subheader: Optimizado en 1 sola fila compacta */}
          <div className="w-full flex items-center justify-between gap-2 py-1">
            {/* Lado izquierdo: Contador + Toggle Ver todos + Archivados */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeObjectives.length > 1 && (
                <span className="text-[11px] text-[#A8A3B8] font-medium">
                  {t.activeObjectivesCount(activeObjectives.length)}
                </span>
              )}

              {activeObjectives.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playUiTap(1);
                    setIsObjectiveTabsWrapped((prev) => !prev);
                  }}
                  className="px-2 py-0.5 rounded-[8px] bg-[#211E32] border border-[#383350] text-[#C7A4FF] text-[11px] font-semibold hover:bg-[#2C2844] transition"
                >
                  {isObjectiveTabsWrapped ? t.oneRowToggle : t.viewAllToggle}
                </button>
              )}

              <button
                onClick={() => {
                  if (archivedObjectives.length === 0) {
                    setAlertDialog({
                      title: t.archived,
                      message: t.noArchivedGoals,
                    });
                  } else {
                    actions.setIsArchivedModalOpen(true);
                  }
                }}
                className="px-2.5 py-1 rounded-[8px] bg-[#262338] border border-[#383350] text-[#E2D8FF] text-[11px] hover:bg-[#322D49] transition shrink-0"
              >
                {t.archivedCount(archivedObjectives.length)}
              </button>
            </div>

            {/* Lado derecho: Botón + Nuevo objetivo */}
            <button
              onClick={handleStartNewObjective}
              style={{
                background: `linear-gradient(90deg, ${currentAccentTheme.secondary}, ${currentAccentTheme.primary})`,
                color: currentAccentTheme.buttonText,
                boxShadow: `0 4px 14px -2px ${currentAccentTheme.glow}`,
              }}
              className="ml-auto px-3 py-1 rounded-[10px] text-[12px] font-extrabold hover:brightness-110 active:scale-95 transition flex items-center gap-1 shrink-0"
            >
              <span>＋</span>
              <span>{t.newObjective}</span>
            </button>
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
            className={`relative min-h-[385px] rounded-[24px] overflow-hidden transition-all ${highlightedSection === 'objective'
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
                  objectPosition: `${50 - currentObjective.bannerOffsetX * 50}% ${50 - currentObjective.bannerOffsetY * 50
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${objectiveInsights.daysLeft < 0
                          ? 'bg-[#4A202A]/80 border-[#F27783]/50 text-[#FFD1D7]'
                          : objectiveInsights.daysLeft <= 7
                            ? 'bg-[#443318]/80 border-[#FFD54F]/60 text-[#FFE082]'
                            : ''
                          }`}
                      >
                        {objectiveInsights.daysLeft < 0
                          ? t.dateOverdue
                          : objectiveInsights.daysLeft === 0
                            ? t.dateTodayDue
                            : t.daysRemaining(objectiveInsights.daysLeft)}
                      </span>
                    )}
                  </div>

                  {/* Floating Glass Customization Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openIndieShop('cards_audio')}
                      title={t.activeFrameTooltip(equippedCardCosmetic.name)}
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
                      <span className="hidden sm:inline">{t.framesAndFx}</span>
                    </button>
                    <button
                      onClick={() => actions.setIsEditorOpen(true)}
                      title={t.customizeObjectiveTooltip}
                      style={{
                        backgroundColor: currentAccentTheme.surfaceDark,
                        borderColor: `${currentAccentTheme.primary}40`,
                        color: currentAccentTheme.textSoft,
                      }}
                      className="px-2.5 py-1.5 rounded-[11px] hover:brightness-110 border backdrop-blur-md text-[11px] font-semibold transition flex items-center gap-1"
                    >
                      <span>🎨</span>
                      <span className="hidden sm:inline">
                        {t.customizeObjective}
                      </span>
                    </button>
                    <button
                      onClick={() => actions.setIsBannerPickerOpen(true)}
                      title={t.changeBackgroundTooltip}
                      style={{
                        backgroundColor: currentAccentTheme.surfaceDark,
                        borderColor: `${currentAccentTheme.primary}40`,
                        color: currentAccentTheme.textSoft,
                      }}
                      className="px-2.5 py-1.5 rounded-[11px] hover:brightness-110 border backdrop-blur-md text-[11px] font-semibold transition flex items-center gap-1"
                    >
                      <span>▧</span>
                      <span className="hidden sm:inline">
                        {t.changeBackground}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Full-Width Objective Identity Row (Emblem + Title + Description) */}
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => actions.setIsEditorOpen(true)}
                    title={t.changeIconTooltip}
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
                        onClick={() => actions.setIsEditorOpen(true)}
                        style={{ color: currentAccentTheme.primary }}
                        className="text-[11px] font-semibold hover:underline text-left"
                      >
                        {t.addPledgeOrDate}
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
                    {t.achievedBadge}
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
                      className={`text-[10px] font-mono-tabular font-bold ${isAddition ? '' : 'text-[#FFD1D7]'
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
                      {progress >= 1 ? t.progressAchieved : t.progressAdvance}
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
                    {t.finalGoalLabel}
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
                      ? t.remainingToGoal(
                        formatObjectiveAmount(
                          objectiveInsights.remaining,
                          currentObjective
                        )
                      )
                      : t.goalSurpassed}
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
                          title={t.milestoneTitle(
                            pctLabel,
                            formatObjectiveAmount(
                              currentObjective.goalAmount * m,
                              currentObjective
                            )
                          )}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all ${reached
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
                        ? t.nextMilestone(
                          objectiveInsights.nextMilestonePct,
                          formatObjectiveAmount(
                            objectiveInsights.amountToNextMilestone,
                            currentObjective
                          )
                        )
                        : t.allMilestonesCompleted}
                    </span>
                    <span
                      style={{ color: currentAccentTheme.textMuted }}
                      className="text-[10px] font-mono-tabular shrink-0"
                    >
                      {t.entriesCountLabel(currentObjective.entries.length)}
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
                        ? t.suggestedPace(
                          formatObjectiveAmount(
                            objectiveInsights.dailyPaceNeeded,
                            currentObjective
                          )
                        )
                        : objectiveInsights.bestEntry > 0
                          ? t.highestImpulse(
                            formatObjectiveAmount(
                              objectiveInsights.bestEntry,
                              currentObjective
                            )
                          )
                          : remainingText}
                    </span>
                  </div>

                  {currentObjective.pledge ? (
                    <div
                      style={{ color: currentAccentTheme.primary }}
                      className="text-[11px] font-bold flex items-start sm:items-center gap-1 leading-snug break-words"
                    >
                      <span className="shrink-0">🎁</span>
                      <span>{t.pledgeReward(currentObjective.pledge)}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => actions.setIsEditorOpen(true)}
                      style={{ color: currentAccentTheme.primary }}
                      className="text-[10px] font-bold hover:underline text-left sm:text-right shrink-0"
                    >
                      {t.definePledge}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Entries Section (Registrar Progreso — Unified Sanctuary Card) */}
          <div
            ref={entriesRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${highlightedSection === 'entries'
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

            {/* Header Row with Focus Toggle & Goal Impact */}
            <div className="flex items-center justify-between gap-2 flex-wrap relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[10px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-sm shrink-0">
                  {isAddition ? '⚡' : '📉'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F4F1FF] leading-tight">
                    {t.registerProgress}
                  </h3>
                  <p className="text-[11px] text-[#A8A3B8] leading-snug">
                    {t.quickOrWrite}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleSereneMode}
                  title={t.sereneFocusSubtitle}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all flex items-center gap-1 ${isSereneMode
                    ? 'bg-[#182923] border-[#65DB85]/60 text-[#82E59B]'
                    : 'bg-[#1E1C2C] border-[#38334E] text-[#A8A3B8] hover:text-[#D8C5FF]'
                    }`}
                >
                  <span>{isSereneMode ? '🌱' : '⚡'}</span>
                  <span>{isSereneMode ? '🌱 Enfoque Sereno (Ocultar XP)' : '⚡ Modo XP Activo'}</span>
                </button>

                {!isSereneMode && liveXpPreview && (
                  <div
                    className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all duration-200 shrink-0 ${liveXpPreview.willLevelUp
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
                        {t.levelUpPreview}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Segmented Mode Switcher (+ Sumar / - Restar) */}
            <div className="p-1 rounded-[14px] bg-[#13121E] border border-[#2B263D] grid grid-cols-2 gap-1.5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  playUiTap(2);
                  setIsAddition(true);
                }}
                className={`h-[42px] rounded-[10px] font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-all ${isAddition
                  ? 'bg-gradient-to-r from-[#1F4E37] to-[#193C2B] border border-[#65DB85]/60 text-[#B8F7C8] shadow-[0_2px_12px_rgba(101,219,133,0.2)]'
                  : 'bg-transparent border border-transparent text-[#8F89A3] hover:text-[#D5CFE6]'
                  }`}
              >
                <span className="text-sm leading-none">＋</span>
                <span>{t.addAdvance}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiTap(0);
                  setIsAddition(false);
                }}
                className={`h-[42px] rounded-[10px] font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-all ${!isAddition
                  ? 'bg-gradient-to-r from-[#522435] to-[#3B1A26] border border-[#FF7A8A]/60 text-[#FFD1D7] shadow-[0_2px_12px_rgba(242,119,131,0.2)]'
                  : 'bg-transparent border border-transparent text-[#8F89A3] hover:text-[#D5CFE6]'
                  }`}
              >
                <span className="text-sm leading-none">−</span>
                <span>{t.subtractExpense}</span>
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
                    className={`h-[40px] px-1.5 rounded-[11px] text-[12px] font-mono-tabular font-bold truncate border transition-all active:scale-95 ${isSelected
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
                  placeholder={t.customPlaceholder(formatObjectiveAmount(selectedAmount, currentObjective))}
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
                placeholder={t.optionalNotePlaceholder}
                className="w-full h-[44px] px-3 rounded-[12px] bg-[#141320] text-[#F4F1FF] placeholder-[#8A849E] text-xs sm:text-[13px] border border-[#2D2840] focus:outline-none focus:border-[#9B6BFF] transition"
              />

              <button
                type="button"
                onClick={handleAddEntry}
                style={
                  isAddition
                    ? {
                      background: `linear-gradient(90deg, ${currentAccentTheme.secondary}, ${currentAccentTheme.primary})`,
                      color: currentAccentTheme.buttonText,
                      boxShadow: `0 4px 14px -2px ${currentAccentTheme.glow}`,
                    }
                    : undefined
                }
                className={`h-[44px] px-4 rounded-[12px] font-extrabold text-xs sm:text-[13px] hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shrink-0 flex items-center justify-center gap-1.5 ${isAddition
                  ? ''
                  : 'bg-gradient-to-r from-[#8E354A] to-[#B5435E] text-white shadow-[0_4px_14px_rgba(181,67,94,0.35)]'
                  }`}
              >
                <span>{isAddition ? '＋' : '−'}</span>
                <span>
                  {t.registerButton(
                    hasValidSelectedAmount
                      ? formatObjectiveAmount(selectedAmount, currentObjective)
                      : ''
                  )}
                </span>
              </button>
            </div>

            {/* Live Goal Impact Feedback */}
            {projectedGoalProgress && (
              <div className="flex items-center justify-between text-[11px] px-1 text-[#C8C2D8] relative z-10 pt-1 border-t border-[#2B263D]/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#82E59B]"></span>
                  <span className="font-semibold text-[#82E59B]">
                    {t.projectedRemaining(
                      projectedGoalProgress.nextRemainingFormatted,
                      projectedGoalProgress.nextPct
                    )}
                  </span>
                </span>
                <span className="font-mono-tabular font-bold text-[#F4F1FF]">
                  {formatObjectiveAmount(
                    projectedGoalProgress.nextAmount,
                    currentObjective
                  )}{' '}
                  /{' '}
                  {formatObjectiveAmount(
                    currentObjective.goalAmount,
                    currentObjective
                  )}
                </span>
              </div>
            )}

            {persistenceMessage && (
              <div className="text-[11px] text-[#FF9EAB] bg-[#291520] border border-[#542A38] px-3 py-1.5 rounded-[10px]">
                {persistenceMessage}
              </div>
            )}
          </div>

          {/* Achievements Horizontal Section (Unified Sanctuary Medals) */}
          <div
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${highlightedSection === 'achievements'
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
                      {t.achievementsSectionTitle}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#252138] border border-[#3E355B] text-[10px] font-mono-tabular font-bold text-[#D8C5FF]">
                      {currentObjective.unlockedAchievementIds.length}/
                      {ACHIEVEMENT_CATALOG.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A8A3B8] leading-snug">
                    {t.achievementsSectionSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => actions.setIsAllAchievementsOpen(true)}
                className="text-[10px] font-bold text-[#C7A4FF] hover:text-white hover:underline transition shrink-0"
              >
                {t.viewAllAchievements}
              </button>
            </div>

            <div
              ref={achievementsRef}

              {...getHorizontalScrollProps()}
              className="flex gap-2 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
            >
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const isUnlocked =
                  currentObjective.unlockedAchievementIds.includes(ach.id);
                const title =
                  ach.isSecret && !isUnlocked ? t.secretAchievement : ach.title;
                const icon = ach.isSecret && !isUnlocked ? '❔' : ach.icon;

                return (
                  <button
                    key={ach.id}
                    onClick={() => handleAchievementClick(ach)}
                    className={`w-[235px] shrink-0 p-2.5 rounded-[14px] border text-left flex items-start gap-2.5 transition-all active:scale-98 ${isUnlocked
                      ? 'bg-gradient-to-br from-[#1B312A] to-[#14221E] border-[#65DB85]/50 shadow-[0_4px_14px_rgba(101,219,133,0.12)] hover:border-[#82E59B]'
                      : 'bg-[#141320]/90 border-[#2B273D] hover:border-[#463D63] hover:bg-[#191728]'
                      }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-[11px] border flex items-center justify-center text-[20px] shrink-0 mt-0.5 ${isUnlocked
                        ? 'bg-[#12221C] border-[#65DB85]/45 shadow-[0_0_10px_rgba(101,219,133,0.2)]'
                        : 'bg-[#1C1A2B] border-[#2C283E] opacity-75'
                        }`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className={`text-[12px] font-bold leading-snug break-words ${isUnlocked ? 'text-[#9AF0AE]' : 'text-[#D5CFE6]'
                          }`}
                      >
                        {title}
                      </div>
                      <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                        {ach.description}
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <span
                          className={`text-[9px] font-mono-tabular font-bold px-1.5 py-0.2 rounded ${isUnlocked
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
                      ? t.petMascotTooltipUnclaimed
                      : t.petMascotTooltipPetted
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
                    className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border shadow-sm transition-transform group-hover:scale-110 ${!hasPettedToday
                      ? 'bg-[#3A1E36] text-[#FF9EC2] border-[#FF80AB]/60'
                      : 'bg-[#262238] text-[#D8C5FF] border-[#51436C]'
                      }`}
                  >
                    {!hasPettedToday
                      ? t.petMascotRewardUnclaimed
                      : t.petMascotRewardPetted}
                  </span>
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[14px] sm:text-[15px] font-bold text-[#F4F1FF] tabular-nums">
                      {experienceText}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAlertDialog({
                        title: '🐾 Tu Mascota Guardiana (Módulo 100% Opcional)',
                        message: 'Tu mascota evoluciona y te acompaña a medida que registras avances en tus objetivos principales. Es un acompañante puramente decorativo y motivacional. No es obligatorio interactuar con ella ni afecta el cálculo de tus metas. Puedes disfrutar de tus objetivos con o sin mascota según prefieras.'
                      })}
                      className="w-5 h-5 rounded-full bg-[#29233E] text-[#B58BFF] border border-[#51436C] text-[10px] font-bold flex items-center justify-center hover:bg-[#383054] transition"
                      title="¿Qué es esto?"
                    >
                      ?
                    </button>
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
                      <span>{t.playAsmrCta}</span>
                    </button>
                    <button
                      onClick={() => {
                        playUiTap(3);
                        actions.setMascotGalleryStartLevel(level);
                        actions.setIsMascotGalleryOpen(true);
                      }}
                      className="text-[10px] font-bold text-[#C7A4FF] hover:text-white hover:underline transition"
                    >
                      {t.codexLink}
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
                    {equippedSkin.emoji} {t.auraLabel}: {equippedSkin.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => openIndieShop('buffs')}
                    title={t.streakShieldTooltip}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#18262F] border border-[#355A6E] text-[#90E0FF] hover:border-[#64D8FF] transition"
                  >
                    🛡️ {t.streakShieldCount(streakShields)}
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
                      {t.founderBonusBadge}
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
                    {t.stageEvolutionTrack(mascotTier + 1, currentSubLevelIndex + 1)}
                  </span>
                  <span className="text-[#9AF0AE] font-mono-tabular">
                    {mascotTier < 19
                      ? t.nextSpeciesIn(levelsToNextSpecies)
                      : t.supremeStageUnlocked}
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
                          actions.setMascotGalleryStartLevel(nodeLevel);
                          actions.setIsMascotGalleryOpen(true);
                        }}
                        title={t.viewLevelInCodex(nodeLevel)}
                        className={`h-[7px] flex-1 rounded-full transition-all ${isCurrent
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
                    actions.setMascotGalleryStartLevel(nextSpeciesLevel);
                    actions.setIsMascotGalleryOpen(true);
                  }}
                  title={t.spyLevelSilhouette(nextSpeciesLevel, t.mascotStageHints[nextSpeciesTier])}
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
                        className={`w-[22px] h-[22px] rounded-[7px] text-[9px] font-bold flex items-center justify-center border transition-all ${d.isActive
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setIsDailyRitualOpen((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-bold border flex items-center gap-1.5 transition ${unclaimedReadyQuestsCount > 0 || canClaimAllDailyBonus
                      ? 'bg-[#35294F] border-[#FFD54F] text-[#FFE082] shadow-[0_0_10px_rgba(255,213,79,0.25)]'
                      : 'bg-[#252136] border-[#3D3559] text-[#D8C5FF] hover:bg-[#2F2A44]'
                      }`}
                  >
                    <span>
                      {t.dailyQuestsHeader(completedQuestsCount, dailyQuests.length)}
                    </span>
                    {(unclaimedReadyQuestsCount > 0 || canClaimAllDailyBonus) && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FFD54F] text-[#1A162B] text-[9px] font-extrabold">
                        {t.claimButton}
                      </span>
                    )}
                    <span className="text-[9px] opacity-80">
                      {isDailyRitualOpen ? '▲' : '▼'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Collapsible Daily Quests Drawer (Auto-highlights if unclaimed rewards or opened) */}
              {(isDailyRitualOpen ||
                unclaimedReadyQuestsCount > 0 ||
                canClaimAllDailyBonus) && (
                  <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2E2942] space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between flex-wrap gap-1.5 text-[10px] text-[#A8A3B8]">
                      <span className="leading-snug">
                        {t.dailySealBonusNotice}
                      </span>
                      {isAllDailyBonusClaimed ? (
                        <span className="text-[#82E59B] font-bold shrink-0">
                          {t.dailySealCompleted}
                        </span>
                      ) : canClaimAllDailyBonus ? (
                        <button
                          onClick={handleClaimAllDailyBonus}
                          className="px-2.5 py-1 rounded-[7px] bg-gradient-to-r from-[#E5B945] to-[#FFD54F] text-[#1A162B] font-extrabold text-[10px] hover:brightness-110 active:scale-95 transition shadow shrink-0"
                        >
                          {t.claimChestBonus}
                        </button>
                      ) : (
                        <span className="text-[#FFD54F] font-mono-tabular shrink-0">
                          {t.dailyChestLabel(completedQuestsCount)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {dailyQuests.map((q) => {
                        const canClaim = q.isCompleted && !q.isClaimed;
                        return (
                          <div
                            key={q.id}
                            className={`p-2 rounded-[10px] border flex items-center justify-between gap-2 transition ${q.isClaimed
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
                                  className={`text-[11px] font-bold leading-snug break-words ${q.isClaimed
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

          {/* Dedicated Standalone ASMR Sanctuary Bento Card (Placed right below Mascot & before Boost Stats) */}
          <div
            ref={asmrSanctuaryRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#181C2C] via-[#141525] to-[#12121E] space-y-3.5 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${highlightedSection === 'asmr' || highlightedSection === 'asmr_clicker'
              ? 'border-[2px] border-[#64D8FF]'
              : 'border border-[#2D334D]'
              }`}
          >
            {/* Header: Title, Taps Counter, Daily Gems Badge, Ambient Music Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-8 h-8 rounded-[10px] bg-[#1E263A] border border-[#3E527D] flex items-center justify-center text-sm shrink-0">
                    🫧
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[14px] sm:text-[15px] font-extrabold uppercase tracking-wider text-[#64D8FF] leading-tight">
                        {t.asmrTitle}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setAlertDialog({
                          title: '🫧 Santuario ASMR (Módulo 100% Opcional)',
                          message: 'Este bloque es un espacio puramente de relajación sensorial y sonora. Al tocar el orbe o cambiar de estilo, generas sonidos binaurales y puedes desbloquear aspectos estéticos gratis mientras avanzas en tus metas. Es totalmente opcional: si prefieres una experiencia minimalista o sin sonido, puedes ignorarlo por completo sin perder ninguna función principal de tus metas ni agregar complejidad de uso.'
                        })}
                        className="w-5 h-5 rounded-full bg-[#20293D] text-[#64D8FF] border border-[#3E527D] text-[10px] font-bold flex items-center justify-center hover:bg-[#2A3752] transition"
                        title="¿Qué es esto?"
                      >
                        ?
                      </button>
                    </div>
                    <p className="text-[11px] text-[#C8C2D8] leading-tight">
                      {t.asmrSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-[#1C2A38] border border-[#64D8FF]/40 text-[10px] font-mono-tabular font-bold text-[#9AF0AE]">
                  {t.totalTaps}: {asmrTotalTaps}
                </span>
                <span
                  title={t.dailyGemsTooltip}
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-mono-tabular font-extrabold ${asmrRemainingDailyGems > 0
                    ? 'bg-[#231F38] border-[#FFD54F]/50 text-[#FFE082]'
                    : 'bg-[#1D3028] border-[#82E59B]/50 text-[#9AF0AE]'
                    }`}
                >
                  {t.dailyGemsCap(asmrGemsEarnedToday, DAILY_ASMR_GEM_CAP)}
                </span>
                <button
                  type="button"
                  onClick={toggleAmbientMusic}
                  title={
                    sensoryPrefs.musicEnabled
                      ? t.ambientMusicTooltipOn(
                        getAmbientMusicStyleName(currentObjective.accentColor)
                      )
                      : t.ambientMusicTooltipOff(
                        getAmbientMusicStyleName(currentObjective.accentColor)
                      )
                  }
                  className={`px-2.5 py-1 rounded-[10px] border text-[10px] font-extrabold shrink-0 flex items-center gap-1.5 transition ${sensoryPrefs.musicEnabled
                    ? 'bg-[#1D352E] border-[#82E59B]/60 text-[#9AF0AE]'
                    : 'bg-[#1E1B2E] border-[#383252] text-[#C8C2D8] hover:text-white'
                    }`}
                >
                  <span>🎵</span>
                  <span>
                    {sensoryPrefs.musicEnabled
                      ? t.ambientMusicOn(
                        getAmbientMusicStyleName(currentObjective.accentColor)
                      )
                      : t.ambientMusicOff}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter Tabs + Carousel Scroll Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#262A3E]">
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: 'all', label: `${t.filterAll} (${ASMR_TEXTURES.length})` },
                  {
                    id: 'unlocked',
                    label: `${t.filterMyOrbs} (${ASMR_TEXTURES.filter((tex) => isAsmrStyleUnlocked(tex)).length
                      })`,
                  },
                  { id: 'taps', label: `${t.filterTaps} (4)` },
                  { id: 'skins', label: `${t.filterSkins} (8)` },
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
                      className={`px-2.5 py-1 rounded-[8px] text-[10px] font-bold border transition ${active
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
                  {t.slideStylesHint}
                </span>
                <button
                  type="button"
                  onClick={() => scrollAsmrCarousel('left')}
                  aria-label={t.scrollAsmrLeft}
                  className="w-7 h-7 rounded-[8px] bg-[#1D1B2E] border border-[#383252] text-[#D8C5FF] hover:bg-[#2A2642] text-xs flex items-center justify-center transition"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => scrollAsmrCarousel('right')}
                  aria-label={t.scrollAsmrRight}
                  className="w-7 h-7 rounded-[8px] bg-[#1D1B2E] border border-[#383252] text-[#D8C5FF] hover:bg-[#2A2642] text-xs flex items-center justify-center transition"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Scrollable 16 ASMR Orb Style Cards */}
            <div
              ref={asmrSkinsScrollRef}
              {...getHorizontalScrollProps()}
              className="flex items-stretch gap-2 overflow-x-auto px-1.5 py-1.5 scroll-smooth horizontal-scroll-strip cursor-grab active:cursor-grabbing"
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
                    onClick={() => {
                      if (unlocked) {
                        // 1. Si ya está desbloqueada, la selecciona/equipa directamente
                        handleSelectAsmrTexture(tex);
                      } else if (tex.unlockKind === 'gems') {
                        // 2. Si requiere gemas, activa el modal de confirmación
                        setItemToPurchase({
                          id: tex.id,
                          name: tex.name,
                          icon: tex.emoji,
                          requiredGems: tex.gemCost,
                          _type: 'asmr_texture',
                          _raw: tex,
                        });
                      }
                    }}
                    style={
                      isSelected
                        ? {
                          borderColor: tex.accentColor,
                          boxShadow: `0 0 12px -2px ${tex.secondaryColor}`,
                        }
                        : undefined
                    }
                    className={`min-w-[122px] max-w-[134px] p-2 rounded-[12px] border text-left shrink-0 transition flex flex-col justify-between gap-1 ${isSelected
                      ? 'bg-[#1D253A] text-white'
                      : unlocked
                        ? 'bg-[#171625] border-[#2F2B46] text-[#E6E0F2] hover:border-[#64D8FF]/60'
                        : 'bg-[#13121E]/90 border-[#28243C] text-[#A8A3B8] hover:border-[#FFD54F]/60'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div
                        style={{
                          background: tex.orbGradient,
                          borderColor: tex.accentColor,
                          boxShadow: `0 0 8px ${tex.secondaryColor}`,
                        }}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs shrink-0 ${tex.ringStyle === 'dashed'
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
                          ✓ {t.inUse}
                        </span>
                      ) : unlocked ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#1C3329] text-[#82E59B] text-[8px] font-extrabold">
                          ✓ {t.ready}
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
                      <div className="text-[10.5px] font-extrabold leading-tight break-words">
                        {tex.name}
                      </div>
                      <div className="text-[8.5px] text-[#9E97B0] leading-tight mt-0.5 break-words line-clamp-2">
                        {tex.subtitle}
                      </div>
                    </div>

                    {!unlocked && tex.unlockKind === 'taps' && (
                      <div className="w-full h-1 rounded-full bg-[#221F33] overflow-hidden">
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
                        <span>{t.trySound}</span>
                        <span>{t.openArrow}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Interactive ASMR Clicker Stage + Harmony Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-3.5 p-3 rounded-[16px] bg-[#100F1A]/95 border border-[#2B2842]">
              <div className="relative flex justify-center py-2">
                {/* Floating ASMR Sparks with dedicated lane positioning so sparks never overlap */}
                {asmrFloatingSparks.map((sp) => (
                  <div
                    key={sp.id}
                    style={{
                      left: `calc(50% + ${sp.xOffset}px)`,
                      top: `${-16 + (sp.yOffset ?? 0)}px`,
                      transform: `translateX(-50%) rotate(${sp.rotDeg ?? 0}deg)`,
                    }}
                    className="pointer-events-none absolute z-20"
                  >
                    <span
                      style={{ color: sp.color }}
                      className="inline-block text-[11px] font-extrabold drop-shadow animate-asmr-spark whitespace-nowrap select-none"
                    >
                      {sp.text}
                    </span>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleClickOrb}
                  onMouseDown={handleStartAsmrHold}
                  onMouseUp={handleStopAsmrHold}
                  onMouseLeave={handleStopAsmrHold}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleStartAsmrHold();
                  }}
                  onTouchEnd={handleStopAsmrHold}
                  onTouchCancel={handleStopAsmrHold}
                  title={t.holdToStreamHint}
                  aria-label={`${t.tapOrbButton}: ${activeAsmrTextureObj.name}`}
                  style={{
                    background: activeAsmrTextureObj.orbGradient,
                    borderColor: activeAsmrTextureObj.accentColor,
                    boxShadow: isAsmrHolding
                      ? `0 0 42px 6px ${activeAsmrTextureObj.secondaryColor}, 0 0 20px #FFD54F`
                      : `0 0 28px -2px ${activeAsmrTextureObj.secondaryColor}`,
                  }}
                  className={`w-28 h-28 sm:w-24 sm:h-24 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 select-none cursor-pointer relative transition-transform ${isAsmrHolding
                    ? 'scale-95 ring-4 ring-[#FFD54F]/70'
                    : 'hover:scale-105 active:scale-95'
                    } ${activeAsmrTextureObj.ringStyle === 'dashed'
                      ? 'border-dashed'
                      : activeAsmrTextureObj.ringStyle === 'double'
                        ? 'ring-2 ring-white/25'
                        : ''
                    }`}
                >
                  <span className={`text-3xl leading-none drop-shadow ${isAsmrHolding ? 'animate-pulse' : ''}`}>
                    {activeAsmrTextureObj.emoji}
                  </span>
                  <span className="text-[10px] font-extrabold text-white tracking-wide drop-shadow">
                    {isAsmrHolding ? t.asmrFlowing : t.tapOrbButton}
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
                    {t.harmonyChest(asmrCycleProgress, ASMR_CYCLE_TAPS)}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-[#FFD54F]">
                    {t.tapsRemaining(ASMR_CYCLE_TAPS - asmrCycleProgress)}
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
                  for (const tx of ASMR_TEXTURES) {
                    if (
                      tx.unlockKind === 'taps' &&
                      typeof tx.requiredTaps === 'number' &&
                      tx.requiredTaps > asmrTotalTaps
                    ) {
                      return (
                        <div className="flex items-center justify-between flex-wrap gap-1.5 text-[10px] text-[#90E0FF] bg-[#161F30] px-2.5 py-1.5 rounded-[8px] border border-[#64D8FF]/25">
                          <span>
                            {t.nextFreeOrb(
                              tx.name,
                              tx.emoji,
                              asmrTotalTaps,
                              tx.requiredTaps
                            )}
                          </span>
                          <span className="font-mono-tabular font-bold shrink-0">
                            {asmrTotalTaps}/{tx.requiredTaps}
                          </span>
                        </div>
                      );
                    }
                  }
                  return null;
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
                    {t.asmrZenRule(DAILY_ASMR_GEM_CAP)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Section (Unified Sanctuary Bento Grid) */}
          <div
            ref={statsRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${highlightedSection === 'stats'
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
                    {t.statsTitle}
                  </h3>
                  <p className="text-[11px] text-[#A8A3B8]">
                    {t.statsSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>{t.statMovementsLabel}</span>
                  <span>📝</span>
                </div>
                <div className="text-[17px] font-extrabold font-mono-tabular text-[#F4F1FF]">
                  {totalEntryCount}
                </div>
                <div className="text-[10px] text-[#8F89A3] leading-tight break-words">
                  {t.statInGoal(currentObjective.entries.length)}
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>{t.activeStreak.toUpperCase()}</span>
                  <span>🔥</span>
                </div>
                <div className="text-[17px] font-extrabold font-mono-tabular text-[#FFC45D]">
                  {streakDays} {streakDays === 1 ? t.streakDaysUnit : t.streakDaysPlural}
                </div>
                <div className="text-[10px] text-[#8F89A3] leading-tight break-words">
                  {streakDays > 0 ? t.streakIgnitePrompt : t.activeStreak}
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>{t.statBestLabel}</span>
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
                  {t.statSingle}
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[#A8A3B8]">
                  <span>{t.statGuardianLabel}</span>
                  <span>✨</span>
                </div>
                <div className="text-[17px] font-extrabold font-mono-tabular text-[#D8C5FF]">
                  {t.mascotLevelLabel(level)}
                </div>
                <div className="text-[10px] text-[#8F89A3] font-mono-tabular leading-tight break-words">
                  {state.gamification.totalXp} XP · {t.statTotalGems(gems)}
                </div>
              </div>
            </div>
          </div>

          {/* Settings Section (Unified Sanctuary 2x2 Action Grid) */}
          <div
            ref={settingsRef}
            className={`p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-b from-[#1E1C2E] to-[#171624] space-y-3 relative overflow-hidden shadow-[0_8px_28px_rgba(10,9,20,0.45)] transition-all ${highlightedSection === 'settings'
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
                {/* Language Picker in Settings Panel */}
                <div className="flex items-center gap-1 p-0.5 rounded-[10px] bg-[#141222] border border-[#3B3258]">
                  <span className="text-[10px] text-[#A8A3B8] px-1.5 font-bold hidden sm:inline">
                    {t.languageLabel}:
                  </span>
                  {[
                    { code: 'es', label: '🇪🇸 ES' },
                    { code: 'en', label: '🇺🇸 EN' },
                    { code: 'pt', label: '🇧🇷 PT' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => changeLanguage(l.code as AppLanguage)}
                      title={`Cambiar idioma a ${l.label}`}
                      className={`px-2 py-1 rounded-[7px] text-[10px] font-extrabold transition ${appLanguage === l.code
                        ? 'bg-[#653CA6] text-white shadow-sm'
                        : 'text-[#A8A3B8] hover:text-white'
                        }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleAmbientMusic}
                  title={
                    sensoryPrefs.musicEnabled
                      ? t.ambientMusicTooltipOn(
                        getAmbientMusicStyleName(currentObjective.accentColor)
                      )
                      : t.ambientMusicTooltipOff(
                        getAmbientMusicStyleName(currentObjective.accentColor)
                      )
                  }
                  className={`px-3 py-1.5 rounded-[11px] border text-[11px] font-bold flex items-center gap-1.5 transition ${sensoryPrefs.musicEnabled
                    ? 'bg-[#1F2D2B] border-[#65DB85]/45 text-[#9AF0AE]'
                    : 'bg-[#181726] border-[#2E2A42] text-[#9E97B0]'
                    }`}
                >
                  <span>🎵</span>
                  <span>
                    {sensoryPrefs.musicEnabled
                      ? t.ambientMusicOn(
                        getAmbientMusicStyleName(currentObjective.accentColor)
                      )
                      : t.ambientMusicOff}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleSoundAndHaptics}
                  title={
                    sensoryPrefs.soundEnabled
                      ? t.soundHapticsTooltipOn
                      : t.soundHapticsTooltipOff
                  }
                  className={`px-3 py-1.5 rounded-[11px] border text-[11px] font-bold flex items-center gap-1.5 transition ${sensoryPrefs.soundEnabled
                    ? 'bg-[#1F2D2B] border-[#65DB85]/45 text-[#9AF0AE]'
                    : 'bg-[#181726] border-[#2E2A42] text-[#9E97B0]'
                    }`}
                >
                  <span>{sensoryPrefs.soundEnabled ? '🔊' : '🔇'}</span>
                  <span>
                    {sensoryPrefs.soundEnabled
                      ? t.soundHapticsOn
                      : t.soundHapticsOff}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playUiTap(2);
                  actions.setIsEditorOpen(true);
                }}
                className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] hover:border-[#635091] hover:bg-[#1C1A2E] flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[#26213B] border border-[#413663] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  🎨
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                    {t.settingsEditGoalTitle}
                  </div>
                  <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                    {t.settingsEditGoalSubtitle}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTap(2);
                  actions.setIsBannerPickerOpen(true);
                }}
                className="p-2.5 rounded-[14px] bg-[#141320]/90 border border-[#2B273D] hover:border-[#635091] hover:bg-[#1C1A2E] flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[#26213B] border border-[#413663] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  🖼️
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                    {t.settingsBackgroundTitle}
                  </div>
                  <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                    {t.settingsBackgroundSubtitle}
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
                    {t.settingsArchiveTitle}
                  </div>
                  <div className="text-[10px] text-[#9E97B0] leading-snug break-words">
                    {t.settingsArchiveSubtitle}
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
                    {t.settingsDeleteTitle}
                  </div>
                  <div className="text-[10px] text-[#C48B96] leading-snug break-words">
                    {t.settingsDeleteSubtitle}
                  </div>
                </div>
              </button>
            </div>

            {/* Indie Sanctuary Banner + Android Release Keystore Access inside Ajustes */}
            <div className="p-3 rounded-[15px] bg-gradient-to-r from-[#241D38] via-[#1E2235] to-[#1A2926] border border-[#4A3B6E] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-extrabold text-[#F4F1FF] flex items-center gap-1.5 flex-wrap">
                  <span>{t.settingsIndieCardTitle}</span>
                </div>
                <p className="text-[11px] text-[#C6C0D6] leading-snug break-words">
                  {t.settingsIndieCardSub(gems)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => openIndieShop('skins')}
                  className="px-3 py-2 rounded-[11px] bg-gradient-to-r from-[#7549B8] to-[#9B6BFF] text-white text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition shadow"
                >
                  {t.settingsSkinsBuffsBtn}
                </button>
                <button
                  type="button"
                  onClick={() => openIndieShop('support')}
                  className="px-3 py-2 rounded-[11px] bg-[#252138] border border-[#4A3E6D] text-[#E6D9FF] text-[11px] font-bold hover:bg-[#312B4B] transition"
                >
                  {t.settingsSupportDevBtn}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right History Panel */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-[320px] max-w-[86vw] lg:static lg:w-auto lg:max-w-none lg:block bg-[#171723] border-l border-[#29283C] pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pr-[max(1rem,calc(env(safe-area-inset-right,0px)+0.5rem))] pl-4 sm:p-4 flex flex-col gap-3.5 transition-transform duration-200 ${isHistoryOpen
            ? 'translate-x-0'
            : 'translate-x-full lg:translate-x-0'
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-[17px] font-bold text-[#F4F1FF]">
                {t.historyTitle}
              </h3>
              <div className="text-[12px] text-[#A8A3B8]">
                {t.currentBalanceLabel}{' '}
                {formatObjectiveAmount(
                  currentObjective.currentAmount,
                  currentObjective
                )}
              </div>
            </div>
            <button
              onClick={() => setIsHistoryOpen(false)}
              aria-label={t.closeHistory}
              className="lg:hidden w-[42px] h-[42px] rounded-[12px] bg-[#242238] text-[#F4F1FF] text-[22px] flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="p-1 rounded-[12px] bg-[#12111C] border border-[#2B263D] grid grid-cols-3 gap-1">
            {[
              { id: 'all', label: t.historyFilterAll },
              { id: 'add', label: t.historyFilterAdd },
              { id: 'subtract', label: t.historyFilterSubtract },
            ].map((tab) => {
              const isSelected = historyFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setHistoryFilter(tab.id as 'all' | 'add' | 'subtract')
                  }
                  className={`h-[34px] rounded-[9px] text-[11px] font-bold transition ${isSelected
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
                const amountFormatted = `${isPositive ? '+' : '−'
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
                      className={`w-8 h-8 rounded-[9px] border flex items-center justify-center text-xs font-extrabold shrink-0 ${isPositive
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
      {modals.isEditorOpen && (
        <ObjectiveEditorModal
          objective={currentObjective}
          isNewDraft={isDraftObjective}
          onCancel={handleCancelObjectiveEditor}
          onSave={handleSaveObjectiveEditor}
          onAlert={(title, message) => setAlertDialog({ title, message })}
        />
      )}

      {/* Modal: BannerPickerPage */}
      {modals.isBannerPickerOpen && (
        <BannerPickerModal
          onCancel={() => actions.setIsBannerPickerOpen(false)}
          onApply={handleApplyBanner}
          onAlert={(title, message) => setAlertDialog({ title, message })}
        />
      )}

      {/* Modal: MascotGalleryPage (200 evolutions) */}
      {modals.isMascotGalleryOpen && (
        <MascotGalleryModal
          initialLevel={level}
          initialPreviewLevel={modals.mascotGalleryStartLevel ?? level}
          skinId={equippedSkinId}
          onOpenSkins={() => {
            actions.setIsMascotGalleryOpen(false);
            openIndieShop('skins');
          }}
          onClose={() => {
            actions.setIsMascotGalleryOpen(false);
            actions.setMascotGalleryStartLevel(null);
          }}
        />
      )}

      {/* Modal: Indie Sanctuary Emporium (216-Item Vault: Skins, Card FX, Sound Packs, Buffs & Indie Support) */}
      {modals.isIndieShopOpen && (
        <IndieEmporiumModal
          t={t}
          launchTimeLeft={launchTimeLeft}
          initialTab={modals.indieShopInitialTab}
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
            actions.setIsIndieShopOpen(false);
            highlightSection('objective', objectiveRef);
          }}
          onClose={() => actions.setIsIndieShopOpen(false)}
        />
      )}

      {/* Modal: AchievementsPage */}
      {modals.isAllAchievementsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0D0E17]/95 backdrop-blur-md flex flex-col pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.4rem))] pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.4rem))] px-3.5 sm:p-6 overflow-hidden">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-3.5 min-h-0">
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1B182B] border border-[#3E355B] text-[10px] font-extrabold uppercase tracking-wider text-[#C7A4FF]">
                  <span>🎯</span>
                  <span>OBJECTIVE</span>
                  <span className="text-[#82E59B]">REACHER</span>
                  <span className="text-[#FFD54F]">· LOGROS</span>
                </div>
                <button
                  onClick={() => actions.setIsAllAchievementsOpen(false)}
                  className="px-3.5 py-1.5 rounded-[10px] bg-[#252138] border border-[#3E355B] text-[#F4F1FF] text-xs sm:text-sm font-bold hover:bg-[#322C4B] transition shrink-0"
                >
                  ← Volver
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[11px] bg-[#252138] border border-[#3E355B] flex items-center justify-center text-base shrink-0">
                  🏆
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] sm:text-[20px] font-extrabold text-[#F4F1FF] leading-tight">
                    Todos los Logros ({currentObjective.unlockedAchievementIds.length}/
                    {ACHIEVEMENT_CATALOG.length})
                  </h2>
                  <p className="text-[11px] sm:text-[12px] text-[#A8A3B8] leading-snug">
                    Toca cualquier medalla para conocer su historia o pista secreta
                  </p>
                </div>
              </div>
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
                    className={`p-3.5 rounded-[16px] border text-left flex items-center gap-3 transition-all ${isUnlocked
                      ? 'bg-gradient-to-br from-[#1B312A] to-[#14221E] border-[#65DB85]/55 shadow-[0_4px_14px_rgba(101,219,133,0.12)] hover:border-[#82E59B]'
                      : 'bg-[#161522]/90 border-[#2B273D] hover:border-[#463D63]'
                      }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-[13px] border flex items-center justify-center text-[24px] shrink-0 ${isUnlocked
                        ? 'bg-[#12221C] border-[#65DB85]/45'
                        : 'bg-[#1E1C2D] border-[#2E2A42] opacity-75'
                        }`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[13px] font-bold truncate ${isUnlocked ? 'text-[#9AF0AE]' : 'text-[#E2D8FF]'
                            }`}
                        >
                          {title}
                        </span>
                        <span
                          className={`text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full shrink-0 ${isUnlocked
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
      {modals.isArchivedModalOpen && (
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
                          actions.setIsArchivedModalOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#604094] text-white text-xs font-medium"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => {
                          actions.setIsArchivedModalOpen(false);
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
                onClick={() => actions.setIsArchivedModalOpen(false)}
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

      {/* Modal de Confirmación para Orbes ASMR */}
    {itemToPurchase && (
      <PurchaseConfirmModal
        item={itemToPurchase}
        /* Detecta la variable de gemas sea cual sea su nombre en este componente */
        userGems={typeof gems !== 'undefined' ? gems : (typeof gems !== 'undefined' ? gems : 0)}
        onClose={() => setItemToPurchase(null)}
        onConfirm={() => {
          if (itemToPurchase._raw) {
            handleSelectAsmrTexture(itemToPurchase._raw);
          }
          setItemToPurchase(null);
        }}
        onOpenShop={() => {
          setItemToPurchase(null); // Cierra el modal de confirmación
          
          /* Ejecuta el método disponible para abrir la tienda */
          if (typeof openIndieShop === 'function') {
            openIndieShop('support');
          } else if (typeof actions.setIsIndieShopOpen === 'function') {
            actions.setIsIndieShopOpen(true);
          } else if (typeof setActiveNav === 'function') {
            setActiveNav('shop');
          }
        }}
      />
    )}
    </div>
  );
}

export function doTitlesShareCoreMeaning(oldTitle: string, newTitle: string): boolean {
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
