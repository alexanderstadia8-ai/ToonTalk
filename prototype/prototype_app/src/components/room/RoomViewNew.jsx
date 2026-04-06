import { useEffect, useRef, useState, useCallback } from "react";
import AvatarRenderer from "../avatar/AvatarRenderer";
import ChatPanel from "../chat/ChatPanel";
import { useMultiplayerRoom } from "../../hooks/useMultiplayerRoom";
import { useChat } from "../../hooks/useChat";

const SCALE      = 0.22;
const ANCHOR_X   = 50;
const ANCHOR_Y   = 180;
const MAX_SPEED  = 1.4;  // dimezzato da 2.8
const SLOW_SPEED = 0.9;  // dimezzato da 1.8
const STOP_DIST  = 1.5;
const STEP_DIST  = 12;
const PLAYER_TIMEOUT_MS = 5000; // disconnetti se nessun aggiornamento per 5 secondi
const ANIMATION_FRAME_INTERVAL = 60; // ms per cambiare frame animazione (più veloce e fluido)

export default function RoomViewNew({ user }) {
  const roomRef = useRef(null);

  /* ── Stato locale del giocatore corrente ── */
  const [position,  setPosition]  = useState({ x: 100, y: 40 });
  const [target,    setTarget]    = useState({ x: 100, y: 40 });
  const [walking,   setWalking]   = useState(false);
  const [facing,    setFacing]    = useState("right");
  const [stepPhase, setStepPhase] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const walkedRef = useRef(0);

  /* ── Tutti i giocatori nella stanza (da Firestore) ── */
  const [players, setPlayers] = useState({});
  const onPlayersChange = useCallback((p) => setPlayers(p), []);

  const { updatePosition } = useMultiplayerRoom(user, "lobby", onPlayersChange, PLAYER_TIMEOUT_MS);
  const { messages, sendMessage } = useChat(user, "lobby");

  /* ── Pausa quando il tab non è visibile ── */
  useEffect(() => {
    const onChange = () => {
      const visible = !document.hidden;
      setPageVisible(visible);
      if (!visible) { setWalking(false); walkedRef.current = 0; }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  /* ── Loop animazione locale + sync Firestore ── */
  useEffect(() => {
    if (!pageVisible) return;
    let frameId;
    let lastAnimTime = 0;

    const animate = (timestamp) => {
      // Gestione animazione: cambia frame solo ogni ANIMATION_FRAME_INTERVAL ms
      if (walking && timestamp - lastAnimTime >= ANIMATION_FRAME_INTERVAL) {
        setStepPhase((p) => p + 1);
        lastAnimTime = timestamp;
      }

      setPosition((prev) => {
        const dx   = target.x - prev.x;
        const dy   = target.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < STOP_DIST) {
          setWalking(false);
          walkedRef.current = 0;
          updatePosition(target.x, target.y, facing, false);
          return target;
        }

        setWalking(true);
        const speed = dist < 20 ? SLOW_SPEED : MAX_SPEED;
        const next  = {
          x: prev.x + (dx / dist) * speed,
          y: prev.y + (dy / dist) * speed,
        };

        walkedRef.current += Math.sqrt((next.x - prev.x) ** 2 + (next.y - prev.y) ** 2);
        // Il cambio di fase dell'animazione è gestito sopra nel timer separato
        // Qui teniamo traccia della distanza percorsa per coerenza

        updatePosition(next.x, next.y, facing, true);
        return next;
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, facing, walking, pageVisible, updatePosition]);

  /* ── Click → muovi verso quel punto ── */
  function handleClick(e) {
    if (!roomRef.current) return;
    // blocca click se l'utente ha cliccato sulla chat
    if (e.target.closest(".chat-panel")) return;
    const rect = roomRef.current.getBoundingClientRect();
    const nx   = e.clientX - rect.left  - ANCHOR_X;
    const ny   = e.clientY - rect.top   - ANCHOR_Y;
    setFacing(nx >= position.x ? "right" : "left");
    setTarget({ x: nx, y: ny });
  }

  const localUid = user?.uid;

  return (
    <div
      ref={roomRef}
      onClick={handleClick}
      style={{
        width: "100vw", height: "100vh",
        backgroundImage: "url('/assets/rooms/room_001_lobby/background.png')",
        backgroundSize: "cover", backgroundPosition: "center",
        overflow: "hidden", position: "relative",
      }}
    >
      {/* ── Avatar di tutti i giocatori ── */}
      {Object.entries(players).map(([uid, p]) => {
        const isLocal = uid === localUid;
        const px = isLocal ? position.x : (p.x ?? 100);
        const py = isLocal ? position.y : (p.y ?? 40);
        const pw = isLocal ? (walking && pageVisible) : (p.walking ?? false);
        const pf = isLocal ? facing      : (p.facing  ?? "right");
        const ps = isLocal ? stepPhase   : 0;

        return (
          <div key={uid} style={{ position: "absolute", left: px, top: py }}>

            {/* Nome sopra la testa */}
            <div style={{
              position: "absolute",
              top: -24,
              left: "50%",
              transform: "translateX(-50%)",
              background: isLocal ? "rgba(255,140,0,0.88)" : "rgba(0,0,0,0.62)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 9px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              letterSpacing: "0.5px",
              border: isLocal ? "1.5px solid #ff6600" : "1.5px solid rgba(255,255,255,0.15)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}>
              {p.username ?? "???"}
            </div>

            <AvatarRenderer
              x={0}
              y={0}
              scale={SCALE}
              walking={pw}
              facing={pf}
              stepPhase={ps}
              gender="man"
            />
          </div>
        );
      })}

      {/* ── Chat ── */}
      <ChatPanel
        messages={messages}
        sendMessage={sendMessage}
        currentUid={localUid}
      />
    </div>
  );
}
