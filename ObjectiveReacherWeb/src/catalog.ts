import {
  AchievementCondition,
  AchievementDefinition,
  Objective,
  ObjectiveUnit,
} from './types';

export const CUSTOM_UNIT_ID = 'custom';
export const MAX_SAFE_AMOUNT = 999_999_999;

export function clampSafeAmount(
  value: number,
  min = 0,
  max = MAX_SAFE_AMOUNT
): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export const OBJECTIVE_UNITS: ObjectiveUnit[] = [
  { id: CUSTOM_UNIT_ID, displayName: 'Personalizada', prefix: '', suffix: '' },
  { id: 'MXN', displayName: 'Peso mexicano (MXN)', prefix: '$', suffix: ' MXN' },
  { id: 'ARS', displayName: 'Peso argentino (ARS)', prefix: '$', suffix: ' ARS' },
  { id: 'CLP', displayName: 'Peso chileno (CLP)', prefix: '$', suffix: ' CLP' },
  { id: 'COP', displayName: 'Peso colombiano (COP)', prefix: '$', suffix: ' COP' },
  { id: 'JPY', displayName: 'Yen japonés (JPY)', prefix: '¥', suffix: ' JPY' },
  { id: 'USD', displayName: 'Dólar estadounidense (USD)', prefix: '$', suffix: ' USD' },
  { id: 'EUR', displayName: 'Euro (EUR)', prefix: '€', suffix: '' },
  { id: 'GBP', displayName: 'Libra esterlina (GBP)', prefix: '£', suffix: '' },
  { id: 'CAD', displayName: 'Dólar canadiense (CAD)', prefix: '$', suffix: ' CAD' },
];

export function findObjectiveUnit(id?: string): ObjectiveUnit | undefined {
  return OBJECTIVE_UNITS.find((u) => u.id === id);
}

function formatCompactMagnitude(absValue: number, isCustom: boolean): string {
  if (!Number.isFinite(absValue)) return '0';
  if (absValue >= 1_000_000_000_000) {
    return `${(absValue / 1_000_000_000_000).toLocaleString('es-ES', {
      maximumFractionDigits: 2,
    })} B`;
  }
  if (absValue >= 1_000_000_000) {
    return `${(absValue / 1_000_000_000).toLocaleString('es-ES', {
      maximumFractionDigits: 2,
    })} mil M`;
  }
  if (absValue >= 10_000_000) {
    return `${(absValue / 1_000_000).toLocaleString('es-ES', {
      maximumFractionDigits: 2,
    })} M`;
  }
  return isCustom
    ? absValue.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : Math.round(absValue).toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
}

export function formatObjectiveAmount(amount: number, objective: Objective): string {
  const unit = findObjectiveUnit(objective.unitId);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const absoluteAmount = Math.abs(safeAmount);
  const isCustom = !unit || unit.id === CUSTOM_UNIT_ID;

  const number = formatCompactMagnitude(absoluteAmount, isCustom);
  const sign = safeAmount < 0 ? '−' : '';

  if (isCustom) {
    const customLabel = (objective.customUnitLabel || '').trim().slice(0, 12);
    if (customLabel.length === 0) {
      return `${sign}${number}`;
    }
    if (
      customLabel === '$' ||
      customLabel === '¥' ||
      customLabel === '€' ||
      customLabel === '£'
    ) {
      return `${sign}${customLabel}${number}`;
    }
    return `${sign}${number} ${customLabel}`;
  }

  return `${sign}${unit.prefix}${number}${unit.suffix}`;
}

export const ACHIEVEMENT_IDS = {
  FirstEntry: 'first-entry',
  ThreeDayStreak: 'streak-3',
  SevenDayStreak: 'streak-7',
  Progress25: 'progress-25',
  Progress50: 'progress-50',
  Progress100: 'progress-100',
  GoalComplete: 'goal-complete',
} as const;

function createAllAchievements(): AchievementDefinition[] {
  const achievements: AchievementDefinition[] = [
    {
      id: ACHIEVEMENT_IDS.FirstEntry,
      title: 'Primer paso',
      description: 'Registra tu primera entrada',
      icon: '🟢',
      rewardXp: 50,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
    {
      id: ACHIEVEMENT_IDS.ThreeDayStreak,
      title: 'En marcha',
      description: '3 días consecutivos',
      icon: '🌱',
      rewardXp: 90,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
    {
      id: ACHIEVEMENT_IDS.SevenDayStreak,
      title: 'Constante',
      description: '7 días consecutivos',
      icon: '🔥',
      rewardXp: 180,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
    {
      id: ACHIEVEMENT_IDS.Progress25,
      title: 'Un cuarto',
      description: 'Alcanza el 25% de tu objetivo',
      icon: '🥉',
      rewardXp: 100,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
    {
      id: ACHIEVEMENT_IDS.Progress50,
      title: 'A mitad de camino',
      description: 'Alcanza el 50% de tu objetivo',
      icon: '🎯',
      rewardXp: 200,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
    {
      id: ACHIEVEMENT_IDS.Progress100,
      title: 'Al máximo',
      description: 'Alcanza el 100% de tu objetivo',
      icon: '💯',
      rewardXp: 350,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
    {
      id: ACHIEVEMENT_IDS.GoalComplete,
      title: 'Objetivo cumplido',
      description: 'Completa tu objetivo',
      icon: '🏆',
      rewardXp: 500,
      isSecret: false,
      condition: AchievementCondition.None,
      threshold: 0,
    },
  ];

  const tenStepRewards = [40, 70, 110, 160, 220, 300, 400, 520, 660, 850];
  const fiveStepRewards = [50, 100, 180, 300, 480];

  const addThresholdAchievements = (
    condition: AchievementCondition,
    thresholds: number[],
    titles: string[],
    hints: string[],
    icon: string
  ) => {
    const rewardTable = thresholds.length === 5 ? fiveStepRewards : tenStepRewards;
    for (let index = 0; index < thresholds.length; index++) {
      const threshold = thresholds[index];
      const title = titles[index];
      const hint = hints[index % hints.length];
      const rewardXp = rewardTable[Math.min(index, rewardTable.length - 1)];
      achievements.push({
        id: `secret-${condition.toLowerCase()}-${threshold}`,
        title,
        description: hint.replace('{0}', String(threshold)),
        icon,
        rewardXp,
        isSecret: true,
        condition,
        threshold,
      });
    }
  };

  addThresholdAchievements(
    AchievementCondition.EntryCount,
    [2, 5, 10, 20, 30, 50, 75, 100, 150, 250],
    [
      'Dúo',
      'Coleccionista',
      'Diez pasos',
      'Imparable',
      'Ritmo propio',
      'Medio centenar',
      'Gran constancia',
      'Centenario',
      'Maratón',
      'Leyenda',
    ],
    [
      'Registra {0} entradas en este objetivo',
      'Cada registro suma. ¿Cuántos llevas?',
      'La constancia se cuenta entrada a entrada.',
    ],
    '🗝️'
  );

  addThresholdAchievements(
    AchievementCondition.StreakDays,
    [2, 4, 10, 14, 21, 30, 45, 60, 90, 100],
    [
      'Segundo día',
      'Racha encendida',
      'Diez seguidos',
      'Dos semanas',
      'Tres semanas',
      'Un mes',
      'Sin pausa',
      'Dos meses',
      'Trimestre firme',
      'Cien días',
    ],
    [
      'Mantén tu racha durante {0} días',
      'Vuelve mañana para descubrirlo.',
      'La pista está en tus días activos.',
    ],
    '🌘'
  );

  addThresholdAchievements(
    AchievementCondition.ProgressPercent,
    [5, 10, 15, 20, 30, 40, 60, 70, 80, 90],
    [
      'Primera señal',
      'Despegue',
      'En camino',
      'Un quinto',
      'Casi un tercio',
      'Buen impulso',
      'Más de la mitad',
      'Tramo avanzado',
      'A la vista',
      'Último tramo',
    ],
    [
      'Alcanza el {0}% de tu objetivo',
      'Tu progreso guarda una sorpresa.',
      'Sigue avanzando para revelar este secreto.',
    ],
    '🌟'
  );

  addThresholdAchievements(
    AchievementCondition.LargestContributionPercent,
    [1, 5, 10, 25, 50],
    [
      'Pequeño gran paso',
      'Aporte notable',
      'De una vez',
      'Salto gigante',
      'Medio objetivo',
    ],
    [
      'Haz un aporte individual equivalente al {0}% de tu objetivo',
      'Una sola entrada puede revelar la pista.',
      'Mira el tamaño de uno de tus aportes.',
    ],
    '💎'
  );

  addThresholdAchievements(
    AchievementCondition.WeekendEntryCount,
    [1, 5, 10, 25, 50],
    [
      'Fin de semana',
      'Sábado productivo',
      'Ritmo de descanso',
      'Fines constantes',
      'Sin días libres',
    ],
    [
      'Registra {0} entradas durante fines de semana',
      'Tus días libres también cuentan.',
      'El calendario conoce la respuesta.',
    ],
    '🌙'
  );

  addThresholdAchievements(
    AchievementCondition.EarlyEntryCount,
    [1, 3, 7, 15, 30],
    [
      'Amanecer activo',
      'Madrugador',
      'Primera luz',
      'Antes que el sol',
      'Alba legendaria',
    ],
    [
      'Registra {0} entradas antes de las 8:00',
      'La pista aparece al empezar temprano.',
      'Una hora concreta guarda el secreto.',
    ],
    '🌅'
  );

  addThresholdAchievements(
    AchievementCondition.LateEntryCount,
    [1, 3, 7, 15, 30],
    [
      'Última hora',
      'Búho',
      'Luna constante',
      'Tras el anochecer',
      'Noctámbulo legendario',
    ],
    [
      'Registra {0} entradas desde las 21:00',
      'La noche también suma progreso.',
      'Busca la respuesta en la hora de tus registros.',
    ],
    '🌙'
  );

  return achievements;
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = createAllAchievements();

export interface BannerPreset {
  id: string;
  name: string;
  startColor: string;
  endColor: string;
  emoji: string;
  imageUrl: string | null;
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'gradient',
    name: 'Noche Violeta',
    startColor: '#33294E',
    endColor: '#19162B',
    emoji: '✦',
    imageUrl: null,
  },
  {
    id: 'gold',
    name: 'Cumbre Dorada',
    startColor: '#4F340B',
    endColor: '#B8821E',
    emoji: '👑',
    imageUrl: null,
  },
  {
    id: 'japan',
    name: 'Japón',
    startColor: '#392657',
    endColor: '#B9576A',
    emoji: '⛩',
    imageUrl: '/banners/banner_japan.svg',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    startColor: '#45245F',
    endColor: '#F2A56D',
    emoji: '☀',
    imageUrl: '/banners/banner_sunset.svg',
  },
  {
    id: 'forest',
    name: 'Bosque',
    startColor: '#152B3A',
    endColor: '#55776B',
    emoji: '♧',
    imageUrl: '/banners/banner_forest.svg',
  },
  {
    id: 'aurora',
    name: 'Aurora Boreal',
    startColor: '#0F2942',
    endColor: '#1E6F5C',
    emoji: '🌌',
    imageUrl: null,
  },
  {
    id: 'cosmos',
    name: 'Cosmos Astral',
    startColor: '#1F1147',
    endColor: '#6A1B9A',
    emoji: '🪐',
    imageUrl: null,
  },
  {
    id: 'ocean',
    name: 'Abismo Turquesa',
    startColor: '#0B2545',
    endColor: '#136F63',
    emoji: '🌊',
    imageUrl: null,
  },
  {
    id: 'ember',
    name: 'Fragua Carmesí',
    startColor: '#4A121B',
    endColor: '#A82838',
    emoji: '🔥',
    imageUrl: null,
  },
  {
    id: 'sakura_zen',
    name: 'Jardín Zen',
    startColor: '#3D1A35',
    endColor: '#9E426E',
    emoji: '🌸',
    imageUrl: null,
  },
  {
    id: 'cyber_grid',
    name: 'Neón Ciber',
    startColor: '#0B1D3A',
    endColor: '#18688C',
    emoji: '⚡',
    imageUrl: null,
  },
  {
    id: 'temple_amber',
    name: 'Templo Ámbar',
    startColor: '#3B220C',
    endColor: '#9E5B16',
    emoji: '🏛️',
    imageUrl: null,
  },
];

export interface AccentTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  softBg: string;
  glow: string;
  textSoft: string;
  textMuted: string;
  surfaceDark: string;
  vignetteGradient: string;
  buttonText: string;
}

export const OBJECTIVE_ACCENT_THEMES: AccentTheme[] = [
  {
    id: '#65DB85',
    name: 'Esmeralda Viva',
    primary: '#65DB85',
    secondary: '#2E9E52',
    softBg: 'rgba(101, 219, 133, 0.16)',
    glow: 'rgba(101, 219, 133, 0.38)',
    textSoft: '#C8F7D6',
    textMuted: '#9ED4B0',
    surfaceDark: 'rgba(14, 34, 24, 0.72)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(12, 26, 20, 0.65) 0%, rgba(14, 28, 22, 0.48) 50%, rgba(10, 22, 17, 0.86) 100%)',
    buttonText: '#092112',
  },
  {
    id: '#FFD54F',
    name: 'Oro Solar',
    primary: '#FFD54F',
    secondary: '#C88A14',
    softBg: 'rgba(255, 213, 79, 0.18)',
    glow: 'rgba(255, 213, 79, 0.42)',
    textSoft: '#FFF0B8',
    textMuted: '#E6D094',
    surfaceDark: 'rgba(40, 28, 8, 0.74)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(36, 24, 7, 0.64) 0%, rgba(30, 20, 6, 0.45) 50%, rgba(22, 15, 5, 0.86) 100%)',
    buttonText: '#1F1402',
  },
  {
    id: '#B58BFF',
    name: 'Amatista Real',
    primary: '#B58BFF',
    secondary: '#7C4DFF',
    softBg: 'rgba(181, 139, 255, 0.18)',
    glow: 'rgba(181, 139, 255, 0.4)',
    textSoft: '#E5D4FF',
    textMuted: '#C5B3E6',
    surfaceDark: 'rgba(26, 18, 44, 0.72)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(19, 17, 34, 0.68) 0%, rgba(24, 21, 40, 0.5) 50%, rgba(18, 16, 31, 0.88) 100%)',
    buttonText: '#FFFFFF',
  },
  {
    id: '#64D8FF',
    name: 'Cian Boreal',
    primary: '#64D8FF',
    secondary: '#0097A7',
    softBg: 'rgba(100, 216, 255, 0.16)',
    glow: 'rgba(100, 216, 255, 0.38)',
    textSoft: '#C7F2FF',
    textMuted: '#99CEDE',
    surfaceDark: 'rgba(10, 29, 42, 0.72)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(10, 25, 38, 0.65) 0%, rgba(12, 28, 42, 0.48) 50%, rgba(8, 20, 31, 0.86) 100%)',
    buttonText: '#051E29',
  },
  {
    id: '#FF8A65',
    name: 'Coral Fénix',
    primary: '#FF8A65',
    secondary: '#D84315',
    softBg: 'rgba(255, 138, 101, 0.18)',
    glow: 'rgba(255, 138, 101, 0.4)',
    textSoft: '#FFD8CC',
    textMuted: '#E6B5A6',
    surfaceDark: 'rgba(42, 18, 14, 0.72)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(36, 15, 12, 0.66) 0%, rgba(32, 14, 12, 0.48) 50%, rgba(24, 10, 9, 0.87) 100%)',
    buttonText: '#240903',
  },
  {
    id: '#FF80AB',
    name: 'Rosa Sakura',
    primary: '#FF80AB',
    secondary: '#C2185B',
    softBg: 'rgba(255, 128, 171, 0.17)',
    glow: 'rgba(255, 128, 171, 0.38)',
    textSoft: '#FFD4E4',
    textMuted: '#E3B1C4',
    surfaceDark: 'rgba(40, 14, 28, 0.72)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(34, 12, 24, 0.66) 0%, rgba(30, 12, 22, 0.48) 50%, rgba(22, 9, 17, 0.87) 100%)',
    buttonText: '#260512',
  },
  {
    id: '#FF5266',
    name: 'Rubí Imperial',
    primary: '#FF5266',
    secondary: '#B71C2B',
    softBg: 'rgba(255, 82, 102, 0.18)',
    glow: 'rgba(255, 82, 102, 0.42)',
    textSoft: '#FFD1D7',
    textMuted: '#E5A8B0',
    surfaceDark: 'rgba(42, 12, 18, 0.74)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(38, 10, 15, 0.66) 0%, rgba(30, 9, 14, 0.48) 50%, rgba(22, 7, 11, 0.88) 100%)',
    buttonText: '#FFFFFF',
  },
  {
    id: '#FFA726',
    name: 'Ámbar Miel',
    primary: '#FFA726',
    secondary: '#C76500',
    softBg: 'rgba(255, 167, 38, 0.18)',
    glow: 'rgba(255, 167, 38, 0.4)',
    textSoft: '#FFE2B8',
    textMuted: '#E5C293',
    surfaceDark: 'rgba(42, 24, 8, 0.74)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(36, 20, 7, 0.64) 0%, rgba(30, 17, 6, 0.46) 50%, rgba(23, 13, 4, 0.87) 100%)',
    buttonText: '#211002',
  },
  {
    id: '#26E6C6',
    name: 'Menta Glaciar',
    primary: '#26E6C6',
    secondary: '#00897B',
    softBg: 'rgba(38, 230, 198, 0.17)',
    glow: 'rgba(38, 230, 198, 0.38)',
    textSoft: '#C4FFF4',
    textMuted: '#96DBD0',
    surfaceDark: 'rgba(10, 34, 32, 0.72)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(9, 28, 27, 0.65) 0%, rgba(10, 26, 25, 0.48) 50%, rgba(7, 20, 19, 0.86) 100%)',
    buttonText: '#04211C',
  },
  {
    id: '#6C8CFF',
    name: 'Índigo Zafiro',
    primary: '#6C8CFF',
    secondary: '#304FFE',
    softBg: 'rgba(108, 140, 255, 0.18)',
    glow: 'rgba(108, 140, 255, 0.4)',
    textSoft: '#D4DFFF',
    textMuted: '#AAB9E8',
    surfaceDark: 'rgba(14, 22, 46, 0.74)',
    vignetteGradient:
      'linear-gradient(180deg, rgba(12, 18, 38, 0.66) 0%, rgba(14, 20, 42, 0.48) 50%, rgba(9, 14, 30, 0.88) 100%)',
    buttonText: '#FFFFFF',
  },
];

export const OBJECTIVE_ICONS = [
  '🎯',
  '✈️',
  '🏠',
  '💻',
  '🛡️',
  '🏋️',
  '📚',
  '🚗',
  '🎸',
  '💍',
  '🌴',
  '🎮',
  '🎓',
  '🚀',
  '🧘',
  '💎',
  '👑',
  '🔥',
];

export interface ObjectiveTemplate {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  goalAmount: number;
  unitId: string;
  customUnitLabel: string;
  bannerId: string;
  accentColor: string;
  pledge: string;
}

export const OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    id: 'travel',
    label: '✈️ Viaje Soñado',
    title: 'Viaje a Japón',
    description: 'Vuelos, estadía y experiencias inolvidables',
    icon: '✈️',
    category: 'Aventura',
    goalAmount: 3000,
    unitId: 'USD',
    customUnitLabel: '',
    bannerId: 'japan',
    accentColor: '#FF8A65',
    pledge: 'Brindar en Tokio al aterrizar 🥂',
  },
  {
    id: 'emergency',
    label: '🛡️ Fondo de Paz',
    title: 'Fondo de Tranquilidad',
    description: 'Respaldo financiero para vivir con calma',
    icon: '🛡️',
    category: 'Finanzas',
    goalAmount: 5000,
    unitId: 'USD',
    customUnitLabel: '',
    bannerId: 'forest',
    accentColor: '#65DB85',
    pledge: 'Dormir con total tranquilidad financiera 🌿',
  },
  {
    id: 'tech',
    label: '💻 Setup / Tech',
    title: 'Nuevo Setup Pro',
    description: 'Herramientas para crear y jugar al máximo nivel',
    icon: '💻',
    category: 'Tecnología',
    goalAmount: 1500,
    unitId: 'USD',
    customUnitLabel: '',
    bannerId: 'cyber_grid',
    accentColor: '#64D8FF',
    pledge: 'Estrenar mi espacio creativo ideal ⚡',
  },
  {
    id: 'fitness',
    label: '🏋️ Reto Fitness',
    title: '100 Entrenamientos',
    description: 'Forjando disciplina, energía y salud día a día',
    icon: '🏋️',
    category: 'Salud',
    goalAmount: 100,
    unitId: CUSTOM_UNIT_ID,
    customUnitLabel: 'sesiones',
    bannerId: 'gold',
    accentColor: '#FFD54F',
    pledge: 'Sentirme en mi mejor forma física 🔥',
  },
  {
    id: 'reading',
    label: '📚 Hábito Lector',
    title: 'Leer 2.500 Páginas',
    description: 'Un capítulo cada noche para expandir la mente',
    icon: '📚',
    category: 'Crecimiento',
    goalAmount: 2500,
    unitId: CUSTOM_UNIT_ID,
    customUnitLabel: 'páginas',
    bannerId: 'gradient',
    accentColor: '#B58BFF',
    pledge: 'Regalarme mi próxima edición coleccionista 📖',
  },
  {
    id: 'vehicle',
    label: '🚗 Auto / Moto',
    title: 'Mi Próximo Vehículo',
    description: 'Libertad para recorrer nuevos caminos a mi ritmo',
    icon: '🚗',
    category: 'Patrimonio',
    goalAmount: 8000,
    unitId: 'USD',
    customUnitLabel: '',
    bannerId: 'temple_amber',
    accentColor: '#FFA726',
    pledge: 'Hacer un viaje inaugural por carretera 🛣️',
  },
  {
    id: 'home',
    label: '🏠 Hogar Propio',
    title: 'Proyecto Mi Hogar',
    description: 'Ahorro para mudanza, remodelación o entrada',
    icon: '🏠',
    category: 'Hogar',
    goalAmount: 12000,
    unitId: 'USD',
    customUnitLabel: '',
    bannerId: 'aurora',
    accentColor: '#26E6C6',
    pledge: 'Cena especial la primera noche en casa 🏡',
  },
  {
    id: 'mastery',
    label: '🎓 Idioma / Curso',
    title: 'Dominar Nuevo Idioma',
    description: 'Horas de práctica enfocada y conversación real',
    icon: '🎓',
    category: 'Educación',
    goalAmount: 120,
    unitId: CUSTOM_UNIT_ID,
    customUnitLabel: 'horas',
    bannerId: 'cosmos',
    accentColor: '#6C8CFF',
    pledge: 'Ver mi película favorita sin subtítulos 🎬',
  },
  {
    id: 'music_art',
    label: '🎸 Arte / Música',
    title: 'Maestría Musical',
    description: 'Práctica deliberada con mi instrumento favorito',
    icon: '🎸',
    category: 'Pasión',
    goalAmount: 80,
    unitId: CUSTOM_UNIT_ID,
    customUnitLabel: 'ensayos',
    bannerId: 'ember',
    accentColor: '#FF5266',
    pledge: 'Grabar mi primera sesión completa 🎶',
  },
  {
    id: 'mindfulness',
    label: '🧘 Paz & Zen',
    title: 'Retiro Interior (60 Días)',
    description: 'Meditación, respiración y presencia diaria',
    icon: '🧘',
    category: 'Bienestar',
    goalAmount: 60,
    unitId: CUSTOM_UNIT_ID,
    customUnitLabel: 'días',
    bannerId: 'sakura_zen',
    accentColor: '#FF80AB',
    pledge: 'Un día entero de spa y desconexión 🌸',
  },
  {
    id: 'custom',
    label: '✨ A tu medida',
    title: '',
    description: '',
    icon: '🎯',
    category: 'Personal',
    goalAmount: 1000,
    unitId: CUSTOM_UNIT_ID,
    customUnitLabel: '$',
    bannerId: 'gradient',
    accentColor: '#65DB85',
    pledge: '',
  },
];
