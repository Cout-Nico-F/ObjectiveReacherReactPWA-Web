import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ObjectiveEntry, Objective } from '../types';
import { calculateCurrentStreak, toLocalDateKey, recalculateAllXp, evaluateObjectiveAchievements } from '../utils/gamification';
import { useEquippedEngine } from '../Hooks/useEquippedEngine';
import { formatObjectiveAmount, CUSTOM_UNIT_ID, clampSafeAmount, MAX_SAFE_AMOUNT } from '../catalog';
import { playUiTap, playCelebrationFanfare } from '../soundEffects';

export interface useObjectiveEngineProps {
  state?: any;
  t?: any;
  streakShields?: any;
  todayDateKey?: any;
  isIndieFounder?: any;
  unlockedVaultIds?: any;
  setIsNavigationOpen?: any;
  setIsHistoryOpen?: any;
  setState?: any;
  gems?: any;
  setAlertDialog?: any;
  triggerCelebration?: any;
  activeGemMultiplier?: any;
  activeXpMultiplier?: any;
  totalXp?: any;
  level?: any;
  setXpBurst?: any;
  actions?: any;
  hasValidSelectedAmount?: any;
  isAddition?: any;
  selectedAmount?: any;
  setHistoryFilter?: any;
  setActiveNav?: any;
  setHighlightedSection?: any;
  setConfirmDialog?: any;
  progress?: any;
}

export function useObjectiveEngine(props: useObjectiveEngineProps = {}) {
  const { state, t, streakShields, todayDateKey, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, gems, setAlertDialog, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp, level, setXpBurst, actions, hasValidSelectedAmount, isAddition, selectedAmount, setHistoryFilter, setActiveNav, setHighlightedSection, setConfirmDialog, progress } = props;

  const [isDraftObjective, setIsDraftObjective] = useState<boolean>(false);

  const [previousObjectiveId, setPreviousObjectiveId] = useState<string | null>(null);

  const [editingEntry, setEditingEntry] = useState<ObjectiveEntry | null>(null);

  const [entryActionTarget, setEntryActionTarget] = useState<ObjectiveEntry | null>(null);

  const objectiveRef = useRef<HTMLDivElement>(null);

  const objectiveTabsScrollRef = useRef<HTMLDivElement>(null);

  const [isObjectiveTabsWrapped, setIsObjectiveTabsWrapped] = useState<boolean>(false);

  const activeObjectives = useMemo(() => {
          const unarchived = state.objectives.filter((o: any) => !o.isArchived);
          if (unarchived.length <= 1) return unarchived;
  
          const getCreatedMs = (o: Objective, idx: number) => {
            const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
            return Number.isNaN(t) || t === 0 ? idx : t;
          };
          const getUsedMs = (o: Objective, idx: number) => {
            const t = o.lastUsedAt ? new Date(o.lastUsedAt).getTime() : 0;
            return Number.isNaN(t) || t === 0 ? getCreatedMs(o, idx) : t;
          };
  
          const indexed = unarchived.map((obj: any, idx: any) => ({
            obj,
            createdMs: getCreatedMs(obj, idx),
            usedMs: getUsedMs(obj, idx),
          }));
  
          const newestEntry = [...indexed].sort((a: any, b: any) => b.createdMs - a.createdMs)[0];
          const lastUsedEntry = [...indexed].sort((a: any, b: any) => b.usedMs - a.usedMs)[0];
  
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
            .filter((item: any) => !placedIds.has(item.obj.id))
            .sort((a: any, b: any) => b.usedMs - a.usedMs || b.createdMs - a.createdMs);
  
          for (const item of remaining) {
            result.push(item.obj);
          }
  
          return result;
        }, [state.objectives]);

  const currentObjective = useMemo(() => {
          return (
            state.objectives.find(
              (o: any) => o.id === state.selectedObjectiveId && !o.isArchived
            ) ||
            activeObjectives[0] ||
            state.objectives[0]
          );
        }, [state.objectives, state.selectedObjectiveId, activeObjectives]);

  const streakDays = useMemo(
          () =>
            calculateCurrentStreak(
              state.objectives,
              state.gamification.streakShields || 0
            ),
          [state.objectives, state.gamification.streakShields]
        );

  const todayEntries = useMemo(() => {
          return state.objectives.flatMap((obj: any) =>
            obj.entries.filter((e: any) => toLocalDateKey(e.createdAt) === todayDateKey)
          );
        }, [state.objectives, todayDateKey]);

  const hasEntryToday = todayEntries.length > 0;

  const hasPettedToday = state.gamification.lastPetDateKey === todayDateKey;

  const { mascotJoyId, setMascotJoyId, mascotSpeech, setMascotSpeech, mascotSpeechTimerRef, triggerMascotSpeech, isAsmrSanctuaryOpen, asmrFloatingSparks, lastAsmrPrizeNotice, setLastAsmrPrizeNotice, asmrTapCooldownCounterRef, asmrHoldTimerRef, asmrHoldIntervalRef, asmrHoldLastShiftTimeRef, asmrHoldMouseDownFiredRef, asmrTotalTapsRef, asmrLastSparkTimeRef, asmrSparkLaneRef, isAsmrHolding, asmrSanctuaryRef, asmrSkinsScrollRef, asmrFilterCategory, setAsmrFilterCategory, DAILY_ASMR_GEM_CAP, ASMR_CYCLE_TAPS, asmrTotalTaps, asmrPreferredTexture, asmrCycleProgress, asmrGemsEarnedToday, asmrRemainingDailyGems, activeAsmrTextureObj, isAsmrStyleUnlocked, openAndScrollToAsmrSanctuary, scrollAsmrCarousel, handleSelectAsmrTexture, handleAsmrClick, stopAsmrTimer, handleStopAsmrHold, handleStartAsmrHold, mascotTier, mascotEmojis, mascotEmoji, mascotMessage, mascotMood, nextSpeciesLevel, nextSpeciesTier, levelsToNextSpecies, handlePetMascot, unlockedSkins, equippedSkinId, equippedSkin, equippedCardFrameId, equippedCardCosmetic, equippedCardStyleId, equippedSoundPackId, equippedTitleId, equippedGuardianTitle, handleUnlockOrEquipSkin } = useEquippedEngine({ state, todayDateKey, t, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, gems, setAlertDialog, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp, level, hasEntryToday, streakDays, currentObjective, hasPettedToday, setXpBurst, actions });

  const archivedObjectives = useMemo(
      () => state.objectives.filter((o: any) => o.isArchived),
      [state.objectives]
    );

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

  const handleSelectObjective = (id: string) => {
      playUiTap(1);
      const nowIso = new Date().toISOString();
      setState((prev: any) => ({
        ...prev,
        selectedObjectiveId: id,
        objectives: prev.objectives.map((o: any) =>
          o.id === id ? { ...o, lastUsedAt: nowIso } : o
        ),
      }));
      setHistoryFilter('all');
      setActiveNav('objective');
      setHighlightedSection('objective');
      window.setTimeout(() => {
        setHighlightedSection((prev: any) => (prev === 'objective' ? null : prev));
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
      setState((prev: any) => ({
        ...prev,
        objectives: [newObj, ...prev.objectives],
        selectedObjectiveId: newId,
      }));
      actions.setIsEditorOpen(true);
    };

  const handleCancelObjectiveEditor = () => {
      if (isDraftObjective) {
        setState((prev: any) => {
          const remaining = prev.objectives.filter(
            (o: any) => o.id !== prev.selectedObjectiveId
          );
          const fallbackId =
            previousObjectiveId && remaining.some((o: any) => o.id === previousObjectiveId)
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
  
        setState((prev: any) => ({
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
  
      setState((prev: any) => {
        const nextObjectives = prev.objectives.map((o: any) =>
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
        const updatedObj = nextObjectives.find((o: any) => o.id === currentObjective.id)!;
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
            (o: any) => !o.isArchived && o.id !== currentObjective.id
          );
          if (otherActive.length === 0) {
            setAlertDialog({
              title: 'No se pudo archivar',
              message: 'Debe quedar al menos un objetivo activo.',
            });
            return;
          }
          setState((prev: any) => ({
            ...prev,
            objectives: prev.objectives.map((o: any) =>
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
          const activeCount = state.objectives.filter((o: any) => !o.isArchived).length;
          if (!target.isArchived && activeCount <= 1) {
            setAlertDialog({
              title: 'No se pudo eliminar',
              message: 'No se puede eliminar el único objetivo activo.',
            });
            return;
          }
          setState((prev: any) => {
            const remaining = prev.objectives.filter((o: any) => o.id !== target.id);
            const nextSelected =
              prev.selectedObjectiveId === target.id
                ? (remaining.find((o: any) => !o.isArchived) || remaining[0]).id
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

  const objectiveInsights = useMemo(() => {
      const remaining = Math.max(
        0,
        currentObjective.goalAmount - currentObjective.currentAmount
      );
      const positiveEntries = currentObjective.entries.filter((e: any) => e.amount > 0);
      const bestEntry = positiveEntries.reduce(
        (max: any, e: any) => Math.max(max, e.amount),
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

  return {
    isDraftObjective,
    setIsDraftObjective,
    previousObjectiveId,
    setPreviousObjectiveId,
    editingEntry,
    setEditingEntry,
    entryActionTarget,
    setEntryActionTarget,
    objectiveRef,
    objectiveTabsScrollRef,
    isObjectiveTabsWrapped,
    setIsObjectiveTabsWrapped,
    activeObjectives,
    currentObjective,
    streakDays,
    todayEntries,
    hasEntryToday,
    hasPettedToday,
    mascotJoyId,
    setMascotJoyId,
    mascotSpeech,
    setMascotSpeech,
    mascotSpeechTimerRef,
    triggerMascotSpeech,
    isAsmrSanctuaryOpen,
    asmrFloatingSparks,
    lastAsmrPrizeNotice,
    setLastAsmrPrizeNotice,
    asmrTapCooldownCounterRef,
    asmrHoldTimerRef,
    asmrHoldIntervalRef,
    asmrHoldLastShiftTimeRef,
    asmrHoldMouseDownFiredRef,
    asmrTotalTapsRef,
    asmrLastSparkTimeRef,
    asmrSparkLaneRef,
    isAsmrHolding,
    asmrSanctuaryRef,
    asmrSkinsScrollRef,
    asmrFilterCategory,
    setAsmrFilterCategory,
    DAILY_ASMR_GEM_CAP,
    ASMR_CYCLE_TAPS,
    asmrTotalTaps,
    asmrPreferredTexture,
    asmrCycleProgress,
    asmrGemsEarnedToday,
    asmrRemainingDailyGems,
    activeAsmrTextureObj,
    isAsmrStyleUnlocked,
    openAndScrollToAsmrSanctuary,
    scrollAsmrCarousel,
    handleSelectAsmrTexture,
    handleAsmrClick,
    stopAsmrTimer,
    handleStopAsmrHold,
    handleStartAsmrHold,
    mascotTier,
    mascotEmojis,
    mascotEmoji,
    mascotMessage,
    mascotMood,
    nextSpeciesLevel,
    nextSpeciesTier,
    levelsToNextSpecies,
    handlePetMascot,
    unlockedSkins,
    equippedSkinId,
    equippedSkin,
    equippedCardFrameId,
    equippedCardCosmetic,
    equippedCardStyleId,
    equippedSoundPackId,
    equippedTitleId,
    equippedGuardianTitle,
    handleUnlockOrEquipSkin,
    archivedObjectives,
    projectedGoalProgress,
    handleSelectObjective,
    handleStartNewObjective,
    handleCancelObjectiveEditor,
    handleSaveObjectiveEditor,
    handleArchiveCurrentObjective,
    handleDeleteObjective,
    projectedObjectiveProgress,
    objectiveInsights
  };
}
