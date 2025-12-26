// app/dashboard/doctors/page.tsx  (or wherever your doctors list route is)

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi, type Doctor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Stethoscope, Award, Clock, Search, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";

export default function DoctorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const api = useApi();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const user = session?.user;
  const authLoading = status === "loading";

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch doctors when logged in
  useEffect(() => {
    if (user) {
      fetchDoctors();
    }
  }, [user]);

  // Live search filter
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDoctors(filtered);
    }
  }, [searchQuery, doctors]);

  const fetchDoctors = async () => {
    setLoading(true);
    const result = await api.getDoctors();

    if (result.data && Array.isArray(result.data)) {
      setDoctors(result.data);
      setFilteredDoctors(result.data);
    } else {
      console.error("Failed to fetch doctors:", result.error);
      toast({
        title: "Error",
        description: result.error || "Failed to load doctors. Server might be waking up — try refreshing in 30 seconds.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleViewSlots = (doctorId: number) => {
    router.push(`/dashboard/doctors/${doctorId}/slots`);
  };

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
          <h1 className="text-3xl font-bold text-balance">Our Doctors</h1>
          <p className="text-muted-foreground mt-1">Find the right specialist for your needs</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-teal-100 focus-visible:ring-teal-500"
          />
        </div>

        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card
                key={doctor.id}
                className="border-teal-100 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-teal-50/40 overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl">Dr. {doctor.name}</CardTitle>
                      <CardDescription className="mt-1">{doctor.degree}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant="secondary" className="bg-teal-100 text-teal-800 hover:bg-teal-200">
                    {doctor.specialization}
                  </Badge>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{doctor.experience} years experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span className="capitalize">{doctor.gender.toLowerCase()}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleViewSlots(doctor.id)}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-medium"
                    size="lg"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    View Available Slots
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-teal-300 bg-teal-50/30">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Stethoscope className="w-16 h-16 text-teal-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No doctors found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? "No doctors match your search. Try a different name or specialization."
                  : "No doctors are currently available. Please check back later."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}