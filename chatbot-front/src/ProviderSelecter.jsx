import { useState } from "react";
import openaiImg from "./openai.png";
import quellwerkeImg from "./quellwerke.svg";

export default function ProviderSelector({ provider, setProvider }) {
  const [open, setOpen] = useState(false);

  const providers = [
    { id: "openai", label: "General (OpenAI + RAG)", icon: openaiImg },
    { id: "company", label: "QuellWerke AI", icon: quellwerkeImg },
  ];

  return (
    <div style={{ position: "relative", width: "250px", marginLeft: "auto" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
            zIndex: 20,  
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #333",
            background: "#1e293b",
            color: "#f9fafb",
            cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={providers.find((p) => p.id === provider).icon} alt="" width={24} height={24} />
          {providers.find((p) => p.id === provider).label}
        </div>
        <span>▼</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#1e293b",
            border: "1px solid #333",
            borderRadius: "8px",
            marginTop: "4px",
            zIndex: 999,
          }}
        >
          {providers.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setProvider(p.id);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                cursor: "pointer",
                color: "#fff"
              }}
            >
              <img src={p.icon} alt="" width={24} height={24} />
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
