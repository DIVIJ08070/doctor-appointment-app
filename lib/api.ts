// lib/api.ts - FINAL 100% WORKING VERSION
"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

const BASE_URL = "https://medify-service-production.up.railway.app";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};



const createApiClient = (jwt?: string) => ({
  async get<T>(
    path: string,
    options: { headers?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (jwt) {
        headers.Authorization = `Bearer ${jwt}`;
      }

      const res = await fetch(`${BASE_URL}${path}`, {
        method: "GET",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || data.error || `Request failed (${res.status})` };
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
  async delete<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {};
    if (jwt) headers.Authorization = `Bearer ${jwt}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.message || data.error || `Delete failed (${res.status})` };
    }

    return { data: {} as T }; // or parse if backend returns something
  } catch (err) {
    return { error: "Network error. Please check your connection." };
  }
},

  async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || data.error || `Request failed (${res.status})` };
      }

      let responseData: any = data;
      if (data && typeof data === "object") {
        if ("patient" in data) responseData = data.patient;
        else if ("doctor" in data) responseData = data.doctor;
        else if ("appointment" in data) responseData = data.appointment;
        else if ("slot" in data) responseData = data.slot;
        else if ("user" in data && data.jwt) responseData = data;
      }

      return { data: responseData as T };
    } catch (err) {
      return { error: "Network error. Please check your connection." };
    }
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

// Helper functions
export const apiHelpers = {
  login: (body: { email: string; password: string }) =>
    api.post<{ jwt: string; user: User }>("/v1/auth", body),

  register: (body: { email: string; password: string; name: string }) =>
    api.post<{ jwt: string; user: User }>("/v1/auth", body),

  getPatients: (jwt?: string) => (jwt ? createApiClient(jwt) : api).get<Patient[]>("/v1/patients"),

  createPatient: (jwt: string, body: any) => createApiClient(jwt).post<Patient>("/v1/patients", body),

  getAppointmentsForPatient: (jwt: string, patientId: string) =>
    createApiClient(jwt).get<Appointment[]>("/v1/appointments", {
      headers: { patientId },
    }),

  getAppointments: (jwt?: string) => (jwt ? createApiClient(jwt) : api).get<Appointment[]>("/v1/appointments"),

  getAppointmentsByDoctor: (jwt: string, doctorId?: number) => {
    const path = doctorId ? `/v1/appointments/doctor/${doctorId}` : "/v1/appointments/doctor";
    return createApiClient(jwt).get<Appointment[]>(path);
  },

  getDoctors: (jwt?: string) => (jwt ? createApiClient(jwt) : api).get<Doctor[]>("/v1/doctors"),

  createAppointment: (jwt: string, body: any) => createApiClient(jwt).post<Appointment>("/v1/appointments", body),

  updateAppointmentStatus: (jwt: string, appointmentId: number, status: string) =>
    createApiClient(jwt).get<Appointment>(`/v1/appointments/update-status?id=${appointmentId}&status=${status}`),

  markPaymentSuccess: (jwt: string, appointmentId: number) =>
    createApiClient(jwt).get<Appointment>(`/v1/appointments/payment-success?id=${appointmentId}`),
};

// useApi hook - NOW INCLUDES getDoctors
export function useApi() {
  const { data: session } = useSession();
  const jwt = session?.jwt as string | undefined;

  return useMemo(() => {
    const client = createApiClient(jwt);

    return {
      ...client,
      getPatients: () => apiHelpers.getPatients(jwt),
      createPatient: (body: any) => apiHelpers.createPatient(jwt!, body),
      getAppointmentsForPatient: (patientId: string) =>
        apiHelpers.getAppointmentsForPatient(jwt!, patientId),
      getAppointments: () => apiHelpers.getAppointments(jwt),
      getAppointmentsByDoctor: (doctorId?: number) => apiHelpers.getAppointmentsByDoctor(jwt!, doctorId),
      createAppointment: (body: any) => apiHelpers.createAppointment(jwt!, body),
      updateAppointmentStatus: (appointmentId: number, status: string) =>
        apiHelpers.updateAppointmentStatus(jwt!, appointmentId, status),
      markPaymentSuccess: (appointmentId: number) => apiHelpers.markPaymentSuccess(jwt!, appointmentId),
      getDoctors: () => apiHelpers.getDoctors(jwt), 
      addPhoneDob: (body: { phone: string; dob: string }) => 
      client.post("/v1/auth", body),
    };
  }, [jwt]);
}