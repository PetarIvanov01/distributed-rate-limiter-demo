import "dotenv/config";
import { db } from "../db-init.js";
import { rateLimitRulesTable, usersTable } from "./schema.js";

const users = ["user-1", "user-2"];
const rules = [
  {
    userId: "user-1",
    action: "create_post",
    maxRequests: 5,
    windowMs: 60_000
  },
  {
    userId: "user-1",
    action: "update_post",
    maxRequests: 10,
    windowMs: 60_000
  },
  {
    userId: "user-1",
    action: "delete_post",
    maxRequests: 3,
    windowMs: 60_000
  },
  {
    userId: "user-2",
    action: "create_post",
    maxRequests: 20,
    windowMs: 60_000
  },
  {
    userId: "user-2",
    action: "update_post",
    maxRequests: 15,
    windowMs: 60_000
  },
  {
    userId: "user-2",
    action: "delete_post",
    maxRequests: 5,
    windowMs: 60_000
  }
];

for (const userId of users) {
  await db
    .insert(usersTable)
    .values({
      externalUserId: userId
    })
    .onConflictDoNothing({
      target: usersTable.externalUserId
    });

  console.log("[seed] ensured user", { userId });
}

for (const rule of rules) {
  await db
    .insert(rateLimitRulesTable)
    .values(rule)
    .onConflictDoUpdate({
      target: [rateLimitRulesTable.userId, rateLimitRulesTable.action],
      set: {
        maxRequests: rule.maxRequests,
        windowMs: rule.windowMs
      }
    });

  console.log("[seed] upserted rate limit rule", rule);
}

console.log("[seed] done");
