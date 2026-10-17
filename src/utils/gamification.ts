import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_IDS } from '../catalog';
import { Objective, ObjectiveEntry, AchievementDefinition, AchievementCondition } from '../types';

export function calculateLevelFromXp(xp: number): number {
  return Math.floor((Math.sqrt(1 + (4 * Math.max(0, xp)) / 25) - 1) / 2) + 1;
}

export function calculateSingleEntryXp(
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

export function recalculateAllXp(objectives: Objective[], bonusXp = 0): number {
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

export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function calculateCurrentStreak(
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

export function isSecretAchievementMet(
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

export function evaluateObjectiveAchievements(
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

export function formatProgressNumber(progress: number, lang: string = 'es'): string {
  const pct = Math.min(100, Math.max(0, progress * 100));
  if (Number.isInteger(pct) || pct === 100 || pct === 0) {
    return `${Math.round(pct)}`;
  }
  const locale = lang === 'en' ? 'en-US' : (lang === 'pt' ? 'pt-BR' : 'es-ES');
  return pct.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatProgressPercent(progress: number, lang: string = 'es'): string {
  return `${formatProgressNumber(progress, lang)}%`;
}
