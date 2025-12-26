// app/dashboard/doctors/[id]/slots/page.tsx
// FIXED VERSION - No TS error + works with string UUIDs

"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi, type Doctor, type Slot } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Calendar, Clock, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DoctorSlotsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const doctorId = resolvedParams.id; // string UUID from URL

  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const api = useApi();

  const user = session?.user;
  const authLoading = status === "loading";

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDoctorAndSlots();
    }
  }, [user, doctorId]);

  const fetchDoctorAndSlots = async () => {
    setLoading(true);

    // Fetch doctors list
    const doctorsResult = await api.getDoctors();
    if (!doctorsResult.data || !Array.isArray(doctorsResult.data)) {
      toast({
        title: "Error",
        description: "Failed to load doctors.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // FIX: Safe comparison - convert doctor.id to string for comparison
    const foundDoctor = doctorsResult.data.find((d: Doctor) => String(d.id) === doctorId);

    if (foundDoctor) {
      setDoctor(foundDoctor);
    } else {
      toast({
        title: "Doctor Not Found",
        description: "The doctor you're looking for doesn't exist.",
        variant: "destructive",
      });
      router.push("/dashboard/doctors");
      setLoading(false);
      return;
    }

    // Fetch slots via raw fetch
    try {
      const res = await fetch(
        `https://medify-service-production.up.railway.app/v1/doctors/slots?doctorId=${doctorId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.jwt}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const allSlots: Slot[] = data.slots || [];
        setSlots(allSlots);
      } else {
        toast({
          title: "Error",
          description: "Failed to load slots.",
          variant: "destructive",
        });
        setSlots([]);
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Server may be sleeping. Try again in 30 seconds.",
        variant: "destructive",
      });
      setSlots([]);
    }

    setLoading(false);
  };

  const handleBookSlot = (slotId: number) => {
    router.push(`/dashboard/book-appointment?doctor=${doctorId}&slot=${slotId}`);
  };

  const formatTime = (timeString: string) => {
    try {
      const parts = timeString.split(":");
      if (parts.length >= 2) {
        const hours = Number.parseInt(parts[0]);
        const minutes = parts[1];
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  const isSlotFull = (slot: Slot) => (slot.booked || 0) >= slot.capacity;

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Doctors
          </Button>
          {doctor && (
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{doctor.name.charAt(0)}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dr. {doctor.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {doctor.specialization} • {doctor.experience} years experience
                </p>
              </div>
            </div>
          )}
        </div>

        {slots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slots.map((slot) => {
              const isFull = isSlotFull(slot);
              return (
                <Card
                  key={slot.id}
                  className={`border-teal-100 transition-all ${
                    isFull ? "opacity-60" : "hover:shadow-xl"
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teal-600" />
                        {slot.slot_date}
                      </CardTitle>
                      {isFull && <Badge variant="destructive">Full</Badge>}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-muted-foreground">Available spots</span>
                      <span className="font-bold">
                        {slot.capacity - (slot.booked || 0)} / {slot.capacity}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleBookSlot(slot.id)}
                      disabled={isFull}
                      className="w-full"
                      size="lg"
                    >
                      {isFull ? "Slot Full" : "Book This Slot"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No slots available</h3>
              <p className="text-muted-foreground mt-2">
                Dr. {doctor?.name} has no available appointment slots right now.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}