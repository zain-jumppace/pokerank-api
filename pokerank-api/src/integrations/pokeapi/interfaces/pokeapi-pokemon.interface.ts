export interface PokeApiPokemonResponse {
  id: number;
  name: string;
  base_experience: number;
  height: number;
  weight: number;
  types: Array<{
    slot: number;
    type: { name: string; url: string };
  }>;
  stats: Array<{
    base_stat: number;
    stat: { name: string };
  }>;
  sprites: {
    front_default: string;
    other?: {
      'official-artwork'?: {
        front_default: string;
      };
    };
  };
  moves: Array<{
    move: { name: string; url: string };
  }>;
}

export interface PokeApiSpeciesResponse {
  id: number;
  name: string;
  generation: { name: string; url: string };
  evolution_chain: { url: string };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
}

export interface PokeApiEvolutionChainResponse {
  id: number;
  chain: EvolutionChainLink;
}

export interface EvolutionChainLink {
  species: { name: string; url: string };
  evolves_to: EvolutionChainLink[];
  evolution_details: Array<{
    min_level?: number;
    item?: { name: string };
    trigger: { name: string };
  }>;
}
