"use server";

import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { z } from "zod";
import { AuthError } from "next-auth";
import { sendPasswordResetEmail } from "@/lib/email";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function registerUser(formData: FormData) {
  try {
    const data = signUpSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        emailVerified: new Date(), // For now, auto-verify
      })
      .returning();

    return { success: true, user: { id: newUser.id, email: newUser.email } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Registration error:", error);
    return { success: false, error: "Failed to create account" };
  }
}

export async function loginUser(formData: FormData) {
  try {
    const data = signInSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Check if user exists and has a password
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (!user) {
      return { success: false, error: "No account found with this email" };
    }

    if (!user.password) {
      // User exists but signed up with Google
      return { 
        success: false, 
        error: "This account uses Google Sign-In",
        errorCode: "GOOGLE_ACCOUNT" 
      };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      return { success: false, error: "Invalid password" };
    }

    // Now sign in - this should work since we validated
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Login error:", error);
    
    // Check for NEXT_REDIRECT - this means signIn succeeded and is trying to redirect
    if (error?.digest?.includes("NEXT_REDIRECT")) {
      return { success: true };
    }

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    
    return { success: false, error: "Failed to sign in" };
  }
}

export async function loginWithGoogle(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl || "/en/app/workspaces" });
}

export async function logoutUser() {
  await signOut({ redirectTo: "/en" });
}

export async function setPassword(newPassword: string) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate password
    const passwordValidation = z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .safeParse(newPassword);

    if (!passwordValidation.success) {
      return { success: false, error: passwordValidation.error.errors[0].message };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return { success: true };
  } catch (error) {
    console.error("Set password error:", error);
    return { success: false, error: "Failed to set password" };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // If user has a password, verify the current one
    if (user.password) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return { success: false, error: "Current password is incorrect" };
      }
    }

    // Validate new password
    const passwordValidation = z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .safeParse(newPassword);

    if (!passwordValidation.success) {
      return { success: false, error: passwordValidation.error.errors[0].message };
    }

    // Hash and save
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error: "Failed to change password" };
  }
}

export async function checkHasPassword() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    
    if (!session?.user?.id) {
      return { hasPassword: false };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { password: true },
    });

    return { hasPassword: !!user?.password };
  } catch (error) {
    return { hasPassword: false };
  }
}

// Generate a secure random token
function generateToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function requestPasswordReset(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // Delete any existing tokens for this user
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, normalizedEmail));

    // Create a new token
    const token = generateToken(64);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await db.insert(verificationTokens).values({
      identifier: normalizedEmail,
      token,
      expires,
    });

    // Send the email
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/en/reset-password/${token}`;
    
    const emailResult = await sendPasswordResetEmail({
      to: normalizedEmail,
      userName: user.name || "User",
      resetLink,
    });

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      return { success: false, error: "Failed to send reset email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, error: "Failed to process request" };
  }
}

export async function verifyResetToken(token: string) {
  try {
    // Find the token
    const tokenRecord = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, token),
    });

    if (!tokenRecord) {
      return { valid: false };
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires) {
      // Delete expired token
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
      return { valid: false };
    }

    return { valid: true, email: tokenRecord.identifier };
  } catch (error) {
    console.error("Token verification error:", error);
    return { valid: false };
  }
}

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export async function resetPassword(token: string, newPassword: string) {
  try {
    // Validate password
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return { success: false, error: passwordValidation.error.errors[0].message };
    }

    // Find and validate the token
    const tokenRecord = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, token),
    });

    if (!tokenRecord) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires) {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
      return { success: false, error: "Reset link has expired" };
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, tokenRecord.identifier),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Delete the used token
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: "Failed to reset password" };
  }
}
