// app/login/page.tsx  ← SERVER COMPONENT (no "use client")

export const dynamic = "force-dynamic";  // ← This works here!

import LoginContent from "./LoginContent";

export default function LoginPage() {
  return <LoginContent />;
}