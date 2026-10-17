import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';
import { findMascotSkin } from "../../monetization";

const { MASCOT_STAGE_NAMES, MASCOT_STAGE_HINTS } = Constants;

export function MascotAvatarSvg({
  level,
  size = 56,
  isLocked = false,
  skinId = 'default',
}: {
  level: number;
  size?: number;
  isLocked?: boolean;
  skinId?: string;
}) {
  const palettes = [
    ['#2E7D5B', '#65DB85', '#BFF5CE', '#1E4635'], // 0: Brote Esmeralda
    ['#3B5BA5', '#7DA6FF', '#D6E4FF', '#203059'], // 1: Espíritu Neko
    ['#B84A39', '#FF8A65', '#FFE0B2', '#4E221B'], // 2: Zorro Kitsune
    ['#5D4037', '#BCAAA4', '#FFE082', '#32231E'], // 3: Búho Sabio
    ['#28667E', '#64D8FF', '#E0F7FA', '#163745'], // 4: Lobo Boreal
    ['#C66900', '#FFB74D', '#FFF3E0', '#4D2C08'], // 5: Tigre Guardián
    ['#C79100', '#FFD54F', '#FFFDE7', '#4F3B05'], // 6: León Solar
    ['#2E6B4E', '#81C784', '#E8F5E9', '#193A2A'], // 7: Ciervo del Bosque
    ['#C62828', '#FF7043', '#FFD54F', '#4F1010'], // 8: Fénix Carmesí
    ['#455A64', '#80CBC4', '#A7FFEB', '#1C262B'], // 9: Gólem de Cristal
    ['#00695C', '#26A69A', '#64FFDA', '#042F2B'], // 10: Kraken Abisal
    ['#8D6E63', '#FFD54F', '#FFF8E1', '#3E2723'], // 11: Cronos Autómata
    ['#6A1B9A', '#CE93D8', '#FFD54F', '#330D4B'], // 12: Dragón Imperial
    ['#283593', '#7986CB', '#F8BBD0', '#141A46'], // 13: Polilla Astral
    ['#AD8700', '#FFE082', '#FFFFFF', '#4A3A00'], // 14: Serafín Ophanim
    ['#2E7D32', '#66BB6A', '#DCE775', '#153817'], // 15: Hidra Tricéfala
    ['#4A148C', '#B388FF', '#FF80AB', '#240846'], // 16: Djinn Astral
    ['#1565C0', '#90CAF9', '#FFD740', '#0B2948'], // 17: Valkiria Celestial
    ['#00838F', '#4DD0E1', '#E040FB', '#052C33'], // 18: Arquitecto Merkaba
    ['#311B92', '#E040FB', '#FFD740', '#120836'], // 19: Singularidad Cósmica
  ];

  const clamped = Math.min(200, Math.max(1, level));
  const tier = Math.floor((clamped - 1) / 10);
  const subLevel = (clamped - 1) % 10;
  const subProgress = subLevel / 9;
  const activeSkin = findMascotSkin(skinId);
  const [realPrimary, realSecondary, realAccent, realGlow] =
    !isLocked && activeSkin.paletteOverride
      ? activeSkin.paletteOverride
      : palettes[tier] || palettes[0];

  const primary = isLocked ? '#232136' : realPrimary;
  const secondary = isLocked ? '#181726' : realSecondary;
  const accent = isLocked ? realPrimary : realAccent;
  const glow = isLocked ? '#0E0E17' : realGlow;
  const eyeColor = isLocked ? realPrimary : '#171725';

  const starCount = subLevel + 1;
  const scale = 0.72 + subProgress * 0.26;
  const cx = 28;
  const cy = 28;
  const radius = 25.5;
  const u = radius * scale;

  const renderEyes = (
    eyeY: number,
    offset: number,
    r: number,
    drawShine: boolean,
    customColor?: string
  ) => (
    <g>
      <circle
        cx={cx - offset}
        cy={eyeY}
        r={r}
        fill={customColor || eyeColor}
        opacity={isLocked ? 0.65 : 1}
      />
      <circle
        cx={cx + offset}
        cy={eyeY}
        r={r}
        fill={customColor || eyeColor}
        opacity={isLocked ? 0.65 : 1}
      />
      {drawShine && !isLocked && (
        <>
          <circle
            cx={cx - offset - r * 0.25}
            cy={eyeY - r * 0.25}
            r={r * 0.4}
            fill="#FFFFFF"
          />
          <circle
            cx={cx + offset - r * 0.25}
            cy={eyeY - r * 0.25}
            r={r * 0.4}
            fill="#FFFFFF"
          />
        </>
      )}
    </g>
  );

  const renderWings = (wingCy: number, wingU: number, color: string) => {
    const span = wingU * (0.82 + subLevel * 0.025);
    const height = wingU * (0.52 + subLevel * 0.02);
    return (
      <g fill={color}>
        <path
          d={`M ${cx - wingU * 0.2} ${wingCy + wingU * 0.08} C ${cx - span} ${
            wingCy - height
          }, ${cx - span} ${wingCy + height * 0.35}, ${cx - wingU * 0.25} ${
            wingCy + wingU * 0.35
          } Z`}
        />
        <path
          d={`M ${cx + wingU * 0.2} ${wingCy + wingU * 0.08} C ${cx + span} ${
            wingCy - height
          }, ${cx + span} ${wingCy + height * 0.35}, ${cx + wingU * 0.25} ${
            wingCy + wingU * 0.35
          } Z`}
        />
      </g>
    );
  };

  const renderPointedEars = (heightFactor: number) => {
    const earH = u * heightFactor;
    return (
      <g fill={primary}>
        <polygon
          points={`${cx - u * 0.42},${cy - u * 0.12} ${cx - u * 0.54},${
            cy - u * 0.3 - earH
          } ${cx - u * 0.1},${cy - u * 0.38}`}
        />
        <polygon
          points={`${cx + u * 0.42},${cy - u * 0.12} ${cx + u * 0.54},${
            cy - u * 0.3 - earH
          } ${cx + u * 0.1},${cy - u * 0.38}`}
        />
      </g>
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className="shrink-0 select-none"
    >
      {/* 1. Medallion */}
      <circle cx={cx} cy={cy} r={radius} fill={glow} />
      {activeSkin.id !== 'default' && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={radius * 0.98}
            fill="none"
            stroke={activeSkin.auraRingColor}
            strokeWidth={1.5}
            strokeDasharray="3.5 2.5"
            opacity={isLocked ? 0.65 : 0.85}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius * 0.84}
            fill="none"
            stroke={activeSkin.auraSecondaryColor}
            strokeWidth={0.9}
            opacity={isLocked ? 0.4 : 0.55}
          />
        </>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={radius * 0.92}
        fill="none"
        stroke={isLocked ? realPrimary : primary}
        strokeWidth={1.8 + subProgress * 1.1}
        opacity={isLocked ? 0.35 : 0.65 + subProgress * 0.3}
      />

      {/* 1b. Sub-Level Evolution Background Aura Layers (Clean circular halo for Tier 0 Brote Esmeralda, geometric rays for higher tiers) */}
      {subLevel >= 2 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius * 0.72}
          fill="none"
          stroke={primary}
          strokeWidth={1}
          opacity={isLocked ? 0.25 : 0.45}
        />
      )}
      {tier === 0 && subLevel >= 6 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius * (0.58 + (subLevel - 6) * 0.03)}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          opacity={isLocked ? 0.22 : 0.38}
        />
      )}
      {tier > 0 && subLevel >= 4 && (
        <g
          stroke={accent}
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={isLocked ? 0.25 : 0.65}
        >
          <line
            x1={cx - radius * 0.48}
            y1={cy + radius * 0.1}
            x2={cx - radius * (0.76 + (subLevel - 4) * 0.03)}
            y2={cy - radius * 0.18}
          />
          <line
            x1={cx + radius * 0.48}
            y1={cy + radius * 0.1}
            x2={cx + radius * (0.76 + (subLevel - 4) * 0.03)}
            y2={cy - radius * 0.18}
          />
          {subLevel >= 6 && (
            <>
              <line
                x1={cx - radius * 0.45}
                y1={cy + radius * 0.24}
                x2={cx - radius * (0.7 + (subLevel - 4) * 0.025)}
                y2={cy + radius * 0.06}
              />
              <line
                x1={cx + radius * 0.45}
                y1={cy + radius * 0.24}
                x2={cx + radius * (0.7 + (subLevel - 4) * 0.025)}
                y2={cy + radius * 0.06}
              />
            </>
          )}
        </g>
      )}
      {tier > 0 && subLevel >= 6 && (
        <polygon
          points={`${cx},${cy - radius * (0.58 + (subLevel - 6) * 0.035)} ${
            cx + radius * (0.58 + (subLevel - 6) * 0.035)
          },${cy} ${cx},${cy + radius * (0.58 + (subLevel - 6) * 0.035)} ${
            cx - radius * (0.58 + (subLevel - 6) * 0.035)
          },${cy}`}
          fill="none"
          stroke={accent}
          strokeWidth={1.1}
          opacity={isLocked ? 0.25 : 0.55}
        />
      )}
      {tier > 0 && subLevel === 9 && (
        <g
          stroke={accent}
          strokeWidth={1.15}
          strokeLinecap="round"
          opacity={isLocked ? 0.3 : 0.75}
        >
          {Array.from({ length: 8 }).map((_, r) => {
            const ang = Math.PI / 8 + r * (Math.PI / 4);
            return (
              <line
                key={r}
                x1={cx + Math.cos(ang) * radius * 0.62}
                y1={cy + Math.sin(ang) * radius * 0.62}
                x2={cx + Math.cos(ang) * radius * 0.88}
                y2={cy + Math.sin(ang) * radius * 0.88}
              />
            );
          })}
        </g>
      )}

      {/* 2. Orbital Stars */}
      {Array.from({ length: starCount }).map((_, i) => {
        const angle =
          -Math.PI / 2 + i * ((Math.PI * 2) / Math.max(3, starCount));
        const sx = cx + Math.cos(angle) * (radius * 0.82);
        const sy = cy + Math.sin(angle) * (radius * 0.82);
        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={1.1 + (i % 2) * 0.4 + subProgress * 0.35}
            fill={isLocked ? realPrimary : accent}
            opacity={isLocked ? 0.3 : 0.85}
          />
        );
      })}

      {/* 3. 20 Distinct Creature Forms with Progressive Sub-Level Evolution */}
      {tier === 0 && (
        <g>
          {/* Soft base shadow / cushion */}
          <ellipse
            cx={cx}
            cy={cy + u * 0.24}
            rx={u * (0.43 + subProgress * 0.05)}
            ry={u * (0.34 + subProgress * 0.04)}
            fill={secondary}
          />
          {/* Subtle inner belly highlight on higher subLevels */}
          {subLevel >= 2 && (
            <ellipse
              cx={cx}
              cy={cy + u * 0.28}
              rx={u * 0.26}
              ry={u * 0.16}
              fill={accent}
              opacity={isLocked ? 0.18 : 0.35}
            />
          )}
          {(() => {
            const stemH = u * (0.2 + subProgress * 0.24);
            const stemTopY = cy - u * 0.06 - stemH;
            const leafW = u * (0.14 + subProgress * 0.07);
            const leafH = leafW * 0.58;
            const leafY = cy - u * 0.08 - stemH * 0.62;
            return (
              <>
                {/* Single clean organic stem */}
                <line
                  x1={cx}
                  y1={cy - u * 0.05}
                  x2={cx}
                  y2={stemTopY}
                  stroke={accent}
                  strokeWidth={Math.max(2, u * 0.095)}
                  strokeLinecap="round"
                />
                {/* Maximum 1 pair of smooth sprout leaves (2 cotiledones) */}
                <ellipse
                  cx={cx - leafW * 0.95}
                  cy={leafY}
                  rx={leafW}
                  ry={leafH}
                  transform={`rotate(-22 ${cx - leafW * 0.95} ${leafY})`}
                  fill={accent}
                />
                {subLevel >= 1 && (
                  <ellipse
                    cx={cx + leafW * 0.95}
                    cy={leafY}
                    rx={leafW}
                    ry={leafH}
                    transform={`rotate(22 ${cx + leafW * 0.95} ${leafY})`}
                    fill={accent}
                  />
                )}
                {/* Levels 5-6: Clean little lotus bud at the tip */}
                {subLevel >= 4 && subLevel < 7 && (
                  <ellipse
                    cx={cx}
                    cy={stemTopY - leafW * 0.35}
                    rx={leafW * 0.48}
                    ry={leafW * 0.62}
                    fill={isLocked ? primary : '#FFD54F'}
                  />
                )}
                {/* Levels 8-10: Clean 3-petal blossom crowning the stem */}
                {subLevel >= 7 && (
                  <g>
                    <ellipse
                      cx={cx - leafW * 0.52}
                      cy={stemTopY - leafW * 0.25}
                      rx={leafW * 0.44}
                      ry={leafW * 0.62}
                      transform={`rotate(-28 ${cx - leafW * 0.52} ${
                        stemTopY - leafW * 0.25
                      })`}
                      fill={isLocked ? primary : '#FFB74D'}
                    />
                    <ellipse
                      cx={cx + leafW * 0.52}
                      cy={stemTopY - leafW * 0.25}
                      rx={leafW * 0.44}
                      ry={leafW * 0.62}
                      transform={`rotate(28 ${cx + leafW * 0.52} ${
                        stemTopY - leafW * 0.25
                      })`}
                      fill={isLocked ? primary : '#FFB74D'}
                    />
                    <ellipse
                      cx={cx}
                      cy={stemTopY - leafW * 0.42}
                      rx={leafW * 0.5}
                      ry={leafW * 0.7}
                      fill={isLocked ? accent : '#FFD54F'}
                    />
                    {subLevel >= 8 && (
                      <circle
                        cx={cx}
                        cy={stemTopY - leafW * 0.42}
                        r={leafW * 0.22}
                        fill={isLocked ? primary : '#FFF8E1'}
                      />
                    )}
                  </g>
                )}
              </>
            );
          })()}
          {renderEyes(cy + u * 0.2, u * 0.18, u * 0.08, true)}
        </g>
      )}

      {tier === 1 && (
        <g>
          {subLevel >= 5 && (
            <g
              stroke={primary}
              strokeWidth={Math.max(2, u * 0.1)}
              strokeLinecap="round"
            >
              <line
                x1={cx - u * 0.3}
                y1={cy + u * 0.3}
                x2={cx - u * 0.68}
                y2={cy - u * 0.15}
              />
              {subLevel >= 7 && (
                <line
                  x1={cx + u * 0.3}
                  y1={cy + u * 0.3}
                  x2={cx + u * 0.68}
                  y2={cy - u * 0.15}
                />
              )}
            </g>
          )}
          {renderPointedEars(0.42 + subLevel * 0.018)}
          <circle cx={cx} cy={cy + u * 0.06} r={u * 0.48} fill={secondary} />
          <g
            stroke={accent}
            strokeWidth={Math.max(1.1, u * 0.045)}
            strokeLinecap="round"
          >
            {Array.from({ length: 1 + Math.floor(subLevel / 4) }).map(
              (_, w) => {
                const wy = cy + u * (0.08 + w * 0.09);
                return (
                  <g key={w}>
                    <line
                      x1={cx - u * 0.28}
                      y1={wy}
                      x2={cx - u * 0.62}
                      y2={wy - u * 0.04}
                    />
                    <line
                      x1={cx + u * 0.28}
                      y1={wy}
                      x2={cx + u * 0.62}
                      y2={wy - u * 0.04}
                    />
                  </g>
                );
              }
            )}
          </g>
          {renderEyes(cy + u * 0.02, u * 0.2, u * 0.09, true)}
          {subLevel >= 2 && (
            <circle
              cx={cx}
              cy={cy + u * 0.48}
              r={u * (0.09 + subLevel * 0.005)}
              fill={isLocked ? primary : '#FFD54F'}
            />
          )}
        </g>
      )}

      {tier === 2 && (
        <g>
          {Array.from({ length: Math.min(9, 1 + subLevel) }).map(
            (_, t, arr) => {
              const tails = arr.length;
              const off =
                tails === 1
                  ? 0
                  : (t - (tails - 1) / 2) * (1.5 / Math.max(2, tails - 1));
              return (
                <ellipse
                  key={t}
                  cx={cx + off * u * 0.55}
                  cy={cy - u * 0.3 + Math.abs(off) * u * 0.22}
                  rx={u * 0.13}
                  ry={u * 0.33}
                  fill={primary}
                />
              );
            }
          )}
          {renderPointedEars(0.58 + subLevel * 0.015)}
          <polygon
            points={`${cx},${cy - u * 0.38} ${cx + u * 0.52},${
              cy + u * 0.04
            } ${cx},${cy + u * 0.54} ${cx - u * 0.52},${cy + u * 0.04}`}
            fill={secondary}
          />
          {renderEyes(cy + u * 0.04, u * 0.19, u * 0.085, true)}
        </g>
      )}

      {tier === 3 && (
        <g>
          {subLevel >= 4 &&
            renderWings(cy + u * 0.05, u * (0.75 + subLevel * 0.03), primary)}
          <g
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.09)}
            strokeLinecap="round"
          >
            <line
              x1={cx - u * 0.22}
              y1={cy - u * 0.28}
              x2={cx - u * 0.48}
              y2={cy - u * (0.53 + subLevel * 0.035)}
            />
            <line
              x1={cx + u * 0.22}
              y1={cy - u * 0.28}
              x2={cx + u * 0.48}
              y2={cy - u * (0.53 + subLevel * 0.035)}
            />
          </g>
          <ellipse
            cx={cx}
            cy={cy + u * 0.08}
            rx={u * 0.46}
            ry={u * 0.44}
            fill={secondary}
          />
          <circle
            cx={cx - u * 0.22}
            cy={cy - u * 0.02}
            r={u * (0.19 + subLevel * 0.005)}
            fill={primary}
          />
          <circle
            cx={cx + u * 0.22}
            cy={cy - u * 0.02}
            r={u * (0.19 + subLevel * 0.005)}
            fill={primary}
          />
          {renderEyes(cy - u * 0.02, u * 0.22, u * 0.1, true)}
          <polygon
            points={`${cx - u * 0.12},${cy + u * 0.1} ${cx + u * 0.12},${
              cy + u * 0.1
            } ${cx},${cy + u * 0.27}`}
            fill={isLocked ? accent : '#FFD54F'}
          />
        </g>
      )}

      {tier === 4 && (
        <g>
          {renderPointedEars(0.48 + subLevel * 0.02)}
          {Array.from({ length: 1 + Math.floor(subLevel / 3) }).map((_, s) => {
            const sy = cy - u * 0.02 + s * u * 0.14;
            return (
              <g key={s} fill={primary}>
                <ellipse
                  cx={cx - u * 0.54}
                  cy={sy}
                  rx={u * 0.18}
                  ry={u * 0.07}
                />
                <ellipse
                  cx={cx + u * 0.54}
                  cy={sy}
                  rx={u * 0.18}
                  ry={u * 0.07}
                />
              </g>
            );
          })}
          <polygon
            points={`${cx},${cy - u * 0.45} ${cx + u * 0.56},${
              cy + u * 0.06
            } ${cx},${cy + u * 0.56} ${cx - u * 0.56},${cy + u * 0.06}`}
            fill={secondary}
          />
          {renderEyes(cy + u * 0.02, u * 0.2, u * 0.085, true)}
        </g>
      )}

      {tier === 5 && (
        <g>
          <circle
            cx={cx - u * 0.36}
            cy={cy - u * 0.34}
            r={u * 0.18}
            fill={primary}
          />
          <circle
            cx={cx + u * 0.36}
            cy={cy - u * 0.34}
            r={u * 0.18}
            fill={primary}
          />
          <ellipse
            cx={cx}
            cy={cy + u * 0.04}
            rx={u * 0.52}
            ry={u * 0.42}
            fill={secondary}
          />
          <g
            stroke={primary}
            strokeWidth={Math.max(1.6, u * 0.07)}
            strokeLinecap="round"
          >
            {Array.from({ length: 1 + Math.floor(subLevel / 3) }).map(
              (_, st) => {
                const sy = cy - u * 0.12 + st * u * 0.13;
                return (
                  <g key={st}>
                    <line
                      x1={cx - u * 0.48}
                      y1={sy}
                      x2={cx - u * 0.28}
                      y2={sy}
                    />
                    <line
                      x1={cx + u * 0.28}
                      y1={sy}
                      x2={cx + u * 0.48}
                      y2={sy}
                    />
                  </g>
                );
              }
            )}
          </g>
          <ellipse
            cx={cx - u * 0.19}
            cy={cy + u * (0.35 + subLevel * 0.01)}
            rx={u * 0.05}
            ry={u * (0.07 + subLevel * 0.011)}
            fill={accent}
          />
          <ellipse
            cx={cx + u * 0.19}
            cy={cy + u * (0.35 + subLevel * 0.01)}
            rx={u * 0.05}
            ry={u * (0.07 + subLevel * 0.011)}
            fill={accent}
          />
          {renderEyes(cy + u * 0.02, u * 0.21, u * 0.085, true)}
        </g>
      )}

      {tier === 6 && (
        <g>
          {Array.from({ length: 8 + subLevel }).map((_, r, arr) => {
            const ang = r * ((Math.PI * 2) / arr.length);
            const dist = u * (0.5 + (r % 2 === 0 ? subLevel * 0.015 : 0));
            return (
              <circle
                key={r}
                cx={cx + Math.cos(ang) * dist}
                cy={cy + Math.sin(ang) * dist}
                r={u * 0.19}
                fill={primary}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={u * 0.45} fill={secondary} />
          {renderEyes(cy - u * 0.02, u * 0.19, u * 0.085, true)}
        </g>
      )}

      {tier === 7 && (
        <g>
          {(() => {
            const hornH = u * (0.45 + subLevel * 0.038);
            const tines = 1 + Math.floor(subLevel / 3);
            return (
              <g
                stroke={accent}
                strokeWidth={Math.max(2, u * 0.09)}
                strokeLinecap="round"
              >
                <line
                  x1={cx - u * 0.18}
                  y1={cy - u * 0.22}
                  x2={cx - u * 0.55}
                  y2={cy - u * 0.22 - hornH}
                />
                <line
                  x1={cx + u * 0.18}
                  y1={cy - u * 0.22}
                  x2={cx + u * 0.55}
                  y2={cy - u * 0.22 - hornH}
                />
                {Array.from({ length: tines }).map((_, t) => {
                  const frac = (t + 1) / (tines + 1);
                  const bx = u * (0.18 + 0.37 * frac);
                  const by = cy - u * 0.22 - hornH * frac;
                  return (
                    <g key={t}>
                      <line
                        x1={cx - bx}
                        y1={by}
                        x2={cx - bx + u * 0.18}
                        y2={by - u * 0.22}
                      />
                      <line
                        x1={cx + bx}
                        y1={by}
                        x2={cx + bx - u * 0.18}
                        y2={by - u * 0.22}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })()}
          <ellipse
            cx={cx}
            cy={cy + u * 0.13}
            rx={u * 0.38}
            ry={u * 0.35}
            fill={secondary}
          />
          {renderEyes(cy + u * 0.1, u * 0.18, u * 0.08, true)}
        </g>
      )}

      {tier === 8 && (
        <g>
          {Array.from({ length: 1 + Math.floor(subLevel / 4) }).map(
            (_, wl) => (
              <g key={wl}>
                {renderWings(
                  cy + wl * u * 0.12,
                  u * (1 - wl * 0.12),
                  wl % 2 === 0 ? primary : accent
                )}
              </g>
            )
          )}
          {Array.from({ length: 1 + Math.floor(subLevel / 3) * 2 }).map(
            (_, c, arr) => {
              const off = c - (arr.length - 1) / 2;
              return (
                <ellipse
                  key={c}
                  cx={cx + off * u * 0.13}
                  cy={cy - u * 0.56 + Math.abs(off) * u * 0.08}
                  rx={u * 0.05}
                  ry={u * 0.18}
                  fill={accent}
                />
              );
            }
          )}
          <circle cx={cx} cy={cy + u * 0.06} r={u * 0.4} fill={secondary} />
          {renderEyes(cy + u * 0.02, u * 0.16, u * 0.075, true)}
          <polygon
            points={`${cx - u * 0.11},${cy + u * 0.1} ${cx + u * 0.11},${
              cy + u * 0.1
            } ${cx},${cy + u * 0.25}`}
            fill={accent}
          />
        </g>
      )}

      {tier === 9 && (
        <g>
          {Array.from({ length: Math.floor((subLevel * 2) / 3) }).map(
            (_, s, arr) => {
              const ang =
                -Math.PI / 2 + s * ((Math.PI * 2) / Math.max(1, arr.length));
              return (
                <circle
                  key={s}
                  cx={cx + Math.cos(ang) * u * 0.76}
                  cy={cy + Math.sin(ang) * u * 0.76}
                  r={u * 0.1}
                  fill={accent}
                />
              );
            }
          )}
          <polygon
            points={Array.from({ length: 6 })
              .map((_, i) => {
                const ang = -Math.PI / 2 + i * (Math.PI / 3);
                return `${cx + Math.cos(ang) * u * 0.6},${
                  cy + Math.sin(ang) * u * 0.6
                }`;
              })
              .join(' ')}
            fill={secondary}
          />
          <rect
            x={cx - u * 0.34}
            y={cy - u * 0.12}
            width={u * 0.68}
            height={u * 0.22}
            rx={u * 0.08}
            fill={primary}
          />
          <circle
            cx={cx}
            cy={cy - u * 0.01}
            r={u * (0.09 + subLevel * 0.008)}
            fill={accent}
          />
        </g>
      )}

      {tier === 10 && (
        <g>
          {Array.from({ length: 3 + Math.floor((subLevel * 7) / 9) }).map(
            (_, t, arr) => {
              const tx =
                cx +
                (t - (arr.length - 1) / 2) * u * (1.0 / Math.max(3, arr.length));
              return (
                <line
                  key={t}
                  x1={tx}
                  y1={cy + u * 0.15}
                  x2={tx + (t % 2 === 0 ? -1 : 1) * u * 0.12}
                  y2={cy + u * (0.55 + subLevel * 0.02)}
                  stroke={primary}
                  strokeWidth={Math.max(1.8, u * 0.095)}
                  strokeLinecap="round"
                />
              );
            }
          )}
          <polygon
            points={`${cx},${cy - u * (0.62 + subLevel * 0.015)} ${
              cx + u * 0.52
            },${cy + u * 0.05} ${cx - u * 0.52},${cy + u * 0.05}`}
            fill={secondary}
          />
          <circle cx={cx} cy={cy + u * 0.05} r={u * 0.42} fill={secondary} />
          {renderEyes(cy + u * 0.08, u * 0.22, u * 0.08, false, accent)}
          {subLevel >= 3 && (
            <circle cx={cx} cy={cy - u * 0.12} r={u * 0.09} fill={accent} />
          )}
        </g>
      )}

      {tier === 11 && (
        <g>
          {Array.from({ length: 6 + subLevel }).map((_, i, arr) => {
            const ang = i * ((Math.PI * 2) / arr.length);
            return (
              <circle
                key={i}
                cx={cx + Math.cos(ang) * u * 0.6}
                cy={cy + Math.sin(ang) * u * 0.6}
                r={u * 0.12}
                fill={primary}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={u * 0.52} fill={secondary} />
          <circle cx={cx} cy={cy} r={u * 0.36} fill={primary} />
          {subLevel >= 4 && (
            <circle
              cx={cx}
              cy={cy}
              r={u * 0.26}
              fill="none"
              stroke={accent}
              strokeWidth={1.1}
            />
          )}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - u * (0.24 + subLevel * 0.01)}
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.08)}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + u * 0.22}
            y2={cy + u * 0.1}
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.08)}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={u * 0.09} fill={accent} />
        </g>
      )}

      {tier === 12 && (
        <g>
          {subLevel >= 2 &&
            renderWings(cy, u * (0.85 + subLevel * 0.02), primary)}
          <g
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.09)}
            strokeLinecap="round"
          >
            <line
              x1={cx - u * 0.22}
              y1={cy - u * 0.3}
              x2={cx - u * 0.48}
              y2={cy - u * (0.62 + subLevel * 0.02)}
            />
            <line
              x1={cx + u * 0.22}
              y1={cy - u * 0.3}
              x2={cx + u * 0.48}
              y2={cy - u * (0.62 + subLevel * 0.02)}
            />
            <line
              x1={cx - u * 0.3}
              y1={cy + u * 0.15}
              x2={cx - u * (0.65 + subLevel * 0.02)}
              y2={cy + u * 0.05}
            />
            <line
              x1={cx + u * 0.3}
              y1={cy + u * 0.15}
              x2={cx + u * (0.65 + subLevel * 0.02)}
              y2={cy + u * 0.05}
            />
          </g>
          <circle cx={cx} cy={cy + u * 0.04} r={u * 0.44} fill={secondary} />
          {renderEyes(cy, u * 0.19, u * 0.085, true)}
          {subLevel >= 4 && (
            <circle cx={cx} cy={cy + u * 0.42} r={u * 0.11} fill={accent} />
          )}
        </g>
      )}

      {tier === 13 && (
        <g>
          {(() => {
            const wg = 0.82 + subLevel * 0.025;
            return (
              <>
                <ellipse
                  cx={cx - u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  rx={u * 0.36 * wg}
                  ry={u * 0.29}
                  fill={secondary}
                />
                <ellipse
                  cx={cx + u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  rx={u * 0.36 * wg}
                  ry={u * 0.29}
                  fill={secondary}
                />
                <ellipse
                  cx={cx - u * 0.34 * wg}
                  cy={cy + u * 0.22}
                  rx={u * 0.27 * wg}
                  ry={u * 0.27}
                  fill={primary}
                />
                <ellipse
                  cx={cx + u * 0.34 * wg}
                  cy={cy + u * 0.22}
                  rx={u * 0.27 * wg}
                  ry={u * 0.27}
                  fill={primary}
                />
                <circle
                  cx={cx - u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  r={u * 0.11}
                  fill={accent}
                />
                <circle
                  cx={cx + u * 0.42 * wg}
                  cy={cy - u * 0.26}
                  r={u * 0.11}
                  fill={accent}
                />
                {subLevel >= 4 && (
                  <>
                    <circle
                      cx={cx - u * 0.32 * wg}
                      cy={cy + u * 0.22}
                      r={u * 0.08}
                      fill={accent}
                    />
                    <circle
                      cx={cx + u * 0.32 * wg}
                      cy={cy + u * 0.22}
                      r={u * 0.08}
                      fill={accent}
                    />
                  </>
                )}
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={u * 0.14}
                  ry={u * 0.45}
                  fill={primary}
                />
              </>
            );
          })()}
        </g>
      )}

      {tier === 14 && (
        <g>
          {renderWings(cy, u * (0.9 + subLevel * 0.02), primary)}
          <ellipse
            cx={cx}
            cy={cy}
            rx={u * 0.68}
            ry={u * 0.24}
            fill="none"
            stroke={secondary}
            strokeWidth={Math.max(2, u * 0.1)}
          />
          {subLevel >= 2 && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={u * 0.24}
              ry={u * 0.68}
              fill="none"
              stroke={secondary}
              strokeWidth={Math.max(2, u * 0.1)}
            />
          )}
          {subLevel >= 6 && (
            <circle
              cx={cx}
              cy={cy}
              r={u * 0.56}
              fill="none"
              stroke={secondary}
              strokeWidth={Math.max(1.8, u * 0.08)}
            />
          )}
          <circle cx={cx} cy={cy} r={u * 0.25} fill={accent} />
          <circle cx={cx} cy={cy} r={u * 0.11} fill={eyeColor} />
        </g>
      )}

      {tier === 15 && (
        <g>
          {(() => {
            const heads =
              subLevel < 2 ? 1 : subLevel < 5 ? 2 : subLevel < 8 ? 3 : 5;
            const hr =
              u * (heads <= 2 ? 0.26 : heads === 3 ? 0.23 : 0.19);
            return (
              <>
                <g
                  stroke={primary}
                  strokeWidth={Math.max(2.2, u * 0.12)}
                  strokeLinecap="round"
                >
                  {Array.from({ length: heads }).map((_, h) => {
                    const off =
                      heads === 1
                        ? 0
                        : (h - (heads - 1) / 2) *
                          (1.15 / Math.max(1, heads - 1));
                    const hx = cx + off * u * 0.52;
                    const hy = cy - u * 0.28 + Math.abs(off) * u * 0.26;
                    return (
                      <line
                        key={h}
                        x1={cx}
                        y1={cy + u * 0.55}
                        x2={hx}
                        y2={hy}
                      />
                    );
                  })}
                </g>
                {Array.from({ length: heads }).map((_, h) => {
                  const off =
                    heads === 1
                      ? 0
                      : (h - (heads - 1) / 2) *
                        (1.15 / Math.max(1, heads - 1));
                  const hx = cx + off * u * 0.52;
                  const hy = cy - u * 0.28 + Math.abs(off) * u * 0.26;
                  return (
                    <g key={h}>
                      <circle cx={hx} cy={hy} r={hr} fill={secondary} />
                      <circle cx={hx} cy={hy} r={hr * 0.34} fill={accent} />
                    </g>
                  );
                })}
              </>
            );
          })()}
        </g>
      )}

      {tier === 16 && (
        <g>
          <polygon
            points={`${cx - u * 0.42},${cy + u * 0.05} ${cx + u * 0.42},${
              cy + u * 0.05
            } ${cx},${cy + u * 0.72}`}
            fill={primary}
          />
          {Array.from({ length: Math.floor(subLevel / 2) }).map((_, w) => {
            const side = w % 2 === 0 ? -1 : 1;
            const row = Math.floor(w / 2);
            return (
              <circle
                key={w}
                cx={cx + side * u * (0.58 + row * 0.08)}
                cy={cy - u * 0.05 + row * u * 0.22}
                r={u * 0.085}
                fill={accent}
              />
            );
          })}
          <circle cx={cx} cy={cy - u * 0.12} r={u * 0.36} fill={secondary} />
          <ellipse
            cx={cx}
            cy={cy - u * 0.35}
            rx={u * 0.42}
            ry={u * 0.17}
            fill={primary}
          />
          <circle
            cx={cx}
            cy={cy - u * 0.38}
            r={u * (0.09 + subLevel * 0.005)}
            fill={accent}
          />
          {renderEyes(cy - u * 0.08, u * 0.16, u * 0.07, false, accent)}
        </g>
      )}

      {tier === 17 && (
        <g>
          {renderWings(
            cy - u * 0.1,
            u * (0.82 + subLevel * 0.025),
            accent
          )}
          {subLevel >= 4 && (
            <g
              stroke={primary}
              strokeWidth={Math.max(1.8, u * 0.08)}
              strokeLinecap="round"
            >
              <line
                x1={cx - u * 0.65}
                y1={cy + u * 0.55}
                x2={cx + u * 0.65}
                y2={cy - u * 0.55}
              />
              <line
                x1={cx + u * 0.65}
                y1={cy + u * 0.55}
                x2={cx - u * 0.65}
                y2={cy - u * 0.55}
              />
            </g>
          )}
          <polygon
            points={`${cx},${cy - u * 0.65} ${cx + u * 0.46},${
              cy - u * 0.15
            } ${cx + u * 0.34},${cy + u * 0.52} ${cx},${cy + u * 0.65} ${
              cx - u * 0.34
            },${cy + u * 0.52} ${cx - u * 0.46},${cy - u * 0.15}`}
            fill={secondary}
          />
          <line
            x1={cx - u * 0.26}
            y1={cy - u * 0.05}
            x2={cx + u * 0.26}
            y2={cy - u * 0.05}
            stroke={isLocked ? primary : '#171725'}
            strokeWidth={Math.max(2.5, u * 0.11)}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy - u * 0.05}
            x2={cx}
            y2={cy + u * 0.42}
            stroke={isLocked ? primary : '#171725'}
            strokeWidth={Math.max(2.5, u * 0.11)}
            strokeLinecap="round"
          />
        </g>
      )}

      {tier === 18 && (
        <g>
          <polygon
            points={`${cx},${cy - u * 0.72} ${cx + u * 0.64},${
              cy + u * 0.38
            } ${cx - u * 0.64},${cy + u * 0.38}`}
            fill={secondary}
          />
          {subLevel >= 1 && (
            <polygon
              points={`${cx},${cy + u * 0.72} ${cx + u * 0.64},${
                cy - u * 0.38
              } ${cx - u * 0.64},${cy - u * 0.38}`}
              fill={primary}
              opacity={0.85}
            />
          )}
          {subLevel >= 4 &&
            Array.from({ length: subLevel >= 7 ? 6 : 3 }).map((_, n, arr) => {
              const ang = -Math.PI / 2 + n * ((Math.PI * 2) / arr.length);
              return (
                <circle
                  key={n}
                  cx={cx + Math.cos(ang) * u * 0.72}
                  cy={cy + Math.sin(ang) * u * 0.72}
                  r={u * 0.08}
                  fill={accent}
                />
              );
            })}
          <circle
            cx={cx}
            cy={cy}
            r={u * (0.2 + subLevel * 0.008)}
            fill={accent}
          />
          <circle cx={cx} cy={cy} r={u * 0.1} fill={eyeColor} />
        </g>
      )}

      {tier >= 19 && (
        <g>
          <ellipse
            cx={cx}
            cy={cy}
            rx={u * 0.82}
            ry={u * 0.26}
            fill="none"
            stroke={accent}
            strokeWidth={Math.max(2, u * 0.09)}
          />
          {subLevel >= 3 && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={u * 0.26}
              ry={u * 0.82}
              fill="none"
              stroke={accent}
              strokeWidth={Math.max(2, u * 0.09)}
            />
          )}
          <polygon
            points={`${cx - u * 0.42},${cy - u * 0.35} ${cx - u * 0.32},${
              cy - u * 0.72
            } ${cx - u * 0.12},${cy - u * 0.48} ${cx},${cy - u * 0.82} ${
              cx + u * 0.12
            },${cy - u * 0.48} ${cx + u * 0.32},${cy - u * 0.72} ${
              cx + u * 0.42
            },${cy - u * 0.35}`}
            fill={isLocked ? primary : '#FFD740'}
          />
          <circle cx={cx} cy={cy} r={u * 0.44} fill={secondary} />
          <circle
            cx={cx}
            cy={cy}
            r={u * 0.28}
            fill={isLocked ? primary : '#0B0719'}
          />
          <circle
            cx={cx - u * 0.1}
            cy={cy - u * 0.04}
            r={u * 0.06}
            fill={accent}
          />
          <circle
            cx={cx + u * 0.1}
            cy={cy - u * 0.04}
            r={u * 0.06}
            fill={accent}
          />
        </g>
      )}

      {/* 3b. Sub-Level Forehead Gem / Apex Diadem (Skip spiky crown on Tier 0 since its lotus blossom is the crown) */}
      {tier > 0 && subLevel >= 5 && subLevel < 8 && (
        <circle
          cx={cx}
          cy={cy - u * 0.78}
          r={u * 0.075}
          fill={accent}
          opacity={isLocked ? 0.4 : 0.95}
        />
      )}
      {tier > 0 && subLevel >= 8 && (
        <polygon
          points={`${cx - u * 0.22},${cy - u * 0.72} ${cx - u * 0.16},${
            cy - u * 0.9
          } ${cx - u * 0.06},${cy - u * 0.79} ${cx},${cy - u * 0.96} ${
            cx + u * 0.06
          },${cy - u * 0.79} ${cx + u * 0.16},${cy - u * 0.9} ${
            cx + u * 0.22
          },${cy - u * 0.72}`}
          fill={isLocked ? primary : '#FFD54F'}
        />
      )}

      {/* 4. Solid Tilted Bar Reaching Circle Edges with 90% Opacity & 2/3 Scaled Zigzag */}
      {isLocked && (
        <g transform={`rotate(-26 ${cx} ${cy})`}>
          {/* Drop shadow */}
          <rect
            x={cx - radius * 0.92}
            y={cy - radius * 0.16 + 0.9}
            width={radius * 1.84}
            height={radius * 0.32}
            rx={radius * 0.08}
            fill="#050509"
            opacity={0.6}
          />
          {/* Solid tilted bar body (90% opacity, spanning full inner circle diameter) */}
          <rect
            x={cx - radius * 0.92}
            y={cy - radius * 0.16}
            width={radius * 1.84}
            height={radius * 0.32}
            rx={radius * 0.08}
            fill="#231F36"
            fillOpacity={0.9}
            stroke={realPrimary}
            strokeOpacity={0.65}
            strokeWidth={0.9}
          />
          {/* Zigzag line across the bar (2/3 scaled height & stroke) */}
          <polyline
            points={Array.from({ length: 15 }, (_, i) => {
              const barW = radius * 1.84;
              const barH = radius * 0.32;
              const margin = barW * 0.08;
              const startX = cx - barW / 2 + margin;
              const span = barW - margin * 2;
              const amp = barH * 0.24;
              const zx = startX + span * (i / 14);
              const zy =
                i === 0 || i === 14 ? cy : cy + (i % 2 === 1 ? -amp : amp);
              return `${zx},${zy}`;
            }).join(' ')}
            fill="none"
            stroke={realPrimary}
            strokeOpacity={0.85}
            strokeWidth={0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
