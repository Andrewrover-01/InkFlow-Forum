import { Session } from "next-auth";
import { UserRole } from "@prisma/client";

/**
 * Throws if the session doesn't have at least one of the required roles.
 * Returns the validated session so callers can use it directly.
 */
export function requireRole(
  session: Session | null,
  ...roles: UserRole[]
): Session {
  if (!session?.user?.id) {
    throw new UnauthorizedError("请先登录");
  }
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    throw new ForbiddenError("权限不足");
  }
  return session;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "请先登录") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "权限不足") {
    super(message);
    this.name = "ForbiddenError";
  }
}
