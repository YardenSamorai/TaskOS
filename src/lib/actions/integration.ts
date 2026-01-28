"use server";

import { db } from "@/lib/db";
import { integrations, linkedRepositories, Integration, LinkedRepository } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/permissions";

// ============== GET INTEGRATIONS ==============

export async function getUserIntegrations(workspaceId?: string) {
  try {
    const user = await getCurrentUser();

    // Always get all integrations for the user (both global and workspace-specific)
    // We don't filter by workspaceId because integrations can be used across workspaces
    const result = await db.query.integrations.findMany({
      where: eq(integrations.userId, user.id),
      orderBy: [desc(integrations.createdAt)],
    });

    console.log("[getUserIntegrations] Found integrations:", result.length, "for user:", user.id);

    return { success: true, integrations: result };
  } catch (error) {
    console.error("Error getting integrations:", error);
    return { success: false, integrations: [] };
  }
}

export async function getIntegration(integrationId: string) {
  try {
    const user = await getCurrentUser();

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, user.id)
      ),
    });

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    return { success: true, integration };
  } catch (error) {
    console.error("Error getting integration:", error);
    return { success: false, error: "Failed to get integration" };
  }
}

// ============== CREATE INTEGRATION ==============

export async function createIntegration(data: {
  provider: string;
  workspaceId?: string;
  providerAccountId?: string;
  providerUsername?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scope?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const user = await getCurrentUser();

    // Check if integration already exists for this provider
    const existing = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, user.id),
        eq(integrations.provider, data.provider),
        data.workspaceId 
          ? eq(integrations.workspaceId, data.workspaceId) 
          : undefined
      ),
    });

    if (existing) {
      // Update existing integration
      const [updated] = await db
        .update(integrations)
        .set({
          providerAccountId: data.providerAccountId,
          providerUsername: data.providerUsername,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scope: data.scope,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id))
        .returning();

      revalidatePath("/app");
      return { success: true, integration: updated };
    }

    // Create new integration
    const [integration] = await db
      .insert(integrations)
      .values({
        userId: user.id,
        workspaceId: data.workspaceId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        providerUsername: data.providerUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        scope: data.scope,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning();

    revalidatePath("/app");
    return { success: true, integration };
  } catch (error) {
    console.error("Error creating integration:", error);
    return { success: false, error: "Failed to create integration" };
  }
}

// ============== DELETE INTEGRATION ==============

export async function deleteIntegration(integrationId: string) {
  try {
    const user = await getCurrentUser();

    // Verify ownership
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, user.id)
      ),
    });

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    await db.delete(integrations).where(eq(integrations.id, integrationId));

    revalidatePath("/app");
    return { success: true };
  } catch (error) {
    console.error("Error deleting integration:", error);
    return { success: false, error: "Failed to delete integration" };
  }
}

// ============== TOGGLE INTEGRATION ==============

export async function toggleIntegration(integrationId: string) {
  try {
    const user = await getCurrentUser();

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, user.id)
      ),
    });

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    const [updated] = await db
      .update(integrations)
      .set({
        isActive: !integration.isActive,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId))
      .returning();

    revalidatePath("/app");
    return { success: true, integration: updated };
  } catch (error) {
    console.error("Error toggling integration:", error);
    return { success: false, error: "Failed to toggle integration" };
  }
}

// ============== LINKED REPOSITORIES ==============

export async function getLinkedRepositories(workspaceId: string) {
  try {
    const user = await getCurrentUser();

    const repos = await db.query.linkedRepositories.findMany({
      where: eq(linkedRepositories.workspaceId, workspaceId),
      with: {
        integration: true,
      },
    });

    return { success: true, repositories: repos };
  } catch (error) {
    console.error("Error getting linked repositories:", error);
    return { success: false, repositories: [] };
  }
}

export async function linkRepository(data: {
  integrationId: string;
  workspaceId: string;
  externalId: string;
  name: string;
  fullName?: string;
  url?: string;
  defaultBranch?: string;
  isPrivate?: boolean;
}) {
  try {
    const user = await getCurrentUser();

    // Verify integration ownership
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, data.integrationId),
        eq(integrations.userId, user.id)
      ),
    });

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    // Check if already linked
    const existing = await db.query.linkedRepositories.findFirst({
      where: and(
        eq(linkedRepositories.integrationId, data.integrationId),
        eq(linkedRepositories.externalId, data.externalId)
      ),
    });

    if (existing) {
      return { success: false, error: "Repository already linked" };
    }

    const [repo] = await db
      .insert(linkedRepositories)
      .values({
        integrationId: data.integrationId,
        workspaceId: data.workspaceId,
        externalId: data.externalId,
        name: data.name,
        fullName: data.fullName,
        url: data.url,
        defaultBranch: data.defaultBranch,
        isPrivate: data.isPrivate,
      })
      .returning();

    revalidatePath("/app");
    return { success: true, repository: repo };
  } catch (error) {
    console.error("Error linking repository:", error);
    return { success: false, error: "Failed to link repository" };
  }
}

export async function unlinkRepository(repositoryId: string) {
  try {
    const user = await getCurrentUser();

    await db.delete(linkedRepositories).where(eq(linkedRepositories.id, repositoryId));

    revalidatePath("/app");
    return { success: true };
  } catch (error) {
    console.error("Error unlinking repository:", error);
    return { success: false, error: "Failed to unlink repository" };
  }
}
