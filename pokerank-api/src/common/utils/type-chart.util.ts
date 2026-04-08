import { PokemonType } from '../constants/enums.js';

const SUPER_EFFECTIVE = 1.6;
const NOT_EFFECTIVE = 0.625;
const DOUBLE_RESIST = 0.390625;
const IMMUNE = 0.390625; // In Pokemon GO, immunity = double resist

type EffectivenessMap = Partial<Record<PokemonType, number>>;

const TYPE_CHART: Record<PokemonType, EffectivenessMap> = {
  [PokemonType.NORMAL]: {
    [PokemonType.ROCK]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
    [PokemonType.GHOST]: IMMUNE,
  },
  [PokemonType.FIRE]: {
    [PokemonType.GRASS]: SUPER_EFFECTIVE,
    [PokemonType.ICE]: SUPER_EFFECTIVE,
    [PokemonType.BUG]: SUPER_EFFECTIVE,
    [PokemonType.STEEL]: SUPER_EFFECTIVE,
    [PokemonType.FIRE]: NOT_EFFECTIVE,
    [PokemonType.WATER]: NOT_EFFECTIVE,
    [PokemonType.ROCK]: NOT_EFFECTIVE,
    [PokemonType.DRAGON]: NOT_EFFECTIVE,
  },
  [PokemonType.WATER]: {
    [PokemonType.FIRE]: SUPER_EFFECTIVE,
    [PokemonType.GROUND]: SUPER_EFFECTIVE,
    [PokemonType.ROCK]: SUPER_EFFECTIVE,
    [PokemonType.WATER]: NOT_EFFECTIVE,
    [PokemonType.GRASS]: NOT_EFFECTIVE,
    [PokemonType.DRAGON]: NOT_EFFECTIVE,
  },
  [PokemonType.ELECTRIC]: {
    [PokemonType.WATER]: SUPER_EFFECTIVE,
    [PokemonType.FLYING]: SUPER_EFFECTIVE,
    [PokemonType.ELECTRIC]: NOT_EFFECTIVE,
    [PokemonType.GRASS]: NOT_EFFECTIVE,
    [PokemonType.DRAGON]: NOT_EFFECTIVE,
    [PokemonType.GROUND]: IMMUNE,
  },
  [PokemonType.GRASS]: {
    [PokemonType.WATER]: SUPER_EFFECTIVE,
    [PokemonType.GROUND]: SUPER_EFFECTIVE,
    [PokemonType.ROCK]: SUPER_EFFECTIVE,
    [PokemonType.FIRE]: NOT_EFFECTIVE,
    [PokemonType.GRASS]: NOT_EFFECTIVE,
    [PokemonType.POISON]: NOT_EFFECTIVE,
    [PokemonType.FLYING]: NOT_EFFECTIVE,
    [PokemonType.BUG]: NOT_EFFECTIVE,
    [PokemonType.DRAGON]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
  },
  [PokemonType.ICE]: {
    [PokemonType.GRASS]: SUPER_EFFECTIVE,
    [PokemonType.GROUND]: SUPER_EFFECTIVE,
    [PokemonType.FLYING]: SUPER_EFFECTIVE,
    [PokemonType.DRAGON]: SUPER_EFFECTIVE,
    [PokemonType.FIRE]: NOT_EFFECTIVE,
    [PokemonType.WATER]: NOT_EFFECTIVE,
    [PokemonType.ICE]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
  },
  [PokemonType.FIGHTING]: {
    [PokemonType.NORMAL]: SUPER_EFFECTIVE,
    [PokemonType.ICE]: SUPER_EFFECTIVE,
    [PokemonType.ROCK]: SUPER_EFFECTIVE,
    [PokemonType.DARK]: SUPER_EFFECTIVE,
    [PokemonType.STEEL]: SUPER_EFFECTIVE,
    [PokemonType.POISON]: NOT_EFFECTIVE,
    [PokemonType.FLYING]: NOT_EFFECTIVE,
    [PokemonType.PSYCHIC]: NOT_EFFECTIVE,
    [PokemonType.BUG]: NOT_EFFECTIVE,
    [PokemonType.FAIRY]: NOT_EFFECTIVE,
    [PokemonType.GHOST]: IMMUNE,
  },
  [PokemonType.POISON]: {
    [PokemonType.GRASS]: SUPER_EFFECTIVE,
    [PokemonType.FAIRY]: SUPER_EFFECTIVE,
    [PokemonType.POISON]: NOT_EFFECTIVE,
    [PokemonType.GROUND]: NOT_EFFECTIVE,
    [PokemonType.ROCK]: NOT_EFFECTIVE,
    [PokemonType.GHOST]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: IMMUNE,
  },
  [PokemonType.GROUND]: {
    [PokemonType.FIRE]: SUPER_EFFECTIVE,
    [PokemonType.ELECTRIC]: SUPER_EFFECTIVE,
    [PokemonType.POISON]: SUPER_EFFECTIVE,
    [PokemonType.ROCK]: SUPER_EFFECTIVE,
    [PokemonType.STEEL]: SUPER_EFFECTIVE,
    [PokemonType.GRASS]: NOT_EFFECTIVE,
    [PokemonType.BUG]: NOT_EFFECTIVE,
    [PokemonType.FLYING]: IMMUNE,
  },
  [PokemonType.FLYING]: {
    [PokemonType.GRASS]: SUPER_EFFECTIVE,
    [PokemonType.FIGHTING]: SUPER_EFFECTIVE,
    [PokemonType.BUG]: SUPER_EFFECTIVE,
    [PokemonType.ELECTRIC]: NOT_EFFECTIVE,
    [PokemonType.ROCK]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
  },
  [PokemonType.PSYCHIC]: {
    [PokemonType.FIGHTING]: SUPER_EFFECTIVE,
    [PokemonType.POISON]: SUPER_EFFECTIVE,
    [PokemonType.PSYCHIC]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
    [PokemonType.DARK]: IMMUNE,
  },
  [PokemonType.BUG]: {
    [PokemonType.GRASS]: SUPER_EFFECTIVE,
    [PokemonType.PSYCHIC]: SUPER_EFFECTIVE,
    [PokemonType.DARK]: SUPER_EFFECTIVE,
    [PokemonType.FIRE]: NOT_EFFECTIVE,
    [PokemonType.FIGHTING]: NOT_EFFECTIVE,
    [PokemonType.POISON]: NOT_EFFECTIVE,
    [PokemonType.FLYING]: NOT_EFFECTIVE,
    [PokemonType.GHOST]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
    [PokemonType.FAIRY]: NOT_EFFECTIVE,
  },
  [PokemonType.ROCK]: {
    [PokemonType.FIRE]: SUPER_EFFECTIVE,
    [PokemonType.ICE]: SUPER_EFFECTIVE,
    [PokemonType.FLYING]: SUPER_EFFECTIVE,
    [PokemonType.BUG]: SUPER_EFFECTIVE,
    [PokemonType.FIGHTING]: NOT_EFFECTIVE,
    [PokemonType.GROUND]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
  },
  [PokemonType.GHOST]: {
    [PokemonType.PSYCHIC]: SUPER_EFFECTIVE,
    [PokemonType.GHOST]: SUPER_EFFECTIVE,
    [PokemonType.DARK]: NOT_EFFECTIVE,
    [PokemonType.NORMAL]: IMMUNE,
  },
  [PokemonType.DRAGON]: {
    [PokemonType.DRAGON]: SUPER_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
    [PokemonType.FAIRY]: IMMUNE,
  },
  [PokemonType.DARK]: {
    [PokemonType.PSYCHIC]: SUPER_EFFECTIVE,
    [PokemonType.GHOST]: SUPER_EFFECTIVE,
    [PokemonType.FIGHTING]: NOT_EFFECTIVE,
    [PokemonType.DARK]: NOT_EFFECTIVE,
    [PokemonType.FAIRY]: NOT_EFFECTIVE,
  },
  [PokemonType.STEEL]: {
    [PokemonType.ICE]: SUPER_EFFECTIVE,
    [PokemonType.ROCK]: SUPER_EFFECTIVE,
    [PokemonType.FAIRY]: SUPER_EFFECTIVE,
    [PokemonType.FIRE]: NOT_EFFECTIVE,
    [PokemonType.WATER]: NOT_EFFECTIVE,
    [PokemonType.ELECTRIC]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
  },
  [PokemonType.FAIRY]: {
    [PokemonType.FIGHTING]: SUPER_EFFECTIVE,
    [PokemonType.DRAGON]: SUPER_EFFECTIVE,
    [PokemonType.DARK]: SUPER_EFFECTIVE,
    [PokemonType.FIRE]: NOT_EFFECTIVE,
    [PokemonType.POISON]: NOT_EFFECTIVE,
    [PokemonType.STEEL]: NOT_EFFECTIVE,
  },
};

export function getTypeEffectiveness(
  attackType: PokemonType,
  defenderTypes: PokemonType[],
): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const chart = TYPE_CHART[attackType];
    multiplier *= chart[defType] ?? 1;
  }
  return multiplier;
}

export function getWeaknesses(types: PokemonType[]): PokemonType[] {
  const weaknesses: PokemonType[] = [];
  for (const attackType of Object.values(PokemonType)) {
    const effectiveness = getTypeEffectiveness(attackType, types);
    if (effectiveness > 1) {
      weaknesses.push(attackType);
    }
  }
  return weaknesses;
}

export function getResistances(types: PokemonType[]): PokemonType[] {
  const resistances: PokemonType[] = [];
  for (const attackType of Object.values(PokemonType)) {
    const effectiveness = getTypeEffectiveness(attackType, types);
    if (effectiveness < 1) {
      resistances.push(attackType);
    }
  }
  return resistances;
}
