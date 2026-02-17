import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a senior developer writing git commit messages and PR titles.
You receive:
- A task title and description (what was requested)
- A git diff summary (what actually changed)
- A list of changed files

Based on this, generate:
1. A concise commit message (one line, max 72 chars, conventional-commit style like "feat: ..." or "fix: ...")
2. A PR title (clear, descriptive, max 80 chars)
3. A short PR summary (2-4 bullet points of what changed)

Rules:
- The commit message should describe WHAT was done, not the task name
- Use conventional commit prefixes: feat, fix, refactor, docs, chore, test, perf, ci
- Pick the prefix based on the actual changes, not the task type
- Be specific: "feat: add branch convention settings UI" not "feat: implement task"
- If the diff is mostly bug fixes, use "fix:"
- If it's refactoring, use "refactor:"
- Keep it professional and concise

Respond with ONLY a JSON object (no markdown):
{
  "commitMessage": "feat: add branch convention settings to workspace",
  "prTitle": "Add configurable branch naming conventions",
  "prSummary": "- Added branch convention settings UI\\n- Support for preset conventions (Git Flow, GitHub Flow)\\n- Live preview of generated branch names"
}`;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { apiKeyId, userPlan } = auth.request;

    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const body = await request.json();
    const { taskTitle, taskDescription, diffSummary, changedFiles } = body;

    if (!taskTitle) {
      return NextResponse.json(
        { error: "taskTitle is required" },
        { status: 400, headers: rateLimit.headers }
      );
    }

    const userPrompt = [
      `## Task`,
      `**Title:** ${taskTitle}`,
      taskDescription ? `**Description:** ${taskDescription}` : "",
      "",
      `## Changes`,
      diffSummary
        ? `**Diff summary:**\n${diffSummary.substring(0, 3000)}`
        : "No diff available",
      "",
      changedFiles?.length
        ? `**Changed files:** ${changedFiles.slice(0, 30).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 500, headers: rateLimit.headers }
      );
    }

    const result = JSON.parse(content);

    return NextResponse.json(
      {
        commitMessage: result.commitMessage || `feat: ${taskTitle}`,
        prTitle: result.prTitle || taskTitle,
        prSummary: result.prSummary || "",
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("[API] generate-commit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
