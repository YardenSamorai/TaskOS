import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // workspaceId or "global"
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("GitHub OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=github_auth_failed`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=no_code`, request.url)
      );
    }

    // Get current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL(`/en/sign-in?callbackUrl=/en/app/dashboard`, request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub token error:", tokenData.error);
      return NextResponse.redirect(
        new URL(`/en/app/dashboard?error=token_exchange_failed`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Get GitHub user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    const userData = await userResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000) 
      : null;

    // Check if integration already exists
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "github")
      ),
    });

    if (existingIntegration) {
      // Update existing integration
      await db
        .update(integrations)
        .set({
          accessToken: access_token,
          refreshToken: refresh_token,
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
    } else {
      // Create new integration
      await db.insert(integrations).values({
        userId: session.user.id,
        workspaceId: state !== "global" ? state : null,
        provider: "github",
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        scope,
        providerAccountId: userData.id?.toString(),
        providerUsername: userData.login,
        isActive: true,
        lastSyncAt: new Date(),
        metadata: JSON.stringify({
          name: userData.name,
          email: userData.email,
          avatar_url: userData.avatar_url,
          html_url: userData.html_url,
        }),
      });
    }

    // Redirect back to dashboard with success
    const redirectUrl = state && state !== "global" 
      ? `/en/app/${state}/dashboard?integration=github&status=connected`
      : `/en/app/dashboard?integration=github&status=connected`;

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(
      new URL(`/en/app/dashboard?error=callback_failed`, request.url)
    );
  }
}
