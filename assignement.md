You are building a backend API used by many users.
To protect the system from abuse, you need to implement a rate limiter.
The rate limiter should decide whether a user is allowed to perform an action at the current moment.

Unlike a simple in-memory rate limiter, this implementation must store its data in a database,
because the application runs on multiple server instances.

Task
Implement a class:
Rate Limiter Algo - Fixed Window Size

Requirements
Each user can perform a specific action at most maxRequests times within a windowMs time window.
Example rule:

```json
{
  "action": "create_order",
  "maxRequests": 5,
  "windowMs": 60_000
}
```

User table: id
Rule table: id, action, max_requests, window_ms, user_id Reference to user.id
Window table: id - compose(action, max_requests, start_time), action Reference to rule.action, user_id Reference to user.id, counter, create_at

17:00:00 - 17:01:00
17:01:00 - 17:02:00
17:00:36 -> 17:00:00 user_id, action -> 5/10

This means:
User "user-1" can call "create_order" at most 5 times per 60 seconds.
Different users should have independent limits.
Different actions should have independent limits.

For example:
user-1 + create_order
user-1 + login
user-2 + create_order

These should be counted separately.

Database
Design the necessary table or tables.

## Expected Behavior

```js
// If the user has not exceeded the limit:
await limiter.isAllowed("user-1", "create_order"); // true

// If the user has exceeded the limit:
await limiter.isAllowed("user-1", "create_order"); // false
```

## Important Requirements

The implementation should be safe when multiple requests happen at the same time.

Think about this case:

```js
let maxRequests = 5;

// At the same moment, 10 requests arrive for:
let userId = "user-1";
let action = "create_order";
```

The system should allow only 5, not all 10.

## Repository Interface

You can use this repository interface or design your own:

```js
class RateLimiter {
  constructor(rateLimitRepository) {
    this.rateLimitRepository = rateLimitRepository;
  }

  async isAllowed(userId, action) {
    const windowStart = this.rateLimitRepository.getWindowStart(action);
    const { maxCapacity } = this.rateLimitRepository.getAction(action);
    const count = await this.rateLimitRepository.incrementCounter({
      userId,
      action,
      windowStart
    });
    return count >= maxCapacity;
  }
}
```

```js
class RateLimitRepository {
  async countEvents({ userId, action, fromDate }) {
    // returns number
  }

  async insertEvent({ userId, action, createdAt }) {
    // inserts one event
  }

  async incrementCounter({ userId, action, windowStart }) {
    // atomically increments counter
  }

  async deleteOldEvents({ olderThan }) {
    // optional cleanup
  }
}
```
