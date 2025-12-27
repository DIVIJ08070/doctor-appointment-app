// app/dashboard/patients/page.tsx
// OPTIMIZED VERSION - Better Mobile & Performance WITH Floating Button

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Loader2, CheckCircle2, History, Calendar as CalendarIcon, Clock, User, Phone, MapPin, Plus, X, UserPlus } from "lucide-react";
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
  const [hasFetched, setHasFetched] = useState(false);

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
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
  });

  const user = session?.user;
  const authLoading = status === "loading";

  // Memoized patient stats
  const patientStats = useMemo(() => ({
    total: patients.length,
    hasPatients: patients.length > 0,
  }), [patients.length]);

  // Optimized fetch function
  const fetchPatients = useCallback(async () => {
    if (hasFetched) return;
    
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
    setHasFetched(true);
  }, [api, toast, showForm, hasFetched]);

  // Effect to redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Effect to fetch data only when needed
  useEffect(() => {
    if (user && !hasFetched) {
      fetchPatients();
    }
  }, [user, fetchPatients, hasFetched]);

  const handleChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

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
        gender: "MALE",
      });
      setShowForm(false);
      
      // Refresh patients list
      setHasFetched(false);
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

  const handleBookAppointment = useCallback((patientId: string | number) => {
    router.push(`/dashboard/book-appointment?patient=${patientId}`);
  }, [router]);

  // Fetch appointment history for a patient
  const fetchPatientHistory = useCallback(async (patient: Patient) => {
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
  }, [session?.jwt, toast]);

  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading patients...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24"> {/* Increased padding bottom for floating button */}
        {/* Success Banner */}
        {showSuccessMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-green-800">
                  Patient Added!
                </h3>
                <p className="text-green-700 text-sm">
                  New patient has been saved successfully
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-Optimized Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Patients</h1>
            </div>
            <p className="text-gray-600 text-sm">Manage patient profiles</p>
          </div>
          
          {/* Desktop Add Patient Button (hidden on mobile) */}
          {patientStats.hasPatients && !showForm && (
            <Button 
              onClick={() => setShowForm(true)} 
              size="lg"
              className="hidden sm:flex bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Patient
            </Button>
          )}
        </div>

        {/* Mobile-Optimized Form */}
        {showForm && (
          <Card className="border-teal-100 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Add New Patient</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>All fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      placeholder="John Doe"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleChange("gender", value)}
                    >
                      <SelectTrigger className="border-teal-200">
                        <SelectValue placeholder="Select gender" />
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
                      placeholder="123 Main Street, City"
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 py-6"
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                    className="flex-1 py-6"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Patients List - Mobile Optimized */}
        {patientStats.hasPatients && !showForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <Card
                key={patient.id}
                className="border-teal-100 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-teal-50/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{patient.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {patient.age} years • {patient.gender}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-teal-600" />
                      <span>{patient.phone || "No phone"}</span>
                    </div>

                    {patient.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        <span className="line-clamp-1">{patient.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Button
                      onClick={() => fetchPatientHistory(patient)}
                      variant="outline"
                      size="sm"
                      className="w-full border-teal-200 hover:bg-teal-50 text-xs h-9"
                    >
                      <History className="w-3 h-3 mr-1" />
                      History
                    </Button>

                    <Button
                      onClick={() => handleBookAppointment(patient.id)}
                      size="sm"
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-xs h-9"
                    >
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      Book
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State - Mobile Optimized */}
        {!showForm && !patientStats.hasPatients && !loading && (
          <Card className="border-dashed border-teal-300 bg-gradient-to-br from-teal-50/50 to-cyan-50/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-teal-900 mb-2">
                No patients yet
              </h3>
              <p className="text-gray-600 max-w-sm mb-6">
                Add your first patient to start booking appointments
              </p>
              <Button 
                onClick={() => setShowForm(true)} 
                size="lg"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 px-8"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Patient
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History Modal */}
        <Dialog open={!!selectedPatientForHistory} onOpenChange={() => setSelectedPatientForHistory(null)}>
          <DialogContent className="max-w-md sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">
                History - {selectedPatientForHistory?.name}
              </DialogTitle>
              <DialogDescription>
                All appointments for this patient
              </DialogDescription>
            </DialogHeader>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
              </div>
            ) : patientAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No appointments found
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {patientAppointments.map((apt) => (
                  <Card key={apt.id} className="border-teal-100">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-teal-600" />
                            <span className="font-medium">
                              {apt.slot.slot_date.split("-").reverse().join("/")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <span className="text-sm">
                              {apt.slot.start_time.slice(0, 5)} - {apt.slot.end_time.slice(0, 5)}
                            </span>
                          </div>
                        </div>
                        <Badge className={`px-3 py-1 text-xs ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </Badge>
                      </div>
                      <div className="pt-3 border-t border-teal-100">
                        <p className="text-sm">
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

        {/* FLOATING ADD BUTTON - Bottom Right Corner */}
        {!showForm && patientStats.hasPatients && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="group relative">
              {/* Floating Action Button */}
              <Button
                onClick={() => setShowForm(true)}
                size="lg"
                className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-xl hover:shadow-2xl transition-all duration-200"
              >
                <Plus className="h-6 w-6" />
              </Button>
              
              {/* Tooltip that shows on hover */}
              <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Add Patient</span>
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}