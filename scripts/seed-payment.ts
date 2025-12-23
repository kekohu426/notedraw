import { getDb } from '../src/db';
import { payment, user } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
      console.log('DB not connected');
      return;
  }

  // Get the first user (likely the admin)
  const users = await db.select().from(user).limit(1);
  if (users.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
  }
  const targetUser = users[0];
  console.log(`Inserting payment for user: ${targetUser.email} (${targetUser.id})`);

  // Insert a mock payment
  await db.insert(payment).values({
      id: `pay_${nanoid()}`,
      userId: targetUser.id,
      customerId: `cus_${nanoid()}`,
      priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_PRO_MONTHLY || 'price_mock_monthly',
      type: 'subscription',
      status: 'succeeded',
      provider: 'creem',
      paid: true,
      createdAt: new Date(),
      updatedAt: new Date(),
  });
  
  console.log('Mock payment inserted successfully!');
}

main().catch(console.error).finally(() => process.exit(0));
