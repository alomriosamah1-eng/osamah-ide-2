import {
  index,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const localAccounts = mysqlTable("localAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  recoveryQuestion: varchar("recoveryQuestion", { length: 128 }).notNull(),
  recoveryAnswerHash: varchar("recoveryAnswerHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  language: mysqlEnum("language", ["ar", "en"]).default("ar").notNull(),
  theme: mysqlEnum("theme", ["dark", "light"]).default("dark").notNull(),
  emailNotifications: int("emailNotifications").default(1).notNull(),
  desktopNotifications: int("desktopNotifications").default(1).notNull(),
  agentMode: mysqlEnum("agentMode", ["guided", "review", "manual"]).default("guided").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 64 }),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("projects_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

export const projectFiles = mysqlTable("projectFiles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: int("parentId"),
  path: varchar("path", { length: 1024 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  kind: mysqlEnum("kind", ["file", "directory"]).notNull(),
  language: varchar("language", { length: 64 }),
  content: mediumtext("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("project_files_project_path_unique").on(table.projectId, table.path),
  index("project_files_project_parent_idx").on(table.projectId, table.parentId),
]);

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["todo", "in_progress", "done"]).default("todo").notNull(),
  dueAt: timestamp("dueAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("tasks_owner_status_idx").on(table.ownerId, table.status)]);

export const knowledgeItems = mysqlTable("knowledgeItems", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  kind: mysqlEnum("kind", ["note", "source", "insight"]).notNull(),
  content: mediumtext("content"),
  sourceUrl: varchar("sourceUrl", { length: 2048 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("knowledge_items_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

export const knowledgeLinks = mysqlTable("knowledgeLinks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromItemId: int("fromItemId").notNull().references(() => knowledgeItems.id, { onDelete: "cascade" }),
  toItemId: int("toItemId").notNull().references(() => knowledgeItems.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("knowledge_links_unique").on(table.ownerId, table.fromItemId, table.toItemId),
  index("knowledge_links_to_item_idx").on(table.toItemId),
]);

export const presentations = mysqlTable("presentations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  status: mysqlEnum("status", ["draft", "generating", "ready", "failed"]).default("draft").notNull(),
  presentonJobId: varchar("presentonJobId", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("presentations_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

export const presentationSlides = mysqlTable("presentationSlides", {
  id: int("id").autoincrement().primaryKey(),
  presentationId: int("presentationId").notNull().references(() => presentations.id, { onDelete: "cascade" }),
  position: int("position").notNull(),
  title: varchar("title", { length: 240 }),
  content: mediumtext("content"),
  speakerNotes: mediumtext("speakerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("presentation_slides_position_unique").on(table.presentationId, table.position)]);

export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("activity_log_owner_created_idx").on(table.ownerId, table.createdAt)]);
