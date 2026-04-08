/**
 * Pokémon GO type effectiveness chart.
 * Keys are defending types; values list attacking types that are super-effective.
 */
export const WEAK_TO: Record<string, string[]> = {
  normal: ['fighting'],
  fire: ['water', 'ground', 'rock'],
  water: ['electric', 'grass'],
  electric: ['ground'],
  grass: ['fire', 'ice', 'poison', 'flying', 'bug'],
  ice: ['fire', 'fighting', 'rock', 'steel'],
  fighting: ['flying', 'psychic', 'fairy'],
  poison: ['ground', 'psychic'],
  ground: ['water', 'grass', 'ice'],
  flying: ['electric', 'ice', 'rock'],
  psychic: ['bug', 'ghost', 'dark'],
  bug: ['fire', 'flying', 'rock'],
  rock: ['water', 'grass', 'fighting', 'ground', 'steel'],
  ghost: ['ghost', 'dark'],
  dragon: ['ice', 'dragon', 'fairy'],
  dark: ['fighting', 'bug', 'fairy'],
  steel: ['fire', 'fighting', 'ground'],
  fairy: ['poison', 'steel'],
};

export const RESISTANT_TO: Record<string, string[]> = {
  normal: [],
  fire: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
  water: ['fire', 'water', 'ice', 'steel'],
  electric: ['electric', 'flying', 'steel'],
  grass: ['water', 'electric', 'grass', 'ground'],
  ice: ['ice'],
  fighting: ['bug', 'rock', 'dark'],
  poison: ['grass', 'fighting', 'poison', 'bug', 'fairy'],
  ground: ['poison', 'rock'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'psychic'],
  bug: ['grass', 'fighting', 'ground'],
  rock: ['normal', 'fire', 'poison', 'flying'],
  ghost: ['poison', 'bug'],
  dragon: ['fire', 'water', 'electric', 'grass'],
  dark: ['ghost', 'dark'],
  steel: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'],
  fairy: ['fighting', 'bug', 'dark'],
};

export const IMMUNE_TO: Record<string, string[]> = {
  normal: ['ghost'],
  fire: [],
  water: [],
  electric: [],
  grass: [],
  ice: [],
  fighting: [],
  poison: [],
  ground: ['electric'],
  flying: ['ground'],
  psychic: [],
  bug: [],
  rock: [],
  ghost: ['normal', 'fighting'],
  dragon: [],
  dark: ['psychic'],
  steel: ['poison'],
  fairy: ['dragon'],
};

export function getTypeEffectiveness(types: string[]): {
  weakTo: string[];
  resistantTo: string[];
  immuneTo: string[];
} {
  const weakSet = new Set<string>();
  const resistSet = new Set<string>();
  const immuneSet = new Set<string>();

  for (const t of types) {
    const lc = t.toLowerCase();
    for (const w of WEAK_TO[lc] || []) weakSet.add(w);
    for (const r of RESISTANT_TO[lc] || []) resistSet.add(r);
    for (const i of IMMUNE_TO[lc] || []) immuneSet.add(i);
  }

  for (const r of resistSet) weakSet.delete(r);
  for (const i of immuneSet) {
    weakSet.delete(i);
    resistSet.delete(i);
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    weakTo: [...weakSet].map(capitalize),
    resistantTo: [...resistSet].map(capitalize),
    immuneTo: [...immuneSet].map(capitalize),
  };
}
