import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { TRANSLATIONS, loadAppLanguage } from "../../i18n";
import { findMascotSkin } from "../../monetization";
import { playMascotVoice, playUiTap } from "../../soundEffects";
import { MascotAvatarSvg } from "./MascotAvatarSvg";
import { MascotGridCard } from "./MascotGridCard";

const { MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

export function MascotGalleryModal({
  initialLevel,
  initialPreviewLevel,
  skinId = 'default',
  onOpenSkins,
  onClose,
}: {
  initialLevel: number;
  initialPreviewLevel?: number;
  skinId?: string;
  onOpenSkins?: () => void;
  onClose: () => void;
}) {
  const t = TRANSLATIONS[loadAppLanguage()] || TRANSLATIONS.es;
  const unlockedLevel = Math.max(1, initialLevel);
  const [previewLevel, setPreviewLevel] = useState<number>(() =>
    Math.min(200, Math.max(1, initialPreviewLevel ?? unlockedLevel))
  );

  const tier = Math.floor((previewLevel - 1) / 10);
  const subLevel = ((previewLevel - 1) % 10) + 1;
  const isPreviewLocked = previewLevel > unlockedLevel;
  const activeSkin = findMascotSkin(skinId);

  return (
    <div className="fixed inset-0 z-50 bg-[#11121C] flex flex-col pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.4rem))] pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.4rem))] px-3 sm:p-[18px] overflow-hidden">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-2.5 sm:gap-3 min-h-0">
        {/* Header — Responsive 2-Row Structure so Buttons Never Crush Title on Mobile Portrait */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A182B] border border-[#3B3258] text-[10px] font-extrabold uppercase tracking-wider">
              <span>🎯</span>
              <span className="text-[#F4F1FF]">OBJECTIVE</span>
              <span className="text-[#82E59B]">REACHER</span>
              <span className="text-[#C7A4FF]">· CÓDICE</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenSkins && (
                <button
                  onClick={onOpenSkins}
                  className="px-2.5 py-1.5 rounded-[10px] bg-[#28203F] border border-[#65499C] text-[#E6D9FF] text-xs font-extrabold hover:border-[#FFD54F] transition"
                >
                  {activeSkin.emoji} Skins
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-[10px] bg-[#302747] text-[#F4F1FF] text-xs sm:text-sm font-bold hover:bg-[#3e335c] shrink-0"
              >
                ← Volver
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
            <h2 className="text-[16px] sm:text-[20px] font-extrabold text-[#F4F1FF] leading-tight">
              🐾 Códice de Mascotas (1–200)
            </h2>
            <p className="text-[11px] sm:text-[12px] text-[#A8A3B8] leading-snug">
              Desbloqueado hasta <strong>Nv. {unlockedLevel}</strong> · Toca una criatura desbloqueada para escuchar su voz.
            </p>
          </div>
        </div>

        {/* Interactive Slider Preview (Portrait-friendly layout) */}
        <div className="p-2.5 sm:p-3.5 rounded-[18px] border border-[#342D4B] bg-gradient-to-b from-[#1E1C2E] to-[#171624] flex items-center gap-2.5 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!isPreviewLocked) {
                playMascotVoice(previewLevel, false);
              } else {
                playUiTap(0);
              }
            }}
            title={
              isPreviewLocked
                ? t.creatureLockedYet
                : 'Toca para escuchar la voz sintetizada de esta especie'
            }
            className="shrink-0 relative group focus:outline-none"
          >
            <div className="animate-mascot-float">
              <MascotAvatarSvg
                level={previewLevel}
                size={68}
                isLocked={isPreviewLocked}
                skinId={skinId}
              />
            </div>
            {!isPreviewLocked && (
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#262238] border border-[#51436C] text-[9px] font-bold text-[#D8C5FF] group-hover:scale-105 transition">
                🔊 Voz
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="text-[13px] sm:text-[16px] font-bold text-[#D8C5FF] leading-tight break-words">
                {isPreviewLocked
                  ? `🔒 Nivel ${previewLevel} · Criatura Misteriosa`
                  : `✨ Nivel ${previewLevel} · ${MASCOT_STAGE_NAMES[tier]}`}
              </div>
              <span className="text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[#302747] text-[#E6D9FF] whitespace-nowrap shrink-0">
                Etapa {tier + 1}/20 · Evol. {subLevel}/10{' '}
                {isPreviewLocked ? '🔒' : '✓'}
              </span>
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-[#C7A4FF] leading-snug break-words">
              {isPreviewLocked
                ? `Pista (Nv. ${previewLevel}): ${MASCOT_STAGE_HINTS[tier]}`
                : MASCOT_STAGE_HINTS[tier]}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] font-mono-tabular text-[#88839E] shrink-0">
                1
              </span>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={previewLevel}
                onInput={(e) =>
                  setPreviewLevel(Number((e.target as HTMLInputElement).value))
                }
                onChange={(e) => setPreviewLevel(Number(e.target.value))}
                className="w-full h-5 accent-[#B58BFF] cursor-grab active:cursor-grabbing touch-none"
              />
              <span className="text-[10px] font-mono-tabular text-[#88839E] shrink-0">
                200
              </span>
            </div>
          </div>
        </div>

        {/* Grid of all 200 Mini-Images */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 pr-1">
          {Array.from({ length: 200 }, (_, idx) => {
            const lvl = idx + 1;
            const itemTier = Math.floor((lvl - 1) / 10);
            return (
              <MascotGridCard
                key={lvl}
                lvl={lvl}
                itemTier={itemTier}
                isSelected={lvl === previewLevel}
                isItemLocked={lvl > unlockedLevel}
                skinId={skinId}
                onSelect={(selectedLvl) => {
                  setPreviewLevel(selectedLvl);
                  if (selectedLvl <= unlockedLevel) {
                    playMascotVoice(selectedLvl, false);
                  } else {
                    playUiTap(0);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
