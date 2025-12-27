"use client";

import { useEffect, useRef } from "react";
import { onForegroundMessage } from "@/lib/firebase-messaging";
import { toast } from '@/hooks/use-toast';

export default function ForegroundMessageListener() {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const setup = async () => {
      const unsubscribe = await onForegroundMessage(payload => {
        const { title, body, url } = payload.data || {};
        console.log("Foreground message received:", { title, body, url });
        
        toast({
        title: title || "Notification",
        description: body || "No description provided"
      });
        
      });
      unsubscribeRef.current = unsubscribe;
    };

    setup();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
    console.log("ForegroundMessageListener mounted");
  }, []);

  return null;
}
