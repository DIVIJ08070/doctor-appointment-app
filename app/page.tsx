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

        router.push("/dashboard");

    } 
    else if (status === "unauthenticated")
      {

      router.push("/login");
      
    }
  }, [status, session, router]);

  // Show nothing while checking
  return null;
}