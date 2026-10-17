import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { MascotAvatarSvg } from "./MascotAvatarSvg";

const { MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

export const MascotGridCard = React.memo(function MascotGridCard({
  lvl,
  itemTier,
  isSelected,
  isItemLocked,
  skinId,
  onSelect,
}: {
  lvl: number;
  itemTier: number;
  isSelected: boolean;
  isItemLocked: boolean;
  skinId?: string;
  onSelect: (level: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(lvl)}
      className={`p-2 rounded-[14px] border flex flex-col items-center gap-1 transition ${
        isSelected
          ? 'border-[#C7A4FF] bg-[#302747]'
          : isItemLocked
          ? 'border-[#252438] bg-[#151521] hover:bg-[#1E1D2E]'
          : 'border-[#4A3B6E] bg-[#1C1C2A] hover:bg-[#242238]'
      }`}
    >
      <MascotAvatarSvg
        level={lvl}
        size={48}
        isLocked={isItemLocked}
        skinId={skinId}
      />
      <span
        className={`text-[11px] font-bold ${
          isItemLocked ? 'text-[#88839E]' : 'text-[#F4F1FF]'
        }`}
      >
        {isItemLocked ? `🔒 Nv. ${lvl}` : `Nv. ${lvl}`}
      </span>
      <span className="text-[9px] text-[#A8A3B8] leading-tight w-full text-center break-words">
        {isItemLocked ? '？？？' : MASCOT_STAGE_NAMES[itemTier]}
      </span>
    </button>
  );
});
