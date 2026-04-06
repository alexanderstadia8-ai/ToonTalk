import { useEffect, useRef, useCallback } from "react";
import {
  doc, setDoc, deleteDoc,
  collection, onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const THROTTLE_MS = 80; // scrivi su Firestore max ogni 80ms

/**
 * Gestisce la presenza e la posizione multiplayer nella stanza.
 * - Registra il giocatore locale quando monta
 * - Rimuove quando smonta (o chiude il tab)
 * - Ascolta tutti i giocatori in tempo reale
 * - Ritorna { players, updatePosition }
 */
export function useMultiplayerRoom(user, roomId = "lobby", onPlayersChange) {
  const lastWriteRef = useRef(0);
  const pendingRef   = useRef(null);
  const playerDocRef = useRef(null);

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
    });

    // Cleanup: rimuovi il giocatore quando lascia
    const cleanup = () => deleteDoc(ref);
    window.addEventListener("beforeunload", cleanup);

    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [user, roomId]);

  // Ascolta tutti i giocatori nella stanza in tempo reale
  useEffect(() => {
    if (!user) return;
    const playersCol = collection(db, "rooms", roomId, "players");

    const unsub = onSnapshot(playersCol, (snap) => {
      const players = {};
      snap.forEach((d) => {
        players[d.id] = d.data();
      });
      onPlayersChange(players);
    });

    return unsub;
  }, [user, roomId, onPlayersChange]);

  // Aggiorna posizione con throttle
  const updatePosition = useCallback((x, y, facing, walking) => {
    if (!playerDocRef.current) return;

    const now = Date.now();
    const timeSinceLast = now - lastWriteRef.current;

    const write = () => {
      lastWriteRef.current = Date.now();
      pendingRef.current = null;
      setDoc(playerDocRef.current, { x, y, facing, walking }, { merge: true });
    };

    if (timeSinceLast >= THROTTLE_MS) {
      write();
    } else {
      // schedula la scrittura per dopo
      clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(write, THROTTLE_MS - timeSinceLast);
    }
  }, []);

  return { updatePosition };
}
