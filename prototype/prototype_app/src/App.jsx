import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import LoginPage from "./pages/LoginPage";
import RoomPage  from "./pages/RoomPage";

export default function App() {
  // null = caricamento, false = non loggato, oggetto = loggato
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Firebase notifica in automatico se l'utente è già loggato
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? false);
    });
    return unsub; // cleanup
  }, []);

  // Schermata di caricamento iniziale
  if (user === null) {
    return (
      <div style={{
        height: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#fff", fontSize: 24, color: "#ff9900",
        fontWeight: 800, fontStyle: "italic", letterSpacing: 2,
      }}>
        ToonTalk...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <RoomPage user={user} />;
}
