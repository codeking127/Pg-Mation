import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCilH59Ugyw_54xJdWqMCGSd7jrheN3N1k",
    authDomain: "pg-data-8c54e.firebaseapp.com",
    projectId: "pg-data-8c54e",
    storageBucket: "pg-data-8c54e.firebasestorage.app",
    messagingSenderId: "1080346967596",
    appId: "1:1080346967596:web:dee9bc6d23e5b034155b89",
    measurementId: "G-M6LLQGDKZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
