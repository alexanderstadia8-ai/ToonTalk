// ─────────────────────────────────────────────────────────────
//  TOONTALK – Firebase config
//  Incolla qui le tue credenziali da console.firebase.google.com
//  Progetto → Impostazioni → Le tue app → SDK config
// ─────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBNMW39IBCvg94lQ4wfXvF7W62cX8nzoR8",
  authDomain:        "toontalk-8f5f7.firebaseapp.com",
  projectId:         "toontalk-8f5f7",
  storageBucket:     "toontalk-8f5f7.firebasestorage.app",
  messagingSenderId: "207905698889",
  appId:             "1:207905698889:web:6a302ab14f87ca53e77b98",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
