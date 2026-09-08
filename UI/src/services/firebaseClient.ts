import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDx7dEwBCDfgtSgqNT_8hDiCTd4m_a-Jdw",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "molumulk-82e12.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "molumulk-82e12",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "molumulk-82e12.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "878591549071",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:878591549071:web:64297f98055f259caadafa",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FN0ZHTJEJ9",
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

export { firebaseAuth };

