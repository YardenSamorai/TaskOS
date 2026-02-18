import { NextRequest, NextResponse } from "next/server";

// Jira OAuth 2.0 authorization endpoint
const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";

export async function GET(request: NextRequest) {
  const clientId = process.env.JIRA_CLIENT_ID;
  
  if (!clientId) {
    console.error("[Jira OAuth] Missing JIRA_CLIENT_ID");
    return NextResponse.redirect(
      new URL("/en/app/dashboard?error=jira_not_configured", request.url)
    );
  }

  // Get workspaceId from query params (optional)
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");

  // Build callback URL
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/integrations/jira/callback`;

  // State parameter to pass workspaceId through OAuth flow
  const state = workspaceId || "global";

  // Required scopes for Jira API
  const scopes = [
    "read:jira-user",
    "read:jira-work",
    "write:jira-work",
    "offline_access",
  ].join(" ");

  // Build authorization URL
  const authUrl = new URL(JIRA_AUTH_URL);
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
