"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Geen verificatietoken gevonden in de link.");
      return;
    }

    fetch(`${BASE}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.email || "");
        } else {
          setStatus("error");
          setMessage(data.detail || "Verificatie mislukt.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Kon de server niet bereiken. Probeer het later opnieuw.");
      });
  }, [token]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      {status === "loading" && (
        <>
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">E-mailadres verifiëren...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ background: "#F3E8FF" }}
          >
            ✓
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">E-mail bevestigd!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Je account is geactiveerd. Je kunt nu inloggen.
          </p>
          <button
            onClick={() => router.push("/employer/login")}
            className="w-full py-3 rounded-xl text-white font-bold text-sm"
            style={{ background: "#7C3AED" }}
          >
            Inloggen
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-2xl">
            ✗
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verificatie mislukt</h1>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Link
            href="/employer/login"
            className="block w-full py-3 rounded-xl text-white font-bold text-sm text-center no-underline"
            style={{ background: "#7C3AED" }}
          >
            Terug naar inloggen
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: "#7C3AED" }}
            >
              V
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-lg leading-tight">VorzaIQ</div>
              <div className="text-xs text-gray-400">Werkgeversportaal</div>
            </div>
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
