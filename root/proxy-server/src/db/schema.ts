import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  externalUserId: varchar("external_user_id", { length: 255 }).notNull().unique()
});

export const rateLimitRulesTable = pgTable("rate_limit_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => usersTable.externalUserId),
  action: varchar("action", { length: 255 }).notNull(),
  maxRequests: integer("max_requests").notNull(),
  windowMs: integer("window_ms").notNull()
}, (table) => [
  uniqueIndex("rate_limit_rules_user_action_idx").on(table.userId, table.action)
]);

export const rateLimitWindowsTable = pgTable(
  "rate_limit_windows",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => usersTable.externalUserId),
    action: varchar("action", { length: 255 }).notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowKey: varchar("window_key", { length: 512 }).notNull(),
    counter: integer("counter").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("rate_limit_windows_window_key_idx").on(table.windowKey),
    uniqueIndex("rate_limit_windows_user_action_window_idx").on(
      table.userId,
      table.action,
      table.windowStart
    ),
    index("rate_limit_windows_lookup_idx").on(
      table.userId,
      table.action,
      table.windowStart
    )
  ]
);

export const usersRelations = relations(usersTable, ({ many }) => ({
  rules: many(rateLimitRulesTable),
  windows: many(rateLimitWindowsTable)
}));

export const rateLimitRulesRelations = relations(rateLimitRulesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [rateLimitRulesTable.userId],
    references: [usersTable.externalUserId]
  })
}));

export const rateLimitWindowsRelations = relations(rateLimitWindowsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [rateLimitWindowsTable.userId],
    references: [usersTable.externalUserId]
  })
}));
