import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { PokeApiService } from './integrations/pokeapi/pokeapi.service.js';
import { GameMasterSyncService } from './integrations/game-master/game-master.sync.service.js';

const logger = new Logger('Seed');

const GENERATION_MAP: Record<string, { gen: number; region: string }> = {
  'generation-i': { gen: 1, region: 'kanto' },
  'generation-ii': { gen: 2, region: 'johto' },
  'generation-iii': { gen: 3, region: 'hoenn' },
  'generation-iv': { gen: 4, region: 'sinnoh' },
  'generation-v': { gen: 5, region: 'unova' },
  'generation-vi': { gen: 6, region: 'kalos' },
  'generation-vii': { gen: 7, region: 'alola' },
  'generation-viii': { gen: 8, region: 'galar' },
  'generation-ix': { gen: 9, region: 'paldea' },
};

const MAX_POKEMON_ID = 386;
const BATCH_SIZE = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function seedPokemon(
  app: any,
  pokeApiService: PokeApiService,
): Promise<void> {
  const pokemonModel: Model<any> = app.get(getModelToken('Pokemon'));
  const moveModel: Model<any> = app.get(getModelToken('Move'));
  const pokemonMoveModel: Model<any> = app.get(getModelToken('PokemonMove'));
  const evolutionModel: Model<any> = app.get(getModelToken('Evolution'));

  const existingCount = await pokemonModel.countDocuments();
  if (existingCount >= MAX_POKEMON_ID) {
    logger.log(`Pokémon already seeded (${existingCount} docs). Skipping.`);
    return;
  }

  logger.log(`Seeding ${MAX_POKEMON_ID} Pokémon from PokeAPI...`);

  const seenMoves = new Set<number>();
  const seenEvolutionChains = new Set<number>();
  const allEvolutions: Array<{
    fromPokemonId: number;
    toPokemonId: number;
    candyCost?: number;
    conditions?: string;
  }> = [];

  for (let start = 1; start <= MAX_POKEMON_ID; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, MAX_POKEMON_ID);
    const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const [pokemon, species] = await Promise.all([
          pokeApiService.getPokemon(id),
          pokeApiService.getSpecies(id),
        ]);
        return { id, pokemon, species };
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.warn(`Failed to fetch Pokémon: ${result.reason}`);
        continue;
      }

      const { id, pokemon, species } = result.value;
      const genInfo = GENERATION_MAP[species.generation?.name] || {
        gen: 1,
        region: 'kanto',
      };

      const baseAtk =
        pokemon.stats.find((s) => s.stat.name === 'attack')?.base_stat ?? 0;
      const baseDef =
        pokemon.stats.find((s) => s.stat.name === 'defense')?.base_stat ?? 0;
      const baseSta =
        pokemon.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 0;

      const flavorEntry = species.flavor_text_entries?.find(
        (f) => f.language.name === 'en',
      );

      await pokemonModel.updateOne(
        { pokemonId: id },
        {
          pokemonId: id,
          name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
          types: pokemon.types.map((t) => t.type.name),
          baseAtk,
          baseDef,
          baseSta,
          generation: genInfo.gen,
          region: genInfo.region,
          spriteUrl:
            pokemon.sprites?.other?.['official-artwork']?.front_default ||
            pokemon.sprites?.front_default ||
            '',
          flavorText: flavorEntry?.flavor_text?.replace(/[\n\f\r]/g, ' ') || '',
          evolutionChainId: species.evolution_chain
            ? parseInt(species.evolution_chain.url.split('/').filter(Boolean).pop()!, 10)
            : undefined,
        },
        { upsert: true },
      );

      for (const moveEntry of pokemon.moves.slice(0, 8)) {
        const moveUrl = moveEntry.move.url;
        const moveId = parseInt(moveUrl.split('/').filter(Boolean).pop()!, 10);

        if (!seenMoves.has(moveId)) {
          seenMoves.add(moveId);
          try {
            const moveData = await pokeApiService.getMove(moveId);
            await moveModel.updateOne(
              { moveId },
              {
                moveId,
                name: moveData.name
                  .split('-')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' '),
                type: moveData.type.name,
                power: moveData.power ?? 0,
                energy: moveData.pp ?? 0,
                durationMs: 1000,
                isFast: moveData.damage_class?.name === 'physical',
                dps:
                  moveData.power && moveData.power > 0
                    ? Math.round(moveData.power / 1 * 100) / 100
                    : 0,
                pvpPower: moveData.power ?? 0,
                pvpEnergy: moveData.pp ?? 0,
              },
              { upsert: true },
            );
          } catch {
            logger.warn(`Failed to fetch move ${moveId}`);
          }
        }

        const moveId2 = parseInt(moveUrl.split('/').filter(Boolean).pop()!, 10);
        const moveSlot =
          pokemon.moves.indexOf(moveEntry) < 2 ? 'fast' : 'charge';
        await pokemonMoveModel.updateOne(
          { pokemonId: id, moveId: moveId2 },
          { pokemonId: id, moveId: moveId2, moveSlot },
          { upsert: true },
        );
      }

      if (species.evolution_chain) {
        const chainId = parseInt(
          species.evolution_chain.url.split('/').filter(Boolean).pop()!,
          10,
        );
        if (!seenEvolutionChains.has(chainId)) {
          seenEvolutionChains.add(chainId);
          try {
            const chain = await pokeApiService.getEvolutionChain(chainId);
            extractEvolutions(chain.chain, allEvolutions);
          } catch {
            logger.warn(`Failed to fetch evolution chain ${chainId}`);
          }
        }
      }
    }

    logger.log(`Seeded Pokémon ${start}–${end} of ${MAX_POKEMON_ID}`);
    await sleep(200);
  }

  if (allEvolutions.length > 0) {
    for (const evo of allEvolutions) {
      await evolutionModel.updateOne(
        { fromPokemonId: evo.fromPokemonId, toPokemonId: evo.toPokemonId },
        evo,
        { upsert: true },
      );
    }
    logger.log(`Seeded ${allEvolutions.length} evolution entries`);
  }
}

function extractEvolutions(
  link: any,
  out: Array<{
    fromPokemonId: number;
    toPokemonId: number;
    candyCost?: number;
    conditions?: string;
  }>,
): void {
  const fromId = parseInt(
    link.species.url.split('/').filter(Boolean).pop(),
    10,
  );

  for (const child of link.evolves_to) {
    const toId = parseInt(
      child.species.url.split('/').filter(Boolean).pop(),
      10,
    );
    const detail = child.evolution_details?.[0];
    const conditions: string[] = [];
    if (detail?.min_level) conditions.push(`Level ${detail.min_level}`);
    if (detail?.item) conditions.push(`Use ${detail.item.name}`);
    if (detail?.trigger?.name === 'trade') conditions.push('Trade');

    if (fromId <= MAX_POKEMON_ID && toId <= MAX_POKEMON_ID) {
      out.push({
        fromPokemonId: fromId,
        toPokemonId: toId,
        candyCost: detail?.min_level ? detail.min_level * 2 : 25,
        conditions: conditions.join(', ') || undefined,
      });
    }

    extractEvolutions(child, out);
  }
}

async function seedRankings(app: any): Promise<void> {
  const pokemonModel: Model<any> = app.get(getModelToken('Pokemon'));
  const rankingModel: Model<any> = app.get(getModelToken('Ranking'));
  const historyModel: Model<any> = app.get(getModelToken('RankingHistory'));

  const existingCount = await rankingModel.countDocuments();
  if (existingCount > 0) {
    logger.log(`Rankings already seeded (${existingCount} docs). Skipping.`);
    return;
  }

  const allPokemon = await pokemonModel.find().lean();
  if (allPokemon.length === 0) {
    logger.warn('No Pokémon in DB — cannot seed rankings.');
    return;
  }

  logger.log(`Generating rankings for ${allPokemon.length} Pokémon...`);

  const leagues = ['great', 'ultra', 'master'];
  const modes = ['pvp', 'pve'];
  const roles = ['attacker', 'tank', 'support'];
  const now = new Date();
  const rankingDocs: any[] = [];
  const historyDocs: any[] = [];

  for (const league of leagues) {
    for (const mode of modes) {
      const cpCap =
        league === 'great' ? 1500 : league === 'ultra' ? 2500 : 99999;

      const scored = allPokemon.map((p: any) => {
        const atk = p.baseAtk || 100;
        const def = p.baseDef || 100;
        const sta = p.baseSta || 100;
        const statProduct = atk * def * sta;

        const cpEstimate = Math.floor(
          (atk * Math.sqrt(def) * Math.sqrt(sta) * 0.1 ** 2) / 10,
        );

        const relevance = cpEstimate <= cpCap ? 1.0 : 0.8;
        const dps =
          mode === 'pvp'
            ? Math.round(atk * 0.5 * relevance * 100) / 100
            : Math.round(atk * 0.7 * relevance * 100) / 100;
        const tdo = Math.round(statProduct * 0.001 * relevance * 100) / 100;
        const movesetEfficiency =
          Math.round((dps * 0.6 + tdo * 0.4) * 100) / 100;

        const roleIdx = (atk + def + sta) % 3;

        return {
          pokemonId: p.pokemonId as number,
          pokemonName: p.name as string,
          pokemonTypes: p.types as string[],
          league,
          mode,
          rank: 0,
          dps,
          tdo,
          statProduct,
          movesetEfficiency,
          role: roles[roleIdx],
          snapshotDate: now,
        };
      });

      scored.sort((a, b) => b.movesetEfficiency - a.movesetEfficiency);

      scored.forEach((entry, index) => {
        entry.rank = index + 1;
        rankingDocs.push({ ...entry });

        for (let w = 0; w < 4; w++) {
          const past = new Date(now);
          past.setDate(past.getDate() - (w + 1) * 7);
          const jitter = Math.round((Math.random() - 0.5) * 4);
          historyDocs.push({
            pokemonId: entry.pokemonId,
            league,
            mode,
            rank: Math.max(1, entry.rank + jitter),
            dps: entry.dps,
            tdo: entry.tdo,
            snapshotDate: past,
          });
        }
      });
    }
  }

  await rankingModel.insertMany(rankingDocs, { ordered: false });
  await historyModel.insertMany(historyDocs, { ordered: false });
  logger.log(
    `Seeded ${rankingDocs.length} ranking entries + ${historyDocs.length} history snapshots`,
  );
}

async function seedRaidBosses(app: any): Promise<void> {
  const raidBossModel: Model<any> = app.get(getModelToken('RaidBoss'));

  await raidBossModel.deleteMany({});
  logger.log('Cleared existing raid bosses for re-seed with enriched data');

  const bosses = [
    {
      pokemonId: 150,
      pokemonName: 'Mewtwo',
      pokemonTypes: ['psychic'],
      tier: 5,
      isActive: true,
      cp: 54148,
      catchCp: 2387,
      weatherBoostedCatchCp: 2984,
      quickMoves: ['Confusion', 'Psycho Cut'],
      chargedMoves: ['Psystrike*', 'Shadow Ball*', 'Focus Blast', 'Thunderbolt', 'Ice Beam', 'Flamethrower'],
      potentialForms: ['Mega Mewtwo X', 'Mega Mewtwo Y', 'Armored Mewtwo'],
    },
    {
      pokemonId: 384,
      pokemonName: 'Rayquaza',
      pokemonTypes: ['dragon', 'flying'],
      tier: 5,
      isActive: true,
      cp: 49808,
      catchCp: 2191,
      weatherBoostedCatchCp: 2739,
      quickMoves: ['Dragon Tail', 'Air Slash'],
      chargedMoves: ['Outrage', 'Ancient Power', 'Dragon Ascent*'],
      potentialForms: ['Mega Rayquaza'],
    },
    {
      pokemonId: 383,
      pokemonName: 'Groudon',
      pokemonTypes: ['ground'],
      tier: 5,
      isActive: true,
      cp: 46089,
      catchCp: 2260,
      weatherBoostedCatchCp: 2825,
      quickMoves: ['Mud Shot', 'Dragon Tail'],
      chargedMoves: ['Earthquake', 'Fire Blast', 'Solar Beam', 'Precipice Blades*'],
      potentialForms: ['Primal Groudon'],
    },
    {
      pokemonId: 382,
      pokemonName: 'Kyogre',
      pokemonTypes: ['water'],
      tier: 5,
      isActive: true,
      cp: 45468,
      catchCp: 2260,
      weatherBoostedCatchCp: 2825,
      quickMoves: ['Waterfall'],
      chargedMoves: ['Hydro Pump', 'Blizzard', 'Thunder', 'Surf', 'Origin Pulse*'],
      potentialForms: ['Primal Kyogre'],
    },
    {
      pokemonId: 249,
      pokemonName: 'Lugia',
      pokemonTypes: ['psychic', 'flying'],
      tier: 5,
      isActive: true,
      cp: 42753,
      catchCp: 2028,
      weatherBoostedCatchCp: 2535,
      quickMoves: ['Extrasensory', 'Dragon Tail'],
      chargedMoves: ['Sky Attack', 'Hydro Pump', 'Future Sight', 'Aeroblast*'],
      potentialForms: ['Shadow Lugia'],
    },
    {
      pokemonId: 250,
      pokemonName: 'Ho-Oh',
      pokemonTypes: ['fire', 'flying'],
      tier: 5,
      isActive: true,
      cp: 45656,
      catchCp: 2207,
      weatherBoostedCatchCp: 2759,
      quickMoves: ['Extrasensory', 'Steel Wing'],
      chargedMoves: ['Brave Bird', 'Fire Blast', 'Solar Beam', 'Sacred Fire*'],
      potentialForms: [],
    },
    {
      pokemonId: 248,
      pokemonName: 'Tyranitar',
      pokemonTypes: ['rock', 'dark'],
      tier: 3,
      isActive: true,
      cp: 23779,
      catchCp: 2103,
      weatherBoostedCatchCp: 2629,
      quickMoves: ['Bite', 'Iron Tail', 'Smack Down*'],
      chargedMoves: ['Crunch', 'Stone Edge', 'Fire Blast'],
      potentialForms: ['Mega Tyranitar'],
    },
    {
      pokemonId: 6,
      pokemonName: 'Charizard',
      pokemonTypes: ['fire', 'flying'],
      tier: 3,
      isActive: true,
      cp: 19456,
      catchCp: 1651,
      weatherBoostedCatchCp: 2064,
      quickMoves: ['Fire Spin', 'Air Slash', 'Dragon Breath*'],
      chargedMoves: ['Blast Burn*', 'Dragon Claw', 'Overheat', 'Flamethrower'],
      potentialForms: ['Mega Charizard X', 'Mega Charizard Y'],
    },
    {
      pokemonId: 143,
      pokemonName: 'Snorlax',
      pokemonTypes: ['normal'],
      tier: 3,
      isActive: true,
      cp: 16926,
      catchCp: 1917,
      weatherBoostedCatchCp: 2396,
      quickMoves: ['Zen Headbutt', 'Lick'],
      chargedMoves: ['Hyper Beam', 'Earthquake', 'Heavy Slam', 'Body Slam*', 'Superpower'],
      potentialForms: [],
    },
    {
      pokemonId: 131,
      pokemonName: 'Lapras',
      pokemonTypes: ['water', 'ice'],
      tier: 3,
      isActive: true,
      cp: 14847,
      catchCp: 1435,
      weatherBoostedCatchCp: 1794,
      quickMoves: ['Water Gun', 'Frost Breath', 'Ice Shard*'],
      chargedMoves: ['Surf', 'Hydro Pump', 'Ice Beam', 'Blizzard', 'Skull Bash'],
      potentialForms: [],
    },
    {
      pokemonId: 68,
      pokemonName: 'Machamp',
      pokemonTypes: ['fighting'],
      tier: 3,
      isActive: true,
      cp: 18144,
      catchCp: 1746,
      weatherBoostedCatchCp: 2183,
      quickMoves: ['Counter', 'Bullet Punch'],
      chargedMoves: ['Dynamic Punch', 'Close Combat', 'Cross Chop', 'Rock Slide', 'Payback*'],
      potentialForms: ['Gigantamax'],
    },
    {
      pokemonId: 94,
      pokemonName: 'Gengar',
      pokemonTypes: ['ghost', 'poison'],
      tier: 3,
      isActive: true,
      cp: 21207,
      catchCp: 1644,
      weatherBoostedCatchCp: 2055,
      quickMoves: ['Shadow Claw*', 'Hex', 'Sucker Punch', 'Lick*'],
      chargedMoves: ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Shadow Punch'],
      potentialForms: ['Mega Gengar'],
    },
  ];

  await raidBossModel.insertMany(bosses);
  logger.log(`Seeded ${bosses.length} raid bosses (enriched with moves, catch CPs, forms)`);
}

async function seedHistoryEntries(app: any): Promise<void> {
  const historyModel: Model<any> = app.get(getModelToken('HistoryEntry'));
  const pokemonModel: Model<any> = app.get(getModelToken('Pokemon'));
  const rankingModel: Model<any> = app.get(getModelToken('Ranking'));

  const existingCount = await historyModel.countDocuments();
  if (existingCount > 0) {
    logger.log(`History entries already seeded (${existingCount} docs). Skipping.`);
    return;
  }

  const samplePokemonIds = [150, 384, 383, 248, 6, 94, 68, 143, 131, 25, 3, 9];
  const leagues = ['great', 'ultra', 'master'];
  const now = new Date();
  const historyDocs: any[] = [];

  const pokemonDocs = await pokemonModel
    .find({ pokemonId: { $in: samplePokemonIds } })
    .lean()
    .exec();
  const pMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));

  const rankings = await rankingModel
    .find({ pokemonId: { $in: samplePokemonIds }, mode: 'pvp' })
    .lean()
    .exec();
  const rMap = new Map(rankings.map((r: any) => [`${r.pokemonId}-${r.league}`, r]));

  const DEMO_USER_ID = '000000000000000000000001';

  for (const pid of samplePokemonIds) {
    const pokemon = pMap.get(pid);
    if (!pokemon) continue;

    const league = leagues[pid % leagues.length];
    const ranking = rMap.get(`${pid}-${league}`);

    const ivAtk = 12 + (pid % 4);
    const ivDef = 13 + (pid % 3);
    const ivSta = 14 + (pid % 2);
    const rank = ranking?.rank ?? 50 + (pid % 100);
    const tier = rank <= 20 ? 'S' : rank <= 50 ? 'A' : rank <= 100 ? 'B' : rank <= 200 ? 'C' : 'D';

    for (let w = 0; w < 5; w++) {
      const date = new Date(now);
      date.setDate(date.getDate() - w * 7 - (pid % 5));

      historyDocs.push({
        userId: DEMO_USER_ID,
        pokemonId: pid,
        pokemonName: pokemon.name,
        pokemonTypes: pokemon.types,
        spriteUrl: pokemon.spriteUrl,
        league,
        metaRank: Math.max(1, rank + Math.round((Math.random() - 0.5) * 6)),
        ivPercent: Math.round(((ivAtk + ivDef + ivSta) / 45) * 100),
        ivAtk,
        ivDef,
        ivSta,
        cp: ranking?.tdo ? Math.round(ranking.tdo * 0.5) : 2500,
        dps: ranking?.dps ?? 15,
        tdo: ranking?.tdo ?? 200,
        tier,
        notes: w === 0
          ? ['Strong in current meta', `Move set Rebalance Impact: +${(pid % 7) + 1} ranks`]
          : [],
        analyzedAt: date,
      });
    }
  }

  if (historyDocs.length > 0) {
    await historyModel.insertMany(historyDocs, { ordered: false });
    logger.log(`Seeded ${historyDocs.length} ranking history entries for demo user`);
  }
}

async function seedEvents(app: any): Promise<void> {
  const eventModel: Model<any> = app.get(getModelToken('GameEvent'));

  const existingCount = await eventModel.countDocuments();
  if (existingCount > 0) {
    logger.log(`Events already seeded (${existingCount} docs). Skipping.`);
    return;
  }

  const now = new Date();
  const events = [
    {
      internalId: 'featured-pokemon-apr-2026',
      name: 'Featured Pokémon',
      description:
        'Grookey will appear more frequently in the wild.',
      bonuses: [
        { label: '2x Catch Stardust', icon: 'stardust' },
        { label: 'Increased Spawns', icon: 'spawn' },
      ],
      featuredPokemonIds: [810, 25, 133],
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      visibility: 'live',
      priority: 1,
    },
    {
      internalId: 'celestial-research-day-apr-2026',
      name: 'Celestial Research Day',
      description:
        'Event-themed Field Research tasks.',
      bonuses: [
        { label: '3x Catch XP', icon: 'xp' },
        { label: 'Rare Research Tasks', icon: 'research' },
      ],
      featuredPokemonIds: [380, 381],
      startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      visibility: 'live',
      priority: 2,
    },
    {
      internalId: 'community-day-apr-2026',
      name: 'Community Day — April 2026',
      description: 'Featured Pokémon with exclusive Community Day moves.',
      bonuses: [
        { label: '3x Catch XP', icon: 'xp' },
        { label: '1/4 Hatch Distance', icon: 'egg' },
      ],
      featuredPokemonIds: [1, 4, 7],
      startDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      visibility: 'live',
      priority: 3,
    },
    {
      internalId: 'raid-hour-apr-2026',
      name: 'Raid Hour — Mewtwo',
      description: 'Mewtwo will appear in 5-star raids during Raid Hour.',
      bonuses: [{ label: 'More Raid Passes', icon: 'raid' }],
      featuredPokemonIds: [150],
      startDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      visibility: 'live',
      priority: 4,
    },
  ];

  await eventModel.insertMany(events);
  logger.log(`Seeded ${events.length} events`);
}

process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled rejection: ${reason?.message || reason}`);
  process.exit(1);
});

async function main(): Promise<void> {
  logger.log('=== Pokerank Database Seed ===');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const pokeApiService = app.get(PokeApiService);
    const gameMasterSync = app.get(GameMasterSyncService);

    logger.log('Step 1/6 — Syncing GameMaster data...');
    try {
      await Promise.race([
        gameMasterSync.syncGameMaster(),
        sleep(60000).then(() => {
          throw new Error('GameMaster sync timed out after 60s');
        }),
      ]);
    } catch (err: any) {
      logger.warn(`GameMaster sync skipped: ${err.message}`);
    }

    logger.log('Step 2/6 — Seeding Pokémon from PokeAPI...');
    await seedPokemon(app, pokeApiService);

    logger.log('Step 3/6 — Generating rankings...');
    await seedRankings(app);

    logger.log('Step 4/6 — Seeding raid bosses...');
    await seedRaidBosses(app);

    logger.log('Step 5/6 — Seeding events...');
    await seedEvents(app);

    logger.log('Step 6/6 — Seeding ranking history entries...');
    await seedHistoryEntries(app);

    logger.log('=== Seed complete! ===');
  } catch (error: any) {
    logger.error(`Seed failed: ${error.message}`, error.stack);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
