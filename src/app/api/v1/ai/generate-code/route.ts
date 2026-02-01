import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/middleware/api-auth";
import Groq from "groq-sdk";
import { db } from "@/lib/db";
import { users, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeature } from "@/lib/plans";
import type { UserPlan } from "@/lib/db/schema";

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CODE_GENERATION_PROMPT = `You are an expert software developer and code generator.
Your job is to generate high-quality, production-ready code based on task descriptions.

IMPORTANT: Respond in the SAME LANGUAGE as the user's input. If they write in Hebrew, respond in Hebrew. If English, respond in English.

Given a task description, generate:
1. Complete, working code
2. Clear comments explaining the code
3. Best practices and error handling
4. Type definitions if needed

Rules:
- Generate complete, runnable code
- Include proper error handling
- Add meaningful comments
- Follow language-specific best practices
- Use modern syntax and patterns
- If task mentions a specific language/framework, use that
- If no language specified, infer from context or ask

Respond with a JSON object containing:
{
  "code": "the generated code",
  "language": "detected or specified language",
  "explanation": "brief explanation of what the code does",
  "dependencies": ["list of dependencies if any"],
  "files": [{"path": "file path", "content": "file content"}]
}

If multiple files are needed, include them in the "files" array.
If single file, put code in "code" field.

Respond ONLY with valid JSON, no markdown or explanation outside JSON.`;

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

    // Get user's plan and check feature access
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const userPlan = (user?.plan as UserPlan) || "free";

    // Check if user has access to AI code generation feature
    if (!hasFeature(userPlan, "aiCodeGeneration")) {
      return NextResponse.json(
        {
          error: "AI Code Generation is a Pro feature",
          code: "FEATURE_LOCKED",
          plan: userPlan,
        },
        { status: 403 }
      );
    }

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { taskDescription, taskId, language, context } = body;

    if (!taskDescription || taskDescription.trim().length < 3) {
      return NextResponse.json(
        { error: "Task description is too short" },
        { status: 400 }
      );
    }

    // If taskId provided, fetch task details for context
    let taskContext = "";
    if (taskId) {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
        with: {
          workspace: true,
          project: true,
        },
      });

      if (task) {
        taskContext = `\nTask: ${task.title}`;
        if (task.description) {
          taskContext += `\nDescription: ${task.description}`;
        }
        if (task.workspace) {
          taskContext += `\nWorkspace: ${task.workspace.name}`;
        }
        if (task.project) {
          taskContext += `\nProject: ${task.project.name}`;
        }
      }
    }

    // Build context info
    let contextInfo = "";
    if (context?.workspaceName) {
      contextInfo += `\nWorkspace: ${context.workspaceName}`;
    }
    if (context?.projectName) {
      contextInfo += `\nProject: ${context.projectName}`;
    }
    if (context?.filePath) {
      contextInfo += `\nFile Path: ${context.filePath}`;
    }
    if (context?.existingCode) {
      contextInfo += `\nExisting Code:\n${context.existingCode}`;
    }
    if (language) {
      contextInfo += `\nPreferred Language: ${language}`;
    }

    const userPrompt = `${taskContext ? `Task Context:${taskContext}\n\n` : ""}${contextInfo ? `Additional Context:${contextInfo}\n\n` : ""}Generate code for: "${taskDescription}"`;

    // Call Groq with Llama 3.3
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: CODE_GENERATION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2, // Lower temperature for more consistent code
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content;

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI service" },
        { status: 500 }
      );
    }

    // Parse JSON response
    let result;
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      // If JSON parsing fails, return as plain code
      return NextResponse.json({
        success: true,
        code: text,
        language: language || "unknown",
        explanation: "Generated code",
        files: [
          {
            path: "generated.ts",
            content: text,
          },
        ],
      });
    }

    // Validate result structure
    if (!result.code && !result.files) {
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      );
    }

    // If single file, ensure it's in the files array
    if (result.code && !result.files) {
      result.files = [
        {
          path: `generated.${result.language || "ts"}`,
          content: result.code,
        },
      ];
    }

    return NextResponse.json({
      success: true,
      code: result.code || result.files[0]?.content || "",
      language: result.language || language || "typescript",
      explanation: result.explanation || "Generated code based on task description",
      dependencies: result.dependencies || [],
      files: result.files || [],
    });
  } catch (error) {
    console.error("Error generating code:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
