import type { Request, Response } from "express";

interface ForwardRequestInput {
  request: Request;
  response: Response;
  upstreamApiUrl: string;
  userId: string;
  action: string;
}

export async function forwardRequest({
  request,
  response,
  upstreamApiUrl,
  userId,
  action
}: ForwardRequestInput): Promise<void> {
  const upstreamUrl = `${upstreamApiUrl}${request.originalUrl}`;
  const requestBody = getRequestBody(request);
  const requestInit: RequestInit = {
    method: request.method,
    headers: {
      "content-type": "application/json",
      "x-user-id": userId,
      "x-rate-limit-action": action
    }
  };

  if (requestBody) {
    requestInit.body = requestBody;
  }

  const upstreamResponse = await fetch(upstreamUrl, requestInit);

  const contentType = upstreamResponse.headers.get("content-type");
  const responseBody = await upstreamResponse.text();

  if (contentType) {
    response.setHeader("content-type", contentType);
  }

  response.status(upstreamResponse.status).send(responseBody);
}

function getRequestBody(request: Request): string | undefined {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  if (!request.body || Object.keys(request.body as object).length === 0) {
    return undefined;
  }

  return JSON.stringify(request.body);
}
