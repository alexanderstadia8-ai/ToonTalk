import { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";

export default function ChatPanel({ messages, sendMessage, currentUid }) {
  const [text, setText]     = useState("");
  const bottomRef           = useRef(null);

  // Scroll automatico all'ultimo messaggio
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {/* Lista messaggi */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Nessun messaggio ancora. Di qualcosa! 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.uid === currentUid;
          return (
            <div key={msg.id} className={`chat-msg ${isMe ? "chat-msg--me" : ""}`}>
              {!isMe && (
                <span className="chat-msg__name">{msg.username}</span>
              )}
              <span className="chat-msg__bubble">{msg.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Scrivi un messaggio..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          maxLength={300}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!text.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}
