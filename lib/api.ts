// lib/api.ts - FULL FINAL VERSION WITH AUTO-REDIRECT TO /add-details ON MISSING PROFILE

"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = "https://medify-service-production.up.railway.app";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

const createApiClient = (jwt?: string, router?: any) => ({
  async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...init.headers as Record<string, string>,
      };

      if (jwt) {
        headers.Authorization = `Bearer ${jwt}`;
      }

      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers,
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const message = data.message || data.error || `Request failed (${res.status})`;

        // Auto-redirect to add-details on missing profile errors
        if (
          res.status === 417 ||
          message.toLowerCase().includes("phone") ||
          message.toLowerCase().includes("dob") ||
          message.toLowerCase().includes("details") ||
          message.toLowerCase().includes("profile")
        ) {
          if (router) {
            router.push("/add-details");
          }
          return { error: "Redirecting to complete profile..." };
        }

        return { error: message };
      }

      let responseData: any = data;
      if (data && typeof data === "object") {
        if ("patients" in data) responseData = data.patients;
        else if ("doctors" in data) responseData = data.doctors;
        else if ("appointments" in data) responseData = data.appointments;
        else if ("slots" in data) responseData = data.slots;
        else if ("user" in data && !data.jwt) responseData = data.user;
      }

      return { data: responseData as T };
    } catch (err) {
      return { error: "Network error. Please check your connection." };
    }
  },

  async get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  },

  async post<T>(path: string, body: any) {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async put<T>(path: string, body: any) {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  },
});

export const api = createApiClient();

// Types
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  address?: string;
  height?: number | null;
  weight?: number | null;
  dob?: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  experience: number;
  degree: string;
  gender: "MALE" | "FEMALE";
  email: string;
  phone_number: string;
}

export interface Slot {
  id: number;
  doctor_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked?: number;
}

export interface Appointment {
  id: string;
  doctor_id?: number;
  patient_id?: string;
  slot_id?: number;
  doctor?: { name: string; specialization?: string };
  patient?: { name: string };
  slot?: {
    slot_date: string;
    start_time: string;
    end_time?: string;
  };
  status: string;
  reason: string;
  notes_internal?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  dob?: string;
  address?: string;
  role?: string;
}

// useApi hook with auto-redirect
export function useApi() {
  const { data: session } = useSession();
  const router = useRouter();
  const jwt = session?.jwt as string | undefined;

  return useMemo(() => {
    const client = createApiClient(jwt, router);

    return {
      getPatients: () => client.get<Patient[]>("/v1/patients"),
      createPatient: (body: any) => client.post<Patient>("/v1/patients", body),
      getAppointmentsForPatient: (patientId: string) =>
        client.get<Appointment[]>("/v1/appointments"),
      getAppointments: () => client.get<Appointment[]>("/v1/appointments/all"),
      getAppointmentsByDoctor: (doctorId?: number) => {
        const path = doctorId ? `/v1/appointments/doctor/${doctorId}` : "/v1/appointments/doctor";
        return client.get<Appointment[]>(path);
      },
      createAppointment: (body: any) => client.post<Appointment>("/v1/appointments", body),
      updateAppointmentStatus: (appointmentId: number, status: string) =>
        client.put<Appointment>(`/v1/appointments/${appointmentId}/status`, { status }),
      getDoctors: () => client.get<Doctor[]>("/v1/doctors"),
      addPhoneDob: (body: { phone: string; dob: string }) =>
        client.post("/v1/auth/create", body),
    };
  }, [jwt, router]);
}