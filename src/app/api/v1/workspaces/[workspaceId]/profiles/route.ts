import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { agentProfiles, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const codeReviewRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  severity: z.enum(["info", "warn", "blocker"]),
  applies_to: z.enum(["frontend", "backend", "all"]).default("all"),
  examples: z.array(z.string()).optional(),
});

const codeReviewConfigSchema = z.object({
  strictness: z.enum(["low", "medium", "high"]),
  focus_areas: z.array(
    z.enum([
      "security",
      "performance",
      "readability",
      "testing",
      "edge-cases",
      "api-contracts",
      "error-handling",
      "logging",
      "types",
      "architecture",
    ])
  ),
  rules: z.array(codeReviewRuleSchema).default([]),
  required_checks: z.array(z.string()).default([]),
  feedback_format: z.enum(["inline", "bullets", "summary+inline"]).default("summary+inline"),
  tone: z.enum(["neutral", "direct", "strict"]).default("neutral"),
});

const testingPolicySchema = z.object({
  test_required_when: z.object({
    business_logic_changed: z.boolean().default(true),
    api_changed: z.boolean().default(true),
    db_query_changed: z.boolean().default(true),
    bugfix: z.boolean().default(true),
  }),
  test_types_required: z.array(z.enum(["unit", "integration", "e2e"])).default(["unit"]),
  minimum_expectations: z.array(z.string()).default([]),
  allow_skip_with_reason: z.boolean().default(false),
  test_commands: z
    .object({
      unit: z.string().optional(),
      integration: z.string().optional(),
      e2e: z.string().optional(),
    })
    .optional(),
});

const codeStyleConfigSchema = z.object({
  language_stack: z.array(z.string()).default([]),
  patterns_preferred: z.array(z.string()).default([]),
  patterns_avoid: z.array(z.string()).default([]),
  architecture_constraints: z.array(z.string()).default([]),
  naming_conventions: z.array(z.string()).default([]),
  error_handling_policy: z.string().default(""),
  linting_formatting_policy: z.string().default("align with repo config"),
  testing_policy: testingPolicySchema,
});

const createProfileSchema = z.object({
  type: z.enum(["code_review", "code_style"]),
  name: z.string().min(1).max(255),
  config: z.union([codeReviewConfigSchema, codeStyleConfigSchema]),
  isDefault: z.boolean().optional().default(false),
});

// GET /api/v1/workspaces/[workspaceId]/profiles
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

    // Verify user is member of this workspace
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "code_review" | "code_style" | null;

    const conditions = [eq(agentProfiles.workspaceId, workspaceId)];
    if (type) {
      conditions.push(eq(agentProfiles.type, type));
    }

    const profiles = await db.query.agentProfiles.findMany({
      where: and(...conditions),
      with: {
        creator: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
    });

    const formatted = profiles.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      type: p.type,
      name: p.name,
      config: JSON.parse(p.config),
      isDefault: p.isDefault,
      createdBy: p.creator,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json(
      { success: true, profiles: formatted },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

// POST /api/v1/workspaces/[workspaceId]/profiles
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

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createProfileSchema.parse(body);

    // If setting as default, unset existing defaults of same type
    if (data.isDefault) {
      const existing = await db.query.agentProfiles.findMany({
        where: and(
          eq(agentProfiles.workspaceId, workspaceId),
          eq(agentProfiles.type, data.type),
          eq(agentProfiles.isDefault, true)
        ),
      });
      for (const profile of existing) {
        await db
          .update(agentProfiles)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(agentProfiles.id, profile.id));
      }
    }

    const [profile] = await db
      .insert(agentProfiles)
      .values({
        workspaceId,
        type: data.type,
        name: data.name,
        config: JSON.stringify(data.config),
        isDefault: data.isDefault,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        profile: {
          ...profile,
          config: JSON.parse(profile.config),
        },
      },
      { status: 201, headers: rateLimit.headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}
