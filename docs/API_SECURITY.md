# API Security Configuration

This document explains how to configure the API security system that protects your APIs from abuse.

## Overview

The following APIs are now protected:
- `/api/generate-images` - Image generation API
- `/api/chat` - Chat/conversation API

Protection includes:
1. **Authentication**: Users must be logged in
2. **Rate Limiting**: Per-user and per-IP request limits
3. **Credit Consumption**: Each API call consumes credits from the user's balance

## Configuration Files

### 1. Credit Costs & Rate Limits
File: `src/config/api-credits.ts`

Current settings:

| API | Credits/Request | User Limit | IP Limit |
|-----|----------------|------------|----------|
| Chat | 2 credits | 10 req/min | 20 req/min |
| Generate Image | 5 credits | 5 req/min | 10 req/min |

**To adjust these values**, simply edit the `apiCreditsConfig` object in `src/config/api-credits.ts`.

Example:
```typescript
export const apiCreditsConfig: ApiCreditsConfig = {
  chat: {
    creditsPerRequest: 3,  // Changed from 2 to 3
    enforceCredits: true,
    rateLimit: {
      perUser: {
        requests: 20,  // Changed from 10 to 20
        windowMs: 60 * 1000,
      },
      // ...
    },
  },
  // ...
};
```

## Test Accounts (Beta Testing)

Test accounts bypass ALL restrictions:
- ✅ No authentication required
- ✅ No rate limits
- ✅ No credit consumption

### Configuring Test Accounts

Add test account emails to your `.env.local` file:

```bash
# .env.local
TEST_USER_EMAILS=your@email.com,teammate@email.com,beta@tester.com
```

Multiple emails should be separated by commas.

### Example

1. Edit `.env.local`:
   ```bash
   TEST_USER_EMAILS=admin@example.com,developer@example.com
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. Users logged in with these emails can now use the APIs without any limits.

## How It Works

### Authentication Check
All protected APIs first verify the user is logged in using the Better Auth session.

### Rate Limiting
Two-tier rate limiting:
1. **Per User**: Tracks authenticated user's request count
2. **Per IP**: Backup limit based on client IP address

Rate limits are checked in-memory and reset on server restart. For production with multiple servers, consider using Redis.

### Credit System
1. Before processing a request, the system checks if the user has enough credits
2. If sufficient, credits are consumed and the request proceeds
3. If insufficient, a `402 Payment Required` error is returned

Credits are managed in the database and persist across server restarts.

## Error Responses

### 401 Unauthorized
User is not logged in.

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to use this API."
}
```

### 402 Payment Required
Insufficient credits.

```json
{
  "error": "Insufficient credits",
  "message": "This operation requires 5 credits. Please purchase more credits to continue.",
  "creditsRequired": 5
}
```

### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

## Monitoring

All protection events are logged to the console:

- ✅ Successful credit consumption
- ⚠️ Rate limit violations
- ⚠️ Insufficient credits
- ⚠️ Unauthorized access attempts

Check your server logs to monitor API usage and abuse patterns.

## Disabling Protection (Not Recommended)

If you need to temporarily disable credit enforcement:

Edit `src/config/api-credits.ts`:
```typescript
export const apiCreditsConfig: ApiCreditsConfig = {
  chat: {
    creditsPerRequest: 2,
    enforceCredits: false,  // Set to false to disable
    // ...
  },
};
```

Note: Authentication and rate limiting will still be enforced even if `enforceCredits` is `false`.

## Production Considerations

Before deploying to production:

1. ✅ Remove or rotate any test account emails
2. ✅ Review and adjust rate limits based on your expected traffic
3. ✅ Monitor credit consumption patterns
4. ✅ Consider using Redis for distributed rate limiting
5. ✅ Set up alerts for abnormal API usage

## Questions?

- Configuration: `src/config/api-credits.ts`
- Protection logic: `src/lib/api-protection.ts`
- Test accounts: Add to `.env.local` as `TEST_USER_EMAILS`
