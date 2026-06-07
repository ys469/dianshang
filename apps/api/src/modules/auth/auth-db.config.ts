export type AuthDbProvider = 'mysql' | 'sqljs';

export function resolveAuthDbProvider(
  env: Record<string, string | undefined>
): AuthDbProvider {
  const explicit = env.AUTH_DB_PROVIDER?.trim().toLowerCase();
  if (explicit === 'mysql' || explicit === 'sqljs') {
    return explicit;
  }

  if (env.MYSQL_HOST?.trim() && env.MYSQL_DATABASE?.trim() && env.MYSQL_USER?.trim()) {
    return 'mysql';
  }

  return 'sqljs';
}
