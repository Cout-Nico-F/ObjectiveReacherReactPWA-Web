// Ethical Indie Monetization Engine & 216-Item Sanctuary Content Vault
// Distribution: ~30% Free (65 items) / ~70% Premium (151 items) = 216 Total Functional Items
// Categories:
// 1. Mascot Skins & Auras (36 items: 11 Free / 25 Premium)
// 2. Hero Card Frames, Shimmers & FX (48 items: 14 Free / 34 Premium)
// 3. Real-Time Web Audio Sound Packs (30 items: 9 Free / 21 Premium)
// 4. Chromatic Card Themes & Atmospheres (42 items: 13 Free / 29 Premium)
// 5. Guardian Profile Titles & Emblems (36 items: 11 Free / 25 Premium)
// 6. Sanctuary Buffs, Blessings & Relics (24 items: 7 Free / 17 Premium)

export interface MascotSkinDefinition {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  emoji: string;
  gemCost: number;
  usdPrice: string;
  googlePlaySku: string;
  founderIncluded: boolean;
  paletteOverride: [string, string, string, string] | null;
  auraRingColor: string;
  auraSecondaryColor: string;
  particleEmoji: string;
}

export interface CardCosmeticDefinition {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  emoji: string;
  gemCost: number;
  borderColor: string;
  glowColor: string;
  overlayGradient: string;
  shimmerColor: string;
  cornerCrest: string;
  dashedBorder?: boolean;
}

export interface SoundPackCatalogItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  emoji: string;
  gemCost: number;
  accentColor: string;
  scaleName: string;
  synthEngineLabel?: string;
}

export interface CardStyleVaultItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  emoji: string;
  gemCost: number;
  accentColor: string;
  bannerId: string;
  previewColorSecondary: string;
}

export interface GuardianTitleItem {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  badge: string;
  gemCost: number;
  color: string;
}

export interface SanctuaryBuffDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  gemCost: number;
  accentColor: string;
  badgeText: string;
  kind: 'xp_boost' | 'shield' | 'instant_xp' | 'gem_magnet' | 'relic' | 'free_blessing';
  xpAmount?: number;
  shieldsAmount?: number;
  requiredLevel?: number;
}

export interface IndieSupportPack {
  id: 'pack_coffee' | 'pack_founder' | 'pack_gem_chest' | 'pack_bundle_ultimate';
  title: string;
  subtitle: string;
  badge: string;
  emoji: string;
  usdPrice: string;
  usdNumeric: number;
  regularUsdPrice?: string;
  regularUsdNumeric?: number;
  discountPct?: number;
  isLaunchOffer?: boolean;
  savingsUsd?: string;
  launchTag?: string;
  arsReference: string;
  googlePlaySku: string;
  gemsIncluded: number;
  shieldsIncluded: number;
  unlocksAllSkins: boolean;
  permanentXpBonusPct: number;
  highlightColor: string;
  perks: string[];
}

export type PaymentGatewayChoice = 'mercadopago' | 'paypal_googlepay';

export interface DualCheckoutResult {
  success: boolean;
  redirecting?: boolean;
  mode:
    | 'google_play_billing'
    | 'mercadopago_live'
    | 'paypal_googlepay_live'
    | 'dual_placeholder_sandbox';
  gateway: PaymentGatewayChoice | 'google_play';
  receiptId: string;
  licenseCode?: string;
  arsPrice?: number;
  notice?: string;
}

export interface VerifiedLicensePayload {
  packId: string;
  gems: number;
  shields: number;
  unlocksFounder: boolean;
  usdAmount: number;
  gateway: 'mercadopago' | 'paypal_googlepay' | 'google_play';
  txId: string;
  issuedAt: number;
}

// ============================================================================
// PLACEHOLDERS DE CONFIGURACIÓN FRONTEND (LEÍDOS DESDE .ENV LOCAL)
// ============================================================================
const envMeta = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const DUAL_PAYMENT_PLACEHOLDERS = {
  // 1. Mercado Pago (Argentina & LatAm)
  mpPublicKey:
    envMeta.VITE_MP_PUBLIC_KEY ||
    'APP_USR-PLACEHOLDER-TU-PUBLIC-KEY-DE-MERCADOPAGO',
  mpDirectLinks: {
    pack_coffee: envMeta.VITE_MP_LINK_COFFEE || '',
    pack_founder: envMeta.VITE_MP_LINK_FOUNDER || '',
    pack_gem_chest: envMeta.VITE_MP_LINK_GEM_CHEST || '',
    pack_bundle_ultimate: envMeta.VITE_MP_LINK_BUNDLE_ULTIMATE || '',
    custom_tip: envMeta.VITE_MP_LINK_CUSTOM_TIP || '',
  },

  // 2. Pasarela Global (PayPal + Google Pay / Lemon Squeezy MoR)
  paypalClientId:
    envMeta.VITE_PAYPAL_CLIENT_ID || 'PLACEHOLDER_TU_PAYPAL_CLIENT_ID_GLOBAL',
  globalDirectLinks: {
    pack_coffee: envMeta.VITE_GLOBAL_CHECKOUT_COFFEE_URL || '',
    pack_founder: envMeta.VITE_GLOBAL_CHECKOUT_FOUNDER_URL || '',
    pack_gem_chest: envMeta.VITE_GLOBAL_CHECKOUT_GEM_CHEST_URL || '',
    pack_bundle_ultimate: envMeta.VITE_GLOBAL_CHECKOUT_BUNDLE_ULTIMATE_URL || '',
    custom_tip: envMeta.VITE_GLOBAL_CHECKOUT_CUSTOM_TIP_URL || '',
  },
};

// ============================================================================
// 1. MASCOT SKINS & AURAS (36 ITEMS: 11 FREE / 25 PREMIUM)
// ============================================================================
export const MASCOT_SKINS: MascotSkinDefinition[] = [
  // --- 11 FREE SKINS (30%) ---
  {
    id: 'default',
    name: 'Esencia Natural',
    subtitle: 'Colores elementales originales de cada una de las 20 especies.',
    badge: 'GRATIS · BASE',
    emoji: '🌱',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_default',
    founderIncluded: true,
    paletteOverride: null,
    auraRingColor: '#82E59B',
    auraSecondaryColor: '#B58BFF',
    particleEmoji: '✨',
  },
  {
    id: 'skin_forest_breeze',
    name: 'Brisa del Bosque',
    subtitle: 'Tonos salvia fresca, musgo ancestral y rocío de montaña.',
    badge: 'GRATIS',
    emoji: '🍃',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_forest_breeze',
    founderIncluded: true,
    paletteOverride: ['#2E7D32', '#81C784', '#E8F5E9', '#0B2410'],
    auraRingColor: '#81C784',
    auraSecondaryColor: '#A5D6A7',
    particleEmoji: '🍃',
  },
  {
    id: 'skin_lunar_dew',
    name: 'Rocío Lunar',
    subtitle: 'Plata serena de medianoche y destellos azul alborada.',
    badge: 'GRATIS',
    emoji: '🌙',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_lunar_dew',
    founderIncluded: true,
    paletteOverride: ['#3949AB', '#9FA8DA', '#E8EAF6', '#0D1333'],
    auraRingColor: '#9FA8DA',
    auraSecondaryColor: '#C5CAE9',
    particleEmoji: '🌙',
  },
  {
    id: 'skin_quartz_gem',
    name: 'Gema de Cuarzo',
    subtitle: 'Cristal rosado suave con reflejos perlados de paz.',
    badge: 'GRATIS',
    emoji: '🔮',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_quartz_gem',
    founderIncluded: true,
    paletteOverride: ['#8E24AA', '#CE93D8', '#F3E5F5', '#21092B'],
    auraRingColor: '#CE93D8',
    auraSecondaryColor: '#F48FB1',
    particleEmoji: '🔮',
  },
  {
    id: 'skin_campfire',
    name: 'Brasa de Fogata',
    subtitle: 'Calor acogedor de leña encendida bajo las estrellas.',
    badge: 'GRATIS',
    emoji: '🔥',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_campfire',
    founderIncluded: true,
    paletteOverride: ['#D84315', '#FFAB91', '#FBE9E7', '#2B0E05'],
    auraRingColor: '#FF8A65',
    auraSecondaryColor: '#FFCCBC',
    particleEmoji: '🔥',
  },
  {
    id: 'skin_boreal_mist',
    name: 'Bruma Boreal',
    subtitle: 'Aire polar cristalino con destellos aguamarina.',
    badge: 'GRATIS',
    emoji: '❄️',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_boreal_mist',
    founderIncluded: true,
    paletteOverride: ['#00838F', '#80DEEA', '#E0F7FA', '#062329'],
    auraRingColor: '#80DEEA',
    auraSecondaryColor: '#B2EBF2',
    particleEmoji: '❄️',
  },
  {
    id: 'skin_morning_sun',
    name: 'Sol de Mañana',
    subtitle: 'Luz cálida de amanecer para empezar cada hábito con energía.',
    badge: 'GRATIS',
    emoji: '🌤️',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_morning_sun',
    founderIncluded: true,
    paletteOverride: ['#F57F17', '#FFF176', '#FFFDE7', '#2E1904'],
    auraRingColor: '#FFD54F',
    auraSecondaryColor: '#FFE082',
    particleEmoji: '🌤️',
  },
  {
    id: 'skin_zen_ink',
    name: 'Tinta Caligráfica Zen',
    subtitle: 'Estética minimalista sumi-e en grafito, plata y papel arroz.',
    badge: 'GRATIS',
    emoji: '🖋️',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_zen_ink',
    founderIncluded: true,
    paletteOverride: ['#455A64', '#B0BEC5', '#ECEFF1', '#10171B'],
    auraRingColor: '#B0BEC5',
    auraSecondaryColor: '#CFD8DC',
    particleEmoji: '✒️',
  },
  {
    id: 'skin_coral_reef',
    name: 'Arrecife Coralino',
    subtitle: 'Matices tropicales de coral vivo y espuma marina.',
    badge: 'GRATIS',
    emoji: '🪸',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_coral_reef',
    founderIncluded: true,
    paletteOverride: ['#E64A19', '#FF8A65', '#FFF3E0', '#2D1008'],
    auraRingColor: '#FF8A65',
    auraSecondaryColor: '#80CBC4',
    particleEmoji: '🐚',
  },
  {
    id: 'skin_starlight_wind',
    name: 'Viento Estelar',
    subtitle: 'Corrientes de polvo azul celeste y constelaciones suaves.',
    badge: 'GRATIS',
    emoji: '🌠',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_starlight_wind',
    founderIncluded: true,
    paletteOverride: ['#1565C0', '#64B5F6', '#E3F2FD', '#071B36'],
    auraRingColor: '#64B5F6',
    auraSecondaryColor: '#90CAF9',
    particleEmoji: '🌠',
  },
  {
    id: 'skin_amethyst_shadow',
    name: 'Sombra Amatista',
    subtitle: 'Misticismo violeta clásico del Santuario nocturno.',
    badge: 'GRATIS',
    emoji: '💜',
    gemCost: 0,
    usdPrice: 'Gratis',
    googlePlaySku: 'skin_amethyst_shadow',
    founderIncluded: true,
    paletteOverride: ['#5E35B1', '#B39DDB', '#EDE7F6', '#160B2E'],
    auraRingColor: '#B39DDB',
    auraSecondaryColor: '#D1C4E9',
    particleEmoji: '💜',
  },

  // --- 25 PREMIUM SKINS (70%) ---
  {
    id: 'skin_sakura',
    name: 'Espíritu Sakura Zen',
    subtitle: 'Tonos flor de cerezo místico, luz rosada de santuario y calma japonesa.',
    badge: 'PREMIUM',
    emoji: '🌸',
    gemCost: 120,
    usdPrice: '$0.99 USD',
    googlePlaySku: 'or_skin_sakura',
    founderIncluded: true,
    paletteOverride: ['#AD2862', '#FF85B3', '#FFEBF2', '#2E0B1C'],
    auraRingColor: '#FF85B3',
    auraSecondaryColor: '#FFD1E3',
    particleEmoji: '🌸',
  },
  {
    id: 'skin_cyber_nebula',
    name: 'Nébula Cyberpunk',
    subtitle: 'Energía sintética neón cian y magenta con pulso de hiperespacio.',
    badge: 'PREMIUM',
    emoji: '⚡',
    gemCost: 150,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_cyber_nebula',
    founderIncluded: true,
    paletteOverride: ['#00B8D4', '#18FFFF', '#FF4081', '#081B2E'],
    auraRingColor: '#18FFFF',
    auraSecondaryColor: '#FF4081',
    particleEmoji: '⚡',
  },
  {
    id: 'skin_solar_gold',
    name: 'Armadura Solar Real',
    subtitle: 'Forjada en oro imperial y fuego celeste para guardianes de élite.',
    badge: 'ÉPICA',
    emoji: '👑',
    gemCost: 190,
    usdPrice: '$1.99 USD',
    googlePlaySku: 'or_skin_solar_gold',
    founderIncluded: true,
    paletteOverride: ['#C77800', '#FFD54F', '#FFFDE7', '#381E04'],
    auraRingColor: '#FFD54F',
    auraSecondaryColor: '#FF9100',
    particleEmoji: '☀️',
  },
  {
    id: 'skin_abyssal_crystal',
    name: 'Cristal Bioluminiscente',
    subtitle: 'Resplandor abisal de esmeralda cuántica y turquesa profundo.',
    badge: 'ÉPICA',
    emoji: '💎',
    gemCost: 170,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_abyssal_crystal',
    founderIncluded: true,
    paletteOverride: ['#00695C', '#00E676', '#B9F6CA', '#042220'],
    auraRingColor: '#00E676',
    auraSecondaryColor: '#64FFDA',
    particleEmoji: '💠',
  },
  {
    id: 'skin_prismatic_founder',
    name: 'Singularidad Prismática',
    subtitle: 'Aura celestial de Fundador Indie con doble halo estelar sobre las 200 formas.',
    badge: 'FUNDADOR INDIE',
    emoji: '🪐',
    gemCost: 320,
    usdPrice: 'En Pase Fundador',
    googlePlaySku: 'or_skin_prismatic_founder',
    founderIncluded: true,
    paletteOverride: ['#6A1B9A', '#E040FB', '#FFD740', '#1B0736'],
    auraRingColor: '#FFD740',
    auraSecondaryColor: '#E040FB',
    particleEmoji: '🪐',
  },
  {
    id: 'skin_crimson_kitsune',
    name: 'Kitsune Carmesí',
    subtitle: 'Fuego espiritual japonés en rojo torii, marfil y oro antiguo.',
    badge: 'ÉPICA',
    emoji: '🦊',
    gemCost: 160,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_crimson_kitsune',
    founderIncluded: true,
    paletteOverride: ['#B71C1C', '#FF5252', '#FFF8E1', '#2B0606'],
    auraRingColor: '#FF5252',
    auraSecondaryColor: '#FFD54F',
    particleEmoji: '🏮',
  },
  {
    id: 'skin_valkyrie_platinum',
    name: 'Valkiria de Platino',
    subtitle: 'Acero alado del Valhalla con destellos celestes y plumas blancas.',
    badge: 'ÉPICA',
    emoji: '🪽',
    gemCost: 180,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_valkyrie_platinum',
    founderIncluded: true,
    paletteOverride: ['#546E7A', '#E0F7FA', '#FFFFFF', '#121E26'],
    auraRingColor: '#80D8FF',
    auraSecondaryColor: '#FFFFFF',
    particleEmoji: '🪽',
  },
  {
    id: 'skin_obsidian_phoenix',
    name: 'Fénix de Obsidiana',
    subtitle: 'Ceniza volcánica negra atravesada por venas de magma incandescente.',
    badge: 'LEGENDARIA',
    emoji: '🌋',
    gemCost: 210,
    usdPrice: '$1.99 USD',
    googlePlaySku: 'or_skin_obsidian_phoenix',
    founderIncluded: true,
    paletteOverride: ['#212121', '#FF6D00', '#FFD600', '#140802'],
    auraRingColor: '#FF6D00',
    auraSecondaryColor: '#FF3D00',
    particleEmoji: '🌋',
  },
  {
    id: 'skin_jade_dragon',
    name: 'Dragón de Jade Imperial',
    subtitle: 'Piedra jade tallada por emperadores con perlas de sabiduría.',
    badge: 'ÉPICA',
    emoji: '🐉',
    gemCost: 175,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_jade_dragon',
    founderIncluded: true,
    paletteOverride: ['#004D40', '#26A69A', '#E0F2F1', '#031C17'],
    auraRingColor: '#26A69A',
    auraSecondaryColor: '#FFD54F',
    particleEmoji: '🐉',
  },
  {
    id: 'skin_radiant_seraph',
    name: 'Serafín de Fuego Sagrado',
    subtitle: 'Seis alas de luz blanca, rosa celestial y anillos de oro puro.',
    badge: 'LEGENDARIA',
    emoji: '👁️',
    gemCost: 230,
    usdPrice: '$1.99 USD',
    googlePlaySku: 'or_skin_radiant_seraph',
    founderIncluded: true,
    paletteOverride: ['#AD1457', '#FF80AB', '#FFF9C4', '#2C0719'],
    auraRingColor: '#FFF59D',
    auraSecondaryColor: '#FF80AB',
    particleEmoji: '✨',
  },
  {
    id: 'skin_biolum_kraken',
    name: 'Kraken Abisal Neón',
    subtitle: 'Fosa oceánica ultramarina con tentáculos fosforescentes.',
    badge: 'PREMIUM',
    emoji: '🐙',
    gemCost: 145,
    usdPrice: '$0.99 USD',
    googlePlaySku: 'or_skin_biolum_kraken',
    founderIncluded: true,
    paletteOverride: ['#0D47A1', '#00E5FF', '#A7FFEB', '#030E24'],
    auraRingColor: '#00E5FF',
    auraSecondaryColor: '#1DE9B6',
    particleEmoji: '🫧',
  },
  {
    id: 'skin_frost_wolf',
    name: 'Lobo de Escarcha Ártica',
    subtitle: 'Cristales de hielo eterno bajo la ventisca del norte.',
    badge: 'PREMIUM',
    emoji: '🐺',
    gemCost: 135,
    usdPrice: '$0.99 USD',
    googlePlaySku: 'or_skin_frost_wolf',
    founderIncluded: true,
    paletteOverride: ['#0277BD', '#B3E5FC', '#FFFFFF', '#041A2B'],
    auraRingColor: '#81D4FA',
    auraSecondaryColor: '#E1F5FE',
    particleEmoji: '🌨️',
  },
  {
    id: 'skin_ruby_golem',
    name: 'Gólem de Rubí Real',
    subtitle: 'Núcleo facetado en rubí carmesí de alta densidad mágica.',
    badge: 'PREMIUM',
    emoji: '♦️',
    gemCost: 155,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_ruby_golem',
    founderIncluded: true,
    paletteOverride: ['#880E4F', '#FF1744', '#FFCDD2', '#240413'],
    auraRingColor: '#FF1744',
    auraSecondaryColor: '#FF80AB',
    particleEmoji: '♦️',
  },
  {
    id: 'skin_steampunk_cronos',
    name: 'Cronos Relojero de Bronce',
    subtitle: 'Engranajes victorianos en cobre bruñido, vapor y oro viejo.',
    badge: 'ÉPICA',
    emoji: '⚙️',
    gemCost: 165,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_steampunk_cronos',
    founderIncluded: true,
    paletteOverride: ['#6D4C41', '#FFB74D', '#FFF3E0', '#21140F'],
    auraRingColor: '#FFB74D',
    auraSecondaryColor: '#D7CCC8',
    particleEmoji: '⚙️',
  },
  {
    id: 'skin_emerald_djinn',
    name: 'Djinn de Esmeralda Mística',
    subtitle: 'Genio de las arenas estelares envuelto en humo verde esmeralda.',
    badge: 'PREMIUM',
    emoji: '🧞',
    gemCost: 150,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_emerald_djinn',
    founderIncluded: true,
    paletteOverride: ['#00695C', '#1DE9B6', '#E0F2F1', '#031F1B'],
    auraRingColor: '#1DE9B6',
    auraSecondaryColor: '#FFD54F',
    particleEmoji: '🪔',
  },
  {
    id: 'skin_supernova_moth',
    name: 'Polilla Supernova Astral',
    subtitle: 'Alas espolvoreadas con nebulosas violetas y explosiones solares.',
    badge: 'ÉPICA',
    emoji: '🦋',
    gemCost: 170,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_supernova_moth',
    founderIncluded: true,
    paletteOverride: ['#4A148C', '#EA80FC', '#FFF59D', '#16042C'],
    auraRingColor: '#EA80FC',
    auraSecondaryColor: '#FFD54F',
    particleEmoji: '🦋',
  },
  {
    id: 'skin_neon_hydra',
    name: 'Hidra Sintética Arcade',
    subtitle: 'Estética láser verde ácido y púrpura retro-futurista.',
    badge: 'PREMIUM',
    emoji: '🐍',
    gemCost: 160,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_neon_hydra',
    founderIncluded: true,
    paletteOverride: ['#311B92', '#76FF03', '#CCFF90', '#0D0726'],
    auraRingColor: '#76FF03',
    auraSecondaryColor: '#B388FF',
    particleEmoji: '👾',
  },
  {
    id: 'skin_quantum_merkaba',
    name: 'Merkaba Cuántico Dorado',
    subtitle: 'Geometría sagrada hiperdimensional en cian y oro puro.',
    badge: 'LEGENDARIA',
    emoji: '✡️',
    gemCost: 220,
    usdPrice: '$1.99 USD',
    googlePlaySku: 'or_skin_quantum_merkaba',
    founderIncluded: true,
    paletteOverride: ['#006064', '#00E5FF', '#FFD740', '#03191D'],
    auraRingColor: '#FFD740',
    auraSecondaryColor: '#00E5FF',
    particleEmoji: '💠',
  },
  {
    id: 'skin_astronomer_owl',
    name: 'Búho del Observatorio',
    subtitle: 'Plumaje azul cosmos con constelaciones grabadas en oro.',
    badge: 'PREMIUM',
    emoji: '🦉',
    gemCost: 130,
    usdPrice: '$0.99 USD',
    googlePlaySku: 'or_skin_astronomer_owl',
    founderIncluded: true,
    paletteOverride: ['#1A237E', '#7986CB', '#FFE082', '#080B29'],
    auraRingColor: '#FFE082',
    auraSecondaryColor: '#7986CB',
    particleEmoji: '🔭',
  },
  {
    id: 'skin_thunder_tiger',
    name: 'Tigre Relámpago Azul',
    subtitle: 'Rayas cargadas de alto voltaje eléctrico y tormenta celeste.',
    badge: 'ÉPICA',
    emoji: '🐯',
    gemCost: 165,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_thunder_tiger',
    founderIncluded: true,
    paletteOverride: ['#01579B', '#40C4FF', '#E1F5FE', '#03182B'],
    auraRingColor: '#40C4FF',
    auraSecondaryColor: '#FFD740',
    particleEmoji: '🌩️',
  },
  {
    id: 'skin_celestial_stag',
    name: 'Ciervo de la Aurora',
    subtitle: 'Astas luminosas que proyectan la aurora boreal nórdica.',
    badge: 'ÉPICA',
    emoji: '🦌',
    gemCost: 175,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_celestial_stag',
    founderIncluded: true,
    paletteOverride: ['#004D40', '#69F0AE', '#B388FF', '#041E19'],
    auraRingColor: '#69F0AE',
    auraSecondaryColor: '#B388FF',
    particleEmoji: '🌌',
  },
  {
    id: 'skin_magma_lion',
    name: 'León de Magma Volcánico',
    subtitle: 'Melena de fuego líquido y corona de brasa inquebrantable.',
    badge: 'ÉPICA',
    emoji: '🦁',
    gemCost: 180,
    usdPrice: '$1.49 USD',
    googlePlaySku: 'or_skin_magma_lion',
    founderIncluded: true,
    paletteOverride: ['#BF360C', '#FF6E40', '#FFF59D', '#290B02'],
    auraRingColor: '#FF6E40',
    auraSecondaryColor: '#FFD740',
    particleEmoji: '🔥',
  },
  {
    id: 'skin_alchemist_gold',
    name: 'Piedra Filosofal Áurea',
    subtitle: 'Transmutación alquímica en platino, esmeralda y sol dorado.',
    badge: 'LEGENDARIA',
    emoji: '⚗️',
    gemCost: 200,
    usdPrice: '$1.99 USD',
    googlePlaySku: 'or_skin_alchemist_gold',
    founderIncluded: true,
    paletteOverride: ['#B28704', '#FFD740', '#69F0AE', '#261C02'],
    auraRingColor: '#FFD740',
    auraSecondaryColor: '#69F0AE',
    particleEmoji: '⚗️',
  },
  {
    id: 'skin_galactic_vortex',
    name: 'Vórtice de Andrómeda',
    subtitle: 'Espiral de materia oscura, magenta cósmico y luz ultravioleta.',
    badge: 'LEGENDARIA',
    emoji: '🌌',
    gemCost: 215,
    usdPrice: '$1.99 USD',
    googlePlaySku: 'or_skin_galactic_vortex',
    founderIncluded: true,
    paletteOverride: ['#311B92', '#D500F9', '#80D8FF', '#0C0524'],
    auraRingColor: '#D500F9',
    auraSecondaryColor: '#80D8FF',
    particleEmoji: '🌀',
  },
  {
    id: 'skin_cosmos_crown',
    name: 'Corona del Multiverso',
    subtitle: 'La máxima distinción astral con destellos arcoíris imperiales.',
    badge: 'MÍTICA',
    emoji: '👑',
    gemCost: 280,
    usdPrice: 'En Pase Fundador',
    googlePlaySku: 'or_skin_cosmos_crown',
    founderIncluded: true,
    paletteOverride: ['#4A148C', '#FFD740', '#00E5FF', '#18052E'],
    auraRingColor: '#00E5FF',
    auraSecondaryColor: '#FFD740',
    particleEmoji: '👑',
  },
];

// ============================================================================
// 2. HERO CARD FRAMES, SHIMMERS & FX (48 ITEMS: 14 FREE / 34 PREMIUM)
// ============================================================================
const FREE_CARD_FRAMES_DATA: Array<[string, string, string, string, string, string, string]> = [
  ['frame_default', 'Marco Clásico Santuario', 'Borde limpio y armónico sincronizado con tu tema activo.', '🖼️', '#7549B8', '#B58BFF', ''],
  ['frame_minimal_glass', 'Cristal Minimalista', 'Borde traslúcido de cuarzo esmerilado de alta pureza.', '🧊', '#90CAF9', '#E3F2FD', '✨'],
  ['frame_emerald_leaf', 'Enredadera Esmeralda', 'Filo natural verde bosque con sello de crecimiento.', '🌿', '#66BB6A', '#B9F6CA', '🌿'],
  ['frame_warm_bronze', 'Forja de Bronce', 'Marco clásico de metal cálido para metas de constancia.', '🛡️', '#CD7F32', '#FFE0B2', '🛡️'],
  ['frame_moon_silver', 'Plata de Medianoche', 'Contorno lunar sereno que resalta tus métricas.', '🌙', '#B0BEC5', '#ECEFF1', '🌙'],
  ['frame_sunset_amber', 'Brisa del Atardecer', 'Destello cálido de horizonte dorado y coral.', '🌅', '#FFA726', '#FFE082', '🌅'],
  ['frame_ocean_wave', 'Marea del Pacífico', 'Borde fluido en azul oceánico y espuma marina.', '🌊', '#29B6F6', '#B3E5FC', '🌊'],
  ['frame_zen_bamboo', 'Bambú del Templo', 'Sencillez japonesa para hábitos de lectura y estudio.', '🎍', '#81C784', '#C8E6C9', '🎍'],
  ['frame_starlight_dots', 'Constelación Sutil', 'Pespunte estelar para objetivos nocturnos.', '✨', '#9FA8DA', '#E8EAF6', '⭐'],
  ['frame_coral_bloom', 'Brillo de Arrecife', 'Energía vibrante en coral suave y durazno.', '🪸', '#FF8A65', '#FFCCBC', '🪸'],
  ['frame_arctic_wind', 'Escarcha del Norte', 'Borde frío y nítido para máxima concentración.', '❄️', '#4DD0E1', '#E0F7FA', '❄️'],
  ['frame_amethyst_calm', 'Calma de Amatista', 'Resplandor violeta suave sin distracciones.', '🔮', '#BA68C8', '#F3E5F5', '🔮'],
  ['frame_sand_dune', 'Duna del Desierto', 'Tonos arena dorada y oasis tranquilo.', '🏜️', '#FFD54F', '#FFF9C4', '☀️'],
  ['frame_slate_pro', 'Grafito Ejecutivo', 'Marco sobrio de titanio oscuro para finanzas.', '💼', '#78909C', '#CFD8DC', '💼'],
];

const PREMIUM_CARD_FRAMES_DATA: Array<[string, string, string, string, string, string, string, number]> = [
  ['frame_imperial_gold', 'Marco Imperial de Oro 24K', 'Doble bisel áureo con destello de lingote en la barra de progreso.', '👑', '#FFD54F', '#FFF8E1', '👑', 140],
  ['frame_cyber_holo', 'Holograma Cyberpunk 2099', 'Borde neón cian y fucsia con barrido láser en la tarjeta.', '⚡', '#00E5FF', '#FF4081', '⚡', 130],
  ['frame_sakura_petals', 'Santuario de Pétalos Sakura', 'Marco rosa místico con emblema de flor de cerezo imperial.', '🌸', '#FF80AB', '#FFEBF2', '🌸', 120],
  ['frame_phoenix_fire', 'Coraza de Fuego Fénix', 'Resplandor incandescente carmesí y oro para metas intensas.', '🔥', '#FF5252', '#FFD54F', '🔥', 150],
  ['frame_abyssal_prism', 'Prisma Bioluminiscente', 'Cristal abisal turquesa que ilumina toda la tarjeta.', '💎', '#00E676', '#64FFDA', '💎', 135],
  ['frame_founder_quasar', 'Relicario Fundador del Quásar', 'El marco supremo del Santuario con aura prismática multicolor.', '🪐', '#E040FB', '#FFD740', '🪐', 220],
  ['frame_dragon_jade', 'Altar del Dragón de Jade', 'Borde tallado en jade imperial y oro oriental.', '🐉', '#26A69A', '#FFD54F', '🐉', 145],
  ['frame_valkyrie_wings', 'Marco Alado del Valhalla', 'Platino celeste con sello de pluma celestial.', '🪽', '#80D8FF', '#FFFFFF', '🪽', 140],
  ['frame_matrix_code', 'Circuito Cuántico Verde', 'Pulso digital de alta frecuencia para metas tecnológicas.', '💻', '#76FF03', '#B9F6CA', '💻', 115],
  ['frame_royal_crimson', 'Terciopelo Carmesí Real', 'Marco de realeza en rubí profundo y filigrana dorada.', '🍷', '#FF1744', '#FFD54F', '⚜️', 130],
  ['frame_steampunk_gears', 'Maquinaria de Cronos', 'Cobre bruñido y bronce con emblema de engranaje.', '⚙️', '#FFB74D', '#FFE0B2', '⚙️', 125],
  ['frame_aurora_borealis', 'Cortina de Aurora Boreal', 'Gradiente polar entre verde menta y violeta cósmico.', '🌌', '#69F0AE', '#B388FF', '🌌', 150],
  ['frame_blood_moon', 'Eclipse de Luna Roja', 'Halo misterioso carmesí sobre obsidiana nocturna.', '🩸', '#FF5252', '#FF8A80', '🌑', 135],
  ['frame_diamond_tiara', 'Corona de Diamante Puro', 'Destellos blancos de alta refracción en cada esquina.', '💍', '#E0F7FA', '#FFFFFF', '💍', 165],
  ['frame_synthwave_grid', 'Horizonte Outrun 1984', 'Sol de neón magenta y rejilla retro-futurista.', '🌆', '#EA80FC', '#40C4FF', '🌆', 130],
  ['frame_alchemist_circle', 'Círculo de Transmutación', 'Geometría alquímica dorada para multiplicar tu enfoque.', '⚗️', '#FFD740', '#69F0AE', '⚗️', 155],
  ['frame_kraken_depths', 'Trono del Océano Profundo', 'Presión abisal azul eléctrico con burbujas bioluminiscentes.', '🐙', '#00B0FF', '#64FFDA', '🐙', 120],
  ['frame_seraph_halo', 'Halo de Seis Alas', 'Luz angelical rosada y dorada que bendice tu objetivo.', '👁️', '#FF80AB', '#FFF59D', '✨', 175],
  ['frame_volcanic_magma', 'Forja de Roca Fundida', 'Borde de lava ardiente para rachas imparables.', '🌋', '#FF6D00', '#FFD600', '🌋', 140],
  ['frame_lotus_pond', 'Estanque de Loto Sagrado', 'Paz absoluta en turquesa espiritual y rosa loto.', '🪷', '#4DB6AC', '#F48FB1', '🪷', 115],
  ['frame_arcade_8bit', 'Marco Pixel Arcade Retro', 'Estilo consola clásica con energía de videojuego.', '🕹️', '#FFEA00', '#00E5FF', '🕹️', 110],
  ['frame_celestial_compass', 'Brújula de los Navegantes', 'Oro náutico y azul estelar para metas de viaje.', '🧭', '#FFD54F', '#80D8FF', '🧭', 125],
  ['frame_amethyst_geode', 'Geoda de Amatista Imperial', 'Cristales púrpura real de máxima vibración.', '🟣', '#D500F9', '#EA80FC', '🟣', 135],
  ['frame_thunder_storm', 'Tormenta de Relámpagos', 'Arcos voltaicos azul cielo en toda la tarjeta.', '🌩️', '#40C4FF', '#FFF59D', '🌩️', 145],
  ['frame_samurai_katana', 'Filo de Acero Tamahagane', 'Disciplina marcial en acero templado y lacado rojo.', '⚔️', '#EF5350', '#ECEFF1', '⚔️', 150],
  ['frame_nebula_butterfly', 'Alas de Mariposa Astral', 'Polvo de estrellas lila y oro suave.', '🦋', '#CE93D8', '#FFE082', '🦋', 125],
  ['frame_emerald_citadel', 'Ciudadela de Esmeralda', 'Muralla impenetrable de cristal verde brillante.', '🏰', '#00E676', '#B9F6CA', '🏰', 140],
  ['frame_solar_eclipse', 'Corona de Eclipse Solar', 'Anillo de fuego dorado sobre cielo de medianoche.', '🌞', '#FFAB00', '#FFF8E1', '🌞', 160],
  ['frame_arctic_aurora', 'Glaciar de Diamante Azul', 'Hielo eterno con reflejos de zafiro polar.', '🏔️', '#00E5FF', '#E1F5FE', '🏔️', 130],
  ['frame_mystic_tarot', 'Arcano Mayor Dorado', 'Marco de carta astral con simbolismo de fortuna.', '🃏', '#FFD54F', '#CE93D8', '🔯', 155],
  ['frame_lofi_cassette', 'Estudio Lo-Fi Chill', 'Calidez analógica en violeta pastel y ámbar suave.', '🎧', '#B39DDB', '#FFCC80', '🎧', 110],
  ['frame_supernova_burst', 'Explosión Supernova', 'Energía estelar desbordante para el sprint final.', '💥', '#FF9100', '#FF4081', '💥', 165],
  ['frame_zen_garden', 'Jardín Seco de Kioto', 'Armonía contemplativa en piedra musgo y flor blanca.', '⛩️', '#A5D6A7', '#FFF9C4', '⛩️', 120],
  ['frame_omega_singularity', 'Horizonte de Sucesos Omega', 'Marco legendario de distorsión espacial y luz pura.', '🌀', '#00E5FF', '#E040FB', '🌀', 195],
];

export const CARD_COSMETICS: CardCosmeticDefinition[] = [
  ...FREE_CARD_FRAMES_DATA.map(([id, name, subtitle, emoji, borderColor, shimmerColor, cornerCrest]) => ({
    id,
    name,
    subtitle,
    badge: 'GRATIS',
    emoji,
    gemCost: 0,
    borderColor,
    glowColor: `${borderColor}44`,
    overlayGradient: `linear-gradient(135deg, ${borderColor}18 0%, transparent 60%)`,
    shimmerColor,
    cornerCrest,
  })),
  ...PREMIUM_CARD_FRAMES_DATA.map(([id, name, subtitle, emoji, borderColor, shimmerColor, cornerCrest, gemCost]) => ({
    id,
    name,
    subtitle,
    badge: gemCost >= 160 ? 'LEGENDARIO' : 'PREMIUM',
    emoji,
    gemCost,
    borderColor,
    glowColor: `${borderColor}77`,
    overlayGradient: `linear-gradient(135deg, ${borderColor}2E 0%, transparent 50%, ${shimmerColor}1F 100%)`,
    shimmerColor,
    cornerCrest,
  })),
];

export function findCardCosmetic(id?: string): CardCosmeticDefinition {
  return CARD_COSMETICS.find((c) => c.id === id) || CARD_COSMETICS[0];
}

// ============================================================================
// 3. REAL-TIME WEB AUDIO SOUND PACKS (30 ITEMS: 9 FREE / 21 PREMIUM)
// ============================================================================
export const SOUND_PACKS: SoundPackCatalogItem[] = [
  // --- 9 FREE SOUND PACKS (30%) ---
  { id: 'snd_kalimba_zen', name: 'Kalimba del Santuario', subtitle: 'Pack de 5 sonidos: láminas cálidas de madera y metal con percusión táctil.', badge: 'GRATIS · BASE', emoji: '🎵', gemCost: 0, accentColor: '#82E59B', scaleName: 'Pentatónica Lidia', synthEngineLabel: 'Percusión de Láminas & Madera' },
  { id: 'snd_marimba_wood', name: 'Marimba de Bosque', subtitle: 'Pack de 5 sonidos: maderas nobles resonantes con golpe de baqueta suave.', badge: 'GRATIS', emoji: '🪵', gemCost: 0, accentColor: '#FFB74D', scaleName: 'Madera Natural', synthEngineLabel: 'Resonador de Madera Profunda' },
  { id: 'snd_rain_drops', name: 'Gotas de Lluvia Zen', subtitle: 'Pack de 5 sonidos: burbujas hidro-acústicas y gotas en estanque de piedra.', badge: 'GRATIS', emoji: '🌧️', gemCost: 0, accentColor: '#64B5F6', scaleName: 'Acuática Suave', synthEngineLabel: 'Síntesis Líquida & Burbujas' },
  { id: 'snd_wind_chimes', name: 'Campanas de Viento', subtitle: 'Pack de 5 sonidos: tubos metálicos suspendidos con brisa estelar.', badge: 'GRATIS', emoji: '🎐', gemCost: 0, accentColor: '#80DEEA', scaleName: 'Brisa Suspendida', synthEngineLabel: 'Armónicos Metálicos Inarmónicos' },
  { id: 'snd_night_piano', name: 'Piano Nocturno de Fieltro', subtitle: 'Pack de 5 sonidos: acordes de piano acústico íntimo con martillo suave.', badge: 'GRATIS', emoji: '🎹', gemCost: 0, accentColor: '#9FA8DA', scaleName: 'Nocturno Menor', synthEngineLabel: 'Cuerdas Golpeadas & Fieltro' },
  { id: 'snd_bamboo_forest', name: 'Bambú de Arashiyama', subtitle: 'Pack de 5 sonidos: golpe hueco de caña japonesa Shishi-odoshi y brisa.', badge: 'GRATIS', emoji: '🎍', gemCost: 0, accentColor: '#A5D6A7', scaleName: 'Zen Orgánico', synthEngineLabel: 'Tubo Hueco & Percusión Zen' },
  { id: 'snd_lofi_velvet', name: 'Estudio Lo-Fi Chill', subtitle: 'Pack de 5 sonidos: acordes 7ma/9na con vibrato de cinta analógica.', badge: 'GRATIS', emoji: '🎧', gemCost: 0, accentColor: '#CE93D8', scaleName: 'Dórica Lo-Fi', synthEngineLabel: 'Teclado Vintage & Cinta' },
  { id: 'snd_morning_harp', name: 'Arpa del Amanecer', subtitle: 'Pack de 5 sonidos: glissandos de cuerdas pulsadas llenas de luz.', badge: 'GRATIS', emoji: '🪕', gemCost: 0, accentColor: '#FFE082', scaleName: 'Mayor Luminosa', synthEngineLabel: 'Cuerdas Pulsadas en Cascada' },
  { id: 'snd_celesta_dream', name: 'Celesta de Ensueño', subtitle: 'Pack de 5 sonidos: placas cristalinas de orquesta mágica.', badge: 'GRATIS', emoji: '✨', gemCost: 0, accentColor: '#F48FB1', scaleName: 'Cristal Dulce', synthEngineLabel: 'Campanillas de Placa Orquestal' },

  // --- 21 PREMIUM SOUND PACKS (70%) ---
  { id: 'snd_tibetan_432', name: 'Cuenco Tibetano 432Hz', subtitle: 'Pack de 5 sonidos: batimiento binaural y campanas de bronce del Himalaya.', badge: 'PREMIUM', emoji: '🥣', gemCost: 95, accentColor: '#FFD54F', scaleName: 'Afinación 432Hz', synthEngineLabel: 'Cuenco Cantante & Binaural' },
  { id: 'snd_crystal_quartz', name: 'Copas de Cuarzo Puro', subtitle: 'Pack de 5 sonidos: cristales frotados de alta pureza y destello prismático.', badge: 'PREMIUM', emoji: '💎', gemCost: 110, accentColor: '#00E5FF', scaleName: 'Cuarzo Armónico', synthEngineLabel: 'Cristal FM de Alta Frecuencia' },
  { id: 'snd_sakura_koto', name: 'Koto Imperial Sakura', subtitle: 'Pack de 5 sonidos: rasgueo de 13 cuerdas de seda en escala japonesa Hirajoshi.', badge: 'ÉPICO', emoji: '🌸', gemCost: 125, accentColor: '#FF80AB', scaleName: 'Escala Hirajoshi', synthEngineLabel: 'Cítara Oriental & Plectro' },
  { id: 'snd_8bit_arcade', name: 'Consola 8-Bit Chiptune', subtitle: 'Pack de 5 sonidos: monedas retro, saltos de 1-UP y fanfarria de arcade.', badge: 'PREMIUM', emoji: '🕹️', gemCost: 115, accentColor: '#76FF03', scaleName: 'Chiptune Arcade', synthEngineLabel: 'Chip Retro Onda Cuadrada' },
  { id: 'snd_synthwave_84', name: 'Synthwave Analógico 1984', subtitle: 'Pack de 5 sonidos: barrido de filtro resonante ochentero y bajo synth.', badge: 'ÉPICO', emoji: '🌆', gemCost: 130, accentColor: '#EA80FC', scaleName: 'Analógico Retro', synthEngineLabel: 'Doble Sawtooth & Filtro Analógico' },
  { id: 'snd_hang_drum', name: 'Hang Drum Suizo Etéreo', subtitle: 'Pack de 5 sonidos: tambor melódico de acero tocado con las manos.', badge: 'ÉPICO', emoji: '🛸', gemCost: 120, accentColor: '#4DB6AC', scaleName: 'Celta Etéreo', synthEngineLabel: 'Handpan de Acero & Sobretonos' },
  { id: 'snd_music_box', name: 'Caja de Música Victoriana', subtitle: 'Pack de 5 sonidos: mecanismo de cuerda antigua y peine de plata.', badge: 'PREMIUM', emoji: '🎠', gemCost: 95, accentColor: '#FFCC80', scaleName: 'Cuerda de Plata', synthEngineLabel: 'Peine Metálico & Cuerda' },
  { id: 'snd_cyber_glitch', name: 'Pulso Hiperespacial Neón', subtitle: 'Pack de 5 sonidos: telemetría sci-fi, láser holográfico y salto warp.', badge: 'PREMIUM', emoji: '⚡', gemCost: 110, accentColor: '#18FFFF', scaleName: 'Cyber FM', synthEngineLabel: 'Modulador Sci-Fi & Warp' },
  { id: 'snd_seraph_choir', name: 'Coro Celestial Ophanim', subtitle: 'Pack de 5 sonidos: voces angélicas sintetizadas con eco de catedral.', badge: 'LEGENDARIO', emoji: '🪽', gemCost: 155, accentColor: '#FFF59D', scaleName: 'Quintas Sagradas', synthEngineLabel: 'Formantes Vocales & Catedral' },
  { id: 'snd_imperial_bells', name: 'Campanas del Palacio Real', subtitle: 'Pack de 5 sonidos: carillón de bronce imperial y fanfarria de coronación.', badge: 'ÉPICO', emoji: '🔔', gemCost: 125, accentColor: '#FFD740', scaleName: 'Bronce Real', synthEngineLabel: 'Carillón de Bronce & Sub-Bajo' },
  { id: 'snd_solfeggio_528', name: 'Frecuencia Solfeggio 528Hz', subtitle: 'Pack de 5 sonidos: diapasones de bio-resonancia armónica y calma.', badge: 'ÉPICO', emoji: '🧬', gemCost: 135, accentColor: '#69F0AE', scaleName: 'Solfeggio 528Hz', synthEngineLabel: 'Diapasón Puro & Armónicos' },
  { id: 'snd_cosmic_organ', name: 'Órgano Interestelar', subtitle: 'Pack de 5 sonidos: tubos de catedral espacial con pedales sub-graves.', badge: 'LEGENDARIO', emoji: '🪐', gemCost: 160, accentColor: '#B388FF', scaleName: 'Cosmos Profundo', synthEngineLabel: 'Órgano Polifónico Espacial' },
  { id: 'snd_obsidian_gong', name: 'Gong de Obsidiana Zen', subtitle: 'Pack de 5 sonidos: golpe de mazo profundo con estallido metálico.', badge: 'PREMIUM', emoji: '🌑', gemCost: 105, accentColor: '#FF6E40', scaleName: 'Sub-Armónico', synthEngineLabel: 'Gong Ceremonial & Mazo' },
  { id: 'snd_arctic_glass', name: 'Marimba de Hielo Ártico', subtitle: 'Pack de 5 sonidos: cristales de escarcha y carámbanos afinados.', badge: 'PREMIUM', emoji: '❄️', gemCost: 100, accentColor: '#80D8FF', scaleName: 'Cristal Polar', synthEngineLabel: 'Percusión de Cristal Helado' },
  { id: 'snd_tropical_steel', name: 'Steel Drum del Caribe', subtitle: 'Pack de 5 sonidos: percusión caribeña brillante con ritmo festivo.', badge: 'PREMIUM', emoji: '🏝️', gemCost: 95, accentColor: '#FF8A65', scaleName: 'Tropical Mayor', synthEngineLabel: 'Tambor Metálico Tropical' },
  { id: 'snd_steampunk_clock', name: 'Relojería de Cronos', subtitle: 'Pack de 5 sonidos: engranajes de precisión, escape mecánico y campana.', badge: 'PREMIUM', emoji: '⚙️', gemCost: 115, accentColor: '#FFB74D', scaleName: 'Escape Mecánico', synthEngineLabel: 'Mecanismo de Engranajes & Bronce' },
  { id: 'snd_astral_flute', name: 'Flauta de Pan Estelar', subtitle: 'Pack de 5 sonidos: soplo de aire cálido con vibrato expresivo andino.', badge: 'PREMIUM', emoji: '🪈', gemCost: 105, accentColor: '#81D4FA', scaleName: 'Aire Andino', synthEngineLabel: 'Viento Orgánico & Soplo' },
  { id: 'snd_emerald_lute', name: 'Laúd de Bardos Élficos', subtitle: 'Pack de 5 sonidos: cuerdas medievales punteadas en taberna mágica.', badge: 'PREMIUM', emoji: '🎻', gemCost: 110, accentColor: '#00E676', scaleName: 'Balada Élfica', synthEngineLabel: 'Laúd Acústico Punteado' },
  { id: 'snd_phoenix_ember', name: 'Canto de Brasas Fénix', subtitle: 'Pack de 5 sonidos: crepitar de fuego solar y ascenso triunfal.', badge: 'ÉPICO', emoji: '🔥', gemCost: 130, accentColor: '#FF5252', scaleName: 'Llama Ascendente', synthEngineLabel: 'Fuego Crepitante & Acorde Solar' },
  { id: 'snd_abyssal_sonar', name: 'Sonar de la Fosa Abisal', subtitle: 'Pack de 5 sonidos: pulso submarino con eco hidrofónico profundo.', badge: 'PREMIUM', emoji: '🫧', gemCost: 110, accentColor: '#00B0FF', scaleName: 'Eco Profundo', synthEngineLabel: 'Sonar Submarino & Eco' },
  { id: 'snd_quasar_symphony', name: 'Sinfonía del Quásar (Fundador)', subtitle: 'Pack maestro de 5 sonidos: orquesta astral completa con doble armónico.', badge: 'FUNDADOR INDIE', emoji: '👑', gemCost: 190, accentColor: '#FFD740', scaleName: 'Sinfonía Astral', synthEngineLabel: 'Orquesta Sintética Maestra' },
];

// ============================================================================
// 4. CHROMATIC CARD THEMES & ATMOSPHERES (42 ITEMS: 13 FREE / 29 PREMIUM)
// ============================================================================
const CARD_STYLE_VAULT_DATA: Array<[string, string, string, string, number, string, string, string]> = [
  // 13 FREE (30%)
  ['style_violet_night', 'Santuario Violeta Real', 'El clásico nocturno con sintonía lavanda.', '🟣', 0, '#9B6BFF', 'gradient', '#D8C5FF'],
  ['style_emerald_zen', 'Bosque Esmeralda Zen', 'Crecimiento natural y frescura orgánica.', '🌿', 0, '#65DB85', 'aurora', '#A8F5BE'],
  ['style_amber_summit', 'Cumbre Ámbar Dorado', 'Calidez imperial en tonos oro y champán.', '👑', 0, '#FFB84D', 'gold', '#FFE082'],
  ['style_cyan_boreal', 'Glaciar Cian Boreal', 'Enfoque cristalino de alta tecnología.', '❄️', 0, '#4DD0E1', 'Arctic', '#99F2FF'],
  ['style_coral_sunset', 'Horizonte Coral Fénix', 'Energía vibrante de atardecer cálido.', '🔥', 0, '#FF7A66', 'sunset', '#FFB2A6'],
  ['style_rose_sakura', 'Jardín Rosa Sakura', 'Armonía japonesa en flor de cerezo.', '🌸', 0, '#F48FB1', 'japan', '#FFBFD4'],
  ['style_mint_glacier', 'Brisa Menta Ártica', 'Aire puro de montaña y turquesa.', '🏔️', 0, '#26E6A6', 'mint', '#8FF7D4'],
  ['style_copper_forge', 'Forja de Cobre Antiguo', 'Tonos tierra, bronce y constancia.', '🛡️', 0, '#FF9E5E', 'copper', '#FFC9A3'],
  ['style_abyssal_ocean', 'Profundidad Índigo Abisal', 'Calma submarina azul zafiro.', '🌊', 0, '#6E8BFF', 'abyss', '#AFC0FF'],
  ['style_crimson_fire', 'Llama Carmesí Imperial', 'Determinación intensa en rojo rubí.', '🍷', 0, '#FF5268', 'crimson', '#FFA3B0'],
  ['style_cyber_grid', 'Nébula Ciudad Neón', 'Contraste futurista cian sobre noche.', '⚡', 0, '#4DD0E1', 'cyber', '#99F2FF'],
  ['style_forest_aurora', 'Aurora de Pinos', 'Luz polar sobre bosque nocturno.', '🌲', 0, '#65DB85', 'japan', '#A8F5BE'],
  ['style_golden_sunset', 'Sol de Medianoche', 'Resplandor dorado sobre horizonte cálido.', '🌅', 0, '#FFB84D', 'sunset', '#FFE082'],

  // 29 PREMIUM (70%)
  ['style_emp_gold_palace', 'Bóveda del Emperador Dorado', 'Oro puro 24K combinado con cumbre imperial.', '🏛️', 85, '#FFB84D', 'gold', '#FFE082'],
  ['style_neo_tokyo_pink', 'Neo-Tokyo Sakura Cyber', 'Rosa astral sobre rascacielos futuristas.', '🗼', 90, '#F48FB1', 'cyber', '#FFBFD4'],
  ['style_valhalla_ice', 'Salón de Hielo del Valhalla', 'Menta glaciar y cian ártico nórdico.', '🪽', 85, '#26E6A6', 'Arctic', '#8FF7D4'],
  ['style_volcano_heart', 'Corazón del Volcán', 'Carmesí imperial sobre fuego de forja.', '🌋', 95, '#FF5268', 'copper', '#FFA3B0'],
  ['style_atlantis_pearl', 'Perla de la Atlántida', 'Cian bioluminiscente en el abismo oceánico.', '🐚', 90, '#4DD0E1', 'abyss', '#99F2FF'],
  ['style_alchemist_sanctum', 'Samurái de Jade Imperial', 'Disciplina marcial en jade esmeralda, bambú y katana dorada.', '⚔️', 95, '#1DE9B6', 'samurai', '#FFD54F'],
  ['style_samurai_blood', 'Honor del Samurái Carmesí', 'Carmesí intenso bajo los cerezos de Kioto.', '⛩️', 95, '#FF5266', 'japan', '#FFA3B0'],
  ['style_astral_observatory', 'Observatorio de Andrómeda', 'Índigo estelar y violeta profundo.', '🔭', 85, '#6E8BFF', 'gradient', '#AFC0FF'],
  ['style_solarpunk_eden', 'Edén Solarpunk', 'Verde esmeralda bañado en sol dorado.', '🌻', 90, '#65DB85', 'gold', '#A8F5BE'],
  ['style_outrun_drive', 'Autopista Outrun 1984', 'Coral neón y púrpura sintético.', '🏎️', 95, '#FF7A66', 'cyber', '#FFB2A6'],
  ['style_tibetan_monastery', 'Monasterio del Himalaya', 'Cobre sagrado y cumbre dorada.', '🧘', 85, '#FF9E5E', 'gold', '#FFC9A3'],
  ['style_emerald_lagoon', 'Laguna Bioluminiscente', 'Menta brillante en aguas profundas.', '🏝️', 90, '#26E6A6', 'abyss', '#8FF7D4'],
  ['style_royal_amethyst_gold', 'Corona de Amatista & Oro', 'Lujo violeta sobre resplandor áureo.', '👑', 110, '#9B6BFF', 'gold', '#D8C5FF'],
  ['style_arctic_sunrise', 'Amanecer en la Antártida', 'Rosa suave reflejado en hielo polar.', '🧊', 85, '#F48FB1', 'Arctic', '#FFBFD4'],
  ['style_dragon_emperor', 'Trono del Dragón Celeste', 'Esmeralda imperial y fuego carmesí.', '🐉', 105, '#65DB85', 'crimson', '#A8F5BE'],
  ['style_steampunk_foundry', 'Fundición Victoriana', 'Ámbar dorado sobre bronce industrial.', '⚙️', 90, '#FFB84D', 'copper', '#FFE082'],
  ['style_lotus_nirvana', 'Nirvana de Flor de Loto', 'Rosa espiritual sobre aurora verde.', '🪷', 95, '#F48FB1', 'aurora', '#FFBFD4'],
  ['style_deep_space_quasar', 'Núcleo del Quásar', 'Violeta cósmico sobre océano estelar.', '🪐', 115, '#9B6BFF', 'abyss', '#D8C5FF'],
  ['style_phoenix_rebirth', 'Renacer del Fénix Solar', 'Coral ardiente sobre cumbre de oro.', '🦅', 105, '#FF7A66', 'gold', '#FFB2A6'],
  ['style_cyber_emerald', 'Matrix de Esmeralda', 'Verde código sobre ciudad cyberpunk.', '💻', 95, '#65DB85', 'cyber', '#A8F5BE'],
  ['style_ruby_citadel', 'Fortaleza de Rubí', 'Carmesí real sobre noche violeta.', '🏰', 90, '#FF5268', 'gradient', '#FFA3B0'],
  ['style_nordic_fjord', 'Fiordo de las Valkirias', 'Índigo boreal sobre glaciar de menta.', '🛡️', 90, '#6E8BFF', 'mint', '#AFC0FF'],
  ['style_desert_mirage', 'Espejismo del Sahara', 'Cobre cálido sobre atardecer dorado.', '🐪', 85, '#FF9E5E', 'sunset', '#FFC9A3'],
  ['style_kyoto_moonlight', 'Luna Llena en Kioto', 'Índigo nocturno sobre templo japonés.', '🏮', 95, '#6E8BFF', 'japan', '#AFC0FF'],
  ['style_hyperion_gold', 'Templo Solar de Hiperión', 'Ámbar radiante sobre aurora boreal.', '☀️', 105, '#FFB84D', 'aurora', '#FFE082'],
  ['style_siren_cove', 'Cala de las Sirenas', 'Rosa perlado en el mar abisal.', '🧜‍♀️', 95, '#F48FB1', 'abyss', '#FFBFD4'],
  ['style_titan_obsidian', 'Forja del Titán', 'Coral volcánico sobre fuego carmesí.', '🔨', 100, '#FF7A66', 'crimson', '#FFB2A6'],
  ['style_diamond_zenith', 'Cenit de Diamante', 'Cian puro sobre cumbre dorada.', '💎', 110, '#64D8FF', 'gold', '#99F2FF'],
  ['style_founder_symphony', 'Gala de Fundador Indie', 'Sintonía suprema en oro y púrpura imperial.', '🌟', 140, '#FFD54F', 'gradient', '#FFE082'],
];

export const CARD_STYLE_VAULT: CardStyleVaultItem[] = CARD_STYLE_VAULT_DATA.map(
  ([id, name, subtitle, emoji, gemCost, accentColor, bannerId, previewColorSecondary]) => ({
    id,
    name,
    subtitle,
    badge: gemCost === 0 ? 'GRATIS' : gemCost >= 110 ? 'ÉPICO' : 'PREMIUM',
    emoji,
    gemCost,
    accentColor,
    bannerId,
    previewColorSecondary,
  })
);

export function findCardStyleVaultItem(
  styleId?: string,
  accentColor?: string,
  bannerId?: string
): CardStyleVaultItem | undefined {
  if (styleId) {
    const byId = CARD_STYLE_VAULT.find((s) => s.id === styleId);
    if (byId) return byId;
  }
  if (accentColor && bannerId) {
    return CARD_STYLE_VAULT.find(
      (s) =>
        s.accentColor.toUpperCase() === accentColor.toUpperCase() &&
        s.bannerId.toLowerCase() === bannerId.toLowerCase()
    );
  }
  return undefined;
}

// ============================================================================
// 5. GUARDIAN PROFILE TITLES & EMBLEMS (36 ITEMS: 11 FREE / 25 PREMIUM)
// ============================================================================
const GUARDIAN_TITLES_DATA: Array<[string, string, string, string, number, string]> = [
  // 11 FREE (30%)
  ['title_seed', 'Sembrador de Hábitos', 'Inicia tu camino en el Santuario.', '🌱', 0, '#82E59B'],
  ['title_step', 'Caminante Constante', 'Un paso cada día hacia la cumbre.', '🥾', 0, '#90CAF9'],
  ['title_flame', 'Guardián de la Llama', 'Mantiene viva la chispa diaria.', '🔥', 0, '#FFB74D'],
  ['title_reader', 'Buscador de Sabiduría', 'Mente enfocada en aprender.', '📖', 0, '#CE93D8'],
  ['title_saver', 'Arquitecto del Futuro', 'Construye su tranquilidad paso a paso.', '🧱', 0, '#FFD54F'],
  ['title_zen', 'Espíritu Sereno', 'Avanza sin prisa pero sin pausa.', '🍵', 0, '#A5D6A7'],
  ['title_night', 'Centinela Nocturno', 'Cumple sus metas bajo las estrellas.', '🌙', 0, '#9FA8DA'],
  ['title_morning', 'Heraldo del Alba', 'Aprovecha las primeras horas del día.', '🌅', 0, '#FFCC80'],
  ['title_compass', 'Navegante de Metas', 'Rumbo fijo hacia el objetivo.', '🧭', 0, '#80DEEA'],
  ['title_shield', 'Escudo de Disciplina', 'Firme ante cualquier distracción.', '🛡️', 0, '#B0BEC5'],
  ['title_friend', 'Amigo de los Guardianes', 'Cuida a su compañero evolutivo.', '🐾', 0, '#F48FB1'],

  // 25 PREMIUM (70%)
  ['title_founder', 'Fundador del Santuario', 'Apoyo noble al desarrollo independiente.', '👑', 150, '#FFD54F'],
  ['title_alchemist', 'Alquimista del Tiempo', 'Convierte pequeños minutos en oro puro.', '⚗️', 75, '#FFD740'],
  ['title_dragon_lord', 'Señor de los Dragones', 'Domina las metas más exigentes.', '🐉', 95, '#26A69A'],
  ['title_cyber_runner', 'Viajero del Hiperespacio', 'Velocidad y precisión futurista.', '⚡', 80, '#00E5FF'],
  ['title_sakura_master', 'Maestro del Templo Sakura', 'Armonía y belleza en cada registro.', '🌸', 85, '#FF80AB'],
  ['title_phoenix_king', 'Emperador del Fénix', 'Renace más fuerte en cada racha.', '🦅', 110, '#FF5252'],
  ['title_valkyrie_captain', 'Comandante del Valhalla', 'Honor inquebrantable ante los retos.', '🪽', 100, '#80D8FF'],
  ['title_quasar_architect', 'Arquitecto del Quásar', 'Trasciende las leyes de la constancia.', '🪐', 135, '#E040FB'],
  ['title_abyss_monarch', 'Monarca del Abismo', 'Profundidad y calma oceánica.', '🔱', 85, '#00E676'],
  ['title_cronos_warden', 'Guardián del Reloj Eterno', 'Dueño absoluto de su propio ritmo.', '⏳', 90, '#FFB74D'],
  ['title_seraph_blessed', 'Elegido del Serafín', 'Luz celestial en cada proyecto.', '👁️', 120, '#FFF59D'],
  ['title_kitsune_sage', 'Sabio de las Nueve Colas', 'Astucia y magia en cada ahorro.', '🦊', 95, '#FF6E40'],
  ['title_diamond_hand', 'Mano de Diamante', 'Jamás abandona un objetivo iniciado.', '💎', 110, '#80DEEA'],
  ['title_astral_oracle', 'Oráculo de las Estrellas', 'Visualiza el éxito antes de empezar.', '🔮', 85, '#B388FF'],
  ['title_thunder_shogun', 'Shogun del Relámpago', 'Determinación marcial imparable.', '⚔️', 105, '#40C4FF'],
  ['title_emerald_druid', 'Archidruida del Bosque', 'Hace florecer cada hábito que toca.', '🦌', 90, '#69F0AE'],
  ['title_solar_paladin', 'Paladín de la Corona Solar', 'Brilla con luz propia en el Santuario.', '☀️', 100, '#FFD54F'],
  ['title_nebula_weaver', 'Tejedor de Nebulosas', 'Crea universos de productividad.', '🌌', 115, '#EA80FC'],
  ['title_arcade_legend', 'Leyenda del High-Score', 'Supera su propio récord cada semana.', '🕹️', 80, '#76FF03'],
  ['title_golden_lion', 'Corazón de León Dorado', 'Coraje real para grandes ahorros.', '🦁', 95, '#FFAB00'],
  ['title_frost_emperor', 'Soberano de la Escarcha', 'Mente fría y cálculo perfecto.', '❄️', 85, '#81D4FA'],
  ['title_ruby_conqueror', 'Conquistador Carmesí', 'Pasión total por alcanzar el 100%.', '♦️', 90, '#FF1744'],
  ['title_lofi_dreamer', 'Soñador de Medianoche', 'Creatividad tranquila con música suave.', '🎧', 70, '#CE93D8'],
  ['title_merkaba_ascended', 'Iluminado del Merkaba', 'Equilibrio perfecto entre mente y acción.', '✡️', 125, '#00E5FF'],
  ['title_cosmos_sovereign', 'Soberano del Multiverso', 'El título más alto de Objective Reacher.', '🌌', 180, '#FFD740'],
];

export const GUARDIAN_TITLES: GuardianTitleItem[] = GUARDIAN_TITLES_DATA.map(
  ([id, title, subtitle, emoji, gemCost, color]) => ({
    id,
    title,
    subtitle,
    emoji,
    badge: gemCost === 0 ? 'GRATIS' : gemCost >= 120 ? 'LEGENDARIO' : 'PREMIUM',
    gemCost,
    color,
  })
);

export function findGuardianTitle(id?: string): GuardianTitleItem {
  return GUARDIAN_TITLES.find((t) => t.id === id) || GUARDIAN_TITLES[0];
}

// ============================================================================
// 6. SANCTUARY BUFFS, FREE BLESSINGS & RELICS (24 ITEMS: 7 FREE / 17 PREMIUM)
// ============================================================================
export const SANCTUARY_BUFFS: SanctuaryBuffDefinition[] = [
  // --- 7 FREE MILESTONE BLESSINGS (30%) ---
  {
    id: 'bless_welcome_dew',
    name: 'Bendición del Primer Paso',
    subtitle: 'Regalo gratuito del Santuario (+50 XP)',
    description: 'Reclama gratis esta chispa inicial de +50 XP para impulsar el nivel de tu guardián.',
    icon: '🌱',
    gemCost: 0,
    accentColor: '#82E59B',
    badgeText: 'GRATIS · +50 XP',
    kind: 'free_blessing',
    xpAmount: 50,
    requiredLevel: 1,
  },
  {
    id: 'bless_level_3',
    name: 'Ofrenda del Brote (Nv. 3+)',
    subtitle: 'Recompensa gratuita al alcanzar Nivel 3 (+75 XP)',
    description: 'Un rocío energético gratuito para premiar tus primeros avances constantes.',
    icon: '🍃',
    gemCost: 0,
    accentColor: '#81C784',
    badgeText: 'GRATIS NV.3 · +75 XP',
    kind: 'free_blessing',
    xpAmount: 75,
    requiredLevel: 3,
  },
  {
    id: 'bless_level_5_shield',
    name: 'Escudo del Caminante (Nv. 5+)',
    subtitle: 'Bendición de constancia gratuita (+100 XP)',
    description: 'El Santuario te entrega una chispa de +100 XP por tus primeros 5 niveles constantes.',
    icon: '✨',
    gemCost: 0,
    accentColor: '#64D8FF',
    badgeText: 'GRATIS NV.5 · +100 XP',
    kind: 'free_blessing',
    xpAmount: 100,
    requiredLevel: 5,
  },
  {
    id: 'bless_level_10_neko',
    name: 'Tributo del Espíritu Neko (Nv. 10+)',
    subtitle: 'Recompensa gratuita por tu 2ª Especie (+120 XP)',
    description: 'Celebra el despertar de tu segunda especie con +120 XP gratuitos.',
    icon: '🐱',
    gemCost: 0,
    accentColor: '#FFD54F',
    badgeText: 'GRATIS NV.10 · +120 XP',
    kind: 'free_blessing',
    xpAmount: 120,
    requiredLevel: 10,
  },
  {
    id: 'bless_level_15',
    name: 'Brisa de Kitsune (Nv. 15+)',
    subtitle: 'Impulso gratuito de medio camino (+150 XP)',
    description: 'Energía espiritual gratuita para acercarte a la tercera evolución.',
    icon: '🦊',
    gemCost: 0,
    accentColor: '#FF8A65',
    badgeText: 'GRATIS NV.15 · +150 XP',
    kind: 'free_blessing',
    xpAmount: 150,
    requiredLevel: 15,
  },
  {
    id: 'bless_level_20_shield',
    name: 'Égida del Guardián (Nv. 20+)',
    subtitle: '+1 Escudo de Racha + 150 XP gratis en Nivel 20',
    description: 'Premio especial gratuito por desbloquear la tercera especie del códice: otorga 1 Escudo de Racha sagrado.',
    icon: '🛡️',
    gemCost: 0,
    accentColor: '#B58BFF',
    badgeText: 'GRATIS NV.20 · +1 ESCUDO',
    kind: 'free_blessing',
    xpAmount: 150,
    shieldsAmount: 1,
    requiredLevel: 20,
  },
  {
    id: 'bless_level_30',
    name: 'Corona del Búho Sabio (Nv. 30+)',
    subtitle: 'Bendición gratuita de maestría (+250 XP)',
    description: 'Un gran impulso gratuito de +250 XP para guardianes veteranos.',
    icon: '🦉',
    gemCost: 0,
    accentColor: '#80DEEA',
    badgeText: 'GRATIS NV.30 · +250 XP',
    kind: 'free_blessing',
    xpAmount: 250,
    requiredLevel: 30,
  },

  // --- 17 PREMIUM BUFFS & RELICS (70%) ---
  {
    id: 'buff_xp_elixir',
    name: 'Elixir de Impulso ×1.5 XP',
    subtitle: '+50% XP en todo durante 24 horas',
    description: 'Potencia cada aporte, gasto registrado y misión diaria con un +50% de XP extra por 24 horas.',
    icon: '🧪',
    gemCost: 45,
    accentColor: '#B58BFF',
    badgeText: '24 HORAS · ×1.5 XP',
    kind: 'xp_boost',
  },
  {
    id: 'buff_streak_shield',
    name: 'Escudo de Racha Eterna',
    subtitle: 'Salva tu racha 🔥 si un día no puedes entrar',
    description: 'Se guarda en tu inventario y protege automáticamente tu racha si olvidas registrar un día.',
    icon: '🛡️',
    gemCost: 65,
    accentColor: '#64D8FF',
    badgeText: 'CONSUMIBLE AUTOMÁTICO',
    kind: 'shield',
    shieldsAmount: 1,
  },
  {
    id: 'buff_star_nectar',
    name: 'Néctar Estelar Instantáneo',
    subtitle: '+150 XP directos para tu mascota ahora mismo',
    description: 'Alimenta a tu guardián con néctar de las estrellas para darle +150 XP al instante.',
    icon: '🍯',
    gemCost: 50,
    accentColor: '#FFD54F',
    badgeText: '+150 XP AL INSTANTE',
    kind: 'instant_xp',
    xpAmount: 150,
  },
  {
    id: 'buff_gem_magnet',
    name: 'Amuleto Cosechador ×2 💎',
    subtitle: 'Duplica las Gemas ganadas por 7 días',
    description: 'Durante 7 días, cada caricia a tu mascota, misión diaria y cofre de sello entrega el doble de Gemas.',
    icon: '🧲',
    gemCost: 85,
    accentColor: '#82E59B',
    badgeText: '7 DÍAS · DOBLE 💎',
    kind: 'gem_magnet',
  },
  {
    id: 'buff_shield_bundle_3',
    name: 'Bastión de 3 Escudos de Racha',
    subtitle: 'Pack ahorrador de +3 Escudos en tu inventario',
    description: 'Asegura toda una semana de imprevistos o viajes con 3 Escudos de Racha Eterna.',
    icon: '🏰',
    gemCost: 165,
    accentColor: '#4DD0E1',
    badgeText: '+3 ESCUDOS DE RACHA',
    kind: 'shield',
    shieldsAmount: 3,
  },
  {
    id: 'buff_ambrosia_500',
    name: 'Ambrosía Real de los Dioses',
    subtitle: '+500 XP instantáneos para evolucionar rápido',
    description: 'Banquete celestial que otorga +500 XP directos y desata la fanfarria de evolución.',
    icon: '🏆',
    gemCost: 145,
    accentColor: '#FFB84D',
    badgeText: '+500 XP AL INSTANTE',
    kind: 'instant_xp',
    xpAmount: 500,
  },
  {
    id: 'buff_supernova_1200',
    name: 'Cristal de Supernova Pura',
    subtitle: '+1,200 XP directos para grandes saltos de especie',
    description: 'Energía concentrada de un quásar para impulsar varios niveles de tu mascota en el acto.',
    icon: '💥',
    gemCost: 290,
    accentColor: '#FF4081',
    badgeText: '+1,200 XP AL INSTANTE',
    kind: 'instant_xp',
    xpAmount: 1200,
  },
  {
    id: 'relic_hourglass',
    name: 'Reliquia: Reloj de Arena Áureo',
    subtitle: 'Reliquia coleccionable +200 XP de bono',
    description: 'Artefacto permanente en tu vitrina del Santuario que otorga +200 XP al activarlo.',
    icon: '⏳',
    gemCost: 90,
    accentColor: '#FFD54F',
    badgeText: 'RELIQUIA · +200 XP',
    kind: 'relic',
    xpAmount: 200,
  },
  {
    id: 'relic_jade_totem',
    name: 'Reliquia: Tótem de Jade Imperial',
    subtitle: 'Reliquia coleccionable +250 XP de bono',
    description: 'Escultura ancestral de la prosperidad que suma +250 XP permanentes a tu guardián.',
    icon: '🗿',
    gemCost: 105,
    accentColor: '#26A69A',
    badgeText: 'RELIQUIA · +250 XP',
    kind: 'relic',
    xpAmount: 250,
  },
  {
    id: 'relic_phoenix_feather',
    name: 'Reliquia: Pluma de Fénix Eterno',
    subtitle: 'Reliquia coleccionable mística +220 XP',
    description: 'Pluma cálida que nunca se apaga: artefacto mítico que otorga +220 XP.',
    icon: '🪶',
    gemCost: 115,
    accentColor: '#FF5252',
    badgeText: 'RELIQUIA · +220 XP',
    kind: 'relic',
    xpAmount: 220,
  },
  {
    id: 'relic_astral_compass',
    name: 'Reliquia: Astrolabio de los Sabios',
    subtitle: 'Reliquia coleccionable +300 XP de bono',
    description: 'Instrumento celeste que alinea tus objetivos y suma +300 XP al instante.',
    icon: '🧭',
    gemCost: 120,
    accentColor: '#80D8FF',
    badgeText: 'RELIQUIA · +300 XP',
    kind: 'relic',
    xpAmount: 300,
  },
  {
    id: 'relic_sakura_bonsai',
    name: 'Reliquia: Bonsái Milenario Sakura',
    subtitle: 'Reliquia coleccionable +280 XP de bono',
    description: 'Árbol en miniatura que florece eternamente en tu Santuario (+280 XP).',
    icon: '🪴',
    gemCost: 115,
    accentColor: '#FF80AB',
    badgeText: 'RELIQUIA · +280 XP',
    kind: 'relic',
    xpAmount: 280,
  },
  {
    id: 'relic_dragon_pearl',
    name: 'Reliquia: Perla del Dragón Celeste',
    subtitle: 'Reliquia coleccionable +350 XP de bono',
    description: 'Esfera luminosa de sabiduría oriental que otorga +350 XP al desbloquearla.',
    icon: '🔮',
    gemCost: 135,
    accentColor: '#00E676',
    badgeText: 'RELIQUIA · +350 XP',
    kind: 'relic',
    xpAmount: 350,
  },
  {
    id: 'relic_valkyrie_chalice',
    name: 'Reliquia: Cáliz del Valhalla',
    subtitle: 'Reliquia coleccionable +1 Escudo y +250 XP',
    description: 'Copa ceremonial de oro nórdico (+250 XP y +1 Escudo de Racha sagrado).',
    icon: '🏆',
    gemCost: 175,
    accentColor: '#FFD740',
    badgeText: 'RELIQUIA · +1 ESCUDO',
    kind: 'relic',
    xpAmount: 250,
    shieldsAmount: 1,
  },
  {
    id: 'relic_cyber_core',
    name: 'Reliquia: Reactor Cuántico Neón',
    subtitle: 'Reliquia coleccionable +400 XP de bono',
    description: 'Núcleo de energía limpia que impulsa a tu guardián con +400 XP.',
    icon: '⚛️',
    gemCost: 150,
    accentColor: '#00E5FF',
    badgeText: 'RELIQUIA · +400 XP',
    kind: 'relic',
    xpAmount: 400,
  },
  {
    id: 'relic_philosopher_stone',
    name: 'Reliquia: Piedra Filosofal',
    subtitle: 'Reliquia coleccionable +550 XP de bono',
    description: 'La obra maestra de la alquimia: otorga un gran salto de +550 XP permanentes.',
    icon: '♦️',
    gemCost: 195,
    accentColor: '#FF1744',
    badgeText: 'RELIQUIA ÉPICA · +550 XP',
    kind: 'relic',
    xpAmount: 550,
  },
  {
    id: 'relic_infinity_crown',
    name: 'Reliquia: Corona de la Singularidad',
    subtitle: 'Reliquia suprema +800 XP y +1 Escudo',
    description: 'El tesoro más alto del Santuario: otorga +800 XP y +1 Escudo de Racha sagrado.',
    icon: '👑',
    gemCost: 250,
    accentColor: '#E040FB',
    badgeText: 'RELIQUIA MÍTICA · +800 XP',
    kind: 'relic',
    xpAmount: 800,
    shieldsAmount: 1,
  },
];

// Summary totals for UI badges (65 Free / 151 Premium = 216 Total)
export const VAULT_STATS = {
  totalItems:
    MASCOT_SKINS.length +
    CARD_COSMETICS.length +
    SOUND_PACKS.length +
    CARD_STYLE_VAULT.length +
    GUARDIAN_TITLES.length +
    SANCTUARY_BUFFS.length, // 36 + 48 + 30 + 42 + 36 + 24 = 216
  freeItems:
    MASCOT_SKINS.filter((x) => x.gemCost === 0).length +
    CARD_COSMETICS.filter((x) => x.gemCost === 0).length +
    SOUND_PACKS.filter((x) => x.gemCost === 0).length +
    CARD_STYLE_VAULT.filter((x) => x.gemCost === 0).length +
    GUARDIAN_TITLES.filter((x) => x.gemCost === 0).length +
    SANCTUARY_BUFFS.filter((x) => x.gemCost === 0).length, // 11 + 14 + 9 + 13 + 11 + 7 = 65 (30.1%)
  premiumItems:
    MASCOT_SKINS.filter((x) => x.gemCost > 0).length +
    CARD_COSMETICS.filter((x) => x.gemCost > 0).length +
    SOUND_PACKS.filter((x) => x.gemCost > 0).length +
    CARD_STYLE_VAULT.filter((x) => x.gemCost > 0).length +
    GUARDIAN_TITLES.filter((x) => x.gemCost > 0).length +
    SANCTUARY_BUFFS.filter((x) => x.gemCost > 0).length, // 25 + 34 + 21 + 29 + 25 + 17 = 151 (69.9%)
};

export const INDIE_SUPPORT_PACKS: IndieSupportPack[] = [
  {
    id: 'pack_founder',
    title: 'Pase Fundador Indie (Edición Estreno)',
    subtitle: 'Desbloquea TODA la colección cosmética, títulos y skins con un único apoyo al creador independiente.',
    badge: '👑 MEJOR VALOR · -50% OFF',
    emoji: '👑',
    regularUsdPrice: '$9.99 USD',
    regularUsdNumeric: 9.99,
    usdPrice: '$4.99 USD',
    usdNumeric: 4.99,
    discountPct: 50,
    isLaunchOffer: true,
    savingsUsd: 'Ahorras $5.00 USD (-50%)',
    launchTag: '🔥 50% OFF ESTRENO',
    arsReference: 'Tuyo para siempre · Mercado Pago / PayPal / GPay',
    googlePlaySku: 'or_pack_founder_lifetime',
    gemsIncluded: 850,
    shieldsIncluded: 3,
    unlocksAllSkins: true,
    permanentXpBonusPct: 20,
    highlightColor: '#FFD54F',
    perks: [
      '🎨 Desbloquea TODAS las 36 Skins, 48 Marcos, 30 Packs de Sonido y 36 Títulos',
      '⚡ Bono Permanente +20% XP de Fundador en todos tus avances',
      '💎 +850 Gemas Astrales (¡+100 Gemas Extra de Estreno v1.0!)',
      '🛡️ +3 Escudos de Racha Eterna en tu inventario',
      '🔑 Código PRO vitalicio firmado para usar en Web y Android',
    ],
  },
  {
    id: 'pack_bundle_ultimate',
    title: 'Super Pack Fundador Supremo v1.0',
    subtitle: 'La experiencia definitiva: Bóveda completa, reserva épica de gemas y máximo multiplicador.',
    badge: '⭐ PAQUETE SUPREMO · -53% OFF',
    emoji: '🌟',
    regularUsdPrice: '$14.99 USD',
    regularUsdNumeric: 14.99,
    usdPrice: '$6.99 USD',
    usdNumeric: 6.99,
    discountPct: 53,
    isLaunchOffer: true,
    savingsUsd: 'Ahorras $8.00 USD (-53%)',
    launchTag: '⭐ -53% SUPREMO',
    arsReference: 'Acceso Total Vitalicio · Mercado Pago / PayPal / GPay',
    googlePlaySku: 'or_pack_ultimate_founder',
    gemsIncluded: 1500,
    shieldsIncluded: 5,
    unlocksAllSkins: true,
    permanentXpBonusPct: 25,
    highlightColor: '#FF70A6',
    perks: [
      '🌟 Acceso vitalicio a TODO el contenido actual y futuro de la Bóveda',
      '⚡ Multiplicador Máximo: +25% XP Permanente en todas las actividades',
      '💎 +1,500 Gemas Astrales para Reliquias, Elixires y Buffs supremos',
      '🛡️ +5 Escudos de Racha Eterna (protección de racha garantizada)',
      '🔑 Licencia Criptográfica PRO Suprema para transferir entre dispositivos',
    ],
  },
  {
    id: 'pack_gem_chest',
    title: 'Cofre Astral de 600 Gemas (Bonus Estreno)',
    subtitle: 'Reserva abundante de cristales con bonificación de lanzamiento para Buffs, Reliquias y Cosméticos.',
    badge: 'BOLSA DE CRISTALES · -40% OFF',
    emoji: '💎',
    regularUsdPrice: '$4.99 USD',
    regularUsdNumeric: 4.99,
    usdPrice: '$2.99 USD',
    usdNumeric: 2.99,
    discountPct: 40,
    isLaunchOffer: true,
    savingsUsd: 'Ahorras $2.00 USD (-40%)',
    launchTag: '💎 40% OFF RECARGA',
    arsReference: 'Mercado Pago (ARS) · PayPal · Google Pay',
    googlePlaySku: 'or_pack_500_gems',
    gemsIncluded: 600,
    shieldsIncluded: 2,
    unlocksAllSkins: false,
    permanentXpBonusPct: 0,
    highlightColor: '#B58BFF',
    perks: [
      '💎 +600 Gemas Astrales (+100 Gemas Extra de Lanzamiento)',
      '🛡️ +2 Escudos de Racha de regalo',
      '🔑 Código de respaldo PRO transferible entre tus dispositivos',
    ],
  },
  {
    id: 'pack_coffee',
    title: 'Invítame un Café Indie (Pack Bienvenida)',
    subtitle: 'Impulsa el desarrollo independiente con precio de estreno y recibe un paquete de agradecimiento.',
    badge: 'APOYO CERCANO · -33% OFF',
    emoji: '☕',
    regularUsdPrice: '$2.99 USD',
    regularUsdNumeric: 2.99,
    usdPrice: '$1.99 USD',
    usdNumeric: 1.99,
    discountPct: 33,
    isLaunchOffer: true,
    savingsUsd: 'Ahorras $1.00 USD (-33%)',
    launchTag: '☕ 33% OFF BIENVENIDA',
    arsReference: 'Mercado Pago (ARS) · PayPal · Google Pay',
    googlePlaySku: 'or_pack_indie_coffee',
    gemsIncluded: 350,
    shieldsIncluded: 1,
    unlocksAllSkins: false,
    permanentXpBonusPct: 0,
    highlightColor: '#65DB85',
    perks: [
      '💎 +350 Gemas Astrales (+70 Gemas Extra de Lanzamiento)',
      '🛡️ +1 Escudo de Racha Eterna incluido',
      '💚 Insignia exclusiva "Supporter Indie" junto a tu marca',
      '🔑 Incluye Código de Recuperación PRO para restaurar en cualquier dispositivo',
    ],
  },
];

export function findMascotSkin(skinId?: string): MascotSkinDefinition {
  return MASCOT_SKINS.find((s) => s.id === skinId) || MASCOT_SKINS[0];
}

export function isTimestampActive(isoUntil?: string): boolean {
  if (!isoUntil) return false;
  const time = new Date(isoUntil).getTime();
  return !Number.isNaN(time) && time > Date.now();
}

export function formatRemainingBuffTime(isoUntil?: string): string {
  if (!isoUntil) return '';
  const diffMs = new Date(isoUntil).getTime() - Date.now();
  if (diffMs <= 0) return '';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remH = totalHours % 24;
    return `${days}d ${remH}h`;
  }
  if (totalHours > 0) {
    return `${totalHours}h ${mins}m`;
  }
  return `${Math.max(1, mins)}m`;
}

// ============================================================================
// PUENTE DE ARQUITECTURA DUAL DE PAGOS:
// 1) Si corre dentro de Google Play (TWA Android), prioriza Google Play Billing.
// 2) En Web / PWA, conecta con las rutas del servidor (`/api/payments/...`)
//    para Mercado Pago (LatAm/ARS) o Pasarela Global (PayPal / Google Pay USD),
//    o utiliza los links directos configurados en `.env`.
// ============================================================================
export async function triggerStoreCheckout(pack: {
  id?: string;
  title: string;
  usdPrice: string;
  usdNumeric?: number;
  googlePlaySku: string;
  preferredGateway?: PaymentGatewayChoice;
}): Promise<DualCheckoutResult> {
  const gateway: PaymentGatewayChoice =
    pack.preferredGateway || 'mercadopago';
  const packId = pack.id || 'custom_tip';
  const numericUsd =
    typeof pack.usdNumeric === 'number'
      ? pack.usdNumeric
      : Number(pack.usdPrice.replace(/[^0-9.]/g, '')) || 1.99;

  // 1. Detectar si estamos dentro de la App Android instalada desde Google Play (Digital Goods API)
  try {
    const anyWindow = window as unknown as {
      getDigitalGoodsService?: (serviceUrl: string) => Promise<{
        getDetails: (skus: string[]) => Promise<unknown[]>;
      }>;
    };

    if (typeof anyWindow.getDigitalGoodsService === 'function') {
      const service = await anyWindow.getDigitalGoodsService(
        'https://play.google.com/billing'
      );
      if (service && typeof PaymentRequest !== 'undefined') {
        const paymentMethods = [
          {
            supportedMethods: 'https://play.google.com/billing',
            data: { sku: pack.googlePlaySku },
          },
        ];
        const details = {
          total: {
            label: pack.title,
            amount: {
              currency: 'USD',
              value: numericUsd.toFixed(2),
            },
          },
        };
        const request = new PaymentRequest(paymentMethods, details);
        const response = await request.show();
        await response.complete('success');

        const gpTxId = `GP-${Date.now().toString(36).toUpperCase()}`;
        const receiptRes = await fetch('/api/payments/issue-receipt-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId,
            customUsdAmount: numericUsd,
            gateway: 'google_play',
            externalTxId: gpTxId,
          }),
        }).catch(() => null);
        const receiptData = receiptRes ? await receiptRes.json().catch(() => null) : null;

        return {
          success: true,
          mode: 'google_play_billing',
          gateway: 'google_play',
          receiptId: gpTxId,
          licenseCode: receiptData?.licenseCode,
        };
      }
    }
  } catch {
    // Si no está en entorno Google Play TWA, continúa con la Pasarela Dual Web
  }

  // 2. Verificar si el desarrollador configuró un Link Directo Estático en .env
  const directLinkMap =
    gateway === 'mercadopago'
      ? DUAL_PAYMENT_PLACEHOLDERS.mpDirectLinks
      : DUAL_PAYMENT_PLACEHOLDERS.globalDirectLinks;

  const configuredDirectUrl =
    directLinkMap[packId as keyof typeof directLinkMap] || '';
  if (
    configuredDirectUrl &&
    configuredDirectUrl.startsWith('http') &&
    !configuredDirectUrl.includes('PLACEHOLDER')
  ) {
    window.location.href = configuredDirectUrl;
    return {
      success: false,
      redirecting: true,
      mode:
        gateway === 'mercadopago'
          ? 'mercadopago_live'
          : 'paypal_googlepay_live',
      gateway,
      receiptId: 'REDIRECTING',
    };
  }

  // 3. Llamar al Backend Dual (`/api/payments/mercadopago/create-preference` o `/api/payments/paypal/create-order`)
  try {
    const endpoint =
      gateway === 'mercadopago'
        ? '/api/payments/mercadopago/create-preference'
        : '/api/payments/paypal/create-order';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packId,
        customUsdAmount: numericUsd,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      // Si las credenciales reales están puestas en .env, redirige al Checkout Oficial
      if (data.mode === 'live_redirect' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return {
          success: false,
          redirecting: true,
          mode:
            gateway === 'mercadopago'
              ? 'mercadopago_live'
              : 'paypal_googlepay_live',
          gateway,
          receiptId: data.preferenceId || data.orderId || 'LIVE',
          arsPrice: data.arsPrice,
        };
      }

      // Modo Placeholder Local: devuelve recibo y código de licencia firmado (OR-PRO-...)
      if (data.ok) {
        return {
          success: true,
          mode: 'dual_placeholder_sandbox',
          gateway,
          receiptId: data.txId || `SIM-${Date.now().toString(36).toUpperCase()}`,
          licenseCode: data.licenseCode,
          arsPrice: data.arsPrice,
          notice: data.notice,
        };
      }
    }
  } catch {
    // Fallback local si se corre sin backend
  }

  return {
    success: true,
    mode: 'dual_placeholder_sandbox',
    gateway,
    receiptId: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
  };
}

export async function verifyAndRedeemLicenseCode(code: string): Promise<{
  valid: boolean;
  payload?: VerifiedLicensePayload;
  reason?: string;
}> {
  try {
    const res = await fetch('/api/payments/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        valid: false,
        reason: err.reason || 'No se pudo verificar el código PRO.',
      };
    }
    return await res.json();
  } catch {
    return {
      valid: false,
      reason: 'Error de conexión al verificar el código PRO con el servidor.',
    };
  }
}
