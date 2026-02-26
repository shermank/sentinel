"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { signIn } from ".";
import { generateUrlSafeToken } from "@/lib/crypto/server";
import { sendEmail, verificationEmail } from "@/lib/email";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  captchaToken: z.string().min(1, "CAPTCHA verification is required"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Register a new user with email and password
 */
export async function signUpWithCredentials(
  input: SignUpInput
): Promise<AuthResult> {
  try {
    // Validate input
    const validatedInput = signUpSchema.parse(input);

    // Verify Turnstile CAPTCHA
    const turnstileRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: validatedInput.captchaToken,
        }),
      }
    );
    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      console.error("Turnstile verification failed:", JSON.stringify(turnstileData));
      console.error("Secret key present:", !!process.env.TURNSTILE_SECRET_KEY);
      return { success: false, error: "CAPTCHA verification failed. Please try again." };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedInput.email },
    });

    if (existingUser) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedInput.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedInput.name,
        email: validatedInput.email,
        password: hashedPassword,
      },
    });

    // Create default subscription (free tier)
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });

    // Create default polling config
    await prisma.pollingConfig.create({
      data: {
        userId: user.id,
        interval: "MONTHLY",
        emailEnabled: true,
        smsEnabled: false,
        status: "ACTIVE",
      },
    });

    // Generate email verification token
    const verificationToken = generateUrlSafeToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: validatedInput.email,
        token: verificationToken,
        expires,
      },
    });

    // Send verification email
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
    const emailContent = verificationEmail(validatedInput.name, verificationUrl);

    await sendEmail({
      ...emailContent,
      to: validatedInput.email,
    });

    return {
      success: true,
      message: "Please check your email to verify your account before signing in.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Sign up error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithCredentials(
  input: SignInInput
): Promise<AuthResult> {
  try {
    // Validate input
    const validatedInput = signInSchema.parse(input);

    const result = await signIn("credentials", {
      email: validatedInput.email,
      password: validatedInput.password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: "Invalid email or password" };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    // NextAuth throws an error for invalid credentials
    return { success: false, error: "Invalid email or password" };
  }
}

/**
 * Check if an account exists for the given email (for login UX only)
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return !!user;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { success: true };
    }

    // Generate reset token
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // TODO: Send password reset email
    // await sendPasswordResetEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    // Find token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return { success: false, error: "Invalid or expired reset token" };
    }

    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      });
      return { success: false, error: "Reset token has expired" };
    }

    // Validate new password
    const passwordSchema = z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/);
    passwordSchema.parse(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { password: hashedPassword },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Password does not meet requirements" };
    }
    console.error("Reset password error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
