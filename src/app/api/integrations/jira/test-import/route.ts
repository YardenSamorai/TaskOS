import { NextRequest, NextResponse } from "next/server";
import { getProjectIssues } from "@/lib/actions/jira";

// Test endpoint that calls the exact same function as the import dialog
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectKey = searchParams.get("project") || "SCRUM";
    
    console.log("[Test Import] Calling getProjectIssues with projectKey:", projectKey);
    
    const result = await getProjectIssues(projectKey, { maxResults: 10 });
    
    console.log("[Test Import] Result:", JSON.stringify(result, null, 2));
    
    return NextResponse.json({
      projectKey,
      result,
    });
  } catch (error: any) {
    console.error("[Test Import] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
