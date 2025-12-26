// app/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // Check if user has completed profile
      const profileCompleted = localStorage.getItem("profileCompleted");

      if (profileCompleted === "true") {
        router.push("/dashboard");
      } else {
        router.push("/add-details");
      }
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, session, router]);

  // Show nothing while checking
  return null;
}