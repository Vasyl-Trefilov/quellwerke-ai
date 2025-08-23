// import ProviderSelector from "./ProviderSelecter";
import axios from "axios";
import { useState, useEffect, useRef, useMemo } from "react";
import { encodingForModel } from "js-tiktoken";
import AiSettingsModal from "./AiSettingsModal";

/**
 * Enhanced Chatbot UI
 * - Provider switcher (OpenAI/RAG vs Company/LoRA)
 * - Optional side-by-side compare mode
 * - Streaming via fetch
 * - Stop generation (AbortController)
 * - Latency & token/cost footer
 * - RAG citations renderer
 * - URL ingest panel for the Axum crawler
 */
const enc = encodingForModel("gpt-4o-mini"); // default, or switch by model( used to count tokens to show request price )
function ProviderSelector({ provider, setProvider }) {
  // Just to select witch Ai user want to use
  const options = [
    { id: "openai", label: "GPT + RAG" },
    { id: "company", label: "LoRA (FastAPI)" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => setProvider(o.id)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: provider === o.id ? "2px solid #60a5fa" : "2px solid #333",
            background: provider === o.id ? "#1e40af" : "#0b1220",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      provider: "system",
      content: "👋 Hi! I’m your assistant. How can I help you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("openai"); // current Ai
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false); // To make request to both Ai in same time
  const [error, setError] = useState("");
  const [ragUrl, setRagUrl] = useState("https://www.quellwerke.de"); // base user for rust crawler ( pls input without other routes, only main page )
  const [ragLang, setRagLang] = useState("de");
  const [ragTitle, setRagTitle] = useState("QuellWerke");
  const [loraSettings, setLoraSettings] = useState({
    max_new_tokens: 600, // maximum tokens the model will generate
    // (increase if you get mid-sentence cutoffs,
    // decrease if it's "rambling too much"

    temperature: 0.7, // randomness (lower = more deterministic)
    top_p: 0.9, // nucleus sampling: only keep top p=90% probs
    top_k: 50, // (optional) sample only from top-k tokens
    repetition_penalty: 1.2, // >1.0 discourages repeating same phrases
  });
  const [openAiSettings, setOpenAiSettings] = useState({
    answer_length: null, // null for auto answer lenght
  });
  const [showAiSettings, setShowAiSettings] = useState(false); // Show modeal window with Ai settings
  const closeAiSettings = () => {
    // For future model window animation
    setShowAiSettings(false);
  };

  const abortRef = useRef(null);
  const messagesEndRef = useRef(null);

  const endpoints = useMemo(
    () => ({
      openai: "http://localhost:3000/search",
      company: "http://localhost:8000/generate",
      parser: "http://localhost:4000/parser/parse-url",
    }),
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const clearAbort = () => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
      abortRef.current = null;
    }
  };

  const handleParse = async () => {
    setError("");
    try {
      const res = await axios.post(endpoints.parser, {
        url: ragUrl,
        lang: ragLang,
        title: ragTitle,
      });
      addMessage({
        role: "bot",
        provider: "system",
        content: `✅ Parsed '${ragTitle}' (${ragLang}). ${
          res.data?.summary || "Chunks stored in Postgres + Qdrant."
        }`,
      });
    } catch (e) {
      setError(String(e.message || e));
      addMessage({
        role: "bot",
        provider: "system",
        content: "⚠️ Error parsing URL.",
      });
    }
  };
  const openaiRates = {
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  };

  function countTokens(text) {
    return enc.encode(text).length;
  }

  function estimateCost(model, inputTokens, outputTokens) {
    const rate = openaiRates[model];
    if (!rate) return undefined;
    return inputTokens * rate.input + outputTokens * rate.output;
  }

  const buildPayload = (prov, text) =>
    prov === "openai"
      ? { query: text, provider: "openai", settings: openAiSettings }
      : { question: text, settings: loraSettings };

  const streamAnswer = async (prov, text, model = "gpt-4o-mini") => {
    const url = endpoints[prov];
    const controller = new AbortController();
    abortRef.current = controller;
    const meta = { startedAt: Date.now(), tokens: undefined, cost: undefined };

    // 🔥 add message first and capture its index
    let newIdx;
    setMessages((prev) => {
      const idx = prev.length;
      newIdx = idx;
      return [
        ...prev,
        { role: "bot", provider: prov, content: "", streaming: true, meta },
      ];
    });

    let stop = false;
    // estimate input tokens
    let inputTokens =
      prov === "openai"
        ? countTokens(JSON.stringify(buildPayload(prov, text)))
        : 0;
    let outputTokens = 0;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(prov, text)),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let sources = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const j = JSON.parse(trimmed);
            if (typeof j.delta === "string") {
              full += j.delta;
              if (prov === "openai") outputTokens += countTokens(j.delta);
            }
            if (Array.isArray(j.sources)) sources = j.sources;
            if (j.done === true) stop = true;
            if (j.usage) meta.tokens = j.usage?.tokens; // if API sends usage
            if (j.cost) meta.cost = j.cost; // if API sends cost
          } catch (err) {
            console.error("JSON parse error:", err, trimmed);
          }
        }

        setMessages((prev) => {
          const copy = [...prev];
          if (copy[newIdx])
            copy[newIdx] = { ...copy[newIdx], content: full, sources, meta };
          return copy;
        });

        if (stop) break;
      }

      // ✅ finalize tokens & cost if OpenAI
      if (prov === "openai") {
        meta.tokens = {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        };
        meta.cost = estimateCost(model, inputTokens, outputTokens);
      }

      const latency = Date.now() - meta.startedAt;
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[newIdx])
          copy[newIdx] = {
            ...copy[newIdx],
            streaming: false,
            meta: { ...meta, latency },
          };
        return copy;
      });
    } catch (e) {
      if (e.name === "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[newIdx])
            copy[newIdx] = {
              ...copy[newIdx],
              content: copy[newIdx].content + "\n\n⏹️ Stopped.",
              streaming: false,
            };
          return copy;
        });
      } else {
        addMessage({
          role: "bot",
          provider: prov,
          content: `⚠️ ${e.message || e}`,
        });
      }
      clearAbort();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setError("");
    setLoading(true);
    const userText = input.trim();
    setInput("");

    addMessage({ role: "user", content: userText });

    if (compareMode) {
      await Promise.all([
        streamAnswer("openai", userText),
        streamAnswer("company", userText),
      ]).catch(() => {});
    } else {
      await streamAnswer(provider, userText);
    }

    setLoading(false);
  };

  const stop = () => clearAbort();

  const ProviderTag = ({ id }) => (
    <span
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 12,
        background:
          id === "openai"
            ? "#1f2937"
            : id === "company"
            ? "#334155"
            : "#0f172a",
        color: "#93c5fd",
        marginLeft: 8,
        border: "1px solid #334155",
      }}
    >
      {id === "openai" ? "GPT+RAG" : id === "company" ? "LoRA" : "SYSTEM"}
    </span>
  );

  const FooterMeta = ({ meta }) => {
    if (!meta) return null;
    const parts = [];
    if (typeof meta.latency === "number") parts.push(`⏱️ ${meta.latency} ms`);
    if (typeof meta.tokens === "number") parts.push(`🔢 ${meta.tokens} tok`);
    if (typeof meta.cost !== "undefined") parts.push(`💵 ${meta.cost}`);
    if (!parts.length) return null;
    return (
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
        {parts.join("  •  ")}
      </div>
    );
  };

  const SourceList = ({ sources = [] }) => {
    if (!sources?.length) return null;
    return (
      <div style={{ marginTop: 10, fontSize: 13 }}>
        <div style={{ opacity: 0.8, marginBottom: 6 }}>Sources</div>
        <ul style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
          {sources.map((s, i) => (
            <li key={i} style={{ wordBreak: "break-word" }}>
              <a
                href={s.url || s.href || s}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#93c5fd" }}
              >
                {s.title || s.url || s.href || `source-${i + 1}`}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

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
      {/* Top bar */}
      <div
        style={{
          zIndex: 10,
          padding: "12px 16px",
          background: "#0f172a",
          borderBottom: "2px solid #222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flex: 1,
            minWidth: 320,
          }}
        >
          <input
            value={ragUrl}
            onChange={(e) => setRagUrl(e.target.value)}
            placeholder="URL to crawl"
            style={{
              flex: 2,
              padding: 10,
              borderRadius: 10,
              border: "2px solid #333",
              background: "#1e293b",
              color: "#f9fafb",
            }}
          />
          <input
            value={ragTitle}
            onChange={(e) => setRagTitle(e.target.value)}
            placeholder="Title"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "2px solid #333",
              background: "#1e293b",
              color: "#f9fafb",
            }}
          />
          <input
            value={ragLang}
            onChange={(e) => setRagLang(e.target.value)}
            placeholder="Lang"
            style={{
              width: 76,
              padding: 10,
              borderRadius: 10,
              border: "2px solid #333",
              background: "#1e293b",
              color: "#f9fafb",
            }}
          />
          <button
            onClick={handleParse}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#374151",
              color: "#fff",
              border: "2px solid #333",
              cursor: "pointer",
            }}
          >
            Parse URL
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <ProviderSelector provider={provider} setProvider={setProvider} />
          <button
            onClick={() => setShowAiSettings(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#374151",
              color: "#fff",
              border: "2px solid #333",
              cursor: "pointer",
            }}
          >
            ⚙️ Settings
          </button>
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              color: "#e5e7eb",
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
            />
            Compare
          </label>
          <button
            onClick={stop}
            disabled={!loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: loading ? "#991b1b" : "#374151",
              color: "#fff",
              border: "2px solid #333",
              cursor: loading ? "pointer" : "not-allowed",
              opacity: loading ? 1 : 0.5,
            }}
          >
            Stop
          </button>
        </div>

        {/* Modal */}
        <AiSettingsModal
          isOpen={showAiSettings}
          onClose={() => setShowAiSettings(false)}
          loraSettings={loraSettings}
          setLoraSettings={setLoraSettings}
          openAiSettings={openAiSettings}
          setOpenAiSettings={setOpenAiSettings}
        />
      </div>

      <div
        style={{
          flex: 1,
          padding: 20,
          overflowY: "auto",
          borderBottom: "2px solid #222",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 20,
                maxWidth: "75%",
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "#2563eb" : "#374151",
                color: "white",
                borderBottomRightRadius: m.role === "user" ? 0 : 20,
                borderBottomLeftRadius: m.role === "bot" ? 0 : 20,
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {m.role === "user"
                    ? "You"
                    : m.provider === "system"
                    ? "System"
                    : "Assistant"}
                  {m.provider && m.provider !== "system" && (
                    <ProviderTag id={m.provider} />
                  )}
                </div>
                {m.streaming && (
                  <span style={{ fontSize: 12, opacity: 0.9 }}>typing…</span>
                )}
              </div>
              <div style={{ marginTop: 8 }}>{m.content}</div>
              <SourceList sources={m.sources} />
              <FooterMeta meta={m.meta} />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 16,
          background: "#111",
          borderTop: "2px solid #222",
        }}
      >
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
            color: "#f9fafb",
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
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "…" : compareMode ? "Send (Compare)" : "Send"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fee2e2",
            padding: 10,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
