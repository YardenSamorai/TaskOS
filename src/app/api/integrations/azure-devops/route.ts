import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Azure DevOps OAuth 2.0 authorization endpoint
const AZURE_AUTH_URL = "https://app.vssps.visualstudio.com/oauth2/authorize";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/en/sign-in?callbackUrl=/en/app/dashboard", request.url)
      );
    }

    const clientId = process.env.AZURE_DEVOPS_CLIENT_ID;

    if (!clientId) {
      console.error("[Azure DevOps OAuth] Missing AZURE_DEVOPS_CLIENT_ID");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=azure_devops_not_configured", request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId") || "global";

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/integrations/azure-devops/callback`;

    // Azure DevOps OAuth scopes
    const scope = "vso.work_full vso.code vso.project vso.profile";

    const authUrl = new URL(AZURE_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "Assertion");
    authUrl.searchParams.set("state", workspaceId);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", redirectUri);

    console.log("[Azure DevOps OAuth] Redirecting to:", authUrl.toString());

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[Azure DevOps OAuth] Error:", error);
    return NextResponse.redirect(
      new URL("/en/app/dashboard?error=oauth_init_failed", request.url)
    );
  }
}
