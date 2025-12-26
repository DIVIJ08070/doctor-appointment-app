// app/login/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity } from "lucide-react";

// ← THIS MUST BE AFTER "use client" and imports
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4">
      <Card className="w-full max-w-md border-teal-100 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Medify</CardTitle>
          <CardDescription className="text-base">
            Sign in with your Google account to manage your appointments
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              Authentication failed. Please try again.
            </div>
          )}

          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 6.5c1.54 0 2.92.56 4.02 1.64l3.01-3.01C16.46 2.62 14.06 1.5 12 1.5c-4.3 0-8.01 2.47-9.82 6.07l3.66 2.84C6.71 7.93 9.14 6.5 12 6.5z" />
            </svg>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}