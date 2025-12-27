"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getOrCreateFcmToken } from "@/lib/firebase-messaging";

export default function PushInitializer() {
  const { data: session } = useSession();

  useEffect(() => {
    console.log("PushInitializer mounted with session:", session);
    if (!session || sessionStorage.getItem('fcm_initialized')) return;

    const initializePush = async () => {
      const token = await getOrCreateFcmToken();
      console.log("FCM Token obtained:", token);
      if (!token) return;

      try {
        const payload = {
          token: token,
          device_type: 'web',
          app_version: '1.0.0',
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/v1/auth/upsert-fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.jwt}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          console.error("Failed to register fcm token with backend:", res.statusText);
          return;
        }

        sessionStorage.setItem('fcm_initialized', 'true');
      } catch(e) {
        console.error("Failed to register fcm token:", e);
      }

      console.log("Generated fcm token: "+ token);
    };

    initializePush();
  }, [session]);

  return null;
}