
import { getDb } from './src/db';
import { user } from './src/db/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Connecting to DB...');
  const start = Date.now();
  const db = await getDb();
  console.log(`Connected in ${Date.now() - start}ms`);

  console.log('Querying users...');
  const qStart = Date.now();
  const users = await db.select({ count: sql<number>`count(*)` }).from(user);
  console.log(`Query took ${Date.now() - qStart}ms`);
  console.log('User count:', users[0].count);
}

main().catch(console.error).finally(() => process.exit(0));
