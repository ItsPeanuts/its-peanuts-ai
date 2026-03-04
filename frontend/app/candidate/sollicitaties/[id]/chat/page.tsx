"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

const WS_BASE = BASE.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws"));

type Message = {
  id: number;
  role: "recruiter" | "candidate";
  content: string;
};

export default function RecruiterChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const appId = parseInt(params.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatEnded, setChatEnded] = useState(false);
  const [connected, setConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }

    function connect() {
      const ws = new WebSocket(`${WS_BASE}/ws/chat/${appId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError("");
        retryCount.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            if (data.ended) {
              setChatEnded(true);
            } else {
              setError(data.error);
            }
            return;
          }

          // Deduplicate by id
          if (data.id && seenIds.current.has(data.id)) return;
          if (data.id) seenIds.current.add(data.id);

          const msg: Message = {
            id: data.id ?? Date.now(),
            role: data.role as "recruiter" | "candidate",
            content: data.content,
          };

          setMessages((prev) => [...prev, msg]);

          if (data.role === "recruiter") setSending(false);
          if (data.ended) setChatEnded(true);

          setLoading(false);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        // Retry tot 5x met oplopende wachttijd (cold start Render.com)
        if (retryCount.current < 5) {
          const delay = Math.min(2000 * (retryCount.current + 1), 10000);
          retryCount.current += 1;
          setError(`Verbinding maken... (poging ${retryCount.current}/5)`);
          retryRef.current = setTimeout(connect, delay);
        } else {
          setError("Verbinding mislukt. Ververs de pagina of probeer het later opnieuw.");
          setLoading(false);
        }
      };

      ws.onclose = (e) => {
        setConnected(false);
        if (e.code === 4001) {
          router.replace("/candidate/login");
        }
      };
    }

    connect();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [router, token, appId]);

  // Trigger loading=false after connection if no messages arrive within 1s
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || chatEnded || !connected) return;

    // Optimistically add candidate message
    const tempId = Date.now();
    seenIds.current.add(tempId);
    setMessages((prev) => [...prev, { id: tempId, role: "candidate", content }]);
    setInput("");
    setSending(true);
    setError("");

    wsRef.current?.send(JSON.stringify({ content }));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/candidate/sollicitaties/${appId}`} className="text-gray-400 hover:text-gray-600 no-underline text-sm">
          ← Terug
        </Link>
        <div className="flex items-center gap-3">
          {/* Lisa avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #0DA89E, #0891b2)" }}>
              L
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${connected ? "bg-green-400" : "bg-gray-300"}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Lisa</div>
            <div className="text-xs text-gray-400">AI HR-Recruiter · It&apos;s Peanuts AI</div>
          </div>
        </div>
        {chatEnded && (
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">
            ✓ Gesprek afgerond
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              Lisa is aan het laden...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "candidate" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                {msg.role === "recruiter" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-1" style={{ background: "linear-gradient(135deg, #0DA89E, #0891b2)" }}>
                    L
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-md ${msg.role === "candidate" ? "items-end" : "items-start"} flex flex-col`}>
                  {msg.role === "recruiter" && (
                    <span className="text-xs text-gray-400 mb-1 ml-1">Lisa</span>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "candidate"
                        ? "text-white rounded-tr-sm"
                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
                    }`}
                    style={msg.role === "candidate" ? { background: "#0DA89E" } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, #0DA89E, #0891b2)" }}>
                  L
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Chat ended message */}
            {chatEnded && !sending && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  ✓ Het gesprek met Lisa is afgerond. De werkgever ontvangt de samenvatting.
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mt-4">{error}</div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {chatEnded ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Het gesprek is afgerond.</p>
              <Link
                href={`/candidate/sollicitaties/${appId}`}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white no-underline hover:opacity-90"
                style={{ background: "#0DA89E" }}
              >
                Naar sollicitatie →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Typ je antwoord..."
                disabled={sending || loading || !connected}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || loading || !connected}
                className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 hover:opacity-90 flex items-center gap-2"
                style={{ background: "#0DA89E" }}
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                Verstuur
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
