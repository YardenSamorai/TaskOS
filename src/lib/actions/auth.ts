"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { z } from "zod";
import { AuthError } from "next-auth";

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

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password" };
        default:
          return { success: false, error: "Something went wrong" };
      }
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Login error:", error);
    return { success: false, error: "Failed to sign in" };
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/en/app/workspaces" });
}

export async function logoutUser() {
  await signOut({ redirectTo: "/en" });
}
