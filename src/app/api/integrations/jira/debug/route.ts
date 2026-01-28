import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get Jira integration
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "jira")
      ),
    });

    if (!integration) {
      return NextResponse.json({ error: "Jira not connected" }, { status: 404 });
    }

    // Parse metadata
    let metadata = null;
    try {
      metadata = integration.metadata ? JSON.parse(integration.metadata as string) : null;
    } catch {}

    // Test the API
    const cloudId = metadata?.cloudId || integration.providerAccountId;
    const testUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`;
    
    console.log("[Jira Debug] Testing URL:", testUrl);
    
    const testResponse = await fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        Accept: "application/json",
      },
    });

    const testStatus = testResponse.status;
    let testBody = null;
    try {
      testBody = await testResponse.text();
    } catch {}

    // Also test accessible resources
    const resourcesUrl = "https://api.atlassian.com/oauth/token/accessible-resources";
    const resourcesResponse = await fetch(resourcesUrl, {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        Accept: "application/json",
      },
    });
    
    let resources = null;
    try {
      resources = await resourcesResponse.json();
    } catch {}

    // Test projects endpoint
    const projectsUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`;
    console.log("[Jira Debug] Testing projects URL:", projectsUrl);
    
    const projectsResponse = await fetch(projectsUrl, {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        Accept: "application/json",
      },
    });

    let projectsBody = null;
    try {
      projectsBody = await projectsResponse.text();
    } catch {}

    // Test search endpoint (issues) - using new POST /search/jql
    const searchUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`;
    console.log("[Jira Debug] Testing search URL:", searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jql: "project = SCRUM",
        maxResults: 10,
        fields: ["summary", "status", "issuetype"],
      }),
    });

    let searchBody = null;
    try {
      searchBody = await searchResponse.text();
    } catch {}

    return NextResponse.json({
      integration: {
        id: integration.id,
        provider: integration.provider,
        providerAccountId: integration.providerAccountId,
        providerUsername: integration.providerUsername,
        isActive: integration.isActive,
        tokenExpiresAt: integration.tokenExpiresAt,
        hasRefreshToken: !!integration.refreshToken,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
      metadata,
      cloudIdUsed: cloudId,
      apiTest: {
        url: testUrl,
        status: testStatus,
        body: testBody?.substring(0, 500),
      },
      projectsTest: {
        url: projectsUrl,
        status: projectsResponse.status,
        body: projectsBody?.substring(0, 1000),
      },
      searchTest: {
        url: searchUrl,
        status: searchResponse.status,
        body: searchBody?.substring(0, 1000),
      },
      accessibleResources: {
        status: resourcesResponse.status,
        resources: resources,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
