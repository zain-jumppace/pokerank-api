export enum PokemonType {
  NORMAL = 'Normal',
  FIRE = 'Fire',
  WATER = 'Water',
  ELECTRIC = 'Electric',
  GRASS = 'Grass',
  ICE = 'Ice',
  FIGHTING = 'Fighting',
  POISON = 'Poison',
  GROUND = 'Ground',
  FLYING = 'Flying',
  PSYCHIC = 'Psychic',
  BUG = 'Bug',
  ROCK = 'Rock',
  GHOST = 'Ghost',
  DRAGON = 'Dragon',
  DARK = 'Dark',
  STEEL = 'Steel',
  FAIRY = 'Fairy',
}

export enum League {
  GREAT = 'great',
  ULTRA = 'ultra',
  MASTER = 'master',
}

export enum BattleMode {
  PVE = 'pve',
  PVP = 'pvp',
}

export enum RankingSort {
  META_RELEVANCE = 'metaRelevance',
  DPS = 'dps',
  TDO = 'tdo',
  MOVESET_EFFICIENCY = 'movesetEfficiency',
}

export enum RoleTag {
  ATTACKER = 'attacker',
  TANK = 'tank',
  SUPPORT = 'support',
}

export enum EventVisibility {
  LIVE = 'live',
  SCHEDULED = 'scheduled',
  HIDDEN = 'hidden',
}

export enum EventStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  ALL = 'all',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum RecommendationAction {
  EVOLVE = 'EVOLVE',
  POWER_UP = 'POWER_UP',
}

export enum MoveSlot {
  FAST = 'fast',
  CHARGE = 'charge',
  ELITE = 'elite',
}

export const LEAGUE_CP_CAPS: Record<League, number> = {
  [League.GREAT]: 1500,
  [League.ULTRA]: 2500,
  [League.MASTER]: Infinity,
};
