import { useState } from "react";

// ---- Modal Component ----
const AiSettingsModal = ({ isOpen, onClose, loraSettings, setLoraSettings, openAiSettings, setOpenAiSettings }) => {
  const [activeTab, setActiveTab] = useState("lora"); // "lora" | "openai"

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        width: "500px",
        background: "#0f172a",
        borderRadius: "12px",
        padding: "20px",
        color: "#fff",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: 20, borderBottom: "2px solid #333" }}>
          <button
            onClick={() => setActiveTab("lora")}
            style={{
              flex: 1, padding: "10px",
              background: activeTab === "lora" ? "#1e293b" : "transparent",
              color: "#fff", border: "none", cursor: "pointer"
            }}
          >
            LoRA Settings
          </button>
          <button
            onClick={() => setActiveTab("openai")}
            style={{
              flex: 1, padding: "10px",
              background: activeTab === "openai" ? "#1e293b" : "transparent",
              color: "#fff", border: "none", cursor: "pointer"
            }}
          >
            OpenAI Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "lora" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label>
              Max new tokens: {loraSettings.max_new_tokens}
              <input
                type="range"
                min={50}
                max={1024}
                value={loraSettings.max_new_tokens}
                onChange={(e) => setLoraSettings({ ...loraSettings, max_new_tokens: parseInt(e.target.value) })}
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Temperature: {loraSettings.temperature}
              <input
                type="range"
                step={0.1}
                min={0}
                max={2}
                value={loraSettings.temperature}
                onChange={(e) => setLoraSettings({ ...loraSettings, temperature: parseFloat(e.target.value) })}
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Top-p: {loraSettings.top_p}
              <input
                type="range"
                step={0.05}
                min={0}
                max={1}
                value={loraSettings.top_p}
                onChange={(e) => setLoraSettings({ ...loraSettings, top_p: parseFloat(e.target.value) })}
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Repetition penalty: {loraSettings.repetition_penalty}
              <input
                type="range"
                step={0.1}
                min={1}
                max={2}
                value={loraSettings.repetition_penalty}
                onChange={(e) => setLoraSettings({ ...loraSettings, repetition_penalty: parseFloat(e.target.value) })}
                style={{ width: "100%" }}
              />
            </label>
          </div>
        )}

        {activeTab === "openai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label>
              Answer length:
              <select
                value={openAiSettings.answer_length || ""}
                onChange={(e) => setOpenAiSettings({ ...openAiSettings, answer_length: e.target.value || null })}
                style={{ marginLeft: 10, padding: "6px", borderRadius: 6, background: "#1e293b", color: "#fff" }}
              >
                <option value="">Auto</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#374151", color: "#fff", cursor: "pointer" }}>
            Close
          </button>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSettingsModal;