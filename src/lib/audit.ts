import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

interface AuditParams {
  workspaceId?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log a security-critical action. Awaited to ensure persistence in serverless,
 * but never throws -- audit failure must not break the calling request.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      workspaceId: params.workspaceId ?? null,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (error) {
    console.error("[audit] Failed to log:", params.action, error);
  }
}
