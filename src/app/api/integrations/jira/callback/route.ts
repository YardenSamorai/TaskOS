import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/encryption";

// Jira OAuth token endpoint
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Process Jira OAuth callback

    if (error) {
      console.error("[Jira Callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=jira_auth_failed&message=${error}`, request.url)
      );
    }

    if (!code) {
      console.error("[Jira Callback] No authorization code received");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=no_code", request.url)
      );
    }

    // Get session
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[Jira Callback] No session found");
      return NextResponse.redirect(
        new URL("/en/sign-in?error=not_authenticated", request.url)
      );
    }

    // User authenticated

    // Get credentials
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/integrations/jira/callback`;

    if (!clientId || !clientSecret) {
      console.error("[Jira Callback] Missing Jira credentials");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=jira_not_configured", request.url)
      );
    }

    // Exchange code for access token
    // Exchange authorization code for token
    
    const tokenResponse = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[Jira Callback] Token exchange failed");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    // Token received successfully

    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
    } = tokenData;

    // Calculate token expiration
    const tokenExpiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000) 
      : null;

    // Get accessible resources (Jira sites)
    // Fetch accessible resources
    
    const resourcesResponse = await fetch(JIRA_RESOURCES_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    if (!resourcesResponse.ok) {
      console.error("[Jira Callback] Failed to fetch resources");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=resources_fetch_failed", request.url)
      );
    }

    const resources = await resourcesResponse.json();

    // Use the first resource (Jira site)
    const primaryResource = resources[0];
    if (!primaryResource) {
      console.error("[Jira Callback] No Jira sites accessible");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=no_jira_sites", request.url)
      );
    }

    // Check if integration already exists
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "jira")
      ),
    });

    if (existingIntegration) {
      // Update existing integration
      
      await db.update(integrations).set({
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        tokenExpiresAt,
        scope: scope || null,
        providerAccountId: primaryResource.id,
        providerUsername: primaryResource.name,
        isActive: true,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
        metadata: JSON.stringify({
          cloudId: primaryResource.id,
          name: primaryResource.name,
          url: primaryResource.url,
          scopes: primaryResource.scopes,
          avatarUrl: primaryResource.avatarUrl,
          allResources: resources,
        }),
      }).where(eq(integrations.id, existingIntegration.id));
    } else {
      // Create new integration
      
      await db.insert(integrations).values({
        userId: session.user.id,
        workspaceId: state && state !== "global" ? state : null,
        provider: "jira",
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        tokenExpiresAt,
        scope: scope || null,
        providerAccountId: primaryResource.id,
        providerUsername: primaryResource.name,
        isActive: true,
        lastSyncAt: new Date(),
        metadata: JSON.stringify({
          cloudId: primaryResource.id,
          name: primaryResource.name,
          url: primaryResource.url,
          scopes: primaryResource.scopes,
          avatarUrl: primaryResource.avatarUrl,
          allResources: resources,
        }),
      });
    }

    // Redirect back to dashboard with success
    const isNewConnection = !existingIntegration;
    const redirectUrl = state && state !== "global"
      ? `/en/app/${state}/dashboard?integration=jira&status=connected${isNewConnection ? '&new=true' : ''}`
      : `/en/app/dashboard?integration=jira&status=connected${isNewConnection ? '&new=true' : ''}`;

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("[Jira Callback] Error:", error);
    return NextResponse.redirect(
      new URL("/en/app/dashboard?error=callback_failed", request.url)
    );
  }
}
