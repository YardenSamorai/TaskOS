import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { tasks, taskComments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

// POST /api/v1/tasks/:taskId/comments - Add a comment to a task
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
      content: z.string().min(1).max(50000),
    });

    const data = schema.parse(body);

    // Check if task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create comment
    const [comment] = await db
      .insert(taskComments)
      .values({
        taskId,
        userId,
        content: data.content,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        comment: {
          id: comment.id,
          taskId: comment.taskId,
          content: comment.content,
          createdAt: comment.createdAt,
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
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

// GET /api/v1/tasks/:taskId/comments - List comments for a task
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

    // Fetch comments
    const comments = await db.query.taskComments.findMany({
      where: eq(taskComments.taskId, taskId),
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
      orderBy: [desc(taskComments.createdAt)],
    });

    return NextResponse.json(
      {
        success: true,
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: {
            id: c.user.id,
            name: c.user.name,
            email: c.user.email,
            image: c.user.image,
          },
        })),
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
