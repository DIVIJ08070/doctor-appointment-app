// app/dashboard/page.tsx
// OPTIMIZED VERSION - Better Mobile View & Performance

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Clock, Users, CheckCircle, Activity, ArrowRight, Sparkles, Plus, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";
import { useApi, type Patient } from "@/lib/api";

interface Appointment {
  status: string;
}

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
  const [hasFetched, setHasFetched] = useState(false);

  const user = session?.user;
  const authLoading = status === "loading";

  // Memoized calculations
  const stats = useMemo(() => [
    { 
      label: "Total Patients", 
      value: patients.length, 
      icon: Users, 
      color: "text-teal-600", 
      bgColor: "from-white to-teal-50/30",
      borderColor: "border-teal-100"
    },
    { 
      label: "Upcoming", 
      value: upcomingCount, 
      icon: Clock, 
      color: "text-cyan-600", 
      bgColor: "from-white to-cyan-50/30",
      borderColor: "border-cyan-100"
    },
    { 
      label: "Completed", 
      value: completedCount, 
      icon: CheckCircle, 
      color: "text-green-600", 
      bgColor: "from-white to-green-50/30",
      borderColor: "border-green-100"
    },
    { 
      label: "Total Appointments", 
      value: totalAppointments, 
      icon: Calendar, 
      color: "text-blue-600", 
      bgColor: "from-white to-blue-50/30",
      borderColor: "border-blue-100"
    }
  ], [patients.length, upcomingCount, completedCount, totalAppointments]);

  // Single optimized fetch function
  const fetchDashboardData = useCallback(async () => {
    if (!session?.jwt || hasFetched) return;

    setLoading(true);
    try {
      // Parallel fetching for better performance
      const [patientsRes, appointmentsRes] = await Promise.allSettled([
        api.getPatients(),
        fetch(
          `https://medify-service-production.up.railway.app/v1/appointments/all?page=0&size=100&sort=slot.slotDate,desc`,
          {
            headers: {
              Authorization: `Bearer ${session.jwt}`,
            },
          }
        )
      ]);

      // Handle patients response
      if (patientsRes.status === 'fulfilled' && patientsRes.value.data) {
        setPatients(patientsRes.value.data);
      }

      // Handle appointments response
      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok) {
        const data = await appointmentsRes.value.json();
        const appointments: Appointment[] = data.content || [];
        
        const pending = appointments.filter(a => a.status.toUpperCase() === "PENDING").length;
        const confirmed = appointments.filter(a => a.status.toUpperCase() === "CONFIRMED").length;
        const completed = appointments.filter(a => a.status.toUpperCase() === "COMPLETED").length;

        setUpcomingCount(pending + confirmed);
        setCompletedCount(completed);
        setTotalAppointments(appointments.length);
      }

      setHasFetched(true);
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
  }, [session?.jwt, api, toast, hasFetched]);

  // Effect to redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Effect to fetch data only when needed
  useEffect(() => {
    if (user && session?.jwt && !hasFetched) {
      fetchDashboardData();
    }
  }, [user, session?.jwt, fetchDashboardData, hasFetched]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        {/* Mobile-Optimized Header */}
        <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name || "User"}!</h1>
                <p className="text-teal-100 text-sm mt-1">Manage your health journey</p>
              </div>
            </div>
            
            {/* Mobile-First Stats */}
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-xs text-teal-100">Patients</p>
                <p className="text-xl font-bold">{patients.length}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-xs text-teal-100">Upcoming</p>
                <p className="text-xl font-bold">{upcomingCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index}
                className={`border ${stat.borderColor} bg-gradient-to-br ${stat.bgColor} hover:shadow-lg transition-all duration-200 min-h-[100px]`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                      <span className="text-[10px] sm:text-xs font-medium text-gray-500">
                        {stat.label}
                      </span>
                    </div>
                    <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions - Mobile Optimized */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold px-1">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/dashboard/book-appointment">
              <Card className="border-teal-100 hover:shadow-lg transition-all duration-200 hover:border-teal-300 active:scale-[0.98] h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">Book Appointment</h3>
                        <p className="text-xs text-gray-500">Schedule consultation</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/patients">
              <Card className="border-teal-100 hover:shadow-lg transition-all duration-200 hover:border-teal-300 active:scale-[0.98] h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">Manage Patients</h3>
                        <p className="text-xs text-gray-500">Add or view patients</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/doctors">
              <Card className="border-teal-100 hover:shadow-lg transition-all duration-200 hover:border-teal-300 active:scale-[0.98] h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">Browse Doctors</h3>
                        <p className="text-xs text-gray-500">Find specialists</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Getting Started Section - Mobile First (Always visible) */}
        <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/30 mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Getting Started</CardTitle>
                <CardDescription className="text-sm">Follow these simple steps</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1">Add Patient Profile</h4>
                  <p className="text-sm text-gray-600">
                    Add yourself or family members as patients
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1">Find a Doctor</h4>
                  <p className="text-sm text-gray-600">
                    Browse specialists based on your needs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1">Book Appointment</h4>
                  <p className="text-sm text-gray-600">
                    Select time slot and confirm booking
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-teal-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 py-6"
                  asChild
                >
                  <Link href="/dashboard/patients">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Patient
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 py-6"
                  asChild
                >
                  <Link href="/dashboard/doctors">
                    Browse Doctors
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      
      </div>
    </DashboardLayout>
  );
}