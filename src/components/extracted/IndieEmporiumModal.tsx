import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { TranslationDictionary, loadAppLanguage } from "../../i18n";
import { MascotSkinDefinition, CardCosmeticDefinition, SoundPackCatalogItem, CardStyleVaultItem, GuardianTitleItem, SanctuaryBuffDefinition, IndieSupportPack, PaymentGatewayChoice, findMascotSkin, findCardCosmetic, findCardStyleVaultItem, SOUND_PACKS, findGuardianTitle, MASCOT_SKINS, CARD_COSMETICS, CARD_STYLE_VAULT, GUARDIAN_TITLES, SANCTUARY_BUFFS, VAULT_STATS, INDIE_SUPPORT_PACKS } from "../../monetization";
import { findAccentTheme, findBannerPreset, formatObjectiveAmount } from "../../catalog";
import { playSoundPackPreview, playUiTap, playMascotVoice } from "../../soundEffects";
import { MascotAvatarSvg } from "./MascotAvatarSvg";
import { PurchaseConfirmModal, PurchaseItem } from "./PurchaseConfirmModal";

const { STORAGE_KEY, LEGACY_STORAGE_KEYS, LAUNCH_DEADLINE_STORAGE_KEY, MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

interface PendingPurchaseItem extends PurchaseItem {
  _type: 'skin' | 'frame' | 'sound' | 'style' | 'title' | 'buff';
  _raw: any;
}

export function IndieEmporiumModal({
  initialTab,
  currentObjective,
  level,
  gems,
  unlockedSkins,
  equippedSkinId,
  unlockedVaultIds,
  equippedCardFrameId,
  equippedCardStyleId,
  equippedSoundPackId,
  equippedTitleId,
  activeAccentColor,
  activeBannerId,
  streakShields,
  isXpBoostActive,
  xpBoostRemainingText,
  isGemMagnetActive,
  gemMagnetRemainingText,
  isIndieFounder,
  supporterTier,
  lastIssuedLicenseCode,
  onSelectSkin,
  onSelectCardCosmetic,
  onSelectSoundPack,
  onApplyVaultCardStyle,
  onSelectGuardianTitle,
  onActivateBuff,
  onPurchasePack,
  onCustomTipSupport,
  onRedeemLicenseCode,
  onJumpToBoard,
  onClose,
  t,
  launchTimeLeft,
}: {
  initialTab: 'skins' | 'cards_audio' | 'buffs' | 'support';
  currentObjective: Objective;
  level: number;
  gems: number;
  unlockedSkins: string[];
  equippedSkinId: string;
  unlockedVaultIds: string[];
  equippedCardFrameId: string;
  equippedCardStyleId?: string;
  equippedSoundPackId: string;
  equippedTitleId: string;
  activeAccentColor: string;
  activeBannerId: string;
  streakShields: number;
  isXpBoostActive: boolean;
  xpBoostRemainingText: string;
  isGemMagnetActive: boolean;
  gemMagnetRemainingText: string;
  isIndieFounder: boolean;
  supporterTier: 'none' | 'coffee' | 'founder';
  lastIssuedLicenseCode: string;
  t: TranslationDictionary;
  launchTimeLeft: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  onSelectSkin: (skin: MascotSkinDefinition) => void;
  onSelectCardCosmetic: (cosmetic: CardCosmeticDefinition) => void;
  onSelectSoundPack: (pack: SoundPackCatalogItem) => void;
  onApplyVaultCardStyle: (styleItem: CardStyleVaultItem) => void;
  onSelectGuardianTitle: (titleItem: GuardianTitleItem) => void;
  onActivateBuff: (buff: SanctuaryBuffDefinition) => void;
  onPurchasePack: (
    pack: IndieSupportPack,
    gateway: PaymentGatewayChoice
  ) => void;
  onCustomTipSupport: (
    usdAmount: number,
    gateway: PaymentGatewayChoice
  ) => void;
  onRedeemLicenseCode: (
    code: string
  ) => Promise<{ ok: boolean; message: string }>;
  onJumpToBoard: () => void;
  onClose: () => void;
}) {
  const appLanguage = loadAppLanguage();
  const [activeTab, setActiveTab] = useState<
    'skins' | 'cards_audio' | 'buffs' | 'support'
  >(initialTab);
  const [vaultSubTab, setVaultSubTab] = useState<
    'frames' | 'sounds' | 'styles' | 'titles'
  >('frames');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewSkinId, setPreviewSkinId] = useState<string>(equippedSkinId);
  const [previewMascotLevel, setPreviewMascotLevel] = useState<number>(level);

  const [auditionedPackSteps, setAuditionedPackSteps] = useState<
    Record<string, { stepIndex: number; stepLabel: string }>
  >({});

  const [liveEquippedNotice, setLiveEquippedNotice] = useState<{
    id: number;
    emoji: string;
    title: string;
    subtitle: string;
    color: string;
  } | null>(null);

  const [tipAmountText, setTipAmountText] = useState<string>('2.00');
  const [isCustomTipEditing, setIsCustomTipEditing] = useState<boolean>(false);
  const tipCustomInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedGateway, setSelectedGateway] =
    useState<PaymentGatewayChoice>('mercadopago');
  const [mpArsRate, setMpArsRate] = useState<number>(1250);
  const [gatewayConfigStatus, setGatewayConfigStatus] = useState<{
    mpReady: boolean;
    globalReady: boolean;
  }>({ mpReady: false, globalReady: false });
  const [licenseInputText, setLicenseInputText] = useState<string>('');
  const [licenseFeedback, setLicenseFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [copiedCodeNotice, setCopiedCodeNotice] = useState<boolean>(false);
  
  // Estado para el ítem pendiente de confirmación de compra
  const [itemToPurchase, setItemToPurchase] = useState<any>(null);

  useEffect(() => {
    fetch('/api/payments/config-status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.mercadopago?.usdToArsRate) {
          setMpArsRate(Number(data.mercadopago.usdToArsRate));
        }
        setGatewayConfigStatus({
          mpReady: Boolean(data?.mercadopago?.ready),
          globalReady: Boolean(data?.globalGateway?.ready),
        });
      })
      .catch(() => {
        // Fallback silencioso
      });
  }, []);

  useEffect(() => {
    setPreviewSkinId(equippedSkinId);
  }, [equippedSkinId]);

  const unlockedLevel = Math.max(1, level);
  const previewSkin = findMascotSkin(previewSkinId);
  const previewTier = Math.floor(
    (Math.min(200, Math.max(1, previewMascotLevel)) - 1) / 10
  );
  const isPreviewLevelLocked = previewMascotLevel > unlockedLevel;

  const liveAccentTheme = useMemo(
    () => findAccentTheme(activeAccentColor),
    [activeAccentColor]
  );
  const liveBannerPreset = useMemo(
    () => findBannerPreset(activeBannerId),
    [activeBannerId]
  );
  const liveCustomBannerUrl = activeBannerId.startsWith('custom:')
    ? activeBannerId.slice('custom:'.length)
    : null;
  const liveBannerImg = liveCustomBannerUrl || liveBannerPreset.imageUrl;
  const liveFrameCosmetic = useMemo(
    () => findCardCosmetic(equippedCardFrameId),
    [equippedCardFrameId]
  );
  const liveStyleItem = useMemo(
    () =>
      findCardStyleVaultItem(
        equippedCardStyleId,
        activeAccentColor,
        activeBannerId
      ),
    [equippedCardStyleId, activeAccentColor, activeBannerId]
  );
  const liveSoundPackItem = useMemo(
    () =>
      SOUND_PACKS.find((s) => s.id === equippedSoundPackId) || SOUND_PACKS[0],
    [equippedSoundPackId]
  );
  const liveGuardianTitleItem = useMemo(
    () => findGuardianTitle(equippedTitleId),
    [equippedTitleId]
  );
  const liveObjProgressPct =
    currentObjective.goalAmount > 0
      ? Math.min(
          100,
          Math.floor(
            (currentObjective.currentAmount / currentObjective.goalAmount) * 100
          )
        )
      : 0;

  const handleAuditionSoundPack = (packId: string, forcedStep?: number) => {
    const res = playSoundPackPreview(packId, forcedStep);
    setAuditionedPackSteps((prev) => ({
      ...prev,
      [packId]: { stepIndex: res.stepIndex, stepLabel: res.stepLabel },
    }));
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesFilterAndSearch = (
    name: string,
    subtitle: string,
    gemCost: number
  ) => {
    if (tierFilter === 'free' && gemCost > 0) return false;
    if (tierFilter === 'premium' && gemCost === 0) return false;
    if (!normalizedSearch) return true;
    return (
      name.toLowerCase().includes(normalizedSearch) ||
      subtitle.toLowerCase().includes(normalizedSearch)
    );
  };

  const filteredSkins = useMemo(
    () =>
      MASCOT_SKINS.filter((s) =>
        matchesFilterAndSearch(s.name, s.subtitle, s.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredFrames = useMemo(
    () =>
      CARD_COSMETICS.filter((c) =>
        matchesFilterAndSearch(c.name, c.subtitle, c.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredSounds = useMemo(
    () =>
      SOUND_PACKS.filter((s) =>
        matchesFilterAndSearch(
          `${s.name} ${s.scaleName}`,
          s.subtitle,
          s.gemCost
        )
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredStyles = useMemo(
    () =>
      CARD_STYLE_VAULT.filter((st) =>
        matchesFilterAndSearch(st.name, st.subtitle, st.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredTitles = useMemo(
    () =>
      GUARDIAN_TITLES.filter((tItem) =>
        matchesFilterAndSearch(tItem.title, tItem.subtitle, tItem.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const filteredBuffs = useMemo(
    () =>
      SANCTUARY_BUFFS.filter((b) =>
        matchesFilterAndSearch(b.name, b.description, b.gemCost)
      ),
    [tierFilter, normalizedSearch]
  );

  const parsedTipUsd = useMemo(() => {
    const n = Number(tipAmountText.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0) return 0;
    return Math.min(500, n);
  }, [tipAmountText]);

  const tipRewardGems = Math.round(Math.max(0.5, parsedTipUsd) * 140);
  const tipRewardShields = Math.max(1, Math.floor(Math.max(0.5, parsedTipUsd) / 1.5));
  const tipUnlocksFounder = parsedTipUsd >= 4.99;

  const adjustTipBy = (delta: number) => {
    playUiTap(2);
    const next = Math.max(0.5, Math.min(500, (parsedTipUsd || 2) + delta));
    setTipAmountText(next.toFixed(2));
  };

  // Función para confirmar la compra de cualquier ítem con gemas
  const handleConfirmPurchase = () => {
    if (!itemToPurchase) return;

    const { _type, _raw } = itemToPurchase;

    if (_type === 'skin') {
      onSelectSkin(_raw);
    } else if (_type === 'frame') {
      onSelectCardCosmetic(_raw);
      setLiveEquippedNotice({
        id: Date.now(),
        emoji: _raw.emoji,
        title: t.equippedFrameNotice(_raw.name),
        subtitle: t.equippedFrameCardSub(currentObjective.title),
        color: _raw.borderColor,
      });
    } else if (_type === 'sound') {
      onSelectSoundPack(_raw);
      setLiveEquippedNotice({
        id: Date.now(),
        emoji: _raw.emoji,
        title: t.soundPackActivatedNotice(_raw.name),
        subtitle: `Motor ${_raw.synthEngineLabel || _raw.scaleName} activo en toda la app`,
        color: _raw.accentColor,
      });
    } else if (_type === 'style') {
      onApplyVaultCardStyle(_raw);
      setLiveEquippedNotice({
        id: Date.now(),
        emoji: _raw.emoji,
        title: `¡Estilo "${_raw.name}" aplicado en vivo!`,
        subtitle: t.themeAppliedNotice(currentObjective.title),
        color: _raw.accentColor,
      });
    } else if (_type === 'title') {
      onSelectGuardianTitle(_raw);
      setLiveEquippedNotice({
        id: Date.now(),
        emoji: _raw.emoji,
        title: `¡Título "${_raw.title}" equipado en vivo!`,
        subtitle: `Ya luce junto a tu nombre arriba y en la cabecera principal`,
        color: _raw.color,
      });
    } else if (_type === 'buff') {
      onActivateBuff(_raw);
    }

    setItemToPurchase(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0E17]/96 backdrop-blur-md flex flex-col overflow-hidden">
      {/* Pinned Top Header */}
      <div className="w-full bg-[#131221]/95 border-b border-[#2C2742] px-3 sm:px-5 pt-[max(0.65rem,calc(env(safe-area-inset-top,0px)+0.35rem))] pb-2.5 shrink-0">
        <div className="max-w-5xl w-full mx-auto space-y-2">
          {/* Row 1 */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1830] border border-[#3E335C] text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider shrink-0 whitespace-nowrap">
              <span className="text-xs leading-none shrink-0">🎯</span>
              <span className="text-[#F4F1FF] shrink-0 whitespace-nowrap">OBJECTIVE</span>
              <span className="text-[#82E59B] shrink-0 whitespace-nowrap">REACHER</span>
              <span className="text-[#FFD54F] shrink-0 whitespace-nowrap">· SANTUARIO</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playUiTap(1);
                  setActiveTab('support');
                }}
                title={t.astralGemsTooltip}
                className="h-8 px-2.5 sm:px-3 rounded-[10px] bg-[#1F1C30] border border-[#53417D] hover:border-[#B58BFF] cursor-pointer flex items-center gap-1.5 transition"
              >
                <span className="text-xs sm:text-sm leading-none">💎</span>
                <span className="text-xs sm:text-sm font-mono-tabular font-extrabold text-[#9AF0AE]">
                  {gems}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 sm:px-3.5 rounded-[10px] bg-[#2D2644] text-[#F4F1FF] text-xs sm:text-sm font-bold hover:bg-[#3B3258] transition shrink-0"
              >
                ← {t.backButton}
              </button>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
            <h2 className="text-[15px] sm:text-[19px] font-extrabold text-[#F4F1FF] leading-tight">
              {t.shopMainTitle}
            </h2>
            <span className="self-start sm:self-auto px-2 py-0.5 rounded-full bg-[#1E1A32] border border-[#65499C]/60 text-[9px] font-extrabold text-[#E2D4FF] shrink-0">
              {t.shopCollectiblesBadge(VAULT_STATS.totalItems)}
            </span>
          </div>

          {/* Row 3 */}
          <div className="p-1 rounded-[12px] bg-[#0E0D18] border border-[#29243D] grid grid-cols-2 sm:grid-cols-4 gap-1">
            {[
              { id: 'skins', label: t.tabSkins(MASCOT_SKINS.length) },
              {
                id: 'cards_audio',
                label: t.tabCardsAudio(
                  CARD_COSMETICS.length +
                    SOUND_PACKS.length +
                    CARD_STYLE_VAULT.length +
                    GUARDIAN_TITLES.length
                ),
              },
              { id: 'buffs', label: t.tabBuffs(SANCTUARY_BUFFS.length) },
              { id: 'support', label: `💖 ${t.tabSupport} (${t.supportTabPromoBadge})` },
            ].map((tabItem) => {
              const isSelected = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => {
                    playUiTap(1);
                    setActiveTab(
                      tabItem.id as 'skins' | 'cards_audio' | 'buffs' | 'support'
                    );
                  }}
                  className={`h-[33px] sm:h-[36px] px-2 rounded-[9px] text-[11px] sm:text-xs font-extrabold transition truncate ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#593596] to-[#7A4FD1] text-white border border-[#B58BFF]/60 shadow'
                      : 'text-[#A8A3B8] hover:text-[#F4F1FF] hover:bg-[#1A182B]'
                  }`}
                >
                  {tabItem.label}
                </button>
              );
            })}
          </div>

          {/* Row 4 */}
          {(activeTab === 'skins' ||
            activeTab === 'cards_audio' ||
            activeTab === 'buffs') && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#0E0D18] p-1 rounded-[10px] border border-[#262238]">
                {[
                  {
                    id: 'all',
                    label: t.filterAllWithCount(VAULT_STATS.totalItems),
                  },
                  {
                    id: 'free',
                    label: t.filterFree(VAULT_STATS.freeItems),
                  },
                  {
                    id: 'premium',
                    label: t.filterPremium(VAULT_STATS.premiumItems),
                  },
                ].map((f) => {
                  const active = tierFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        playUiTap(1);
                        setTierFilter(f.id as 'all' | 'free' | 'premium');
                      }}
                      className={`px-2 py-1 rounded-[7px] text-[10px] sm:text-[11px] font-bold transition truncate text-center ${
                        active
                          ? 'bg-[#2E2546] text-[#FFD54F] border border-[#FFD54F]/45'
                          : 'text-[#A8A3B8] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full h-[31px] pl-3 pr-7 rounded-[9px] bg-[#0E0D18] border border-[#2C2742] text-[11px] text-[#F4F1FF] placeholder-[#7D7894] focus:outline-none focus:border-[#B58BFF]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#A8A3B8] hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body Viewport */}
      <div className="flex-1 w-full overflow-y-scroll overscroll-contain px-3 sm:px-5 py-3.5 sm:py-4">
        <div className="max-w-5xl w-full mx-auto space-y-4 pb-10">
          {/* TAB 1: SKINS */}
          {activeTab === 'skins' && (
            <div className="space-y-3.5">
              <div className="p-3 sm:p-4 rounded-[20px] border border-[#443868] bg-gradient-to-b from-[#211D34] to-[#161524] space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPreviewLevelLocked) {
                          playMascotVoice(previewMascotLevel, false);
                        } else {
                          playUiTap(0);
                        }
                      }}
                      className="relative shrink-0 group focus:outline-none"
                      title={
                        isPreviewLevelLocked
                          ? t.reachLevelToUnlockSpecies(previewMascotLevel) : t.tapToHearBioVoice
                      }
                    >
                      <div className="animate-mascot-float">
                        <MascotAvatarSvg
                          level={previewMascotLevel}
                          size={76}
                          isLocked={isPreviewLevelLocked}
                          skinId={previewSkin.id}
                        />
                      </div>
                    </button>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          style={{
                            color: previewSkin.auraRingColor,
                            borderColor: `${previewSkin.auraRingColor}66`,
                          }}
                          className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-black/40"
                        >
                          {previewSkin.badge}
                        </span>
                        <span
                          className={`text-[10.5px] font-semibold ${
                            isPreviewLevelLocked
                              ? 'text-[#FFD54F]'
                              : 'text-[#C8C2D8]'
                          }`}
                        >
                          {isPreviewLevelLocked
                            ? `🔒 Nv. ${previewMascotLevel} · Especie Misteriosa (Tu Nv.: ${unlockedLevel})`
                            : `✓ Probando en Nv. ${previewMascotLevel} (${MASCOT_STAGE_NAMES[previewTier]})`}
                        </span>
                      </div>
                      <div className="text-[15px] sm:text-[18px] font-extrabold text-white leading-snug break-words">
                        {previewSkin.emoji} {previewSkin.name}
                      </div>
                      <div className="text-[11px] text-[#C8C2D8] leading-snug break-words">
                        {isPreviewLevelLocked
                          ? `🔒 Sube a Nivel ${previewMascotLevel} para desbloquear esta especie sin spoilers. Puedes apreciar el anillo exterior de «${previewSkin.name}» sobre su silueta.`
                          : previewSkin.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const isOwned =
                          isIndieFounder ||
                          previewSkin.gemCost === 0 ||
                          unlockedSkins.includes(previewSkin.id);

                        if (isOwned) {
                          onSelectSkin(previewSkin);
                        } else {
                          setItemToPurchase({
                            id: previewSkin.id,
                            name: previewSkin.name,
                            icon: previewSkin.emoji,
                            requiredGems: previewSkin.gemCost,
                            _type: 'skin',
                            _raw: previewSkin,
                          });
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-[#7549B8] to-[#9B6BFF] text-white text-xs font-extrabold hover:brightness-110 active:scale-95 transition shadow"
                    >
                      {equippedSkinId === previewSkin.id
                        ? '✓ Equipada actualmente'
                        : isIndieFounder ||
                          previewSkin.gemCost === 0 ||
                          unlockedSkins.includes(previewSkin.id)
                        ? '✨ Equipar ahora'
                        : `Desbloquear · 💎 ${previewSkin.gemCost}`}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#322B4B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-[#A8A3B8] leading-snug">
                    🎚️ Prueba <strong>{previewSkin.name}</strong> en tus niveles desbloqueados (1–{unlockedLevel}){' '}
                    <span className="text-[#9E97B0]">
                      · Nv. {Math.min(200, unlockedLevel + 1)}–200 protegidos contra spoilers 🔒
                    </span>
                  </span>
                  <div className="flex items-center gap-2 flex-1 sm:max-w-sm">
                    <input
                      type="range"
                      min={1}
                      max={200}
                      value={previewMascotLevel}
                      onChange={(e) => setPreviewMascotLevel(Number(e.target.value))}
                      className="w-full accent-[#B58BFF] cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewMascotLevel(unlockedLevel)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition shrink-0 ${
                        previewMascotLevel === unlockedLevel
                          ? 'bg-[#3C2F5A] text-[#FFD54F] border border-[#FFD54F]/40'
                          : 'bg-[#2B2540] text-[#D8C5FF] hover:text-white'
                      }`}
                    >
                      Mi Nv. ({unlockedLevel})
                    </button>
                  </div>
                </div>
              </div>

              {/* Skins Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredSkins.map((skin) => {
                  const isOwned =
                    isIndieFounder ||
                    skin.gemCost === 0 ||
                    unlockedSkins.includes(skin.id);
                  const isEquipped = equippedSkinId === skin.id;
                  const isPreviewing = previewSkinId === skin.id;

                  return (
                    <div
                      key={skin.id}
                      onClick={() => {
                        playUiTap(1);
                        setPreviewSkinId(skin.id);
                      }}
                      className={`p-3 rounded-[16px] border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isEquipped
                          ? 'bg-gradient-to-br from-[#272242] to-[#1B182E] border-[#82E59B]/70 shadow-[0_4px_16px_rgba(130,229,155,0.15)]'
                          : isPreviewing
                          ? 'bg-[#231F38] border-[#C7A4FF]'
                          : 'bg-[#171625] border-[#2C2840] hover:border-[#4D4270]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MascotAvatarSvg
                          level={previewMascotLevel}
                          size={54}
                          isLocked={isPreviewLevelLocked}
                          skinId={skin.id}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              style={{ color: skin.auraRingColor }}
                              className="text-[9px] font-extrabold uppercase"
                            >
                              {skin.badge}
                            </span>
                            {isEquipped ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#1C3829] text-[#82E59B]">
                                ACTIVA
                              </span>
                            ) : skin.gemCost === 0 ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#1F332B] text-[#9AF0AE]">
                                GRATIS
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[13px] font-bold text-[#F4F1FF] leading-snug break-words">
                            {skin.emoji} {skin.name}
                          </div>
                          <div className="text-[10px] text-[#A8A3B8] leading-snug break-words">
                            {skin.subtitle}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSkinId(skin.id);

                          if (isOwned) {
                            onSelectSkin(skin);
                          } else {
                            setItemToPurchase({
                              id: skin.id,
                              name: skin.name,
                              icon: skin.emoji,
                              requiredGems: skin.gemCost,
                              _type: 'skin',
                              _raw: skin,
                            });
                          }
                        }}
                        className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                          isEquipped
                            ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                            : isOwned
                            ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                            : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                        }`}
                      >
                        {isEquipped
                          ? '✓ Aura Equipada'
                          : isOwned
                          ? '✨ Equipar Aura'
                          : `Desbloquear · 💎 ${skin.gemCost}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CARDS & AUDIO */}
          {activeTab === 'cards_audio' && (
            <div className="space-y-3.5">
              <div
                key={liveEquippedNotice?.id || 'live-stage'}
                style={{
                  background: `linear-gradient(135deg, ${liveBannerPreset.startColor}, ${liveBannerPreset.endColor})`,
                  borderColor:
                    liveFrameCosmetic.id !== 'frame_default'
                      ? liveFrameCosmetic.borderColor
                      : `${liveAccentTheme.primary}99`,
                  boxShadow:
                    liveFrameCosmetic.id !== 'frame_default'
                      ? `0 10px 30px -6px rgba(8, 7, 16, 0.8), 0 0 24px -2px ${liveFrameCosmetic.glowColor}`
                      : `0 10px 28px -6px ${liveAccentTheme.glow}`,
                }}
                className="relative rounded-[20px] border-2 p-3.5 sm:p-4 overflow-hidden transition-all duration-300"
              >
                {liveBannerImg && (
                  <img
                    src={liveBannerImg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none select-none transition-all duration-500"
                  />
                )}
                <div
                  style={{ background: liveAccentTheme.vignetteGradient }}
                  className="absolute inset-0 pointer-events-none transition-all duration-500"
                />
                {liveFrameCosmetic.id !== 'frame_default' && (
                  <div
                    style={{ background: liveFrameCosmetic.overlayGradient }}
                    className="absolute inset-0 pointer-events-none transition-all duration-500"
                  />
                )}

                <div className="relative z-10 space-y-2.5">
                  {liveEquippedNotice && (
                    <div
                      style={{
                        borderColor: `${liveEquippedNotice.color}88`,
                        backgroundColor: 'rgba(16, 15, 28, 0.9)',
                      }}
                      className="px-3 py-2 rounded-[12px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">
                          {liveEquippedNotice.emoji}
                        </span>
                        <div className="min-w-0">
                          <div
                            style={{ color: liveEquippedNotice.color }}
                            className="text-xs font-extrabold leading-tight break-words"
                          >
                            {liveEquippedNotice.title}
                          </div>
                          <div className="text-[10px] text-[#E6E0F2] leading-tight break-words">
                            {liveEquippedNotice.subtitle}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onJumpToBoard}
                        style={{
                          backgroundColor: liveAccentTheme.primary,
                          color: liveAccentTheme.buttonText,
                        }}
                        className="px-3 py-1.5 rounded-[9px] text-[11px] font-extrabold shrink-0 hover:brightness-110 active:scale-95 transition shadow"
                      >
                        👁️ Ver en mi Tablero Principal →
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div
                        style={{
                          borderColor: liveAccentTheme.primary,
                          backgroundColor: liveAccentTheme.surfaceDark,
                          boxShadow: `0 0 14px ${liveAccentTheme.softBg}`,
                        }}
                        className="w-12 h-12 rounded-[15px] border flex items-center justify-center text-2xl shrink-0"
                      >
                        {currentObjective.icon || '🎯'}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            style={{
                              color: liveAccentTheme.primary,
                              backgroundColor: liveAccentTheme.softBg,
                              borderColor: `${liveAccentTheme.primary}66`,
                            }}
                            className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border"
                          >
                            VISTA EN VIVO DE TU TARJETA
                          </span>
                          <span
                            style={{
                              color: liveGuardianTitleItem.color,
                              borderColor: `${liveGuardianTitleItem.color}55`,
                            }}
                            className="px-2 py-0.5 rounded-full bg-black/45 border text-[9px] font-extrabold"
                          >
                            {liveGuardianTitleItem.emoji}{' '}
                            {liveGuardianTitleItem.title}
                          </span>
                        </div>

                        <div className="text-[16px] sm:text-[18px] font-extrabold text-white leading-snug break-words">
                          {currentObjective.title}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span
                            style={{
                              backgroundColor: liveAccentTheme.surfaceDark,
                              borderColor: `${liveAccentTheme.primary}55`,
                              color: liveAccentTheme.textSoft,
                            }}
                            className="px-2 py-0.5 rounded-md border font-bold"
                          >
                            🌈 Estilo:{' '}
                            {liveStyleItem
                              ? `${liveStyleItem.emoji} ${liveStyleItem.name}`
                              : `${liveAccentTheme.name} + ${liveBannerPreset.name}`}
                          </span>
                          <span
                            style={{
                              backgroundColor: liveAccentTheme.surfaceDark,
                              borderColor: `${liveFrameCosmetic.borderColor}66`,
                              color: liveFrameCosmetic.shimmerColor,
                            }}
                            className="px-2 py-0.5 rounded-md border font-bold"
                          >
                            🖼️ Marco: {liveFrameCosmetic.emoji}{' '}
                            {liveFrameCosmetic.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleAuditionSoundPack(liveSoundPackItem.id)
                            }
                            style={{
                              backgroundColor: liveAccentTheme.surfaceDark,
                              borderColor: `${liveSoundPackItem.accentColor}66`,
                              color: liveSoundPackItem.accentColor,
                            }}
                            className="px-2 py-0.5 rounded-md border font-bold hover:brightness-125 transition"
                            title="Toca para escuchar el Pack de Sonido activo"
                          >
                            🎵 Audio: {liveSoundPackItem.emoji}{' '}
                            {liveSoundPackItem.name} 🔊
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: liveAccentTheme.surfaceDark,
                        borderColor: `${liveAccentTheme.primary}45`,
                      }}
                      className="w-full sm:w-[215px] shrink-0 p-2.5 rounded-[13px] border space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          style={{ color: liveAccentTheme.textSoft }}
                          className="font-bold"
                        >
                          {formatObjectiveAmount(
                            currentObjective.currentAmount,
                            currentObjective
                          )}{' '}
                          /{' '}
                          {formatObjectiveAmount(
                            currentObjective.goalAmount,
                            currentObjective
                          )}
                        </span>
                        <span
                          style={{ color: liveAccentTheme.primary }}
                          className="font-mono-tabular font-extrabold"
                        >
                          {liveObjProgressPct}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-black/45 overflow-hidden border border-white/10">
                        <div
                          style={{
                            width: `${Math.max(12, liveObjProgressPct)}%`,
                            background:
                              liveFrameCosmetic.id !== 'frame_default'
                                ? `linear-gradient(90deg, ${liveFrameCosmetic.borderColor}, ${liveFrameCosmetic.shimmerColor})`
                                : `linear-gradient(90deg, ${liveAccentTheme.secondary}, ${liveAccentTheme.primary})`,
                          }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Category Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-[14px] bg-[#151423] border border-[#2E2946]">
                {[
                  {
                    id: 'frames',
                    label: `🖼️ Marcos & FX (${CARD_COSMETICS.length})`,
                    desc: 'Bordes y brillos de tarjeta',
                  },
                  {
                    id: 'sounds',
                    label: `🎵 Packs de 5 Sonidos (${SOUND_PACKS.length})`,
                    desc: t.acousticEnginesBadge(11),
                  },
                  {
                    id: 'styles',
                    label: t.tabThemesVault(CARD_STYLE_VAULT.length),
                    desc: 'Temas y paisajes',
                  },
                  {
                    id: 'titles',
                    label: t.tabTitlesVault(GUARDIAN_TITLES.length),
                    desc: 'Emblemas de perfil',
                  },
                ].map((sub) => {
                  const active = vaultSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        playUiTap(2);
                        setVaultSubTab(
                          sub.id as 'frames' | 'sounds' | 'styles' | 'titles'
                        );
                      }}
                      className={`p-2 rounded-[10px] text-left transition border ${
                        active
                          ? 'bg-[#2C2346] border-[#B58BFF] text-white shadow'
                          : 'bg-[#1A1829] border-transparent text-[#A8A3B8] hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] sm:text-xs font-extrabold truncate">
                        {sub.label}
                      </div>
                      <div className="text-[9px] text-[#9E97B0] truncate">
                        {sub.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SUB-TAB A: FRAMES */}
              {vaultSubTab === 'frames' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredFrames.map((frame) => {
                    const isOwned =
                      isIndieFounder ||
                      frame.gemCost === 0 ||
                      unlockedVaultIds.includes(frame.id);
                    const isEquipped = equippedCardFrameId === frame.id;

                    return (
                      <div
                        key={frame.id}
                        style={{
                          borderColor: isEquipped
                            ? '#82E59B'
                            : `${frame.borderColor}77`,
                          background: frame.overlayGradient,
                        }}
                        className="p-3 rounded-[16px] bg-[#171625] border flex flex-col justify-between gap-2.5 transition"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              style={{ color: frame.borderColor }}
                              className="text-[9px] font-extrabold uppercase tracking-wider"
                            >
                              {frame.badge}
                            </span>
                            <span
                              style={{
                                backgroundColor: `${frame.borderColor}25`,
                                borderColor: `${frame.borderColor}66`,
                                color: frame.shimmerColor,
                              }}
                              className="px-2 py-0.5 rounded-full border text-[9px] font-bold"
                            >
                              {frame.emoji} Vista Marco
                            </span>
                          </div>
                          <div className="text-[13px] font-extrabold text-white leading-snug">
                            {frame.emoji} {frame.name}
                          </div>
                          <p className="text-[10px] text-[#B8B2C8] leading-snug">
                            {frame.subtitle}
                          </p>
                          <div className="h-2 w-full rounded-full bg-[#11101B] overflow-hidden border border-white/10">
                            <div
                              style={{
                                width: '72%',
                                background: `linear-gradient(90deg, ${frame.borderColor}, ${frame.shimmerColor})`,
                              }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isOwned) {
                              onSelectCardCosmetic(frame);
                              setLiveEquippedNotice({
                                id: Date.now(),
                                emoji: frame.emoji,
                                title: t.equippedFrameNotice(frame.name),
                                subtitle: t.equippedFrameCardSub(currentObjective.title),
                                color: frame.borderColor,
                              });
                            } else {
                              setItemToPurchase({
                                id: frame.id,
                                name: frame.name,
                                icon: frame.emoji,
                                requiredGems: frame.gemCost,
                                _type: 'frame',
                                _raw: frame,
                              });
                            }
                          }}
                          className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                            isEquipped
                              ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                              : isOwned
                              ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                              : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                          }`}
                        >
                          {isEquipped
                            ? '✓ Marco Activo en Tarjeta'
                            : isOwned
                            ? '🖼️ Aplicar a mi Tarjeta'
                            : `Desbloquear · 💎 ${frame.gemCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SUB-TAB B: SOUNDS */}
              {vaultSubTab === 'sounds' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[13px] bg-[#161525] border border-[#342C50] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#D8D1E5]">
                    <div>
                      🎹 <strong>Cada Pack incluye 5 sonidos distintos</strong>{' '}
                      (Toque UI, +Sumar Avance, −Restar, 🎯 Misión y 🏆 Fanfarria).
                      Toca <strong>«🔊 Probar Pack»</strong> varias veces o toca cada botón 1–5 para escucharlos todos.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredSounds.map((snd) => {
                      const isOwned =
                        isIndieFounder ||
                        snd.gemCost === 0 ||
                        unlockedVaultIds.includes(snd.id);
                      const isEquipped = equippedSoundPackId === snd.id;
                      const auditionState = auditionedPackSteps[snd.id];

                      return (
                        <div
                          key={snd.id}
                          className={`p-3 rounded-[16px] border flex flex-col justify-between gap-2.5 transition ${
                            isEquipped
                              ? 'bg-gradient-to-br from-[#262140] to-[#19172B] border-[#82E59B]/70 shadow-[0_4px_16px_rgba(130,229,155,0.12)]'
                              : 'bg-[#171625] border-[#2C2840]'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span
                                style={{ color: snd.accentColor }}
                                className="text-[9px] font-extrabold uppercase tracking-wider"
                              >
                                {snd.badge} · {snd.scaleName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAuditionSoundPack(snd.id)}
                                className="px-2.5 py-1 rounded-md bg-[#2A2442] hover:bg-[#3A315A] text-[#FFE082] text-[10px] font-extrabold border border-[#6E5AA6] active:scale-95 transition flex items-center gap-1"
                                title="Toca varias veces para recorrer los 5 sonidos del pack"
                              >
                                <span>🔊</span>
                                <span>
                                  {auditionState
                                    ? `Sonando ${auditionState.stepLabel}`
                                    : 'Probar Pack (5 sonidos)'}
                                </span>
                              </button>
                            </div>

                            <div className="text-[13px] font-extrabold text-white leading-snug flex items-center justify-between gap-1">
                              <span>
                                {snd.emoji} {snd.name}
                              </span>
                            </div>

                            {snd.synthEngineLabel && (
                              <div className="text-[9px] font-bold text-[#C7A4FF]">
                                🎛️ Motor: {snd.synthEngineLabel}
                              </div>
                            )}

                            <p className="text-[10px] text-[#A8A3B8] leading-snug">
                              {snd.subtitle}
                            </p>

                            <div className="pt-1 grid grid-cols-5 gap-1">
                              {t.soundPackPads.map((padShort, padIdx) => {
                                const isPadActive =
                                  auditionState?.stepIndex === padIdx;
                                return (
                                  <button
                                    key={padIdx}
                                    type="button"
                                    onClick={() =>
                                      handleAuditionSoundPack(snd.id, padIdx)
                                    }
                                    title={t.soundPackAuditionTooltip(t.soundPackSteps[padIdx], snd.name)}
                                    style={
                                      isPadActive
                                        ? {
                                            borderColor: snd.accentColor,
                                            color: snd.accentColor,
                                          }
                                        : undefined
                                    }
                                    className={`py-1 px-1 rounded-[7px] text-[9px] font-extrabold border text-center transition active:scale-95 ${
                                      isPadActive
                                        ? 'bg-[#292240] shadow-sm'
                                        : 'bg-[#12111D] border-[#29253C] text-[#9E97B0] hover:text-white hover:border-[#4A416A]'
                                    }`}
                                  >
                                    {padShort}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isOwned) {
                                onSelectSoundPack(snd);
                                setLiveEquippedNotice({
                                  id: Date.now(),
                                  emoji: snd.emoji,
                                  title: t.soundPackActivatedNotice(snd.name),
                                  subtitle: `Motor ${snd.synthEngineLabel || snd.scaleName} activo en toda la app`,
                                  color: snd.accentColor,
                                });
                              } else {
                                setItemToPurchase({
                                  id: snd.id,
                                  name: snd.name,
                                  icon: snd.emoji,
                                  requiredGems: snd.gemCost,
                                  _type: 'sound',
                                  _raw: snd,
                                });
                              }
                            }}
                            className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                              isEquipped
                                ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                                : isOwned
                                ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                                : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                            }`}
                          >
                            {isEquipped
                              ? '✓ Pack de 5 Sonidos Activo'
                              : isOwned
                              ? '🎵 Equipar Pack de 5 Sonidos'
                              : `Desbloquear Pack (5 Sonidos) · 💎 ${snd.gemCost}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-TAB C: STYLES */}
              {vaultSubTab === 'styles' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredStyles.map((st) => {
                    const isOwned =
                      isIndieFounder ||
                      st.gemCost === 0 ||
                      unlockedVaultIds.includes(st.id);
                    const stTheme = findAccentTheme(st.accentColor);
                    const stPreset = findBannerPreset(st.bannerId);
                    const isCurrentStyle =
                      equippedCardStyleId === st.id ||
                      (liveAccentTheme.id === stTheme.id &&
                        activeBannerId.toLowerCase() ===
                          st.bannerId.toLowerCase());

                    return (
                      <div
                        key={st.id}
                        style={{
                          borderColor: isCurrentStyle
                            ? '#82E59B'
                            : `${st.accentColor}77`,
                        }}
                        className={`p-3 rounded-[16px] bg-[#171625] border flex flex-col justify-between gap-2.5 transition ${
                          isCurrentStyle
                            ? 'shadow-[0_4px_18px_rgba(130,229,155,0.18)]'
                            : ''
                        }`}
                      >
                        <div className="space-y-2">
                          <div
                            style={{
                              background: `linear-gradient(135deg, ${stPreset.startColor}, ${stPreset.endColor})`,
                              borderColor: `${st.accentColor}66`,
                            }}
                            className="h-10 rounded-[11px] border px-2.5 flex items-center justify-between relative overflow-hidden"
                          >
                            <span className="relative z-10 text-[10px] font-extrabold text-white drop-shadow flex items-center gap-1">
                              <span>{stPreset.emoji}</span>
                              <span>{stPreset.name}</span>
                            </span>
                            <div className="relative z-10 flex items-center gap-1">
                              <span
                                style={{ backgroundColor: st.accentColor }}
                                className="w-3.5 h-3.5 rounded-full inline-block border border-white/40 shadow"
                              />
                              <span
                                style={{
                                  backgroundColor: st.previewColorSecondary,
                                }}
                                className="w-3.5 h-3.5 rounded-full inline-block border border-white/40 shadow"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span
                              style={{ color: st.accentColor }}
                              className="text-[9px] font-extrabold uppercase"
                            >
                              {st.badge}
                            </span>
                            {isCurrentStyle && (
                              <span className="px-1.5 py-0.2 rounded bg-[#1E3B2E] text-[#82E59B] text-[9px] font-extrabold">
                                ACTIVO EN TU TARJETA
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] font-extrabold text-white leading-snug">
                            {st.emoji} {st.name}
                          </div>
                          <p className="text-[10px] text-[#A8A3B8] leading-snug">
                            {st.subtitle}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isOwned) {
                              onApplyVaultCardStyle(st);
                              setLiveEquippedNotice({
                                id: Date.now(),
                                emoji: st.emoji,
                                title: `¡Estilo "${st.name}" aplicado en vivo!`,
                                subtitle: t.themeAppliedNotice(currentObjective.title),
                                color: st.accentColor,
                              });
                            } else {
                              setItemToPurchase({
                                id: st.id,
                                name: st.name,
                                icon: st.emoji,
                                requiredGems: st.gemCost,
                                _type: 'style',
                                _raw: st,
                              });
                            }
                          }}
                          className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                            isCurrentStyle
                              ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                              : isOwned
                              ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                              : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                          }`}
                        >
                          {isCurrentStyle
                            ? '✓ Estilo Aplicado en Tarjeta'
                            : isOwned
                            ? '🌈 Aplicar Sintonía Ahora'
                            : `Desbloquear · 💎 ${st.gemCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SUB-TAB D: TITLES */}
              {vaultSubTab === 'titles' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredTitles.map((tItem) => {
                    const isOwned =
                      isIndieFounder ||
                      tItem.gemCost === 0 ||
                      unlockedVaultIds.includes(tItem.id);
                    const isEquipped = equippedTitleId === tItem.id;

                    return (
                      <div
                        key={tItem.id}
                        className={`p-3 rounded-[16px] border flex flex-col justify-between gap-2.5 ${
                          isEquipped
                            ? 'bg-[#241F3B] border-[#82E59B]/70'
                            : 'bg-[#171625] border-[#2C2840]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              style={{ color: tItem.color }}
                              className="text-[9px] font-extrabold uppercase"
                            >
                              {tItem.badge}
                            </span>
                            {isEquipped && (
                              <span className="text-[9px] font-extrabold text-[#82E59B]">
                                EN USO
                              </span>
                            )}
                          </div>
                          <div
                            style={{ color: tItem.color }}
                            className="text-[13px] font-extrabold leading-snug"
                          >
                            {tItem.emoji} {tItem.title}
                          </div>
                          <p className="text-[10px] text-[#A8A3B8] leading-snug">
                            {tItem.subtitle}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isOwned) {
                              onSelectGuardianTitle(tItem);
                              setLiveEquippedNotice({
                                id: Date.now(),
                                emoji: tItem.emoji,
                                title: `¡Título "${tItem.title}" equipado en vivo!`,
                                subtitle: `Ya luce junto a tu nombre arriba y en la cabecera principal`,
                                color: tItem.color,
                              });
                            } else {
                              setItemToPurchase({
                                id: tItem.id,
                                name: tItem.title,
                                icon: tItem.emoji,
                                requiredGems: tItem.gemCost,
                                _type: 'title',
                                _raw: tItem,
                              });
                            }
                          }}
                          className={`w-full h-[35px] rounded-[10px] text-[11px] font-extrabold transition ${
                            isEquipped
                              ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                              : isOwned
                              ? 'bg-[#32284E] text-white hover:bg-[#413465]'
                              : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110'
                          }`}
                        >
                          {isEquipped
                            ? '✓ Título Equipado'
                            : isOwned
                            ? '🏅 Equipar Título'
                            : `Desbloquear · 💎 ${tItem.gemCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUFFS */}
          {activeTab === 'buffs' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-[13px] bg-[#181726] border border-[#2E2944] flex items-center justify-between">
                  <span className="text-[11px] text-[#C8C2D8]">
                    🛡️ Escudos de Racha:
                  </span>
                  <span className="text-xs font-mono-tabular font-extrabold text-[#64D8FF]">
                    {streakShields} en inventario
                  </span>
                </div>
                <div className="p-2.5 rounded-[13px] bg-[#181726] border border-[#2E2944] flex items-center justify-between">
                  <span className="text-[11px] text-[#C8C2D8]">
                    🧪 Impulso ×1.5 XP:
                  </span>
                  <span className="text-xs font-mono-tabular font-extrabold text-[#B58BFF]">
                    {isXpBoostActive ? `Activo (${xpBoostRemainingText})` : 'Inactivo'}
                  </span>
                </div>
                <div className="p-2.5 rounded-[13px] bg-[#181726] border border-[#2E2944] flex items-center justify-between">
                  <span className="text-[11px] text-[#C8C2D8]">
                    🧲 Cosechador ×2 💎:
                  </span>
                  <span className="text-xs font-mono-tabular font-extrabold text-[#82E59B]">
                    {isGemMagnetActive
                      ? `Activo (${gemMagnetRemainingText})`
                      : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredBuffs.map((buff) => {
                  const isFreeBlessing = buff.kind === 'free_blessing';
                  const isRelic = buff.kind === 'relic';
                  const isClaimedOrOwned =
                    (isFreeBlessing || isRelic) &&
                    unlockedVaultIds.includes(buff.id);
                  const levelLocked =
                    isFreeBlessing && (buff.requiredLevel || 1) > level;

                  return (
                    <div
                      key={buff.id}
                      className={`p-3.5 rounded-[16px] border flex flex-col justify-between gap-3 ${
                        isClaimedOrOwned
                          ? 'bg-[#182422] border-[#65DB85]/50'
                          : 'bg-[#171625] border-[#2E2944]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          style={{
                            borderColor: `${buff.accentColor}55`,
                            backgroundColor: '#221E35',
                          }}
                          className="w-12 h-12 rounded-[13px] border flex items-center justify-center text-2xl shrink-0"
                        >
                          {buff.icon}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span
                            style={{ color: buff.accentColor }}
                            className="text-[9px] font-extrabold uppercase tracking-wider"
                          >
                            {buff.badgeText}
                          </span>
                          <div className="text-[14px] font-bold text-[#F4F1FF] leading-snug break-words">
                            {buff.name}
                          </div>
                          <div className="text-[11px] text-[#A8A3B8] leading-snug break-words">
                            {buff.description}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isClaimedOrOwned || buff.gemCost === 0) {
                            onActivateBuff(buff);
                          } else {
                            setItemToPurchase({
                              id: buff.id,
                              name: buff.name,
                              icon: buff.icon,
                              requiredGems: buff.gemCost,
                              _type: 'buff',
                              _raw: buff,
                            });
                          }
                        }}
                        className={`w-full h-[38px] rounded-[11px] text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow ${
                          isClaimedOrOwned
                            ? 'bg-[#1E3B2E] text-[#82E59B] border border-[#65DB85]/40'
                            : levelLocked
                            ? 'bg-[#232033] text-[#8E88A6] border border-[#35304C]'
                            : buff.gemCost === 0
                            ? 'bg-gradient-to-r from-[#2E7D32] to-[#65DB85] text-[#0E2214] hover:brightness-110'
                            : 'bg-gradient-to-r from-[#653CA6] to-[#8C5CE0] text-white hover:brightness-110 active:scale-95'
                        }`}
                      >
                        {isClaimedOrOwned
                          ? isRelic
                            ? '✓ Reliquia en tu Santuario'
                            : '✓ Bendición Reclamada'
                          : levelLocked
                          ? t.requiresGuardianLevel(buff.requiredLevel ?? 1)
                          : buff.gemCost === 0
                          ? `🎁 Reclamar Gratis (${buff.subtitle})`
                          : `Activar · 💎 ${buff.gemCost}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SUPPORT */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-[#2D1B4E] via-[#20183A] to-[#121024] border-2 border-[#FFD54F]/70 shadow-[0_10px_35px_rgba(255,213,79,0.22)] relative overflow-hidden space-y-3.5">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#FFD54F]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#9B6BFF]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 relative z-10">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-[#FFD54F] text-[#191124] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <span>🚀</span>
                        <span>{t.launchOfferBannerBadge}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FF477E]/25 border border-[#FF477E]/60 text-[#FF85A1] text-[10px] font-black flex items-center gap-1 animate-pulse">
                        <span>🔥</span>
                        <span>{t.launchMaxDiscount}</span>
                      </span>
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      {t.launchOfferBannerTitle}
                    </h3>
                    <p className="text-[11px] sm:text-[12px] text-[#DDD6EE] max-w-2xl leading-relaxed">
                      {t.launchOfferBannerSub}
                    </p>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-[16px] bg-[#141026]/90 border border-[#FFD54F]/40 shadow-inner flex flex-col items-center sm:items-end shrink-0">
                    <div className="text-[10px] font-black text-[#FFD54F] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#65DB85] animate-ping" />
                      <span>{t.launchTimerLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-center font-mono-tabular">
                      <div className="px-2 py-1 rounded-[8px] bg-[#241B3D] border border-white/10 min-w-[38px]">
                        <div className="text-sm sm:text-base font-black text-white">{String(launchTimeLeft.days).padStart(2, '0')}</div>
                        <div className="text-[9px] text-[#A8A3B8] font-bold">{t.daysShort}</div>
                      </div>
                      <span className="text-[#FFD54F] font-bold text-xs">:</span>
                      <div className="px-2 py-1 rounded-[8px] bg-[#241B3D] border border-white/10 min-w-[38px]">
                        <div className="text-sm sm:text-base font-black text-white">{String(launchTimeLeft.hours).padStart(2, '0')}</div>
                        <div className="text-[9px] text-[#A8A3B8] font-bold">{t.hoursShort}</div>
                      </div>
                      <span className="text-[#FFD54F] font-bold text-xs">:</span>
                      <div className="px-2 py-1 rounded-[8px] bg-[#241B3D] border border-white/10 min-w-[38px]">
                        <div className="text-sm sm:text-base font-black text-white">{String(launchTimeLeft.minutes).padStart(2, '0')}</div>
                        <div className="text-[9px] text-[#A8A3B8] font-bold">{t.minsShort}</div>
                      </div>
                      <span className="text-[#FFD54F] font-bold text-xs">:</span>
                      <div className="px-2 py-1 rounded-[8px] bg-[#241B3D] border border-white/10 min-w-[38px]">
                        <div className="text-sm sm:text-base font-black text-[#FFD54F]">{String(launchTimeLeft.seconds).padStart(2, '0')}</div>
                        <div className="text-[9px] text-[#A8A3B8] font-bold">{t.secsShort}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10 text-[10px] sm:text-[11px] text-[#CFC7E5] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#65DB85]">✓</span>
                    <span>{t.launchPerk1}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#FFD54F]">✓</span>
                    <span>{t.launchPerk2}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#64D8FF]">✓</span>
                    <span>{t.launchPerk3}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#FF85A1]">✓</span>
                    <span>{t.launchPerk4}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-[18px] bg-gradient-to-r from-[#241D38] via-[#1E1B30] to-[#1A2826] border border-[#56447E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[12px] bg-[#2E2448] border border-[#B58BFF]/40 flex items-center justify-center text-xl shrink-0">
                    ❤️
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-[#E6E0F2] leading-relaxed break-words">
                    <strong>De un Desarrollador Indie para ti:</strong> Construí{' '}
                    <span className="text-[#FFD54F] font-bold">Objective Reacher</span>{' '}
                    con dedicación artesanal para ayudarte a cumplir tus metas. Puedes jugar y ganar{' '}
                    <strong className="text-[#9AF0AE]">💎 Gemas gratis</strong> todos los días, o apoyar el proyecto mediante nuestra{' '}
                    <strong className="text-[#64D8FF]">Pasarela Dual (Mercado Pago en ARS/LatAm o PayPal / Google Pay Global)</strong>.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-[18px] bg-[#161524] border border-[#3B315A] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#C7A4FF]">
                      🌐 PASARELA DE PAGO DUAL · ELIGE TU MÉTODO PREFERIDO
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      Selecciona cómo prefieres abonar tu Pack o Propina:
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1F1B33] border border-[#53427E] text-[10px] font-bold text-[#9AF0AE] self-start sm:self-auto">
                    {selectedGateway === 'mercadopago'
                      ? gatewayConfigStatus.mpReady
                        ? '🟢 Mercado Pago API Activa'
                        : '🛠️ Mercado Pago (Modo Placeholder Local)'
                      : gatewayConfigStatus.globalReady
                      ? '🟢 PayPal / Google Pay Activo'
                      : '🛠️ PayPal / Google Pay (Modo Placeholder Local)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(2);
                      setSelectedGateway('mercadopago');
                    }}
                    className={`p-3 rounded-[14px] border text-left transition flex items-start gap-3 ${
                      selectedGateway === 'mercadopago'
                        ? 'bg-gradient-to-r from-[#14304B] to-[#1A263D] border-[#00B1EA] shadow-[0_4px_18px_rgba(0,177,234,0.22)]'
                        : 'bg-[#12111D] border-[#2A263D] hover:border-[#494069]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[11px] bg-[#009EE3]/20 border border-[#00B1EA]/50 flex items-center justify-center text-xl shrink-0">
                      🤝
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          Mercado Pago (LatAm / ARS)
                        </span>
                        {selectedGateway === 'mercadopago' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#009EE3] text-white text-[9px] font-extrabold">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#B8D4E8] mt-0.5 leading-snug">
                        Dinero en cuenta MP, Transferencia, Débito y Crédito en pesos (~${mpArsRate} ARS/USD ref).
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(2);
                      setSelectedGateway('paypal_googlepay');
                    }}
                    className={`p-3 rounded-[14px] border text-left transition flex items-start gap-3 ${
                      selectedGateway === 'paypal_googlepay'
                        ? 'bg-gradient-to-r from-[#241E46] to-[#1C1936] border-[#FFD54F] shadow-[0_4px_18px_rgba(255,213,79,0.18)]'
                        : 'bg-[#12111D] border-[#2A263D] hover:border-[#494069]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[11px] bg-[#FFD54F]/15 border border-[#FFD54F]/50 flex items-center justify-center text-xl shrink-0">
                      🌍
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          PayPal · Google Pay · Tarjetas (USD)
                        </span>
                        {selectedGateway === 'paypal_googlepay' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#FFD54F] text-[#181226] text-[9px] font-extrabold">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#D8C5FF] mt-0.5 leading-snug">
                        Checkout internacional en USD con PayPal, billetera Google Pay y tarjetas globales.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tip Card */}
              <div className="p-3.5 sm:p-5 rounded-[20px] bg-gradient-to-b from-[#231D38] to-[#171526] border-2 border-[#8C5CE0] shadow-[0_8px_28px_rgba(140,92,224,0.2)] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#352656] text-[#FFD54F] border border-[#FFD54F]/40">
                      {t.freeTipTag}
                    </span>
                    <h3 className="text-[15px] sm:text-[18px] font-extrabold text-white mt-1 leading-snug">
                      {t.tipCardTitle}
                    </h3>
                    <p className="text-[11px] text-[#C8C2D8] leading-snug">
                      {t.tipCardSubtitle}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto px-3 py-2 rounded-[13px] bg-[#141222] border border-[#493A6E] flex sm:block items-center justify-between gap-2 text-left sm:text-right shrink-0">
                    <div className="text-[10px] text-[#A8A3B8]">
                      {t.tipGratitudeReward}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-mono-tabular font-extrabold text-[#9AF0AE]">
                        +{tipRewardGems} 💎 · +{tipRewardShields} 🛡️
                      </div>
                      {tipUnlocksFounder && (
                        <div className="text-[10px] font-extrabold text-[#FFD54F]">
                          {t.tipFounderIncluded}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {t.tipPresets.map((preset) => {
                    const isSelected =
                      !isCustomTipEditing &&
                      Math.abs(parsedTipUsd - Number(preset.amount)) < 0.01;
                    return (
                      <button
                        key={preset.amount}
                        type="button"
                        onClick={() => {
                          playUiTap(2);
                          setIsCustomTipEditing(false);
                          setTipAmountText(preset.amount);
                        }}
                        className={`p-3 rounded-[14px] border text-center transition active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-[#3A2B60] border-[#FFD54F] text-white shadow-[0_0_14px_rgba(255,213,79,0.25)]'
                            : 'bg-[#161524] border-[#2E2946] text-[#C8C2D8] hover:border-[#65499C]'
                        }`}
                      >
                        <div className="text-sm font-mono-tabular font-extrabold text-white">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-[#FFD54F] font-semibold">
                          {preset.tag}
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      playUiTap(3);
                      setIsCustomTipEditing(true);
                      window.setTimeout(() => {
                        tipCustomInputRef.current?.focus();
                        tipCustomInputRef.current?.select();
                      }, 40);
                    }}
                    className={`col-span-2 sm:col-span-4 p-2.5 rounded-[12px] border text-center transition ${
                      isCustomTipEditing
                        ? 'bg-[#3A2B60] border-[#82E59B] text-white shadow'
                        : 'bg-[#161524] border-[#2E2946] text-[#C8C2D8] hover:border-[#82E59B]'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-extrabold text-[#82E59B]">
                      {t.tipCustomAmountBtn}
                    </div>
                    <div className="text-[10px] text-[#A8A3B8]">
                      {t.tipCustomAmountSub}
                    </div>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-[14px] bg-[#12111E] border border-[#2F2947]">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => adjustTipBy(-0.5)}
                      className="w-10 h-10 rounded-[10px] bg-[#25203B] hover:bg-[#332C50] text-white font-extrabold text-base border border-[#443968] transition shrink-0"
                    >
                      −
                    </button>
                    <div className="relative flex items-center flex-1 sm:flex-initial">
                      <span className="absolute left-3 text-sm font-extrabold text-[#FFD54F]">
                        $
                      </span>
                      <input
                        ref={tipCustomInputRef}
                        type="number"
                        min="0.50"
                        max="500"
                        step="0.50"
                        value={tipAmountText}
                        onFocus={() => setIsCustomTipEditing(true)}
                        onChange={(e) => setTipAmountText(e.target.value)}
                        aria-label={t.tipInputAria}
                        className="w-full sm:w-[130px] h-10 pl-7 pr-11 rounded-[10px] bg-[#1B182C] border border-[#65499C] text-white font-mono-tabular font-extrabold text-sm text-center sm:text-left focus:outline-none focus:border-[#FFD54F]"
                      />
                      <span className="absolute right-2.5 text-[10px] font-bold text-[#A8A3B8]">
                        USD
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustTipBy(0.5)}
                      className="w-10 h-10 rounded-[10px] bg-[#25203B] hover:bg-[#332C50] text-white font-extrabold text-base border border-[#443968] transition shrink-0"
                    >
                      ＋
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onCustomTipSupport(
                        Math.max(0.5, parsedTipUsd),
                        selectedGateway
                      )
                    }
                    className={`flex-1 min-h-[44px] py-2 px-3.5 rounded-[11px] text-xs sm:text-sm font-extrabold hover:brightness-110 active:scale-95 transition shadow flex items-center justify-center flex-wrap gap-1.5 text-center leading-tight ${
                      selectedGateway === 'mercadopago'
                        ? 'bg-gradient-to-r from-[#009EE3] to-[#00C4FF] text-[#051824]'
                        : 'bg-gradient-to-r from-[#65DB85] to-[#26E6A6] text-[#0D2116]'
                    }`}
                  >
                    <span>
                      {selectedGateway === 'mercadopago'
                        ? t.payMpTipBtn(
                            Math.max(0.5, parsedTipUsd).toFixed(2),
                            Math.round(Math.max(0.5, parsedTipUsd) * mpArsRate).toLocaleString(
                              appLanguage === 'es' ? 'es-AR' : 'en-US'
                            ),
                            tipRewardGems
                          )
                        : t.payPaypalTipBtn(
                            Math.max(0.5, parsedTipUsd).toFixed(2),
                            tipRewardGems
                          )}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] font-mono-tabular shrink-0">
                      +{tipRewardGems} 💎
                    </span>
                  </button>
                </div>
              </div>

              {/* Support Packs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {INDIE_SUPPORT_PACKS.map((pack) => {
                  const isFounderPack =
                    pack.id === 'pack_founder' ||
                    pack.id === 'pack_bundle_ultimate';
                  const alreadyFounder = isFounderPack && isIndieFounder;
                  const estimatedArs = Math.round(
                    pack.usdNumeric * mpArsRate
                  ).toLocaleString('es-AR');

                  return (
                    <div
                      key={pack.id}
                      style={{
                        borderColor: isFounderPack
                          ? '#FFD54F'
                          : `${pack.highlightColor}66`,
                      }}
                      className={`p-4 rounded-[18px] border flex flex-col justify-between gap-3 relative overflow-hidden transition-all ${
                        isFounderPack
                          ? 'bg-gradient-to-b from-[#2A223A] via-[#1F1A30] to-[#181526] shadow-[0_8px_26px_rgba(255,213,79,0.16)]'
                          : 'bg-[#171625]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1.5">
                          <span
                            style={{ color: pack.highlightColor }}
                            className="text-[10px] font-black uppercase tracking-wider leading-tight"
                          >
                            {pack.badge}
                          </span>
                          {pack.discountPct && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#FF477E]/25 border border-[#FF477E]/60 text-[#FF85A1] text-[9px] font-black shrink-0">
                              -{pack.discountPct}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-2.5">
                          <span className="text-2xl shrink-0 mt-0.5">{pack.emoji}</span>
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-black text-white leading-snug">
                              {pack.title}
                            </h4>
                            <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                              {pack.regularUsdPrice && (
                                <span className="text-[11px] line-through text-[#9A93AA] font-mono-tabular">
                                  {pack.regularUsdPrice}
                                </span>
                              )}
                              <span className="text-xs font-mono-tabular font-black text-[#FFD54F]">
                                {pack.usdPrice}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#9AF0AE] font-semibold mt-0.5">
                              {selectedGateway === 'mercadopago'
                                ? `Mercado Pago: ~$${estimatedArs} ARS`
                                : 'PayPal · Google Pay · Tarjetas'}
                            </p>
                          </div>
                        </div>

                        {pack.savingsUsd && (
                          <div className="px-2 py-1 rounded-[8px] bg-[#142A1E] border border-[#65DB85]/30 text-[10px] font-extrabold text-[#82E59B] flex items-center gap-1">
                            <span>💸</span>
                            <span>{pack.savingsUsd}</span>
                          </div>
                        )}

                        <p className="text-[11px] text-[#D8D1E5] leading-snug">
                          {pack.subtitle}
                        </p>

                        <ul className="space-y-1 pt-1">
                          {pack.perks.map((perk, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-[#E6E0F2] leading-snug flex items-start gap-1.5"
                            >
                              <span className="leading-snug">{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={alreadyFounder}
                        onClick={() => onPurchasePack(pack, selectedGateway)}
                        style={{
                          background: alreadyFounder
                            ? '#1E3B2E'
                            : selectedGateway === 'mercadopago' && !isFounderPack
                            ? 'linear-gradient(90deg, #008AD6, #00B1EA)'
                            : isFounderPack
                            ? 'linear-gradient(90deg, #E5B945, #FFD54F)'
                            : 'linear-gradient(90deg, #7549B8, #9B6BFF)',
                          color: alreadyFounder
                            ? '#82E59B'
                            : isFounderPack
                            ? '#191324'
                            : '#FFFFFF',
                        }}
                        className="w-full min-h-[42px] py-2 px-3 rounded-[12px] text-xs font-black hover:brightness-110 active:scale-95 disabled:opacity-70 transition shadow leading-tight cursor-pointer"
                      >
                        {alreadyFounder
                          ? t.activeFounderBtn
                          : selectedGateway === 'mercadopago'
                          ? t.payWithMercadoPago(pack.usdPrice)
                          : t.payWithPaypal(pack.usdPrice)}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* License Restore */}
              <div className="p-4 rounded-[18px] bg-[#141322] border border-[#382F54] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFD54F]">
                      🔑 RESPALDO CRIPTOGRÁFICO PRO · WEB & ANDROID
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      Código de Recuperación de Compras (Sin cuentas ni contraseñas)
                    </h4>
                    <p className="text-[11px] text-[#A8A3B8]">
                      Cada compra en Web o Android genera un código firmado con HMAC (`OR-PRO-...`). Guárdalo para restaurar tus Gemas o tu Pase Fundador si cambias de teléfono o usas la versión Web.
                    </p>
                  </div>
                </div>

                {lastIssuedLicenseCode && (
                  <div className="p-3 rounded-[12px] bg-[#1D1930] border border-[#65DB85]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#82E59B]">
                        ✓ Tu último Código de Respaldo PRO emitido:
                      </div>
                      <div className="text-xs font-mono-tabular text-white break-all select-all mt-0.5">
                        {lastIssuedLicenseCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(lastIssuedLicenseCode);
                        setCopiedCodeNotice(true);
                        window.setTimeout(() => setCopiedCodeNotice(false), 2200);
                      }}
                      className="px-3 py-1.5 rounded-[9px] bg-[#2B4238] text-[#9AF0AE] text-[11px] font-extrabold hover:brightness-110 shrink-0"
                    >
                      {copiedCodeNotice ? t.codeCopiedBtn : t.copyCodeBtn}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={licenseInputText}
                    onChange={(e) => {
                      setLicenseInputText(e.target.value);
                      setLicenseFeedback(null);
                    }}
                    placeholder={t.licenseInputPlaceholder}
                    className="flex-1 h-10 px-3 rounded-[10px] bg-[#0E0D18] border border-[#2F2947] text-xs text-white font-mono-tabular placeholder-[#6E6885] focus:outline-none focus:border-[#FFD54F]"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await onRedeemLicenseCode(licenseInputText);
                      setLicenseFeedback(res);
                      if (res.ok) {
                        setLicenseInputText('');
                      }
                    }}
                    className="h-10 px-4 rounded-[10px] bg-[#342A52] hover:bg-[#45376B] border border-[#7559B8] text-white text-xs font-extrabold transition shrink-0"
                  >
                    🔓 Restaurar / Canjear Código
                  </button>
                </div>

                {licenseFeedback && (
                  <div
                    className={`text-[11px] font-bold px-3 py-2 rounded-[9px] ${
                      licenseFeedback.ok
                        ? 'bg-[#193328] text-[#82E59B] border border-[#65DB85]/40'
                        : 'bg-[#3A1D28] text-[#FF8A80] border border-[#FF5252]/40'
                    }`}
                  >
                    {licenseFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

     {/* Modal de confirmación de compra con gemas */}
      <PurchaseConfirmModal
        item={itemToPurchase}
        userGems={gems}
        onClose={() => setItemToPurchase(null)}
        onConfirm={handleConfirmPurchase}
        onOpenShop={() => {
          setItemToPurchase(null); // Cierra este modal de confirmación
          
          // Redirige a la pestaña de compra de gemas / apoyo
          if (typeof setActiveTab === 'function') {
            setActiveTab('support'); // O 'gems' / 'store' según las pestañas de tu tienda
          }
        }}
      />
    </div>
  );
}