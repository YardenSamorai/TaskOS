import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { tasks, activityLogs } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

// GET /api/v1/tasks/:taskId/activity/count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { apiKeyId, userPlan } = auth.request;

    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const responseHeaders = rateLimit.headers || {};
    const { taskId } = await params;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      columns: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [result] = await db
      .select({ value: count() })
      .from(activityLogs)
      .where(eq(activityLogs.taskId, taskId));

    return NextResponse.json(
      { success: true, count: Number(result?.value ?? 0) },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error fetching activity count:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity count" },
      { status: 500 }
    );
  }
}
