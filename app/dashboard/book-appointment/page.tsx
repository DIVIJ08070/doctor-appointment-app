// Complete component with old payment logic
// app/dashboard/book-appointment/page.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, User, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useApi, type Doctor, type Patient, type Slot } from "@/lib/api";

// Generate a unique idempotency key
const generateIdempotencyKey = () => {
  return `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Parse response safely (from old code)
const tryParseJson = async (res: Response) => {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
};

// Post hidden form to PayU (from old code)
const postFormToUrl = (actionUrl: string, params: Record<string, any>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  Object.entries(params).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v == null ? '' : String(v);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 1500);
};

export default function BookAppointmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const api = useApi();

  const user = session?.user;
  const authLoading = status === "loading";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Payment states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [justBookedAppointment, setJustBookedAppointment] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Store full objects, not just string IDs
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Backend base URL
  const BACKEND_BASE_URL = "https://medify-service-production.up.railway.app";

  // Load patients and doctors
  const loadData = async () => {
    if (!user || !session?.jwt) return;

    setLoading(true);
    try {
      // Fetch patients
      const patientsRes = await fetch(
        `${BACKEND_BASE_URL}/v1/patients`,
        {
          headers: {
            Authorization: `Bearer ${session.jwt}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        const patientsList = patientsData.patients || [];
        setPatients(patientsList);
        
        // Auto-select first patient if only one exists
        if (patientsList.length === 1) {
          setSelectedPatient(patientsList[0]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load patients.",
          variant: "destructive",
        });
      }

      // Fetch doctors
      const doctorsRes = await fetch(
        `${BACKEND_BASE_URL}/v1/doctors`,
        {
          headers: {
            Authorization: `Bearer ${session.jwt}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (doctorsRes.ok) {
        const doctorsData = await doctorsRes.json();
        setDoctors(doctorsData.doctors || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load doctors.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Data load error:", err);
      toast({
        title: "Network Error",
        description: "Could not load required data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Pre-fill doctor from URL if coming from doctor page
  useEffect(() => {
    const doctorParam = searchParams.get("doctor");
    if (doctorParam && doctors.length > 0) {
      const doctor = doctors.find((d) => d.id.toString() === doctorParam);
      if (doctor) setSelectedDoctor(doctor);
    }
  }, [searchParams, doctors]);

  // Load all slots when doctor is selected
  useEffect(() => {
    if (!selectedDoctor) {
      setAllSlots([]);
      setFilteredSlots([]);
      setSelectedSlot(null);
      setSelectedDate(undefined);
      return;
    }

    const loadSlots = async () => {
      setSlotsLoading(true);
      setAllSlots([]);
      setFilteredSlots([]);
      setSelectedSlot(null);

      try {
        const res = await fetch(
          `${BACKEND_BASE_URL}/v1/doctors/slots?doctorId=${selectedDoctor.id}`,
          {
            headers: {
              Authorization: `Bearer ${session?.jwt}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const available = (data.slots || []).filter(
            (slot: Slot) => (slot.booked || 0) < (slot.capacity || 1)
          );

          setAllSlots(available);

          if (available.length === 0) {
            toast({
              title: "No availability",
              description: "This doctor has no open slots at the moment.",
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load slots. Please try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Slots fetch error:", err);
        toast({
          title: "Network Error",
          description: "Server might be slow. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setSlotsLoading(false);
      }
    };

    loadSlots();
  }, [selectedDoctor, session?.jwt, toast]);

  // Filter slots when user picks a date
  useEffect(() => {
    if (!selectedDate || !allSlots.length) {
      setFilteredSlots([]);
      setSelectedSlot(null);
      return;
    }

    const targetDate = format(selectedDate, "yyyy-MM-dd");
    const matching = allSlots.filter((slot) => slot.slot_date === targetDate);

    setFilteredSlots(matching);
    setSelectedSlot(null);

    if (matching.length === 0) {
      toast({
        title: "No slots available",
        description: "No open time slots on this date.",
      });
    }
  }, [selectedDate, allSlots, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !selectedDoctor || !selectedSlot || !selectedDate || !reason.trim()) {
      toast({
        title: "Missing fields",
        description: "Please select patient, doctor, date, slot and reason",
        variant: "destructive",
      });
      return;
    }

    // Final availability check
    if ((selectedSlot.booked || 0) >= selectedSlot.capacity) {
      toast({
        title: "Slot no longer available",
        description: "This time slot was taken. Please choose another.",
        variant: "destructive",
      });
      // Refresh slots
      if (selectedDoctor) {
        // Trigger reload by temporarily clearing and resetting doctor
        const doc = selectedDoctor;
        setSelectedDoctor(null);
        setTimeout(() => setSelectedDoctor(doc), 100);
      }
      return;
    }

    setSubmitting(true);

    try {
      // Create storage key for idempotency (from old code)
      const storageKey = `appt:${selectedPatient.id}:slot:${selectedSlot.id}:idempotencyKey`;
      let idempotencyKey = localStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'idemp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem(storageKey, idempotencyKey);
      }

      // Create appointment (from old code)
      const payload = {
        doctor_id: selectedDoctor.id,
        slot_id: selectedSlot.id,
        patient_id: selectedPatient.id,
        reason: reason.trim(),
        notes_internal: notes.trim() || undefined
      };

      const bookRes = await fetch(`${BACKEND_BASE_URL}/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.jwt}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      if (bookRes.ok) {
        const booked = await tryParseJson(bookRes);
        localStorage.removeItem(storageKey);

        // Create appointment object similar to old code
        const serverSlot = booked && booked.slot ? booked.slot : null;
        const serverDate = serverSlot?.slot_date || booked?.slot_date || booked?.date || null;

        // Normalize time strings like "02:00:00" -> "02:00"
        const normalizeTime = (t: string) => {
          if (!t) return null;
          return t.length >= 5 ? t.slice(0,5) : t;
        };

        const serverTime = (serverSlot && (serverSlot.start_time || serverSlot.end_time))
          ? `${normalizeTime(serverSlot.start_time)} - ${normalizeTime(serverSlot.end_time)}`
          : (booked?.time || booked?.slot_time || null);

        const appointmentObj = (booked && booked.id) ? booked : {
          id: (booked && booked.appointmentId) ? booked.appointmentId : null,
          doctor_id: selectedDoctor.id,
          slot_id: selectedSlot.id,
          patient_id: selectedPatient.id,
          // human-friendly date/time with fallbacks
          date: serverDate ? (
            // prefer server date in yyyy-mm-dd, convert to dd/mm/yyyy for display
            serverDate.includes('-') ? serverDate.split('-').reverse().join('/') : serverDate
          ) : (selectedDate ? format(selectedDate, "dd/MM/yyyy") : null),
          time: serverTime || (selectedSlot ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}` : null),
          raw: booked
        };

        setJustBookedAppointment(appointmentObj);
        setShowTermsModal(true);
        
      } else {
        const err = await tryParseJson(bookRes);
        localStorage.removeItem(storageKey);
        const message = (err && err.message) ? err.message : (typeof err === 'string' ? err : 'Booking failed');
        throw new Error(message);
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      
      if (err.message?.includes("duplicate") || err.message?.includes("idempotency")) {
        toast({
          title: "Duplicate Submission",
          description: "This appointment appears to have already been submitted. Please check your appointments.",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push("/dashboard/appointments");
        }, 3000);
      } else {
        toast({
          title: "Booking Failed",
          description: err.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // OLD PAYMENT LOGIC - using backend initiateTransaction endpoint
  const handleInitiatePayment = async () => {
    if (!justBookedAppointment || !justBookedAppointment.id) {
      setPaymentError("Appointment ID unavailable. Please contact support.");
      return;
    }
    setPaymentError(null);
    setPaymentLoading(true);

    try {
      // Call backend to initiate transaction (old logic)
      const res = await fetch(`${BACKEND_BASE_URL}/v1/payments/initiateTransaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.jwt}`,
          'appointment_id': justBookedAppointment.id.toString()
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const err = await tryParseJson(res);
        const msg = (err && err.message) ? err.message : `Payment initiation failed (HTTP ${res.status})`;
        setPaymentError(msg);
        setPaymentLoading(false);
        return;
      }

      const dto = await res.json();

      // Build PayU payload from backend DTO (must include server-generated hash)
      const payuPayload = {
        key: dto.key || '',
        txnid: dto.txnid || '',
        amount: dto.amount != null ? String(dto.amount) : '',
        productinfo: dto.productinfo || '',
        firstname: dto.firstname || '',
        email: dto.email || '',
        phone: dto.phone || '',
        udf1: dto.udf1 ?? '',
        udf2: dto.udf2 ?? '',
        udf3: dto.udf3 ?? '',
        udf4: dto.udf4 ?? '',
        udf5: dto.udf5 ?? '',
        hash: dto.hash || '',
        // success / failure redirect (optional overrides from backend)
        surl: dto.surl || `${window.location.origin}/payu/success`,
        furl: dto.furl || `${window.location.origin}/payu/failure`
      };

      // Validate
      if (!payuPayload.key || !payuPayload.txnid || !payuPayload.amount || !payuPayload.hash) {
        setPaymentError('Invalid payment response from server. Missing key/txnid/amount/hash.');
        setPaymentLoading(false);
        return;
      }

      // Submit to PayU
      postFormToUrl("https://test.payu.in/_payment", payuPayload);
      // navigation will occur; don't set loading false here
    } catch (err) {
      console.error('Payment initiation error', err);
      setPaymentError('Network error while initiating payment. Try again.');
      setPaymentLoading(false);
    }
  };

  // Pay later - Mark appointment as confirmed without payment
  const handlePayLater = async () => {
    if (!justBookedAppointment?.id) {
      setPaymentError("Appointment ID missing");
      return;
    }
    router.push("/dashboard/appointments");

  };

  const formatTime = (time: string) => time?.slice(0, 5) || "—";

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (bookingSuccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md border-teal-100 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-6">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Appointment Booked!</h3>
              <p className="text-muted-foreground mb-2">
                Your consultation has been successfully scheduled.
              </p>
              <p className="text-sm text-muted-foreground">Redirecting to your appointments...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (patients.length === 0) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto border-teal-100">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-16 h-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-bold mb-3">No Patients Registered</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              You need to add a patient profile before booking an appointment.
            </p>
            <Button
              onClick={() => router.push("/dashboard/patients")}
              className="bg-gradient-to-r from-teal-500 to-cyan-500"
            >
              Add Your First Patient
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Calculate price for display
  const calculatePrice = () => {
    const doctorExperience = selectedDoctor?.experience || 0;
    if (doctorExperience >= 10) return '100';
    if (doctorExperience >= 5) return '100';
    if (doctorExperience >= 2) return '100';
    return '500';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Book an Appointment</h1>
          <p className="text-muted-foreground mt-2">Fill in the details to schedule your visit</p>
        </div>

        <Card className="border-teal-100 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <CalendarIcon className="w-7 h-7 text-teal-600" />
              Appointment Form
            </CardTitle>
            <CardDescription>All fields marked with * are required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Select */}
              <div className="space-y-2">
                <Label htmlFor="patient">
                  Patient <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedPatient?.id}
                  onValueChange={(value) => {
                    const patient = patients.find((p) => p.id === value);
                    setSelectedPatient(patient || null);
                  }}
                  required
                >
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} ({patient.age} years, {patient.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Select */}
              <div className="space-y-2">
                <Label htmlFor="doctor">
                  Doctor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedDoctor?.id.toString()}
                  onValueChange={(value) => {
                    const doctor = doctors.find((d) => d.id.toString() === value);
                    setSelectedDoctor(doctor || null);
                  }}
                  required
                >
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.name} - {doctor.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Picker */}
              {selectedDoctor && (
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Time Slot Select - Only show when date is selected */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label htmlFor="slot">
                    Available Slot <span className="text-red-500">*</span>
                  </Label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="w-4 h-4" />
                      Loading slots...
                    </div>
                  ) : filteredSlots.length === 0 ? (
                    <div className="text-muted-foreground py-2">
                      No available slots on selected date
                    </div>
                  ) : (
                    <Select
                      value={selectedSlot?.id.toString()}
                      onValueChange={(value) => {
                        const slot = filteredSlots.find((s) => s.id.toString() === value);
                        setSelectedSlot(slot || null);
                      }}
                      required
                    >
                      <SelectTrigger id="slot">
                        <SelectValue placeholder="Choose a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id.toString()}>
                            <div className="flex items-center justify-between">
                              <span>
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-4">
                                {slot.capacity - (slot.booked || 0)} spots left
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Visit <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g., fever, check-up, follow-up, etc."
                  className="min-h-32"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any allergies, medications, or other info..."
                  className="min-h-24"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedPatient ||
                    !selectedDoctor ||
                    !selectedDate ||
                    !selectedSlot ||
                    !reason.trim()
                  }
                  className="flex-1 text-lg py-6 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                >
                  {submitting ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Creating Appointment...
                    </>
                  ) : (
                    "Book Appointment"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Terms & Payment Modal */}
      {showTermsModal && justBookedAppointment && (
        <AlertDialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                <Check className="w-6 h-6 text-teal-600" />
                Booking Confirmed
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg">
                Appointment ID: <strong>{justBookedAppointment.id || 'N/A'}</strong>
                <div className="mt-2">
                  {justBookedAppointment.date} • {justBookedAppointment.time}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  with Dr. {selectedDoctor?.name} - {selectedDoctor?.specialization}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              {/* Price Information */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Consultation Fee</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ₹{calculatePrice()}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Based on doctor's experience ({selectedDoctor?.experience || 0} years)
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
                <ul className="space-y-2 list-disc pl-5 text-sm text-gray-700">
                  <li>Slot times may change based on doctor's availability. We will inform you in advance where possible.</li>
                  <li>Cancellations must be done at least 12 hours before the appointment to be eligible for refund.</li>
                  <li>No refund will be provided for cancellations made within 12 hours of the appointment.</li>
                  <li>Please arrive 10 minutes early and carry valid ID and any prior reports.</li>
                  <li>By proceeding to payment you agree to our clinic policies.</li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  If you prefer not to pay now, you can pay at the clinic during your visit.
                </p>
              </div>

              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">{paymentError}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handlePayLater}
                  variant="outline"
                  className="flex-1 py-6"
                >
                  Pay at Clinic
                </Button>

                <Button
                  onClick={handleInitiatePayment}
                  disabled={paymentLoading}
                  className="flex-1 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {paymentLoading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Online Now
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <p><strong>Note:</strong> You will be redirected to PayU secure payment page.</p>
                <p className="text-green-600 font-medium">Using PayU Test Environment - No real money will be charged</p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowTermsModal(false)}>
                Close
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </DashboardLayout>
  );
}