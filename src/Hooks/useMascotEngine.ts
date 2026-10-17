import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAsmrEngine } from '../Hooks/useAsmrEngine';
import { formatObjectiveAmount } from '../catalog';
import { playMascotVoice } from '../soundEffects';
import { calculateLevelFromXp } from '../utils/gamification';

export interface useMascotEngineProps {
  state?: any;
  todayDateKey?: any;
  t?: any;
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
  hasEntryToday?: any;
  streakDays?: any;
  currentObjective?: any;
  hasPettedToday?: any;
  setXpBurst?: any;
}

export function useMascotEngine(props: useMascotEngineProps = {}) {
  const { state, todayDateKey, t, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, gems, setAlertDialog, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp, level, hasEntryToday, streakDays, currentObjective, hasPettedToday, setXpBurst } = props;

  const [mascotJoyId, setMascotJoyId] = useState<number>(0);

  const [mascotSpeech, setMascotSpeech] = useState<string | null>(null);

  const mascotSpeechTimerRef = useRef<number | null>(null);

  const triggerMascotSpeech = (text: string) => {
          if (mascotSpeechTimerRef.current) {
            window.clearTimeout(mascotSpeechTimerRef.current);
          }
          setMascotSpeech(text);
          mascotSpeechTimerRef.current = window.setTimeout(() => {
            setMascotSpeech(null);
          }, 3800);
        };

  const { isAsmrSanctuaryOpen, setIsAsmrSanctuaryOpen, asmrFloatingSparks, setAsmrFloatingSparks, lastAsmrPrizeNotice, setLastAsmrPrizeNotice, asmrTapCooldownCounterRef, asmrHoldTimerRef, asmrHoldIntervalRef, asmrHoldLastShiftTimeRef, asmrHoldMouseDownFiredRef, asmrTotalTapsRef, asmrLastSparkTimeRef, asmrSparkLaneRef, isAsmrHolding, setIsAsmrHolding, asmrSanctuaryRef, asmrSkinsScrollRef, asmrFilterCategory, setAsmrFilterCategory, DAILY_ASMR_GEM_CAP, ASMR_CYCLE_TAPS, asmrTotalTaps, asmrPreferredTexture, asmrCycleProgress, asmrGemsEarnedToday, asmrRemainingDailyGems, activeAsmrTextureObj, isAsmrStyleUnlocked, openAndScrollToAsmrSanctuary, scrollAsmrCarousel, handleSelectAsmrTexture, handleAsmrClick, stopAsmrTimer, handleStopAsmrHold, handleStartAsmrHold } = useAsmrEngine({ state, todayDateKey, t, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, triggerMascotSpeech, gems, setAlertDialog, setMascotJoyId, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp });

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

  const nextSpeciesLevel = Math.min(200, (mascotTier + 1) * 10 + 1);

  const nextSpeciesTier = Math.min(19, mascotTier + 1);

  const levelsToNextSpecies = Math.max(0, nextSpeciesLevel - level);

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
  
        setState((prev: any) => ({
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

  return {
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
    handlePetMascot
  };
}
