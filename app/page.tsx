// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";  // ← Changed
import { Loader2 } from "lucide-react";       // or your Spinner

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  if (status === "authenticated") {
    return null; // Redirecting...
  }

  // Unauthenticated: Redirect to login or show landing
  return (
    <div className="min-h-screen flex items-center justify-center">
      <button
        onClick={() => router.push("/login")}
        className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
      >
        Go to Login
      </button>
    </div>
  );
}