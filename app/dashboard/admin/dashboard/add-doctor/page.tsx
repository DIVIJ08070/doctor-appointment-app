// app/dashboard/admin/add-doctor/page.tsx
// FINAL VERSION - Beautiful teal/cyan theme + correct admin check

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UserPlus, Shield } from "lucide-react";

export default function AddDoctorPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    degree: "",
    specialization: "",
    experience: "",
    gender: "MALE",
    phone_number: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // CORRECT ADMIN CHECK - using session.user.roles
  const userRoles = (session?.user as any)?.roles || [];
  const isAdmin = Array.isArray(userRoles)
    ? userRoles.some((r: string) => r.includes("ADMIN"))
    : false;

  // Redirect if not admin
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, router, isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.jwt) {
      alert("Authentication error. Please log in again.");
      return;
    }

    setSubmitting(true);

    const payload = {
      ...formData,
      experience: parseInt(formData.experience) || 0,
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/v1/doctors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Doctor added successfully!");
        router.push("/dashboard/admin/dashboard"); 
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to add doctor: ${err.message || res.statusText || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner className="w-10 h-10 text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  // Final admin check
  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Add New Doctor
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Register a new doctor to the Medify system
          </p>
        </div>

        <Card className="border-teal-100 shadow-2xl bg-gradient-to-br from-white to-teal-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-teal-900">
              Doctor Registration Form
            </CardTitle>
            <CardDescription className="text-lg">
              All fields marked with <span className="text-red-500">*</span> are required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Full Name */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name" className="text-lg font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. John Doe"
                    required
                    className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl"
                  />
                </div>

                {/* Email */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email" className="text-lg font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="doctor@example.com"
                    required
                    className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl"
                  />
                </div>

                {/* Degree */}
                <div className="space-y-2">
                  <Label htmlFor="degree" className="text-lg font-medium text-gray-700">
                    Medical Degree <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="degree"
                    name="degree"
                    type="text"
                    value={formData.degree}
                    onChange={handleChange}
                    placeholder="MBBS, MD, MS"
                    required
                    className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl"
                  />
                </div>

                {/* Specialization */}
                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-lg font-medium text-gray-700">
                    Specialization <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="specialization"
                    name="specialization"
                    type="text"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="Cardiology, Neurology, Pediatrics"
                    required
                    className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl"
                  />
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-lg font-medium text-gray-700">
                    Years of Experience <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="experience"
                    name="experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="10"
                    required
                    className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-lg font-medium text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.gender} onValueChange={handleGenderChange}>
                    <SelectTrigger id="gender" className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone Number */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="phone_number" className="text-lg font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    pattern="[0-9]{10}"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="9876543210"
                    required
                    className="h-14 px-5 py-3 text-lg border-2 border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/admin/dashboard")}
                  disabled={submitting}
                  className="flex-1 h-14 text-lg bg-white border-teal-200 hover:bg-teal-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-14 text-lg bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-lg"
                >
                  {submitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Saving Doctor...
                    </>
                  ) : (
                    "Save Doctor"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}