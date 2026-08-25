import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, localAccounts, users } from "../drizzle/schema";
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

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getLocalAccountByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ account: localAccounts, user: users })
    .from(localAccounts)
    .innerJoin(users, eq(localAccounts.userId, users.id))
    .where(eq(localAccounts.email, email))
    .limit(1);
  return result[0];
}

export async function getLocalAccountByKey(accountKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ account: localAccounts, user: users })
    .from(localAccounts)
    .innerJoin(users, eq(localAccounts.userId, users.id))
    .where(eq(localAccounts.accountKey, accountKey))
    .limit(1);
  return result[0];
}

export async function createLocalAccount(input: {
  openId: string;
  accountKey: string;
  passwordHash: string;
  recoveryQuestion: string;
  recoveryAnswerHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");

  return db.transaction(async tx => {
    await tx.insert(users).values({
      openId: input.openId,
      loginMethod: "local",
      lastSignedIn: new Date(),
    });
    const createdUser = await tx.select().from(users).where(eq(users.openId, input.openId)).limit(1);
    const user = createdUser[0];
    if (!user) throw new Error("Local account user creation failed.");
    await tx.insert(localAccounts).values({
      userId: user.id,
      accountKey: input.accountKey,
      passwordHash: input.passwordHash,
      recoveryQuestion: input.recoveryQuestion,
      recoveryAnswerHash: input.recoveryAnswerHash,
    });
    return user;
  });
}

export async function updateLocalAccountPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(localAccounts).set({ passwordHash }).where(eq(localAccounts.userId, userId));
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function touchLocalUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export function normalizeLocalEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function updateLocalAccountProfile(userId: number, input: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");

  const [account] = await db.select().from(localAccounts).where(eq(localAccounts.userId, userId)).limit(1);
  if (!account) throw new Error("Local account profile is unavailable for this user.");

  const email = input.email ? normalizeLocalEmail(input.email) : undefined;
  if (email && email !== account.email) {
    const [emailOwner] = await db.select().from(localAccounts).where(eq(localAccounts.email, email)).limit(1);
    if (emailOwner && emailOwner.userId !== userId) throw new Error("Local email address is already in use.");
  }

  const userValues = {
    ...(input.name ? { name: input.name.trim() } : {}),
    ...(email ? { email } : {}),
  };
  if (Object.keys(userValues).length > 0) {
    await db.update(users).set(userValues).where(eq(users.id, userId));
  }
  if (email) {
    await db.update(localAccounts).set({ email }).where(eq(localAccounts.userId, userId));
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Local user profile was not found after update.");
  return user;
}
