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
  const [waking, setWaking] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const lastSentContent = useRef<string | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }

    cancelledRef.current = false;

    function connect() {
      if (cancelledRef.current) return;
      const ws = new WebSocket(`${WS_BASE}/ws/chat/${appId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setWaking(false);
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

          if (data.id && seenIds.current.has(data.id)) return;
          if (data.id) seenIds.current.add(data.id);

          // Backend echoot kandidaat-berichten terug — vervang de optimistische temp entry
          if (data.role === "candidate" && lastSentContent.current === data.content) {
            lastSentContent.current = null;
            if (data.id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.content === data.content && m.id > 1e12 ? { ...m, id: data.id } : m
                )
              );
            }
            if (data.role === "recruiter") setSending(false);
            if (data.ended) setChatEnded(true);
            setLoading(false);
            return;
          }

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
        if (retryCount.current < 3) {
          retryCount.current += 1;
          setError(`Opnieuw verbinden... (${retryCount.current}/3)`);
          retryRef.current = setTimeout(connect, 3000);
        } else {
          setError("Verbinding mislukt. Ververs de pagina.");
          setLoading(false);
          setWaking(false);
        }
      };

      ws.onclose = (e) => {
        setConnected(false);
        if (e.code === 4001) {
          router.replace("/candidate/login");
        }
      };
    }

    async function wakeAndConnect() {
      // Wek de backend op — Render.com free tier slaapt na 15 min inactiviteit.
      // Poll /health totdat de backend reageert, dan pas WebSocket verbinden.
      setWaking(true);
      setError("Server opstarten...");

      for (let i = 0; i < 30 && !cancelledRef.current; i++) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 5000);
          const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
          clearTimeout(tid);
          if (res.ok) {
            if (!cancelledRef.current) {
              setError("");
              setWaking(false);
              connect();
            }
            return;
          }
        } catch {
          // Backend slaapt nog
        }
        if (!cancelledRef.current && i < 29) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (!cancelledRef.current) {
        setError("Server niet bereikbaar. Ververs de pagina en probeer opnieuw.");
        setLoading(false);
        setWaking(false);
      }
    }

    wakeAndConnect();

    return () => {
      cancelledRef.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [router, token, appId]);

  // Fallback: zet loading=false na 3s als er geen berichten binnenkomen
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || chatEnded || !connected) return;

    const tempId = Date.now();
    seenIds.current.add(tempId);
    lastSentContent.current = content;
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
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #7C3AED, #0891b2)" }}>
              L
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${connected ? "bg-green-400" : waking ? "bg-yellow-400" : "bg-gray-300"}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Lisa</div>
            <div className="text-xs text-gray-400">
              {waking ? "Verbinding maken..." : connected ? "Online" : "Offline"} · AI HR-Recruiter
            </div>
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
        {waking ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: "linear-gradient(135deg, #7C3AED, #0891b2)" }}>
                L
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                Lisa wordt opgestart...
              </div>
              <p className="text-xs text-gray-400 max-w-xs">
                De server start op. Dit duurt maximaal 1 minuut.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
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
                {msg.role === "recruiter" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-1" style={{ background: "linear-gradient(135deg, #7C3AED, #0891b2)" }}>
                    L
                  </div>
                )}

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
                    style={msg.role === "candidate" ? { background: "#7C3AED" } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #0891b2)" }}>
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

        {error && !waking && (
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
                style={{ background: "#7C3AED" }}
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
                placeholder={waking ? "Wachten op server..." : connected ? "Typ je antwoord..." : "Verbinding verbroken..."}
                disabled={sending || loading || !connected || waking}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || loading || !connected || waking}
                className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 hover:opacity-90 flex items-center gap-2"
                style={{ background: "#7C3AED" }}
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
