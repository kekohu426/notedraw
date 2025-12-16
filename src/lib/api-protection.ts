import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server';
import { consumeCredits, hasEnoughCredits } from '@/credits/credits';
import { isTestAccountEmail, type ApiProtectionConfig } from '@/config/api-credits';

/**
 * Simple in-memory rate limiter
 * NOTE: This resets on server restart. For production with multiple instances,
 * consider using Redis or a dedicated rate limiting service.
 */
class RateLimiter {
    private requests: Map<string, { count: number; resetTime: number }> = new Map();

    /**
     * Check if a request should be rate limited
     * @param key - Unique identifier (user ID or IP)
     * @param maxRequests - Maximum requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns true if request should be allowed, false if rate limited
     */
    check(key: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        const record = this.requests.get(key);

        // Clean up expired entries periodically (simple cleanup)
        if (record && now > record.resetTime) {
            this.requests.delete(key);
        }

        const current = this.requests.get(key);

        if (!current) {
            // First request in this window
            this.requests.set(key, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (now > current.resetTime) {
            // Window has expired, reset
            this.requests.set(key, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (current.count >= maxRequests) {
            // Rate limit exceeded
            return false;
        }

        // Increment counter
        current.count++;
        return true;
    }

    /**
     * Get remaining requests for a key
     */
    getRemaining(key: string, maxRequests: number): number {
        const record = this.requests.get(key);
        if (!record || Date.now() > record.resetTime) {
            return maxRequests;
        }
        return Math.max(0, maxRequests - record.count);
    }

    /**
     * Get reset time for a key
     */
    getResetTime(key: string): number | null {
        const record = this.requests.get(key);
        if (!record || Date.now() > record.resetTime) {
            return null;
        }
        return record.resetTime;
    }
}

// Global rate limiters
const userRateLimiter = new RateLimiter();
const ipRateLimiter = new RateLimiter();

/**
 * Get client IP address from request
 */
function getClientIp(req: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback to a placeholder (shouldn't happen in production)
    return 'unknown';
}

/**
 * Check authentication and return user session
 * Returns null if not authenticated
 */
export async function checkAuth() {
    try {
        const session = await getSession();
        return session;
    } catch (error) {
        console.error('checkAuth error:', error);
        return null;
    }
}

/**
 * Check if user is a test account (bypasses all limits)
 */
export function isTestAccount(email: string | null | undefined): boolean {
    return isTestAccountEmail(email);
}

/**
 * Check rate limits for the request
 * Returns error response if rate limited, null if OK
 */
export async function checkRateLimit(
    req: NextRequest,
    userId: string | null,
    userEmail: string | null,
    config: ApiProtectionConfig
): Promise<NextResponse | null> {
    // Test accounts bypass rate limits
    if (isTestAccount(userEmail)) {
        return null;
    }

    const ip = getClientIp(req);

    // Check user-level rate limit (if authenticated)
    if (userId) {
        const userAllowed = userRateLimiter.check(
            `user:${userId}`,
            config.rateLimit.perUser.requests,
            config.rateLimit.perUser.windowMs
        );

        if (!userAllowed) {
            const resetTime = userRateLimiter.getResetTime(`user:${userId}`);
            const resetInSeconds = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;

            console.warn(
                `Rate limit exceeded for user ${userId} (${userEmail}), reset in ${resetInSeconds}s`
            );

            return NextResponse.json(
                {
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Please try again in ${resetInSeconds} seconds.`,
                    retryAfter: resetInSeconds,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': resetInSeconds.toString(),
                    }
                }
            );
        }
    }

    // Check IP-level rate limit (always check as backup)
    const ipAllowed = ipRateLimiter.check(
        `ip:${ip}`,
        config.rateLimit.perIp.requests,
        config.rateLimit.perIp.windowMs
    );

    if (!ipAllowed) {
        const resetTime = ipRateLimiter.getResetTime(`ip:${ip}`);
        const resetInSeconds = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;

        console.warn(
            `Rate limit exceeded for IP ${ip}, reset in ${resetInSeconds}s`
        );

        return NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded. Please try again in ${resetInSeconds} seconds.`,
                retryAfter: resetInSeconds,
            },
            {
                status: 429,
                headers: {
                    'Retry-After': resetInSeconds.toString(),
                }
            }
        );
    }

    return null;
}

/**
 * Check if user has enough credits and consume them
 * Returns error response if insufficient credits, null if OK
 */
export async function checkAndConsumeCredits(
    userId: string,
    userEmail: string | null,
    creditsRequired: number,
    description: string,
    enforceCredits: boolean = true
): Promise<NextResponse | null> {
    // Test accounts bypass credit checks
    if (isTestAccount(userEmail)) {
        console.log(`Test account ${userEmail} bypassing credit check`);
        return null;
    }

    // If credits are not enforced (for testing), skip
    if (!enforceCredits) {
        console.log(`Credits not enforced, skipping check for user ${userId}`);
        return null;
    }

    try {
        // Check if user has enough credits
        const hasCredits = await hasEnoughCredits({
            userId,
            requiredCredits: creditsRequired,
        });

        if (!hasCredits) {
            console.warn(
                `Insufficient credits for user ${userId} (${userEmail}), required: ${creditsRequired}`
            );

            return NextResponse.json(
                {
                    error: 'Insufficient credits',
                    message: `This operation requires ${creditsRequired} credits. Please purchase more credits to continue.`,
                    creditsRequired,
                },
                { status: 402 } // 402 Payment Required
            );
        }

        // Consume credits
        await consumeCredits({
            userId,
            amount: creditsRequired,
            description,
        });

        console.log(
            `Consumed ${creditsRequired} credits for user ${userId} (${userEmail}): ${description}`
        );

        return null;
    } catch (error) {
        console.error('checkAndConsumeCredits error:', error);

        return NextResponse.json(
            {
                error: 'Credit system error',
                message: 'Failed to process credits. Please try again later.',
            },
            { status: 500 }
        );
    }
}

/**
 * Complete API protection check
 * Performs authentication, rate limiting, and credit checks
 * Returns error response if any check fails, null if all checks pass
 */
export async function protectApiRoute(
    req: NextRequest,
    config: ApiProtectionConfig,
    operationDescription: string
): Promise<{ error: NextResponse | null; session: any }> {
    // 1. Check authentication
    const session = await checkAuth();

    if (!session?.user) {
        console.warn('Unauthorized API access attempt');
        return {
            error: NextResponse.json(
                {
                    error: 'Unauthorized',
                    message: 'You must be logged in to use this API.',
                },
                { status: 401 }
            ),
            session: null,
        };
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // 2. Check rate limits
    const rateLimitError = await checkRateLimit(req, userId, userEmail, config);
    if (rateLimitError) {
        return { error: rateLimitError, session };
    }

    // 3. Check and consume credits
    const creditError = await checkAndConsumeCredits(
        userId,
        userEmail,
        config.creditsPerRequest,
        operationDescription,
        config.enforceCredits
    );

    if (creditError) {
        return { error: creditError, session };
    }

    // All checks passed
    return { error: null, session };
}
