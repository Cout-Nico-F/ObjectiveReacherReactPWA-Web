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
}

export interface GamificationState {
  totalXp: number;
  bonusXp?: number;
  lastPetDateKey?: string;
  claimedQuestsByDay?: Record<string, string[]>;
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
  emoji: string;
  color: string;
  requiresDismissal: boolean;
}
