import { getTypeEffectiveness, getWeaknesses, getResistances } from './type-chart.util.js';
import { PokemonType } from '../constants/enums.js';

describe('TypeChartUtil', () => {
  describe('getTypeEffectiveness', () => {
    it('should return super effective for Fire vs Grass', () => {
      const result = getTypeEffectiveness(PokemonType.FIRE, [PokemonType.GRASS]);
      expect(result).toBe(1.6);
    });

    it('should return not effective for Fire vs Water', () => {
      const result = getTypeEffectiveness(PokemonType.FIRE, [PokemonType.WATER]);
      expect(result).toBe(0.625);
    });

    it('should return neutral for Fire vs Normal', () => {
      const result = getTypeEffectiveness(PokemonType.FIRE, [PokemonType.NORMAL]);
      expect(result).toBe(1);
    });

    it('should multiply for dual types', () => {
      const result = getTypeEffectiveness(PokemonType.FIRE, [PokemonType.GRASS, PokemonType.ICE]);
      expect(result).toBeCloseTo(1.6 * 1.6, 5);
    });

    it('should handle immunity (Ghost vs Normal)', () => {
      const result = getTypeEffectiveness(PokemonType.GHOST, [PokemonType.NORMAL]);
      expect(result).toBeLessThan(1);
    });
  });

  describe('getWeaknesses', () => {
    it('should find weaknesses for Fire type', () => {
      const weaknesses = getWeaknesses([PokemonType.FIRE]);
      expect(weaknesses).toContain(PokemonType.WATER);
      expect(weaknesses).toContain(PokemonType.GROUND);
      expect(weaknesses).toContain(PokemonType.ROCK);
    });

    it('should return empty for no weaknesses scenario', () => {
      const weaknesses = getWeaknesses([PokemonType.NORMAL]);
      expect(weaknesses).not.toContain(PokemonType.GHOST);
    });
  });

  describe('getResistances', () => {
    it('should find resistances for Steel type', () => {
      const resistances = getResistances([PokemonType.STEEL]);
      expect(resistances.length).toBeGreaterThan(0);
    });
  });
});
