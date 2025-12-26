// app/dashboard/appointments/page.tsx
// FINAL VERSION - No doctor name, clean and simple

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Clock, User, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  name: string;
}

interface Slot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
}

interface Appointment {
  id: string;
  status: string;
  reason: string;
  slot: Slot;
  patient: Patient;
}

export default function AppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "upcoming" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");

  const user = session?.user;
  const authLoading = status === "loading";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch all appointments using the paginated /all endpoint
  useEffect(() => {
    if (user && session?.jwt) {
      const fetchAllAppointments = async () => {
        setLoading(true);
        const allAppointments: Appointment[] = [];

        let page = 0;
        const size = 20;
        let hasMore = true;

        try {
          while (hasMore) {
            const res = await fetch(
              `https://medify-service-production.up.railway.app/v1/appointments/all?page=${page}&size=${size}&sort=slot.slotDate,desc&sort=slot.startTime,desc`,
              {
                headers: {
                  Authorization: `Bearer ${session.jwt}`,
                },
              }
            );

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              toast({
                title: "Error",
                description: err.message || "Failed to load appointments",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            const data = await res.json();
            allAppointments.push(...(data.content || []));
            hasMore = !data.last;
            page++;
          }

          // Sort newest first (just in case)
          allAppointments.sort((a, b) => {
            const dateA = a.slot.slot_date || "";
            const dateB = b.slot.slot_date || "";
            return dateB.localeCompare(dateA);
          });

          setAppointments(allAppointments);
        } catch (err) {
          console.error("Error loading appointments:", err);
          toast({
            title: "Network Error",
            description: "Could not load appointments. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      fetchAllAppointments();
    }
  }, [user, session?.jwt, toast]);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "CONFIRMED":
        return "bg-teal-100 text-teal-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const statusUpper = apt.status.toUpperCase();
    if (filter === "all") return true;
    if (filter === "upcoming") return ["PENDING", "CONFIRMED"].includes(statusUpper);
    return statusUpper === filter.toUpperCase();
  });

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all appointments ({appointments.length} total)
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {(["all", "upcoming", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              size="sm"
              className={
                filter === f
                  ? "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                  : "border-teal-200"
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Appointments List */}
        {filteredAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className="border-teal-100 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-teal-50/20"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <User className="w-5 h-5 text-teal-600" />
                      {appointment.patient.name}
                    </CardTitle>
                    <Badge className={`font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    <span className="font-medium">
                      {appointment.slot.slot_date.replace(/-/g, "/")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <span>
                      {appointment.slot.start_time.slice(0, 5)} - {appointment.slot.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-teal-100">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-teal-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Reason:</p>
                        <p className="text-muted-foreground text-sm mt-1">
                          {appointment.reason || "Not specified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-teal-300 bg-teal-50/30">
            <CardContent className="text-center py-16">
              <Calendar className="w-16 h-16 text-teal-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3">No appointments found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {filter === "all"
                  ? "You haven't booked any appointments yet. Let's find a doctor!"
                  : `No ${filter} appointments at the moment.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}