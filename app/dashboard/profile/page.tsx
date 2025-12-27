// app/dashboard/profile/page.tsx
// OPTIMIZED VERSION - Better Rendering Performance

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, User, Mail, Phone, Calendar, Users, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";
import { useApi, type Patient, type Appointment } from "@/lib/api";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const api = useApi();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const user = session?.user;
  const authLoading = status === "loading";

  // Memoized user data
  const userData = useMemo(() => ({
    name: user?.name || "User",
    email: user?.email || "",
    role: (user as any)?.role ? (user as any).role.replace("ROLE_", "").toUpperCase() : null,
    phone: (user as any)?.phone_number || null,
    dob: (user as any)?.dob || null,
  }), [user]);

  // Optimized fetch function
  const loadProfileData = useCallback(async () => {
    if (hasFetched) return;
    
    setLoading(true);
    try {
      const [patientsRes, appointmentsRes] = await Promise.all([
        api.getPatients(),
        api.getAppointments(),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (appointmentsRes.data) {
        const sorted = (appointmentsRes.data as Appointment[])
          .sort((a, b) => new Date(b.slot?.slot_date || "").getTime() - new Date(a.slot?.slot_date || "").getTime());
        setRecentAppointments(sorted.slice(0, 5));
      }
      setHasFetched(true);
    } catch (err) {
      console.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [api, hasFetched]);

  // Effect to redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Effect to fetch data only when needed
  useEffect(() => {
    if (user && !hasFetched) {
      loadProfileData();
    }
  }, [user, loadProfileData, hasFetched]);

  // Memoized UI sections
  const profileInfoItems = useMemo(() => [
    {
      key: 'email',
      icon: Mail,
      label: "Email",
      value: userData.email,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
      show: true
    },
    {
      key: 'phone',
      icon: Phone,
      label: "Phone",
      value: userData.phone,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
      show: !!userData.phone
    },
    {
      key: 'dob',
      icon: Calendar,
      label: "Date of Birth",
      value: userData.dob,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
      show: !!userData.dob
    }
  ], [userData]);

  const shouldShowRecentAppointments = recentAppointments.length > 0;
  const shouldShowPatientsList = patients.length > 0;
  const shouldShowEmptyState = patients.length === 0 && recentAppointments.length === 0;

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 py-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your account overview and activity
          </p>
        </div>

        {/* Main Profile Card */}
        <Card className="border-teal-100 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 h-32"></div>
          <CardContent className="-mt-16 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
              <div className="w-32 h-32 rounded-full bg-white p-2 shadow-2xl">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <User className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-3xl font-bold text-teal-900">{userData.name}</h2>
                <p className="text-xl text-teal-700">{userData.email}</p>
                {userData.role && (
                  <Badge className="mt-3 text-lg px-4 py-1 bg-teal-100 text-teal-800">
                    {userData.role}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              {profileInfoItems.map((item) => item.show && (
                <div key={item.key} className="bg-white p-5 rounded-xl border border-teal-100 shadow">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="font-semibold">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        {shouldShowRecentAppointments && (
          <Card className="border-teal-100">
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
              <CardDescription>Your latest bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAppointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 bg-teal-50/50 rounded-lg border border-teal-100">
                    <div className="flex items-center gap-4">
                      <CalendarIcon className="w-8 h-8 text-teal-600" />
                      <div>
                        <p className="font-semibold">
                          Dr. {appt.doctor?.name || "Unknown"} - {appt.doctor?.specialization || ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appt.slot?.slot_date?.split("-").reverse().join("/")} • {appt.slot?.start_time?.slice(0,5)} - {appt.slot?.end_time?.slice(0,5)}
                        </p>
                      </div>
                    </div>
                    <Badge className={appt.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {appt.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button asChild variant="outline" className="border-teal-300 hover:bg-teal-50">
                  <Link href="/dashboard/appointments">View All Appointments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patients List */}
        {shouldShowPatientsList && (
          <Card className="border-teal-100">
            <CardHeader>
              <CardTitle>Registered Patients</CardTitle>
              <CardDescription>People you can book appointments for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.map((patient) => (
                  <div key={patient.id} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-teal-100">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Age: {patient.age} • {patient.gender}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {shouldShowEmptyState && (
          <Card className="border-dashed border-teal-300 bg-teal-50/30">
            <CardContent className="text-center py-16">
              <User className="w-20 h-20 text-teal-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-teal-900 mb-3">
                Your profile is ready
              </h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Start by adding a patient and booking your first appointment
              </p>
              <div className="mt-8 flex gap-4 justify-center">
                <Button asChild className="bg-gradient-to-r from-teal-500 to-cyan-600">
                  <Link href="/dashboard/patients">Add Patient</Link>
                </Button>
                <Button asChild variant="outline" className="border-teal-300">
                  <Link href="/dashboard/doctors">Browse Doctors</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Your information is secure and used only for appointment management.</p>
          <p className="mt-1">Contact support for any changes to your account details.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}