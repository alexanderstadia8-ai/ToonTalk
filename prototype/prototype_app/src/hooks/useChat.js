import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, query,
  orderBy, limit, onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const MAX_MESSAGES = 60;

/**
 * Hook per la chat in tempo reale via Firestore.
 * - messages: array di { id, uid, username, text, createdAt }
 * - sendMessage(text): invia un messaggio
 */
export function useChat(user, roomId = "lobby") {
  const [messages, setMessages] = useState([]);

  // Ascolta gli ultimi MAX_MESSAGES messaggi in tempo reale
  useEffect(() => {
    if (!user) return;
    const msgsCol = collection(db, "rooms", roomId, "messages");
    const q = query(msgsCol, orderBy("createdAt", "asc"), limit(MAX_MESSAGES));

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });

    return unsub;
  }, [user, roomId]);

  const sendMessage = useCallback(async (text) => {
    if (!user || !text.trim()) return;
    const msgsCol = collection(db, "rooms", roomId, "messages");
    await addDoc(msgsCol, {
      uid:       user.uid,
      username:  user.displayName || user.email.split("@")[0],
      text:      text.trim().slice(0, 300),
      createdAt: serverTimestamp(),
    });
  }, [user, roomId]);

  return { messages, sendMessage };
}
