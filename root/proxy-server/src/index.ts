import express from "express";
import { RateLimiter } from "./rate-limiter/rate-limiter.js";
import { extractBearerUserId } from "./auth.js";
import { forwardRequest } from "./proxy.js";
import { getActionForRoute } from "./route-actions.js";
import { RateLimitRepository } from "./rate-limiter/rate-limit-repository.js";

const port = Number(process.env.PORT ?? 3000);
const upstreamApiUrl = process.env.UPSTREAM_API_URL ?? "http://localhost:4000";
const app = express();
const rateLimiter = new RateLimiter(new RateLimitRepository());

app.use(express.json());

app.use(async (request, response, next) => {
  const action = getActionForRoute(request.method, request.path);

  if (!action) {
    next();
    return;
  }

  const userId = extractBearerUserId(request.headers.authorization);

  if (!userId) {
    response.status(401).json({
      error: "Authorization header must be in the format: Bearer <userId>"
    });
    return;
  }

  try {
    const allowed = await rateLimiter.isAllowed(userId, action);

    if (!allowed) {
      response.status(429).json({
        error: "Too many requests",
        userId,
        action
      });
      return;
    }

    await forwardRequest({
      request,
      response,
      upstreamApiUrl,
      userId,
      action
    });
  } catch (error) {
    response.status(501).json({
      error:
        error instanceof Error
          ? error.message
          : "Rate limiter is not implemented"
    });
  }
});

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Rate limiter server listening on port ${port}`);
  console.log("[proxy] upstream API URL", { upstreamApiUrl });
});
