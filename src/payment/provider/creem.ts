import { PaymentProvider, CreateCheckoutParams, CheckoutResult, CreateCreditCheckoutParams, CreatePortalParams, PortalResult } from '../types';
import { getDb } from '@/db';
import { payment as paymentTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { websiteConfig } from '@/config/website';
import {
  addCredits,
  addSubscriptionCredits,
} from '@/credits/credits';
import { CREDIT_TRANSACTION_TYPE } from '@/credits/types';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Creem webhook signature using HMAC-SHA256
 * This prevents attackers from sending fake webhook events
 */
function verifyCreemSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    console.warn('Creem webhook: Missing signature or secret');
    return false;
  }

  try {
    // Creem typically sends signature as "sha256=<hash>" or just the hash
    const receivedSig = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    // Generate expected signature using HMAC-SHA256
    const expectedSig = createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const receivedBuffer = Buffer.from(receivedSig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch (error) {
    console.error('Creem signature verification error:', error);
    return false;
  }
}

interface CreemCheckoutSession {
  id: string;
  checkout_url: string;
  customer_id: string;
  // Add other fields as needed based on Creem API response
}

export class CreemProvider implements PaymentProvider {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.CREEM_API_KEY || '';
    this.webhookSecret = process.env.CREEM_WEBHOOK_SECRET || '';
    
    // Determine Base URL based on API Key prefix
    // Test keys usually start with "creem_test_"
    if (this.apiKey.startsWith('creem_test_')) {
      this.baseUrl = 'https://test-api.creem.io/v1';
    } else {
      this.baseUrl = 'https://api.creem.io/v1';
    }
  }

  async createCustomerPortal(params: CreatePortalParams): Promise<PortalResult> {
    // Implement customer portal creation
    // Creem docs: https://docs.creem.io/api-reference/endpoint/create-customer-billing
    const { customerId } = params;
    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}/billing_portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Creem API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { url: data.url };
    } catch (error) {
      console.error('Error creating Creem customer portal:', error);
      throw error;
    }
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const { priceId, customerEmail, successUrl, cancelUrl, metadata } = params;
    
    // Find the price configuration to get Creem Price ID
    let creemPriceId: string | undefined;
    
    // Check in plans
    for (const plan of Object.values(websiteConfig.price.plans)) {
      const price = plan.prices.find(p => p.priceId === priceId);
      if (price) {
        creemPriceId = price.creemPriceId;
        break;
      }
    }

    if (!creemPriceId) {
      throw new Error('Creem price ID not found for the given price ID');
    }

    console.log('Creem createCheckout - Params:', {
      priceId,
      creemPriceId,
      customerEmail,
      successUrl,
      cancelUrl,
      apiKeyPrefix: this.apiKey.substring(0, 8) + '...',
    });

    try {
      // Creem checkout session creation
      // Docs: https://docs.creem.io/api-reference/endpoint/create-checkout
      const payload = {
        product_id: creemPriceId,
        customer: {
          email: customerEmail,
        },
        success_url: successUrl,
        metadata: {
          ...metadata,
          priceId: priceId, // Store original (internal) price ID reference if needed
        },
      };

      console.log('Creem createCheckout - Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${this.baseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Creem checkout error raw response:', errorText);
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            errorData = { message: errorText };
        }
        throw new Error(`Creem API error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data: CreemCheckoutSession = await response.json();
      console.log('Creem checkout success:', data);
      return { url: data.checkout_url, id: data.id };
    } catch (error) {
      console.error('Error creating Creem checkout session:', error);
      throw error;
    }
  }

  async createCreditCheckout(params: CreateCreditCheckoutParams): Promise<CheckoutResult> {
    const { priceId, customerEmail, successUrl, cancelUrl, metadata } = params;

    // Find the credit package configuration to get Creem Price ID
    let creemPriceId: string | undefined;
    let credits = 0;

    // Check in credit packages
    for (const pkg of Object.values(websiteConfig.credits.packages)) {
      if (pkg.price.priceId === priceId) {
        creemPriceId = pkg.price.creemPriceId;
        credits = pkg.amount;
        break;
      }
    }

    if (!creemPriceId) {
      throw new Error('Creem price ID not found for the given credit package');
    }

    try {
      const payload = {
        product_id: creemPriceId,
        customer: {
          email: customerEmail,
        },
        success_url: successUrl,
        metadata: {
          ...metadata,
          credits: credits.toString(),
          type: 'credit_purchase',
        },
      };

      const response = await fetch(`${this.baseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Creem API error: ${response.statusText}`);
      }

      const data: CreemCheckoutSession = await response.json();
      return { url: data.checkout_url, id: data.id };
    } catch (error) {
      console.error('Error creating Creem credit checkout:', error);
      throw error;
    }
  }

  async getCheckoutSession(sessionId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/checkouts/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        console.error(`Creem getCheckoutSession error: ${response.status}`);
        return null;
      }

      const session = await response.json();
      
      // If payment is successful but not recorded in DB (e.g. local dev without webhook), record it now
      if (session.status === 'completed' || session.status === 'active') {
        // Check if already in DB to avoid duplicates
          const db = await getDb();
          if (db) {
            const existing = await db
              .select()
              .from(paymentTable)
              .where(eq(paymentTable.id, session.id))
              .limit(1);
            
            if (existing.length === 0) {
               console.log('Payment completed but not in DB, recording now:', session.id);
               await this.handleCheckoutCompleted(session);
            }
          }
      }

      return session;
    } catch (error) {
      console.error('Error getting Creem checkout session:', error);
      return null;
    }
  }

  async handleWebhookEvent(payload: string, signature: string): Promise<void> {
    // Verify webhook signature for security
    // Skip verification only in development if no secret is configured
    if (this.webhookSecret) {
      const isValid = verifyCreemSignature(payload, signature, this.webhookSecret);
      if (!isValid) {
        console.error('Creem webhook signature verification failed');
        throw new Error('Invalid webhook signature');
      }
      console.log('Creem webhook signature verified successfully');
    } else if (process.env.NODE_ENV === 'production') {
      // In production, require webhook secret
      console.error('CREEM_WEBHOOK_SECRET is not configured in production');
      throw new Error('Webhook secret not configured');
    } else {
      console.warn('Creem webhook: Skipping signature verification in development (no secret configured)');
    }

    const event = JSON.parse(payload);
    
    try {
      switch (event.type) {
        case 'checkout.completed':
          await this.handleCheckoutCompleted(event.data);
          break;
        case 'subscription.updated':
          // Handle subscription updates
          break;
        case 'subscription.canceled':
          // Handle cancellation
          break;
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: any) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    // Get DB instance
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed');
      return;
    }

    const priceId = session.metadata?.priceId;
    const type = session.metadata?.type || 'subscription';

    // Logic to update database based on payment success
    await db.insert(paymentTable).values({
      id: session.id,
      priceId: priceId || 'unknown',
      type: type,
      customerId: session.customer_id,
      userId: userId,
      status: 'succeeded',
      provider: 'creem',
      paid: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Payment recorded for user ${userId}, type: ${type}`);

    // Process benefits based on type
    if (type === 'credit_purchase') {
      const credits = parseInt(session.metadata.credits || '0');
      if (credits > 0) {
        console.log(`Adding ${credits} credits to user ${userId}`);
        await addCredits({
          userId: userId,
          amount: credits,
          type: CREDIT_TRANSACTION_TYPE.PURCHASE_PACKAGE,
          description: `Purchase credits via Creem`,
          paymentId: session.id,
        });
      }
    } else if (type === 'subscription' && priceId) {
      if (websiteConfig.credits?.enableCredits) {
        console.log(`Adding subscription credits for user ${userId}, priceId: ${priceId}`);
        await addSubscriptionCredits(userId, priceId);
      }
    }
  }
}
