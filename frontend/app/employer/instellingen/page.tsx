"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { me, updateProfile, changePassword, deleteAccount } from "@/lib/api";
import { clearSession, getToken } from "@/lib/session";

export default function InstellingenPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Profiel opslaan
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [nameErr, setNameErr] = useState("");

  // Wachtwoord wijzigen
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  // Account verwijderen
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!token) { router.push("/employer/login"); return; }
    (async () => {
      try {
        const u = await me(token);
        setFullName(u.full_name);
        setEmail(u.email);
      } catch {
        clearSession();
        router.push("/employer/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !fullName.trim()) return;
    setNameSaving(true); setNameErr(""); setNameMsg("");
    try {
      await updateProfile(token, fullName.trim());
      setNameMsg("Naam opgeslagen!");
      setTimeout(() => setNameMsg(""), 3000);
    } catch (err: unknown) {
      setNameErr(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPwSaving(true); setPwErr(""); setPwMsg("");
    try {
      await changePassword(token, oldPw, newPw);
      setPwMsg("Wachtwoord gewijzigd!");
      setOldPw(""); setNewPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err: unknown) {
      setPwErr(err instanceof Error ? err.message : "Wijzigen mislukt");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!token || deleteConfirm !== email) return;
    setDeleteLoading(true);
    try {
      await deleteAccount(token);
      clearSession();
      router.push("/");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Verwijderen mislukt");
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center gap-4">
        <Link
          href="/employer"
          className="text-sm text-gray-500 hover:text-gray-700 no-underline flex items-center gap-1"
        >
          ← Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-sm font-semibold text-gray-900">Instellingen</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Profielgegevens */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Profielgegevens</h2>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">E-mailadres</label>
            <div className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 bg-gray-50">
              {email}
            </div>
          </div>

          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Volledige naam</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
              />
            </div>

            {nameErr && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-700 text-sm">{nameErr}</div>
            )}
            {nameMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-green-700 text-sm">{nameMsg}</div>
            )}

            <button
              type="submit"
              disabled={nameSaving}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition"
              style={{ background: "#7C3AED" }}
            >
              {nameSaving ? "Opslaan..." : "Naam opslaan"}
            </button>
          </form>
        </div>

        {/* Wachtwoord wijzigen */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Wachtwoord wijzigen</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Huidig wachtwoord</label>
              <input
                type="password"
                required
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nieuw wachtwoord</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Minimaal 8 tekens"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
              />
            </div>

            {pwErr && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-700 text-sm">{pwErr}</div>
            )}
            {pwMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-green-700 text-sm">{pwMsg}</div>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition"
              style={{ background: "#7C3AED" }}
            >
              {pwSaving ? "Opslaan..." : "Wachtwoord wijzigen"}
            </button>
          </form>
        </div>

        {/* Account verwijderen */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
          <h2 className="text-base font-bold text-red-700 mb-2">Account verwijderen</h2>
          <p className="text-sm text-gray-500 mb-4">
            Dit verwijdert je account en alle bijbehorende vacatures en sollicitaties permanent (GDPR). Dit kan niet ongedaan gemaakt worden.
          </p>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Typ je e-mailadres ter bevestiging: <span className="text-gray-900">{email}</span>
          </label>
          <input
            type="email"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={email}
            className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition mb-4"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== email || deleteLoading}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-40 transition"
          >
            {deleteLoading ? "Verwijderen..." : "Account definitief verwijderen"}
          </button>
        </div>

      </div>
    </div>
  );
}
