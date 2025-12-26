// hooks/use-api.ts
"use client";

import { useSession } from "next-auth/react";

const BASE_URL = "https://medify-service-production.up.railway.app";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export function useApi() {
  const { data: session } = useSession();
  const jwt = session?.jwt as string | undefined;

  const get = async <T>(path: string): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.message || "Request failed" };
      }
      return { data };
    } catch (err) {
      return { error: "Network error" };
    }
  };

  const post = async <T>(path: string, body: any): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.message || "Request failed" };
      }
      return { data };
    } catch (err) {
      return { error: "Network error" };
    }
  };

  return { get, post };
}