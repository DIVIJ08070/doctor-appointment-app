"use client";

import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { firebaseApp } from "./firebase";

const TOKEN_KEY = "fcm_token";

let messaging = null;

/**
 * Lazy-init messaging ONLY in browser
 */
const getMessagingInstance = async () => {
  if (typeof window === "undefined") return null;

  const supported = await isSupported();
  if (!supported) return null;

  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }

  return messaging;
};

export const getOrCreateFcmToken = async () => {
  if (typeof window === "undefined") return null;

  const cached = sessionStorage.getItem(TOKEN_KEY);
  if (cached) return cached;

  if (Notification.permission === "denied") return null;

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }

  const msg = await getMessagingInstance();
  if (!msg) return null;

  const token = await getToken(msg, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  return token;
};

export const onForegroundMessage = async cb => {
  const msg = await getMessagingInstance();
  if (!msg) return;
  console.log("Setting up onForegroundMessage listener");
  return onMessage(msg, cb);
};