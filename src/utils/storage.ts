import { DashboardState } from '../types';
import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../constants';
import { clampSafeAmount, CUSTOM_UNIT_ID, MAX_SAFE_AMOUNT } from '../catalog';
import { recalculateAllXp } from './gamification';

export function createEmptyState(): DashboardState {
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

export function loadState(): DashboardState {
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
