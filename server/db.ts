import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, InsertConversation, InsertMessage, audioFiles, InsertAudioFile, usageTracking, InsertUsageTracking } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation helpers
export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(conversations).values(data);
  if (!result || !result[0]) throw new Error("Failed to create conversation");
  return result[0].insertId;
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (result.length === 0 || result[0].userId !== userId) return undefined;
  return result[0];
}

export async function deleteConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership
  const conv = await getConversation(id, userId);
  if (!conv) throw new Error("Conversation not found or unauthorized");
  
  // Delete messages first
  await db.delete(messages).where(eq(messages.conversationId, id));
  // Delete conversation
  await db.delete(conversations).where(eq(conversations.id, id));
}

export async function updateConversationTimestamp(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));
}

// Message helpers
export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(messages).values(data);
  if (!result || !result[0]) throw new Error("Failed to create message");
  return result[0].insertId;
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

// Audio file helpers
export async function createAudioFile(data: InsertAudioFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(audioFiles).values(data);
  if (!result || !result[0]) throw new Error("Failed to create audio file record");
  return result[0].insertId;
}

export async function getAudioFile(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(audioFiles).where(eq(audioFiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserAudioFiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(audioFiles).where(eq(audioFiles.userId, userId)).orderBy(desc(audioFiles.createdAt));
}

// Usage tracking helpers
export async function trackUsage(data: InsertUsageTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(usageTracking).values(data);
  if (!result || !result[0]) throw new Error("Failed to track usage");
  return result[0].insertId;
}

/**
 * Get user's usage count for a specific type
 * @param userId - User ID
 * @param usageType - Type of usage to track
 * @param isLifetime - If true, count all-time usage. If false, count current month only.
 * @returns Usage count
 */
export async function getUserUsageCount(
  userId: number,
  usageType: 'audioAnalysis' | 'midiGeneration' | 'stemSeparation',
  isLifetime: boolean = false
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Build where conditions
  const conditions = [
    eq(usageTracking.userId, userId),
    eq(usageTracking.usageType, usageType)
  ];

  // If not lifetime, filter by current month
  if (!isLifetime) {
    conditions.push(eq(usageTracking.month, currentMonth));
  }

  const result = await db.select().from(usageTracking)
    .where(and(...conditions));
  
  return result.length;
}

/**
 * Get user's total cost for current month
 * @param userId - User ID
 * @returns Total cost in cents
 */
export async function getUserMonthlyCost(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db.select().from(usageTracking)
    .where(and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.month, currentMonth)
    ));

  return result.reduce((total: number, record: any) => total + record.cost, 0);
}

/**
 * Get user's usage breakdown for current month
 * @param userId - User ID
 * @returns Object with usage counts by type
 */
export async function getUserUsageBreakdown(userId: number): Promise<{
  audioAnalysis: number;
  midiGeneration: number;
  stemSeparation: number;
  totalCost: number;
}> {
  const db = await getDb();
  if (!db) return { audioAnalysis: 0, midiGeneration: 0, stemSeparation: 0, totalCost: 0 };

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db.select().from(usageTracking)
    .where(and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.month, currentMonth)
    ));

  const breakdown = {
    audioAnalysis: 0,
    midiGeneration: 0,
    stemSeparation: 0,
    totalCost: 0,
  };

  result.forEach((record: any) => {
    if (record.usageType in breakdown) {
      breakdown[record.usageType as keyof typeof breakdown]++;
    }
    breakdown.totalCost += record.cost;
  });

  return breakdown;
}
