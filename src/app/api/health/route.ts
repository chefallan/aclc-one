import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAiClient, resolveAiConfig } from "@/lib/ai-client";

export async function GET(req: NextRequest) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const checks: Record<string, { status: string; responseTimeMs: number; details?: string }> = {};
  const deep = req.nextUrl.searchParams.get("deep") === "1";

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy", responseTimeMs: Date.now() - dbStart };
  } catch (error) {
    logger.error({ error, requestId }, "Health check: database unhealthy");
    checks.database = {
      status: "unhealthy",
      responseTimeMs: Date.now() - dbStart,
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Memory check
  const memStart = Date.now();
  const memUsage = process.memoryUsage();
  const memUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.memory = {
    status: memUsedPercent > 90 ? "degraded" : "healthy",
    responseTimeMs: Date.now() - memStart,
    details: `Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  // AI provider check. Opt-in via ?deep=1 because it makes a network call to
  // the provider, and a liveness probe should not depend on a third party.
  //
  // Worth running after any config change: a model name the account cannot
  // reach fails here with a readable message instead of surfacing as a broken
  // Study Buddy for a student mid-question.
  if (deep) {
    const aiStart = Date.now();
    try {
      const { model, provider } = resolveAiConfig();
      const { client } = await getAiClient();
      const available = await client.models.list();
      const ids = available.data.map((m) => m.id);

      checks.ai = ids.includes(model)
        ? {
            status: "healthy",
            responseTimeMs: Date.now() - aiStart,
            details: `${provider} · ${model}`,
          }
        : {
            status: "unhealthy",
            responseTimeMs: Date.now() - aiStart,
            details: `${provider} cannot reach model "${model}". Available: ${ids.slice(0, 8).join(", ")}${ids.length > 8 ? "…" : ""}`,
          };
    } catch (error) {
      checks.ai = {
        status: "unhealthy",
        responseTimeMs: Date.now() - aiStart,
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const overallStatus = Object.values(checks).every((c) => c.status === "healthy")
    ? "healthy"
    : "degraded";

  return NextResponse.json(
    {
      status: overallStatus,
      requestId,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV || "development",
      checks,
      uptime: process.uptime(),
    },
    {
      status: overallStatus === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
