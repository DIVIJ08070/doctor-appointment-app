// app/add-details/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar,UserCog, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function AddDetailsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "https://medify-service-production.up.railway.app";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Convert YYYY-MM-DD to DD-MM-YYYY for API
  const formatDobForApi = (isoDate: string) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}-${month}-${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dob || !phone.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter both date of birth and phone number",
        variant: "destructive",
      });
      return;
    }

    const phoneNormalized = phone.replace(/\D/g, "");
    if (phoneNormalized.length < 10) {
      toast({
        title: "Invalid phone",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${backendBase}/v1/auth/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.jwt}`,
        },
        credentials: "include",
        body: JSON.stringify({
          dob: formatDobForApi(dob),
          phone: phoneNormalized,
        }),
      });

      if (res.ok) {
        // Mark profile as complete
        localStorage.setItem("profileCompleted", "true");

        toast({
          title: "Profile Completed!",
          description: "Welcome to Medify! Redirecting...",
        });

        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save details");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-teal-100 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center">
            <UserCog className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-teal-900">
            Complete Your Profile
          </CardTitle>
          <CardDescription className="text-lg">
            Just a couple of details to get started
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-base font-medium">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-teal-600" />
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={today}
                  required
                  className="pl-10 border-teal-200 focus:border-teal-500"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                We use this to calculate your age for appointments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base font-medium">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-teal-600" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="pl-10 border-teal-200 focus:border-teal-500"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Used for appointment reminders and doctor communication
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Your information is secure and private</p>
            <p className="mt-1">You can update it anytime in your profile settings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}