import { createPool, type Pool, type PoolOptions } from 'mysql2/promise';

export function isMysqlConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.MYSQL_HOST?.trim() && env.MYSQL_DATABASE?.trim() && env.MYSQL_USER?.trim());
}

export function getMysqlPoolOptions(
  env: Record<string, string | undefined> = process.env
): PoolOptions {
  if (!isMysqlConfigured(env)) {
    throw new Error('MySQL connection settings are incomplete');
  }

  return {
    host: env.MYSQL_HOST?.trim(),
    port: Number(env.MYSQL_PORT ?? 3306),
    user: env.MYSQL_USER?.trim(),
    password: env.MYSQL_PASSWORD ?? '',
    database: env.MYSQL_DATABASE?.trim(),
    waitForConnections: true,
    connectionLimit: Number(env.MYSQL_CONNECTION_LIMIT ?? 10),
    queueLimit: 0,
    charset: 'utf8mb4'
  };
}

export function createMysqlPool(
  env: Record<string, string | undefined> = process.env
): Pool {
  return createPool(getMysqlPoolOptions(env));
}
