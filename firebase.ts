import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDC31DdZCacgJq3xpr2TUwSrE1cHr60PsA",
  authDomain: "dosirak-56c2b.firebaseapp.com",
  projectId: "dosirak-56c2b",
  storageBucket: "dosirak-56c2b.firebasestorage.app",
  messagingSenderId: "617335214675",
  appId: "1:617335214675:web:01a117ab29ac11aceaaca6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);