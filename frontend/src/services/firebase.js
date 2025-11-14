// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration (converge-d547c project with Auth enabled)
const firebaseConfig = {
  apiKey: "AIzaSyB1bqAyPUbf65bg0QIjTCfep98jp4i86G8",
  authDomain: "converge-d547c.firebaseapp.com",
  projectId: "converge-d547c",
  storageBucket: "converge-d547c.firebasestorage.app",
  messagingSenderId: "613076096377",
  appId: "1:613076096377:web:4ac5a50ed224695751cba8",
  measurementId: "G-GR7HXNJX7W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
