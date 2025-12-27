// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAARhjsNuELaoxxEqXSG7Vn9o1jwGswoxY",
  authDomain: "medify-app-ea511.firebaseapp.com",
  projectId: "medify-app-ea511",
  storageBucket: "medify-app-ea511.firebasestorage.app",
  messagingSenderId: "131170519797",
  appId: "1:131170519797:web:ca9a5dd0533eefdea213bc",
  measurementId: "G-H1ZYT64DZY"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);