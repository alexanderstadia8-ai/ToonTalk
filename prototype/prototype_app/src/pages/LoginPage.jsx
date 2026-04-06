import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./LoginPage.css";

const IMG = {
  logo:     "/assets/ui/brand/logo.png",
  loginBtn: "/assets/ui/auth/btn_login.png",
  regBtn:   "/assets/ui/auth/btn_register.png",
  userBox:  "/assets/ui/auth/input_field.png",
  okBtn:    "/assets/ui/auth/btn_ok.png",
};

// Firebase usa email → costruiamo un'email fittizia dal username
const toEmail = (uid) => `${uid.toLowerCase().replace(/\s+/g, "_")}@toontalk.game`;

export default function LoginPage() {
  const [mode, setMode]                       = useState("login");
  const [userId, setUserId]                   = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [shake, setShake]                     = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleOk = async () => {
    setError("");

    // Validazione base
    if (!userId.trim())  { setError("Inserisci un User ID!");  triggerShake(); return; }
    if (userId.trim().length < 3) { setError("User ID troppo corto (min 3 caratteri)!"); triggerShake(); return; }
    if (!password)       { setError("Inserisci la Password!"); triggerShake(); return; }
    if (password.length < 6) { setError("Password troppo corta (min 6 caratteri)!"); triggerShake(); return; }
    if (mode === "register" && password !== confirmPassword) {
      setError("Le password non coincidono!"); triggerShake(); return;
    }

    setLoading(true);
    const email = toEmail(userId.trim());

    try {
      if (mode === "register") {
        // Crea account
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Imposta il displayName (nome visibile in chat)
        await updateProfile(user, { displayName: userId.trim() });

        // Salva profilo utente su Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid:       user.uid,
          username:  userId.trim(),
          email,
          createdAt: serverTimestamp(),
          online:    true,
        });

      } else {
        // Login normale
        await signInWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged in App.jsx gestisce il redirect automaticamente
    } catch (err) {
      const msg = {
        "auth/user-not-found":    "Utente non trovato. Registrati prima!",
        "auth/wrong-password":    "Password errata.",
        "auth/email-already-in-use": "Username già in uso, scegline un altro.",
        "auth/too-many-requests": "Troppi tentativi. Riprova tra poco.",
        "auth/network-request-failed": "Errore di rete. Controlla la connessione.",
      }[err.code] || `Errore: ${err.message}`;
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") handleOk(); };

  return (
    <div className="tt-bg">

      {/* Logo animato */}
      <div className="tt-logo-wrap">
        <img src={IMG.logo} alt="ToonTalk" className="tt-logo" />
      </div>

      {/* Pannello */}
      <div className={`tt-panel${shake ? " shake" : ""}`}>

        {/* Bottoni modalità */}
        <div className="tt-mode-btns">
          <button
            className={`tt-mode-btn${mode === "login" ? " active" : ""}`}
            onClick={() => switchMode("login")}
            disabled={loading}
          >
            <img src={IMG.loginBtn} alt="Login" />
          </button>
          <button
            className={`tt-mode-btn${mode === "register" ? " active" : ""}`}
            onClick={() => switchMode("register")}
            disabled={loading}
          >
            <img src={IMG.regBtn} alt="Registrazione" />
          </button>
        </div>

        {/* Campi */}
        <div className="tt-fields">
          <div className="tt-field">
            <img src={IMG.userBox} alt="" className="tt-box-bg" />
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              onKeyDown={onKey}
              placeholder="User ID..."
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="tt-field">
            <img src={IMG.userBox} alt="" className="tt-box-bg" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKey}
              placeholder="Password..."
              disabled={loading}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </div>
          {mode === "register" && (
            <div className="tt-field tt-field--slide">
              <img src={IMG.userBox} alt="" className="tt-box-bg" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={onKey}
                placeholder="Conferma password..."
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}
        </div>

        {/* Errore */}
        {error && <p className="tt-error">⚠️ {error}</p>}

        {/* OK */}
        <button className={`tt-ok-btn${loading ? " loading" : ""}`} onClick={handleOk} disabled={loading}>
          <img src={IMG.okBtn} alt="OK" />
          {loading && <span className="tt-spinner" />}
        </button>

      </div>

      <p className="tt-footer">© 2026 ToonTalk</p>
    </div>
  );
}
