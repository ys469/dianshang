export type RuntimeDataProvider = 'mysql' | 'file';

export function resolveRuntimeDataProvider(
  env: Record<string, string | undefined>
): RuntimeDataProvider {
  const explicit = env.RUNTIME_DATA_PROVIDER?.trim().toLowerCase();
  if (explicit === 'mysql' || explicit === 'file') {
    return explicit;
  }

  if (env.MYSQL_HOST?.trim() && env.MYSQL_DATABASE?.trim() && env.MYSQL_USER?.trim()) {
    return 'mysql';
  }

  return 'file';
}
