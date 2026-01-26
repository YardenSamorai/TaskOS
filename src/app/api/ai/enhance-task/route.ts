import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeature } from "@/lib/plans";
import type { UserPlan } from "@/lib/db/schema";

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a task clarity expert for a professional task management system.
Your job is to take a rough task description and enhance it into a clear, actionable task.

IMPORTANT: Respond in the SAME LANGUAGE as the user's input. If they write in Hebrew, respond in Hebrew. If English, respond in English.

Given a task description, respond with a JSON object containing:
1. "title" - A clear, concise title (max 80 characters)
2. "description" - A detailed description explaining the task (2-4 sentences)
3. "acceptanceCriteria" - Array of 3-5 clear acceptance criteria (what defines "done")
4. "suggestedSteps" - Array of 3-6 actionable checklist steps
5. "suggestedPriority" - "low" | "medium" | "high" | "urgent"
6. "suggestedTags" - Array of 2-4 relevant tags

Rules:
- Be specific and actionable
- Use professional language
- Don't add fictional details not implied by the input
- Keep it concise but comprehensive
- If the task is about a bug, include debugging steps
- If the task is about a feature, include user story elements
- Match the user's language in all text fields

Respond ONLY with valid JSON, no markdown or explanation.`;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's plan and check feature access
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    const userPlan = (user?.plan as UserPlan) || "free";
    
    // Check if user has access to AI enhancement feature
    if (!hasFeature(userPlan, "aiTaskEnhancement")) {
      return NextResponse.json(
        { 
          error: "AI Task Enhancement is a Pro feature",
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

    const { taskDescription, context } = await request.json();

    if (!taskDescription || taskDescription.trim().length < 3) {
      return NextResponse.json(
        { error: "Task description is too short" },
        { status: 400 }
      );
    }

    // Build the prompt with context
    let contextInfo = "";
    if (context?.workspaceName) {
      contextInfo += `\nWorkspace: ${context.workspaceName}`;
    }
    if (context?.projectName) {
      contextInfo += `\nProject: ${context.projectName}`;
    }

    const userPrompt = `${contextInfo ? `Context:${contextInfo}\n\n` : ""}Task to enhance: "${taskDescription}"`;

    // Call Groq with Llama 3.3 (fast and capable)
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content || "";

    // Parse the JSON response
    // Clean up the response (remove markdown code blocks if present)
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const enhancedTask = JSON.parse(cleanedText);

    // Validate the response structure
    if (!enhancedTask.title || !enhancedTask.description) {
      throw new Error("Invalid AI response structure");
    }

    return NextResponse.json({
      success: true,
      enhancedTask: {
        title: enhancedTask.title,
        description: enhancedTask.description,
        acceptanceCriteria: enhancedTask.acceptanceCriteria || [],
        suggestedSteps: enhancedTask.suggestedSteps || [],
        suggestedPriority: enhancedTask.suggestedPriority || "medium",
        suggestedTags: enhancedTask.suggestedTags || [],
      },
    });
  } catch (error) {
    console.error("AI Enhancement Error:", error);
    
    // Return a helpful error message
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI response was invalid. Please try again." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to enhance task. Please try again." },
      { status: 500 }
    );
  }
}
