/**
 * API Credits and Rate Limiting Configuration
 * 
 * This file centralizes all API protection settings including:
 * - Credit costs per API call
 * - Rate limiting rules (per user and per IP)
 * - Test account configurations
 * 
 * All values here can be easily adjusted without touching the API code.
 */

export interface RateLimitConfig {
    /** Maximum number of requests allowed */
    requests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

export interface ApiProtectionConfig {
    /** Credits consumed per request */
    creditsPerRequest: number;
    /** Whether to enforce credit consumption (can be disabled for testing) */
    enforceCredits: boolean;
    /** Rate limiting configuration */
    rateLimit: {
        /** Rate limit per authenticated user */
        perUser: RateLimitConfig;
        /** Rate limit per IP address (for unauthenticated or as backup) */
        perIp: RateLimitConfig;
    };
}

export interface ApiCreditsConfig {
    /** Chat/conversation API configuration */
    chat: ApiProtectionConfig;
    /** Image generation API configuration */
    generateImage: ApiProtectionConfig;
}

/**
 * Main API protection configuration
 * 
 * Adjust these values to control costs and prevent abuse
 */
export const apiCreditsConfig: ApiCreditsConfig = {
    /**
     * Chat API Configuration
     * Default: 2 credits per message, 10 req/min per user, 20 req/min per IP
     */
    chat: {
        creditsPerRequest: 2,
        enforceCredits: false, // Temporarily disabled for testing
        rateLimit: {
            perUser: {
                requests: 10,
                windowMs: 60 * 1000, // 1 minute
            },
            perIp: {
                requests: 20,
                windowMs: 60 * 1000, // 1 minute
            },
        },
    },

    /**
     * Image Generation API Configuration
     * Default: 5 credits per image, 5 req/min per user, 10 req/min per IP
     */
    generateImage: {
        creditsPerRequest: 5,
        enforceCredits: false, // Temporarily disabled for testing
        rateLimit: {
            perUser: {
                requests: 5,
                windowMs: 60 * 1000, // 1 minute
            },
            perIp: {
                requests: 10,
                windowMs: 60 * 1000, // 1 minute
            },
        },
    },
};

/**
 * Get test account emails from environment variable
 * Format: TEST_USER_EMAILS=email1@example.com,email2@example.com
 */
export function getTestAccountEmails(): string[] {
    const emailsEnv = process.env.TEST_USER_EMAILS;
    if (!emailsEnv) {
        return [];
    }
    return emailsEnv
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);
}

/**
 * Check if an email belongs to a test account
 * Test accounts bypass all credit checks and rate limits
 */
export function isTestAccountEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const testEmails = getTestAccountEmails();
    return testEmails.includes(email.toLowerCase());
}
