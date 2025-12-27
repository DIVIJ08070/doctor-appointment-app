// app/appointment/admin/dashboard/page.tsx
// FINAL VERSION - Scrolls to added slot section after creation

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Doctor, Slot } from "@/lib/api";
import { Loader2, UserPlus, Plus, Calendar, Clock, X, CheckCircle, ArrowDown } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50">
    <Loader2 className="w-16 h-16 animate-spin text-teal-600" />
  </div>
);

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [makeAdminEmail, setMakeAdminEmail] = useState("");
  const [showMakeAdmin, setShowMakeAdmin] = useState(false);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    startTime: "",
    endTime: "",
    capacity: 30,
    date: ""
  });
  const [justAddedSlot, setJustAddedSlot] = useState(false);
  const [highlightNewSlot, setHighlightNewSlot] = useState(false);

  // Refs for scrolling
  const slotsSectionRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Protect route - using session.user.roles
  useEffect(() => {
    if (status === "authenticated") {
      const userRoles = (session?.user as any)?.roles || [];
      const isAdmin = Array.isArray(userRoles)
        ? userRoles.some((r: string) => r.includes("ADMIN"))
        : false;

      if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  // Fetch doctors
  useEffect(() => {
    if (status === "authenticated") {
      const userRoles = (session?.user as any)?.roles || [];
      const isAdmin = Array.isArray(userRoles)
        ? userRoles.some((r: string) => r.includes("ADMIN"))
        : false;

      if (isAdmin) {
        const fetchDoctors = async () => {
          setLoading(true);
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/v1/doctors`,
              {
                headers: { Authorization: `Bearer ${session?.jwt}` },
              }
            );
            if (res.ok) {
              const data = await res.json();
              setDoctors(data.doctors || []);
            }
          } catch (error) {
            console.error("Failed to fetch doctors:", error);
          } finally {
            setLoading(false);
          }
        };
        fetchDoctors();
      }
    }
  }, [status, session]);

  const toApiDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const fetchSlots = async (doctorId: number, date: string) => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    setSlots([]);

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
        const filtered = allSlots.filter((slot) => slot.slot_date === date);
        setSlots(filtered);
        
        // If we just added a slot and it's the same date, highlight it
        if (justAddedSlot && selectedDate === date) {
          setTimeout(() => {
            setHighlightNewSlot(true);
            // Remove highlight after 3 seconds
            setTimeout(() => setHighlightNewSlot(false), 3000);
          }, 100);
        }
      } else {
        console.error("Failed to fetch slots:", res.status);
        toast.error(`Failed to load slots (Error ${res.status})`);
        setSlots([]);
      }
    } catch (err) {
      console.error("Network error:", err);
      toast.error("Network error — please try again");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
      setJustAddedSlot(false);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDate("");
    setSlots([]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (selectedDoctor && date) {
      fetchSlots(selectedDoctor.id, date);
    } else {
      setSlots([]);
    }
  };

  const handleAddSlotClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    // Pre-fill with today's date
    const today = new Date().toISOString().split('T')[0];
    setSlotForm({
      startTime: "",
      endTime: "",
      capacity: 30,
      date: today
    });
    setShowAddSlotModal(true);
  };

  const scrollToSlotsSection = () => {
    if (slotsSectionRef.current) {
      slotsSectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const addSlot = async () => {
    if (!selectedDoctor) return;
    
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) {
      toast.error("Please fill all required fields");
      return;
    }

    if (slotForm.startTime >= slotForm.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    const apiDate = toApiDate(slotForm.date);

    const payload = {
      doctor_id: selectedDoctor.id,
      time_slots: [
        {
          slot_date: apiDate,
          start_time: `${apiDate}:${slotForm.startTime}`,
          end_time: `${apiDate}:${slotForm.endTime}`,
          capacity: slotForm.capacity,
        },
      ],
    };

    const loadingToast = toast.loading("Adding slot...");
    setJustAddedSlot(true);

    try {
      const res = await fetch("https://medify-service-production.up.railway.app/v1/doctors/slots", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(
          `Slot added successfully for Dr. ${selectedDoctor.name} on ${formatDisplayDate(slotForm.date)}`,
          {
            duration: 4000,
            icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          }
        );
        
        // Reset form and close modal
        setSlotForm({
          startTime: "",
          endTime: "",
          capacity: 30,
          date: ""
        });
        setShowAddSlotModal(false);
        
        // If doctor is already selected, set the date to the one we just added slot for
        if (selectedDoctor) {
          setSelectedDate(slotForm.date);
          
          // Auto-select the doctor if not already selected
          if (!selectedDoctor || selectedDoctor.id !== selectedDoctor.id) {
            setSelectedDoctor(selectedDoctor);
          }
          
          // Fetch slots and then scroll to them
          setTimeout(() => {
            fetchSlots(selectedDoctor.id, slotForm.date);
            // Scroll to slots section after a brief delay
            setTimeout(scrollToSlotsSection, 300);
          }, 500);
        }
      } else {
        const errorText = await res.text();
        toast.dismiss(loadingToast);
        toast.error(`Failed to add slot: ${errorText}`);
        setJustAddedSlot(false);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error("Network error adding slot:", err);
      toast.error("Network error — please try again");
      setJustAddedSlot(false);
    }
  };

  const deleteSlot = async (slot: any) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;

    const slotId = slot.id || slot.slotId || slot.slot_id || slot.slotID;

    if (!slotId) {
      toast.error("Cannot delete this slot — ID not found.");
      return;
    }

    try {
      const res = await fetch(`https://medify-service-production.up.railway.app/v1/doctors/slots/${slotId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.jwt}`,
        },
      });

      if (res.ok) {
        toast.success("Slot deleted successfully!");
        if (selectedDoctor && selectedDate) {
          fetchSlots(selectedDoctor.id, selectedDate);
        }
      } else {
        const err = await res.text();
        toast.error(`Failed: ${err}`);
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const makeUserAdmin = async () => {
    const email = makeAdminEmail.trim();
    if (!email) return toast.error("Please enter an email");

    try {
      const res = await fetch(
        `https://medify-service-production.up.railway.app/v1/auth/make-admin`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.jwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (res.ok) {
        toast.success(`${email} is now an ADMIN!`);
        setMakeAdminEmail("");
        setShowMakeAdmin(false);
      } else {
        toast.error("Failed to make user admin");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  // Scroll to date input when doctor is selected
  useEffect(() => {
    if (selectedDoctor && slotsSectionRef.current) {
      setTimeout(() => {
        slotsSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [selectedDoctor]);

  if (status === "loading" || loading) return <LoadingSpinner />;

  const userRoles = (session?.user as any)?.roles || [];
  const isAdmin = Array.isArray(userRoles)
    ? userRoles.some((r: string) => r.includes("ADMIN"))
    : false;

  if (!isAdmin) {
    router.push("/dashboard");
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50 p-4 md:p-8 pb-32">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center py-12">
          <h1 className="text-5xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-lg text-muted-foreground mt-4">
            Manage doctors, slots, and system users
          </p>
        </div>

        {/* Doctors Grid */}
        <section>
          <h2 className="text-4xl font-bold text-center mb-10 text-gray-800">
            Select Doctor to Manage Slots
          </h2>

          {doctors.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-2xl text-gray-600">No doctors registered yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  onClick={() => handleDoctorSelect(doctor)}
                  className={`
                    p-8 rounded-3xl border-4 cursor-pointer transition-all duration-300 shadow-xl
                    ${selectedDoctor?.id === doctor.id
                      ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 scale-105"
                      : "border-gray-200 bg-white hover:shadow-2xl hover:border-teal-300"
                    }
                  `}
                >
                  <h3 className="text-2xl font-bold text-teal-900">Dr. {doctor.name}</h3>
                  <p className="text-lg text-gray-700 mt-2">{doctor.specialization}</p>
                  <p className="text-sm text-gray-500 mt-4">{doctor.experience} years experience</p>

                  <div className="mt-8 space-y-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/admin/dashboard/doctor-appointments/${doctor.id}`);
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition"
                    >
                      View Appointments
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSlotClick(doctor);
                      }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Slots Management Section - With ref for scrolling */}
        {selectedDoctor && (
          <section 
            ref={slotsSectionRef}
            className="bg-gradient-to-br from-teal-50 to-cyan-50 p-10 rounded-3xl shadow-2xl border border-teal-200 scroll-mt-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-bold text-teal-900">
                Dr. {selectedDoctor.name} - Slot Management
              </h2>
              {!selectedDate && (
                <div className="flex items-center gap-2 text-teal-700 bg-teal-100 px-4 py-2 rounded-full">
                  <ArrowDown className="w-4 h-4 animate-bounce" />
                  <span className="text-sm font-medium">Select date below to view slots</span>
                </div>
              )}
            </div>

            <div className="max-w-md mx-auto mb-10">
              <label className="block text-lg font-medium text-gray-700 mb-3 text-center">
                Select Date to View/Delete Slots
              </label>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-6 py-4 border-4 border-teal-400 rounded-xl text-lg bg-white focus:outline-none focus:ring-4 focus:ring-teal-300 shadow-md"
              />
            </div>

            {selectedDate && (
              <>
                {slotsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto" />
                    <p className="mt-4 text-teal-900 text-xl">Loading slots...</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl shadow-xl">
                    <p className="text-2xl font-semibold text-gray-700">
                      No slots available on {formatDisplayDate(selectedDate)}
                    </p>
                    <p className="text-gray-600 mt-4">
                      Use the "Add Slot" button on the doctor card to create new slots
                    </p>
                    <button
                      onClick={() => handleAddSlotClick(selectedDoctor)}
                      className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add Slot for This Date
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-teal-800">
                        Slots for {formatDisplayDate(selectedDate)}
                        <span className="ml-4 text-lg font-normal text-teal-600">
                          ({slots.length} slot{slots.length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      {highlightNewSlot && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full animate-pulse">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">New slot added!</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                      {slots.map((slot, index) => (
                        <div
                          key={slot.id ?? Math.random().toString()}
                          className={`
                            bg-gradient-to-br from-emerald-50 to-teal-50 border-4 rounded-3xl p-6 text-center relative shadow-2xl hover:shadow-3xl transition-all duration-500
                            ${highlightNewSlot && index === slots.length - 1 
                              ? 'border-yellow-500 animate-pulse shadow-[0_0_30px_rgba(245,158,11,0.5)]' 
                              : 'border-emerald-500'
                            }
                          `}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSlot(slot);
                            }}
                            className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full text-lg font-bold transition shadow-lg"
                            aria-label="Delete"
                          >
                            <X className="w-5 h-5 mx-auto" />
                          </button>
                          <div className="text-sm text-gray-600 mb-2">{formatDisplayDate(selectedDate)}</div>
                          <div className="text-3xl font-black text-emerald-800">
                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                          </div>
                          <div className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold py-3 px-6 rounded-full shadow-md">
                            AVAILABLE ({slot.capacity ?? 30})
                          </div>
                          {highlightNewSlot && index === slots.length - 1 && (
                            <div className="mt-2 text-xs text-amber-600 font-bold animate-pulse">
                              NEWLY ADDED
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Add More Slots Button */}
                    <div className="text-center mt-10">
                      <button
                        onClick={() => handleAddSlotClick(selectedDoctor)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl transition shadow-lg flex items-center justify-center gap-2 mx-auto"
                      >
                        <Plus className="w-5 h-5" />
                        Add More Slots for Dr. {selectedDoctor.name}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* Bottom Action Buttons */}
        <div className="pt-8 mt-12 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Make Admin Button Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border-4 border-dashed border-amber-400 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                  <UserPlus className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-amber-900">Make User Admin</h3>
                <p className="text-gray-600 mt-2">Grant admin privileges to users</p>
              </div>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="user@gmail.com"
                  value={makeAdminEmail}
                  onChange={(e) => setMakeAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-amber-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  onClick={makeUserAdmin}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition shadow-lg"
                >
                  Make Admin
                </button>
              </div>
            </div>

            {/* Add Doctor Button Card */}
            <Link href="/dashboard/admin/dashboard/add-doctor" className="block">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-3xl border-4 border-dashed border-emerald-400 shadow-xl hover:shadow-2xl transition-shadow h-full flex flex-col items-center justify-center cursor-pointer">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
                  <Plus className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-900 text-center">Add New Doctor</h3>
                <p className="text-gray-600 mt-2 text-center">Register a new doctor to the system</p>
                <button className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl transition w-full">
                  + Add Doctor
                </button>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
        {/* Floating Make Admin Button */}
        <button
          onClick={() => setShowMakeAdmin(true)}
          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold p-5 rounded-full shadow-2xl transition-transform hover:scale-110 group relative"
          title="Make User Admin"
        >
          <UserPlus className="w-6 h-6" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-red-600 text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-medium shadow-lg">
            Make Admin
          </span>
        </button>

        {/* Floating Add Doctor Button */}
        <Link href="/dashboard/admin/dashboard/add-doctor">
          <button
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold p-5 rounded-full shadow-2xl transition-transform hover:scale-110 group relative"
            title="Add New Doctor"
          >
            <Plus className="w-6 h-6" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-medium shadow-lg">
              Add Doctor
            </span>
          </button>
        </Link>
        
        {/* Scroll to Top Button (when slots are visible) */}
        {selectedDoctor && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold p-5 rounded-full shadow-2xl transition-transform hover:scale-110"
            title="Scroll to Top"
          >
            ↑
          </button>
        )}
      </div>

      {/* Make Admin Modal */}
      {showMakeAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-red-900">Make User Admin</h3>
              <button
                onClick={() => {
                  setShowMakeAdmin(false);
                  setMakeAdminEmail("");
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <input
                type="email"
                placeholder="user@gmail.com"
                value={makeAdminEmail}
                onChange={(e) => setMakeAdminEmail(e.target.value)}
                className="w-full px-6 py-4 border-4 border-red-400 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-red-300"
              />
              <div className="flex gap-4">
                <button
                  onClick={makeUserAdmin}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition shadow-lg"
                >
                  Make Admin
                </button>
                <button
                  onClick={() => {
                    setShowMakeAdmin(false);
                    setMakeAdminEmail("");
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddSlotModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-teal-900">Add New Slot</h3>
                <p className="text-gray-600 mt-1">For Dr. {selectedDoctor.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddSlotModal(false);
                  setSlotForm({
                    startTime: "",
                    endTime: "",
                    capacity: 30,
                    date: ""
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Doctor Info */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-teal-900">Dr. {selectedDoctor.name}</h4>
                    <p className="text-sm text-gray-600">{selectedDoctor.specialization}</p>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Select Date *
                </label>
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm({...slotForm, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-500"
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-2" />
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({...slotForm, startTime: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-2" />
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({...slotForm, endTime: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Capacity
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={slotForm.capacity}
                    onChange={(e) => setSlotForm({...slotForm, capacity: parseInt(e.target.value)})}
                    className="flex-1 h-2 bg-teal-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-2xl font-bold text-teal-600 min-w-[50px] text-center">
                    {slotForm.capacity}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Maximum patients for this slot</p>
              </div>

              {/* Summary */}
              {slotForm.date && slotForm.startTime && slotForm.endTime && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                  <h4 className="font-bold text-emerald-900 mb-2">Slot Summary</h4>
                  <p className="text-sm text-gray-700">
                    {formatDisplayDate(slotForm.date)} | {slotForm.startTime} - {slotForm.endTime}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Capacity: {slotForm.capacity} patients
                  </p>
                  <p className="text-xs text-teal-600 mt-2 font-medium">
                    ✓ You'll be automatically taken to view this slot after creation
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={addSlot}
                  disabled={!slotForm.date || !slotForm.startTime || !slotForm.endTime}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Slot & View
                </button>
                <button
                  onClick={() => {
                    setShowAddSlotModal(false);
                    setSlotForm({
                      startTime: "",
                      endTime: "",
                      capacity: 30,
                      date: ""
                    });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}