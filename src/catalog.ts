import {
  AchievementCondition,
  AchievementDefinition,
  Objective,
  ObjectiveUnit,
} from './types';

export const CUSTOM_UNIT_ID = 'custom';

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

export function formatObjectiveAmount(amount: number, objective: Objective): string {
  const unit = findObjectiveUnit(objective.unitId);
  const absoluteAmount = Math.abs(amount);
  const isCustom = !unit || unit.id === CUSTOM_UNIT_ID;

  const number = isCustom
    ? absoluteAmount.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : Math.round(absoluteAmount).toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

  const sign = amount < 0 ? '−' : '';

  if (isCustom) {
    const customLabel = (objective.customUnitLabel || '').trim();
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
    id: 'gold',
    name: 'Cumbre Dorada',
    startColor: '#3B2314',
    endColor: '#9C6B21',
    emoji: '👑',
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
}

export const OBJECTIVE_ACCENT_THEMES: AccentTheme[] = [
  {
    id: '#65DB85',
    name: 'Esmeralda',
    primary: '#65DB85',
    secondary: '#45B965',
    softBg: 'rgba(101, 219, 133, 0.16)',
    glow: 'rgba(101, 219, 133, 0.38)',
  },
  {
    id: '#FFD54F',
    name: 'Oro Solar',
    primary: '#FFD54F',
    secondary: '#E5B945',
    softBg: 'rgba(255, 213, 79, 0.16)',
    glow: 'rgba(255, 213, 79, 0.38)',
  },
  {
    id: '#B58BFF',
    name: 'Amatista',
    primary: '#B58BFF',
    secondary: '#8C5CE0',
    softBg: 'rgba(181, 139, 255, 0.18)',
    glow: 'rgba(181, 139, 255, 0.4)',
  },
  {
    id: '#64D8FF',
    name: 'Cian Boreal',
    primary: '#64D8FF',
    secondary: '#26A69A',
    softBg: 'rgba(100, 216, 255, 0.16)',
    glow: 'rgba(100, 216, 255, 0.38)',
  },
  {
    id: '#FF8A65',
    name: 'Coral Fénix',
    primary: '#FF8A65',
    secondary: '#E64A19',
    softBg: 'rgba(255, 138, 101, 0.16)',
    glow: 'rgba(255, 138, 101, 0.38)',
  },
  {
    id: '#FF80AB',
    name: 'Rosa Astral',
    primary: '#FF80AB',
    secondary: '#D81B60',
    softBg: 'rgba(255, 128, 171, 0.16)',
    glow: 'rgba(255, 128, 171, 0.38)',
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
    bannerId: 'cosmos',
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
    bannerId: 'sunset',
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
    bannerId: 'aurora',
    accentColor: '#B58BFF',
    pledge: 'Regalarme mi próxima edición coleccionista 📖',
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
