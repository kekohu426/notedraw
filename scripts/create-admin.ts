/**
 * 创建管理员用户脚本
 * 使用方法: npx tsx scripts/create-admin.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, account } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { scrypt } from '@noble/hashes/scrypt';
import { randomBytes } from 'crypto';

// 加载 .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    console.log('请确保 .env.local 文件中设置了 DATABASE_URL');
    process.exit(1);
}

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

async function createAdmin() {
    const client = postgres(DATABASE_URL!, { prepare: false });
    const db = drizzle(client);

    const adminEmail = 'admin@notedraw.com';
    const adminPassword = 'admin123';
    const adminName = 'Admin';

    try {
        // 检查用户是否已存在
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail));

        if (existingUser.length > 0) {
            console.log('⚠️  管理员用户已存在，正在更新角色和密码...');

            // 更新用户角色为 admin
            await db.update(user)
                .set({ role: 'admin' })
                .where(eq(user.email, adminEmail));

            // 更新密码
            const hashedPassword = await hashPassword(adminPassword);
            await db.update(account)
                .set({ password: hashedPassword })
                .where(and(eq(account.userId, existingUser[0].id), eq(account.providerId, 'credential')));

            console.log('✅ 管理员用户已更新');
        } else {
            // 创建新用户
            const userId = crypto.randomUUID();
            const hashedPassword = await hashPassword(adminPassword);
            const now = new Date();

            // 插入用户
            await db.insert(user).values({
                id: userId,
                name: adminName,
                email: adminEmail,
                emailVerified: true, // 直接验证邮箱
                role: 'admin',
                createdAt: now,
                updatedAt: now,
            });

            // 插入账户（包含密码）
            await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: userId,
                providerId: 'credential',
                userId: userId,
                password: hashedPassword,
                createdAt: now,
                updatedAt: now,
            });

            console.log('✅ 管理员用户创建成功！');
        }

        console.log('');
        console.log('📧 邮箱: ' + adminEmail);
        console.log('🔑 密码: ' + adminPassword);
        console.log('👤 角色: admin');
        console.log('');
        console.log('现在可以使用以上凭据登录: http://localhost:3000/auth/login');

    } catch (error) {
        console.error('❌ 创建管理员用户失败:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createAdmin();
