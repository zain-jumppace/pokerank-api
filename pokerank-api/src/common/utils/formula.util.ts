import { PokemonType } from '../constants/enums.js';
import { getTypeEffectiveness } from './type-chart.util.js';

export interface PokemonStats {
  baseAtk: number;
  baseDef: number;
  baseSta: number;
}

export interface IVSet {
  ivAtk: number;
  ivDef: number;
  ivSta: number;
}

export interface MoveData {
  power: number;
  durationMs: number;
  type: PokemonType;
}

export function calculateCP(
  stats: PokemonStats,
  ivs: IVSet,
  cpm: number,
): number {
  const atk = stats.baseAtk + ivs.ivAtk;
  const def = stats.baseDef + ivs.ivDef;
  const sta = stats.baseSta + ivs.ivSta;

  const cp = Math.floor(
    (atk * Math.sqrt(def) * Math.sqrt(sta) * cpm * cpm) / 10,
  );
  return Math.max(cp, 10);
}

export function calculateDPS(
  move: MoveData,
  attackerTypes: PokemonType[],
  defenderTypes: PokemonType[],
): number {
  const baseDps = move.power / (move.durationMs / 1000);
  const stab = attackerTypes.includes(move.type) ? 1.2 : 1;
  const effectiveness = getTypeEffectiveness(move.type, defenderTypes);
  return baseDps * stab * effectiveness;
}

export function calculateTDO(
  dps: number,
  stamina: number,
  cpm: number,
): number {
  return dps * stamina * cpm;
}

export function calculateStatProduct(
  stats: PokemonStats,
  ivs: IVSet,
  cpm: number,
): number {
  const atk = (stats.baseAtk + ivs.ivAtk) * cpm;
  const def = (stats.baseDef + ivs.ivDef) * cpm;
  const sta = Math.floor((stats.baseSta + ivs.ivSta) * cpm);
  return atk * def * sta;
}

export function calculateIVPercent(ivs: IVSet): number {
  return Math.round(((ivs.ivAtk + ivs.ivDef + ivs.ivSta) / 45) * 100);
}

export function findOptimalIVs(
  stats: PokemonStats,
  cpCap: number,
  cpmTable: number[],
): { ivs: IVSet; level: number; cp: number; statProduct: number } | null {
  let best: {
    ivs: IVSet;
    level: number;
    cp: number;
    statProduct: number;
  } | null = null;

  for (let ivAtk = 0; ivAtk <= 15; ivAtk++) {
    for (let ivDef = 0; ivDef <= 15; ivDef++) {
      for (let ivSta = 0; ivSta <= 15; ivSta++) {
        const ivs: IVSet = { ivAtk, ivDef, ivSta };
        for (let level = cpmTable.length - 1; level >= 0; level--) {
          const cpm = cpmTable[level];
          const cp = calculateCP(stats, ivs, cpm);
          if (cp <= cpCap) {
            const sp = calculateStatProduct(stats, ivs, cpm);
            if (!best || sp > best.statProduct) {
              best = { ivs, level: level + 1, cp, statProduct: sp };
            }
            break;
          }
        }
      }
    }
  }
  return best;
}
