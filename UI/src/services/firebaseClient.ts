import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyBqmRu193t1w06320sl54Cw0oaYOdVaOII",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "propertio-1c039.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "propertio-1c039",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "propertio-1c039.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1077407810956",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:1077407810956:web:50e977936ef761b155c2a9",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-J26VFGHVW1",
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

export { firebaseAuth };

