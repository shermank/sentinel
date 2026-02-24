"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle, XCircle, Mail } from "lucide-react";

type VerificationStatus = "loading" | "pending" | "success" | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Shield className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold">Eternal Sentinel</span>
            </div>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}


function VerifyEmailContent() {
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const pending = searchParams.get("pending");

  useEffect(() => {
    if (pending === "true") {
      setStatus("pending");
      return;
    }

    if (!token) {
      setStatus("pending");
      return;
    }

    verifyEmail(token);
  }, [token, pending]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus("loading");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Verification failed");
      }
    } catch {
      setStatus("error");
      setErrorMessage("An unexpected error occurred");
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <CardHeader className="text-center">
              <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold">Eternal Sentinel</span>
              </Link>
              <CardTitle>Verifying Your Email</CardTitle>
              <CardDescription>Please wait while we verify your email address</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </CardContent>
          </>
        );

      case "pending":
        return (
          <>
            <CardHeader className="text-center">
              <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold">Eternal Sentinel</span>
              </Link>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>We&apos;ve sent you a verification link</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8 space-y-4">
              <Mail className="h-16 w-16 text-indigo-600" />
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Please check your email inbox and click the verification link to complete your registration.
                </p>
                <p className="text-sm text-muted-foreground">
                  The link will expire in 24 hours.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <Link href="/signup" className="text-indigo-600 hover:underline">
                  try signing up again
                </Link>
              </p>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </CardFooter>
          </>
        );

      case "success":
        return (
          <>
            <CardHeader className="text-center">
              <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold">Eternal Sentinel</span>
              </Link>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>Your account has been verified successfully</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-muted-foreground text-center">
                You will be redirected to the login page shortly.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link href="/login">
                <Button>Continue to Login</Button>
              </Link>
            </CardFooter>
          </>
        );

      case "error":
        return (
          <>
            <CardHeader className="text-center">
              <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold">Eternal Sentinel</span>
              </Link>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>We couldn&apos;t verify your email</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8 space-y-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-muted-foreground text-center">
                {errorMessage}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If your link has expired, you can{" "}
                <Link href="/signup" className="text-indigo-600 hover:underline">
                  sign up again
                </Link>{" "}
                to receive a new verification email.
              </p>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </CardFooter>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
}
