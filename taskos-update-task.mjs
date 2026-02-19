/**
 * TaskOS Agent Helper Script
 *
 * Used by the Cursor AI Agent to update task status and log activity.
 * Reads task context from .taskos-current-task.json written by the VS Code extension.
 *
 * Usage:
 *   node taskos-update-task.mjs <status> "<summary>"
 *
 * Status values:
 *   in_progress  - Agent has started working on the task
 *   done         - Agent has completed the task
 *   review       - Agent finished and wants a human review
 *
 * Examples:
 *   node taskos-update-task.mjs in_progress "Starting implementation of rate limiting"
 *   node taskos-update-task.mjs done "Implemented AES-256-GCM encryption with base64url encoding and key validation"
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONTEXT_FILE = ".taskos-current-task.json";
const VALID_STATUSES = ["backlog", "todo", "in_progress", "review", "done"];

function usage() {
  console.log(`
Usage: node taskos-update-task.mjs <status> "<summary>"

Status values: ${VALID_STATUSES.join(", ")}

Examples:
  node taskos-update-task.mjs in_progress "Starting implementation"
  node taskos-update-task.mjs done "Implemented X, Y, Z. Fixed bug in auth flow."
  `);
  process.exit(1);
}

async function main() {
  const [, , status, summary] = process.argv;

  if (!status || !VALID_STATUSES.includes(status)) {
    console.error(`Error: Invalid status "${status}"`);
    usage();
  }

  if (!summary || summary.trim().length === 0) {
    console.error("Error: Summary is required");
    usage();
  }

  // Read task context
  const contextPath = join(process.cwd(), CONTEXT_FILE);
  if (!existsSync(contextPath)) {
    console.error(`Error: ${CONTEXT_FILE} not found in current directory.`);
    console.error("Make sure you run this from the workspace root and a task was sent via the TaskOS extension.");
    process.exit(1);
  }

  let context;
  try {
    context = JSON.parse(readFileSync(contextPath, "utf8"));
  } catch (err) {
    console.error(`Error: Could not parse ${CONTEXT_FILE}:`, err.message);
    process.exit(1);
  }

  const { taskId, title, workspaceId, apiUrl, apiKey } = context;

  if (!taskId || !apiUrl || !apiKey) {
    console.error("Error: Incomplete task context in", CONTEXT_FILE);
    process.exit(1);
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  console.log(`\nTaskOS: Updating task "${title}"`);
  console.log(`  Status: ${status}`);
  console.log(`  Summary: ${summary}\n`);

  // 1. Update task status
  try {
    const statusRes = await fetch(`${apiUrl}/tasks/${taskId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status }),
    });

    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({}));
      console.error(`Error updating status (${statusRes.status}):`, err.error || statusRes.statusText);
      process.exit(1);
    }

    console.log(`✓ Status updated to "${status}"`);
  } catch (err) {
    console.error("Error calling TaskOS API:", err.message);
    process.exit(1);
  }

  // 2. Log activity
  try {
    const actionMap = {
      in_progress: "agent.started",
      done: "agent.completed",
      review: "agent.review_requested",
    };
    const action = actionMap[status] || `agent.status_changed_to_${status}`;

    const activityRes = await fetch(`${apiUrl}/tasks/${taskId}/activity`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        entityType: "task",
        metadata: {
          summary,
          status,
          agent: "cursor",
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    if (!activityRes.ok) {
      const err = await activityRes.json().catch(() => ({}));
      console.warn(`Warning: Could not log activity (${activityRes.status}):`, err.error || activityRes.statusText);
    } else {
      console.log(`✓ Activity logged: "${action}"`);
    }
  } catch (err) {
    console.warn("Warning: Could not log activity:", err.message);
  }

  console.log("\nDone! Task updated in TaskOS.\n");
}

main();
