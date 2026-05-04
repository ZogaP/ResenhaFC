import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5L-ErxdpZLm-nhPNqyfEN4UX0o1sVPEQ",
  authDomain: "futebol-7593e.firebaseapp.com",
  projectId: "futebol-7593e",
  storageBucket: "futebol-7593e.firebasestorage.app",
  messagingSenderId: "121417480379",
  appId: "1:121417480379:web:31bc216716fab2b095d19e",
  measurementId: "G-06HYF864XE"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
