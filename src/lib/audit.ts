import { prisma } from "./prisma";
import { logger } from "./logger";
import { AuditAction } from "@prisma/client";

export interface AuditLogEntry {
  action: AuditAction;
  actorId: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        entity: entry.entity || "system",
        entityId: entry.entityId || "system",
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    logger.error({ error, entry }, "Failed to write audit log");
  }
}

// Convenience helpers for common audit actions
export async function logAuth(
  action: "LOGIN" | "LOGOUT" | "REGISTER" | "PASSWORD_RESET" | "PASSWORD_CHANGE",
  entry: Omit<AuditLogEntry, "action">
): Promise<void> {
  await logAudit({ ...entry, action: action as AuditAction });
}

export async function logDataChange(
  action: "CREATE" | "UPDATE" | "DELETE",
  entry: Omit<AuditLogEntry, "action"> & { entity: string; entityId: string }
): Promise<void> {
  await logAudit({ ...entry, action: action as AuditAction });
}

export async function logSecurity(
  action: "LOGIN_FAILED" | "ACCOUNT_LOCKED" | "SUSPICIOUS_ACTIVITY" | "PERMISSION_DENIED",
  entry: Omit<AuditLogEntry, "action">
): Promise<void> {
  await logAudit({ ...entry, action: action as AuditAction });
}
