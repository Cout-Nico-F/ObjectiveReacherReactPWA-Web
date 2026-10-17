import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { TRANSLATIONS, loadAppLanguage } from "../../i18n";
import { BANNER_PRESETS } from "../../catalog";

const { MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

export function BannerPickerModal({
  onCancel,
  onApply,
  onAlert,
}: {
  onCancel: () => void;
  onApply: (bannerId: string, offsetX?: number, offsetY?: number) => void;
  onAlert: (title: string, message: string) => void;
}) {
  const t = TRANSLATIONS[loadAppLanguage()] || TRANSLATIONS.es;
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
        setPanX(0);
        setPanY(0);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#11111B] flex flex-col p-[18px] overflow-y-auto">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-between gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="w-[42px] h-[42px] rounded-[12px] bg-[#242238] text-white text-[26px] flex items-center justify-center leading-none"
          >
            ‹
          </button>
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-bold text-[#F5F2FA]">
              Fondo del objetivo
            </h2>
            <p className="text-[12px] text-[#AAA5BB]">
              Elige un diseño o una foto propia
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3.5 my-auto">
          <div className="text-[11px] font-bold text-[#AAA5BB]">DISEÑOS</div>
          <div className="grid grid-cols-2 gap-3">
            {BANNER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApply(preset.id, 0, 0)}
                style={{
                  background: `linear-gradient(135deg, ${preset.startColor}, ${preset.endColor})`,
                }}
                className="relative h-[102px] rounded-[16px] border border-[#51436C] overflow-hidden flex items-center justify-center hover:brightness-110 transition"
              >
                {preset.imageUrl && (
                  <img
                    src={preset.imageUrl}
                    alt={preset.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-62 pointer-events-none"
                  />
                )}
                <span className="relative z-10 text-[32px] text-white">
                  {preset.emoji}
                </span>
                <span className="absolute left-3 bottom-2.5 z-10 text-[12px] font-bold text-white">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] font-bold text-[#AAA5BB] pt-2">
            TU FOTO
          </div>

          <div
            onPointerDown={(e) => {
              if (!photoDataUrl) return;
              draggingRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                initialPanX: panX,
                initialPanY: panY,
              };
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current.active || !photoDataUrl) return;
              const dx = (e.clientX - draggingRef.current.startX) / 150;
              const dy = (e.clientY - draggingRef.current.startY) / 150;
              setPanX(
                Math.max(-1, Math.min(1, draggingRef.current.initialPanX + dx))
              );
              setPanY(
                Math.max(-1, Math.min(1, draggingRef.current.initialPanY + dy))
              );
            }}
            onPointerUp={() => {
              draggingRef.current.active = false;
            }}
            onPointerLeave={() => {
              draggingRef.current.active = false;
            }}
            className="relative h-[260px] sm:h-[320px] rounded-[18px] border border-[#51436C] overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
          >
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Vista previa"
                style={{
                  objectPosition: `${50 - panX * 50}% ${50 - panY * 50}%`,
                }}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="text-center text-[13px] text-[#E7E1F0] px-4 whitespace-pre-line">
                {t.cropImageHint}
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#AAA5BB]">
            La imagen se recorta al marco; arrástrala para mostrar la parte que
            quieras.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[48px] rounded-[12px] bg-[#302747] text-[#F5F2FA] text-sm font-medium hover:bg-[#3e335c] transition"
          >
            Elegir foto de la galería…
          </button>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="h-11 rounded-[12px] bg-[#302747] text-white font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!photoDataUrl) {
                onAlert(
                  'Elige una foto',
                  'Selecciona primero una imagen de la galería.'
                );
                return;
              }
              onApply(`custom:${photoDataUrl}`, panX, panY);
            }}
            className="h-11 rounded-[12px] bg-[#604094] text-white font-semibold"
          >
            Aplicar foto
          </button>
        </div>
      </div>
    </div>
  );
}
