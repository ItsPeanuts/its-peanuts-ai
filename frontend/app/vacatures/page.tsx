"use client";

import { useCallback, useEffect, useState } from "react";
import { listVacancies, PublicVacancy } from "@/lib/api";
import VacancyCard from "@/components/VacancyCard";

export default function VacaturesPage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async (q?: string, loc?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listVacancies({ q, location: loc });
      setVacancies(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kon vacatures niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(query || undefined, location || undefined);
  };

  const handleReset = () => {
    setQuery("");
    setLocation("");
    load();
  };

  return (
    <main className="main">
      <div className="container">
        {/* Zoekbalk */}
        <section className="card">
          <div className="card-header">
            <h2>🔍 Zoek vacatures</h2>
            <p className="card-description">
              Vind jouw perfecte baan met AI matching
            </p>
          </div>
          <form onSubmit={handleSearch}>
            <div className="form-row">
              <div className="form-group">
                <label>Functie / Zoekwoord</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bijv. Developer, Manager..."
                />
              </div>
              <div className="form-group">
                <label>Locatie</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Bijv. Amsterdam, Remote..."
                />
              </div>
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                Zoeken
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {/* Vacaturelijst */}
        <section className="card">
          <div className="card-header">
            <h2>💼 Beschikbare vacatures</h2>
            <p className="card-description" id="jobsCount">
              {loading
                ? "Laden..."
                : `${vacancies.length} vacature${vacancies.length !== 1 ? "s" : ""} gevonden`}
            </p>
          </div>

          {error && (
            <div className="error-box" style={{ marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
              <p>⏳ Vacatures laden...</p>
            </div>
          ) : vacancies.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
              <p>Geen vacatures gevonden. Probeer een andere zoekopdracht.</p>
            </div>
          ) : (
            <div className="jobs-container">
              {vacancies.map((vacancy) => (
                <VacancyCard key={vacancy.id} vacancy={vacancy} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
