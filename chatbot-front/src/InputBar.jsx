function InputBar({ input, setInput, sendMessage, loading, compareMode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: 16, background: "#111", borderTop: "2px solid #222" }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask anything…"
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        disabled={loading}
        style={{
          flex: 1,
          border: "2px solid #333",
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
          background: "#1e293b",
          color: "#f9fafb"
        }}
      />
      <button
        onClick={sendMessage}
        disabled={loading || !input.trim()}
        style={{
          padding: "14px 24px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "…" : compareMode ? "Send (Compare)" : "Send"}
      </button>
    </div>
  );
}

export default InputBar;