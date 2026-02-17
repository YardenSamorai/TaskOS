import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import { rateLimitApiRequest } from "@/lib/middleware/rate-limit";
import { hasFeature } from "@/lib/plans";
import Groq from "groq-sdk";

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB for diffs

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CODE_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer. You review code diffs against a set of review rules and standards.

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation outside JSON.

Given a diff, a list of changed files, a review profile (rules, focus areas, strictness), and optionally test results, produce a structured code review.

Your response MUST be a JSON object with this exact shape:
{
  "summary": "1-3 sentence summary of the changes and overall quality",
  "risk_level": "low" | "medium" | "high",
  "test_status": {
    "status": "pass" | "fail" | "skipped" | "not_run",
    "reason": "optional explanation"
  },
  "findings": [
    {
      "file": "path/to/file",
      "line_range": "12-15",
      "severity": "info" | "warn" | "blocker",
      "category": "one of the focus areas or 'general'",
      "message": "what the issue is",
      "suggested_fix": "optional code or guidance to fix"
    }
  ],
  "required_actions": ["list of things that MUST be fixed before merge"],
  "optional_suggestions": ["list of nice-to-have improvements"]
}

Rules for severity levels:
- "blocker": Must be fixed before merge. Security issues, broken logic, missing required tests, violated blocker rules.
- "warn": Should be fixed. Code smells, missing documentation, style violations.
- "info": Optional improvement. Suggestions, alternative approaches.

When strictness is "high", be thorough and flag even minor issues.
When strictness is "medium", focus on important issues.
When strictness is "low", only flag critical issues.

Always check for:
- Security vulnerabilities (hardcoded secrets, injection risks, etc.)
- Missing error handling
- Type safety issues
- Business logic correctness`;

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large. Maximum size is 2MB." },
        { status: 413 }
      );
    }

    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.request) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const { userId, apiKeyId, userPlan } = auth.request;

    const rateLimit = await rateLimitApiRequest(apiKeyId, userPlan);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status || 429, headers: rateLimit.headers }
      );
    }

    const responseHeaders = rateLimit.headers || {};

    if (!hasFeature(userPlan, "aiCodeGeneration")) {
      return NextResponse.json(
        { error: "AI Code Review is a Pro feature", code: "FEATURE_LOCKED", plan: userPlan },
        { status: 403 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { diff, changedFiles, projectContext, reviewProfile, testResults } = body;

    if (!diff || diff.trim().length < 10) {
      return NextResponse.json(
        { error: "Diff is too short or missing" },
        { status: 400 }
      );
    }

    // Build the review prompt
    const userPrompt = buildReviewPrompt(
      diff,
      changedFiles || [],
      projectContext || "",
      reviewProfile || {},
      testResults
    );

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: CODE_REVIEW_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content;

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI service" },
        { status: 500 }
      );
    }

    let result;
    try {
      const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        {
          success: true,
          summary: "AI returned unstructured review",
          risk_level: "medium",
          test_status: { status: "not_run" },
          findings: [],
          required_actions: [],
          optional_suggestions: [text.substring(0, 500)],
          raw_response: text.substring(0, 2000),
        },
        { headers: responseHeaders }
      );
    }

    // Validate and normalize the result
    const review = {
      success: true,
      summary: result.summary || "Review completed",
      risk_level: result.risk_level || "medium",
      test_status: result.test_status || { status: "not_run" },
      findings: Array.isArray(result.findings)
        ? result.findings.map((f: any) => ({
            file: f.file || "unknown",
            line_range: f.line_range || undefined,
            severity: ["info", "warn", "blocker"].includes(f.severity) ? f.severity : "info",
            category: f.category || "general",
            message: f.message || "",
            suggested_fix: f.suggested_fix || undefined,
          }))
        : [],
      required_actions: Array.isArray(result.required_actions) ? result.required_actions : [],
      optional_suggestions: Array.isArray(result.optional_suggestions) ? result.optional_suggestions : [],
    };

    return NextResponse.json(review, { headers: responseHeaders });
  } catch (error) {
    console.error("Error performing code review:", error);
    return NextResponse.json(
      { error: "Failed to perform code review" },
      { status: 500 }
    );
  }
}

function buildReviewPrompt(
  diff: string,
  changedFiles: string[],
  projectContext: string,
  reviewProfile: any,
  testResults?: any
): string {
  const lines: string[] = [];

  lines.push("## Review Profile");
  lines.push(`Strictness: ${reviewProfile.strictness || "medium"}`);

  if (reviewProfile.focus_areas?.length > 0) {
    lines.push(`Focus Areas: ${reviewProfile.focus_areas.join(", ")}`);
  }

  if (reviewProfile.rules?.length > 0) {
    lines.push("\nRules to enforce:");
    for (const rule of reviewProfile.rules) {
      lines.push(`- [${rule.severity?.toUpperCase() || "WARN"}] ${rule.description || rule.id}`);
    }
  }

  if (reviewProfile.required_checks?.length > 0) {
    lines.push("\nRequired checks:");
    for (const check of reviewProfile.required_checks) {
      lines.push(`- ${check}`);
    }
  }

  if (projectContext) {
    lines.push(`\n## Project Context\n${projectContext}`);
  }

  lines.push(`\n## Changed Files (${changedFiles.length})`);
  for (const file of changedFiles.slice(0, 50)) {
    lines.push(`- ${file}`);
  }

  if (testResults) {
    lines.push("\n## Test Results");
    lines.push(`Status: ${testResults.result || testResults.status || "unknown"}`);
    if (testResults.summary) {
      lines.push(`Total: ${testResults.summary.total}, Passed: ${testResults.summary.passed}, Failed: ${testResults.summary.failed}`);
    }
    if (testResults.failures?.length > 0) {
      lines.push("Failed tests:");
      for (const f of testResults.failures.slice(0, 10)) {
        lines.push(`  - ${f.test_name}: ${f.message || ""}`);
      }
    }
  }

  // Truncate diff to fit in context window (roughly 6K tokens for review, rest for diff)
  const maxDiffLength = 15_000;
  const truncatedDiff = diff.length > maxDiffLength
    ? diff.substring(0, maxDiffLength) + "\n\n[...diff truncated...]"
    : diff;

  lines.push(`\n## Diff\n\`\`\`diff\n${truncatedDiff}\n\`\`\``);

  return lines.join("\n");
}
