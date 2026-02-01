import { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/actions/api-keys";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeature } from "@/lib/plans";
import type { UserPlan } from "@/lib/db/schema";

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  apiKeyId: string;
  userPlan: "pro" | "enterprise";
}

/**
 * Middleware to authenticate API requests using API keys
 * Returns the authenticated request with userId and apiKeyId
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<{
  authenticated: boolean;
  request?: AuthenticatedRequest;
  error?: string;
  status?: number;
}> {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return {
        authenticated: false,
        error: "Missing Authorization header",
        status: 401,
      };
    }

    // Extract Bearer token
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return {
        authenticated: false,
        error: "Invalid Authorization header format. Use: Bearer <token>",
        status: 401,
      };
    }

    const apiKey = parts[1];

    // Verify API key
    const verification = await verifyApiKey(apiKey);

    if (!verification.valid || !verification.userId) {
      return {
        authenticated: false,
        error: "Invalid or expired API key",
        status: 401,
      };
    }

    // Check if user has API access feature (Pro and above)
    const user = await db.query.users.findFirst({
      where: eq(users.id, verification.userId),
    });

    if (!user) {
      return {
        authenticated: false,
        error: "User not found",
        status: 401,
      };
    }

    const userPlan = (user.plan as UserPlan) || "free";
    if (!hasFeature(userPlan, "apiAccess")) {
      return {
        authenticated: false,
        error: "API Access is a Pro feature. Please upgrade to Pro plan or higher.",
        status: 403,
      };
    }

    // Ensure plan is pro or enterprise for rate limiting
    const planForRateLimit = userPlan === "enterprise" ? "enterprise" : "pro";

    // Add user info to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.userId = verification.userId;
    authenticatedRequest.apiKeyId = verification.apiKeyId!;
    authenticatedRequest.userPlan = planForRateLimit;

    return {
      authenticated: true,
      request: authenticatedRequest,
    };
  } catch (error) {
    console.error("API authentication error:", error);
    return {
      authenticated: false,
      error: "Authentication failed",
      status: 500,
    };
  }
}
