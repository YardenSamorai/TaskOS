import { pgTable, index, foreignKey, uuid, varchar, text, date, integer, timestamp, boolean, unique, pgEnum } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const stageStatus = pgEnum("stage_status", ['pending', 'active', 'completed'])
export const taskPriority = pgEnum("task_priority", ['low', 'medium', 'high', 'urgent'])
export const taskStatus = pgEnum("task_status", ['backlog', 'todo', 'in_progress', 'review', 'done'])
export const workspaceRole = pgEnum("workspace_role", ['owner', 'admin', 'member', 'viewer'])



export const tasks = pgTable("tasks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull(),
	projectId: uuid("project_id"),
	title: varchar("title", { length: 500 }).notNull(),
	description: text("description"),
	status: taskStatus("status").default('todo').notNull(),
	priority: taskPriority("priority").default('medium').notNull(),
	dueDate: date("due_date"),
	startDate: date("start_date"),
	orderIndex: integer("order_index").default(0).notNull(),
	createdBy: uuid("created_by").notNull(),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		taskDueDateIdx: index("task_due_date_idx").using("btree", table.dueDate.asc().nullsLast()),
		taskOrderIdx: index("task_order_idx").using("btree", table.workspaceId.asc().nullsLast(), table.orderIndex.asc().nullsLast()),
		taskWorkspaceStatusIdx: index("task_workspace_status_idx").using("btree", table.workspaceId.asc().nullsLast(), table.status.asc().nullsLast()),
		tasksWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "tasks_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
		tasksProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_projects_id_fk"
		}).onDelete("set null"),
		tasksCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "tasks_created_by_users_id_fk"
		}),
		tasksUpdatedByUsersIdFk: foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "tasks_updated_by_users_id_fk"
		}),
	}
});

export const taskStages = pgTable("task_stages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	status: stageStatus("status").default('pending').notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
},
(table) => {
	return {
		stageTaskOrderIdx: index("stage_task_order_idx").using("btree", table.taskId.asc().nullsLast(), table.orderIndex.asc().nullsLast()),
		taskStagesTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_stages_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	}
});

export const projects = pgTable("projects", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	color: varchar("color", { length: 7 }).default('#6366f1'),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		projectsWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "projects_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
		projectsCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "projects_created_by_users_id_fk"
		}),
	}
});

export const tags = pgTable("tags", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull(),
	name: varchar("name", { length: 50 }).notNull(),
	color: varchar("color", { length: 7 }).default('#6366f1').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		tagWorkspaceNameIdx: index("tag_workspace_name_idx").using("btree", table.workspaceId.asc().nullsLast(), table.name.asc().nullsLast()),
		tagsWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "tags_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
	}
});

export const taskSteps = pgTable("task_steps", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	stageId: uuid("stage_id"),
	content: text("content").notNull(),
	completed: boolean("completed").default(false).notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	completedBy: uuid("completed_by"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stepTaskStageOrderIdx: index("step_task_stage_order_idx").using("btree", table.taskId.asc().nullsLast(), table.stageId.asc().nullsLast(), table.orderIndex.asc().nullsLast()),
		taskStepsTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_steps_task_id_tasks_id_fk"
		}).onDelete("cascade"),
		taskStepsStageIdTaskStagesIdFk: foreignKey({
			columns: [table.stageId],
			foreignColumns: [taskStages.id],
			name: "task_steps_stage_id_task_stages_id_fk"
		}).onDelete("cascade"),
		taskStepsCompletedByUsersIdFk: foreignKey({
			columns: [table.completedBy],
			foreignColumns: [users.id],
			name: "task_steps_completed_by_users_id_fk"
		}),
	}
});

export const notifications = pgTable("notifications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	workspaceId: uuid("workspace_id"),
	taskId: uuid("task_id"),
	type: varchar("type", { length: 50 }).notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	message: text("message"),
	read: boolean("read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		notificationUserReadIdx: index("notification_user_read_idx").using("btree", table.userId.asc().nullsLast(), table.read.asc().nullsLast()),
		notificationsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
		notificationsWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "notifications_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
		notificationsTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "notifications_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	}
});

export const taskTags = pgTable("task_tags", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	tagId: uuid("tag_id").notNull(),
},
(table) => {
	return {
		taskTagIdx: index("task_tag_idx").using("btree", table.taskId.asc().nullsLast(), table.tagId.asc().nullsLast()),
		taskTagsTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_tags_task_id_tasks_id_fk"
		}).onDelete("cascade"),
		taskTagsTagIdTagsIdFk: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "task_tags_tag_id_tags_id_fk"
		}).onDelete("cascade"),
	}
});

export const attachments = pgTable("attachments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	stageId: uuid("stage_id"),
	name: varchar("name", { length: 255 }).notNull(),
	url: text("url").notNull(),
	type: varchar("type", { length: 100 }),
	size: integer("size"),
	uploadedBy: uuid("uploaded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		attachmentsTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "attachments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
		attachmentsStageIdTaskStagesIdFk: foreignKey({
			columns: [table.stageId],
			foreignColumns: [taskStages.id],
			name: "attachments_stage_id_task_stages_id_fk"
		}).onDelete("cascade"),
		attachmentsUploadedByUsersIdFk: foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "attachments_uploaded_by_users_id_fk"
		}),
	}
});

export const activityLogs = pgTable("activity_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull(),
	taskId: uuid("task_id"),
	userId: uuid("user_id").notNull(),
	action: varchar("action", { length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: uuid("entity_id"),
	metadata: text("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		activityTaskCreatedIdx: index("activity_task_created_idx").using("btree", table.taskId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		activityWorkspaceCreatedIdx: index("activity_workspace_created_idx").using("btree", table.workspaceId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		activityLogsWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "activity_logs_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
		activityLogsTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "activity_logs_task_id_tasks_id_fk"
		}).onDelete("cascade"),
		activityLogsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_logs_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const taskAssignees = pgTable("task_assignees", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	userId: uuid("user_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
	assignedBy: uuid("assigned_by"),
},
(table) => {
	return {
		taskAssigneeIdx: index("task_assignee_idx").using("btree", table.taskId.asc().nullsLast(), table.userId.asc().nullsLast()),
		taskAssigneesTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_assignees_task_id_tasks_id_fk"
		}).onDelete("cascade"),
		taskAssigneesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_assignees_user_id_users_id_fk"
		}).onDelete("cascade"),
		taskAssigneesAssignedByUsersIdFk: foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "task_assignees_assigned_by_users_id_fk"
		}),
	}
});

export const taskComments = pgTable("task_comments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	userId: uuid("user_id").notNull(),
	content: text("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		commentTaskCreatedIdx: index("comment_task_created_idx").using("btree", table.taskId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		taskCommentsTaskIdTasksIdFk: foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_comments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
		taskCommentsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_comments_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const templates = pgTable("templates", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	templateData: text("template_data").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		templatesWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "templates_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
		templatesCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "templates_created_by_users_id_fk"
		}),
	}
});

export const workspaceMembers = pgTable("workspace_members", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: workspaceRole("role").default('member').notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		workspaceUserIdx: index("workspace_user_idx").using("btree", table.workspaceId.asc().nullsLast(), table.userId.asc().nullsLast()),
		workspaceMembersWorkspaceIdWorkspacesIdFk: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "workspace_members_workspace_id_workspaces_id_fk"
		}).onDelete("cascade"),
		workspaceMembersUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workspace_members_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	clerkId: varchar("clerk_id", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		usersClerkIdUnique: unique("users_clerk_id_unique").on(table.clerkId),
	}
});

export const workspaces = pgTable("workspaces", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 255 }).notNull(),
	description: text("description"),
	imageUrl: text("image_url"),
	ownerId: uuid("owner_id").notNull(),
	inviteCode: varchar("invite_code", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		workspacesOwnerIdUsersIdFk: foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "workspaces_owner_id_users_id_fk"
		}).onDelete("cascade"),
		workspacesSlugUnique: unique("workspaces_slug_unique").on(table.slug),
		workspacesInviteCodeUnique: unique("workspaces_invite_code_unique").on(table.inviteCode),
	}
});