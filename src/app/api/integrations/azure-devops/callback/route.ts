import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // workspaceId or "global"
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    console.log("[Azure DevOps Callback] Received:", {
      hasCode: !!code,
      state,
      error,
      errorDescription,
    });

    if (error) {
      console.error("[Azure DevOps Callback] OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/en/app/dashboard?error=azure_devops_auth_failed&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    if (!code) {
      console.error("[Azure DevOps Callback] No code received");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=no_code", request.url)
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/en/sign-in?callbackUrl=/en/app/dashboard", request.url)
      );
    }

    const clientId = process.env.AZURE_DEVOPS_CLIENT_ID;
    const clientSecret = process.env.AZURE_DEVOPS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[Azure DevOps Callback] Missing credentials");
      return NextResponse.redirect(
        new URL("/en/app/dashboard?error=azure_devops_not_configured", request.url)
      );
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/integrations/azure-devops/callback`;

    // Exchange code for access token
    console.log("[Azure DevOps Callback] Exchanging code for token...");
    const tokenResponse = await fetch(
      "https://app.vssps.visualstudio.com/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: clientSecret,
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: code,
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log("[Azure DevOps Callback] Token response:", {
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error,
    });

    if (tokenData.error || !tokenData.access_token) {
      console.error("[Azure DevOps Callback] Token error:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/en/app/dashboard?error=token_exchange_failed&message=${encodeURIComponent(tokenData.error_description || "Token exchange failed")}`,
          request.url
        )
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user profile from Azure DevOps
    console.log("[Azure DevOps Callback] Fetching user profile...");
    const profileResponse = await fetch(
      "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let userData: any = {};
    if (profileResponse.ok) {
      userData = await profileResponse.json();
      console.log("[Azure DevOps Callback] User profile:", {
        id: userData.id,
        displayName: userData.displayName,
        emailAddress: userData.emailAddress,
      });
    }

    // Get organizations
    const orgsResponse = await fetch(
      `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${userData.id}&api-version=7.1`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let organizations: any[] = [];
    if (orgsResponse.ok) {
      const orgsData = await orgsResponse.json();
      organizations = orgsData.value || [];
      console.log(
        "[Azure DevOps Callback] Organizations:",
        organizations.length
      );
    }

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Check existing integration
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "azure_devops")
      ),
    });

    const integrationData = {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt,
      scope: tokenData.scope || null,
      providerAccountId: userData.id || null,
      providerUsername: userData.displayName || userData.emailAddress || null,
      isActive: true,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
      metadata: JSON.stringify({
        displayName: userData.displayName,
        emailAddress: userData.emailAddress,
        publicAlias: userData.publicAlias,
        organizations: organizations.map((org: any) => ({
          id: org.accountId,
          name: org.accountName,
          uri: org.accountUri,
        })),
      }),
    };

    if (existingIntegration) {
      await db
        .update(integrations)
        .set(integrationData)
        .where(eq(integrations.id, existingIntegration.id));
      console.log("[Azure DevOps Callback] Integration updated");
    } else {
      await db.insert(integrations).values({
        userId: session.user.id,
        workspaceId: state && state !== "global" ? state : null,
        provider: "azure_devops" as const,
        ...integrationData,
      });
      console.log("[Azure DevOps Callback] New integration created");
    }

    const isNewConnection = !existingIntegration;
    const redirectUrl =
      state && state !== "global"
        ? `/en/app/${state}/dashboard?integration=azure_devops&status=connected${isNewConnection ? "&new=true" : ""}`
        : `/en/app/dashboard?integration=azure_devops&status=connected${isNewConnection ? "&new=true" : ""}`;

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("[Azure DevOps Callback] Error:", error);
    return NextResponse.redirect(
      new URL("/en/app/dashboard?error=callback_failed", request.url)
    );
  }
}
