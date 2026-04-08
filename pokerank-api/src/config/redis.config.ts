import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ttlDefault: parseInt(
    process.env.REDIS_TTL_DEFAULT || process.env.REDIS_EXPIRY || '3600',
    10,
  ),
}));
