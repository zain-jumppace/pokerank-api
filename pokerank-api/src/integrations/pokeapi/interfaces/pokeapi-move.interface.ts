export interface PokeApiMoveResponse {
  id: number;
  name: string;
  type: { name: string };
  power: number | null;
  pp: number;
  accuracy: number | null;
  priority: number;
  damage_class: { name: string };
  meta?: {
    category?: { name: string };
  };
}
