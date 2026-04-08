import { calculateCP, calculateDPS, calculateTDO, calculateStatProduct, calculateIVPercent } from './formula.util.js';
import { PokemonType } from '../constants/enums.js';

describe('FormulaUtil', () => {
  describe('calculateCP', () => {
    it('should calculate CP correctly', () => {
      const cp = calculateCP(
        { baseAtk: 190, baseDef: 172, baseSta: 163 },
        { ivAtk: 15, ivDef: 15, ivSta: 15 },
        0.7903,
      );
      expect(cp).toBeGreaterThan(0);
      expect(typeof cp).toBe('number');
    });

    it('should return minimum CP of 10', () => {
      const cp = calculateCP(
        { baseAtk: 1, baseDef: 1, baseSta: 1 },
        { ivAtk: 0, ivDef: 0, ivSta: 0 },
        0.094,
      );
      expect(cp).toBe(10);
    });

    it('should increase with higher IVs', () => {
      const stats = { baseAtk: 200, baseDef: 180, baseSta: 190 };
      const lowIV = calculateCP(stats, { ivAtk: 0, ivDef: 0, ivSta: 0 }, 0.5);
      const highIV = calculateCP(stats, { ivAtk: 15, ivDef: 15, ivSta: 15 }, 0.5);
      expect(highIV).toBeGreaterThan(lowIV);
    });
  });

  describe('calculateDPS', () => {
    it('should calculate base DPS', () => {
      const dps = calculateDPS(
        { power: 100, durationMs: 2000, type: PokemonType.FIRE },
        [PokemonType.WATER],
        [PokemonType.GRASS],
      );
      expect(dps).toBeGreaterThan(0);
    });

    it('should apply STAB bonus', () => {
      const move = { power: 100, durationMs: 2000, type: PokemonType.FIRE };
      const withStab = calculateDPS(move, [PokemonType.FIRE], [PokemonType.NORMAL]);
      const withoutStab = calculateDPS(move, [PokemonType.WATER], [PokemonType.NORMAL]);
      expect(withStab).toBeGreaterThan(withoutStab);
    });
  });

  describe('calculateTDO', () => {
    it('should calculate TDO correctly', () => {
      const tdo = calculateTDO(20, 200, 0.79);
      expect(tdo).toBe(20 * 200 * 0.79);
    });
  });

  describe('calculateStatProduct', () => {
    it('should calculate stat product correctly', () => {
      const sp = calculateStatProduct(
        { baseAtk: 190, baseDef: 172, baseSta: 163 },
        { ivAtk: 15, ivDef: 15, ivSta: 15 },
        0.79,
      );
      expect(sp).toBeGreaterThan(0);
    });
  });

  describe('calculateIVPercent', () => {
    it('should return 100 for perfect IVs', () => {
      expect(calculateIVPercent({ ivAtk: 15, ivDef: 15, ivSta: 15 })).toBe(100);
    });

    it('should return 0 for zero IVs', () => {
      expect(calculateIVPercent({ ivAtk: 0, ivDef: 0, ivSta: 0 })).toBe(0);
    });

    it('should return correct percentage for partial IVs', () => {
      const result = calculateIVPercent({ ivAtk: 15, ivDef: 12, ivSta: 14 });
      expect(result).toBe(Math.round((41 / 45) * 100));
    });
  });
});
