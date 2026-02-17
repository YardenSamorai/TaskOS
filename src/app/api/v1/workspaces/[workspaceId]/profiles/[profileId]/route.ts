import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { agentProfiles, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ workspaceId: string; profileId: string }> };

// GET /api/v1/workspaces/[workspaceId]/profiles/[profileId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { userId, apiKeyId, userPlan } = auth.request;
    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const { workspaceId, profileId } = await params;

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    const profile = await db.query.agentProfiles.findFirst({
      where: and(
        eq(agentProfiles.id, profileId),
        eq(agentProfiles.workspaceId, workspaceId)
      ),
      with: {
        creator: { columns: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        profile: { ...profile, config: JSON.parse(profile.config) },
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PUT /api/v1/workspaces/[workspaceId]/profiles/[profileId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { userId, apiKeyId, userPlan } = auth.request;
    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const { workspaceId, profileId } = await params;

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    const existing = await db.query.agentProfiles.findFirst({
      where: and(
        eq(agentProfiles.id, profileId),
        eq(agentProfiles.workspaceId, workspaceId)
      ),
    });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.config !== undefined) updates.config = JSON.stringify(data.config);

    // If setting as default, unset existing defaults of same type
    if (data.isDefault === true) {
      const existingDefaults = await db.query.agentProfiles.findMany({
        where: and(
          eq(agentProfiles.workspaceId, workspaceId),
          eq(agentProfiles.type, existing.type),
          eq(agentProfiles.isDefault, true)
        ),
      });
      for (const p of existingDefaults) {
        if (p.id !== profileId) {
          await db
            .update(agentProfiles)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(agentProfiles.id, p.id));
        }
      }
      updates.isDefault = true;
    } else if (data.isDefault === false) {
      updates.isDefault = false;
    }

    const [updated] = await db
      .update(agentProfiles)
      .set(updates)
      .where(eq(agentProfiles.id, profileId))
      .returning();

    return NextResponse.json(
      {
        success: true,
        profile: { ...updated, config: JSON.parse(updated.config) },
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

// DELETE /api/v1/workspaces/[workspaceId]/profiles/[profileId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { userId, apiKeyId, userPlan } = auth.request;
    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const { workspaceId, profileId } = await params;

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    const existing = await db.query.agentProfiles.findFirst({
      where: and(
        eq(agentProfiles.id, profileId),
        eq(agentProfiles.workspaceId, workspaceId)
      ),
    });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await db.delete(agentProfiles).where(eq(agentProfiles.id, profileId));

    return NextResponse.json(
      { success: true, message: "Profile deleted" },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("Error deleting profile:", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
