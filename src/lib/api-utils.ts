import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { createRequestLogger } from "@/lib/logger";
import { generateRequestId } from "@/lib/utils";

export interface ApiHandlerOptions {
  /** Reject anonymous callers with 401 before the handler runs. */
  requireAuth?: boolean;
  /** Reject callers whose role lacks this permission with 403. Implies requireAuth. */
  requirePermission?: Permission;
  /** Reject bodies larger than this many bytes with 413. Defaults to 10 MB. */
  maxBodySize?: number;
}

export interface ApiContext {
  requestId: string;
  userId?: string;
  role?: string;
  studentProfileId?: string;
}

export type ApiHandler = (req: NextRequest, context: ApiContext) => Promise<NextResponse>;

/**
 * Wraps a route with request-id tracing, structured logging, body-size limits,
 * and — when asked — authentication and permission checks.
 *
 * The options above are enforced. An earlier version of this file declared
 * `requireAuth` and `requirePermission` and then never read them, and passed a
 * context containing only `requestId` despite its type promising a user. Any
 * route that had trusted it would have shipped wide open while reading as
 * protected. If you add an option here, enforce it in the same commit.
 */
export function createApiHandler(handler: ApiHandler, options: ApiHandlerOptions = {}) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const requestLogger = createRequestLogger(requestId);

    requestLogger.info(
      { method: req.method, path: req.nextUrl.pathname, query: req.nextUrl.search, ip, userAgent },
      "API request started"
    );

    try {
      const maxBodySize = options.maxBodySize ?? 10 * 1024 * 1024;
      const contentLength = Number.parseInt(req.headers.get("content-length") || "0", 10);
      if (contentLength > maxBodySize) {
        requestLogger.warn({ contentLength, maxBodySize }, "Request body too large");
        return NextResponse.json(
          { success: false, requestId, error: "That upload is too large." },
          { status: 413 }
        );
      }

      const context: ApiContext = { requestId };

      // A permission requirement is meaningless without a session, so asking
      // for one implies authentication.
      if (options.requireAuth || options.requirePermission) {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
          requestLogger.warn({ path: req.nextUrl.pathname }, "Unauthenticated request rejected");
          return NextResponse.json(
            { success: false, requestId, error: "Unauthorized" },
            { status: 401 }
          );
        }

        context.userId = session.user.id;
        context.role = session.user.role ?? undefined;
        context.studentProfileId = session.user.studentProfileId ?? undefined;

        if (options.requirePermission) {
          if (!context.role || !hasPermission(context.role as never, options.requirePermission)) {
            requestLogger.warn(
              { path: req.nextUrl.pathname, role: context.role, need: options.requirePermission },
              "Request rejected for missing permission"
            );
            return NextResponse.json(
              { success: false, requestId, error: "Forbidden" },
              { status: 403 }
            );
          }
        }
      }

      const response = await handler(req, context);

      requestLogger.info(
        { status: response.status, duration: Date.now() - startTime },
        "API request completed"
      );
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      requestLogger.error({ error, duration: Date.now() - startTime }, "API request failed");

      return NextResponse.json(
        {
          success: false,
          requestId,
          error: "Something went wrong on our end. Try again.",
          ...(process.env.NODE_ENV === "development" && {
            detail: error instanceof Error ? error.message : "Unknown error",
          }),
        },
        { status: 500 }
      );
    }
  };
}

export function createCorsResponse(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-request-id",
    "Access-Control-Max-Age": "86400",
  };
}
