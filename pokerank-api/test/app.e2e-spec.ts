import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('Pokerank API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health check', () => {
    it('should respond to GET /api/v1/pokedex (public)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/pokedex')
        .expect(200);
    });

    it('should respond to GET /api/v1/events (public)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/events')
        .expect(200);
    });

    it('should respond to GET /api/v1/raids (public)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/raids')
        .expect(200);
    });
  });

  describe('Auth endpoints', () => {
    it('POST /api/v1/auth/login should reject empty body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });

    it('POST /api/v1/auth/login should validate email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'invalid', password: 'password123' })
        .expect(400);
    });
  });

  describe('Protected endpoints', () => {
    it('GET /api/v1/history should require auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/history')
        .expect(401);
    });

    it('POST /api/v1/recommendations should require auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/recommendations')
        .send({ stardust: 50000, ownedPokemon: [] })
        .expect(401);
    });

    it('GET /api/v1/name-generator/presets should require auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/name-generator/presets')
        .expect(401);
    });
  });

  describe('Name Generator (public)', () => {
    it('POST /api/v1/name-generator/generate should work', () => {
      return request(app.getHttpServer())
        .post('/api/v1/name-generator/generate')
        .send({
          template: '{Species}_{IV}',
          pokemonId: 25,
          ivPercent: 98,
        })
        .expect(201);
    });

    it('POST /api/v1/name-generator/generate should validate input', () => {
      return request(app.getHttpServer())
        .post('/api/v1/name-generator/generate')
        .send({})
        .expect(400);
    });
  });

  describe('Rankings (public)', () => {
    it('GET /api/v1/rankings should require league and mode', () => {
      return request(app.getHttpServer())
        .get('/api/v1/rankings')
        .expect(400);
    });

    it('GET /api/v1/rankings should accept valid filters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/rankings?league=great&mode=pvp')
        .expect(200);
    });
  });

  describe('Admin endpoints', () => {
    it('POST /api/v1/admin/events should require admin auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/events')
        .send({ name: 'Test' })
        .expect(401);
    });
  });
});
