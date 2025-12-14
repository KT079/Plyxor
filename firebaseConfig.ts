import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvHL2-rOuXMZUDYW17sr_xT8VtNW4z_40",
  authDomain: "plyxor-4aea2.firebaseapp.com",
  projectId: "plyxor-4aea2",
  storageBucket: "plyxor-4aea2.firebasestorage.app",
  messagingSenderId: "304206955618",
  appId: "1:304206955618:web:b9814f6ee248ce9bf2fd3b",
  measurementId: "G-NE76YSN5QP"
};

let app;
let db: any = null;
let auth: any = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.warn("Firebase initialization failed. App will run in Demo Mode.", error);
}

export { db, auth };