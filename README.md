# Fixed Window Rate Limiter Test Harness

This folder contains a local test harness for one database-backed fixed window rate limiter implementation.

The implementation under test lives in `proxy-server/src/rate-limiter`. Everything else exists to exercise that implementation in a realistic local setup.

The setup is intentionally small, but it models the important production concern: multiple proxy instances share one Postgres database, so request counters are not kept in memory.

## Implementation Under Test

The actual rate limiter task implementation is here:

```text
root/proxy-server/src/rate-limiter/rate-limiter.ts
root/proxy-server/src/rate-limiter/rate-limit-repository.ts
```

Supporting database schema and seed data live here:

```text
root/proxy-server/src/db/schema.ts
root/proxy-server/src/db/seed.ts
```

```text
client
  -> proxy-service / proxy-service-2 / proxy-service-3
  -> fake-api

proxy instances -> Postgres
```

## Project Structure

```text
docker-compose.yml      -> local multi-service environment
scripts/                -> Bash helpers for setup and testing
proxy-server/           -> Express proxy and rate limiter implementation under test
fake-api/               -> mock downstream API used to prove forwarding behavior
```

Each Node service is its own TypeScript project with its own `package.json`, `tsconfig.json`, `Dockerfile`, and `node_modules`.

## Services

### Proxy Server

The proxy is the public entrypoint. It derives the user and action, checks the rate limiter, and either forwards the request or blocks it.

```text
allowed request -> forwarded to fake-api
blocked request -> 429 Too Many Requests
```

The proxy derives identity from a fake local auth header:

```http
Authorization: Bearer user-1
```

The client does not send the rate limit action directly. The proxy maps method and path to an internal action.

```text
POST /posts -> create_post
PUT /posts/:id -> update_post
DELETE /posts/:id -> delete_post
```

Compose starts three proxy instances:

```text
proxy-service   -> http://localhost:3000
proxy-service-2 -> http://localhost:3001
proxy-service-3 -> http://localhost:3002
```

### Fake API

The fake API represents the downstream application.

```text
GET /health
POST /posts
PUT /posts/:id
DELETE /posts/:id
```

It does not persist data. It only proves that an allowed request was forwarded.

### Postgres

Postgres is the shared source of truth for:

```text
users
rate_limit_rules
rate_limit_windows
```

Rules are configured per user and action.

Example seeded rules:

```text
user-1 create_post -> 5 requests / 60s
user-1 update_post -> 10 requests / 60s
user-1 delete_post -> 3 requests / 60s

user-2 create_post -> 20 requests / 60s
user-2 update_post -> 15 requests / 60s
user-2 delete_post -> 5 requests / 60s
```

Window counters are stored per:

```text
user_id + action + window_start
```

This lets multiple proxy instances enforce the same limit safely.

## Local Development

Start the environment:

```bash
bash root/scripts/start-dev.sh
```

The Node services run with `tsx watch`, so source changes restart the relevant service.

Reset the local DB, push the schema, and seed rules:

```bash
bash root/scripts/reset-db.sh
```

Run a basic smoke test:

```bash
bash root/scripts/smoke.sh
```

Run a concurrency test across all proxy instances:

```bash
bash root/scripts/test-concurrency.sh
```

The concurrency script defaults to:

```text
20 requests
user-1
POST /posts
http://localhost:3000 http://localhost:3001 http://localhost:3002
```

Override values when needed:

```bash
REQUESTS=60 USER_ID=user-2 METHOD=DELETE PATHNAME=/posts/123 bash root/scripts/test-concurrency.sh
```

## Drizzle

Drizzle config lives in:

```text
proxy-server/drizzle.config.ts
```

Useful commands:

```bash
cd root/proxy-server
npm run db:push
npm run db:seed
npm run db:studio
```

The local `.env` should point to Postgres through the host port:

```text
DATABASE_URL=postgres://rate_limiter:rate_limiter@localhost:5432/rate_limiter
```

Inside Docker Compose, the proxy uses:

```text
postgres://rate_limiter:rate_limiter@postgres:5432/rate_limiter
```

## Test Expectations

For the seeded `user-1 create_post` rule, 20 concurrent `POST /posts` requests should produce approximately:

```text
5 x 201
15 x 429
```

If the same test is run again inside the same 60-second window, all requests may return `429` because the counter has already exceeded the limit.

The key behavior to verify is that the total number of allowed requests across all proxy instances does not exceed the configured rule.
