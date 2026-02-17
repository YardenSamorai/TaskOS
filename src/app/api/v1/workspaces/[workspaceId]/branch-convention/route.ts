import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { branchConventions, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  type BranchConventionConfig,
  DEFAULT_BRANCH_CONVENTION,
  validateConfig,
  renderConvention,
} from "@/lib/branch-convention";

// GET /api/v1/workspaces/[workspaceId]/branch-convention
// Returns the convention config for a workspace (used by VS Code extension)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
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

    const { workspaceId } = await params;

    // Verify membership
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!member) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403, headers: rateLimit.headers }
      );
    }

    const row = await db.query.branchConventions.findFirst({
      where: eq(branchConventions.workspaceId, workspaceId),
    });

    const config: BranchConventionConfig = row
      ? JSON.parse(row.config)
      : DEFAULT_BRANCH_CONVENTION;

    return NextResponse.json(
      { config, isCustom: !!row },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("[API] branch-convention GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/v1/workspaces/[workspaceId]/branch-convention
// Preview: renders the convention with provided context.
// Body: { config: BranchConventionConfig, context: RenderContext }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
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

    const { workspaceId } = await params;

    // Verify membership
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!member) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403, headers: rateLimit.headers }
      );
    }

    const body = await request.json();
    const { config, context } = body;

    if (!config) {
      return NextResponse.json(
        { error: "config is required in request body" },
        { status: 400, headers: rateLimit.headers }
      );
    }

    // Validate config
    const errors = validateConfig(config);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid config", validationErrors: errors },
        { status: 400, headers: rateLimit.headers }
      );
    }

    // Render previews for all task types
    const sampleCtx = {
      taskTitle: context?.taskTitle || "Add user authentication",
      taskId: context?.taskId || "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      username: context?.username || "john.doe",
    };

    const previews: Record<string, ReturnType<typeof renderConvention>> = {};
    for (const mapping of config.taskTypeMappings) {
      previews[mapping.taskType] = renderConvention(config, {
        ...sampleCtx,
        taskType: mapping.taskType,
      });
    }

    return NextResponse.json(
      { previews },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("[API] branch-convention POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
