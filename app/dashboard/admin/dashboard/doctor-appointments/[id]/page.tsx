// app/appointment/admin/doctor-appointments/[id]/page.tsx
// FULL FIXED VERSION - Status update with PUT + all TS errors fixed

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  CalendarCheck,
  MoreVertical,
  IndianRupee,
  Edit,
  UserCog,
  Phone,
  Stethoscope
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  slot?: {
    slot_date: string;
    start_time: string;
    end_time: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
  status: string;
  reason: string;
  price?: number;
  notes_internal?: string;
  created_at?: string;
}

interface ApiResponse {
  content: Appointment[];
  totalPages: number;
  totalElements: number;
  pageable?: {
    pageNumber: number;
  };
}

interface DoctorInfo {
  id: string;
  name: string;
  specialization: string;
  experience?: number;
  degree?: string;
}

interface SessionUser {
  roles?: string[];
  [key: string]: any;
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50">
    <Loader2 className="w-16 h-16 animate-spin text-teal-600" />
  </div>
);

export default function DoctorAppointments() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();

  const doctorId = params.id as string;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Admin check
  useEffect(() => {
    if (status === "authenticated") {
      const userRoles = (session?.user as SessionUser)?.roles || [];
      const isAdmin = Array.isArray(userRoles)
        ? userRoles.some((r: string) => r.includes("ADMIN"))
        : false;

      if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  const fetchDoctorInfo = async () => {
  if (!doctorId || !session?.jwt) return;

  try {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://medify-service-production.up.railway.app'}/v1/doctors/${doctorId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    });

    if (res.ok) {
      const data = await res.json();
      setDoctorInfo(data);
    } else {
      console.warn("Doctor info not available:", res.status);
      // Set fallback
      setDoctorInfo({
        id: doctorId,
        name: "Doctor",
        specialization: "General",
      });
    }
  } catch (error) {
    console.error("Error fetching doctor info:", error);
    setDoctorInfo({
      id: doctorId,
      name: "Doctor",
      specialization: "General",
    });
  }
};

  const fetchAppointments = async (pageNum = 0) => {
    if (!doctorId || !session?.jwt) return;

    setLoading(true);
    const url = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://medify-service-production.up.railway.app'}/v1/appointments/doctor/${doctorId}?page=${pageNum}&size=20&sort=slot.slotDate,desc&sort=slot.startTime,desc`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.jwt}` },
      });

      if (res.ok) {
        const data: ApiResponse = await res.json();
        setAppointments(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalAppointments(data.totalElements || 0);
        setPage(data.pageable?.pageNumber || 0);
      } else {
        setAppointments([]);
        if (res.status === 403) {
          router.push("/");
        } else if (res.status === 417) {
          router.push("/add-details");
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      setAppointments([]);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId && session?.jwt) {
      fetchDoctorInfo();
      fetchAppointments(0);
    }
  }, [doctorId, session]);

  const formatDate = (d: string) => (d ? d.split("-").reverse().join("/") : "-");
  const formatTime = (t: string) => (t ? t.slice(0, 5) : "-");
  
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "CONFIRMED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-300";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4 mr-1" />;
      case "CONFIRMED":
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4 mr-1" />;
      case "COMPLETED":
        return <CalendarCheck className="w-4 h-4 mr-1" />;
      default:
        return null;
    }
  };

  // FIXED: PUT request to update status
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
  if (!appointmentId || !session?.jwt) {
    toast({
      title: "Error",
      description: "Missing required information",
      variant: "destructive",
    });
    return;
  }

  setUpdatingStatus(appointmentId);

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
  if (!validStatuses.includes(newStatus)) {
    toast({
      title: "Invalid Status",
      description: "Please select a valid status",
      variant: "destructive",
    });
    setUpdatingStatus(null);
    return;
  }

  try {
    // EXACTLY LIKE POSTMAN
    const url = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://medify-service-production.up.railway.app'}/v1/appointments/status/${appointmentId}?status=${newStatus}`;

    const res = await fetch(url, {
      method: "PUT",  // PUT as in Postman
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
      // NO BODY — status is in query param
    });

    if (res.ok) {
      toast({
        title: "Success",
        description: `Appointment status updated to ${newStatus}`,
      });
      await fetchAppointments(page);
    } else {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to update status");
    }
  } catch (error: any) {
    console.error("Status update error:", error);
    toast({
      title: "Update Failed",
      description: error.message || "Server error. Try again.",
      variant: "destructive",
    });
  } finally {
    setUpdatingStatus(null);
  }
};

  // Status Change Dialog Component
  const StatusChangeDialog = ({ appointmentId, currentStatus }: { appointmentId: string; currentStatus: string }) => {
    const [open, setOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");

    const statusOptions = [
      { value: "PENDING", label: "Pending", color: "bg-amber-100 text-amber-800" },
      { value: "CONFIRMED", label: "Confirmed", color: "bg-emerald-100 text-emerald-800" },
      { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800" },
      { value: "COMPLETED", label: "Completed", color: "bg-blue-100 text-blue-800" },
    ];

    const handleStatusChange = async () => {
      if (!selectedStatus || selectedStatus === currentStatus) {
        setOpen(false);
        return;
      }

      await updateAppointmentStatus(appointmentId, selectedStatus);
      setOpen(false);
    };

    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Appointment Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new status for this appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid grid-cols-2 gap-2 py-4">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedStatus === option.value ? "default" : "outline"}
                className={`${option.color} ${
                  selectedStatus === option.value ? 'border-2 border-primary' : ''
                }`}
                onClick={() => setSelectedStatus(option.value)}
                disabled={option.value === currentStatus}
              >
                {option.label}
                {option.value === currentStatus && " (Current)"}
              </Button>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusChange}
              disabled={!selectedStatus || selectedStatus === currentStatus || updatingStatus === appointmentId}
            >
              {updatingStatus === appointmentId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  // Final admin check
  const userRoles = (session?.user as SessionUser)?.roles || [];
  const isAdmin = Array.isArray(userRoles)
    ? userRoles.some((r: string) => r.includes("ADMIN"))
    : false;

  if (!isAdmin) {
    router.push("/dashboard");
    return null;
  }

  // Statistics
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const totalRevenue = appointments.reduce((sum, appt) => sum + (appt.price || 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 py-6">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Doctor Appointments
            </h1>
            {doctorInfo && (
              <div className="flex items-center gap-3 mt-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-teal-900">
                    Dr. {doctorInfo.name}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stethoscope className="w-4 h-4" />
                    <span>{doctorInfo.specialization}</span>
                    {doctorInfo.experience && (
                      <span className="ml-2">• {doctorInfo.experience} years experience</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/appointment/admin/dashboard")}
              variant="outline"
              className="border-teal-300 hover:bg-teal-50"
            >
              ← Back to Admin Panel
            </Button>
            <Button
              onClick={() => fetchAppointments(page)}
              variant="outline"
              className="border-teal-300 hover:bg-teal-50"
            >
              <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-teal-200 bg-white">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-teal-700">{totalAppointments}</div>
              <div className="text-sm text-muted-foreground">Total Appointments</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-white">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-emerald-700">{confirmedCount}</div>
              <div className="text-sm text-muted-foreground">Confirmed</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-white">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-amber-700">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-white">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-blue-700">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="border-cyan-200 bg-white">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-cyan-700">₹{totalRevenue}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
        </div>

        {appointments.length === 0 ? (
          <Card className="border-dashed border-teal-300 bg-teal-50/30">
            <CardContent className="text-center py-20">
              <Calendar className="w-20 h-20 text-teal-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-teal-900 mb-3">
                No Appointments Found
              </h3>
              <p className="text-lg text-muted-foreground">
                This doctor has no booked appointments yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-teal-100 shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl text-teal-900">Appointments List</CardTitle>
                    <CardDescription>
                      Showing {appointments.length} of {totalAppointments} appointments
                      {totalAppointments > appointments.length && ` (Page ${page + 1} of ${totalPages})`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-teal-300 text-teal-700">
                    <User className="w-3 h-3 mr-1" />
                    Dr. {doctorInfo?.name || "Loading..."}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-teal-50 hover:bg-teal-50">
                        <TableHead className="font-semibold text-teal-900">Patient Info</TableHead>
                        <TableHead className="font-semibold text-teal-900">Date & Time</TableHead>
                        <TableHead className="font-semibold text-teal-900">Reason</TableHead>
                        <TableHead className="font-semibold text-teal-900">Status</TableHead>
                        <TableHead className="font-semibold text-teal-900">Amount</TableHead>
                        <TableHead className="font-semibold text-teal-900">Created</TableHead>
                        <TableHead className="font-semibold text-teal-900 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appt) => (
                        <TableRow key={appt.id} className="hover:bg-teal-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-teal-900">{appt.patient?.name || "Unknown"}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  {appt.patient?.phone && (
                                    <>
                                      <Phone className="w-3 h-3" />
                                      <span>{appt.patient.phone}</span>
                                    </>
                                  )}
                                  {appt.patient?.email && (
                                    <span className="ml-2">{appt.patient.email}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-teal-600" />
                                <span className="font-medium">{formatDate(appt.slot?.slot_date || "")}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-teal-600" />
                                <span>{formatTime(appt.slot?.start_time || "")} - {formatTime(appt.slot?.end_time || "")}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="font-medium text-teal-900 truncate">{appt.reason || "Not specified"}</p>
                              {appt.notes_internal && (
                                <p className="text-sm text-muted-foreground truncate" title={appt.notes_internal}>
                                  {appt.notes_internal}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(appt.status)} flex items-center w-fit`}>
                              {getStatusIcon(appt.status)}
                              {appt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <IndianRupee className="w-4 h-4 text-teal-600" />
                              <span className="font-bold text-teal-700">₹{appt.price || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(appt.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <StatusChangeDialog appointmentId={appt.id} currentStatus={appt.status} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0" disabled={updatingStatus === appt.id}>
                                    {updatingStatus === appt.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatus(appt.id, "CONFIRMED")}
                                    disabled={appt.status === "CONFIRMED"}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirm Appointment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatus(appt.id, "CANCELLED")}
                                    disabled={appt.status === "CANCELLED"}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Appointment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatus(appt.id, "COMPLETED")}
                                    disabled={appt.status === "COMPLETED"}
                                  >
                                    <CalendarCheck className="mr-2 h-4 w-4" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {appointments.length} appointments on page {page + 1} of {totalPages}
                <span className="ml-2 font-medium text-teal-700">(Total: {totalAppointments})</span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => fetchAppointments(page - 1)}
                  disabled={page === 0 || loading}
                  variant="outline"
                  className="border-teal-300 hover:bg-teal-50"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i;
                    if (totalPages > 5) {
                      if (page < 2) pageNum = i;
                      else if (page > totalPages - 3) pageNum = totalPages - 5 + i;
                      else pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => fetchAppointments(pageNum)}
                        variant={page === pageNum ? "default" : "outline"}
                        className={page === pageNum 
                          ? "bg-teal-600 text-white hover:bg-teal-700" 
                          : "border-teal-300 hover:bg-teal-50"}
                        size="sm"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => fetchAppointments(page + 1)}
                  disabled={page >= totalPages - 1 || loading}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}