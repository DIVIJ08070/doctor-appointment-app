// app/dashboard/page.tsx
// FINAL VERSION - Real appointment stats + Getting Started always visible

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Clock, Users, CheckCircle, Activity, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";
import { useApi, type Patient } from "@/lib/api";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const api = useApi();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [loading, setLoading] = useState(true);

  const user = session?.user;
  const authLoading = status === "loading";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && session?.jwt) {
      fetchDashboardData();
    }
  }, [user, session?.jwt]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // 1. Fetch patients
      const patientsResult = await api.getPatients();
      if (patientsResult.data) {
        setPatients(patientsResult.data);
      }

      // 2. Fetch all appointments to count stats
      const allAppointments: any[] = [];
      let page = 0;
      const size = 20;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(
          `https://medify-service-production.up.railway.app/v1/appointments/all?page=${page}&size=${size}&sort=slot.slotDate,desc`,
          {
            headers: {
              Authorization: `Bearer ${session?.jwt}`,
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        allAppointments.push(...(data.content || []));
        hasMore = !data.last;
        page++;
      }

      const pending = allAppointments.filter(a => a.status.toUpperCase() === "PENDING").length;
      const confirmed = allAppointments.filter(a => a.status.toUpperCase() === "CONFIRMED").length;
      const completed = allAppointments.filter(a => a.status.toUpperCase() === "COMPLETED").length;

      setUpcomingCount(pending + confirmed);
      setCompletedCount(completed);
      setTotalAppointments(allAppointments.length);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast({
        title: "Error",
        description: "Could not load dashboard stats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
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
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-10 h-10" />
            <h1 className="text-3xl font-bold text-balance">Welcome back, {user.name || "User"}!</h1>
          </div>
          <p className="text-teal-50 text-lg">Manage your health appointments with ease</p>
        </div>

        {/* Stats Grid - Real numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/30 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Total Patients</CardDescription>
                <Users className="w-5 h-5 text-teal-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">{patients.length}</div>
            </CardContent>
          </Card>

          <Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50/30 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Upcoming</CardDescription>
                <Clock className="w-5 h-5 text-cyan-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-600">{upcomingCount}</div>
            </CardContent>
          </Card>

          <Card className="border-green-100 bg-gradient-to-br from-white to-green-50/30 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Completed</CardDescription>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/30 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Total Appointments</CardDescription>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalAppointments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-teal-100 hover:shadow-lg transition-all duration-200 group cursor-pointer">
            <Link href="/dashboard/book-appointment">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg mb-1">Book Appointment</CardTitle>
                    <CardDescription>Schedule a new consultation</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-teal-100 hover:shadow-lg transition-all duration-200 group cursor-pointer">
            <Link href="/dashboard/patients">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg mb-1">Manage Patients</CardTitle>
                    <CardDescription>View and add patients</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-teal-100 hover:shadow-lg transition-all duration-200 group cursor-pointer">
            <Link href="/dashboard/doctors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg mb-1">Browse Doctors</CardTitle>
                    <CardDescription>Find the right specialist</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Getting Started - Always Visible */}
        <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/30">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to book your first appointment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Add a Patient</h4>
                <p className="text-sm text-muted-foreground">
                  Start by adding yourself or a family member as a patient
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Browse Doctors</h4>
                <p className="text-sm text-muted-foreground">
                  Find a doctor that matches your needs by specialization
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Book Appointment</h4>
                <p className="text-sm text-muted-foreground">Select an available time slot and book your visit</p>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 mt-4" asChild>
              <Link href="/dashboard/patients">Get Started</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}