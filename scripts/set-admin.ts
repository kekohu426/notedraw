/**
 * 设置用户为 admin 角色
 * 使用方法: npx tsx scripts/set-admin.ts <email>
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { user } from '../src/db/schema';
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

  if (email) {
    // 设置指定邮箱的用户为 admin
    const result = await db
      .update(user)
      .set({ role: 'admin' })
      .where(eq(user.email, email))
      .returning();

    if (result.length > 0) {
      console.log(`✅ 已将用户 ${email} 设置为 admin`);
    } else {
      console.log(`❌ 未找到邮箱为 ${email} 的用户`);
    }
  } else {
    // 列出所有用户
    const users = await db.select({ id: user.id, email: user.email, name: user.name, role: user.role }).from(user);
    console.log('\n当前用户列表:');
    console.log('-------------------');
    for (const u of users) {
      console.log(`${u.email} | ${u.name || 'N/A'} | role: ${u.role || 'user'}`);
    }
    console.log('-------------------');
    console.log('\n使用方法: npx tsx scripts/set-admin.ts <email>');
  }

  await client.end();
}

main().catch(console.error);
