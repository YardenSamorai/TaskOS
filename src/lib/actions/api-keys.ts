"use server";

import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/permissions";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";

// Generate a secure API key
function generateApiKey(): string {
  // Generate 32 random bytes and encode as base64url
  const bytes = randomBytes(32);
  const key = bytes.toString("base64url");
  // Prefix with taskos_ for identification
  return `taskos_${key}`;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// Verify API key
export async function verifyApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  apiKeyId?: string;
}> {
  try {
    const keyHash = hashApiKey(key);

    const apiKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, keyHash),
      with: {
        user: true,
      },
    });

    if (!apiKey) {
      return { valid: false };
    }

    // Check if expired
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false };
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    return {
      valid: true,
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
    };
  } catch (error) {
    console.error("Error verifying API key:", error);
    return { valid: false };
  }
}

// Create new API key
export async function createApiKey(data: {
  name: string;
  expiresInDays?: number; // null = never expires
}) {
  try {
    const { user } = await getCurrentUser();

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
        expiresAt,
      })
      .returning();

    // Return the plain key only once (user must save it)
    revalidatePath("/app/account");
    return {
      success: true,
      apiKey: key, // Return plain key only on creation
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

// Get user's API keys (without hashes)
export async function getUserApiKeys() {
  try {
    const { user } = await getCurrentUser();

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, user.id),
      orderBy: [desc(apiKeys.createdAt)],
    });

    // Remove sensitive data and convert Dates to strings
    return {
      success: true,
      keys: keys.map((key) => ({
        id: key.id,
        name: key.name,
        lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
        expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
        createdAt: key.createdAt.toISOString(),
        isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
      })),
    };
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return {
      success: false,
      keys: [],
    };
  }
}

// Delete API key
export async function deleteApiKey(keyId: string) {
  try {
    const { user } = await getCurrentUser();

    // Verify ownership
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
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return {
      success: false,
      error: "Failed to delete API key",
    };
  }
}

// Revoke API key (same as delete, but with different semantics)
export async function revokeApiKey(keyId: string) {
  return deleteApiKey(keyId);
}
