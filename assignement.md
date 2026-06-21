You are building a backend API used by many users.
To protect the system from abuse, you need to implement a rate limiter.
The rate limiter should decide whether a user is allowed to perform an action at the current moment.

Unlike a simple in-memory rate limiter, this implementation must store its data in a database,
because the application runs on multiple server instances.

# Task

Implement a class:

# Requirements

Each user can perform a specific action at most `maxRequests` times within a `windowMs` time window.

Example rule:

```json
{
  "action": "create_order",
  "maxRequests": 5,
  "windowMs": 60_000
}
```

# Database

Design the necessary table or tables to support the rate limiter.

The database should store the rate limit rules and the usage recorded for each active fixed window.
The application must be able to determine which window a request belongs to and update the stored usage for that window.

For a rule with a 60 second window, requests between `17:00:00` and `17:00:59` belong to the same window.
A request at `17:01:00` starts the next window.

User `user-1` can call `create_order` at most 5 times per 60 seconds.
Different users/actions should have independent limits.

For example:

```text
user-1 + create_order
user-1 + login
user-2 + create_order
```

These should be counted separately.

# Important Requirements

The implementation should be safe when multiple requests happen at the same time.
Think about this case:

```js
let maxRequests = 5;

// At the same moment, 10 requests arrive for:
let userId = "user-1";
let action = "create_order";
```

The system should allow only 5, not all 10.

# Repository Interface

You can use this repository interface or design your own:

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

# Expected Behavior

```js
// If the user has not exceeded the limit:
await limiter.isAllowed("user-1", "create_order"); // true

// If the user has exceeded the limit:
await limiter.isAllowed("user-1", "create_order"); // false
```

```js
class RateLimiter {
  constructor(rateLimitRepository) {
    this.rateLimitRepository = rateLimitRepository;
  }

  async isAllowed(userId, action) {
    // Todo
  }
}
```
