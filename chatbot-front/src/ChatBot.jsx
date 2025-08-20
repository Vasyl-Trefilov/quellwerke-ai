// ChatBot.jsx
import { useState, useEffect, useRef } from "react";
import ProviderSelector from "./ProviderSelecter";
import axios from "axios"

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "👋 Hi! I’m your assistant. How can I help you?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("openai"); // <-- selection state
  const messagesEndRef = useRef(null);

  const endpoints = {
    openai: "http://localhost:3000/search",
    company: "http://0.0.0.0:8000/generate",
  };
  const parseQuellWerke = async () =>{
    await axios.post("http://localhost:3000/parse-url",{
      url: "https://www.quellwerke.de", 
      lang: "de", 
      title: "QuellWerke"
    })
  }
  async function sendMessage() {
    if (!input.trim()) return;

    const newMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(endpoints[provider], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          provider === "openai"
            ? JSON.stringify({ query: input, provider: "openai" })
            : JSON.stringify({ question: input }), // adjust payload for company API
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data?.answer || data?.response || "(no response)",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "⚠️ Error fetching response." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        zIndex: 10,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "transparent",
      }}
    >
      {/* Provider Selector */}
      <div
        style={{
          zIndex: 10,
          padding: "12px 16px",
          background: "#0f172a",
          borderBottom: "2px solid #222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
        onClick={parseQuellWerke}
          style={{
            cursor: "pointer",
            padding: "14px 18px",
            borderRadius: "20px",
            maxWidth: "75%",
            whiteSpace: "pre-line",
            background: "#374151",
            color: "white",
            fontSize: "16px",
            lineHeight: "1.6",
          }}
        >
          Parse QuellWerke
        </div>
       <ProviderSelector provider={provider} setProvider={setProvider} />
      </div>

      {/* Chat messages */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          overflowY: "auto",
          borderBottom: "2px solid #222",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent:
                msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "20px",
                maxWidth: "75%",
                whiteSpace: "pre-line",
                background: msg.role === "user" ? "#2563eb" : "#374151",
                color: "white",
                borderBottomRightRadius: msg.role === "user" ? "0" : "20px",
                borderBottomLeftRadius: msg.role === "bot" ? "0" : "20px",
                fontSize: "16px",
                lineHeight: "1.6",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "16px",
          background: "#111",
          borderTop: "2px solid #222",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          style={{
            flex: 1,
            border: "2px solid #333",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "16px",
            background: "#1e293b",
            color: "#f9fafb",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: "14px 24px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            opacity: loading ? 0.6 : 1,
            cursor: "pointer",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
