const postByIdPattern = /^\/posts\/[^/]+$/;

export function getActionForRoute(method: string, path: string): string | null {
  if (method === "POST" && path === "/posts") {
    return "create_post";
  }

  if (method === "PUT" && postByIdPattern.test(path)) {
    return "update_post";
  }

  if (method === "DELETE" && postByIdPattern.test(path)) {
    return "delete_post";
  }

  return null;
}
