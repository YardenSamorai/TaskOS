"use server";

import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/permissions";
import { eq, and, desc, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { hasFeature } from "@/lib/plans";
import { logAudit } from "@/lib/audit";
import type { UserPlan } from "@/lib/db/schema";

export type ApiKeyScope = "read:tasks" | "write:tasks" | "manage:workspace";

const VALID_SCOPES: ApiKeyScope[] = ["read:tasks", "write:tasks", "manage:workspace"];

function generateApiKey(): string {
  const bytes = randomBytes(32);
  const key = bytes.toString("base64url");
  return `taskos_${key}`;
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function verifyApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  apiKeyId?: string;
  scopes?: string[];
  workspaceId?: string;
}> {
  try {
    const keyHash = hashApiKey(key);

    const apiKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
      ),
      with: {
        user: true,
      },
    });

    if (!apiKey) {
      return { valid: false };
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false };
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    let scopes: string[];
    try {
      scopes = JSON.parse(apiKey.scopes);
    } catch {
      scopes = ["read:tasks"];
    }

    return {
      valid: true,
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      scopes,
      workspaceId: apiKey.workspaceId ?? undefined,
    };
  } catch (error) {
    console.error("Error verifying API key:", error);
    return { valid: false };
  }
}

export async function createApiKey(data: {
  name: string;
  expiresInDays?: number;
  scopes?: ApiKeyScope[];
  workspaceId?: string;
}) {
  try {
    const user = await getCurrentUser();

    const userPlan = (user.plan as UserPlan) || "free";
    if (!hasFeature(userPlan, "apiAccess")) {
      return {
        success: false,
        error: "API Access is a Pro feature. Please upgrade to Pro plan or higher.",
      };
    }

    const scopes = data.scopes?.filter((s) => VALID_SCOPES.includes(s)) || ["read:tasks"];
    if (scopes.length === 0) {
      scopes.push("read:tasks");
    }

    const key = generateApiKey();
    const keyHash = hashApiKey(key);

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        keyHash,
        name: data.name,
        scopes: JSON.stringify(scopes),
        expiresAt,
        workspaceId: data.workspaceId ?? null,
      })
      .returning();

    await logAudit({
      userId: user.id,
      workspaceId: data.workspaceId,
      action: "api_key.created",
      entityType: "api_key",
      entityId: apiKey.id,
      metadata: { name: data.name, scopes },
    });

    revalidatePath("/app/account");
    return {
      success: true,
      apiKey: key,
      keyId: apiKey.id,
    };
  } catch (error) {
    console.error("Error creating API key:", error);
    return {
      success: false,
      error: "Failed to create API key",
    };
  }
}

export async function getUserApiKeys() {
  try {
    const user = await getCurrentUser();

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, user.id),
      orderBy: [desc(apiKeys.createdAt)],
    });

    return {
      success: true,
      keys: keys.map((key) => {
        let scopes: string[];
        try {
          scopes = JSON.parse(key.scopes);
        } catch {
          scopes = ["read:tasks"];
        }
        return {
          id: key.id,
          name: key.name,
          scopes,
          workspaceId: key.workspaceId,
          lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
          expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
          revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
          createdAt: key.createdAt.toISOString(),
          isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
          isRevoked: !!key.revokedAt,
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return {
      success: false,
      keys: [],
    };
  }
}

export async function deleteApiKey(keyId: string) {
  try {
    const user = await getCurrentUser();

    const apiKey = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)),
    });

    if (!apiKey) {
      return {
        success: false,
        error: "API key not found",
      };
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

    revalidatePath("/app/account");
    return { success: true };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return {
      success: false,
      error: "Failed to delete API key",
    };
  }
}

export async function revokeApiKey(keyId: string) {
  try {
    const user = await getCurrentUser();

    const apiKey = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)),
    });

    if (!apiKey) {
      return {
        success: false,
        error: "API key not found",
      };
    }

    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, keyId));

    await logAudit({
      userId: user.id,
      action: "api_key.revoked",
      entityType: "api_key",
      entityId: keyId,
      metadata: { name: apiKey.name },
    });

    revalidatePath("/app/account");
    return { success: true };
  } catch (error) {
    console.error("Error revoking API key:", error);
    return {
      success: false,
      error: "Failed to revoke API key",
    };
  }
}
