/**
 * 重置用户密码
 * 使用方法: npx tsx scripts/reset-password.ts <email> <new-password>
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { user, account } from '../src/db/schema';
import { config } from 'dotenv';
import { resolve } from 'path';
import { scrypt } from '@noble/hashes/scrypt';
import { randomBytes } from 'crypto';

// 加载 .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const email = process.argv[2];
const newPassword = process.argv[3];

// Better Auth 的 scrypt 参数
const scryptConfig = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 使用与 Better Auth 完全相同的方式哈希密码
async function hashPassword(password: string): Promise<string> {
  const salt = bytesToHex(randomBytes(16));
  const normalizedPassword = password.normalize('NFKC');
  const key = scrypt(normalizedPassword, salt, scryptConfig);
  return `${salt}:${bytesToHex(key)}`;
}

async function main() {
  if (!email || !newPassword) {
    console.log('使用方法: npx tsx scripts/reset-password.ts <email> <new-password>');
    process.exit(1);
  }

  const client = postgres(DATABASE_URL!);
  const db = drizzle(client);

  // 找到用户
  const users = await db.select({ id: user.id }).from(user).where(eq(user.email, email));

  if (users.length === 0) {
    console.log(`❌ 未找到邮箱为 ${email} 的用户`);
    await client.end();
    return;
  }

  const userId = users[0].id;

  // 哈希新密码
  const hashedPassword = await hashPassword(newPassword);

  // 更新 account 表中的密码（credential 类型的账号）
  const result = await db
    .update(account)
    .set({ password: hashedPassword })
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .returning();

  if (result.length > 0) {
    console.log(`✅ 已将用户 ${email} 的密码重置为: ${newPassword}`);
  } else {
    console.log(`❌ 未找到该用户的密码账号，可能是 OAuth 登录用户`);
  }

  await client.end();
}

main().catch(console.error);
