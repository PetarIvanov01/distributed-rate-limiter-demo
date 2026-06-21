import type { RateLimitRepository } from "./rate-limit-repository.js";

export class RateLimiter {
  constructor(private readonly rateLimitRepository: RateLimitRepository) {}

  async isAllowed(userId: string, action: string): Promise<boolean> {
    const rule = await this.rateLimitRepository.getRule(userId, action);

    const windowStart = getWindowStart(rule.windowMs);

    const counter = await this.rateLimitRepository.incrementCounter({
      userId,
      action,
      windowStart
    });

    return counter <= rule.maxRequests;
  }
}

function getWindowStart(windowMs: number): Date {
  const nowMs = new Date().getTime();
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;

  return new Date(windowStartMs);
}
