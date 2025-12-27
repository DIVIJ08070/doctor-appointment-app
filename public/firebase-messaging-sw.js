importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAARhjsNuELaoxxEqXSG7Vn9o1jwGswoxY",
  authDomain: "medify-app-ea511.firebaseapp.com",
  projectId: "medify-app-ea511",
  storageBucket: "medify-app-ea511.firebasestorage.app",
  messagingSenderId: "131170519797",
  appId: "1:131170519797:web:ca9a5dd0533eefdea213bc",
  measurementId: "G-H1ZYT64DZY"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    console.log("Received background message ", payload);
  self.registration.showNotification(payload.data.title, {
    body: payload.data.body,
    data: { url: payload.data.url },
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});