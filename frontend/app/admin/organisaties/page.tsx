"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getRole } from "@/lib/session";
import {
  getAdminOrganisations,
  createAdminOrganisation,
  deleteAdminOrganisation,
  getAdminUsers,
  patchUserOrganisation,
  AdminOrganisation,
  AdminUser,
} from "@/lib/api";

export default function AdminOrganisatiesPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<AdminOrganisation[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingUser, setSavingUser] = useState<number | null>(null);

  async function load() {
    const token = getToken();
    if (!token || getRole() !== "admin") {
      router.push("/");
      return;
    }
    try {
      const [orgData, userData] = await Promise.all([
        getAdminOrganisations(token),
        getAdminUsers(token),
      ]);
      setOrgs(orgData);
      setUsers(userData.filter((u) => u.role === "employer"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const token = getToken()!;
      await createAdminOrganisation(token, newOrgName.trim());
      setNewOrgName("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(orgId: number) {
    if (!confirm("Organisatie verwijderen? Leden worden ontkoppeld.")) return;
    try {
      const token = getToken()!;
      await deleteAdminOrganisation(token, orgId);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleOrgChange(userId: number, value: string) {
    const orgId = value === "" ? null : Number(value);
    setSavingUser(userId);
    try {
      const token = getToken()!;
      await patchUserOrganisation(token, userId, orgId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, org_id: orgId } : u))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingUser(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laden...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Admin panel
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Organisaties</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Nieuwe organisatie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Nieuwe organisatie</h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Naam organisatie"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Aanmaken..." : "Aanmaken"}
            </button>
          </form>
        </div>

        {/* Organisatie lijst */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">
            Organisaties ({orgs.length})
          </h2>
          {orgs.length === 0 ? (
            <p className="text-gray-400 text-sm">Nog geen organisaties.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Naam</th>
                  <th className="pb-2 font-medium">Leden</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-medium text-gray-800">{org.name}</td>
                    <td className="py-2 text-gray-500">{org.user_count}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Verwijder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Gebruikers — org koppeling */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            Werkgevers koppelen ({users.length})
          </h2>
          {users.length === 0 ? (
            <p className="text-gray-400 text-sm">Geen werkgevers gevonden.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Werkgever</th>
                  <th className="pb-2 font-medium">Organisatie</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2">
                      <div className="font-medium text-gray-800">{user.full_name}</div>
                      <div className="text-gray-400 text-xs">{user.email}</div>
                    </td>
                    <td className="py-2">
                      <select
                        value={user.org_id ?? ""}
                        onChange={(e) => handleOrgChange(user.id, e.target.value)}
                        disabled={savingUser === user.id}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">— Geen organisatie —</option>
                        {orgs.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                      {savingUser === user.id && (
                        <span className="ml-2 text-xs text-gray-400">Opslaan...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
