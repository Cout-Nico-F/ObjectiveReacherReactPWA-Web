export enum AchievementCondition {
  None = 'None',
  EntryCount = 'EntryCount',
  StreakDays = 'StreakDays',
  ProgressPercent = 'ProgressPercent',
  LargestContributionPercent = 'LargestContributionPercent',
  WeekendEntryCount = 'WeekendEntryCount',
  EarlyEntryCount = 'EarlyEntryCount',
  LateEntryCount = 'LateEntryCount',
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardXp: number;
  isSecret: boolean;
  condition: AchievementCondition;
  threshold: number;
}

export interface ObjectiveUnit {
  id: string;
  displayName: string;
  prefix: string;
  suffix: string;
}

export interface ObjectiveEntry {
  id: string;
  description: string;
  amount: number;
  createdAt: string; // ISO string
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  unitId: string;
  customUnitLabel: string;
  bannerId: string;
  bannerOffsetX: number;
  bannerOffsetY: number;
  isArchived: boolean;
  entries: ObjectiveEntry[];
  unlockedAchievementIds: string[];
  icon?: string;
  category?: string;
  accentColor?: string;
  targetDate?: string;
  pledge?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface GamificationState {
  totalXp: number;
  bonusXp?: number;
  lastPetDateKey?: string;
  claimedQuestsByDay?: Record<string, string[]>;
  gems?: number;
  unlockedSkins?: string[];
  equippedSkinId?: string;
  unlockedVaultIds?: string[];
  equippedCardFrameId?: string;
  equippedCardStyleId?: string;
  equippedSoundPackId?: string;
  equippedTitleId?: string;
  streakShields?: number;
  xpBoostUntil?: string;
  gemMagnetUntil?: string;
  isIndieFounder?: boolean;
  supporterTier?: 'none' | 'coffee' | 'founder';
  asmrTotalTaps?: number;
  asmrPreferredTexture?: string;
  asmrGemsDateKey?: string;
  asmrGemsEarnedToday?: number;
  redeemedLicenseTxIds?: string[];
  lastIssuedLicenseCode?: string;
}

export interface DashboardState {
  version: number;
  objectives: Objective[];
  selectedObjectiveId: string;
  gamification: GamificationState;
}

export interface CelebrationData {
  title: string;
  message: string;
  quote?: string;
  emoji: string;
  color: string;
  requiresDismissal: boolean;
}
