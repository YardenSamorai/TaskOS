import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validatePat } from "@/lib/azure-devops";
import { encrypt } from "@/lib/encryption";

// POST: Save Azure DevOps PAT connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { pat, organization, workspaceId } = await request.json();

    if (!pat || !organization) {
      return NextResponse.json(
        { error: "PAT and organization are required" },
        { status: 400 }
      );
    }

    // Validate PAT
    const validation = await validatePat(pat, organization);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid PAT or organization. Please check your credentials." },
        { status: 400 }
      );
    }

    // Check if integration already exists
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "azure_devops")
      ),
    });

    const integrationData = {
      accessToken: encrypt(pat),
      refreshToken: null,
      tokenExpiresAt: null,
      scope: "pat",
      providerAccountId: organization,
      providerUsername: validation.displayName || validation.email || organization,
      isActive: true,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
      metadata: JSON.stringify({
        displayName: validation.displayName,
        email: validation.email,
        organization,
        authMethod: "pat",
      }),
    };

    if (existingIntegration) {
      await db
        .update(integrations)
        .set(integrationData)
        .where(eq(integrations.id, existingIntegration.id));
    } else {
      await db.insert(integrations).values({
        userId: session.user.id,
        workspaceId: workspaceId || null,
        provider: "azure_devops" as const,
        ...integrationData,
      });
    }

    return NextResponse.json({
      success: true,
      displayName: validation.displayName,
      organization,
      isNew: !existingIntegration,
    });
  } catch (error) {
    console.error("[Azure DevOps PAT] Error:", error);
    return NextResponse.json(
      { error: "Failed to save connection" },
      { status: 500 }
    );
  }
}
