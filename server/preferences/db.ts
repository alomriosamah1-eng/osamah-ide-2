/**
 * @fileoverview Persisted per-account UI and agent preferences.
 * All helpers receive a server-trusted user id; callers must enforce ownership
 * before invoking them.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { userPreferences } from "../../drizzle/schema.js";

/** The supported, partial update surface for a user's persisted preferences. */
export type PreferenceUpdate = Partial<{
  language: "ar" | "en";
  theme: "dark" | "light";
  emailNotifications: boolean;
  desktopNotifications: boolean;
  agentMode: "guided" | "review" | "manual";
}>;

/** Creates the Arabic, dark-mode defaults used when an account has no preference row yet. */
export function defaultPreferencesFor(userId: number) {
  return {
    userId,
    language: "ar" as const,
    theme: "dark" as const,
    emailNotifications: 1,
    desktopNotifications: 1,
    agentMode: "guided" as const,
  };
}

/** Retrieves an account's preferences, lazily creating the single owned row when absent. */
export async function getPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (existing) return existing;

  await db.insert(userPreferences).values(defaultPreferencesFor(userId));
  const [created] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (!created) throw new Error("Unable to create user preferences.");
  return created;
}

/** Applies only supplied preference fields and returns the freshly persisted owned row. */
export async function updatePreferences(userId: number, input: PreferenceUpdate) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const values = {
    ...(input.language ? { language: input.language } : {}),
    ...(input.theme ? { theme: input.theme } : {}),
    ...(input.emailNotifications !== undefined ? { emailNotifications: input.emailNotifications ? 1 : 0 } : {}),
    ...(input.desktopNotifications !== undefined ? { desktopNotifications: input.desktopNotifications ? 1 : 0 } : {}),
    ...(input.agentMode ? { agentMode: input.agentMode } : {}),
  };

  await getPreferences(userId);
  if (Object.keys(values).length > 0) {
    await db.update(userPreferences).set(values).where(eq(userPreferences.userId, userId));
  }
  return getPreferences(userId);
}
