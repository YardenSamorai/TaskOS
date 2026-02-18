import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // workspaceId or "global"
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    console.log("[GitHub Callback] Received callback:", {
      hasCode: !!code,
      state,
      error,
      errorDescription,
    });

    // Handle OAuth errors
    if (error) {
      console.error("[GitHub Callback] OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=github_auth_failed&message=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      console.error("[GitHub Callback] No code received");
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=no_code`, request.url)
      );
    }

    // Get current user session
    const session = await auth();
    console.log("[GitHub Callback] Session:", { userId: session?.user?.id, email: session?.user?.email });
    
    if (!session?.user?.id) {
      console.error("[GitHub Callback] No session found");
      return NextResponse.redirect(
        new URL(`/en/sign-in?callbackUrl=/en/app/dashboard`, request.url)
      );
    }

    // Check GitHub credentials
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error("[GitHub Callback] Missing GitHub credentials");
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=github_not_configured`, request.url)
      );
    }

    // Exchange code for access token
    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("[GitHub Callback] Token exchange completed:", { 
      hasError: !!tokenData.error,
      hasAccessToken: !!tokenData.access_token
    });

    if (tokenData.error) {
      console.error("[GitHub Callback] Token exchange error");
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=token_exchange_failed&message=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Get GitHub user info
    console.log("[GitHub Callback] Fetching GitHub user info...");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    const userData = await userResponse.json();
    console.log("[GitHub Callback] GitHub user:", { 
      id: userData.id, 
      login: userData.login,
      name: userData.name 
    });

    // Calculate token expiration
    const tokenExpiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000) 
      : null;

    // Check if integration already exists
    console.log("[GitHub Callback] Checking for existing integration...");
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "github")
      ),
    });
    console.log("[GitHub Callback] Existing integration:", existingIntegration?.id || "none");

    if (existingIntegration) {
      // Update existing integration
      console.log("[GitHub Callback] Updating existing integration...");
      try {
        await db
          .update(integrations)
          .set({
            accessToken: encrypt(access_token),
            refreshToken: refresh_token ? encrypt(refresh_token) : null,
            tokenExpiresAt,
            scope,
            providerAccountId: userData.id?.toString(),
            providerUsername: userData.login,
            isActive: true,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
            metadata: JSON.stringify({
              name: userData.name,
              email: userData.email,
              avatar_url: userData.avatar_url,
              html_url: userData.html_url,
            }),
          })
          .where(eq(integrations.id, existingIntegration.id));
        console.log("[GitHub Callback] Integration updated successfully");
      } catch (dbError) {
        console.error("[GitHub Callback] DB update error:", dbError);
        throw dbError;
      }
    } else {
      // Create new integration
      console.log("[GitHub Callback] Creating new integration for user:", session.user.id);
      console.log("[GitHub Callback] Workspace ID:", state !== "global" ? state : "null (global)");
      
      try {
        // Don't set workspaceId if it's "global" - set to null for global integrations
        const integrationData = {
          userId: session.user.id,
          workspaceId: state && state !== "global" ? state : null,
          provider: "github" as const,
          accessToken: encrypt(access_token),
          refreshToken: refresh_token ? encrypt(refresh_token) : null,
          tokenExpiresAt: tokenExpiresAt || null,
          scope: scope || null,
          providerAccountId: userData.id?.toString() || null,
          providerUsername: userData.login || null,
          isActive: true,
          lastSyncAt: new Date(),
          metadata: JSON.stringify({
            name: userData.name,
            email: userData.email,
            avatar_url: userData.avatar_url,
            html_url: userData.html_url,
          }),
        };
        
        console.log("[GitHub Callback] Integration data prepared:", {
          userId: integrationData.userId,
          workspaceId: integrationData.workspaceId,
          provider: integrationData.provider,
          providerUsername: integrationData.providerUsername,
        });
        
        const newIntegration = await db.insert(integrations).values(integrationData).returning();
        console.log("[GitHub Callback] New integration created:", newIntegration[0]?.id);
      } catch (dbError) {
        console.error("[GitHub Callback] DB insert error:", dbError);
        console.error("[GitHub Callback] DB error details:", JSON.stringify(dbError, Object.getOwnPropertyNames(dbError)));
        throw dbError;
      }
    }

    // Redirect back to dashboard with success
    const isNewConnection = !existingIntegration;
    const redirectUrl = state && state !== "global" 
      ? `/en/app/${state}/dashboard?integration=github&status=connected${isNewConnection ? '&new=true' : ''}`
      : `/en/app/dashboard?integration=github&status=connected${isNewConnection ? '&new=true' : ''}`;

    console.log("[GitHub Callback] Success! Redirecting to:", redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("[GitHub Callback] Error:", error);
    return NextResponse.redirect(
      new URL(`/en/app/dashboard?error=callback_failed`, request.url)
    );
  }
}
