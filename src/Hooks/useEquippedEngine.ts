import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMascotEngine } from '../Hooks/useMascotEngine';
import { findMascotSkin, findCardCosmetic, findGuardianTitle, MascotSkinDefinition } from '../monetization';
import { playMascotVoice, playUiTap, playCelebrationFanfare } from '../soundEffects';

export interface useEquippedEngineProps {
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
  actions?: any;
}

export function useEquippedEngine(props: useEquippedEngineProps = {}) {
  const { state, todayDateKey, t, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, gems, setAlertDialog, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp, level, hasEntryToday, streakDays, currentObjective, hasPettedToday, setXpBurst, actions } = props;

  const { mascotJoyId, setMascotJoyId, mascotSpeech, setMascotSpeech, mascotSpeechTimerRef, triggerMascotSpeech, isAsmrSanctuaryOpen, asmrFloatingSparks, lastAsmrPrizeNotice, setLastAsmrPrizeNotice, asmrTapCooldownCounterRef, asmrHoldTimerRef, asmrHoldIntervalRef, asmrHoldLastShiftTimeRef, asmrHoldMouseDownFiredRef, asmrTotalTapsRef, asmrLastSparkTimeRef, asmrSparkLaneRef, isAsmrHolding, asmrSanctuaryRef, asmrSkinsScrollRef, asmrFilterCategory, setAsmrFilterCategory, DAILY_ASMR_GEM_CAP, ASMR_CYCLE_TAPS, asmrTotalTaps, asmrPreferredTexture, asmrCycleProgress, asmrGemsEarnedToday, asmrRemainingDailyGems, activeAsmrTextureObj, isAsmrStyleUnlocked, openAndScrollToAsmrSanctuary, scrollAsmrCarousel, handleSelectAsmrTexture, handleAsmrClick, stopAsmrTimer, handleStopAsmrHold, handleStartAsmrHold, mascotTier, mascotEmojis, mascotEmoji, mascotMessage, mascotMood, nextSpeciesLevel, nextSpeciesTier, levelsToNextSpecies, handlePetMascot } = useMascotEngine({ state, todayDateKey, t, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, gems, setAlertDialog, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp, level, hasEntryToday, streakDays, currentObjective, hasPettedToday, setXpBurst });

  const unlockedSkins = state.gamification.unlockedSkins || ['default'];

  const equippedSkinId = state.gamification.equippedSkinId || 'default';

  const equippedSkin = useMemo(
      () => findMascotSkin(equippedSkinId),
      [equippedSkinId]
    );

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

  const handleUnlockOrEquipSkin = (skin: MascotSkinDefinition) => {
      const isUnlocked =
        isIndieFounder ||
        skin.gemCost === 0 ||
        unlockedSkins.includes(skin.id);
  
      if (isUnlocked) {
        playMascotVoice(level, false);
        setState((prev: any) => ({
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
      setState((prev: any) => {
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
    handleUnlockOrEquipSkin
  };
}
