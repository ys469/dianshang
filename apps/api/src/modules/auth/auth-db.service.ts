import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { hashPassword } from '../../common/crypto';

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

@Injectable()
export class AuthDbService implements OnModuleInit, OnModuleDestroy {
  private sql!: initSqlJs.SqlJsStatic;
  private database!: initSqlJs.Database;

  async onModuleInit() {
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

    this.seedDefaultUsers();
    this.persist();
  }

  onModuleDestroy() {
    if (!this.database) {
      return;
    }

    this.persist();
    this.database.close();
  }

  findByRoleAndAccount(role: 'user' | 'admin', account: string) {
    const statement = this.database.prepare(
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

  findByMobile(mobile: string) {
    const statement = this.database.prepare(
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

  createUser(input: CreateUserInput) {
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

    this.database.run(
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

  updateMemberLevel(userId: string, memberLevel: string) {
    this.database.run(
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

  updatePassword(userId: string, passwordHash: string) {
    this.database.run(
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

  private seedDefaultUsers() {
    // Only seed if the auth_users table is empty
    const countResult = this.database.exec('SELECT COUNT(*) AS cnt FROM auth_users');
    if (countResult.length > 0 && countResult[0].values[0][0] as number > 0) {
      return;
    }

    // Default admin account
    this.createUser({
      role: 'admin',
      account: 'admin',
      mobile: null,
      nickname: '运营管理员',
      passwordHash: hashPassword('admin123')
    });

    // Default member account
    this.createUser({
      role: 'user',
      account: '13800138000',
      mobile: '13800138000',
      nickname: '星选会员',
      memberLevel: '黄金会员',
      passwordHash: hashPassword('member123')
    });
  }

  private getDbPath() {
    return resolve(process.env.AUTH_DB_FILE ?? 'apps/api/runtime/auth.sqlite');
  }
}
