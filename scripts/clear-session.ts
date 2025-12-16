/**
 * 清除用户的所有 session（强制重新登录）
 * 使用方法: npx tsx scripts/clear-session.ts <email>
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { user, session } from '../src/db/schema';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载 .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const email = process.argv[2];

async function main() {
  const client = postgres(DATABASE_URL!);
  const db = drizzle(client);

  if (!email) {
    console.log('使用方法: npx tsx scripts/clear-session.ts <email>');
    await client.end();
    return;
  }

  // 找到用户
  const users = await db.select({ id: user.id }).from(user).where(eq(user.email, email));

  if (users.length === 0) {
    console.log(`❌ 未找到邮箱为 ${email} 的用户`);
    await client.end();
    return;
  }

  const userId = users[0].id;

  // 删除该用户的所有 session
  const result = await db.delete(session).where(eq(session.userId, userId)).returning();

  console.log(`✅ 已清除用户 ${email} 的 ${result.length} 个 session`);
  console.log('请刷新页面重新登录');

  await client.end();
}

main().catch(console.error);
