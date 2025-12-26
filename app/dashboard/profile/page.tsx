// app/dashboard/profile/page.tsx
// FINAL VERSION - Clean profile page with phone & DOB update

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { User, Mail, Phone, Calendar, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const api = useApi();

  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const user = session?.user;
  const authLoading = status === "loading";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setPhone((user as any).phone_number || "");
      setDob((user as any).dob || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    // Validate DOB format DD-MM-YYYY
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dob.trim() || !dobRegex.test(dob.trim())) {
      toast({
        title: "Error",
        description: "Please enter date of birth in DD-MM-YYYY format (e.g., 11-03-2000)",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const result = await api.addPhoneDob({
      phone: phone.trim(),
      dob: dob.trim(),
    });

    if (result.data) {
      toast({
        title: "Success 🎉",
        description: "Your profile has been updated successfully!",
      });

      // Update session to reflect new data
      await updateSession();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update profile",
        variant: "destructive",
      });
    }

    setSubmitting(false);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">View and update your personal information</p>
        </div>

        {/* Profile Summary Card */}
        <Card className="border-teal-100 shadow-xl bg-gradient-to-br from-white to-teal-50/30">
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{user.name || "User"}</CardTitle>
                <CardDescription className="text-lg mt-1">{user.email}</CardDescription>
                {(user as any)?.role && (
                  <Badge className="mt-3 bg-teal-100 text-teal-800">
                    {(user as any).role.replace("ROLE_", "")}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-teal-100">
              <Mail className="w-6 h-6 text-teal-600" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            {(user as any)?.phone_number && (
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-teal-100">
                <Phone className="w-6 h-6 text-teal-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{(user as any).phone_number}</p>
                </div>
              </div>
            )}

            {(user as any)?.dob && (
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-teal-100">
                <Calendar className="w-6 h-6 text-teal-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{(user as any).dob}</p>
                </div>
              </div>
            )}

            {(user as any)?.role && (
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-teal-100">
                <Shield className="w-6 h-6 text-teal-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <Badge className="mt-1 bg-teal-100 text-teal-800">
                    {(user as any).role.replace("ROLE_", "")}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Contact Info */}
        <Card className="border-teal-100 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Update Contact Information</CardTitle>
            <CardDescription>
              Add or update your phone number and date of birth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="7203979619"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  pattern="[0-9]{10}"
                  className="border-teal-200 focus:border-teal-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth * (DD-MM-YYYY)</Label>
                <Input
                  id="dob"
                  type="text"
                  placeholder="11-03-2000"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  pattern="\d{2}-\d{2}-\d{4}"
                  className="border-teal-200 focus:border-teal-500"
                />
                <p className="text-xs text-muted-foreground">
                  Example: 11-03-2000 for 11 March 2000
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}