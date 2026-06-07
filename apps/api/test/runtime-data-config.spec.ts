import { describe, expect, it } from 'vitest';
import { resolveRuntimeDataProvider } from '../src/modules/runtime-data/runtime-data.config';

describe('resolveRuntimeDataProvider', () => {
  it('falls back to file storage when mysql connection settings are absent', () => {
    expect(resolveRuntimeDataProvider({})).toBe('file');
  });

  it('uses mysql when connection settings are present', () => {
    expect(
      resolveRuntimeDataProvider({
        MYSQL_HOST: 'mysql',
        MYSQL_DATABASE: 'smart_member_mall',
        MYSQL_USER: 'smart_member'
      })
    ).toBe('mysql');
  });

  it('lets explicit file mode override mysql settings', () => {
    expect(
      resolveRuntimeDataProvider({
        RUNTIME_DATA_PROVIDER: 'file',
        MYSQL_HOST: 'mysql',
        MYSQL_DATABASE: 'smart_member_mall',
        MYSQL_USER: 'smart_member'
      })
    ).toBe('file');
  });

  it('lets explicit mysql mode override auto detection', () => {
    expect(
      resolveRuntimeDataProvider({
        RUNTIME_DATA_PROVIDER: 'mysql'
      })
    ).toBe('mysql');
  });
});
