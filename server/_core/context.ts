import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getDb, getUserByOpenId } from "../db";
import { users } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Dev mode auto-login
async function getDevUser(): Promise<User | null> {
  if (process.env.DEV_MODE !== 'true') return null;

  const db = await getDb();
  if (!db) return null;

  const devEmail = process.env.DEV_USER_EMAIL || 'dev@beatwizard.com';
  const devOpenId = 'dev-user-123';

  // Try to find existing dev user
  let user = await getUserByOpenId(devOpenId);

  // Create dev user if doesn't exist
  if (!user) {
    const [newUser] = await db.insert(users).values({
      openId: devOpenId,
      email: devEmail,
      name: 'Dev User',
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
    }).returning();
    user = newUser;
    console.log('🔧 Dev mode: Created test user');
  }

  return user;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Check dev mode first
  if (process.env.DEV_MODE === 'true') {
    user = await getDevUser();
    if (user) {
      console.log('🔧 Dev mode: Auto-logged in as', user.email);
    }
  } else {
    // Normal OAuth authentication
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
