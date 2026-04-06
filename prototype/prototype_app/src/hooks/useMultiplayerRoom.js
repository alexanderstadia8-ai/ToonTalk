import { useEffect, useRef, useCallback, useState } from "react";
import {
  doc, setDoc, deleteDoc,
  collection, onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const THROTTLE_MS = 80; // scrivi su Firestore max ogni 80ms
const HEARTBEAT_INTERVAL_MS = 2000; // invia heartbeat ogni 2 secondi per mantenere la presenza

/**
 * Gestisce la presenza e la posizione multiplayer nella stanza.
 * - Registra il giocatore locale quando monta
 * - Rimuove quando smonta (o chiude il tab)
 * - Ascolta tutti i giocatori in tempo reale
 * - Disconnette automaticamente i giocatori inattivi (nessun heartbeat per timeoutMs)
 * - Mantiene un heartbeat continuo per segnalare la propria presenza
 * - Ritorna { players, updatePosition }
 */
export function useMultiplayerRoom(user, roomId = "lobby", onPlayersChange, timeoutMs = 5000) {
  const lastWriteRef = useRef(0);
  const pendingRef   = useRef(null);
  const playerDocRef = useRef(null);
  const [players, setPlayers] = useState({});

  // Riferimento documento del giocatore locale
  useEffect(() => {
    if (!user) return;
    playerDocRef.current = doc(db, "rooms", roomId, "players", user.uid);
  }, [user, roomId]);

  // Registra il giocatore e rimuovilo al cleanup
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "rooms", roomId, "players", user.uid);

    setDoc(ref, {
      uid:       user.uid,
      username:  user.displayName || user.email.split("@")[0],
      x:         100,
      y:         40,
      facing:    "right",
      walking:   false,
      joinedAt:  serverTimestamp(),
      lastUpdate: Date.now(),
    });

    // Cleanup: rimuovi il giocatore quando lascia
    const cleanup = () => deleteDoc(ref);
    window.addEventListener("beforeunload", cleanup);

    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [user, roomId]);

  // Heartbeat periodico per mantenere la presenza attiva
  useEffect(() => {
    if (!user || !playerDocRef.current) return;
    
    const heartbeat = () => {
      setDoc(playerDocRef.current, { lastUpdate: Date.now() }, { merge: true });
    };
    
    // Invia subito un heartbeat
    heartbeat();
    
    // Poi continua ogni HEARTBEAT_INTERVAL_MS
    const intervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    
    return () => clearInterval(intervalId);
  }, [user, roomId]);

  // Ascolta tutti i giocatori nella stanza in tempo reale e disconnette quelli inattivi
  useEffect(() => {
    if (!user) return;
    const playersCol = collection(db, "rooms", roomId, "players");

    const unsub = onSnapshot(playersCol, (snap) => {
      const playersData = {};
      const now = Date.now();
      snap.forEach((d) => {
        const data = d.data();
        const lastUpdate = data.lastUpdate || data.joinedAt?.toDate()?.getTime() || 0;
        // Se il giocatore non aggiorna da più di timeoutMs, lo rimuovo (tranne me stesso)
        if (d.id !== user.uid && now - lastUpdate > timeoutMs) {
          deleteDoc(d.ref);
          return;
        }
        playersData[d.id] = data;
      });
      setPlayers(playersData);
      onPlayersChange(playersData);
    });

    return unsub;
  }, [user, roomId, onPlayersChange, timeoutMs]);

  // Aggiorna posizione con throttle
  const updatePosition = useCallback((x, y, facing, walking) => {
    if (!playerDocRef.current) return;

    const now = Date.now();
    const timeSinceLast = now - lastWriteRef.current;

    const write = () => {
      lastWriteRef.current = Date.now();
      pendingRef.current = null;
      setDoc(playerDocRef.current, { x, y, facing, walking, lastUpdate: now }, { merge: true });
    };

    if (timeSinceLast >= THROTTLE_MS) {
      write();
    } else {
      // schedula la scrittura per dopo
      clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(write, THROTTLE_MS - timeSinceLast);
    }
  }, []);

  return { updatePosition, players };
}
