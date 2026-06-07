import { describe, expect, it } from 'vitest';
import { resolveAuthDbProvider } from '../src/modules/auth/auth-db.config';

describe('resolveAuthDbProvider', () => {
  it('falls back to sqljs when mysql connection settings are absent', () => {
    expect(resolveAuthDbProvider({})).toBe('sqljs');
  });

  it('uses mysql when connection settings are present', () => {
    expect(
      resolveAuthDbProvider({
        MYSQL_HOST: 'mysql',
        MYSQL_DATABASE: 'smart_member_mall',
        MYSQL_USER: 'smart_member'
      })
    ).toBe('mysql');
  });

  it('lets explicit sqljs mode override mysql settings', () => {
    expect(
      resolveAuthDbProvider({
        AUTH_DB_PROVIDER: 'sqljs',
        MYSQL_HOST: 'mysql',
        MYSQL_DATABASE: 'smart_member_mall',
        MYSQL_USER: 'smart_member'
      })
    ).toBe('sqljs');
  });

  it('lets explicit mysql mode override auto detection', () => {
    expect(
      resolveAuthDbProvider({
        AUTH_DB_PROVIDER: 'mysql'
      })
    ).toBe('mysql');
  });
});
