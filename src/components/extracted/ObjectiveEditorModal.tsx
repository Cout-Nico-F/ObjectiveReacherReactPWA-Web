import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { TRANSLATIONS, loadAppLanguage } from "../../i18n";
import { findObjectiveUnit, CUSTOM_UNIT_ID, clampSafeAmount, MAX_SAFE_AMOUNT, findBannerPreset, findAccentTheme, formatObjectiveAmount, OBJECTIVE_TEMPLATES, OBJECTIVE_UNITS, OBJECTIVE_ICONS, OBJECTIVE_ACCENT_THEMES, BANNER_PRESETS } from "../../catalog";
import { playUiTap } from "../../soundEffects";
import { doTitlesShareCoreMeaning } from "../../utils/textUtils";
import { useHorizontalScrollProps } from "../../Hooks/useHorizontalScroll";

const { MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

export function ObjectiveEditorModal({
  objective,
  isNewDraft = false,
  onCancel,
  onSave,
  onAlert,
}: {
  objective: Objective;
  isNewDraft?: boolean;
  onCancel: () => void;
  onSave: (
    input: {
      title: string;
      description: string;
      goalAmount: number;
      unitId: string;
      customUnitLabel: string;
      icon: string;
      category: string;
      accentColor: string;
      bannerId: string;
      targetDate: string;
      pledge: string;
    },
    saveMode?: 'update_keep' | 'create_new' | 'overwrite_reset'
  ) => void;
  onAlert: (title: string, message: string) => void;
}) {
  const t = TRANSLATIONS[loadAppLanguage()] || TRANSLATIONS.es;
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description);
  const [goalAmountText, setGoalAmountText] = useState(
    String(objective.goalAmount)
  );
  const [unitId, setUnitId] = useState(
    findObjectiveUnit(objective.unitId)?.id || CUSTOM_UNIT_ID
  );
  const [customUnitLabel, setCustomUnitLabel] = useState(
    objective.customUnitLabel
  );
  const [icon, setIcon] = useState(objective.icon || '🎯');
  const [category, setCategory] = useState(objective.category || 'Personal');
  const [accentColor, setAccentColor] = useState(
    objective.accentColor || '#65DB85'
  );
  const [bannerId, setBannerId] = useState(objective.bannerId || 'gradient');
  const [targetDate, setTargetDate] = useState(objective.targetDate || '');
  const [pledge, setPledge] = useState(objective.pledge || '');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Smart Guard states to prevent accidentally corrupting an objective that already has history
  const hasRecordedHistory =
    !isNewDraft && (objective.entries.length > 0 || objective.currentAmount > 0);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [identityShiftPrompt, setIdentityShiftPrompt] = useState<{
    reason: string;
    payload: {
      title: string;
      description: string;
      goalAmount: number;
      unitId: string;
      customUnitLabel: string;
      icon: string;
      category: string;
      accentColor: string;
      bannerId: string;
      targetDate: string;
      pledge: string;
    };
  } | null>(null);

  const isGoalNumeric =
    goalAmountText.trim() === '' ||
    !Number.isNaN(Number(goalAmountText.replace(',', '.')));

  const parsedGoal = useMemo(() => {
    const n = Number(goalAmountText.replace(',', '.'));
    return !Number.isNaN(n) && n > 0
      ? clampSafeAmount(n, 1, MAX_SAFE_AMOUNT)
      : 1000;
  }, [goalAmountText]);

  const previewObjective: Objective = useMemo(
    () => ({
      ...objective,
      title: title.trim() || 'Tu Próxima Gran Meta',
      description: description.trim(),
      goalAmount: parsedGoal,
      unitId,
      customUnitLabel,
      icon,
      category: category.trim() || 'Personal',
      accentColor,
      bannerId,
      targetDate,
      pledge: pledge.trim(),
    }),
    [
      objective,
      title,
      description,
      parsedGoal,
      unitId,
      customUnitLabel,
      icon,
      category,
      accentColor,
      bannerId,
      targetDate,
      pledge,
    ]
  );

  const previewPreset = useMemo(
    () => findBannerPreset(bannerId),
    [bannerId]
  );
  const previewAccentTheme = useMemo(
    () => findAccentTheme(accentColor),
    [accentColor]
  );
  const customBannerUrl = bannerId.startsWith('custom:')
    ? bannerId.slice('custom:'.length)
    : null;
  const previewBannerImg = customBannerUrl || previewPreset.imageUrl;

  const dailyPacePreview = useMemo(() => {
    if (!targetDate) return null;
    const [y, m, d] = targetDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    const target = new Date(y, m - 1, d, 23, 59, 59);
    const diffDays = Math.ceil(
      (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 0) return null;
    const rem = Math.max(0, parsedGoal - objective.currentAmount);
    return {
      days: diffDays,
      perDay: formatObjectiveAmount(rem / diffDays, previewObjective),
    };
  }, [targetDate, parsedGoal, objective.currentAmount, previewObjective]);

  const applyFullTemplateFields = (tplId: string) => {
    const tpl = OBJECTIVE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setActiveTemplateId(tplId);
    if (tpl.title) setTitle(tpl.title);
    setDescription(tpl.description);
    setIcon(tpl.icon);
    setCategory(tpl.category);
    setGoalAmountText(String(tpl.goalAmount));
    setUnitId(tpl.unitId);
    setCustomUnitLabel(tpl.customUnitLabel);
    setBannerId(tpl.bannerId);
    setAccentColor(tpl.accentColor);
    setPledge(tpl.pledge);
    setPendingTemplateId(null);
  };

  const applyVisualStyleOnly = (tplId: string) => {
    const tpl = OBJECTIVE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    playUiTap(2);
    setActiveTemplateId(tplId);
    setIcon(tpl.icon);
    setBannerId(tpl.bannerId);
    setAccentColor(tpl.accentColor);
    setPendingTemplateId(null);
  };

  const applyTemplate = (tplId: string) => {
    playUiTap(1);
    if (hasRecordedHistory && tplId !== 'custom') {
      setPendingTemplateId(tplId);
      return;
    }
    applyFullTemplateFields(tplId);
  };

  const buildPayload = () => {
    const parsed = clampSafeAmount(
      Number(goalAmountText.replace(',', '.')),
      1,
      MAX_SAFE_AMOUNT
    );
    return {
      title,
      description,
      goalAmount: parsed,
      unitId,
      customUnitLabel,
      icon,
      category,
      accentColor,
      bannerId,
      targetDate,
      pledge,
    };
  };

  const handleSubmit = () => {
    if (!title.trim() || !unitId) {
      onAlert('Revisa los datos', 'Escribe un nombre y selecciona una unidad.');
      return;
    }
    const parsed = Number(goalAmountText.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      onAlert(t.invalidGoalAmountAlert, t.invalidGoalAmountDesc);
      return;
    }
    if (parsed > MAX_SAFE_AMOUNT) {
      setGoalAmountText(String(MAX_SAFE_AMOUNT));
      onAlert(t.maxGoalAmountReachedAlert,
        `Por seguridad visual y diseño responsive, la meta máxima es ${MAX_SAFE_AMOUNT.toLocaleString(
          'es-ES'
        )}.`
      );
      return;
    }
    if (unitId === CUSTOM_UNIT_ID && !customUnitLabel.trim()) {
      onAlert(
        'Falta la unidad',
        'Escribe una unidad como $, kg, libros o sesiones.'
      );
      return;
    }

    const payload = buildPayload();

    // Smart Identity Shift Detection when editing an objective that already has entries
    if (hasRecordedHistory) {
      const oldUnitLabel =
        objective.unitId === CUSTOM_UNIT_ID
          ? (objective.customUnitLabel || '').trim()
          : objective.unitId;
      const newUnitLabel =
        unitId === CUSTOM_UNIT_ID ? customUnitLabel.trim() : unitId;

      const unitChanged =
        oldUnitLabel.toLowerCase() !== newUnitLabel.toLowerCase();
      const titleRadicallyChanged = !doTitlesShareCoreMeaning(
        objective.title,
        title
      );

      if (unitChanged || titleRadicallyChanged) {
        playUiTap(0);
        const reason =
          unitChanged && titleRadicallyChanged
            ? `Cambiaste «${objective.title}» (${oldUnitLabel || 'unidad anterior'}) por «${title.trim()}» (${newUnitLabel || 'nueva unidad'}).`
            : unitChanged
            ? `Cambiaste la unidad de «${oldUnitLabel}» a «${newUnitLabel}» en una tarjeta que ya tiene registros.`
            : t.changedGoalNameProtection(objective.title, title.trim());

        setIdentityShiftPrompt({ reason, payload });
        return;
      }
    }

    onSave(payload, 'update_keep');
  };

  const pendingTemplate = useMemo(
    () => OBJECTIVE_TEMPLATES.find((t) => t.id === pendingTemplateId) || null,
    [pendingTemplateId]
  );
  const getModalHorizontalScrollProps = useHorizontalScrollProps();

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0E18]/95 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        style={{ borderColor: `${previewAccentTheme.primary}45` }}
        className="w-full max-w-2xl rounded-[24px] border bg-[#171625] p-4 sm:p-6 space-y-4 my-auto shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[20px] sm:text-[24px] font-extrabold text-[#F4F1FF] flex items-center gap-2">
              <span>{isNewDraft ? t.createGoalModalTitle : t.editGoalModalTitle}</span>
            </h2>
            <p className="text-[12px] text-[#A8A3B8]">
              {isNewDraft ? t.createGoalModalSub : t.editGoalModalSub}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-[11px] bg-[#262338] text-[#D8C5FF] hover:text-white flex items-center justify-center text-lg shrink-0"
          >
            ×
          </button>
        </div>

        {/* 1-Tap Inspiration Templates (11 Pre-designed Harmonious Styles) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div
              style={{ color: previewAccentTheme.primary }}
              className="text-[10px] font-extrabold uppercase tracking-wider"
            >
              ⚡ Estilos y Plantillas Prediseñadas ({OBJECTIVE_TEMPLATES.length})
            </div>
            {hasRecordedHistory && (
              <span className="text-[10px] text-[#A8A3B8]">
                💡 Al tocar una plantilla podrás elegir solo su estilo o crear un objetivo nuevo
              </span>
            )}
          </div>
          <div
            {...getModalHorizontalScrollProps()}
            className="flex gap-2 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
          >
            {OBJECTIVE_TEMPLATES.map((tpl) => {
              const isSelected = activeTemplateId === tpl.id;
              const tplTheme = findAccentTheme(tpl.accentColor);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  style={
                    isSelected
                      ? {
                          borderColor: tplTheme.primary,
                          backgroundColor: tplTheme.surfaceDark,
                          boxShadow: `0 4px 12px -4px ${tplTheme.glow}`,
                        }
                      : undefined
                  }
                  className={`px-3 py-2 rounded-[12px] border text-left shrink-0 transition flex items-center gap-2 ${
                    isSelected
                      ? 'text-white'
                      : 'bg-[#1F1E2E] border-[#2E2B42] text-[#D8D1E5] hover:bg-[#28253B]'
                  }`}
                >
                  <span className="text-base">{tpl.icon}</span>
                  <div>
                    <div className="text-[11px] font-bold leading-tight">
                      {tpl.label.replace(/^[^\s]+\s/, '')}
                    </div>
                    <div
                      style={{
                        color: isSelected ? tplTheme.textSoft : '#9E97B0',
                      }}
                      className="text-[9px]"
                    >
                      {tpl.category}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inline Smart Guard when clicking a Template on an Objective with History */}
          {pendingTemplate && (
            <div className="p-3.5 rounded-[16px] bg-gradient-to-r from-[#28203E] via-[#211C34] to-[#1A2628] border border-[#FFD54F]/65 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold text-[#FFD54F] flex items-center gap-1.5">
                    <span>{t.startCleanGoalPrompt}</span>
                  </div>
                  <p className="text-[11px] text-[#E6E0F2] leading-snug">
                    Tu tarjeta actual <strong>«{objective.title}»</strong> ya tiene{' '}
                    <strong>{objective.entries.length} registros</strong> (
                    {formatObjectiveAmount(objective.currentAmount, objective)}). Si la
                    reemplazas por <strong>«{pendingTemplate.title || pendingTemplate.label}»</strong>,
                    los ingresos y egresos anteriores no corresponderían.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingTemplateId(null)}
                  className="text-xs text-[#A8A3B8] hover:text-white px-1.5"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSave(
                      {
                        title: pendingTemplate.title || 'Nuevo Objetivo',
                        description: pendingTemplate.description,
                        goalAmount: pendingTemplate.goalAmount,
                        unitId: pendingTemplate.unitId,
                        customUnitLabel: pendingTemplate.customUnitLabel,
                        icon: pendingTemplate.icon,
                        category: pendingTemplate.category,
                        accentColor: pendingTemplate.accentColor,
                        bannerId: pendingTemplate.bannerId,
                        targetDate: '',
                        pledge: pendingTemplate.pledge,
                      },
                      'create_new'
                    );
                  }}
                  className="px-3 py-2 rounded-[10px] bg-gradient-to-r from-[#E5B945] to-[#FFD54F] text-[#1A1305] text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition shadow"
                >
                  ✨ Crear como Nuevo Objetivo
                </button>

                <button
                  type="button"
                  onClick={() => applyVisualStyleOnly(pendingTemplate.id)}
                  className="px-3 py-2 rounded-[10px] bg-[#2D2546] border border-[#8C5CE0]/60 text-[#F4F1FF] text-[11px] font-bold hover:bg-[#392F59] transition"
                >
                  🎨 Usar solo sus Colores y Fondo
                </button>

                <button
                  type="button"
                  onClick={() => applyFullTemplateFields(pendingTemplate.id)}
                  className="px-3 py-2 rounded-[10px] bg-[#1D1B2B] border border-[#383350] text-[#C8C2D8] text-[11px] font-medium hover:text-white transition"
                >
                  ✏️ Cargar datos aquí igualmente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Interactive Mini-Hero Card Preview with Full Chromatic Harmony (Portrait-First layout so text never squeezes into 2 words per line) */}
        <div
          style={{
            background: `linear-gradient(135deg, ${previewPreset.startColor}, ${previewPreset.endColor})`,
            borderColor: `${previewAccentTheme.primary}80`,
            boxShadow: `0 8px 24px -6px ${previewAccentTheme.glow}`,
          }}
          className="relative rounded-[18px] border p-3.5 sm:p-4 overflow-hidden transition-all"
        >
          {previewBannerImg && (
            <img
              src={previewBannerImg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none"
            />
          )}
          <div
            style={{ background: previewAccentTheme.vignetteGradient }}
            className="absolute inset-0 pointer-events-none transition-all duration-300"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div
                style={{
                  borderColor: previewAccentTheme.primary,
                  backgroundColor: previewAccentTheme.surfaceDark,
                  boxShadow: `0 0 12px ${previewAccentTheme.softBg}`,
                }}
                className="w-11 h-11 rounded-[14px] border flex items-center justify-center text-[22px] shrink-0"
              >
                {icon}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    style={{
                      color: previewAccentTheme.primary,
                      backgroundColor: previewAccentTheme.softBg,
                      borderColor: `${previewAccentTheme.primary}55`,
                    }}
                    className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase border"
                  >
                    {previewObjective.category}
                  </span>
                  <span
                    style={{ color: previewAccentTheme.textMuted }}
                    className="text-[10px] font-semibold"
                  >
                    · {previewAccentTheme.name} + {previewPreset.name}
                  </span>
                </div>
                <div className="text-[16px] sm:text-[18px] font-extrabold text-white leading-snug break-words">
                  {previewObjective.title}
                </div>
                <div
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-[11px] sm:text-[12px] leading-snug break-words"
                >
                  {previewObjective.pledge
                    ? `🎁 Premio: ${previewObjective.pledge}`
                    : previewObjective.description ||
                      'Vista previa en vivo con sintonía cromática completa'}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: previewAccentTheme.surfaceDark,
                borderColor: `${previewAccentTheme.primary}45`,
              }}
              className="w-full sm:w-auto sm:shrink-0 px-3 py-2 rounded-[12px] border flex sm:flex-col items-center sm:items-end justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-[9px] font-extrabold uppercase tracking-wider"
                >
                  META FINAL
                </span>
                {dailyPacePreview && (
                  <span className="text-[9px] text-[#FFE082] font-semibold">
                    · ⏳ {dailyPacePreview.days}d ({dailyPacePreview.perDay}/día)
                  </span>
                )}
              </div>
              <div
                style={{ color: previewAccentTheme.primary }}
                className="text-[15px] sm:text-[17px] font-extrabold font-mono-tabular leading-tight"
              >
                {formatObjectiveAmount(parsedGoal, previewObjective)}
              </div>
            </div>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 min-w-0">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="block w-full text-xs font-semibold leading-snug"
            >
              Nombre del objetivo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.placeholderGoalTitle}
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="space-y-1 min-w-0">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="block w-full text-xs font-semibold leading-snug"
            >
              Categoría / Etiqueta
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t.placeholderGoalCategory}
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="space-y-1">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span>Monto o cantidad meta</span>
              <span className="text-[10px] opacity-75 font-mono-tabular">
                Máx. 999.999.999
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={goalAmountText}
              onChange={(e) => {
                const rawVal = e.target.value.replace(/[^0-9.,]/g, '');
                const num = Number(rawVal.replace(',', '.'));
                if (!Number.isNaN(num) && num > MAX_SAFE_AMOUNT) {
                  setGoalAmountText(String(MAX_SAFE_AMOUNT));
                } else {
                  setGoalAmountText(rawVal);
                }
              }}
              placeholder="1000"
              style={{ color: isGoalNumeric ? '#F4F1FF' : '#FF4500' }}
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-sm font-mono-tabular border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label
                style={{ color: previewAccentTheme.textSoft }}
                className="text-xs font-semibold"
              >
                Unidad
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full h-10 px-2.5 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-xs border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
              >
                {OBJECTIVE_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            {unitId === CUSTOM_UNIT_ID ? (
              <div className="space-y-1">
                <label
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-xs font-semibold"
                >
                  Símbolo / Sufijo
                </label>
                <input
                  type="text"
                  value={customUnitLabel}
                  onChange={(e) => setCustomUnitLabel(e.target.value)}
                  placeholder="$, km, libros…"
                  className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label
                  style={{ color: previewAccentTheme.textSoft }}
                  className="text-xs font-semibold"
                >
                  Fecha límite (opc.)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-xs border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Motivation, Pledge & Optional Target Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              style={{ color: previewAccentTheme.textSoft }}
              className="text-xs font-semibold"
            >
              Propósito (¿Por qué es importante?)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Vivir una experiencia inolvidable…"
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#9B6BFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#FFE082]">
              🎁 Tu premio o promesa al lograrlo
            </label>
            <input
              type="text"
              value={pledge}
              onChange={(e) => setPledge(e.target.value)}
              placeholder={t.placeholderGoalPledge}
              className="w-full h-10 px-3 rounded-[10px] bg-[#11111C] text-[#F4F1FF] text-sm border border-[#2E2C44] focus:outline-none focus:border-[#FFD54F]"
            />
          </div>
        </div>

        {unitId === CUSTOM_UNIT_ID && (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-[12px] bg-[#12111D] border border-[#29263E]">
            <div className="text-xs text-[#C8C2D6]">
              ⏳ <strong>Fecha meta (opcional)</strong>: calcula tu ritmo diario sugerido
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-9 px-2.5 rounded-[9px] bg-[#1C1B2B] text-[#F4F1FF] text-xs border border-[#383350]"
            />
          </div>
        )}

        {/* Visual Identity: Icon + Accent Color + Atmospheric Banner */}
        <div className="space-y-3 pt-1 border-t border-[#29263E]">
          {/* Icon Picker */}
          <div className="space-y-1.5">
            <div
              style={{ color: previewAccentTheme.primary }}
              className="text-[11px] font-bold"
            >
              EMBLEMA DEL OBJETIVO
            </div>
            <div
              {...getModalHorizontalScrollProps()}
              className="flex items-center gap-1.5 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
            >
              {OBJECTIVE_ICONS.map((ic, idx) => {
                const isSelected = icon === ic;
                return (
                  <button
                    key={`editor-icon-${ic}-${idx}`}
                    type="button"
                    onClick={() => setIcon(ic)}
                    style={
                      isSelected
                        ? {
                            borderColor: previewAccentTheme.primary,
                            backgroundColor: previewAccentTheme.surfaceDark,
                          }
                        : undefined
                    }
                    className={`w-9 h-9 rounded-[10px] border text-lg flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? 'scale-110 shadow'
                        : 'bg-[#12111D] border-[#28253B] hover:bg-[#1E1C2E]'
                    }`}
                  >
                    {ic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color & Banner Preset Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div
                style={{ color: previewAccentTheme.primary }}
                className="text-[11px] font-bold flex items-center justify-between"
              >
                <span>{t.goalAccentThemeLabel}</span>
                <span className="text-[10px] opacity-90">
                  {previewAccentTheme.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {OBJECTIVE_ACCENT_THEMES.map((theme) => {
                  const isSelected = accentColor === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        playUiTap(1);
                        setAccentColor(theme.id);
                      }}
                      style={{
                        backgroundColor: theme.primary,
                        boxShadow: isSelected
                          ? `0 0 0 3px #171625, 0 0 0 5px ${theme.primary}`
                          : undefined,
                      }}
                      title={theme.name}
                      className={`w-7 h-7 rounded-full transition ${
                        isSelected ? 'scale-110' : 'opacity-75 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div
                style={{ color: previewAccentTheme.primary }}
                className="text-[11px] font-bold flex items-center justify-between"
              >
                <span>ATMÓSFERA DE FONDO ({BANNER_PRESETS.length})</span>
                <span className="text-[10px] opacity-90">
                  {previewPreset.name}
                </span>
              </div>
              <div
                {...getModalHorizontalScrollProps()}
                className="flex items-center gap-1.5 overflow-x-auto pb-1.5 horizontal-scroll-strip cursor-grab active:cursor-grabbing"
              >
                {BANNER_PRESETS.map((preset) => {
                  const isSelected = bannerId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        playUiTap(1);
                        setBannerId(preset.id);
                      }}
                      style={{
                        background: `linear-gradient(135deg, ${preset.startColor}, ${preset.endColor})`,
                        borderColor: isSelected
                          ? previewAccentTheme.primary
                          : '#383350',
                      }}
                      className={`px-2.5 py-1.5 rounded-[10px] border text-[11px] font-bold text-white shrink-0 flex items-center gap-1 transition ${
                        isSelected ? 'scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Identity Shift Confirmation Overlay when saving a radically changed card with history */}
        {identityShiftPrompt && (
          <div className="p-4 rounded-[18px] bg-[#1D182E] border-2 border-[#FFD54F] space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-[#FFD54F] flex items-center gap-1.5">
                <span>⚠️ ¿No estarás queriendo crear un Nuevo Objetivo?</span>
              </div>
              <p className="text-xs text-[#F0EAF8] leading-relaxed">
                {identityShiftPrompt.reason} Como esta tarjeta ya tiene{' '}
                <strong>{objective.entries.length} movimientos registrados</strong> (
                {formatObjectiveAmount(objective.currentAmount, objective)}), los valores
                ingresados y egresados anteriores no corresponderían del todo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() =>
                  onSave(identityShiftPrompt.payload, 'create_new')
                }
                className="w-full py-2.5 px-3 rounded-[11px] bg-gradient-to-r from-[#E5B945] to-[#FFD54F] text-[#1A1305] text-xs font-extrabold hover:brightness-110 active:scale-95 transition shadow text-left flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <span>
                  ✨ Sí, crear «{identityShiftPrompt.payload.title.trim()}» como Nuevo Objetivo
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-black/15 self-start sm:self-auto shrink-0">
                  Conservar «{objective.title}» intacto
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSave(identityShiftPrompt.payload, 'overwrite_reset')
                }
                className="w-full py-2.5 px-3 rounded-[11px] bg-[#33223A] border border-[#FF8A65]/50 text-[#FFD8CC] text-xs font-bold hover:bg-[#422B4B] transition text-left flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <span>
                  🧹 Transformar esta tarjeta y reiniciar su historial a 0
                </span>
                <span className="text-[10px] opacity-80 shrink-0">Empezar limpio</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSave(identityShiftPrompt.payload, 'update_keep')
                }
                className="w-full py-2 px-3 rounded-[11px] bg-[#252238] border border-[#3E385B] text-[#C8C2D8] text-xs font-medium hover:text-white transition text-left"
              >
                ✏️ Solo actualizar los datos conservando el saldo e historial actual (
                {formatObjectiveAmount(objective.currentAmount, objective)})
              </button>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-[12px] bg-[#28253B] text-[#F4F1FF] font-medium hover:bg-[#34304C] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              background: `linear-gradient(90deg, ${previewAccentTheme.secondary}, ${previewAccentTheme.primary})`,
              color: previewAccentTheme.buttonText,
              boxShadow: `0 4px 16px -2px ${previewAccentTheme.glow}`,
            }}
            className="h-11 rounded-[12px] font-extrabold hover:brightness-110 active:scale-95 transition"
          >
            {isNewDraft ? t.createGoalSubmit : t.saveGoalChangesSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
