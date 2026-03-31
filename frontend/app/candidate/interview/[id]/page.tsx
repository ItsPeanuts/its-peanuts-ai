"use client";

/**
 * Virtuele AI Recruiter — Video Interview Pagina
 *
 * Verbeteringen t.o.v. vorige versie:
 * - Double audio bug opgelost: `called` guard in browserSpeak()
 * - Kandidaat self-view (PiP): getUserMedia start bij interview begin
 * - Fluent gesprek: stille detectie is primair, knop is secundair/verborgen
 * - Snellere startup: delays gereduceerd (500ms→0ms / 1200ms→300ms)
 * - Betere UI: duidelijker wanneer het jouw beurt is
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getToken } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

const AMBER_VIDEO_URL =
  "https://clips-presenters.d-id.com/v2/Amber/IVHRp0a96W/rrGsQrSVpu/talkingPreview.mp4";

type InterviewStage =
  | "idle"
  | "connecting"
  | "intro"
  | "listening"
  | "speaking"
  | "processing"
  | "completed"
  | "error";

interface CompleteResult {
  score: number;
  summary: string;
  followup_scheduled: boolean;
  teams_join_url: string | null;
  scheduled_at: string | null;
}

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export default function VideoInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const appId = Number(params?.id);

  const token = useRef<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);       // D-ID WebRTC stream
  const amberVideoRef = useRef<HTMLVideoElement>(null);  // Amber idle/speaking video
  const selfViewRef = useRef<HTMLVideoElement>(null);    // Kandidaat self-view
  const ttsModeRef = useRef(false);
  const transcriptRef = useRef("");
  const stopListeningAndAnswerRef = useRef<(() => Promise<void>) | null>(null);
  const didSpeakDoneRef = useRef<(() => void) | null>(null);

  const [stage, setStage] = useState<InterviewStage>("idle");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions] = useState(4);
  const [transcript, setTranscript] = useState("");
  const [liveCaption, setLiveCaption] = useState("");
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [ttsMode, setTtsMode] = useState<"openai" | "browser" | "">("");
  const [isTTSMode, setIsTTSMode] = useState(false);
  const [hasSelfView, setHasSelfView] = useState(false);
  const [sessionData, setSessionData] = useState<{
    did_stream_id: string;
    did_session_id: string;
  } | null>(null);

  useEffect(() => {
    token.current = getToken();
    if (!token.current) {
      router.replace("/candidate/login");
    }
  }, [router]);

  // Amber video: beweeg alleen als Lisa spreekt
  useEffect(() => {
    const vid = amberVideoRef.current;
    if (!vid) return;
    if (stage === "speaking") {
      void vid.play();
    } else {
      vid.pause();
      vid.currentTime = 0;
    }
  }, [stage]);

  // Opruimen self-view stream bij unmount
  useEffect(() => {
    return () => {
      const vid = selfViewRef.current;
      if (vid && vid.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Self-view camera ────────────────────────────────────────────────────────

  const startSelfView = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false, // audio loopt via SpeechRecognition, niet hier
      });
      if (selfViewRef.current) {
        selfViewRef.current.srcObject = stream;
        setHasSelfView(true);
      }
    } catch {
      // Camera-toegang geweigerd of niet aanwezig — stil falen
    }
  }, []);

  // ── API helpers ─────────────────────────────────────────────────────────────

  const apiPost = useCallback(
    async (path: string, body?: object) => {
      const resp = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.current}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || "API fout");
      }
      return resp.json();
    },
    []
  );

  // ── TTS helpers ─────────────────────────────────────────────────────────────

  const browserSpeak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setTimeout(resolve, 3000);
        return;
      }
      window.speechSynthesis.cancel();

      // Guard: zorg dat doSpeak maar 1x wordt aangeroepen,
      // ook als zowel 'voiceschanged' als de fallback-timeout triggeren.
      let called = false;
      const doSpeak = () => {
        if (called) return;
        called = true;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "nl-NL";

        const voices = window.speechSynthesis.getVoices();
        const nlVoices = voices.filter((v) => v.lang.startsWith("nl"));
        const best =
          nlVoices.find((v) => /lotte|fenna|ellen/i.test(v.name)) ||
          nlVoices.find((v) => /google/i.test(v.name)) ||
          nlVoices.find((v) => /female|vrouw/i.test(v.name)) ||
          nlVoices[0] ||
          null;
        if (best) utterance.voice = best;

        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => setTimeout(resolve, 2000);
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
        setTimeout(doSpeak, 600); // fallback — beschermd door `called` guard
      }
    });
  }, []);

  // ── speakText: D-ID of OpenAI TTS ──────────────────────────────────────────

  const speakText = useCallback(
    async (text: string) => {
      setLiveCaption(text);

      if (ttsModeRef.current) {
        try {
          const resp = await fetch(
            `${BASE}/virtual-interview/session/${appId}/tts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.current}`,
              },
              body: JSON.stringify({ text }),
            }
          );

          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(`TTS ${resp.status}: ${err.detail}`);
          }

          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);

          // Kort wachten zodat audio buffered is — max 150ms
          await new Promise<void>((resolve) => {
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => resolve();
            audio.load();
            setTimeout(resolve, 150);
          });

          setStage("speaking");
          setTtsMode("openai");

          await new Promise<void>((resolve) => {
            audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
            audio.play().catch((e) => {
              console.warn("Audio play blocked:", e);
              URL.revokeObjectURL(url);
              resolve();
            });
          });
        } catch (e) {
          console.warn("OpenAI TTS mislukt, browser TTS als fallback:", e);
          setTtsMode("browser");
          setStage("speaking");
          await browserSpeak(text);
        }
      } else {
        // D-ID modus
        setStage("speaking");
        if (!sessionData) {
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          await new Promise<void>((resolve) => {
            const words = text.split(" ").length;
            const fallbackMs = Math.max(5000, words * 380 + 2500);
            const timeout = setTimeout(() => {
              didSpeakDoneRef.current = null;
              resolve();
            }, fallbackMs);

            didSpeakDoneRef.current = () => {
              clearTimeout(timeout);
              didSpeakDoneRef.current = null;
              resolve();
            };

            apiPost(`/virtual-interview/session/${appId}/speak`, { text }).catch(() => {
              clearTimeout(timeout);
              didSpeakDoneRef.current = null;
              resolve();
            });
          });
        }
      }
      setStage("processing");
      setLiveCaption("");
    },
    [appId, apiPost, sessionData, browserSpeak]
  );

  // ── STT ─────────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg("Spraakherkenning niet ondersteund. Gebruik Chrome.");
      setStage("error");
      return;
    }

    setStage("listening");
    setTranscript("");
    transcriptRef.current = "";

    const recognition = new SpeechRec();
    recognition.lang = "nl-NL";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      transcriptRef.current = full;
      setTranscript(full);

      // Auto-submit na 2.5s stilte zodra kandidaat ≥5 woorden heeft gezegd
      if (silenceTimer) clearTimeout(silenceTimer);
      const wordCount = full.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount >= 5) {
        silenceTimer = setTimeout(() => {
          stopListeningAndAnswerRef.current?.();
        }, 2500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setErrorMsg(`Microfoon fout: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (transcriptRef.current.trim()) {
        stopListeningAndAnswerRef.current?.();
      }
    };
    recognition.start();
  }, []);

  // ── finishInterview ─────────────────────────────────────────────────────────

  const finishInterview = useCallback(async () => {
    setStage("processing");
    try {
      const res = await apiPost(`/virtual-interview/session/${appId}/complete`);
      // Stop self-view stream netjes
      const vid = selfViewRef.current;
      if (vid && vid.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      setResult(res);
      setStage("completed");
    } catch (e: unknown) {
      setStage("error");
      setErrorMsg((e as Error).message || "Fout bij afsluiten interview");
    }
  }, [appId, apiPost]);

  // ── stopListeningAndAnswer ──────────────────────────────────────────────────

  const stopListeningAndAnswer = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    const answer = transcriptRef.current.trim() || "[Geen antwoord gegeven]";
    transcriptRef.current = "";
    setTranscript("");
    setStage("processing");

    try {
      const resp = await apiPost(`/virtual-interview/session/${appId}/answer`, {
        transcript: answer,
      });
      setQuestionNumber(resp.question_number);

      if (resp.ended) {
        await speakText(resp.next_text);
        await finishInterview();
      } else {
        await speakText(resp.next_text);
        setStage("listening");
        startListening();
      }
    } catch (e: unknown) {
      setStage("error");
      setErrorMsg((e as Error).message || "Fout bij verwerken antwoord");
    }
  }, [appId, apiPost, speakText, startListening, finishInterview]);

  useEffect(() => {
    stopListeningAndAnswerRef.current = stopListeningAndAnswer;
  }, [stopListeningAndAnswer]);

  // ── startInterview ──────────────────────────────────────────────────────────

  const startInterview = useCallback(async () => {
    setStage("connecting");
    setErrorMsg("");

    // Start self-view camera direct — parallel met API-verbinding
    startSelfView();

    try {
      const data = await apiPost(`/virtual-interview/session/${appId}/start`);
      setSessionData({ did_stream_id: data.did_stream_id, did_session_id: data.did_session_id });

      if (data.tts_mode) {
        // ── TTS MODUS ──
        ttsModeRef.current = true;
        setIsTTSMode(true);

        // Geen kunstmatige delay — direct starten
        try {
          const introText = `Hoi! Ik ben Lisa van VorzaIQ. Fijn dat je er bent — laten we direct beginnen.`;
          await speakText(introText);

          const firstAnswer = await apiPost(`/virtual-interview/session/${appId}/answer`, {
            transcript: "[Interview gestart - kandidaat is aanwezig]",
          });
          setQuestionNumber(firstAnswer.question_number);
          await speakText(firstAnswer.next_text);
          if (!firstAnswer.ended) {
            setStage("listening");
            startListening();
          } else {
            await finishInterview();
          }
        } catch (e: unknown) {
          setStage("error");
          setErrorMsg((e as Error).message || "Fout bij starten interview");
        }
        return;
      }

      // ── D-ID MODUS ──
      const pc = new RTCPeerConnection({ iceServers: data.ice_servers });
      peerRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await apiPost(`/virtual-interview/session/${appId}/ice-candidate`, {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid ?? "",
              sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0,
            });
          } catch {
            // ICE errors zijn niet fataal
          }
        }
      };

      pc.ondatachannel = (event) => {
        const ch = event.channel;
        ch.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string);
            const evtName = (msg.event || msg.type || msg.status || "").toString();
            if (evtName === "stream/done" || evtName === "done" || evtName === "stream/ready") {
              didSpeakDoneRef.current?.();
            }
          } catch {
            // negeer parse fouten
          }
        };
      };

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: data.offer.sdp })
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await apiPost(`/virtual-interview/session/${appId}/sdp-answer`, {
        sdp: answer.sdp,
        type: "answer",
      });

      // Kleine buffer voor WebRTC verbinding
      await new Promise((r) => setTimeout(r, 300));

      try {
        const introText = `Hoi! Ik ben Lisa van VorzaIQ. Leuk dat je er bent — we starten direct.`;
        await speakText(introText);
        const firstAnswer = await apiPost(`/virtual-interview/session/${appId}/answer`, {
          transcript: "[Interview gestart - kandidaat is aanwezig]",
        });
        setQuestionNumber(firstAnswer.question_number);
        await speakText(firstAnswer.next_text);
        if (!firstAnswer.ended) {
          setStage("listening");
          startListening();
        } else {
          await finishInterview();
        }
      } catch (e: unknown) {
        setStage("error");
        setErrorMsg((e as Error).message || "Fout bij starten interview");
      }
    } catch (e: unknown) {
      setStage("error");
      setErrorMsg((e as Error).message || "Verbinding mislukt");
    }
  }, [appId, apiPost, speakText, startListening, finishInterview, startSelfView]);

  // ── UI helpers ──────────────────────────────────────────────────────────────

  const progressPct = Math.min(100, Math.round((questionNumber / totalQuestions) * 100));

  const stageLabel: Record<InterviewStage, string> = {
    idle: "Klaar om te starten",
    connecting: "Verbinding maken...",
    intro: "Lisa stelt zich voor",
    listening: "Jouw beurt — spreek nu",
    speaking: "Lisa spreekt...",
    processing: "Even geduld...",
    completed: "Interview afgerond",
    error: "Fout opgetreden",
  };

  const scoreColor = result
    ? result.score >= 70 ? "#059669" : result.score >= 50 ? "#d97706" : "#dc2626"
    : "#6b7280";
  const scoreBg = result
    ? result.score >= 70 ? "#d1fae5" : result.score >= 50 ? "#fef3c7" : "#fee2e2"
    : "#f3f4f6";

  // ── Resultaatscherm ─────────────────────────────────────────────────────────

  if (stage === "completed" && result) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {result.score >= 70 ? "🎉" : result.score >= 50 ? "👍" : "📋"}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
            Interview afgerond
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28 }}>
            Bedankt voor je tijd. Je resultaat:
          </p>

          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: scoreBg, border: `4px solid ${scoreColor}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 26, fontWeight: 900, color: scoreColor,
          }}>
            {result.score}
          </div>

          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, background: "#f8fafc", borderRadius: 12, padding: "14px 16px", marginBottom: 24, textAlign: "left" }}>
            {result.summary}
          </p>

          {result.followup_scheduled && result.scheduled_at ? (
            <div style={{ background: "#d1fae5", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
              <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 6, fontSize: 15 }}>
                ✅ 2e gesprek ingepland!
              </div>
              <div style={{ fontSize: 13, color: "#065f46" }}>
                {new Date(result.scheduled_at).toLocaleString("nl-NL", {
                  weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                })}
              </div>
              {result.teams_join_url && (
                <a href={result.teams_join_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", marginTop: 10, color: "#0284c7", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  Teams meeting openen →
                </a>
              )}
            </div>
          ) : (
            <div style={{ background: "#f3f4f6", borderRadius: 12, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "#6b7280", textAlign: "left" }}>
              Je hoort spoedig van de werkgever.
            </div>
          )}

          <button
            onClick={() => router.push(`/candidate/sollicitaties/${appId}`)}
            style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}
          >
            Terug naar sollicitatie
          </button>
        </div>
      </div>
    );
  }

  // ── Interviewscherm ─────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f1117", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{`
        @keyframes micPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(34,197,94,0); }
        }
        @keyframes dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 900, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>
          VorzaIQ · Video Interview
        </div>
        <div style={{
          background: stage === "listening" ? "#22c55e" : stage === "speaking" ? "#3b82f6" : stage === "connecting" ? "#f59e0b" : "#6b7280",
          color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700,
          transition: "background 0.3s",
        }}>
          {stageLabel[stage]}
        </div>
      </div>

      {/* Hoofd layout */}
      <div style={{ width: "100%", maxWidth: 900, display: "flex", gap: 16, marginBottom: 16 }}>

        {/* Lisa — avatar / D-ID video */}
        <div style={{ flex: 1, background: "#1c1f26", borderRadius: 16, overflow: "hidden", aspectRatio: "16/9", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* D-ID WebRTC video */}
          {!isTTSMode && (
            <video ref={videoRef} autoPlay playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
          )}

          {/* TTS modus: Amber avatar video */}
          {isTTSMode && (
            <video
              ref={amberVideoRef}
              loop muted playsInline
              style={{
                width: "100%", height: "100%", objectFit: "cover", borderRadius: 16,
                opacity: stage === "speaking" ? 1 : 0.35,
                transition: "opacity 0.4s",
              }}
              src={AMBER_VIDEO_URL}
            />
          )}

          {/* Idle/connecting placeholder */}
          {!isTTSMode && (stage === "idle" || stage === "connecting") && (
            <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <video
                src={AMBER_VIDEO_URL}
                muted playsInline
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
              />
              <div style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>Lisa · HR-Recruiter</div>
              {stage === "connecting" && (
                <div style={{ color: "#f59e0b", fontSize: 12 }}>Verbinding maken...</div>
              )}
            </div>
          )}

          {/* "Lisa denkt na..." indicator */}
          {stage === "processing" && !liveCaption && (
            <div style={{
              position: "absolute", bottom: 16, left: 16, right: 16,
              background: "rgba(0,0,0,0.65)", color: "#9ca3af",
              padding: "10px 14px", borderRadius: 10, fontSize: 13,
              backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ animation: "dot 1.2s ease-in-out infinite", animationDelay: "0ms" }}>●</span>
                <span style={{ animation: "dot 1.2s ease-in-out infinite", animationDelay: "300ms" }}>●</span>
                <span style={{ animation: "dot 1.2s ease-in-out infinite", animationDelay: "600ms" }}>●</span>
              </div>
              Lisa denkt na...
            </div>
          )}

          {/* Live ondertiteling */}
          {liveCaption && (
            <div style={{
              position: "absolute", bottom: 16, left: 16, right: 16,
              background: "rgba(0,0,0,0.82)", color: "#fff",
              padding: "10px 14px", borderRadius: 10, fontSize: 14, lineHeight: 1.5,
              backdropFilter: "blur(4px)",
              animation: "fadeIn 0.2s ease",
            }}>
              {liveCaption}
            </div>
          )}

          {/* Lisa label */}
          <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            Lisa — HR-Recruiter
          </div>

          {/* Spreekt / stil indicator */}
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: stage === "speaking" ? "#3b82f6" : "rgba(0,0,0,0.5)",
            color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            transition: "background 0.3s",
          }}>
            {stage === "speaking" ? "🎙 Spreekt" : "⏸ Stil"}
          </div>
        </div>

        {/* Rechter kolom: self-view + voortgang */}
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Self-view: kandidaat ziet zichzelf */}
          <div style={{
            flex: 1,
            background: "#1c1f26",
            borderRadius: 16,
            overflow: "hidden",
            minHeight: 160,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {/* Camera feed (altijd gemount, zichtbaar zodra stream actief is) */}
            <video
              ref={selfViewRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 16,
                transform: "scaleX(-1)", // spiegel (selfie-view)
                display: hasSelfView ? "block" : "none",
              }}
            />

            {/* Placeholder als camera nog niet actief is */}
            {!hasSelfView && (
              <div style={{ textAlign: "center", color: "#4b5563" }}>
                {stage === "listening" ? (
                  <>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "rgba(34,197,94,0.12)", border: "2px solid #22c55e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 8px",
                      animation: "micPulse 1.5s ease-in-out infinite",
                    }}>
                      <span style={{ fontSize: 24 }}>🎤</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>Luistert...</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>👤</div>
                    <div style={{ fontSize: 11 }}>Jij</div>
                  </>
                )}
              </div>
            )}

            {/* Mic overlay op self-view als aan het luisteren */}
            {hasSelfView && stage === "listening" && (
              <div style={{
                position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                background: "rgba(34,197,94,0.9)", color: "#fff",
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                animation: "fadeIn 0.3s ease",
              }}>
                🎤 Luistert
              </div>
            )}

            {/* Label */}
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: "rgba(0,0,0,0.6)", color: "#fff",
              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
            }}>
              Jij
            </div>
          </div>

          {/* Voortgang */}
          <div style={{ background: "#1c1f26", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Voortgang</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{questionNumber}/{totalQuestions}</span>
            </div>
            {ttsMode && (
              <div style={{ fontSize: 10, color: ttsMode === "openai" ? "#4ade80" : "#f59e0b", marginBottom: 6 }}>
                {ttsMode === "openai" ? "🎤 AI stem" : "⚠ Browser stem"}
              </div>
            )}
            <div style={{ background: "#374151", borderRadius: 6, height: 6, overflow: "hidden" }}>
              <div style={{ background: "#7C3AED", height: "100%", width: `${progressPct}%`, borderRadius: 6, transition: "width 0.5s ease" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Onderin: transcript + actieknoppen */}
      <div style={{ width: "100%", maxWidth: 900, background: "#1c1f26", borderRadius: 16, padding: 20 }}>
        {stage === "listening" && (
          <div style={{ marginBottom: 14, animation: "fadeIn 0.2s ease" }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>
              🎤 Jouw antwoord (live):
            </div>
            <div style={{ background: "#0f1117", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: transcript ? "#f9fafb" : "#4b5563", lineHeight: 1.6, minHeight: 50 }}>
              {transcript || "Spreek nu..."}
            </div>
            {/* Hint: automatische verwerking */}
            <div style={{ marginTop: 8, fontSize: 11, color: "#4b5563", textAlign: "center" }}>
              Wordt automatisch verwerkt na een korte stilte
            </div>
          </div>
        )}

        {stage === "error" && (
          <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 14 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          {stage === "idle" && (
            <button onClick={startInterview}
              style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 12, padding: "14px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              Interview starten
            </button>
          )}

          {/* Knop verborgen tijdens luisteren — auto-submit doet het werk.
              Enkel als noodknop: kleine subtiele link */}
          {stage === "listening" && (
            <button
              onClick={stopListeningAndAnswer}
              style={{
                background: "transparent",
                color: "#6b7280",
                border: "1px solid #374151",
                borderRadius: 10,
                padding: "8px 20px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Nu versturen
            </button>
          )}

          {(stage === "processing" || stage === "connecting") && (
            <div style={{ color: "#9ca3af", fontSize: 14, padding: "14px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ animation: "dot 1.2s ease-in-out infinite", animationDelay: "0ms" }}>●</span>
              <span style={{ animation: "dot 1.2s ease-in-out infinite", animationDelay: "300ms" }}>●</span>
              <span style={{ animation: "dot 1.2s ease-in-out infinite", animationDelay: "600ms" }}>●</span>
              Even geduld...
            </div>
          )}

          {stage === "error" && (
            <button onClick={() => { setStage("idle"); setErrorMsg(""); }}
              style={{ background: "#374151", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Opnieuw proberen
            </button>
          )}
        </div>

        {stage === "idle" && typeof window !== "undefined" && !window.SpeechRecognition && !window.webkitSpeechRecognition && (
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#f59e0b" }}>
            ⚠ Gebruik Google Chrome voor de beste spraakherkenning
          </div>
        )}
      </div>
    </div>
  );
}
