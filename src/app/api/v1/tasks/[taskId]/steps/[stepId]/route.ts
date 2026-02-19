import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, requireScope, requireApiTaskAccess } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { taskSteps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// PATCH /api/v1/tasks/:taskId/steps/:stepId
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; stepId: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { apiKeyId, userPlan, userId } = auth.request;

    const scopeCheck = requireScope(auth.request, "write:tasks");
    if (!scopeCheck.allowed) {
      return NextResponse.json({ error: scopeCheck.error }, { status: 403 });
    }

    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const responseHeaders = rateLimit.headers || {};
    const { taskId, stepId } = await params;

    const taskAccess = await requireApiTaskAccess(auth.request, taskId, "update");
    if (!taskAccess.allowed) {
      return NextResponse.json({ error: taskAccess.error }, { status: taskAccess.status || 403 });
    }

    const body = await request.json();
    const schema = z.object({
      completed: z.boolean().optional(),
      content: z.string().min(1).max(1000).optional(),
    });
    const data = schema.parse(body);

    const step = await db.query.taskSteps.findFirst({
      where: and(
        eq(taskSteps.id, stepId),
        eq(taskSteps.taskId, taskId),
      ),
    });

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
      updateData.completedBy = data.completed ? userId : null;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    const [updated] = await db
      .update(taskSteps)
      .set(updateData)
      .where(eq(taskSteps.id, stepId))
      .returning();

    return NextResponse.json(
      {
        success: true,
        step: {
          id: updated.id,
          content: updated.content,
          completed: updated.completed,
          orderIndex: updated.orderIndex,
          completedAt: updated.completedAt,
        },
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating step:", error);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}
