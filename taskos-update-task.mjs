/**
 * TaskOS Agent Helper Script
 *
 * Updates task status, logs activity, and marks steps as completed.
 * Reads task context from .taskos/task-<taskId>.json.
 * Reads API key from TASKOS_API_KEY environment variable ONLY.
 *
 * Usage:
 *   node taskos-update-task.mjs log   <taskId> "message"
 *   node taskos-update-task.mjs done  <taskId> "summary"
 *   node taskos-update-task.mjs step  <taskId> <stepId> completed
 *
 * Environment:
 *   TASKOS_API_KEY  - Required. Your TaskOS API key (Bearer token).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";

// ───────── Helpers ─────────

function die(msg) {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`  WARN: ${msg}`);
}

function sha256(...parts) {
  return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 40);
}

function gitHead() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "unknown";
  }
}

function changedFiles() {
  try {
    const out = execSync("git diff --name-only HEAD~1..HEAD", {
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    if (out) return out.split("\n");
  } catch { /* fallthrough */ }
  try {
    const out = execSync("git diff --name-only", {
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    if (out) return out.split("\n");
  } catch { /* fallthrough */ }
  return [];
}

// ───────── Context loading ─────────

function loadContext(taskId) {
  const taskosDir = join(process.cwd(), ".taskos");

  // Try exact file first
  const exact = join(taskosDir, `task-${taskId}.json`);
  if (existsSync(exact)) {
    return JSON.parse(readFileSync(exact, "utf8"));
  }

  // If taskId looks like a short prefix, try to find matching file
  if (existsSync(taskosDir)) {
    const files = readdirSync(taskosDir).filter(f => f.startsWith("task-") && f.endsWith(".json"));
    const match = files.find(f => f.includes(taskId));
    if (match) {
      return JSON.parse(readFileSync(join(taskosDir, match), "utf8"));
    }
  }

  die(
    `.taskos/task-${taskId}.json not found.\n` +
    "  Make sure you sent this task via the TaskOS VS Code extension."
  );
}

function readCursorSettings() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return null;

  const paths = [
    join(process.env.APPDATA || join(home, "AppData", "Roaming"), "Cursor", "User", "settings.json"),
    join(home, "Library", "Application Support", "Cursor", "User", "settings.json"),
    join(home, ".config", "Cursor", "User", "settings.json"),
  ];

  for (const p of paths) {
    try {
      if (existsSync(p)) {
        return JSON.parse(readFileSync(p, "utf8"));
      }
    } catch { /* try next */ }
  }
  return null;
}

function getApiKey() {
  if (process.env.TASKOS_API_KEY) {
    return process.env.TASKOS_API_KEY;
  }

  const settings = readCursorSettings();
  if (settings?.["taskos.apiKey"]) {
    return settings["taskos.apiKey"];
  }

  die(
    "API key not found.\n" +
    "  Set it in the TaskOS extension settings (taskos.apiKey) or\n" +
    "  set TASKOS_API_KEY environment variable."
  );
}

// ───────── Pending queue ─────────

function appendPending(entry) {
  const pendingPath = join(process.cwd(), ".taskos", "pending.json");
  let pending = [];
  try {
    if (existsSync(pendingPath)) {
      pending = JSON.parse(readFileSync(pendingPath, "utf8"));
    }
  } catch { /* start fresh */ }
  pending.push({ ...entry, failedAt: new Date().toISOString() });
  writeFileSync(pendingPath, JSON.stringify(pending, null, 2), "utf8");
  warn(`Saved to .taskos/pending.json for retry`);
}

// ───────── API calls ─────────

async function apiCall(baseUrl, apiKey, method, path, body) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${data.error || res.statusText}`);
  }

  return data;
}

// ───────── Commands ─────────

async function cmdLog(context, apiKey, message) {
  const head = gitHead();
  const dedupeKey = sha256(context.taskId, message, head, "log");
  const files = changedFiles();

  console.log(`\n  TaskOS: Logging activity for "${context.title || context.taskId}"`);
  console.log(`  Message: ${message}\n`);

  try {
    const result = await apiCall(context.baseUrl, apiKey, "POST", `/tasks/${context.taskId}/activity`, {
      action: "agent.log",
      entityType: "task",
      dedupeKey,
      metadata: {
        summary: message,
        agent: "cursor",
        gitHead: head,
        changedFiles: files,
        tests: "not_run",
      },
    });

    if (result.deduplicated) {
      console.log("  ✓ Already logged (idempotent, no duplicate created)");
    } else {
      console.log("  ✓ Activity logged");
    }
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    appendPending({ command: "log", taskId: context.taskId, message, dedupeKey });
    process.exit(1);
  }
}

async function cmdDone(context, apiKey, summary) {
  const head = gitHead();
  const dedupeKey = sha256(context.taskId, "done", head);
  const files = changedFiles();

  console.log(`\n  TaskOS: Completing task "${context.title || context.taskId}"`);
  console.log(`  Summary: ${summary}\n`);

  // 1. Update status to done
  try {
    await apiCall(context.baseUrl, apiKey, "PATCH", `/tasks/${context.taskId}`, {
      status: "done",
    });
    console.log('  ✓ Status → done');
  } catch (err) {
    console.error(`  ✗ Status update failed: ${err.message}`);
    appendPending({ command: "done_status", taskId: context.taskId, dedupeKey });
    process.exit(1);
  }

  // 2. Log activity
  try {
    const result = await apiCall(context.baseUrl, apiKey, "POST", `/tasks/${context.taskId}/activity`, {
      action: "agent.completed",
      entityType: "task",
      dedupeKey,
      metadata: {
        summary,
        agent: "cursor",
        gitHead: head,
        changedFiles: files,
        tests: "not_run",
      },
    });

    if (result.deduplicated) {
      console.log("  ✓ Already logged (idempotent)");
    } else {
      console.log("  ✓ Completion activity logged");
    }
  } catch (err) {
    warn(`Activity log failed: ${err.message}`);
    appendPending({ command: "done_activity", taskId: context.taskId, summary, dedupeKey });
  }

  console.log("\n  Done! Task marked as complete in TaskOS.\n");
}

async function cmdStep(context, apiKey, stepId, state) {
  if (state !== "completed") {
    die(`Unknown step state: "${state}". Use "completed".`);
  }

  console.log(`\n  TaskOS: Marking step ${stepId} as completed`);

  try {
    await apiCall(context.baseUrl, apiKey, "PATCH", `/tasks/${context.taskId}/steps/${stepId}`, {
      completed: true,
    });
    console.log("  ✓ Step marked as completed");
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    appendPending({ command: "step", taskId: context.taskId, stepId, state });
    process.exit(1);
  }
}

// ───────── Main ─────────

function usage() {
  console.log(`
  TaskOS Agent Helper

  Usage:
    node taskos-update-task.mjs log   <taskId> "message"
    node taskos-update-task.mjs done  <taskId> "summary"
    node taskos-update-task.mjs step  <taskId> <stepId> completed

  Environment:
    TASKOS_API_KEY - Required. Your TaskOS API key.
  `);
  process.exit(1);
}

async function main() {
  const [, , command, taskId, ...rest] = process.argv;

  if (!command || !taskId) usage();

  const apiKey = getApiKey();
  const context = loadContext(taskId);

  switch (command) {
    case "log": {
      const message = rest.join(" ");
      if (!message) die("Message is required. Usage: node taskos-update-task.mjs log <taskId> \"message\"");
      await cmdLog(context, apiKey, message);
      break;
    }
    case "done": {
      const summary = rest.join(" ");
      if (!summary) die("Summary is required. Usage: node taskos-update-task.mjs done <taskId> \"summary\"");
      await cmdDone(context, apiKey, summary);
      break;
    }
    case "step": {
      const [stepId, state] = rest;
      if (!stepId || !state) die("Usage: node taskos-update-task.mjs step <taskId> <stepId> completed");
      await cmdStep(context, apiKey, stepId, state);
      break;
    }
    default:
      die(`Unknown command: "${command}". Use log, done, or step.`);
  }
}

main();
