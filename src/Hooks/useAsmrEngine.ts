import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ASMR_TEXTURES, AsmrTextureOption, playUiTap, playAsmrClickSound, playCelebrationFanfare } from '../soundEffects';

export interface useAsmrEngineProps {
  state?: any;
  todayDateKey?: any;
  t?: any;
  isIndieFounder?: any;
  unlockedVaultIds?: any;
  setIsNavigationOpen?: any;
  setIsHistoryOpen?: any;
  setState?: any;
  triggerMascotSpeech?: any;
  gems?: any;
  setAlertDialog?: any;
  setMascotJoyId?: any;
  triggerCelebration?: any;
  activeGemMultiplier?: any;
  activeXpMultiplier?: any;
  totalXp?: any;
}

export function useAsmrEngine(props: useAsmrEngineProps = {}) {
  const { state, todayDateKey, t, isIndieFounder, unlockedVaultIds, setIsNavigationOpen, setIsHistoryOpen, setState, triggerMascotSpeech, gems, setAlertDialog, setMascotJoyId, triggerCelebration, activeGemMultiplier, activeXpMultiplier, totalXp } = props;

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

  const asmrTapCooldownCounterRef = useRef<number>(0);

  const asmrHoldTimerRef = useRef<number | null>(null);

  const asmrHoldIntervalRef = useRef<number>(255);

  const asmrHoldLastShiftTimeRef = useRef<number>(0);

  const asmrHoldMouseDownFiredRef = useRef<boolean>(false);

  const asmrTotalTapsRef = useRef<number>(0);

  const asmrLastSparkTimeRef = useRef<number>(0);

  const asmrSparkLaneRef = useRef<number>(0);

  const [isAsmrHolding, setIsAsmrHolding] = useState<boolean>(false);

  const asmrSanctuaryRef = useRef<HTMLDivElement>(null);

  const asmrSkinsScrollRef = useRef<HTMLDivElement>(null);

  const [asmrFilterCategory, setAsmrFilterCategory] = useState<
      'all' | 'unlocked' | 'taps' | 'skins'
    >('all');

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
      ASMR_TEXTURES.find((t: any) => t.id === asmrPreferredTexture) || ASMR_TEXTURES[0];

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
        setState((prev: any) => ({
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
      setState((prev: any) => {
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
        (t: any) => t.unlockKind === 'taps' && t.requiredTaps === nextTaps
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
  
        setAsmrFloatingSparks((prev: any) => [...prev.slice(-3), newSpark]);
  
        // Automatically clean up spark after 2.8s
        window.setTimeout(() => {
          setAsmrFloatingSparks((prev: any) => prev.filter((s: any) => s.id !== nowId));
        }, 2800);
      }
  
      setState((prev: any) => {
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

  return {
    isAsmrSanctuaryOpen,
    setIsAsmrSanctuaryOpen,
    asmrFloatingSparks,
    setAsmrFloatingSparks,
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
    setIsAsmrHolding,
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
    handleStartAsmrHold
  };
}
