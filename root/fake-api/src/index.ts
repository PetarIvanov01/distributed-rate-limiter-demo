import express from "express";

const port = Number(process.env.FAKE_API_PORT ?? 4000);
const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok", service: "fake-api" });
});

app.post("/posts", (request, response) => {
  response.status(201).json({
    id: "post-1",
    operation: "created",
    receivedBy: "fake-api",
    createdBy: request.headers["x-user-id"],
    rateLimitAction: request.headers["x-rate-limit-action"],
    body: request.body
  });
});

app.put("/posts/:id", (request, response) => {
  response.status(200).json({
    id: request.params.id,
    operation: "updated",
    receivedBy: "fake-api",
    updatedBy: request.headers["x-user-id"],
    rateLimitAction: request.headers["x-rate-limit-action"],
    body: request.body
  });
});

app.delete("/posts/:id", (request, response) => {
  console.log("[fake-api] delete post", {
    postId: request.params.id,
    userId: request.headers["x-user-id"],
    action: request.headers["x-rate-limit-action"]
  });

  response.status(200).json({
    id: request.params.id,
    operation: "deleted",
    receivedBy: "fake-api",
    deletedBy: request.headers["x-user-id"],
    rateLimitAction: request.headers["x-rate-limit-action"]
  });
});

app.listen(port, () => {
  console.log(`Fake API listening on port ${port}`);
});
