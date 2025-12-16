'use server';

import { getDb } from '@/db';
import { payment } from '@/db/schema';
import { userActionClient } from '@/lib/safe-action';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getPaymentProvider } from '@/payment';

const checkPaymentCompletionSchema = z.object({
  sessionId: z.string(),
});

/**
 * Check if a payment is completed for the given session ID
 */
export const checkPaymentCompletionAction = userActionClient
  .schema(checkPaymentCompletionSchema)
  .action(async ({ parsedInput: { sessionId } }) => {
    try {
      const db = await getDb();
      let paymentRecord = await db
        .select()
        .from(payment)
        .where(eq(payment.sessionId, sessionId))
        .limit(1);

      let isPaid = paymentRecord[0]?.paid || false;

      // If not paid in DB, check with provider (polling fallback for missing webhooks)
      if (!isPaid) {
        try {
            console.log('Payment not found or unpaid in DB, checking with provider...', sessionId);
            const provider = getPaymentProvider();
            // This will also update DB if payment is found and completed
            await provider.getCheckoutSession(sessionId);
            
            // Re-fetch from DB
            paymentRecord = await db
                .select()
                .from(payment)
                .where(eq(payment.sessionId, sessionId))
                .limit(1);
            
            isPaid = paymentRecord[0]?.paid || false;
        } catch (err) {
            console.error('Error checking payment status with provider:', err);
        }
      }

      console.log('Check payment completion, isPaid:', isPaid);

      return {
        success: true,
        isPaid,
      };
    } catch (error) {
      console.error('Check payment completion error:', error);
      return {
        success: false,
        error: 'Failed to check payment completion',
      };
    }
  });
