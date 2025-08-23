import React from "react";
const MessageList = React.memo(({ messages, messagesEndRef }) => (
  <div style={{ flex: 1, padding: 20, overflowY: "auto", borderBottom: "2px solid #222" }}>
    {messages.map((m, i) => (
      <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
        <div style={{ padding: "14px 18px", borderRadius: 20, maxWidth: "75%", whiteSpace: "pre-wrap", background: m.role === "user" ? "#2563eb" : "#374151", color: "white", borderBottomRightRadius: m.role === "user" ? 0 : 20, borderBottomLeftRadius: m.role === "bot" ? 0 : 20, fontSize: 16, lineHeight: 1.6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>
              {m.role === "user" ? "You" : m.provider === "system" ? "System" : "Assistant"}
              {m.provider && m.provider !== "system" && <ProviderTag id={m.provider} />}
            </div>
            {m.streaming && <span style={{ fontSize: 12, opacity: 0.9 }}>typing…</span>}
          </div>
          <div style={{ marginTop: 8 }}>{m.content}</div>
          {/* <SourceList sources={m.sources} />
          <FooterMeta meta={m.meta} /> */}
        </div>
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
));
export default MessageList;