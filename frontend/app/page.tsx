"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";

const CATEGORIES = [
  { icon: "💻", label: "IT & Software",    count: 142, bg: "#EFF6FF", color: "#1D4ED8" },
  { icon: "📊", label: "Finance",           count: 89,  bg: "#F0FDF4", color: "#15803D" },
  { icon: "🏥", label: "Healthcare",        count: 67,  bg: "#FFF1F2", color: "#BE123C" },
  { icon: "🎨", label: "Design",            count: 54,  bg: "#FAF5FF", color: "#7E22CE" },
  { icon: "📱", label: "Marketing",         count: 98,  bg: "#FFF7ED", color: "#C2410C" },
  { icon: "🏗️", label: "Engineering",      count: 113, bg: "#FEFCE8", color: "#A16207" },
  { icon: "📦", label: "Logistics",         count: 76,  bg: "#ECFEFF", color: "#0E7490" },
  { icon: "👥", label: "HR & Recruitment",  count: 45,  bg: "#FDF4FF", color: "#A21CAF" },
];

const COMPANIES = [
  { name: "Google",    abbr: "GG", bg: "#EFF6FF", color: "#1D4ED8" },
  { name: "Microsoft", abbr: "MS", bg: "#F0F9FF", color: "#0369A1" },
  { name: "Coolblue",  abbr: "CB", bg: "#EFF6FF", color: "#1E40AF" },
  { name: "Booking",   abbr: "BK", bg: "#ECFEFF", color: "#0E7490" },
  { name: "ASML",      abbr: "AS", bg: "#F0FDF4", color: "#15803D" },
  { name: "Philips",   abbr: "PH", bg: "#EFF6FF", color: "#2563EB" },
];

const ARTICLES = [
  {
    tag: "Carrière tips",
    title: "Hoe AI je sollicitatie naar het volgende niveau tilt",
    excerpt: "Ontdek hoe kunstmatige intelligentie je helpt de perfecte baan te vinden.",
    date: "26 feb 2025",
    bg: "#0DA89E",
  },
  {
    tag: "CV schrijven",
    title: "5 dingen die recruiters zien voordat ze je CV lezen",
    excerpt: "Kleine details maken het verschil. Wij zetten de meest gemaakte fouten op een rij.",
    date: "20 feb 2025",
    bg: "#F97316",
  },
  {
    tag: "Interview prep",
    title: "Veelgestelde interviewvragen & hoe je ze beantwoordt",
    excerpt: "Bereid je voor op elk interview met bewezen antwoordstrategieën.",
    date: "14 feb 2025",
    bg: "#7C3AED",
  },
];

const CARD_COLORS = ["#0DA89E","#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#6366F1","#EF4444"];
const getColor = (id: number) => CARD_COLORS[id % CARD_COLORS.length];
const getInitials = (t: string) => t.split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()??"").join("");

export default function HomePage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [query, setQuery]     = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => { listVacancies().then(setVacancies).catch(() => {}); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (query)    p.set("q", query);
    if (location) p.set("location", location);
    window.location.href = `/vacatures?${p.toString()}`;
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        background: "linear-gradient(135deg, #0D1B38 0%, #102347 50%, #0D1B38 100%)",
        padding: "80px 0 60px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* bg decorations */}
        <div style={{ position:"absolute", top:"-80px", right:"-80px", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(13,168,158,0.15) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:"-60px", left:"-60px", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)" }} />

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px", position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.08)", borderRadius:100, padding:"6px 16px", marginBottom:24 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#4ADE80", display:"inline-block" }} />
            <span style={{ color:"#86EFAC", fontSize:13, fontWeight:600 }}>AI-powered recruitment platform</span>
          </div>

          <h1 style={{ fontSize:56, fontWeight:800, color:"white", lineHeight:1.1, margin:"0 0 16px", letterSpacing:"-1px" }}>
            <span style={{ color:"#2DD4BF" }}>
              {vacancies.length > 0 ? `${vacancies.length.toLocaleString("nl-NL")}` : "14.780"}
            </span>{" "}
            Vacatures<br />Voor Jou
          </h1>
          <p style={{ color:"#94A3B8", fontSize:17, marginBottom:32, maxWidth:520, lineHeight:1.6 }}>
            Vind jouw perfecte baan met AI-matching. Upload je CV en ontvang direct een persoonlijke matchscore.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{
            background:"white",
            borderRadius:14,
            padding:6,
            display:"flex",
            gap:8,
            maxWidth:680,
            boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ flex:1, position:"relative" }}>
              <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, color:"#9CA3AF" }} fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Functietitel, trefwoord..."
                style={{ width:"100%", paddingLeft:36, paddingRight:12, paddingTop:12, paddingBottom:12, border:"none", outline:"none", fontSize:14, color:"#1a202c", background:"transparent" }}
              />
            </div>
            <div style={{ width:180, position:"relative", borderLeft:"1px solid #F1F5F9" }}>
              <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:16, height:16 }} fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input type="text" value={location} onChange={e=>setLocation(e.target.value)}
                placeholder="Locatie..."
                style={{ width:"100%", paddingLeft:36, paddingRight:12, paddingTop:12, paddingBottom:12, border:"none", outline:"none", fontSize:14, color:"#1a202c", background:"transparent" }}
              />
            </div>
            <button type="submit" style={{
              background:"#F97316", color:"white", border:"none", borderRadius:10,
              padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
            }}>
              Zoeken
            </button>
          </form>

          {/* Stats */}
          <div style={{ display:"flex", gap:32, marginTop:28 }}>
            {[
              { n: vacancies.length > 0 ? `${vacancies.length}+` : "14.780+", label: "Vacatures" },
              { n: "200+", label: "Bedrijven" },
              { n: "5.000+", label: "Kandidaten" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:24, fontWeight:800, color:"white" }}>{s.n}</div>
                <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORIEËN ═══════════ */}
      <section style={{ background:"white", padding:"56px 0", borderBottom:"1px solid #F1F5F9" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:0 }}>Verken meer vacatures</h2>
              <p style={{ color:"#64748B", fontSize:14, margin:"6px 0 0" }}>Kies een categorie die bij je past</p>
            </div>
            <Link href="/vacatures" style={{ fontSize:13, fontWeight:700, color:"#0DA89E", textDecoration:"none" }}>
              Alle categorieën →
            </Link>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16 }}>
            {CATEGORIES.map(cat => (
              <Link key={cat.label} href={`/vacatures?q=${encodeURIComponent(cat.label)}`}
                style={{ display:"flex", alignItems:"center", gap:12, padding:16, borderRadius:12, border:"1px solid #F1F5F9", textDecoration:"none", transition:"all 0.15s", cursor:"pointer", background:"white" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor="#0DA89E", e.currentTarget.style.boxShadow="0 2px 12px rgba(13,168,158,0.12)")}
                onMouseLeave={e=>(e.currentTarget.style.borderColor="#F1F5F9", e.currentTarget.style.boxShadow="none")}
              >
                <div style={{ width:44, height:44, borderRadius:10, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{cat.label}</div>
                  <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{cat.count} vacatures</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ LAATSTE VACATURES ═══════════ */}
      <section style={{ background:"#F8FAFC", padding:"56px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:0 }}>Laatste vacatures</h2>
              <p style={{ color:"#64748B", fontSize:14, margin:"6px 0 0" }}>Vers binnen — solliciteer als eerste</p>
            </div>
            <Link href="/vacatures" style={{ fontSize:13, fontWeight:700, color:"#0DA89E", textDecoration:"none" }}>
              Alle vacatures →
            </Link>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {vacancies.length === 0
              ? [...Array(4)].map((_,i) => (
                <div key={i} style={{ background:"white", borderRadius:14, border:"1px solid #F1F5F9", padding:20 }}>
                  <div style={{ display:"flex", gap:14 }}>
                    <div style={{ width:48, height:48, background:"#F1F5F9", borderRadius:10, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ height:14, background:"#F1F5F9", borderRadius:6, width:"70%", marginBottom:8 }} />
                      <div style={{ height:11, background:"#F8FAFC", borderRadius:6, width:"50%" }} />
                    </div>
                  </div>
                </div>
              ))
              : vacancies.slice(0,6).map(v => (
                <Link key={v.id} href={`/vacatures/${v.id}`}
                  style={{ display:"flex", gap:14, alignItems:"flex-start", background:"white", borderRadius:14, border:"1px solid #F1F5F9", padding:20, textDecoration:"none", transition:"all 0.15s" }}
                  onMouseEnter={e=>(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)", e.currentTarget.style.borderColor="#0DA89E")}
                  onMouseLeave={e=>(e.currentTarget.style.boxShadow="none", e.currentTarget.style.borderColor="#F1F5F9")}
                >
                  <div style={{ width:48, height:48, borderRadius:10, background:getColor(v.id), display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:14, flexShrink:0 }}>
                    {getInitials(v.title)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:"#0F172A", fontSize:14, lineHeight:1.3, marginBottom:3 }}>{v.title}</div>
                    <div style={{ fontSize:12, color:"#64748B", marginBottom:8 }}>{v.location || "Locatie onbekend"}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {v.hours_per_week && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:100, background:"#E8F8F7", color:"#0DA89E", fontWeight:600 }}>{v.hours_per_week}u</span>}
                      {v.salary_range && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:100, background:"#F0FDF4", color:"#15803D", fontWeight:600 }}>{v.salary_range}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:"#94A3B8", flexShrink:0 }}>
                    {new Date(v.created_at).toLocaleDateString("nl-NL",{day:"numeric",month:"short"})}
                  </div>
                </Link>
              ))
            }
          </div>
        </div>
      </section>

      {/* ═══════════ TOP BEDRIJVEN ═══════════ */}
      <section style={{ background:"white", padding:"56px 0", borderTop:"1px solid #F1F5F9" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px" }}>
          <div style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:0 }}>Top IT bedrijven</h2>
            <p style={{ color:"#64748B", fontSize:14, margin:"6px 0 0" }}>Werken bij de beste werkgevers</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:16 }}>
            {COMPANIES.map(c => (
              <div key={c.name}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 12px", borderRadius:14, border:"1px solid #F1F5F9", cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor="#0DA89E", e.currentTarget.style.boxShadow="0 2px 12px rgba(13,168,158,0.1)")}
                onMouseLeave={e=>(e.currentTarget.style.borderColor="#F1F5F9", e.currentTarget.style.boxShadow="none")}
              >
                <div style={{ width:52, height:52, borderRadius:12, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:c.color, marginBottom:10 }}>
                  {c.abbr}
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA BANNER ═══════════ */}
      <section style={{
        background:"linear-gradient(135deg, #0DA89E 0%, #0891B2 100%)",
        padding:"64px 0",
        position:"relative",
        overflow:"hidden",
      }}>
        <div style={{ position:"absolute", right:80, top:"-60px", width:280, height:280, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.15)" }} />
        <div style={{ position:"absolute", right:160, bottom:"-40px", width:180, height:180, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.1)" }} />
        <div style={{ position:"absolute", right:40, bottom:"20px", width:100, height:100, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.08)" }} />

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative", zIndex:1 }}>
          <div style={{ maxWidth:540 }}>
            <h2 style={{ fontSize:34, fontWeight:800, color:"white", margin:"0 0 12px", lineHeight:1.2 }}>
              Bouw een sterk profiel
            </h2>
            <p style={{ color:"rgba(255,255,255,0.8)", fontSize:15, lineHeight:1.7, marginBottom:28 }}>
              Upload je CV, laat AI je profiel optimaliseren en maak indruk op recruiters — nog vóór het eerste gesprek.
            </p>
            <div style={{ display:"flex", gap:12 }}>
              <Link href="/candidate/login" style={{
                background:"#F97316", color:"white", padding:"13px 28px", borderRadius:12,
                textDecoration:"none", fontSize:14, fontWeight:700, display:"inline-block",
              }}>
                Start gratis
              </Link>
              <Link href="/vacatures" style={{
                background:"rgba(255,255,255,0.15)", color:"white", padding:"13px 28px", borderRadius:12,
                textDecoration:"none", fontSize:14, fontWeight:600, display:"inline-block",
              }}>
                Bekijk vacatures
              </Link>
            </div>
          </div>

          {/* Decoratieve score bars */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:10, opacity:0.9 }}>
            {[{ h:70, s:85 }, { h:90, s:92 }, { h:60, s:78 }, { h:100, s:96 }, { h:75, s:88 }].map((b,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.9)", fontWeight:700, marginBottom:4 }}>{b.s}%</div>
                <div style={{ width:32, borderRadius:"4px 4px 0 0", background:"rgba(255,255,255,0.3)", height:`${b.h}px` }} />
              </div>
            ))}
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginLeft:6, lineHeight:1.4 }}>AI<br/>match</div>
          </div>
        </div>
      </section>

      {/* ═══════════ ARTICLES ═══════════ */}
      <section style={{ background:"#F8FAFC", padding:"56px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px" }}>
          <div style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:0 }}>Career advices van HR-experts</h2>
            <p style={{ color:"#64748B", fontSize:14, margin:"6px 0 0" }}>Tips en inzichten om verder te komen</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:20 }}>
            {ARTICLES.map(a => (
              <div key={a.title}
                style={{ background:"white", borderRadius:16, overflow:"hidden", border:"1px solid #F1F5F9", cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e=>(e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.08)")}
                onMouseLeave={e=>(e.currentTarget.style.boxShadow="none")}
              >
                <div style={{ background:a.bg, height:140, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.15)" }} />
                  <span style={{ background:"rgba(255,255,255,0.2)", color:"white", fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:100 }}>
                    {a.tag}
                  </span>
                </div>
                <div style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:"#0F172A", margin:"0 0 8px", lineHeight:1.4 }}>{a.title}</h3>
                  <p style={{ fontSize:12, color:"#64748B", lineHeight:1.6, margin:"0 0 14px" }}>{a.excerpt}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, color:"#94A3B8" }}>{a.date}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#0DA89E" }}>Lees meer →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
