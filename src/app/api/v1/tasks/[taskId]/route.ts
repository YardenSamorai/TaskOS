import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { db } from "@/lib/db";
import { tasks, taskAssignees, taskTags } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// GET /api/v1/tasks/:id - Get task details
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
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

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, params.taskId),
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
        createdByUser: {
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
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
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
          id: task.createdByUser?.id,
          name: task.createdByUser?.name,
          email: task.createdByUser?.email,
          image: task.createdByUser?.image,
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
      },
    });
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
  { params }: { params: { taskId: string } }
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

    const body = await request.json();

    // Validate input
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
      where: eq(tasks.id, params.taskId),
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

    await db.update(tasks).set(updateData).where(eq(tasks.id, params.taskId));

    // Update assignees if provided
    if (data.assigneeIds !== undefined) {
      // Delete existing assignees
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, params.taskId));

      // Add new assignees
      if (data.assigneeIds.length > 0) {
        await db.insert(taskAssignees).values(
          data.assigneeIds.map((assigneeId) => ({
            taskId: params.taskId,
            userId: assigneeId,
          }))
        );
      }
    }

    // Update tags if provided
    if (data.tagIds !== undefined) {
      // Delete existing tags
      await db.delete(taskTags).where(eq(taskTags.taskId, params.taskId));

      // Add new tags
      if (data.tagIds.length > 0) {
        await db.insert(taskTags).values(
          data.tagIds.map((tagId) => ({
            taskId: params.taskId,
            tagId: tagId,
          }))
        );
      }
    }

    // Fetch updated task
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, params.taskId),
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
        createdByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
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
        createdBy: {
          id: updatedTask!.createdByUser?.id,
          name: updatedTask!.createdByUser?.name,
          email: updatedTask!.createdByUser?.email,
          image: updatedTask!.createdByUser?.image,
        },
      },
    });
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
  { params }: { params: { taskId: string } }
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

    // Check if task exists
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, params.taskId),
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete task (cascade will handle related records)
    await db.delete(tasks).where(eq(tasks.id, params.taskId));

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
