"use client";

/**
 * Virtuele AI Recruiter — Lisa 2.0
 *
 * Architectuur: full-duplex voice via OpenAI Realtime API
 *   Kandidaat audio → OpenAI Realtime → audio uit  (~300ms latency)
 *   Geen aparte STT / TTS / D-ID pipeline meer nodig.
 *
 * Activeren:
 *   1. Zet LISA_MAINTENANCE = false (hieronder)
 *   2. OPENAI_API_KEY staat al in .env op de server
 *   3. Optioneel: LISA_V2_VOICE (shimmer|alloy|nova|echo|fable|onyx)
 *
 * Anam AI Avatar (Lisa 2.1):
 *   Avatar: Astrid desk (fotorealistisch, lip-sync via audio passthrough)
 *   Audio flow: OpenAI Realtime (24kHz) → downsample 16kHz → Anam lip-sync
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getToken } from "@/lib/session";
import { createClient } from "@anam-ai/js-sdk";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";

const OPENAI_REALTIME_WS =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

const LISA_MAINTENANCE = false;

// Interview eindigt automatisch na dit aantal Lisa-beurten
const MAX_LISA_TURNS = 7;

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage =
  | "idle"        // Startknop zichtbaar
  | "connecting"  // Token ophalen + WS verbinden
  | "active"      // Gesprek bezig
  | "wrapping"    // Lisa sluit af (na MAX_LISA_TURNS)
  | "completed"   // Resultaatscherm
  | "error";      // Foutmelding

type Message = {
  role: "recruiter" | "candidate";
  content: string;
};

type InterviewResult = {
  score: number;
  summary: string;
  followup_scheduled: boolean;
  teams_join_url?: string;
  scheduled_at?: string;
};

// ── PCM16 audio helpers ───────────────────────────────────────────────────────

/** Float32 PCM → Int16 PCM (ArrayBuffer) */
function floatTo16BitPCM(floatData: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(floatData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < floatData.length; i++) {
    const clamped = Math.max(-1, Math.min(1, floatData[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buffer;
}

/** ArrayBuffer → base64 string */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** base64 → Float32Array (voor audio playback) */
function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const int16 = new Int16Array(binary.length / 2);
  for (let i = 0; i < int16.length; i++) {
    int16[i] = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
  }
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

/** Downsample Float32 van 24kHz naar 16kHz voor Anam AI (lineaire interpolatie) */
function downsample24to16(float32_24k: Float32Array): Float32Array {
  const ratio = 24000 / 16000; // 1.5
  const newLength = Math.floor(float32_24k.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = float32_24k[idx];
    const b = idx + 1 < float32_24k.length ? float32_24k[idx + 1] : a;
    result[i] = a + frac * (b - a);
  }
  return result;
}

/** Float32 → base64-encoded PCM16 (voor Anam sendAudioChunk) */
function float32ToBase64PCM16(float32: Float32Array): string {
  const pcm16 = floatTo16BitPCM(float32);
  const bytes = new Uint8Array(pcm16);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────

export default function VideoInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const appId = Number(params?.id);

  // ── Maintenance mode — zet LISA_MAINTENANCE = false om te activeren ──────────
  if (LISA_MAINTENANCE) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 12px" }}>
            Lisa wordt geüpgraded
          </h1>
          <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.7, marginBottom: 28 }}>
            We upgraden het virtuele interview naar een volledig nieuwe versie met realtime stemherkenning en een veel natuurlijker gesprek. Lisa 2.0 is snel beschikbaar.
          </p>
          <div style={{ background: "#f3f4f6", borderRadius: 12, padding: "14px 18px", marginBottom: 32, fontSize: 13, color: "#6b7280" }}>
            In de tussentijd kun je de tekst-chat met Lisa gewoon gebruiken via je sollicitatie.
          </div>
          <button
            onClick={() => router.back()}
            style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            Terug
          </button>
        </div>
      </div>
    );
  }

  // ── State ─────────────────────────────────────────────────────────────────────

  const [stage, setStage] = useState<Stage>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [lisaLiveText, setLisaLiveText] = useState(""); // streaming tekst
  const [candidateLiveText, setCandidateLiveText] = useState(""); // STT tekst
  const [lisaIsSpeaking, setLisaIsSpeaking] = useState(false);
  const [candidateIsSpeaking, setCandidateIsSpeaking] = useState(false);
  const [lisaTurnCount, setLisaTurnCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<InterviewResult | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────────

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const selfViewRef = useRef<HTMLVideoElement>(null);
  const nextPlayTimeRef = useRef(0);
  const messagesRef = useRef<Message[]>([]); // sync ref voor WebSocket handlers
  const lisaTurnRef = useRef(0);
  const currentLisaTranscriptRef = useRef(""); // lopend Lisa-transcript per beurt
  const lisaIsSpeakingRef = useRef(false); // sync ref — voorkomt phantom speech (mic gedempt terwijl Lisa praat)
  const responseDoneTimeRef = useRef(0); // timestamp van laatste response.done — beschermt Anam tegen phantom interrupts

  // Anam AI avatar refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anamClientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anamAudioStreamRef = useRef<any>(null);

  // ── Audio playback (PCM16 chunks van OpenAI) ─────────────────────────────────

  const enqueueAudio = (base64: string) => {
    const float32 = base64ToFloat32(base64);

    // Anam AI actief: stuur audio naar Anam voor lip-sync + audio output via <video>
    // Anam synchroniseert lip-bewegingen met audio-uitvoer — geen apart AudioContext nodig
    if (anamAudioStreamRef.current) {
      try {
        const downsampled = downsample24to16(float32);
        const b64pcm16 = float32ToBase64PCM16(downsampled);
        anamAudioStreamRef.current.sendAudioChunk(b64pcm16);
      } catch { /* avatar audio fout negeren — interview gaat door */ }
      return; // Anam handelt audio af via video element (niet muted)
    }

    // Fallback: geen Anam → speel audio af via AudioContext
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  };

  // ── Microfoon starten (PCM16 streaming naar OpenAI) ──────────────────────────

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      });
      micStreamRef.current = stream;

      // Self-view camera
      if (selfViewRef.current) {
        selfViewRef.current.srcObject = stream;
      }

      // AudioContext op 24kHz (OpenAI Realtime verwacht 24kHz PCM16)
      // TODO (upgrade): vervang ScriptProcessor door AudioWorklet voor betere performance
      const ctx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(ctx.destination);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        // Demp mic terwijl Lisa praat — voorkomt phantom speech door speaker feedback
        if (lisaIsSpeakingRef.current) return;
        const floatData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(floatData);
        wsRef.current.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: toBase64(pcm16),
        }));
      };
    } catch (err) {
      setErrorMsg("Microfoon toegang geweigerd. Sta microfoon toe en probeer opnieuw.");
      setStage("error");
    }
  };

  // ── WebSocket verbinding met OpenAI Realtime ──────────────────────────────────

  const connectWebSocket = (clientSecret: string) => {
    const ws = new WebSocket(OPENAI_REALTIME_WS, [
      "realtime",
      `openai-insecure-api-key.${clientSecret}`,
      "openai-beta.realtime-v1",
    ]);
    wsRef.current = ws;

    ws.onopen = () => {
      // Sessie is al geconfigureerd via backend /realtime-token
      // Geef Lisa een seintje om haar intro te starten
      ws.send(JSON.stringify({
        type: "response.create",
        response: { modalities: ["text", "audio"] },
      }));
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {

        case "session.created":
          setStage("active");
          break;

        case "response.created":
          setLisaIsSpeaking(true);
          lisaIsSpeakingRef.current = true;
          currentLisaTranscriptRef.current = "";
          setLisaLiveText("");
          break;

        case "response.audio.delta":
          // Audio chunk van Lisa — afspelen
          enqueueAudio(msg.delta as string);
          break;

        case "response.audio_transcript.delta":
          // Streaming tekst van Lisa
          currentLisaTranscriptRef.current += (msg.delta as string) || "";
          setLisaLiveText(currentLisaTranscriptRef.current);
          break;

        case "response.audio_transcript.done":
        case "response.text.done": {
          // Lisa's volledige beurt is klaar → toevoegen aan transcript
          const text = (msg.transcript || msg.text || currentLisaTranscriptRef.current) as string;
          if (text?.trim()) {
            const newMsg: Message = { role: "recruiter", content: text.trim() };
            const updated = [...messagesRef.current, newMsg];
            messagesRef.current = updated;
            setMessages([...updated]);
          }
          setLisaLiveText("");
          break;
        }

        case "response.done": {
          // Anam: meld einde spraak voor lip-sync stop
          try { anamAudioStreamRef.current?.endSequence(); } catch { /* negeer */ }
          responseDoneTimeRef.current = Date.now();

          // Wis OpenAI's audio input buffer — voorkomt dat resterende Anam-audio
          // door VAD als "user speech" wordt herkend
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
          }

          // Anam buffert audio intern — mic pas open NA buffer is afgespeeld,
          // anders pikt VAD de laatste Anam-audio op als "user speech" en
          // roept interruptPersona() aan → Lisa stopt midden in haar zin.
          if (anamAudioStreamRef.current) {
            setTimeout(() => {
              setLisaIsSpeaking(false);
              lisaIsSpeakingRef.current = false;
            }, 4000);
          } else {
            setLisaIsSpeaking(false);
            lisaIsSpeakingRef.current = false;
          }

          const newCount = lisaTurnRef.current + 1;
          lisaTurnRef.current = newCount;
          // Intro (beurt 1) niet meetellen in de voortgangsbalk
          setLisaTurnCount(Math.max(0, newCount - 1));

          // Na MAX_LISA_TURNS beurten: geef Lisa een seintje om af te sluiten
          if (newCount === MAX_LISA_TURNS) {
            setStage("wrapping");
            ws.send(JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [{
                  type: "input_text",
                  text: "[SYSTEEM: Sluit het interview nu vriendelijk af. Bedank de kandidaat en vertel wat de volgende stap is.]",
                }],
              },
            }));
            ws.send(JSON.stringify({
              type: "response.create",
              response: { modalities: ["text", "audio"] },
            }));
          } else if (newCount > MAX_LISA_TURNS) {
            // Lisa's afsluitbericht is klaar — sluit mic/ws maar laat Anam uitpraten
            // OpenAI genereert audio sneller dan realtime, dus Anam heeft
            // een groot buffer dat nog afgespeeld moet worden.
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.close(1000, "Interview beëindigd");
            }
            processorRef.current?.disconnect();
            micStreamRef.current?.getTracks().forEach((t) => t.stop());

            // Wacht ruim tot Anam klaar is met afspelen, dan pas scoren
            setTimeout(() => endInterview(), 15000);
          }
          break;
        }

        case "input_audio_buffer.speech_started": {
          setCandidateIsSpeaking(true);
          setCandidateLiveText("");

          // Guard: als Anam nog gebufferde audio afspeelt na response.done,
          // is dit phantom speech (speaker feedback) — NIET interrupten.
          const msSinceResponseDone = Date.now() - responseDoneTimeRef.current;
          if (msSinceResponseDone < 5000 && anamAudioStreamRef.current) {
            break; // phantom speech, negeren
          }

          // Echte barge-in: onderbreek lopende audio
          nextPlayTimeRef.current = audioCtxRef.current?.currentTime || 0;
          try { anamClientRef.current?.interruptPersona(); } catch { /* negeer */ }
          break;
        }

        case "input_audio_buffer.speech_stopped":
          setCandidateIsSpeaking(false);
          break;

        case "conversation.item.input_audio_transcription.completed": {
          // Kandidaat transcript klaar
          const transcript = (msg.transcript as string)?.trim();
          if (transcript) {
            const newMsg: Message = { role: "candidate", content: transcript };
            const updated = [...messagesRef.current, newMsg];
            messagesRef.current = updated;
            setMessages([...updated]);
            setCandidateLiveText("");
          }
          break;
        }

        case "error": {
          const errData = msg.error as Record<string, unknown>;
          setErrorMsg(`OpenAI fout: ${errData?.message || "Onbekende fout"}`);
          setStage("error");
          cleanup();
          break;
        }
      }
    };

    ws.onerror = () => {
      setErrorMsg("Verbindingsfout met Lisa. Controleer je internetverbinding.");
      setStage("error");
      cleanup();
    };

    ws.onclose = (e) => {
      if (stage !== "completed" && e.code !== 1000) {
        setErrorMsg("Verbinding verbroken. Probeer opnieuw.");
        setStage("error");
      }
    };
  };

  // ── Interview starten ─────────────────────────────────────────────────────────

  const startInterview = async () => {
    setStage("connecting");
    setErrorMsg("");
    setMessages([]);
    messagesRef.current = [];
    lisaTurnRef.current = 0;
    setLisaTurnCount(0);

    try {
      const token = getToken();

      // Haal OpenAI + Anam tokens parallel op
      const [realtimeRes, anamRes] = await Promise.all([
        fetch(`${BASE}/virtual-interview/session/${appId}/realtime-token`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE}/virtual-interview/session/${appId}/anam-token`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null), // Anam is optioneel — interview werkt ook zonder avatar
      ]);

      if (!realtimeRes.ok) {
        const err = await realtimeRes.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${realtimeRes.status}`);
      }
      const { client_secret } = await realtimeRes.json();

      // Anam avatar initialiseren (als token beschikbaar)
      if (anamRes?.ok) {
        try {
          const { session_token } = await anamRes.json();
          const anamClient = createClient(session_token, { disableInputAudio: true });
          anamClientRef.current = anamClient;
          await anamClient.streamToVideoElement("lisa-avatar-video");
          anamAudioStreamRef.current = anamClient.createAgentAudioInputStream({
            encoding: "pcm_s16le",
            sampleRate: 16000,
            channels: 1,
          });
        } catch (e) {
          console.warn("[Anam] Avatar init mislukt, interview gaat door zonder avatar:", e);
        }
      }

      await startMicrophone();
      connectWebSocket(client_secret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setErrorMsg(`Kan interview niet starten: ${msg}`);
      setStage("error");
    }
  };

  // ── Interview beëindigen + scoren ─────────────────────────────────────────────

  const endInterview = async () => {
    cleanup();
    setStage("connecting"); // loading state tijdens scoren

    try {
      const token = getToken();
      const res = await fetch(`${BASE}/virtual-interview/session/${appId}/v2-complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript: messagesRef.current }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: InterviewResult = await res.json();
      setResult(data);
      setStage("completed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setErrorMsg(`Score berekening mislukt: ${msg}`);
      setStage("error");
    }
  };

  // ── Opruimen ──────────────────────────────────────────────────────────────────

  const cleanup = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "Interview beëindigd");
    }
    processorRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    // Anam avatar stoppen
    try { anamClientRef.current?.stopStreaming(); } catch { /* negeer */ }
    processorRef.current = null;
    micStreamRef.current = null;
    audioCtxRef.current = null;
    anamClientRef.current = null;
    anamAudioStreamRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  // ── Resultaatscherm ───────────────────────────────────────────────────────────

  if (stage === "completed" && result) {
    const scoreColor = result.score >= 70 ? "#059669" : result.score >= 50 ? "#d97706" : "#dc2626";
    const scoreBg = result.score >= 70 ? "#d1fae5" : result.score >= 50 ? "#fef3c7" : "#fee2e2";
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
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: scoreBg, border: `4px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26, fontWeight: 900, color: scoreColor }}>
            {result.score}
          </div>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, background: "#f8fafc", borderRadius: 12, padding: "14px 16px", marginBottom: 24, textAlign: "left" }}>
            {result.summary}
          </p>
          {result.followup_scheduled && result.teams_join_url && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 16px", marginBottom: 24, textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1e40af", margin: "0 0 6px" }}>
                ✅ Vervolgafspraak ingepland
              </p>
              <a href={result.teams_join_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline" }}>
                Teams meeting openen →
              </a>
            </div>
          )}
          <button onClick={() => router.back()} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Terug naar sollicitatie
          </button>
        </div>
      </div>
    );
  }

  // ── Hoofd UI ──────────────────────────────────────────────────────────────────

  const isConnecting = stage === "connecting";
  const isActive = stage === "active" || stage === "wrapping";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f1117", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #1f2937" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#10b981" : "#374151", boxShadow: isActive ? "0 0 8px #10b981" : "none" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}>
            {isActive ? "Lisa is live" : isConnecting ? "Verbinding maken..." : "Lisa 2.0 Interview"}
          </span>
        </div>
        {isActive && (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {lisaTurnCount}/{MAX_LISA_TURNS} vragen
          </div>
        )}
      </div>

      {/* Video area */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: 20, maxWidth: 960, margin: "0 auto", width: "100%" }}>

        {/* Lisa avatar */}
        <div style={{ position: "relative", background: "#111827", borderRadius: 16, overflow: "hidden", minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Anam AI Avatar — lip-synced via audio passthrough */}
          <video
            id="lisa-avatar-video"
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isActive ? 1 : 0.4 }}
          />

          {/* Lisa speaking indicator */}
          {lisaIsSpeaking && (
            <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(124,58,237,0.85)", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite" }} />
              Lisa spreekt
            </div>
          )}

          {/* Live Lisa tekst */}
          {lisaLiveText && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "32px 16px 16px", fontSize: 14, lineHeight: 1.6 }}>
              {lisaLiveText}
            </div>
          )}

          {/* Idle overlay */}
          {stage === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎙</div>
                <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Klik op start om het interview te beginnen</p>
              </div>
            </div>
          )}
        </div>

        {/* Self-view + transcript kolom */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 200 }}>

          {/* Self-view */}
          <div style={{ background: "#111827", borderRadius: 12, overflow: "hidden", aspectRatio: "4/3", position: "relative" }}>
            <video
              ref={selfViewRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            {candidateIsSpeaking && (
              <div style={{ position: "absolute", bottom: 8, left: 8, width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            )}
            {!isActive && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", fontSize: 24 }}>
                👤
              </div>
            )}
          </div>

          {/* Voortgangsbalk */}
          {isActive && (
            <div style={{ background: "#1f2937", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Voortgang</div>
              <div style={{ background: "#374151", borderRadius: 4, height: 6 }}>
                <div style={{ background: "#7C3AED", borderRadius: 4, height: 6, width: `${Math.min(100, (lisaTurnCount / MAX_LISA_TURNS) * 100)}%`, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                {lisaTurnCount} van {MAX_LISA_TURNS}
              </div>
            </div>
          )}

          {/* Kandidaat live tekst */}
          {candidateLiveText && (
            <div style={{ background: "#1f2937", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#d1d5db", lineHeight: 1.5 }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Jij:</div>
              {candidateLiveText}
            </div>
          )}
        </div>
      </div>

      {/* Transcript scroll */}
      {messages.length > 0 && (
        <div style={{ maxWidth: 960, margin: "0 auto", width: "100%", padding: "0 20px 12px", maxHeight: 160, overflowY: "auto" }}>
          {messages.slice(-4).map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: m.role === "recruiter" ? "#a78bfa" : "#d1d5db", marginBottom: 6, lineHeight: 1.5 }}>
              <strong>{m.role === "recruiter" ? "Lisa" : "Jij"}:</strong> {m.content}
            </div>
          ))}
        </div>
      )}

      {/* Knoppen */}
      <div style={{ padding: "16px 24px 28px", display: "flex", gap: 12, justifyContent: "center", alignItems: "center", borderTop: "1px solid #1f2937" }}>
        {stage === "idle" && (
          <button
            onClick={startInterview}
            style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 12, padding: "14px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Interview starten
          </button>
        )}

        {isConnecting && (
          <div style={{ color: "#9ca3af", fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <span>●</span><span>●</span><span>●</span> Even geduld...
          </div>
        )}

        {isActive && (
          <button
            onClick={endInterview}
            style={{ background: "#374151", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: 12, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}
          >
            Interview beëindigen
          </button>
        )}

        {stage === "error" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 14 }}>
              {errorMsg}
            </div>
            <button
              onClick={() => { setStage("idle"); setErrorMsg(""); setMessages([]); messagesRef.current = []; }}
              style={{ background: "#374151", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}
            >
              Opnieuw proberen
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
