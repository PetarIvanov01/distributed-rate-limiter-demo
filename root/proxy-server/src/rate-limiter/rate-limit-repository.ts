import { sql, and, eq } from "drizzle-orm";
import { db } from "../db-init.js";
import { rateLimitRulesTable, rateLimitWindowsTable } from "../db/schema.js";

export interface UserAction {
  userId: string;
  action: string;
  windowStart: Date;
}

export class RateLimitRepository {
  async incrementCounter({
    action,
    userId,
    windowStart
  }: UserAction): Promise<number> {
    const windowKey = this.getWindowKey(userId, action, windowStart);
    const [updatedWindow] = await db
      .insert(rateLimitWindowsTable)
      .values({ action, userId, windowKey, windowStart, counter: 1 })
      .onConflictDoUpdate({
        target: rateLimitWindowsTable.windowKey,
        set: {
          counter: sql`${rateLimitWindowsTable.counter} + 1`,
          updatedAt: new Date()
        }
      })
      .returning({ counter: rateLimitWindowsTable.counter });

    if (!updatedWindow) {
      throw new Error("Counter failed to update");
    }
    return updatedWindow.counter;
  }

  async getRule(userId: string, action: string) {
    const [rule] = await db
      .select()
      .from(rateLimitRulesTable)
      .where(
        and(
          eq(rateLimitRulesTable.userId, userId),
          eq(rateLimitRulesTable.action, action)
        )
      )
      .limit(1);

    if (!rule) {
      throw new Error(`No rate limit rule configured for ${userId}:${action}`);
    }

    return rule;
  }

  private getWindowKey(userId: string, action: string, windowStart: Date) {
    return `${userId}:${action}:${windowStart.getTime()}`;
  }
}
