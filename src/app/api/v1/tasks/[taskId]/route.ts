import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, requireScope, requireApiTaskAccess } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { db } from "@/lib/db";
import { tasks, taskAssignees, taskTags, taskSteps } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { errorResponse } from "@/lib/api-error";

// Maximum request body size (1MB)
const MAX_BODY_SIZE = 1024 * 1024;

// GET /api/v1/tasks/:id - Get task details
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

    const scopeCheck = requireScope(auth.request, "read:tasks");
    if (!scopeCheck.allowed) {
      return NextResponse.json({ error: scopeCheck.error }, { status: 403 });
    }

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

    const taskAccess = await requireApiTaskAccess(auth.request, taskId, "read");
    if (!taskAccess.allowed) {
      return NextResponse.json({ error: taskAccess.error }, { status: taskAccess.status || 403 });
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        assignees: {
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
        },
        tags: {
          with: {
            tag: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        comments: {
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
          orderBy: (comments, { asc }) => [asc(comments.createdAt)],
        },
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.orderIndex)],
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          startDate: task.startDate,
          workspaceId: task.workspaceId,
          projectId: task.projectId,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          assignees: task.assignees.map((a) => ({
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            image: a.user.image,
          })),
          tags: task.tags.map((tt) => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })),
          createdBy: {
            id: task.creator?.id,
            name: task.creator?.name,
            email: task.creator?.email,
            image: task.creator?.image,
          },
          comments: task.comments.map((c) => ({
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
          steps: task.steps.map((step) => ({
            id: step.id,
            content: step.content,
            completed: step.completed,
            orderIndex: step.orderIndex,
            completedAt: step.completedAt,
          })),
        },
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PUT /api/v1/tasks/:id - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Check request body size
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large. Maximum size is 1MB." },
        { status: 413 }
      );
    }

    // Authenticate request
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { apiKeyId, userPlan } = auth.request;

    const scopeCheck = requireScope(auth.request, "write:tasks");
    if (!scopeCheck.allowed) {
      return NextResponse.json({ error: scopeCheck.error }, { status: 403 });
    }

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

    const taskAccess = await requireApiTaskAccess(auth.request, taskId, "update");
    if (!taskAccess.allowed) {
      return NextResponse.json({ error: taskAccess.error }, { status: taskAccess.status || 403 });
    }

    const body = await request.json();

    const schema = z.object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional().nullable(),
      status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      assigneeIds: z.array(z.string().uuid()).optional(),
      tagIds: z.array(z.string().uuid()).optional(),
    });

    const data = schema.parse(body);

    // Check if task exists
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update task
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;

    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));

    // Update assignees if provided
    if (data.assigneeIds !== undefined) {
      // Delete existing assignees
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));

      // Add new assignees
      if (data.assigneeIds.length > 0) {
        await db.insert(taskAssignees).values(
          data.assigneeIds.map((assigneeId) => ({
            taskId: taskId,
            userId: assigneeId,
          }))
        );
      }
    }

    // Update tags if provided
    if (data.tagIds !== undefined) {
      // Delete existing tags
      await db.delete(taskTags).where(eq(taskTags.taskId, taskId));

      // Add new tags
      if (data.tagIds.length > 0) {
        await db.insert(taskTags).values(
          data.tagIds.map((tagId) => ({
            taskId: taskId,
            tagId: tagId,
          }))
        );
      }
    }

    // Fetch updated task
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        assignees: {
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
        },
        tags: {
          with: {
            tag: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.orderIndex)],
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        task: {
          id: updatedTask!.id,
          title: updatedTask!.title,
          description: updatedTask!.description,
          status: updatedTask!.status,
          priority: updatedTask!.priority,
          dueDate: updatedTask!.dueDate,
          startDate: updatedTask!.startDate,
          workspaceId: updatedTask!.workspaceId,
          projectId: updatedTask!.projectId,
          createdAt: updatedTask!.createdAt,
          updatedAt: updatedTask!.updatedAt,
          assignees: updatedTask!.assignees.map((a) => ({
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            image: a.user.image,
          })),
          tags: updatedTask!.tags.map((tt) => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })),
          steps: updatedTask!.steps.map((step) => ({
            id: step.id,
            content: step.content,
            completed: step.completed,
            orderIndex: step.orderIndex,
            completedAt: step.completedAt,
          })),
          createdBy: {
            id: updatedTask!.creator?.id,
            name: updatedTask!.creator?.name,
            email: updatedTask!.creator?.email,
            image: updatedTask!.creator?.image,
          },
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
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/tasks/:id - Delete task
export async function DELETE(
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

    const scopeCheck = requireScope(auth.request, "write:tasks");
    if (!scopeCheck.allowed) {
      return NextResponse.json({ error: scopeCheck.error }, { status: 403 });
    }

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

    const taskAccess = await requireApiTaskAccess(auth.request, taskId, "delete");
    if (!taskAccess.allowed) {
      return NextResponse.json({ error: taskAccess.error }, { status: taskAccess.status || 403 });
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    return NextResponse.json(
      {
        success: true,
        message: "Task deleted successfully",
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
