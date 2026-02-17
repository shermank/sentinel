"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle, XCircle } from "lucide-react";

type VerificationStatus = "loading" | "success" | "error";

export default function TrusteeVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Shield className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Eternal Sentinel</h1>
            <p className="text-slate-400 mt-2">Loading...</p>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mt-4" />
          </div>
        </div>
      </div>
    }>
      <TrusteeVerifyContent />
    </Suspense>
  );
}

function TrusteeVerifyContent() {
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch("/api/trustee/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setUserName(data.data?.userName || "the user");
        setMessage("Your email has been verified successfully!");
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-indigo-600 text-white p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Eternal Sentinel</h1>
          <p className="text-indigo-200">Trustee Verification</p>
        </div>

        <div className="p-8">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
              <p className="mt-4 text-slate-400">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-white">Verified!</h2>
              <p className="mt-2 text-slate-400">{message}</p>
              <p className="mt-4 text-sm text-slate-400">
                You are now registered as a trusted contact for <strong>{userName}</strong>.
                If they become unreachable, you may be granted access to their digital vault.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-white">Verification Failed</h2>
              <p className="mt-2 text-slate-400">{message}</p>
              <p className="mt-4 text-sm text-slate-400">
                The verification link may have expired or already been used.
                Please contact the person who added you as a trustee.
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 px-8 py-4 text-center">
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
            Learn more about Eternal Sentinel
          </Link>
        </div>
      </div>
    </div>
  );
}
