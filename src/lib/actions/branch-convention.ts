"use server";

import { db } from "@/lib/db";
import { branchConventions, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
} from "@/lib/auth/permissions";
import {
  type BranchConventionConfig,
  type RenderContext,
  type RenderedConvention,
  DEFAULT_BRANCH_CONVENTION,
  validateConfig,
  renderConvention,
} from "@/lib/branch-convention";

// ─── GET ─────────────────────────────────────────────────────────────────────

/**
 * Get the branch convention config for a workspace.
 * Returns the saved config or the default if none is saved.
 * Any workspace member can read this.
 */
export async function getBranchConvention(workspaceId: string): Promise<{
  success: boolean;
  config: BranchConventionConfig;
  isCustom: boolean;
  error?: string;
}> {
  try {
    await requireWorkspaceMember(workspaceId);

    const row = await db.query.branchConventions.findFirst({
      where: eq(branchConventions.workspaceId, workspaceId),
    });

    if (!row) {
      return {
        success: true,
        config: DEFAULT_BRANCH_CONVENTION,
        isCustom: false,
      };
    }

    const config: BranchConventionConfig = JSON.parse(row.config);
    return { success: true, config, isCustom: true };
  } catch (error: any) {
    console.error("[BranchConvention] Error getting config:", error);
    return {
      success: false,
      config: DEFAULT_BRANCH_CONVENTION,
      isCustom: false,
      error: error.message || "Failed to get branch convention",
    };
  }
}

// ─── UPSERT ──────────────────────────────────────────────────────────────────

/**
 * Create or update the branch convention for a workspace.
 * Only workspace admins and owners can modify this.
 */
export async function upsertBranchConvention(
  workspaceId: string,
  config: BranchConventionConfig
): Promise<{
  success: boolean;
  error?: string;
  validationErrors?: { field: string; message: string }[];
}> {
  try {
    const { user } = await requireWorkspaceAdmin(workspaceId);

    // Validate
    const errors = validateConfig(config);
    if (errors.length > 0) {
      return { success: false, validationErrors: errors };
    }

    const configJson = JSON.stringify(config);

    const existing = await db.query.branchConventions.findFirst({
      where: eq(branchConventions.workspaceId, workspaceId),
    });

    if (existing) {
      await db
        .update(branchConventions)
        .set({
          config: configJson,
          updatedAt: new Date(),
        })
        .where(eq(branchConventions.id, existing.id));
    } else {
      await db.insert(branchConventions).values({
        workspaceId,
        config: configJson,
        createdBy: user.id,
      });
    }

    revalidatePath(`/app/${workspaceId}/settings`);
    return { success: true };
  } catch (error: any) {
    console.error("[BranchConvention] Error upserting config:", error);
    return {
      success: false,
      error: error.message || "Failed to save branch convention",
    };
  }
}

// ─── RESET ───────────────────────────────────────────────────────────────────

/**
 * Delete the custom convention and revert to defaults.
 */
export async function resetBranchConvention(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireWorkspaceAdmin(workspaceId);

    await db
      .delete(branchConventions)
      .where(eq(branchConventions.workspaceId, workspaceId));

    revalidatePath(`/app/${workspaceId}/settings`);
    return { success: true };
  } catch (error: any) {
    console.error("[BranchConvention] Error resetting config:", error);
    return {
      success: false,
      error: error.message || "Failed to reset branch convention",
    };
  }
}

// ─── PREVIEW ─────────────────────────────────────────────────────────────────

/**
 * Server-side preview: renders a convention with sample data.
 * Uses the exact same renderConvention logic as runtime.
 * This can be called from the UI for live preview AND from the API.
 */
export async function previewBranchConvention(
  config: BranchConventionConfig,
  context?: Partial<RenderContext>
): Promise<{
  success: boolean;
  previews: Record<string, RenderedConvention>;
  error?: string;
}> {
  try {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      return {
        success: false,
        previews: {},
        error: errors.map((e) => e.message).join("; "),
      };
    }

    const baseCtx: RenderContext = {
      taskTitle: context?.taskTitle || "Add user authentication",
      taskId: context?.taskId || "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      username: context?.username || "john.doe",
    };

    // Render one preview per task type mapping
    const previews: Record<string, RenderedConvention> = {};
    for (const mapping of config.taskTypeMappings) {
      previews[mapping.taskType] = renderConvention(config, {
        ...baseCtx,
        taskType: mapping.taskType,
      });
    }

    return { success: true, previews };
  } catch (error: any) {
    console.error("[BranchConvention] Error previewing:", error);
    return {
      success: false,
      previews: {},
      error: error.message || "Failed to preview",
    };
  }
}
