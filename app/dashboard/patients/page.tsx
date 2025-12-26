// app/dashboard/patients/page.tsx
// FINAL VERSION - With "View History" modal for each patient

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api";
import type { Patient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, History, Calendar as CalendarIcon, Clock } from "lucide-react";
import { User, Phone, MapPin, Calendar, Plus, Ruler, Weight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Appointment {
  id: string;
  status: string;
  reason: string;
  slot: {
    slot_date: string;
    start_time: string;
    end_time: string;
  };
}

export default function PatientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const api = useApi();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // History modal state
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    age: "",
    dob: "",
    phone_number: "",
    weight: "",
    height: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
  });

  const user = session?.user;
  const authLoading = status === "loading";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
    setLoading(true);
    const result = await api.getPatients();
    if (result.data) {
      setPatients(result.data);
      if (result.data.length === 0 && !showForm) {
        setShowForm(true);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formatDate = (dateStr: string): string | null => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim() || undefined,
      age: formData.age ? Number.parseInt(formData.age) : null,
      dob: formatDate(formData.dob),
      phone_number: formData.phone_number.trim(),
      weight: formData.weight ? Number.parseFloat(formData.weight) : null,
      height: formData.height ? Number.parseFloat(formData.height) : null,
      gender: formData.gender,
    };

    const result = await api.createPatient(payload);

    setShowForm(false);
    setFormData({
      name: "",
      address: "",
      age: "",
      dob: "",
      phone_number: "",
      weight: "",
      height: "",
      gender: "MALE",
    });

    if (result.data) {
      toast({
        title: "Success 🎉",
        description: `${payload.name} has been added successfully!`,
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 4000);

      fetchPatients();
    }

    setSubmitting(false);
  };

  const handleBookAppointment = (patientId: number) => {
    router.push(`/dashboard/book-appointment?patient=${patientId}`);
  };

  // Fetch appointment history for a patient
  const fetchPatientHistory = async (patient: Patient) => {
    setHistoryLoading(true);
    setSelectedPatientForHistory(patient);

    try {
      const res = await fetch(`https://medify-service-production.up.railway.app/v1/appointments`, {
        headers: {
          Authorization: `Bearer ${session?.jwt}`,
          patientId: patient.id.toString(),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const appointments = Array.isArray(data) ? data : data.appointments || [];
        setPatientAppointments(appointments);
      } else {
        toast({
          title: "Error",
          description: "Failed to load appointment history",
          variant: "destructive",
        });
        setPatientAppointments([]);
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Could not load history",
        variant: "destructive",
      });
      setPatientAppointments([]);
    } finally {
      setHistoryLoading(false);
    }
  };

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
      <div className="space-y-6">
        {/* Success Banner */}
        {showSuccessMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-md">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  Patient Added Successfully!
                </h3>
                <p className="text-green-700">
                  The new patient has been saved and will appear in the list below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Patients</h1>
            <p className="text-muted-foreground mt-1">Manage your patient profiles</p>
          </div>
          {patients.length > 0 && !showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-teal-500 to-cyan-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          )}
        </div>

        {/* Add Patient Form */}
        {showForm && (
          <Card className="border-teal-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Add New Patient</CardTitle>
              <CardDescription>All fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Your form fields unchanged */}
                {/* ... (same as before) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ... all your inputs ... */}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Patient...
                      </>
                    ) : (
                      "Add Patient"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Patients List */}
        {patients.length > 0 && !showForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <Card
                key={patient.id}
                className="border-teal-100 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-white to-teal-50/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{patient.name}</CardTitle>
                        <CardDescription>
                          {patient.age} years • {patient.gender}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone || "Not provided"}</span>
                  </div>

                  {patient.address ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{patient.address}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
                      <MapPin className="w-4 h-4" />
                      <span className="italic">No address provided</span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => fetchPatientHistory(patient)}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <History className="w-4 h-4 mr-2" />
                      View History
                    </Button>

                    <Button
                      onClick={() => handleBookAppointment(patient.id)}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                      size="sm"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!showForm && patients.length === 0 && !loading && (
          <Card className="border-dashed border-teal-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No patients yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first patient to start booking appointments
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-teal-500 to-cyan-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History Modal */}
        <Dialog open={!!selectedPatientForHistory} onOpenChange={() => setSelectedPatientForHistory(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Appointment History - {selectedPatientForHistory?.name}
              </DialogTitle>
              <DialogDescription>
                All past and upcoming appointments
              </DialogDescription>
            </DialogHeader>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : patientAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No appointments found for this patient
              </p>
            ) : (
              <div className="space-y-4 mt-4">
                {patientAppointments.map((apt) => (
                  <Card key={apt.id} className="border-teal-100">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4" />
                            <span className="font-medium">
                              {apt.slot.slot_date.replace(/-/g, "/")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>
                              {apt.slot.start_time.slice(0, 5)} - {apt.slot.end_time.slice(0, 5)}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>
                          {apt.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Reason:</span> {apt.reason || "Not specified"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}