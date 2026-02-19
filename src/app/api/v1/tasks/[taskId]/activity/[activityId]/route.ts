import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, requireScope, requireApiTaskAccess } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; activityId: string }> }
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

    const scopeCheck = requireScope(auth.request, "read:tasks");
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
    const { taskId, activityId } = await params;

    const taskAccess = await requireApiTaskAccess(auth.request, taskId, "read");
    if (!taskAccess.allowed) {
      return NextResponse.json({ error: taskAccess.error }, { status: taskAccess.status || 403 });
    }

    const activity = await db.query.activityLogs.findFirst({
      where: and(
        eq(activityLogs.id, activityId),
        eq(activityLogs.taskId, taskId),
      ),
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
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        activity: {
          id: activity.id,
          action: activity.action,
          entityType: activity.entityType,
          entityId: activity.entityId,
          metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
          createdAt: activity.createdAt,
          user: activity.user
            ? {
                id: activity.user.id,
                name: activity.user.name,
                email: activity.user.email,
                image: activity.user.image,
              }
            : null,
        },
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error fetching activity detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity detail" },
      { status: 500 }
    );
  }
}
