# AGENT.md — Pokerank Companion App · NestJS Backend
> **Authoritative instruction file for every AI coding agent, new developer, or automated tool working on this codebase.**
> Read this entire file before writing a single line of code. Re-read the relevant section before every feature addition.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Folder & File Architecture](#3-folder--file-architecture)
4. [NestJS Conventions & Best Practices](#4-nestjs-conventions--best-practices)
5. [Module Breakdown (SOW → Code)](#5-module-breakdown-sow--code)
6. [External API Integration](#6-external-api-integration)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Database Schema Guidelines](#8-database-schema-guidelines)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Caching Strategy](#10-caching-strategy)
11. [Error Handling & Validation](#11-error-handling--validation)
12. [Testing Strategy](#12-testing-strategy)
13. [Environment Variables](#13-environment-variables)
14. [Adding a New Feature — Checklist](#14-adding-a-new-feature--checklist)
15. [Git & Commit Conventions](#15-git--commit-conventions)

---

## 1. Project Overview

**Pokerank Companion App** is a mobile-first Pokémon analytics platform for Pokémon GO players.

### Phase 1 Scope (this codebase)
| Module | Description |
|---|---|
| Pokédex | Browse, search, filter all Pokémon with full stat/moveset detail |
| Rankings | PvE/PvP rankings per league (Great / Ultra / Master) |
| Raid & Counters | Active raid bosses + ideal counter teams |
| Name Generator | Template-based Pokémon nickname generation |
| Ranking History | Per-user log of analyzed Pokémon and rank trends |
| Recommendation Engine | Suggest evolve/power-up targets from IV + meta data |
| Events | Admin-managed in-game event feed |
| Admin Panel API | Secure CRUD for Events, role-based access |

**Phase 2 (out of scope here):** Real-time overlay, multiplayer sync.

### Data Sources
| Source | Purpose | Base URL |
|---|---|---|
| PokeAPI | Pokémon species, stats, moves, evolution, types | `https://pokeapi.co/api/v2/` |
| GameMaster API | DPS/TDO formulas, CP multipliers, move data | `https://raw.githubusercontent.com/PokeMiners/game_masters/refs/heads/master/latest/latest.json` |

---

## 2. Tech Stack & Dependencies

### Core
```
Node.js         >= 20 LTS
NestJS          ^10.x
TypeScript      ^5.x
Fastify         (platform adapter — never use Express unless forced)
```

### Database
```
MongoDB         ^7  (primary store)
Mongoose        ^8.x  (ODM)
Redis           ^7   (cache + job queue)
```

### Key NestJS Packages
```
@nestjs/config            – ConfigModule (env vars)
@nestjs/mongoose          – Mongoose integration
@nestjs/cache-manager     – Cache module (Redis)
@nestjs/schedule          – Cron jobs (GameMaster sync)
@nestjs/throttler         – Rate limiting
@nestjs/swagger           – OpenAPI docs
@nestjs/passport          – Auth framework
@nestjs/jwt               – JWT strategy
@nestjs/axios             – HTTP client (PokeAPI, GameMaster)
class-validator           – DTO validation
class-transformer         – DTO serialization
helmet                    – Security headers
```

### Dev Tools
```
@nestjs/testing           – Unit + e2e test utilities
jest                      – Test runner
supertest                 – HTTP e2e tests
prettier                  – Code formatting
eslint                    – Linting (@nestjs/eslint-plugin)
compodoc                  – Auto documentation
```

---

## 3. Folder & File Architecture

```
pokerank-api/
├── src/
│   ├── app.module.ts                  # Root module — imports all feature modules
│   ├── main.ts                        # Bootstrap: Fastify, Swagger, global pipes/filters
│   │
│   ├── config/
│   │   ├── app.config.ts              # App-level config (port, prefix, cors)
│   │   ├── database.config.ts         # Mongoose connection config
│   │   ├── redis.config.ts            # Redis connection config
│   │   └── jwt.config.ts              # JWT secret, expiry config
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts    # @Public() — skip JWT guard
│   │   │   ├── roles.decorator.ts     # @Roles('admin') — RBAC
│   │   │   └── current-user.decorator.ts
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts      # Generic PaginationQueryDto
│   │   │   └── api-response.dto.ts    # Generic ApiResponseDto<T>
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts  # Global exception filter
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts  # Wraps responses in ApiResponseDto
│   │   │   ├── logging.interceptor.ts
│   │   │   └── cache.interceptor.ts      # Custom TTL cache interceptor
│   │   ├── pipes/
│   │   │   └── parse-positive-int.pipe.ts
│   │   └── utils/
│   │       ├── formula.util.ts        # CP / DPS / TDO calculation helpers
│   │       └── type-chart.util.ts     # Type effectiveness matrix
│   │
│   ├── modules/
│   │   │
│   │   ├── pokedex/
│   │   │   ├── pokedex.module.ts
│   │   │   ├── pokedex.controller.ts
│   │   │   ├── pokedex.service.ts
│   │   │   ├── pokedex.repository.ts          # Custom Mongoose repo wrapper
│   │   │   ├── dto/
│   │   │   │   ├── pokemon-filter.dto.ts       # type, region, generation, league
│   │   │   │   └── pokemon-detail.dto.ts
│   │   │   └── schemas/
│   │   │       ├── pokemon.schema.ts
│   │   │       ├── pokemon-type.schema.ts
│   │   │       ├── move.schema.ts
│   │   │       └── evolution.schema.ts
│   │   │
│   │   ├── rankings/
│   │   │   ├── rankings.module.ts
│   │   │   ├── rankings.controller.ts
│   │   │   ├── rankings.service.ts
│   │   │   ├── rankings.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── league-filter.dto.ts        # league, mode (pve|pvp), sort
│   │   │   │   └── ranking-entry.dto.ts
│   │   │   └── schemas/
│   │   │       ├── ranking.schema.ts
│   │   │       └── ranking-history.schema.ts
│   │   │
│   │   ├── raids/
│   │   │   ├── raids.module.ts
│   │   │   ├── raids.controller.ts
│   │   │   ├── raids.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── raid-boss.dto.ts
│   │   │   │   └── create-raid-queue.dto.ts
│   │   │   └── schemas/
│   │   │       ├── raid-boss.schema.ts
│   │   │       └── raid-queue.schema.ts
│   │   │
│   │   ├── name-generator/
│   │   │   ├── name-generator.module.ts
│   │   │   ├── name-generator.controller.ts
│   │   │   ├── name-generator.service.ts
│   │   │   └── dto/
│   │   │       ├── generate-name.dto.ts        # template, pokemonId, ivPercent, league, role
│   │   │       └── save-preset.dto.ts
│   │   │
│   │   ├── history/
│   │   │   ├── history.module.ts
│   │   │   ├── history.controller.ts
│   │   │   ├── history.service.ts
│   │   │   ├── history.repository.ts
│   │   │   └── schemas/
│   │   │       └── history-entry.schema.ts
│   │   │
│   │   ├── recommendations/
│   │   │   ├── recommendations.module.ts
│   │   │   ├── recommendations.controller.ts
│   │   │   ├── recommendations.service.ts
│   │   │   └── dto/
│   │   │       ├── recommendation-input.dto.ts  # stardust, candy, owned pokemon
│   │   │       └── recommendation-result.dto.ts
│   │   │
│   │   ├── events/
│   │   │   ├── events.module.ts
│   │   │   ├── events.controller.ts             # Public: list/detail
│   │   │   ├── events-admin.controller.ts       # Admin: CRUD
│   │   │   ├── events.service.ts
│   │   │   ├── events.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-event.dto.ts
│   │   │   │   ├── update-event.dto.ts
│   │   │   │   └── event-filter.dto.ts
│   │   │   └── schemas/
│   │   │       └── event.schema.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── auth-response.dto.ts
│   │   │
│   │   └── users/
│   │       ├── users.module.ts
│   │       ├── users.service.ts
│   │       └── schemas/
│   │           └── user.schema.ts
│   │
│   ├── integrations/
│   │   ├── pokeapi/
│   │   │   ├── pokeapi.module.ts
│   │   │   ├── pokeapi.service.ts             # All PokeAPI HTTP calls
│   │   │   └── interfaces/
│   │   │       ├── pokeapi-pokemon.interface.ts
│   │   │       └── pokeapi-move.interface.ts
│   │   └── game-master/
│   │       ├── game-master.module.ts
│   │       ├── game-master.service.ts         # Parses GameMaster JSON
│   │       ├── game-master.sync.service.ts    # Scheduled cron sync
│   │       └── interfaces/
│   │           └── game-master.interface.ts
│   │
│   └── database/
│       └── seeds/                             # Initial data seeders
│
├── test/
│   ├── unit/                                  # Mirror of src/ — *.spec.ts
│   └── e2e/                                   # *.e2e-spec.ts per module
│
├── .env.example
├── .env                                       # Never commit
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
├── AGENT.md                                   # ← You are here
└── docker-compose.yml
```

---

## 4. NestJS Conventions & Best Practices

### 4.1 Bootstrap (`main.ts`)
```typescript
// Always use Fastify adapter
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true }),
);
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalInterceptors(new TransformInterceptor());
// Swagger only in non-production
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Pokerank API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
}
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

### 4.2 Module Structure Rules
- Every feature module **must** declare its own controller, service, and Mongoose schemas.
- Import `HttpModule` from `@nestjs/axios` **only inside** `PokeApiModule` and `GameMasterModule`. Never in feature modules directly.
- Use `forwardRef()` only when circular dependency is unavoidable — document why.
- Re-export shared providers using `exports: [ServiceName]`.

### 4.3 Controller Rules
- Controllers are **thin** — no business logic whatsoever.
- Always decorate with `@ApiTags()` and `@ApiBearerAuth()` where applicable.
- Always type the return value: `Promise<ApiResponseDto<PokemonDetailDto>>`.
- Use `@Query()` with a DTO class for query params, not individual `@Query('param')`.

```typescript
// ✅ Correct
@Get()
async findAll(@Query() filter: PokemonFilterDto): Promise<PaginatedResponseDto<PokemonDto>> {
  return this.pokedexService.findAll(filter);
}

// ❌ Wrong
@Get()
async findAll(@Query('type') type: string, @Query('region') region: string) { ... }
```

### 4.4 Service Rules
- Services own **all** business logic.
- Always inject Mongoose models via constructor injection using `@InjectModel(ModelName.name)`.
- Use Mongoose sessions (`session.withTransaction()`) only when multiple writes must be atomic.
- Services that call external APIs must catch `HttpException` and rethrow as `ServiceUnavailableException`.

### 4.5 DTO Rules
- All DTOs use `class-validator` decorators.
- All DTOs use `@ApiProperty()` for Swagger.
- Update DTOs extend create DTOs using `PartialType(CreateXDto)` from `@nestjs/mapped-types`.
- Use `@Transform()` from `class-transformer` for type coercions (e.g., string → number from query params).

```typescript
export class PokemonFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(PokemonType)
  type?: PokemonType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  generation?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Max(100)
  limit?: number = 20;
}
```

### 4.6 Schema Rules
- All schemas extend a base schema mixin that includes `createdAt` and `updatedAt` via `{ timestamps: true }`.
- Use MongoDB `ObjectId` (`_id`) as the primary key — expose it as `id` in API responses via a virtual or transform.
- Always define Mongoose indexes using `@index()` decorator or `schema.index()` on fields used in query filters.
- Never use Mongoose `populate()` deeply nested — keep document references shallow. Prefer embedding small, stable subdocuments.
- Use `lean()` on read-only queries for performance; avoid it when Mongoose document methods are needed.

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PokemonDocument = Pokemon & Document;

@Schema({ timestamps: true, collection: 'pokemon' })
export class Pokemon {
  @Prop({ required: true, unique: true, index: true })
  pokemonId: number; // PokeAPI national dex number

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ type: [String], required: true })
  types: string[];

  @Prop({ required: true })
  baseAtk: number;

  @Prop({ required: true })
  baseDef: number;

  @Prop({ required: true })
  baseSta: number;

  @Prop()
  spriteUrl: string;
}

export const PokemonSchema = SchemaFactory.createForClass(Pokemon);
PokemonSchema.index({ name: 'text' }); // text index for search
```

### 4.7 Response Shape
All API responses must conform to:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 800 },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```
This is enforced by `TransformInterceptor` globally.

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "POKEMON_NOT_FOUND",
    "message": "Pokémon with id 9999 does not exist.",
    "statusCode": 404
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## 5. Module Breakdown (SOW → Code)

### 5.1 Pokédex Module
**Purpose:** Browse and search all Pokémon with full detail.

**Key responsibilities:**
- List Pokémon with pagination and filters (type, region, generation, league relevance).
- Return full Pokémon detail: base stats, movesets (fast/charge/elite), evolutions, type chart, best-use tags.
- Support swipe-navigation by returning `prevId` / `nextId` (national dex order).
- Offline cache: last 100 Pokémon detail responses cached in Redis with TTL 24h.

**Data flow:**
1. On first request, check Redis cache.
2. Cache miss → query local MongoDB (synced from PokeAPI).
3. Return and set Redis cache.

**Scheduled sync:** `GameMasterSyncService` runs at `0 3 * * *` (3 AM daily) to refresh move damage values and CP multipliers. `PokeApiSyncService` runs weekly to catch new Pokémon additions.

---

### 5.2 Rankings Module
**Purpose:** PvE/PvP rankings per league using GameMaster formulas.

**Key responsibilities:**
- Rank Pokémon per league using DPS, TDO, and stat product calculations from `formula.util.ts`.
- Support mode toggle: `pve` | `pvp`.
- Support sort: `metaRelevance` | `dps` | `tdo` | `movesetEfficiency`.
- Return role tags: `attacker` | `tank` | `support`.
- Return ranking trend delta (requires `ranking-history.schema.ts` versioned snapshots).

**Formula reference (GameMaster-derived):**
```
CP = ((Attack + IVAtk) × sqrt(Defense + IVDef) × sqrt(Stamina + IVSta) × CPM²) / 10
DPS = (Move Power / Move Duration) × STAB × TypeEffectiveness
TDO = DPS × (Stamina × CPM)
```
Implement these in `src/common/utils/formula.util.ts`.

---

### 5.3 Raids Module
**Purpose:** Active raid bosses + counter recommendations.

**Key responsibilities:**
- Store active raid bosses manually (admin-set) or via future integration.
- For each boss: return top 6 counter Pokémon ranked by DPS against boss type.
- Apply type effectiveness matrix from `type-chart.util.ts`.
- Support "Create Raid Queue" — user selects Pokémon manually, saved to their history.
- Raid queue is saved as a `RaidQueue` document linked to the user by `userId`.

---

### 5.4 Name Generator Module
**Purpose:** Template-based nickname generator.

**Template variables:**
| Placeholder | Example Output |
|---|---|
| `{Species}` | Gengar |
| `{IV}` | 98 |
| `{League}` | UL |
| `{Role}` | ATK |
| `{DPS}` | 16.2 |
| `{Rank}` | 12 |

**Key responsibilities:**
- Accept a `pokemonId`, `ivPercent`, `league`, `role` and a `template` string.
- Resolve each `{Placeholder}` and return the generated name (max 12 chars — Pokémon GO limit).
- Truncate intelligently, not at byte boundary.
- Save/load user presets (stored per user in MongoDB).

---

### 5.5 History Module
**Purpose:** Track all Pokémon a user has analyzed.

**Key responsibilities:**
- Log each analysis as a `HistoryEntry` document with `userId`, `pokemonId`, `metaRank`, `league`, `analysisDate`.
- Return chronological list per user with pagination.
- Return trend graph data: array of `{ date, rank }` per Pokémon per league.
- Support delete (soft delete via `deletedAt` field) and export (returns JSON array).
- Free tier: unlimited entries. Paid tier: expanded storage (no hard cap in Phase 1).

---

### 5.6 Recommendations Module
**Purpose:** Suggest evolve/power-up targets.

**Key responsibilities:**
- Accept user input: `{ stardust, candy, ownedPokemon: [{ pokemonId, ivAtk, ivDef, ivSta, currentLevel }] }`.
- For each Pokémon, calculate max CP at league cap and compare against top-ranked meta Pokémon.
- Return ranked suggestions with action (`EVOLVE` | `POWER_UP`) and brief reasoning string.
- Suggestions are generated server-side using local formula + cached ranking data — no ML in Phase 1.

---

### 5.7 Events Module
**Purpose:** Admin-managed event feed for players.

**Public endpoints:** List events, get event detail, filter by active/upcoming.

**Admin endpoints (roles: `admin`):** Full CRUD, publish/schedule, audit log.

**Event document fields:**
- `name`, `internalId`, `startDate`, `endDate`, `timezone`
- `description` (rich text stored as HTML string, sanitized server-side)
- `bannerImageUrl`
- `bonuses` (array of subdocs: `[{ label: "2× Stardust", icon: "stardust" }]`)
- `featuredPokemonIds` (array of national dex IDs — linked to Pokédex)
- `visibility`: `live` | `scheduled` | `hidden`
- `priority` (integer — ordering in app feed)

**Admin Audit Log:** Every mutation on an event records `adminUserId`, `action`, `before`, `after`, `timestamp` as an embedded array on the event document, or optionally in a separate `EventAuditLog` collection for large histories.

---

### 5.8 Auth Module
**Purpose:** JWT authentication + role-based access.

- Admin users are seeded — no self-registration for admins.
- Mobile app users authenticate with a lightweight local account (email + password) stored hashed with bcrypt.
- JWT access token: 15 min TTL. Refresh token: 30 days, stored in MongoDB.
- `@Public()` decorator skips JWT guard (used on Pokédex, Rankings public endpoints).
- `@Roles('admin')` decorator + `RolesGuard` protects admin endpoints.

---

## 6. External API Integration

### 6.1 PokeAPI (`src/integrations/pokeapi/`)

**Base URL:** `https://pokeapi.co/api/v2/`

**Used Endpoints:**
| Endpoint | Purpose |
|---|---|
| `GET /pokemon/{id or name}` | Base stats, sprites, types, moves |
| `GET /pokemon-species/{id}` | Generation, region, evolution chain url, flavor text |
| `GET /evolution-chain/{id}` | Full evolution chain |
| `GET /move/{id}` | Move power, type, energy, duration |
| `GET /type/{id}` | Type damage relations (for type chart) |

**Rules:**
- All calls go through `PokeApiService` — never call `HttpService` directly in feature modules.
- Results are persisted to local MongoDB on first fetch (database-as-cache pattern).
- Apply exponential backoff retry on 429/503 responses (max 3 retries).
- PokeAPI rate limit: ~100 req/min — use a request queue via `p-queue` package.
- Store sprite URLs, not sprite binary data.

**Example service pattern:**
```typescript
@Injectable()
export class PokeApiService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Pokemon.name) private readonly pokemonModel: Model<PokemonDocument>,
  ) {}

  async getPokemon(id: number): Promise<PokeApiPokemonInterface> {
    const cached = await this.pokemonModel.findOne({ pokemonId: id }).lean();
    if (cached) return this.mapToInterface(cached);

    const response = await firstValueFrom(
      this.httpService.get<PokeApiPokemonInterface>(`/pokemon/${id}`).pipe(
        retry({ count: 3, delay: (_, attempt) => timer(attempt * 1000) }),
        catchError(() => { throw new ServiceUnavailableException('PokeAPI unavailable'); }),
      ),
    );
    await this.pokemonModel.create(this.mapToDocument(response.data));
    return response.data;
  }
}
```

---

### 6.2 GameMaster API (`src/integrations/game-master/`)

**URL:** `https://raw.githubusercontent.com/PokeMiners/game_masters/refs/heads/master/latest/latest.json`

**This is a large JSON file (~5 MB).** Never fetch it per-request.

**Sync Strategy:**
- `GameMasterSyncService` is a `@Injectable()` with `@Cron('0 3 * * *')` (daily 3 AM).
- Download → parse → extract relevant templates → upsert to MongoDB using `updateOne({ templateId }, update, { upsert: true })`.
- Store ETag/Last-Modified header; skip processing if unchanged.

**Relevant GameMaster template types to extract:**
| Template Prefix | Data |
|---|---|
| `POKEMON_` | Base attack, defense, stamina, type |
| `MOVE_` | Power, energy, duration, DPS |
| `PLAYER_LEVEL_SETTINGS` | CP multiplier table per level |
| `COMBAT_` | PvP move energy/power overrides |
| `RAID_LEVEL_` | Raid boss HP and CP multipliers |

**Example parse pattern:**
```typescript
// game-master.service.ts
extractCpMultipliers(templates: GameMasterTemplate[]): CpMultiplierTable {
  const levelSettings = templates.find(t => t.templateId === 'PLAYER_LEVEL_SETTINGS');
  return levelSettings.playerLevel.cpMultiplier; // array indexed by level
}
```

---

## 7. API Endpoints Reference

All endpoints are prefixed with `/api/v1`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Login, returns JWT |
| `POST` | `/auth/refresh` | Public | Refresh JWT |
| `POST` | `/auth/logout` | JWT | Invalidate refresh token |

### Pokédex
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/pokedex` | Public | List Pokémon with filters & pagination |
| `GET` | `/pokedex/:id` | Public | Full Pokémon detail by national dex ID |
| `GET` | `/pokedex/:id/neighbors` | Public | Returns `{ prev, next }` for swipe navigation |
| `GET` | `/pokedex/search` | Public | `?q=pikachu` — name search |

**Query params for `GET /pokedex`:**
```
type        string    Fire, Water, etc.
region      string    Kanto, Johto, etc.
generation  number    1–9
league      string    great | ultra | master
page        number    default: 1
limit       number    default: 20, max: 100
```

### Rankings
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/rankings` | Public | All rankings with filters |
| `GET` | `/rankings/:pokemonId` | Public | Detail ranking for one Pokémon |

**Query params:**
```
league      string    great | ultra | master  (required)
mode        string    pve | pvp               (required)
sort        string    metaRelevance | dps | tdo | movesetEfficiency
role        string    attacker | tank | support
page        number
limit       number
```

### Raids
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/raids` | Public | List active raid bosses |
| `GET` | `/raids/:bossId` | Public | Boss detail + counters |
| `POST` | `/raids/:bossId/queue` | JWT | Create a raid queue (user's team) |
| `GET` | `/raids/queues` | JWT | Get user's saved raid queues |
| `DELETE` | `/raids/queues/:queueId` | JWT | Delete a saved queue |

### Name Generator
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/name-generator/generate` | Public | Generate name from template |
| `GET` | `/name-generator/presets` | JWT | Get user's saved presets |
| `POST` | `/name-generator/presets` | JWT | Save a preset |
| `DELETE` | `/name-generator/presets/:id` | JWT | Delete a preset |

**`POST /name-generator/generate` body:**
```json
{
  "template": "{Species}_{IV}_{League}",
  "pokemonId": 94,
  "ivPercent": 98,
  "league": "ultra",
  "role": "attacker"
}
```

### Ranking History
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/history` | JWT | Paginated list of user's history |
| `GET` | `/history/:pokemonId/trend` | JWT | Rank trend data for one Pokémon |
| `DELETE` | `/history/:entryId` | JWT | Soft-delete one entry |
| `GET` | `/history/export` | JWT | Export history as JSON |

### Recommendations
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/recommendations` | JWT | Generate recommendations |

**Request body:**
```json
{
  "stardust": 50000,
  "ownedPokemon": [
    { "pokemonId": 147, "ivAtk": 15, "ivDef": 12, "ivSta": 14, "currentLevel": 20 },
    { "pokemonId": 280, "ivAtk": 14, "ivDef": 15, "ivSta": 15, "currentLevel": 15 }
  ]
}
```

### Events (Public)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/events` | Public | List events |
| `GET` | `/events/:id` | Public | Event detail |

**Query params for `GET /events`:**
```
status      string    active | upcoming | all   (default: all)
page        number
limit       number
```

### Events (Admin)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/events` | Admin JWT | List all events (including hidden) |
| `POST` | `/admin/events` | Admin JWT | Create event |
| `PATCH` | `/admin/events/:id` | Admin JWT | Update event |
| `DELETE` | `/admin/events/:id` | Admin JWT | Delete event |
| `PATCH` | `/admin/events/:id/publish` | Admin JWT | Immediately publish |
| `PATCH` | `/admin/events/:id/schedule` | Admin JWT | Schedule for future publish |
| `GET` | `/admin/events/:id/audit` | Admin JWT | View audit log for event |

### Users / Settings
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/me` | JWT | Get current user profile |
| `PATCH` | `/users/me` | JWT | Update preferences |
| `DELETE` | `/users/me/cache` | JWT | Clear user's local cache trigger |

---

## 8. Database Schema Guidelines

### Naming Conventions
- Collections: `camelCase` plural (`pokemon`, `rankingEntries`, `historyEntries`)
- Mongoose schema field names: `camelCase` (`pokemonId`, `metaRank`, `createdAt`)
- Schema class names: `PascalCase` singular (`Pokemon`, `RankingEntry`, `HistoryEntry`)
- **Never** use `{ autoIndex: false }` in production without an explicit index strategy — always define indexes on fields used in queries

### Schema Design Principles
- Prefer **embedding** subdocuments when the subdocument is always fetched with the parent and has a bounded size (e.g., bonuses inside an event, moveset inside a ranking entry).
- Prefer **referencing** (storing `ObjectId`) when the related document is large, shared across many parents, or queried independently (e.g., `userId` on history entries, `pokemonId` on ranking entries).
- Use `deletedAt: Date` (soft delete) on any user-facing document that needs audit trail or restore capability.

### Core Collections
```
pokemon              – pokemonId (dex#), name, types[], baseAtk, baseDef, baseSta, generation, region, spriteUrl
moves                – moveId, name, type, power, energy, durationMs, isFast, dps
pokemon_moves        – pokemonId (ref), moveId (ref), moveSlot (fast|charge|elite)
evolutions           – fromPokemonId (ref), toPokemonId (ref), candyCost, conditions
type_effectiveness   – attackerType, defenderType, multiplier
ranking_entries      – pokemonId (ref), league, mode, rank, dps, tdo, statProduct, snapshotDate
users                – email, passwordHash, role (user|admin), subscriptionTier
user_presets         – userId (ref), name, template
history_entries      – userId (ref), pokemonId (ref), league, metaRank, ivPercent, analyzedAt, deletedAt
raid_bosses          – pokemonId (ref), tier (1|3|5|mega), isActive, cp, bossMoveIds[]
raid_queues          – userId (ref), raidBossId (ref), pokemonIds[], createdAt
events               – internalId, name, description, bannerUrl, bonuses[], startDate, endDate, visibility, priority
event_audit_logs     – eventId (ref), adminUserId (ref), action, before (mixed), after (mixed), timestamp
refresh_tokens       – userId (ref), tokenHash, expiresAt, revokedAt
game_master_cache    – templateId, templateType, data (mixed), syncedAt
```

### Mongoose AppModule Registration
Register all schemas in `MongooseModule.forFeature()` inside each feature module:

```typescript
// pokedex.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pokemon.name, schema: PokemonSchema },
      { name: Move.name, schema: MoveSchema },
    ]),
  ],
  controllers: [PokedexController],
  providers: [PokedexService, PokedexRepository],
  exports: [PokedexService],
})
export class PokedexModule {}
```

Root connection in `AppModule`:
```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    uri: config.get<string>('MONGODB_URI'),
  }),
  inject: [ConfigService],
})
```

---

## 9. Authentication & Authorization

### Flow
1. User `POST /auth/login` → receives `{ accessToken, refreshToken }`.
2. Access token: 15-minute JWT, carried in `Authorization: Bearer <token>`.
3. Refresh token: 30-day opaque token, hashed and stored in `refresh_tokens` collection.
4. On expiry, `POST /auth/refresh` with refresh token → new token pair.
5. Logout revokes the refresh token (sets `revokedAt`).

### Guards
- `JwtAuthGuard` is applied **globally** in `AppModule`.
- `@Public()` decorator opts a route out of JWT verification.
- `RolesGuard` applied globally, only enforces when `@Roles()` decorator is present.

### Admin Access
- Admins are seeded; no public admin registration endpoint.
- Admin JWT contains `role: 'admin'` in payload.
- All `/admin/*` routes require `@Roles('admin')`.

### Password Hashing
- Use `bcrypt` with cost factor 12.
- Never log or return password hashes.

---

## 10. Caching Strategy

### Two-Layer Cache

**Layer 1: Redis (`@nestjs/cache-manager` with `cache-manager-ioredis`)**

| Data | TTL | Key Pattern |
|---|---|---|
| Pokémon detail | 24h | `pokemon:detail:{pokemonId}` |
| Pokédex list page | 1h | `pokemon:list:{filter_hash}` |
| Rankings per league | 1h | `rankings:{league}:{mode}:{sort}:{page}` |
| Active raid bosses | 30 min | `raids:active` |
| Events (active) | 15 min | `events:active:{page}` |
| GameMaster formulas | 24h | `gm:cpMultiplier`, `gm:moves` |

**Layer 2: MongoDB (database-as-cache)**

PokeAPI data is persisted to the local MongoDB collection after first fetch. Subsequent requests are served from MongoDB, not PokeAPI. This serves as the offline-capable layer.

### Cache Invalidation
- On `GameMasterSyncService` completion → flush `gm:*` and `rankings:*` keys.
- On admin event create/update/delete → flush `events:*` keys.
- On admin raid boss update → flush `raids:*` keys.
- Use `SCAN` + `DEL` pattern — never `FLUSHDB`.

---

## 11. Error Handling & Validation

### Global Exception Filter (`AllExceptionsFilter`)
Catches all exceptions and formats them to the standard error response shape.

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any).message ?? exception.message
      : 'Internal server error';

    response.status(status).send({
      success: false,
      error: { statusCode: status, message },
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Custom Error Codes
Define all error codes in `src/common/constants/error-codes.ts`:
```typescript
export const ERROR_CODES = {
  POKEMON_NOT_FOUND: 'POKEMON_NOT_FOUND',
  INVALID_LEAGUE: 'INVALID_LEAGUE',
  TEMPLATE_TOO_LONG: 'TEMPLATE_TOO_LONG',
  GAMEMASTER_UNAVAILABLE: 'GAMEMASTER_UNAVAILABLE',
  // ...
} as const;
```

### Validation
- `ValidationPipe` is global with `whitelist: true` (strip unknown props) and `transform: true`.
- Never use `@Body()` without a typed DTO class.
- Use `@IsEnum()` for all fixed-value string fields.

---

## 12. Testing Strategy

### Unit Tests (`test/unit/`)
- One `*.spec.ts` per service file, mirroring `src/modules/` structure.
- Use `@nestjs/testing` `Test.createTestingModule()`.
- Mock all Mongoose models with `jest.fn()` — never hit real DB in unit tests.
- Use the `getModelToken(ModelName.name)` helper to provide mock models:

```typescript
{
  provide: getModelToken(Pokemon.name),
  useValue: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}
```

- Mock `HttpService` for PokeAPI/GameMaster calls.
- Minimum coverage targets: **Services 80%**, **Utils 100%**.

### E2E Tests (`test/e2e/`)
- Use `supertest` against a real test MongoDB instance (Docker Compose).
- Test the happy path + key error paths for every controller.
- Seed test data before each suite using a `TestSeeder` utility.
- Drop and recreate the test database between suites to ensure isolation.
- Run with `npm run test:e2e`.

### Commands
```bash
npm run test              # Unit tests
npm run test:cov          # Unit tests + coverage report
npm run test:e2e          # End-to-end tests
npm run test:watch        # Watch mode
```

---

## 13. Environment Variables

```bash
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
MONGODB_URI=mongodb://localhost:27017/pokerank

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL_DEFAULT=3600

# JWT
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# External APIs
POKEAPI_BASE_URL=https://pokeapi.co/api/v2
POKEAPI_RATE_LIMIT=80           # Requests per minute (conservative)
GAMEMASTER_URL=https://raw.githubusercontent.com/PokeMiners/game_masters/refs/heads/master/latest/latest.json
GAMEMASTER_SYNC_CRON=0 3 * * *  # 3 AM daily

# Admin
ADMIN_SEED_EMAIL=admin@pokerank.app
ADMIN_SEED_PASSWORD=changeme_on_first_boot
```

Copy `.env.example` → `.env`. **Never commit `.env`.**

---

## 14. Adding a New Feature — Checklist

When adding any new module or endpoint, complete every item:

- [ ] Create the module folder under `src/modules/{feature}/`
- [ ] Create `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`
- [ ] Create all DTOs under `dto/` with `class-validator` + `@ApiProperty()` decorators
- [ ] Create Mongoose schema(s) under `schemas/` with `@Schema()`, `@Prop()`, and explicit `index()` calls
- [ ] Register the schema(s) in the module via `MongooseModule.forFeature()`
- [ ] Register the module in `AppModule`
- [ ] Add Redis cache keys to the caching strategy table in this file
- [ ] Add all new endpoints to Section 7 of this file
- [ ] Write unit tests for the service (`test/unit/modules/{feature}/`) using mock Mongoose models
- [ ] Write e2e tests for the controller (`test/e2e/{feature}.e2e-spec.ts`)
- [ ] Verify Swagger docs appear correctly at `/api/docs`
- [ ] Run `npm run test:cov` and ensure coverage does not drop below thresholds
- [ ] Update this `AGENT.md` with any architectural decisions made

---

## 15. Git & Commit Conventions

### Branch Naming
```
feature/{ticket-id}-short-description     # New features
fix/{ticket-id}-short-description         # Bug fixes
chore/update-dependencies                 # Maintenance
migration/add-events-collection           # DB schema changes only
```

### Commit Message Format (Conventional Commits)
```
feat(pokedex): add generation filter to list endpoint
fix(rankings): correct TDO formula for mega evolutions
chore(deps): upgrade @nestjs/core to 10.4.0
feat(events): add admin CRUD with audit logging
test(raids): add e2e tests for counter recommendation endpoint
docs(agent): update caching strategy table
```

### PR Rules
- All PRs must include updated tests.
- All PRs must pass `npm run test:cov` with no regression.
- No direct commits to `main` or `develop`.
- Squash merge only — one commit per feature on `develop`.

---

*This file is the single source of truth for backend architecture decisions.*
*Update it every time a new pattern, module, or convention is introduced.*
*Last updated: MongoDB + Mongoose migration — PostgreSQL/TypeORM removed.*
