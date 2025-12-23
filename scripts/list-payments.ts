import { getDb } from '../src/db';
import { payment } from '../src/db/schema';
import { desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
      console.log('DB not connected');
      return;
  }
  
  const payments = await db.select().from(payment).orderBy(desc(payment.createdAt)).limit(10);
  console.log('Total payments found:', payments.length);
  console.log(JSON.stringify(payments, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
