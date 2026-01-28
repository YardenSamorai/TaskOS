import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL(`/en/sign-in?callbackUrl=/en/app/dashboard`, request.url)
      );
    }

    // Get workspace ID from query params if provided
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId") || "global";

    const clientId = process.env.GITHUB_CLIENT_ID;
    
    if (!clientId) {
      console.error("GitHub Client ID not configured");
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=github_not_configured`, request.url)
      );
    }

    // Build the redirect URI (using the origin from the request)
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/integrations/github/callback`;
    
    // Request scopes
    const scope = "repo,read:user,user:email";

    // Build GitHub OAuth URL
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", workspaceId);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("GitHub OAuth initiation error:", error);
    return NextResponse.redirect(
      new URL(`/en/app/dashboard?error=oauth_init_failed`, request.url)
    );
  }
}
