import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GameMasterService } from './game-master.service.js';

@Injectable()
export class GameMasterSyncService {
  private readonly logger = new Logger(GameMasterSyncService.name);
  private readonly gameMasterUrl: string;
  private lastEtag: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly gameMasterService: GameMasterService,
  ) {
    this.gameMasterUrl = this.configService.get<string>(
      'GAMEMASTER_URL',
      'https://raw.githubusercontent.com/PokeMiners/game_masters/refs/heads/master/latest/latest.json',
    );
  }

  @Cron('0 3 * * *')
  async syncGameMaster(): Promise<void> {
    this.logger.log('Starting GameMaster sync...');

    try {
      const headers: Record<string, string> = {};
      if (this.lastEtag) {
        headers['If-None-Match'] = this.lastEtag;
      }

      const response = await firstValueFrom(
        this.httpService.get(this.gameMasterUrl, { headers }),
      );

      if (response.status === 304) {
        this.logger.log('GameMaster unchanged, skipping sync.');
        return;
      }

      const etag = response.headers['etag'];
      if (etag) this.lastEtag = etag;

      const templates = Array.isArray(response.data) ? response.data : [];
      let synced = 0;

      for (const item of templates) {
        const templateId: string = item.templateId || '';

        if (templateId.startsWith('V') && templateId.includes('_POKEMON_')) {
          await this.gameMasterService.upsertTemplate(
            templateId,
            'POKEMON',
            item.data?.pokemonSettings || item,
          );
          synced++;
        } else if (
          templateId.startsWith('V') &&
          templateId.includes('_MOVE_')
        ) {
          await this.gameMasterService.upsertTemplate(
            templateId,
            'MOVE',
            item.data?.moveSettings || item,
          );
          synced++;
        } else if (templateId === 'PLAYER_LEVEL_SETTINGS') {
          await this.gameMasterService.upsertTemplate(
            templateId,
            'PLAYER_LEVEL',
            item.data?.playerLevel || item,
          );
          synced++;
        } else if (templateId.startsWith('COMBAT_V')) {
          await this.gameMasterService.upsertTemplate(
            templateId,
            'COMBAT_MOVE',
            item.data?.combatMove || item,
          );
          synced++;
        }
      }

      this.logger.log(
        `GameMaster sync complete. ${synced} templates upserted.`,
      );
    } catch (error: any) {
      this.logger.error('GameMaster sync failed', error?.message);
    }
  }
}
