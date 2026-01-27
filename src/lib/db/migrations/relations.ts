import { relations } from "drizzle-orm/relations";
import { workspaces, tasks, projects, users, taskStages, tags, taskSteps, notifications, taskTags, attachments, activityLogs, taskAssignees, taskComments, templates, workspaceMembers } from "./schema";

export const tasksRelations = relations(tasks, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [tasks.workspaceId],
		references: [workspaces.id]
	}),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user_createdBy: one(users, {
		fields: [tasks.createdBy],
		references: [users.id],
		relationName: "tasks_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [tasks.updatedBy],
		references: [users.id],
		relationName: "tasks_updatedBy_users_id"
	}),
	taskStages: many(taskStages),
	taskSteps: many(taskSteps),
	notifications: many(notifications),
	taskTags: many(taskTags),
	attachments: many(attachments),
	activityLogs: many(activityLogs),
	taskAssignees: many(taskAssignees),
	taskComments: many(taskComments),
}));

export const workspacesRelations = relations(workspaces, ({one, many}) => ({
	tasks: many(tasks),
	projects: many(projects),
	tags: many(tags),
	notifications: many(notifications),
	activityLogs: many(activityLogs),
	templates: many(templates),
	workspaceMembers: many(workspaceMembers),
	user: one(users, {
		fields: [workspaces.ownerId],
		references: [users.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	tasks: many(tasks),
	workspace: one(workspaces, {
		fields: [projects.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [projects.createdBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	tasks_createdBy: many(tasks, {
		relationName: "tasks_createdBy_users_id"
	}),
	tasks_updatedBy: many(tasks, {
		relationName: "tasks_updatedBy_users_id"
	}),
	projects: many(projects),
	taskSteps: many(taskSteps),
	notifications: many(notifications),
	attachments: many(attachments),
	activityLogs: many(activityLogs),
	taskAssignees_userId: many(taskAssignees, {
		relationName: "taskAssignees_userId_users_id"
	}),
	taskAssignees_assignedBy: many(taskAssignees, {
		relationName: "taskAssignees_assignedBy_users_id"
	}),
	taskComments: many(taskComments),
	templates: many(templates),
	workspaceMembers: many(workspaceMembers),
	workspaces: many(workspaces),
}));

export const taskStagesRelations = relations(taskStages, ({one, many}) => ({
	task: one(tasks, {
		fields: [taskStages.taskId],
		references: [tasks.id]
	}),
	taskSteps: many(taskSteps),
	attachments: many(attachments),
}));

export const tagsRelations = relations(tags, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [tags.workspaceId],
		references: [workspaces.id]
	}),
	taskTags: many(taskTags),
}));

export const taskStepsRelations = relations(taskSteps, ({one}) => ({
	task: one(tasks, {
		fields: [taskSteps.taskId],
		references: [tasks.id]
	}),
	taskStage: one(taskStages, {
		fields: [taskSteps.stageId],
		references: [taskStages.id]
	}),
	user: one(users, {
		fields: [taskSteps.completedBy],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [notifications.workspaceId],
		references: [workspaces.id]
	}),
	task: one(tasks, {
		fields: [notifications.taskId],
		references: [tasks.id]
	}),
}));

export const taskTagsRelations = relations(taskTags, ({one}) => ({
	task: one(tasks, {
		fields: [taskTags.taskId],
		references: [tasks.id]
	}),
	tag: one(tags, {
		fields: [taskTags.tagId],
		references: [tags.id]
	}),
}));

export const attachmentsRelations = relations(attachments, ({one}) => ({
	task: one(tasks, {
		fields: [attachments.taskId],
		references: [tasks.id]
	}),
	taskStage: one(taskStages, {
		fields: [attachments.stageId],
		references: [taskStages.id]
	}),
	user: one(users, {
		fields: [attachments.uploadedBy],
		references: [users.id]
	}),
}));

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	workspace: one(workspaces, {
		fields: [activityLogs.workspaceId],
		references: [workspaces.id]
	}),
	task: one(tasks, {
		fields: [activityLogs.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({one}) => ({
	task: one(tasks, {
		fields: [taskAssignees.taskId],
		references: [tasks.id]
	}),
	user_userId: one(users, {
		fields: [taskAssignees.userId],
		references: [users.id],
		relationName: "taskAssignees_userId_users_id"
	}),
	user_assignedBy: one(users, {
		fields: [taskAssignees.assignedBy],
		references: [users.id],
		relationName: "taskAssignees_assignedBy_users_id"
	}),
}));

export const taskCommentsRelations = relations(taskComments, ({one}) => ({
	task: one(tasks, {
		fields: [taskComments.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskComments.userId],
		references: [users.id]
	}),
}));

export const templatesRelations = relations(templates, ({one}) => ({
	workspace: one(workspaces, {
		fields: [templates.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [templates.createdBy],
		references: [users.id]
	}),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({one}) => ({
	workspace: one(workspaces, {
		fields: [workspaceMembers.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [workspaceMembers.userId],
		references: [users.id]
	}),
}));
