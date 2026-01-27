"use server";

import { db } from "@/lib/db";
import { 
  tasks, 
  taskAssignees, 
  taskComments, 
  activityLogs, 
  users, 
  workspaces,
  workspaceMembers 
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte, or, inArray, sql, lt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/permissions";

export interface PersonalDashboardData {
  // My task stats
  myTasks: {
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    inProgress: number;
    completed: number;
  };
  // Upcoming deadlines
  upcomingDeadlines: {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    priority: string;
    workspaceId: string;
    workspaceName: string;
    isOverdue: boolean;
    daysUntilDue: number;
  }[];
  // Recent comments on my tasks
  recentComments: {
    id: string;
    content: string;
    createdAt: Date;
    taskId: string;
    taskTitle: string;
    workspaceId: string;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
  // Activity on my tasks
  myTaskActivity: {
    id: string;
    action: string;
    createdAt: Date;
    taskId: string | null;
    taskTitle: string | null;
    workspaceId: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
  // Tasks by status for chart
  tasksByStatus: {
    status: string;
    count: number;
  }[];
  // Tasks by priority
  tasksByPriority: {
    priority: string;
    count: number;
  }[];
}

/**
 * Get personalized dashboard data for the current user
 */
export async function getPersonalDashboardData(workspaceId: string): Promise<PersonalDashboardData> {
  const user = await getCurrentUser();
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get all tasks assigned to the user in this workspace
  const myAssignedTasks = await db
    .select({
      task: tasks,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
      },
    })
    .from(tasks)
    .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
    .innerJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
    .where(
      and(
        eq(taskAssignees.userId, user.id),
        eq(tasks.workspaceId, workspaceId)
      )
    );

  // Calculate stats
  const overdueTasks = myAssignedTasks.filter(
    (t) => t.task.dueDate && t.task.dueDate < today && t.task.status !== "done"
  );
  const dueTodayTasks = myAssignedTasks.filter(
    (t) => t.task.dueDate === today && t.task.status !== "done"
  );
  const dueThisWeekTasks = myAssignedTasks.filter(
    (t) => t.task.dueDate && t.task.dueDate > today && t.task.dueDate <= weekEnd && t.task.status !== "done"
  );
  const inProgressTasks = myAssignedTasks.filter((t) => t.task.status === "in_progress");
  const completedTasks = myAssignedTasks.filter((t) => t.task.status === "done");

  // Upcoming deadlines (sorted by due date)
  const tasksWithDeadlines = myAssignedTasks
    .filter((t) => t.task.dueDate && t.task.status !== "done")
    .map((t) => {
      const dueDate = new Date(t.task.dueDate!);
      const todayDate = new Date(today);
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: t.task.id,
        title: t.task.title,
        dueDate: t.task.dueDate!,
        status: t.task.status,
        priority: t.task.priority,
        workspaceId: t.workspace.id,
        workspaceName: t.workspace.name,
        isOverdue: daysUntilDue < 0,
        daysUntilDue,
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  // Get task IDs for fetching comments and activity
  const myTaskIds = myAssignedTasks.map((t) => t.task.id);

  // Recent comments on my tasks (excluding my own comments)
  let recentComments: PersonalDashboardData["recentComments"] = [];
  if (myTaskIds.length > 0) {
    const comments = await db
      .select({
        id: taskComments.id,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        taskId: taskComments.taskId,
        taskTitle: tasks.title,
        workspaceId: tasks.workspaceId,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(taskComments)
      .innerJoin(tasks, eq(taskComments.taskId, tasks.id))
      .innerJoin(users, eq(taskComments.userId, users.id))
      .where(
        and(
          inArray(taskComments.taskId, myTaskIds),
          sql`${taskComments.userId} != ${user.id}` // Exclude own comments
        )
      )
      .orderBy(desc(taskComments.createdAt))
      .limit(10);

    recentComments = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      taskId: c.taskId,
      taskTitle: c.taskTitle,
      workspaceId: c.workspaceId,
      author: {
        id: c.authorId,
        name: c.authorName,
        image: c.authorImage,
      },
    }));
  }

  // Activity on my tasks (excluding my own activity)
  let myTaskActivity: PersonalDashboardData["myTaskActivity"] = [];
  if (myTaskIds.length > 0) {
    const activity = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        createdAt: activityLogs.createdAt,
        taskId: activityLogs.taskId,
        taskTitle: tasks.title,
        workspaceId: activityLogs.workspaceId,
        userId: users.id,
        userName: users.name,
        userImage: users.image,
      })
      .from(activityLogs)
      .leftJoin(tasks, eq(activityLogs.taskId, tasks.id))
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(
        and(
          eq(activityLogs.workspaceId, workspaceId),
          or(
            inArray(activityLogs.taskId, myTaskIds),
            sql`${activityLogs.taskId} IS NULL`
          ),
          sql`${activityLogs.userId} != ${user.id}` // Exclude own activity
        )
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(15);

    myTaskActivity = activity.map((a) => ({
      id: a.id,
      action: a.action,
      createdAt: a.createdAt,
      taskId: a.taskId,
      taskTitle: a.taskTitle,
      workspaceId: a.workspaceId,
      user: {
        id: a.userId,
        name: a.userName,
        image: a.userImage,
      },
    }));
  }

  // Tasks by status
  const statusCounts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };
  myAssignedTasks.forEach((t) => {
    if (statusCounts[t.task.status] !== undefined) {
      statusCounts[t.task.status]++;
    }
  });
  const tasksByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Tasks by priority
  const priorityCounts: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  myAssignedTasks.forEach((t) => {
    if (priorityCounts[t.task.priority] !== undefined) {
      priorityCounts[t.task.priority]++;
    }
  });
  const tasksByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
    priority,
    count,
  }));

  return {
    myTasks: {
      total: myAssignedTasks.length,
      overdue: overdueTasks.length,
      dueToday: dueTodayTasks.length,
      dueThisWeek: dueThisWeekTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
    },
    upcomingDeadlines: tasksWithDeadlines,
    recentComments,
    myTaskActivity,
    tasksByStatus,
    tasksByPriority,
  };
}
