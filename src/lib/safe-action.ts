import { createSafeActionClient } from 'next-safe-action';
import type { User } from './auth-types';
import { getSession } from './server';

// -----------------------------------------------------------------------------
// 1. Base action client – put global error handling / metadata here if needed
// -----------------------------------------------------------------------------
export const actionClient = createSafeActionClient({
  handleServerError: (e) => {
    if (e instanceof Error) {
      return {
        success: false,
        error: e.message,
      };
    }

    return {
      success: false,
      error: 'Something went wrong while executing the action',
    };
  },
});

// -----------------------------------------------------------------------------
// 2. Auth-guarded client
// -----------------------------------------------------------------------------
export const userActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  return next({ ctx: { user: session.user } });
});

// -----------------------------------------------------------------------------
// 3. Admin-only client (extends auth client)
// -----------------------------------------------------------------------------
export const adminActionClient = userActionClient.use(async ({ next, ctx }) => {
  const user = (ctx as { user: User }).user;
  const isAdmin = user.role === 'admin';

  // 严格检查管理员权限
  if (!isAdmin) {
    throw new Error('Unauthorized');
  }

  return next({ ctx });
});

// -----------------------------------------------------------------------------
// 4. Public client (no authentication required)
// -----------------------------------------------------------------------------
export const publicActionClient = actionClient;

