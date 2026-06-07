import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import initSqlJs from 'sql.js';
import { hashPassword } from '../../common/crypto';
import { createMysqlPool } from '../../common/mysql';
import { resolveAuthDbProvider, type AuthDbProvider } from './auth-db.config';

export interface AuthUserRecord {
  id: string;
  role: 'user' | 'admin';
  account: string;
  mobile: string | null;
  nickname: string;
  passwordHash: string;
  memberLevel: string | null;
  createdAt: string;
}

interface CreateUserInput {
  role: 'user' | 'admin';
  account: string;
  mobile: string | null;
  nickname: string;
  passwordHash: string;
  memberLevel?: string | null;
}

interface AuthUserRow extends RowDataPacket {
  id: string;
  role: 'user' | 'admin';
  account: string;
  mobile: string | null;
  nickname: string;
  password_hash: string;
  member_level: string | null;
  created_at: string;
}

@Injectable()
export class AuthDbService implements OnModuleInit, OnModuleDestroy {
  private provider: AuthDbProvider = resolveAuthDbProvider(process.env);
  private pool: Pool | null = null;
  private sql: initSqlJs.SqlJsStatic | null = null;
  private database: initSqlJs.Database | null = null;

  async onModuleInit() {
    this.provider = resolveAuthDbProvider(process.env);

    if (this.provider === 'mysql') {
      await this.initMysql();
      return;
    }

    await this.initSqlJs();
  }

  async onModuleDestroy() {
    if (this.provider === 'mysql') {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      return;
    }

    if (this.database) {
      this.persist();
      this.database.close();
      this.database = null;
    }
  }

  async findByRoleAndAccount(role: 'user' | 'admin', account: string) {
    if (this.provider === 'mysql') {
      const [rows] = await this.getPool().query<AuthUserRow[]>(
        `
          SELECT
            id,
            role,
            account,
            mobile,
            nickname,
            password_hash,
            member_level,
            created_at
          FROM auth_users
          WHERE role = ? AND account = ?
          LIMIT 1
        `,
        [role, account]
      );

      return rows[0] ? this.mapUserRecord(rows[0]) : null;
    }

    const statement = this.getSqlDatabase().prepare(
      `
        SELECT
          id,
          role,
          account,
          mobile,
          nickname,
          password_hash,
          member_level,
          created_at
        FROM auth_users
        WHERE role = $role AND account = $account
        LIMIT 1
      `
    );

    try {
      statement.bind({
        $role: role,
        $account: account
      });

      if (!statement.step()) {
        return null;
      }

      return this.mapUserRecord(statement.getAsObject());
    } finally {
      statement.free();
    }
  }

  async findByMobile(mobile: string) {
    if (this.provider === 'mysql') {
      const [rows] = await this.getPool().query<AuthUserRow[]>(
        `
          SELECT
            id,
            role,
            account,
            mobile,
            nickname,
            password_hash,
            member_level,
            created_at
          FROM auth_users
          WHERE mobile = ?
          LIMIT 1
        `,
        [mobile]
      );

      return rows[0] ? this.mapUserRecord(rows[0]) : null;
    }

    const statement = this.getSqlDatabase().prepare(
      `
        SELECT
          id,
          role,
          account,
          mobile,
          nickname,
          password_hash,
          member_level,
          created_at
        FROM auth_users
        WHERE mobile = $mobile
        LIMIT 1
      `
    );

    try {
      statement.bind({ $mobile: mobile });
      if (!statement.step()) {
        return null;
      }

      return this.mapUserRecord(statement.getAsObject());
    } finally {
      statement.free();
    }
  }

  async createUser(input: CreateUserInput) {
    const user: AuthUserRecord = {
      id: randomUUID(),
      role: input.role,
      account: input.account,
      mobile: input.mobile,
      nickname: input.nickname,
      passwordHash: input.passwordHash,
      memberLevel: input.memberLevel ?? null,
      createdAt: new Date().toISOString()
    };

    if (this.provider === 'mysql') {
      await this.getPool().execute(
        `
          INSERT INTO auth_users (
            id,
            role,
            account,
            mobile,
            nickname,
            password_hash,
            member_level,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          user.role,
          user.account,
          user.mobile,
          user.nickname,
          user.passwordHash,
          user.memberLevel,
          user.createdAt
        ]
      );
      return user;
    }

    this.getSqlDatabase().run(
      `
        INSERT INTO auth_users (
          id,
          role,
          account,
          mobile,
          nickname,
          password_hash,
          member_level,
          created_at
        ) VALUES (
          $id,
          $role,
          $account,
          $mobile,
          $nickname,
          $passwordHash,
          $memberLevel,
          $createdAt
        )
      `,
      {
        $id: user.id,
        $role: user.role,
        $account: user.account,
        $mobile: user.mobile,
        $nickname: user.nickname,
        $passwordHash: user.passwordHash,
        $memberLevel: user.memberLevel,
        $createdAt: user.createdAt
      }
    );

    this.persist();
    return user;
  }

  async updateMemberLevel(userId: string, memberLevel: string) {
    if (this.provider === 'mysql') {
      await this.getPool().execute(
        `
          UPDATE auth_users
          SET member_level = ?
          WHERE id = ?
        `,
        [memberLevel, userId]
      );
      return;
    }

    this.getSqlDatabase().run(
      `
        UPDATE auth_users
        SET member_level = $memberLevel
        WHERE id = $id
      `,
      {
        $id: userId,
        $memberLevel: memberLevel
      }
    );

    this.persist();
  }

  async updatePassword(userId: string, passwordHash: string) {
    if (this.provider === 'mysql') {
      await this.getPool().execute(
        `
          UPDATE auth_users
          SET password_hash = ?
          WHERE id = ?
        `,
        [passwordHash, userId]
      );
      return;
    }

    this.getSqlDatabase().run(
      `
        UPDATE auth_users
        SET password_hash = $passwordHash
        WHERE id = $id
      `,
      {
        $id: userId,
        $passwordHash: passwordHash
      }
    );

    this.persist();
  }

  private async initMysql() {
    this.pool = createMysqlPool();

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id VARCHAR(64) PRIMARY KEY,
        role VARCHAR(16) NOT NULL,
        account VARCHAR(128) NOT NULL UNIQUE,
        mobile VARCHAR(32) UNIQUE,
        nickname VARCHAR(128) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        member_level VARCHAR(64) NULL,
        created_at VARCHAR(40) NOT NULL,
        INDEX idx_auth_users_role_account (role, account)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    const migrated = await this.migrateLegacySqlJsUsersIfPresent();
    if (!migrated) {
      await this.seedDefaultUsers();
    }
  }

  private async initSqlJs() {
    this.sql = await initSqlJs({
      locateFile: () => this.resolveWasmFile()
    });

    const dbPath = this.getDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });

    this.database = existsSync(dbPath)
      ? new this.sql.Database(readFileSync(dbPath))
      : new this.sql.Database();

    this.database.run(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        account TEXT NOT NULL UNIQUE,
        mobile TEXT UNIQUE,
        nickname TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        member_level TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_auth_users_role_account
      ON auth_users(role, account);
    `);

    await this.seedDefaultUsers();
    this.persist();
  }

  private async seedDefaultUsers() {
    if (this.provider === 'mysql') {
      const [rows] = await this.getPool().query<Array<RowDataPacket & { cnt: number }>>(
        'SELECT COUNT(*) AS cnt FROM auth_users'
      );
      if ((rows[0]?.cnt ?? 0) > 0) {
        return;
      }
    } else {
      const countResult = this.getSqlDatabase().exec('SELECT COUNT(*) AS cnt FROM auth_users');
      if (countResult.length > 0 && (countResult[0].values[0][0] as number) > 0) {
        return;
      }
    }

    await this.createUser({
      role: 'admin',
      account: 'admin',
      mobile: null,
      nickname: '\u8fd0\u8425\u7ba1\u7406\u5458',
      passwordHash: hashPassword('admin123')
    });

    await this.createUser({
      role: 'user',
      account: '13800138000',
      mobile: '13800138000',
      nickname: '\u661f\u9009\u4f1a\u5458',
      memberLevel: '\u9ec4\u91d1\u4f1a\u5458',
      passwordHash: hashPassword('member123')
    });
  }

  private async migrateLegacySqlJsUsersIfPresent() {
    const [rows] = await this.getPool().query<Array<RowDataPacket & { cnt: number }>>(
      'SELECT COUNT(*) AS cnt FROM auth_users'
    );
    if ((rows[0]?.cnt ?? 0) > 0) {
      return false;
    }

    const legacyUsers = await this.readLegacyUsersFromSqlJsFile();
    if (!legacyUsers.length) {
      return false;
    }

    for (const user of legacyUsers) {
      await this.getPool().execute(
        `
          INSERT INTO auth_users (
            id,
            role,
            account,
            mobile,
            nickname,
            password_hash,
            member_level,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          user.role,
          user.account,
          user.mobile,
          user.nickname,
          user.passwordHash,
          user.memberLevel,
          user.createdAt
        ]
      );
    }

    return true;
  }

  private async readLegacyUsersFromSqlJsFile() {
    const dbPath = this.getDbPath();
    if (!existsSync(dbPath)) {
      return [];
    }

    const sql = await initSqlJs({
      locateFile: () => this.resolveWasmFile()
    });
    const database = new sql.Database(readFileSync(dbPath));

    try {
      const statement = database.prepare(
        `
          SELECT
            id,
            role,
            account,
            mobile,
            nickname,
            password_hash,
            member_level,
            created_at
          FROM auth_users
        `
      );

      const users: AuthUserRecord[] = [];

      try {
        while (statement.step()) {
          users.push(this.mapUserRecord(statement.getAsObject()));
        }
      } finally {
        statement.free();
      }

      return users;
    } finally {
      database.close();
    }
  }

  private mapUserRecord(row: Record<string, unknown>): AuthUserRecord {
    return {
      id: String(row.id),
      role: row.role === 'admin' ? 'admin' : 'user',
      account: String(row.account),
      mobile: row.mobile ? String(row.mobile) : null,
      nickname: String(row.nickname),
      passwordHash: String(row.password_hash),
      memberLevel: row.member_level ? String(row.member_level) : null,
      createdAt: String(row.created_at)
    };
  }

  private persist() {
    if (!this.database) {
      return;
    }

    writeFileSync(this.getDbPath(), Buffer.from(this.database.export()));
  }

  private resolveWasmFile() {
    if (typeof require !== 'undefined' && typeof require.resolve === 'function') {
      try {
        return require.resolve('sql.js/dist/sql-wasm.wasm');
      } catch {
        // Fall through to the workspace-local resolution below.
      }
    }

    return resolve(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  }

  private getDbPath() {
    return resolve(process.env.AUTH_DB_FILE ?? 'apps/api/runtime/auth.sqlite');
  }

  private getSqlDatabase() {
    if (!this.database) {
      throw new Error('SQL.js auth database has not been initialized');
    }

    return this.database;
  }

  private getPool() {
    if (!this.pool) {
      throw new Error('MySQL auth database has not been initialized');
    }

    return this.pool;
  }
}
