import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { TRANSLATIONS, loadAppLanguage } from "../../i18n";
import { MAX_SAFE_AMOUNT } from "../../catalog";

const { STORAGE_KEY, LEGACY_STORAGE_KEYS, LAUNCH_DEADLINE_STORAGE_KEY, MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

export function EditEntryModal({
  entry,
  onCancel,
  onSave,
  onAlert,
}: {
  entry: ObjectiveEntry;
  onCancel: () => void;
  onSave: (entryId: string, description: string, positiveAmount: number) => void;
  onAlert: (title: string, message: string) => void;
}) {
  const t = TRANSLATIONS[loadAppLanguage()] || TRANSLATIONS.es;
  const [description, setDescription] = useState(entry.description);
  const [amountText, setAmountText] = useState(String(Math.abs(entry.amount)));

  const handleSave = () => {
    const parsed = Number(amountText.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      onAlert(t.invalidAmountAlert, t.invalidAmountDesc);
      return;
    }
    if (parsed > MAX_SAFE_AMOUNT) {
      setAmountText(String(MAX_SAFE_AMOUNT));
      onAlert(
        'Importe máximo superado',
        `El importe máximo permitido es ${MAX_SAFE_AMOUNT.toLocaleString(
          'es-ES'
        )}.`
      );
      return;
    }
    onSave(entry.id, description, parsed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[18px] border border-[#29283C] bg-[#1C1C2A] p-5 space-y-4">
        <h3 className="text-lg font-bold text-[#F4F1FF]">Editar entrada</h3>
        <div className="space-y-1.5">
          <label className="text-xs text-[#A8A3B8]">Descripción</label>
          <input
            type="text"
            maxLength={80}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-11 px-3 rounded-[10px] bg-[#151520] text-[#F4F1FF] border border-[#29283C]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#A8A3B8]">
            Importe positivo (se conserva si fue suma/resta)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="w-full h-11 px-3 rounded-[10px] bg-[#151520] text-[#F4F1FF] border border-[#29283C]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="py-2.5 rounded-[10px] bg-[#302E42] text-[#F4F1FF] text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="py-2.5 rounded-[10px] bg-[#7549B8] text-white text-sm font-bold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
