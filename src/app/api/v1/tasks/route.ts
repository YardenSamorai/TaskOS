import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { db } from "@/lib/db";
import { tasks, taskAssignees, taskTags, taskComments } from "@/lib/db/schema";
import { eq, and, desc, asc, or } from "drizzle-orm";
import { z } from "zod";

// GET /api/v1/tasks - List tasks
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { userId } = auth.request;
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const workspaceId = searchParams.get("workspaceId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions
    const conditions = [];

    // Must be in a workspace the user has access to
    if (workspaceId) {
      conditions.push(eq(tasks.workspaceId, workspaceId));
    } else {
      // If no workspace specified, get all workspaces user is member of
      // For now, we'll require workspaceId
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    if (status) {
      conditions.push(eq(tasks.status, status as any));
    }

    if (priority) {
      conditions.push(eq(tasks.priority, priority as any));
    }

    // Get tasks
    const tasksList = await db.query.tasks.findMany({
      where: and(...conditions),
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
      orderBy: [desc(tasks.createdAt)],
      limit,
      offset,
    });

    // Filter by assignee if specified
    let filteredTasks = tasksList;
    if (assigneeId) {
      filteredTasks = tasksList.filter((task) =>
        task.assignees.some((a) => a.userId === assigneeId)
      );
    }

    // Format response
    const formattedTasks = filteredTasks.map((task) => ({
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
    }));

    return NextResponse.json({
      success: true,
      tasks: formattedTasks,
      total: formattedTasks.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/v1/tasks - Create task
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { userId } = auth.request;
    const body = await request.json();

    // Validate input
    const schema = z.object({
      workspaceId: z.string().uuid(),
      projectId: z.string().uuid().optional(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().optional(),
      startDate: z.string().optional(),
      assigneeIds: z.array(z.string().uuid()).optional(),
      tagIds: z.array(z.string().uuid()).optional(),
    });

    const data = schema.parse(body);

    // Create task
    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        status: data.status || "todo",
        priority: data.priority || "low",
        dueDate: data.dueDate || null,
        startDate: data.startDate || null,
        createdBy: userId,
      })
      .returning();

    // Add assignees if provided
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(
        data.assigneeIds.map((assigneeId) => ({
          taskId: task.id,
          userId: assigneeId,
        }))
      );
    }

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await db.insert(taskTags).values(
        data.tagIds.map((tagId) => ({
          taskId: task.id,
          tagId: tagId,
        }))
      );
    }

    // Fetch full task with relations
    const fullTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, task.id),
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

    return NextResponse.json(
      {
        success: true,
        task: {
          id: fullTask!.id,
          title: fullTask!.title,
          description: fullTask!.description,
          status: fullTask!.status,
          priority: fullTask!.priority,
          dueDate: fullTask!.dueDate,
          startDate: fullTask!.startDate,
          workspaceId: fullTask!.workspaceId,
          projectId: fullTask!.projectId,
          createdAt: fullTask!.createdAt,
          updatedAt: fullTask!.updatedAt,
          assignees: fullTask!.assignees.map((a) => ({
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            image: a.user.image,
          })),
          tags: fullTask!.tags.map((tt) => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })),
          createdBy: {
            id: fullTask!.createdByUser?.id,
            name: fullTask!.createdByUser?.name,
            email: fullTask!.createdByUser?.email,
            image: fullTask!.createdByUser?.image,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
