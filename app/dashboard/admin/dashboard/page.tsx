// app/appointment/admin/dashboard/page.tsx
// FINAL VERSION - Redesigned to match your app's beautiful teal/cyan theme

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Doctor, Slot } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
      } else {
        console.error("Failed to fetch slots:", res.status);
        alert(`Failed to load slots (Error ${res.status}). Server waking up? Try again.`);
        setSlots([]);
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error — wait 30s and try again.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
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

  const addSlot = async (start: string, end: string) => {
    if (!selectedDoctor || !selectedDate) return;

    const apiDate = toApiDate(selectedDate);

    const payload = {
      doctor_id: selectedDoctor.id,
      time_slots: [
        {
          slot_date: apiDate,
          start_time: `${apiDate}:${start}`,
          end_time: `${apiDate}:${end}`,
          capacity: 30,
        },
      ],
    };

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
        alert("Slot added successfully!");
        fetchSlots(selectedDoctor.id, selectedDate);
      } else {
        const errorText = await res.text();
        alert("Failed to add slot: " + errorText);
      }
    } catch (err) {
      console.error("Network error adding slot:", err);
      alert("Network error — server might be waking up. Try again in 30 seconds.");
    }
  };

  const deleteSlot = async (slot: any) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;

    const slotId = slot.id || slot.slotId || slot.slot_id || slot.slotID;

    if (!slotId) {
      alert("Cannot delete this slot — ID not found.");
      console.error("Slot missing ID:", slot);
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
        alert("Slot deleted!");
        fetchSlots(selectedDoctor!.id, selectedDate);
      } else {
        const err = await res.text();
        alert("Failed: " + err);
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const makeUserAdmin = async () => {
    const email = makeAdminEmail.trim();
    if (!email) return alert("Please enter an email");

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
        alert(`${email} is now an ADMIN!`);
        setMakeAdminEmail("");
      } else {
        alert("Failed to make user admin");
      }
    } catch (err) {
      alert("Network error");
    }
  };

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
    <main className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50 p-4 md:p-8">
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

        {/* Make Admin Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border-4 border-dashed border-amber-400 shadow-xl">
            <h2 className="text-3xl font-bold text-center text-amber-900 mb-6">
              Make User Admin
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="user@gmail.com"
                value={makeAdminEmail}
                onChange={(e) => setMakeAdminEmail(e.target.value)}
                className="flex-1 px-6 py-4 border-4 border-amber-400 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-amber-300"
              />
              <button
                onClick={makeUserAdmin}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl transition shadow-lg"
              >
                Make Admin
              </button>
            </div>
          </div>
        </div>

        {/* Add Doctor Button */}
        <div className="text-center">
          <Link href="/dashboard/admin/dashboard/add-doctor">
            <button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-5 px-12 rounded-2xl shadow-2xl transition text-xl">
              + Add New Doctor
            </button>
          </Link>
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/admin/dashboard/doctor-appointments/${doctor.id}`);
                    }}
                    className="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition"
                  >
                    View All Appointments
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Slots Management */}
        {selectedDoctor && (
          <section className="bg-gradient-to-br from-teal-50 to-cyan-50 p-10 rounded-3xl shadow-2xl border border-teal-200">
            <h2 className="text-4xl font-bold text-center mb-10 text-teal-900">
              Dr. {selectedDoctor.name} - Slot Management
            </h2>

            <div className="max-w-md mx-auto mb-10">
              <label className="block text-lg font-medium text-gray-700 mb-3 text-center">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full px-6 py-4 border-4 border-teal-400 rounded-xl text-lg bg-white focus:outline-none focus:ring-4 focus:ring-teal-300 shadow-md"
              />
            </div>

            {selectedDate && (
              <>
                <div className="max-w-2xl mx-auto mb-10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const start = (form.elements.namedItem("start") as HTMLInputElement).value;
                      const end = (form.elements.namedItem("end") as HTMLInputElement).value;
                      if (!start || !end) return alert("Select time");
                      addSlot(start, end);
                      form.reset();
                    }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-6"
                  >
                    <input
                      type="time"
                      name="start"
                      required
                      className="px-6 py-4 border-2 border-teal-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-200"
                    />
                    <input
                      type="time"
                      name="end"
                      required
                      className="px-6 py-4 border-2 border-teal-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-200"
                    />
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition"
                    >
                      Add Slot
                    </button>
                  </form>
                </div>

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
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {slots.map((slot) => (
                      <div
                        key={slot.id ?? Math.random().toString()}
                        className="bg-gradient-to-br from-emerald-50 to-teal-50 border-4 border-emerald-500 rounded-3xl p-6 text-center relative shadow-2xl hover:shadow-3xl transition"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlot(slot);
                          }}
                          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full text-lg font-bold transition shadow-lg"
                          aria-label="Delete"
                        >
                          ×
                        </button>
                        <div className="text-sm text-gray-600 mb-2">{formatDisplayDate(selectedDate)}</div>
                        <div className="text-3xl font-black text-emerald-800">
                          {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                        </div>
                        <div className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold py-3 px-6 rounded-full shadow-md">
                          AVAILABLE ({slot.capacity ?? 30})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}