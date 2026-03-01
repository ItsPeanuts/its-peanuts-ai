"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

type Message = {
  id: number;
  role: "recruiter" | "candidate";
  content: string;
  created_at: string;
};

async function startChat(token: string, appId: number): Promise<Message> {
  const res = await fetch(`${BASE}/ai/recruiter/${appId}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Kon chat niet starten");
  return data as Message;
}

async function fetchMessages(token: string, appId: number): Promise<Message[]> {
  const res = await fetch(`${BASE}/ai/recruiter/${appId}/messages`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Kon berichten niet laden");
  return data as Message[];
}

async function sendMessage(token: string, appId: number, content: string): Promise<Message> {
  const res = await fetch(`${BASE}/ai/recruiter/${appId}/message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Bericht sturen mislukt");
  return data as Message;
}

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

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }

    (async () => {
      try {
        // Start de chat (of haal bestaande chat op)
        await startChat(token, appId);
        const msgs = await fetchMessages(token, appId);
        setMessages(msgs);
        // Check if chat is ended (4+ recruiter messages)
        const recruiterCount = msgs.filter((m) => m.role === "recruiter").length;
        if (recruiterCount >= 4) setChatEnded(true);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fout bij laden");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, appId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || chatEnded) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "candidate",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError("");

    try {
      const aiReply = await sendMessage(token!, appId, userMsg.content);
      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, aiReply]);

      // Check if chat is now ended
      const allMsgs = await fetchMessages(token!, appId);
      setMessages(allMsgs);
      const recruiterCount = allMsgs.filter((m) => m.role === "recruiter").length;
      if (recruiterCount >= 4) setChatEnded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fout bij versturen");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
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
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
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
                  <span className="text-xs text-gray-300 mt-1 mx-1">
                    {new Date(msg.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
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
                disabled={sending || loading}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || loading}
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
