import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { tasks, activityLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

// POST /api/v1/tasks/:taskId/activity - Log activity for a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Authenticate request
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { apiKeyId, userPlan, userId } = auth.request;

    // Check rate limit
    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: rateLimit.status || 429,
          headers: rateLimit.headers,
        }
      );
    }

    const responseHeaders = rateLimit.headers || {};
    const { taskId } = await params;
    const body = await request.json();

    // Validate input
    const schema = z.object({
      action: z.string().min(1).max(100),
      entityType: z.string().min(1).max(50).default("task"),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const data = schema.parse(body);

    // Check if task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create activity log
    const [activity] = await db
      .insert(activityLogs)
      .values({
        workspaceId: task.workspaceId,
        taskId,
        userId,
        action: data.action,
        entityType: data.entityType,
        entityId: taskId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        activity: {
          id: activity.id,
          action: activity.action,
          entityType: activity.entityType,
          metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
          createdAt: activity.createdAt,
        },
      },
      { status: 201, headers: responseHeaders }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error logging activity:", error);
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    );
  }
}

// GET /api/v1/tasks/:taskId/activity - Get activity logs for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Authenticate request
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { apiKeyId, userPlan } = auth.request;

    // Check rate limit
    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: rateLimit.status || 429,
          headers: rateLimit.headers,
        }
      );
    }

    const responseHeaders = rateLimit.headers || {};
    const { taskId } = await params;

    // Check if task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch activity logs
    const activities = await db.query.activityLogs.findMany({
      where: eq(activityLogs.taskId, taskId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [desc(activityLogs.createdAt)],
    });

    return NextResponse.json(
      {
        success: true,
        activities: activities.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          metadata: a.metadata ? JSON.parse(a.metadata) : null,
          createdAt: a.createdAt,
          user: a.user
            ? {
                id: a.user.id,
                name: a.user.name,
                email: a.user.email,
                image: a.user.image,
              }
            : null,
        })),
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
