export interface GameMasterTemplate {
  templateId: string;
  data?: any;
  pokemonSettings?: {
    pokemonId: string;
    type: string;
    type2?: string;
    stats: {
      baseAttack: number;
      baseDefense: number;
      baseStamina: number;
    };
    quickMoves?: string[];
    cinematicMoves?: string[];
    eliteMoves?: string[];
  };
  moveSettings?: {
    movementId: string;
    animationId: number;
    pokemonType: string;
    power: number;
    staminaLossScalar: number;
    durationMs: number;
    energyDelta: number;
  };
  combatMove?: {
    uniqueId: string;
    type: string;
    power: number;
    energyDelta: number;
  };
  playerLevel?: {
    cpMultiplier: number[];
  };
}

export interface GameMasterCacheEntry {
  templateId: string;
  templateType: string;
  data: any;
  syncedAt: Date;
}

export interface CpMultiplierTable {
  [level: number]: number;
}
