// app/dashboard/patients/page.tsx
// FINAL VERSION - Height & Weight Save Correctly (Always Send Keys)

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
  phone_number: formData.phone_number.trim(),
  gender: formData.gender,
  address: formData.address.trim() || null,
  dob: formData.dob ? formatDate(formData.dob) : null,
  age: formData.age.trim() ? Number.parseInt(formData.age.trim(), 10) : null,
  height: formData.height.trim() ? Number.parseFloat(formData.height.trim()) : null,
  weight: formData.weight.trim() ? Number.parseFloat(formData.weight.trim()) : null,
};

    const result = await api.createPatient(payload);

    if (result.data) {
      toast({
        title: "Success 🎉",
        description: `${payload.name} has been added successfully!`,
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 4000);

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
      setShowForm(false);
      fetchPatients();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add patient",
        variant: "destructive",
      });
    }

    setSubmitting(false);
  };

  const handleBookAppointment = (patientId: string | number) => {
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
      <div className="space-y-6 pb-8">
        {/* Success Banner */}
        {showSuccessMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-lg">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-green-800">
                  Patient Added Successfully!
                </h3>
                <p className="text-green-700 mt-1">
                  The new patient has been saved and will appear in the list below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Patients</h1>
            <p className="text-muted-foreground mt-1">Manage your patient profiles</p>
          </div>
          {patients.length > 0 && !showForm && (
            <Button 
              onClick={() => setShowForm(true)} 
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Patient
            </Button>
          )}
        </div>

        {/* FULL Add Patient Form */}
        {showForm && (
          <Card className="border-teal-100 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Add New Patient</CardTitle>
              <CardDescription>All fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      placeholder="Pat t3"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => handleChange("phone_number", e.target.value)}
                      required
                      placeholder="7203979619"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleChange("dob", e.target.value)}
                      required
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleChange("age", e.target.value)}
                      required
                      placeholder="30"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleChange("gender", value)}
                    >
                      <SelectTrigger className="border-teal-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      required
                      placeholder="Saitan gali, Hawa mahal"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => handleChange("height", e.target.value)}
                      placeholder="170"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => handleChange("weight", e.target.value)}
                      placeholder="66"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-lg py-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <Card
                key={patient.id}
                className="border-teal-100 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-teal-50/30 overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{patient.name}</CardTitle>
                        <CardDescription className="text-base">
                          {patient.age} years • {patient.gender}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="w-5 h-5 text-teal-600" />
                      <span className="text-base">{patient.phone || "Not provided"}</span>
                    </div>

                    {patient.address ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="w-5 h-5 text-teal-600" />
                        <span className="text-base">{patient.address}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground/60">
                        <MapPin className="w-5 h-5" />
                        <span className="text-base italic">No address</span>
                      </div>
                    )}

                    {(patient.height || patient.weight) && (
                      <div className="flex gap-6 text-sm">
                        {patient.height && (
                          <div className="flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-teal-600" />
                            <span>{patient.height} cm</span>
                          </div>
                        )}
                        {patient.weight && (
                          <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4 text-teal-600" />
                            <span>{patient.weight} kg</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button
                      onClick={() => fetchPatientHistory(patient)}
                      variant="outline"
                      className="w-full border-teal-300 hover:bg-teal-50"
                    >
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Button>

                    <Button
                      onClick={() => handleBookAppointment(patient.id)}
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
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
          <Card className="border-dashed border-teal-300 bg-teal-50/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <User className="w-24 h-24 text-teal-400 mb-6" />
              <h3 className="text-2xl font-bold text-teal-900 mb-3">
                No patients yet
              </h3>
              <p className="text-lg text-muted-foreground max-w-md mb-8">
                Add your first patient to start booking appointments
              </p>
              <Button 
                onClick={() => setShowForm(true)} 
                size="lg"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-lg px-8 py-6"
              >
                <Plus className="w-6 h-6 mr-3" />
                Add Your First Patient
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History Modal */}
        <Dialog open={!!selectedPatientForHistory} onOpenChange={() => setSelectedPatientForHistory(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Appointment History - {selectedPatientForHistory?.name}
              </DialogTitle>
              <DialogDescription className="text-base">
                All past and upcoming appointments
              </DialogDescription>
            </DialogHeader>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
              </div>
            ) : patientAppointments.length === 0 ? (
              <div className="text-center py-16">
                <CalendarIcon className="w-16 h-16 text-teal-400 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  No appointments found for this patient
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {patientAppointments.map((apt) => (
                  <Card key={apt.id} className="border-teal-100 hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <CalendarIcon className="w-5 h-5 text-teal-600" />
                            <span className="font-semibold text-lg">
                              {apt.slot.slot_date.split("-").reverse().join("/")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-teal-600" />
                            <span className="text-base">
                              {apt.slot.start_time.slice(0, 5)} - {apt.slot.end_time.slice(0, 5)}
                            </span>
                          </div>
                        </div>
                        <Badge className={`text-base px-4 py-1 ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </Badge>
                      </div>
                      <div className="pt-4 border-t border-teal-100">
                        <p className="text-muted-foreground">
                          <span className="font-medium">Reason:</span> {apt.reason || "Not specified"}
                        </p>
                      </div>
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