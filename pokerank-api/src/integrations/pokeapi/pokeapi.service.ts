import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, timer, catchError } from 'rxjs';
import {
  PokeApiPokemonResponse,
  PokeApiSpeciesResponse,
  PokeApiEvolutionChainResponse,
} from './interfaces/pokeapi-pokemon.interface.js';
import { PokeApiMoveResponse } from './interfaces/pokeapi-move.interface.js';

@Injectable()
export class PokeApiService {
  private readonly logger = new Logger(PokeApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'POKEAPI_BASE_URL',
      'https://pokeapi.co/api/v2',
    );
  }

  async getPokemon(id: number): Promise<PokeApiPokemonResponse> {
    return this.fetchWithRetry<PokeApiPokemonResponse>(`/pokemon/${id}`);
  }

  async getSpecies(id: number): Promise<PokeApiSpeciesResponse> {
    return this.fetchWithRetry<PokeApiSpeciesResponse>(
      `/pokemon-species/${id}`,
    );
  }

  async getEvolutionChain(id: number): Promise<PokeApiEvolutionChainResponse> {
    return this.fetchWithRetry<PokeApiEvolutionChainResponse>(
      `/evolution-chain/${id}`,
    );
  }

  async getMove(id: number): Promise<PokeApiMoveResponse> {
    return this.fetchWithRetry<PokeApiMoveResponse>(`/move/${id}`);
  }

  async getType(id: number): Promise<any> {
    return this.fetchWithRetry<any>(`/type/${id}`);
  }

  private async fetchWithRetry<T>(path: string): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`).pipe(
          retry({
            count: 3,
            delay: (_error, attempt) => timer(attempt * 1000),
          }),
          catchError((error) => {
            this.logger.error(`PokeAPI request failed: ${path}`, error.message);
            throw new ServiceUnavailableException('PokeAPI unavailable');
          }),
        ),
      );
      return response.data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('PokeAPI unavailable');
    }
  }
}
