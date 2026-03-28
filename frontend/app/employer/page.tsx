"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createVacancy, employerVacancies, me, generateVacancy,
  getEmployerApplications, updateApplicationStatus,
  getChatMessages, scheduleInterview, syncCandidateToCRM,
  listIntakeQuestions, createIntakeQuestion, deleteIntakeQuestion, getApplicationAnswers,
  getVideoInterviewSession, createPromotionCheckout, updateVacancyStatus, updateVacancy, deleteVacancy,
  getTeamMembers, addTeamMember, removeTeamMember,
  ApplicationWithCandidate, ChatMessage, InterviewSession, IntakeQuestionOut, IntakeAnswerOut,
  VideoInterviewSession, TeamMember, AddTeamMemberResponse,
} from "@/lib/api";
import { clearSession, getRole, getToken } from "@/lib/session";

type Vacancy = {
  id: number;
  title: string;
  location?: string | null;
  hours_per_week?: string | null;
  salary_range?: string | null;
  description?: string | null;
  status?: string | null;           // "concept" | "actief" | "offline"
  employment_type?: string | null;
  work_location?: string | null;
  interview_type?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string[] }> = {
  applied:     { label: "Nieuw",        color: "#6b7280", bg: "#f3f4f6", next: ["shortlisted", "rejected"] },
  shortlisted: { label: "Geselecteerd", color: "#1d4ed8", bg: "#dbeafe", next: ["interview", "rejected"] },
  interview:   { label: "Interview",    color: "#d97706", bg: "#fef3c7", next: ["hired", "rejected"] },
  hired:       { label: "Aangenomen",   color: "#059669", bg: "#d1fae5", next: [] },
  rejected:    { label: "Afgewezen",    color: "#dc2626", bg: "#fee2e2", next: [] },
};

const AVATAR_COLORS = ["bg-purple-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">Geen score</span>;
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function EmployerPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userPlan, setUserPlan] = useState<string>("gratis");
  const [userTrialEndsAt, setUserTrialEndsAt] = useState<string | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<number | null>(null);
  const [view, setView] = useState<"vacancies" | "applications" | "new-vacancy" | "questions" | "analytics" | "team">("vacancies");

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamErr, setTeamErr] = useState("");
  const [teamMsg, setTeamMsg] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberResult, setNewMemberResult] = useState<AddTeamMemberResponse | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Chat transcript state
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState<Record<number, boolean>>({});
  const [chatOpen, setChatOpen] = useState<Record<number, boolean>>({});

  // Interview modal state
  const [interviewModal, setInterviewModal] = useState<ApplicationWithCandidate | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("10:00");
  const [interviewDuration, setInterviewDuration] = useState(30);
  const [interviewType, setInterviewType] = useState<"teams" | "phone" | "in_person">("teams");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [scheduledInterviews, setScheduledInterviews] = useState<Record<number, InterviewSession>>({});

  // CRM sync state
  const [crmSyncing, setCrmSyncing] = useState<Record<number, boolean>>({});
  const [crmSynced, setCrmSynced] = useState<Record<number, boolean>>({});

  // Create vacancy form
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [salary, setSalary] = useState("");
  const [desc, setDesc] = useState("");
  const [vacancyInterviewType, setVacancyInterviewType] = useState<"chat" | "virtual" | "both">("both");
  const [vacancyEmploymentType, setVacancyEmploymentType] = useState("");
  const [vacancyWorkLocation, setVacancyWorkLocation] = useState("");
  const [creating, setCreating] = useState(false);

  // AI vacature generator
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiWebsite, setAiWebsite] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Intakevragen state
  const [questions, setQuestions] = useState<IntakeQuestionOut[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsVacancyId, setQuestionsVacancyId] = useState<number | null>(null);
  const [newQType, setNewQType] = useState("text");
  const [newQText, setNewQText] = useState("");
  const [newQOptions, setNewQOptions] = useState("");
  const [qSaving, setQSaving] = useState(false);

  // Intake antwoorden per sollicitatie
  const [appAnswers, setAppAnswers] = useState<Record<number, { question: string; answer: string }[]>>({});
  const [appAnswersLoading, setAppAnswersLoading] = useState<Record<number, boolean>>({});
  const [appAnswersOpen, setAppAnswersOpen] = useState<Record<number, boolean>>({});

  // Video interview per sollicitatie
  const [videoInterviews, setVideoInterviews] = useState<Record<number, VideoInterviewSession | null>>({});
  const [videoInterviewLoading, setVideoInterviewLoading] = useState<Record<number, boolean>>({});
  const [videoInterviewOpen, setVideoInterviewOpen] = useState<Record<number, boolean>>({});

  // Promotie modal
  const [promoVacancy, setPromoVacancy] = useState<Vacancy | null>(null);
  const [promoDays, setPromoDays] = useState<7 | 14 | 30>(7);
  const [promoLoading, setPromoLoading] = useState(false);

  // Vacature status toggling
  const [statusUpdating, setStatusUpdating] = useState<Record<number, boolean>>({});

  // Vacature verwijderen
  const [deleteVacancyId, setDeleteVacancyId] = useState<number | null>(null);
  const [deleteVacancyTitle, setDeleteVacancyTitle] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Overflow actiemenu per vacaturekaart
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Vacature bewerken modal
  const [editVacancy, setEditVacancy] = useState<Vacancy | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("");
  const [editWorkLocation, setEditWorkLocation] = useState("");
  const [editInterviewType, setEditInterviewType] = useState("both");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!token) { router.push("/employer/login"); return; }
    if (role && role !== "employer" && role !== "admin") { router.push("/candidate"); return; }

    (async () => {
      try {
        const [u, vacs] = await Promise.all([me(token), employerVacancies(token)]);
        setUserEmail(u.email || "");
        setUserName(u.full_name || "");
        setUserPlan(u.plan || "gratis");
        setUserTrialEndsAt((u as { trial_ends_at?: string | null }).trial_ends_at ?? null);
        setVacancies(vacs || []);
        const apps = await getEmployerApplications(token);
        setApplications(apps);
      } catch {
        clearSession();
        router.push("/employer/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, role, token]);

  useEffect(() => {
    if (openMenuId === null) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById(`vmenu-${openMenuId}`);
      if (el && !el.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  function handleNewVacancy() {
    if (userPlan === "gratis" && vacancies.length >= 1) {
      setShowUpgradeModal(true);
    } else {
      setView("new-vacancy");
    }
  }

  async function loadApplications(vacancyId?: number) {
    try {
      const apps = await getEmployerApplications(token, vacancyId);
      setApplications(apps);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Kon sollicitaties niet laden");
    }
  }

  async function loadTeam() {
    setTeamLoading(true);
    try {
      const members = await getTeamMembers(token!);
      setTeamMembers(members);
    } catch (e: unknown) {
      setTeamErr(e instanceof Error ? e.message : "Team laden mislukt");
    } finally {
      setTeamLoading(false);
    }
  }

  async function handleAddTeamMember(e: React.FormEvent) {
    e.preventDefault();
    setTeamErr(""); setTeamMsg(""); setNewMemberResult(null);
    setAddingMember(true);
    try {
      const result = await addTeamMember(token!, newMemberName, newMemberEmail);
      setNewMemberResult(result);
      setNewMemberName(""); setNewMemberEmail("");
      await loadTeam();
    } catch (e: unknown) {
      setTeamErr(e instanceof Error ? e.message : "Toevoegen mislukt");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveTeamMember(userId: number) {
    if (!confirm("Teamlid verwijderen? Hun account wordt verwijderd.")) return;
    try {
      await removeTeamMember(token!, userId);
      await loadTeam();
    } catch (e: unknown) {
      setTeamErr(e instanceof Error ? e.message : "Verwijderen mislukt");
    }
  }

  async function handleVacancyClick(v: Vacancy) {
    setSelectedVacancy(v.id);
    setView("applications");
    await loadApplications(v.id);
  }

  async function handleVacancyStatus(vacancyId: number, newStatus: "concept" | "actief" | "offline") {
    setStatusUpdating((prev) => ({ ...prev, [vacancyId]: true }));
    try {
      await updateVacancyStatus(token, vacancyId, newStatus);
      setVacancies((prev) => prev.map((v) => v.id === vacancyId ? { ...v, status: newStatus } : v));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Status bijwerken mislukt");
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [vacancyId]: false }));
    }
  }

  function openEditVacancy(v: Vacancy) {
    setEditVacancy(v);
    setEditTitle(v.title || "");
    setEditLocation(v.location || "");
    setEditHours(v.hours_per_week || "");
    setEditSalary(v.salary_range || "");
    setEditDesc(v.description || "");
    setEditEmploymentType(v.employment_type || "");
    setEditWorkLocation(v.work_location || "");
    setEditInterviewType(v.interview_type || "both");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editVacancy) return;
    setEditSaving(true);
    try {
      const updated = await updateVacancy(token!, editVacancy.id, {
        title: editTitle,
        location: editLocation,
        hours_per_week: editHours,
        salary_range: editSalary,
        description: editDesc,
        employment_type: editEmploymentType,
        work_location: editWorkLocation,
        interview_type: editInterviewType,
      });
      setVacancies((prev) => prev.map((v) =>
        v.id === editVacancy.id ? { ...v, ...updated, title: editTitle, location: editLocation, hours_per_week: editHours, salary_range: editSalary, description: editDesc, employment_type: editEmploymentType, work_location: editWorkLocation, interview_type: editInterviewType } : v
      ));
      setEditVacancy(null);
      setMsg("Vacature opgeslagen.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteVacancy() {
    if (!deleteVacancyId || !token) return;
    setDeleteLoading(true);
    try {
      await deleteVacancy(token, deleteVacancyId);
      setVacancies((prev) => prev.filter((v) => v.id !== deleteVacancyId));
      setDeleteVacancyId(null);
      setMsg("Vacature verwijderd.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verwijderen mislukt");
      setDeleteVacancyId(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleStatusChange(appId: number, newStatus: string) {
    try {
      await updateApplicationStatus(token, appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      setMsg(`Status bijgewerkt naar "${STATUS_CONFIG[newStatus]?.label ?? newStatus}"`);
      setTimeout(() => setMsg(""), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Status bijwerken mislukt");
    }
  }

  async function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewModal || !token) return;
    setInterviewSaving(true);
    try {
      const scheduledAt = `${interviewDate}T${interviewTime}:00`;
      const session = await scheduleInterview(token, {
        application_id: interviewModal.id,
        scheduled_at: scheduledAt,
        duration_minutes: interviewDuration,
        interview_type: interviewType,
        notes: interviewNotes || undefined,
      });
      setScheduledInterviews((prev) => ({ ...prev, [interviewModal.id]: session }));
      setMsg(
        interviewType === "teams" && session.teams_join_url
          ? "Teams gesprek ingepland! Meeting link verstuurd naar kandidaat."
          : "Gesprek ingepland!"
      );
      setInterviewModal(null);
      setInterviewDate("");
      setInterviewTime("10:00");
      setInterviewNotes("");
      setTimeout(() => setMsg(""), 4000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Inplannen mislukt");
    } finally {
      setInterviewSaving(false);
    }
  }

  async function handleCrmSync(app: ApplicationWithCandidate) {
    if (!token) return;
    setCrmSyncing((prev) => ({ ...prev, [app.candidate_id]: true }));
    try {
      await syncCandidateToCRM(token, app.candidate_id, app.id);
      setCrmSynced((prev) => ({ ...prev, [app.candidate_id]: true }));
      setMsg(`${app.candidate_name} gesynchroniseerd naar CRM.`);
      setTimeout(() => setMsg(""), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "CRM sync mislukt");
    } finally {
      setCrmSyncing((prev) => ({ ...prev, [app.candidate_id]: false }));
    }
  }

  async function toggleChat(appId: number) {
    const nowOpen = !chatOpen[appId];
    setChatOpen((prev) => ({ ...prev, [appId]: nowOpen }));
    if (nowOpen && !chatMessages[appId]) {
      setChatLoading((prev) => ({ ...prev, [appId]: true }));
      try {
        const msgs = await getChatMessages(token!, appId);
        setChatMessages((prev) => ({ ...prev, [appId]: msgs }));
      } catch {
        setChatMessages((prev) => ({ ...prev, [appId]: [] }));
      } finally {
        setChatLoading((prev) => ({ ...prev, [appId]: false }));
      }
    }
  }

  async function toggleVideoInterview(appId: number) {
    const nowOpen = !videoInterviewOpen[appId];
    setVideoInterviewOpen((prev) => ({ ...prev, [appId]: nowOpen }));
    if (nowOpen && videoInterviews[appId] === undefined) {
      setVideoInterviewLoading((prev) => ({ ...prev, [appId]: true }));
      try {
        const session = await getVideoInterviewSession(token!, appId);
        setVideoInterviews((prev) => ({ ...prev, [appId]: session }));
      } catch {
        setVideoInterviews((prev) => ({ ...prev, [appId]: null }));
      } finally {
        setVideoInterviewLoading((prev) => ({ ...prev, [appId]: false }));
      }
    }
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || !token) return;
    setAiGenerating(true);
    setErr("");
    try {
      const v = await generateVacancy(token, aiPrompt, aiWebsite || undefined);
      setTitle(v.title);
      setLocation(v.location);
      setHours(v.hours_per_week);
      setSalary(v.salary_range);
      setDesc(v.description);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "AI genereren mislukt");
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleOpenQuestions(v: Vacancy) {
    setQuestionsVacancyId(v.id);
    setSelectedVacancy(v.id);
    setView("questions");
    setQuestionsLoading(true);
    try {
      const qs = await listIntakeQuestions(token!, v.id);
      setQuestions(qs);
    } catch {
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function handleAddQuestion() {
    if (!newQText.trim() || !questionsVacancyId || !token) return;
    setQSaving(true);
    try {
      const opts = newQOptions ? newQOptions.split(",").map((s) => s.trim()).filter(Boolean) : [];
      await createIntakeQuestion(token, questionsVacancyId, {
        question: newQText.trim(),
        qtype: newQType,
        options_json: opts.length ? JSON.stringify(opts) : undefined,
      });
      const qs = await listIntakeQuestions(token, questionsVacancyId);
      setQuestions(qs);
      setNewQText("");
      setNewQOptions("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Vraag toevoegen mislukt");
    } finally {
      setQSaving(false);
    }
  }

  async function handleDeleteQuestion(qId: number) {
    if (!questionsVacancyId || !token) return;
    try {
      await deleteIntakeQuestion(token, questionsVacancyId, qId);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Vraag verwijderen mislukt");
    }
  }

  async function toggleAnswers(app: ApplicationWithCandidate) {
    const nowOpen = !appAnswersOpen[app.id];
    setAppAnswersOpen((prev) => ({ ...prev, [app.id]: nowOpen }));
    if (nowOpen && appAnswers[app.id] === undefined) {
      setAppAnswersLoading((prev) => ({ ...prev, [app.id]: true }));
      try {
        const [answers, qs] = await Promise.all([
          getApplicationAnswers(token!, app.id),
          listIntakeQuestions(token!, app.vacancy_id),
        ]);
        const paired = answers.map((a: IntakeAnswerOut) => ({
          question: qs.find((q) => q.id === a.question_id)?.question ?? `Vraag ${a.question_id}`,
          answer: a.answer,
        }));
        setAppAnswers((prev) => ({ ...prev, [app.id]: paired }));
      } catch {
        setAppAnswers((prev) => ({ ...prev, [app.id]: [] }));
      } finally {
        setAppAnswersLoading((prev) => ({ ...prev, [app.id]: false }));
      }
    }
  }

  async function doCreateVacancy(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr("");
    try {
      await createVacancy(token, { title, location, hours_per_week: hours, salary_range: salary, description: desc, interview_type: vacancyInterviewType, employment_type: vacancyEmploymentType || undefined, work_location: vacancyWorkLocation || undefined });
      const vacs = await employerVacancies(token);
      setVacancies(vacs || []);
      setTitle(""); setLocation(""); setHours(""); setSalary(""); setDesc(""); setVacancyInterviewType("both"); setVacancyEmploymentType(""); setVacancyWorkLocation("");
      setMsg("Vacature aangemaakt!");
      setView("vacancies");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Aanmaken mislukt");
    } finally {
      setCreating(false);
    }
  }

  const selectedVacancyName = vacancies.find((v) => v.id === selectedVacancy)?.title ?? "Alle vacatures";
  const appCountPerVacancy = (id: number) => applications.filter((a) => a.vacancy_id === id).length;
  const totalApps = applications.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:flex overflow-x-hidden w-full">

      {/* Mobiel overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0 min-h-screen overflow-y-auto ${sidebarOpen ? "fixed flex" : "hidden md:flex md:static"}`}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#7C3AED" }}>V</div>
            <span className="font-bold text-gray-900 text-sm">VorzaIQ</span>
          </div>
          <div className="text-xs text-gray-400 mt-1 truncate">{userEmail}</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 py-2">Navigatie</p>

          <button
            onClick={() => { setView("vacancies"); setSelectedVacancy(null); loadApplications(); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "vacancies" ? "text-purple-700 bg-purple-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Mijn vacatures
            <span className="float-right text-xs text-gray-400">{vacancies.length}</span>
          </button>

          <button
            onClick={() => { setView("applications"); setSelectedVacancy(null); loadApplications(); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "applications" && !selectedVacancy ? "text-purple-700 bg-purple-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Alle sollicitanten
            <span className="float-right text-xs text-gray-400">{totalApps}</span>
          </button>

          <button
            onClick={() => { handleNewVacancy(); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "new-vacancy" ? "text-orange-700 bg-orange-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            + Vacature plaatsen
          </button>

          <button
            onClick={() => { setView("analytics"); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "analytics" ? "text-purple-700 bg-purple-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Analytics
          </button>

          <button
            onClick={() => { setView("team"); loadTeam(); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "team" ? "text-purple-700 bg-purple-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Team beheren
          </button>

          <Link
            href="/employer/integraties"
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors no-underline block"
          >
            Integraties
          </Link>

          <Link
            href="/employer/instellingen"
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors no-underline block"
          >
            Instellingen
          </Link>

          {vacancies.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 py-2 mt-4">Vacatures</p>
              {vacancies.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleVacancyClick(v)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedVacancy === v.id ? "text-purple-700 bg-purple-50 font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate block pr-6">{v.title}</span>
                  <span className="float-right text-xs text-gray-400 -mt-5">{appCountPerVacancy(v.id)}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="w-full md:flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">

        {/* Mobiele topbar met hamburger */}
        <div className="flex items-center gap-3 mb-5 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600"
            aria-label="Menu openen"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-gray-900 text-sm">Werkgever portaal</span>
        </div>

        {/* Trial-expiry banner */}
        {userPlan === "gratis" && userTrialEndsAt && (() => {
          const daysLeft = Math.ceil((new Date(userTrialEndsAt).getTime() - Date.now()) / 86400000);
          if (daysLeft > 7) return null;
          return (
            <div className={`rounded-xl px-4 py-3 text-sm mb-5 flex items-center justify-between gap-4 ${daysLeft <= 0 ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
              <span>
                {daysLeft <= 0
                  ? "Je gratis proefperiode is verlopen. Kies een abonnement om te blijven werven."
                  : `Je gratis proefperiode verloopt over ${daysLeft} dag${daysLeft !== 1 ? "en" : ""}. Kies een abonnement om te blijven werven.`}
              </span>
              <a href="/employer/abonnementen" className="shrink-0 font-semibold underline">Upgrade</a>
            </div>
          );
        })()}

        {/* Notificaties */}
        {msg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-5">{msg}</div>
        )}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">{err}</div>
        )}

        {/* === VACATURES OVERZICHT === */}
        {view === "vacancies" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mijn vacatures</h1>
                <p className="text-sm text-gray-500 mt-1">{vacancies.length} actieve vacature{vacancies.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={handleNewVacancy}
                className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold text-white hover:opacity-90 whitespace-nowrap"
                style={{ background: "#f97316" }}
              >
                + Vacature plaatsen
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Actieve vacatures", value: vacancies.length, color: "#7C3AED" },
                { label: "Totaal sollicitanten", value: totalApps, color: "#3b82f6" },
                { label: "Gem. matchscore", value: (() => {
                  const scored = applications.filter((a) => a.match_score !== null);
                  if (!scored.length) return "—";
                  return Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length) + "%";
                })(), color: "#8b5cf6" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 md:p-5">
                  <div className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-tight md:tracking-wide mb-1 md:mb-2 truncate">{s.label}</div>
                  <div className="text-xl md:text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {vacancies.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-14 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Nog geen vacatures</div>
                <div className="text-gray-400 text-sm mb-6">Plaats je eerste vacature en vind de beste kandidaten.</div>
                <button onClick={handleNewVacancy}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: "#f97316" }}>
                  + Vacature plaatsen
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {vacancies.map((v) => {
                  const color = avatarColor(v.id);
                  const appCount = appCountPerVacancy(v.id);
                  const vacApps = applications.filter((a) => a.vacancy_id === v.id);
                  const topScore = vacApps.reduce((max, a) => Math.max(max, a.match_score ?? 0), 0);
                  return (
                    <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 md:p-5 hover:border-purple-200 hover:shadow-sm transition-all">
                      <div className="employer-vac-card flex items-center gap-3 md:gap-4">
                        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {getInitials(v.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{v.title}</span>
                            {(() => {
                              const s = v.status || "concept";
                              const cfg = s === "actief"
                                ? { label: "Online", color: "#059669", bg: "#d1fae5" }
                                : s === "offline"
                                ? { label: "Offline", color: "#6b7280", bg: "#f3f4f6" }
                                : { label: "Concept", color: "#d97706", bg: "#fef3c7" };
                              return (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {v.location && `${v.location} · `}{v.hours_per_week && `${v.hours_per_week}u/week · `}{v.salary_range || ""}
                          </div>
                        </div>
                        <div className="employer-vac-right flex items-center gap-3 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-900">{appCount}</div>
                            <div className="text-xs text-gray-400">sollicitant{appCount !== 1 ? "en" : ""}</div>
                          </div>
                          {topScore > 0 && (
                            <div className="employer-vac-score text-center">
                              <div className="text-xl font-bold" style={{ color: topScore >= 70 ? "#059669" : "#d97706" }}>{topScore}%</div>
                              <div className="text-xs text-gray-400">top score</div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 ml-auto md:ml-0">
                            {/* Primaire CTA */}
                            <button
                              onClick={() => handleVacancyClick(v)}
                              className="px-4 py-2 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                            >
                              Sollicitanten
                            </button>

                            {/* ⋯ overflow actiemenu */}
                            <div id={`vmenu-${v.id}`} style={{ position: "relative" }}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 transition-colors text-base leading-none"
                                title="Meer acties"
                              >
                                ⋯
                              </button>
                              {openMenuId === v.id && (
                                <div style={{
                                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                                  background: "#fff", border: "1px solid #e5e7eb",
                                  borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                  zIndex: 40, minWidth: 200, overflow: "hidden",
                                }}>
                                  <button
                                    onClick={() => { setOpenMenuId(null); openEditVacancy(v); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Bewerken
                                  </button>
                                  <button
                                    onClick={() => { setOpenMenuId(null); handleOpenQuestions(v); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    Intakevragen
                                  </button>
                                  <a
                                    href={`/vacatures/${v.id}`}
                                    onClick={() => setOpenMenuId(null)}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", textDecoration: "none" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    Vacature bekijken
                                  </a>

                                  <div style={{ height: 1, background: "#f3f4f6", margin: "3px 0" }} />

                                  {(v.status || "concept") !== "actief" ? (
                                    <button
                                      disabled={statusUpdating[v.id]}
                                      onClick={() => { setOpenMenuId(null); handleVacancyStatus(v.id, "actief"); }}
                                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#059669", background: "none", border: "none", cursor: "pointer", textAlign: "left", opacity: statusUpdating[v.id] ? 0.5 : 1 }}
                                      onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                      {statusUpdating[v.id] ? "Bezig..." : "Online zetten"}
                                    </button>
                                  ) : (
                                    <button
                                      disabled={statusUpdating[v.id]}
                                      onClick={() => { setOpenMenuId(null); handleVacancyStatus(v.id, "offline"); }}
                                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textAlign: "left", opacity: statusUpdating[v.id] ? 0.5 : 1 }}
                                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                      {statusUpdating[v.id] ? "Bezig..." : "Offline halen"}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setOpenMenuId(null); setPromoVacancy(v); setPromoDays(7); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#ea580c", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#fff7ed")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                    Promoten
                                  </button>

                                  <div style={{ height: 1, background: "#f3f4f6", margin: "3px 0" }} />

                                  <button
                                    onClick={() => { setOpenMenuId(null); setDeleteVacancyId(v.id); setDeleteVacancyTitle(v.title); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", fontSize: 13, color: "#dc2626", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#fff1f2")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                    Verwijderen
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === SOLLICITANTEN OVERZICHT === */}
        {view === "applications" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setView("vacancies"); setSelectedVacancy(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                ← Terug
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedVacancy ? selectedVacancyName : "Alle sollicitanten"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">{applications.length} sollicitant{applications.length !== 1 ? "en" : ""}</p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-14 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Nog geen sollicitanten</div>
                <div className="text-gray-400 text-sm">Deel de vacature en wacht op de eerste sollicitaties.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const sc = STATUS_CONFIG[app.status] ?? { label: app.status, color: "#374151", bg: "#f3f4f6", next: [] };
                  const initials = getInitials(app.candidate_name);
                  const color = avatarColor(app.candidate_id);
                  return (
                    <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
                      <div className="app-card-flex flex items-start gap-3 md:gap-4">
                        {/* Avatar */}
                        <div className={`${color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{app.candidate_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate">{app.candidate_email}</div>
                              {!selectedVacancy && (
                                <div className="text-xs text-purple-600 mt-0.5 font-medium truncate">
                                  {vacancies.find((v) => v.id === app.vacancy_id)?.title ?? "Vacature"}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 flex-shrink-0">
                              {new Date(app.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                            </div>
                          </div>

                          {/* AI Score */}
                          <div className="mt-3 w-full max-w-[192px]">
                            <div className="text-xs text-gray-400 mb-1">AI Matchscore</div>
                            <ScoreBar score={app.match_score} />
                          </div>

                          {/* AI Samenvatting */}
                          {app.ai_summary && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{app.ai_summary}</p>
                          )}

                          {/* AI Details uitklapper */}
                          {(app.ai_strengths || app.ai_gaps) && (
                            <details className="mt-2">
                              <summary className="text-xs text-purple-600 cursor-pointer font-medium hover:text-purple-700">
                                Zie AI-analyse ▾
                              </summary>
                              <div className="mt-2 space-y-2">
                                {app.ai_strengths && (
                                  <div className="bg-green-50 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-green-700 mb-1">Sterktes</div>
                                    <div className="text-xs text-green-600">{app.ai_strengths}</div>
                                  </div>
                                )}
                                {app.ai_gaps && (
                                  <div className="bg-red-50 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-red-700 mb-1">Aandachtspunten</div>
                                    <div className="text-xs text-red-600">{app.ai_gaps}</div>
                                  </div>
                                )}
                                {app.ai_suggested_questions && (
                                  <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-blue-700 mb-1">Interviewvragen</div>
                                    <div className="text-xs text-blue-600">{app.ai_suggested_questions}</div>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}

                          {/* Lisa chat transcript */}
                          <div className="mt-2">
                            <button
                              onClick={() => toggleChat(app.id)}
                              className="text-xs font-medium cursor-pointer hover:opacity-80 flex items-center gap-1"
                              style={{ color: "#7C3AED", background: "none", border: "none", padding: 0 }}
                            >
                              <span style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#7C3AED",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 800,
                              }}>L</span>
                              Lisa gesprek {chatOpen[app.id] ? "▴" : "▾"}
                            </button>

                            {chatOpen[app.id] && (
                              <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                                {chatLoading[app.id] ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">Laden...</div>
                                ) : !chatMessages[app.id]?.length ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">
                                    Nog geen gesprek gevoerd met Lisa.
                                  </div>
                                ) : (
                                  <div className="max-h-64 overflow-y-auto p-3 space-y-2 bg-gray-50">
                                    {chatMessages[app.id].map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={`flex gap-2 ${msg.role === "candidate" ? "flex-row-reverse" : ""}`}
                                      >
                                        {msg.role === "recruiter" && (
                                          <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: "50%",
                                            background: "#7C3AED",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#fff",
                                            fontSize: 8,
                                            fontWeight: 800,
                                            flexShrink: 0,
                                            marginTop: 2,
                                          }}>L</div>
                                        )}
                                        <div
                                          className="text-xs px-3 py-2 rounded-xl max-w-xs leading-relaxed"
                                          style={msg.role === "candidate"
                                            ? { background: "#7C3AED", color: "#fff", borderTopRightRadius: 4 }
                                            : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderTopLeftRadius: 4 }
                                          }
                                        >
                                          {msg.content}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Video interview transcript */}
                          <div className="mt-2">
                            <button
                              onClick={() => toggleVideoInterview(app.id)}
                              className="text-xs font-medium cursor-pointer hover:opacity-80 flex items-center gap-1.5"
                              style={{ color: "#0284c7", background: "none", border: "none", padding: 0 }}
                            >
                              <span style={{ fontSize: 13 }}>🎬</span>
                              Video interview {videoInterviewOpen[app.id] ? "▴" : "▾"}
                            </button>
                            {videoInterviewOpen[app.id] && (
                              <div className="mt-2 border border-blue-100 rounded-xl overflow-hidden">
                                {videoInterviewLoading[app.id] ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">Laden...</div>
                                ) : !videoInterviews[app.id] ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">
                                    Kandidaat heeft nog geen video interview gedaan.
                                  </div>
                                ) : videoInterviews[app.id]!.status !== "completed" ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">
                                    Interview is nog niet afgerond (status: {videoInterviews[app.id]!.status}).
                                  </div>
                                ) : (
                                  <div className="p-3 bg-blue-50 space-y-2">
                                    {/* Score */}
                                    {videoInterviews[app.id]!.score !== null && (
                                      <div className="flex items-center gap-3 bg-white rounded-lg p-2.5">
                                        <div className="text-xs font-semibold text-blue-700">Interview score</div>
                                        <div className="flex-1">
                                          <ScoreBar score={videoInterviews[app.id]!.score} />
                                        </div>
                                      </div>
                                    )}
                                    {/* Transcript */}
                                    {!!videoInterviews[app.id]!.transcript?.length && (
                                      <div className="max-h-72 overflow-y-auto space-y-1.5">
                                        {videoInterviews[app.id]!.transcript!.map((t, i) => (
                                          <div key={i} className={`flex gap-2 ${t.role === "candidate" ? "flex-row-reverse" : ""}`}>
                                            <div
                                              className="text-xs px-3 py-2 rounded-xl max-w-xs leading-relaxed"
                                              style={t.role === "candidate"
                                                ? { background: "#0284c7", color: "#fff", borderTopRightRadius: 4 }
                                                : { background: "#fff", color: "#374151", border: "1px solid #bfdbfe", borderTopLeftRadius: 4 }
                                              }
                                            >
                                              {t.content}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Intake antwoorden */}
                          <div className="mt-2">
                            <button
                              onClick={() => toggleAnswers(app)}
                              className="text-xs font-medium cursor-pointer hover:opacity-80 flex items-center gap-1"
                              style={{ color: "#7c3aed", background: "none", border: "none", padding: 0 }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Intakevragen {appAnswersOpen[app.id] ? "▴" : "▾"}
                            </button>
                            {appAnswersOpen[app.id] && (
                              <div className="mt-2 border border-purple-100 rounded-xl overflow-hidden">
                                {appAnswersLoading[app.id] ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">Laden...</div>
                                ) : !appAnswers[app.id]?.length ? (
                                  <div className="px-4 py-3 text-xs text-gray-400">
                                    Kandidaat heeft geen antwoorden ingediend.
                                  </div>
                                ) : (
                                  <div className="p-3 space-y-2 bg-purple-50">
                                    {appAnswers[app.id].map((qa, i) => (
                                      <div key={i} className="bg-white rounded-lg p-2.5">
                                        <div className="text-xs font-semibold text-purple-700">{qa.question}</div>
                                        <div className="text-xs text-gray-700 mt-1">{qa.answer}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status + acties */}
                        <div className="app-card-actions flex-shrink-0 flex flex-col items-end gap-2 md:gap-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: sc.color, background: sc.bg }}>
                            {sc.label}
                          </span>
                          {sc.next.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              {sc.next.map((nextStatus) => {
                                const ns = STATUS_CONFIG[nextStatus];
                                return (
                                  <button
                                    key={nextStatus}
                                    onClick={() => handleStatusChange(app.id, nextStatus)}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                                    style={{ color: ns.color, background: ns.bg }}
                                  >
                                    → {ns.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Virtuele Lisa knop (altijd zichtbaar, plan-check) */}
                          {userPlan === "premium" ? (
                            <a
                              href={`/candidate/interview/${app.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", textDecoration: "none" }}
                            >
                              🎥 Video interview
                            </a>
                          ) : (
                            <a
                              href="/abonnementen#premium"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                              style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", textDecoration: "none" }}
                              title="Upgrade naar Premium voor virtuele video interviews"
                            >
                              🎥 Video interview <span style={{ fontSize: 10, background: "#7c3aed", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 2 }}>PRO</span>
                            </a>
                          )}

                          {/* Interview plannen knop */}
                          <button
                            onClick={() => {
                              setInterviewModal(app);
                              setInterviewDate("");
                              setInterviewTime("10:00");
                              setInterviewDuration(30);
                              setInterviewType("teams");
                              setInterviewNotes("");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                            style={{ background: "#f0fdfa", color: "#7C3AED", border: "1px solid #ccfbf1" }}
                          >
                            {scheduledInterviews[app.id] ? "Nieuw gesprek" : "Plan gesprek"}
                          </button>

                          {/* Toon Teams link als beschikbaar */}
                          {scheduledInterviews[app.id]?.teams_join_url && (
                            <a
                              href={scheduledInterviews[app.id].teams_join_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                            >
                              🔗 Teams link
                            </a>
                          )}

                          {/* CRM sync knop */}
                          <button
                            onClick={() => handleCrmSync(app)}
                            disabled={crmSyncing[app.candidate_id]}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                            style={
                              crmSynced[app.candidate_id]
                                ? { background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0" }
                                : { background: "#f8fafc", color: "#6b7280", border: "1px solid #e5e7eb" }
                            }
                          >
                            {crmSyncing[app.candidate_id] ? "Syncing..." : crmSynced[app.candidate_id] ? "✓ CRM" : "↗ CRM Sync"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === VACATURE AANMAKEN === */}
        {view === "new-vacancy" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView("vacancies")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Terug
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Nieuwe vacature plaatsen</h1>
            </div>

            {/* AI-assistent blok */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl mb-4"
              style={{ borderLeft: "4px solid #7C3AED" }}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/></svg>
                </div>
                <span className="text-sm font-bold text-gray-800">AI schrijft de vacature voor jou</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Beschrijf de functie in één of twee zinnen. AI vult de rest in.</p>
              <div className="flex flex-col gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder='bijv. "Python developer, 3 jaar ervaring, Amsterdam, hybride, fintech startup"'
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
                <div className="flex gap-2">
                  <input
                    value={aiWebsite}
                    onChange={(e) => setAiWebsite(e.target.value)}
                    placeholder="Bedrijfswebsite (optioneel) — bijv. https://vorzaiq.nl"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
                    style={{ background: "#7C3AED" }}
                  >
                    {aiGenerating ? "Genereren..." : "Genereer"}
                  </button>
                </div>
              </div>
              {aiGenerating && (
                <p className="text-xs text-purple-600 mt-2 animate-pulse">
                  {aiWebsite ? "AI leest website en schrijft vacature..." : "AI schrijft je vacature..."}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
              <form onSubmit={doCreateVacancy} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Functietitel *</label>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="bijv. Senior Developer"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Locatie</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)}
                      placeholder="bijv. Amsterdam"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uren per week</label>
                    <input value={hours} onChange={(e) => setHours(e.target.value)}
                      placeholder="bijv. 40"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Salarisrange</label>
                  <input value={salary} onChange={(e) => setSalary(e.target.value)}
                    placeholder="bijv. €3.500 - €5.000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dienstverband</label>
                    <select value={vacancyEmploymentType} onChange={e => setVacancyEmploymentType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition bg-white">
                      <option value="">Selecteer...</option>
                      <option value="fulltime">Fulltime</option>
                      <option value="parttime">Parttime</option>
                      <option value="freelance">Freelance</option>
                      <option value="stage">Stage</option>
                      <option value="tijdelijk">Tijdelijk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Werklocatie</label>
                    <select value={vacancyWorkLocation} onChange={e => setVacancyWorkLocation(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition bg-white">
                      <option value="">Selecteer...</option>
                      <option value="remote">Remote</option>
                      <option value="hybride">Hybride</option>
                      <option value="op-locatie">Op locatie</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Omschrijving</label>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5}
                    placeholder="Beschrijf de functie, eisen en wat jouw bedrijf te bieden heeft..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none" />
                </div>
                {/* Sollicitatiegesprek type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Sollicitatiegesprek met Lisa
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {([
                      { value: "chat",    label: "🗨️ Chatbot",       desc: "Alle plannen" },
                      { value: "virtual", label: "🎥 Virtueel",       desc: "Alleen Premium" },
                      { value: "both",    label: "✅ Beide opties",   desc: "Kandidaat kiest" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVacancyInterviewType(opt.value)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 10,
                          border: `2px solid ${vacancyInterviewType === opt.value ? "#7C3AED" : "#e5e7eb"}`,
                          background: vacancyInterviewType === opt.value ? "#f0fdf4" : "#fff",
                          cursor: "pointer",
                          textAlign: "center" as const,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: vacancyInterviewType === opt.value ? "#7C3AED" : "#374151" }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  {(vacancyInterviewType === "virtual" || vacancyInterviewType === "both") && userPlan !== "premium" && (
                    <p style={{ fontSize: 12, color: "#d97706", marginTop: 8 }}>
                      Virtuele Lisa vereist een Premium abonnement.{" "}
                      <a href="/abonnementen#premium" style={{ color: "#7C3AED", fontWeight: 600 }}>Upgrade</a>
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={creating}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90"
                    style={{ background: "#7C3AED" }}>
                    {creating ? "Aanmaken..." : "Vacature aanmaken"}
                  </button>
                  <button type="button" onClick={() => setView("vacancies")}
                    className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                    Annuleren
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
        {/* === INTAKEVRAGEN === */}
        {view === "questions" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView("vacancies")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Terug
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Intakevragen</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {vacancies.find((v) => v.id === questionsVacancyId)?.title ?? ""}
                </p>
              </div>
            </div>

            {/* Bestaande vragen */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl mb-4">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Huidige vragen</h2>
              {questionsLoading ? (
                <p className="text-xs text-gray-400">Laden...</p>
              ) : questions.length === 0 ? (
                <p className="text-xs text-gray-400">Nog geen vragen toegevoegd. Voeg hieronder je eerste vraag toe.</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{q.question}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                              {q.qtype}
                            </span>
                            {q.options_json && (
                              <span className="text-xs text-gray-400">
                                {(JSON.parse(q.options_json) as string[]).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Verwijder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nieuwe vraag toevoegen */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Vraag toevoegen</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
                  <select
                    value={newQType}
                    onChange={(e) => setNewQType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  >
                    <option value="text">Tekst (open vraag)</option>
                    <option value="yes_no">Ja / Nee</option>
                    <option value="single_choice">Enkele keuze</option>
                    <option value="multi_choice">Meerdere keuzes</option>
                    <option value="number">Getal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vraag *</label>
                  <input
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    placeholder='bijv. "Hoeveel jaar ervaring heb je met React?"'
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                </div>
                {(newQType === "single_choice" || newQType === "multi_choice") && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Opties (kommagescheiden)
                    </label>
                    <input
                      value={newQOptions}
                      onChange={(e) => setNewQOptions(e.target.value)}
                      placeholder='bijv. "0-2 jaar, 2-5 jaar, 5+ jaar"'
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>
                )}
                <button
                  onClick={handleAddQuestion}
                  disabled={qSaving || !newQText.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90"
                  style={{ background: "#7C3AED" }}
                >
                  {qSaving ? "Opslaan..." : "Vraag toevoegen"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* === ANALYTICS === */}
        {view === "analytics" && (() => {
          const statusCounts = {
            applied:     applications.filter((a) => a.status === "applied").length,
            shortlisted: applications.filter((a) => a.status === "shortlisted").length,
            interview:   applications.filter((a) => a.status === "interview").length,
            hired:       applications.filter((a) => a.status === "hired").length,
            rejected:    applications.filter((a) => a.status === "rejected").length,
          };
          const maxAppCount = Math.max(...vacancies.map((v) => applications.filter((a) => a.vacancy_id === v.id).length), 1);
          const scored = applications.filter((a) => a.match_score !== null);
          const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length) : null;
          const scoreColor = avgScore !== null ? (avgScore >= 70 ? "#059669" : avgScore >= 40 ? "#d97706" : "#dc2626") : "#9ca3af";
          return (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Overzicht van alle recruitmentactiviteit</p>
              </div>

              {/* KPI stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                {[
                  { label: "Vacatures",        value: vacancies.length,       color: "#7C3AED" },
                  { label: "Sollicitaties",     value: applications.length,    color: "#3b82f6" },
                  { label: "In interview",      value: statusCounts.interview, color: "#d97706" },
                  { label: "Gem. matchscore",   value: avgScore !== null ? `${avgScore}%` : "—", color: scoreColor },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 md:p-5">
                    <div className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-tight md:tracking-wide mb-1 md:mb-2 truncate">{s.label}</div>
                    <div className="text-xl md:text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Sollicitaties per vacature */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Sollicitaties per vacature</h2>
                  {vacancies.length === 0 ? (
                    <p className="text-xs text-gray-400">Nog geen vacatures.</p>
                  ) : (
                    <div className="space-y-3">
                      {vacancies.map((v) => {
                        const count = applications.filter((a) => a.vacancy_id === v.id).length;
                        const pct = Math.round((count / maxAppCount) * 100);
                        return (
                          <div key={v.id}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-600 truncate pr-2">{v.title}</span>
                              <span className="text-xs font-bold text-gray-800 flex-shrink-0">{count}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#7C3AED" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Status verdeling */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Status verdeling</h2>
                  {applications.length === 0 ? (
                    <p className="text-xs text-gray-400">Nog geen sollicitaties.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(statusCounts).map(([status, count]) => {
                        const cfg = STATUS_CONFIG[status];
                        const pct = applications.length ? Math.round((count / applications.length) * 100) : 0;
                        return (
                          <div key={status}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                              <span className="text-xs font-bold text-gray-700">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* AI matchscores per vacature */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4">Gem. AI matchscore per vacature</h2>
                {vacancies.length === 0 ? (
                  <p className="text-xs text-gray-400">Nog geen vacatures.</p>
                ) : (
                  <div className="space-y-3">
                    {vacancies.map((v) => {
                      const vacApps = applications.filter((a) => a.vacancy_id === v.id && a.match_score !== null);
                      const avg = vacApps.length ? Math.round(vacApps.reduce((s, a) => s + (a.match_score ?? 0), 0) / vacApps.length) : null;
                      const col = avg !== null ? (avg >= 70 ? "#059669" : avg >= 40 ? "#d97706" : "#dc2626") : "#9ca3af";
                      return (
                        <div key={v.id} className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600 truncate mb-1">{v.title}</div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: avg !== null ? `${avg}%` : "0%", background: col }} />
                            </div>
                          </div>
                          <div className="text-sm font-bold w-12 text-right flex-shrink-0" style={{ color: col }}>
                            {avg !== null ? `${avg}%` : "—"}
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">
                            {vacApps.length} score{vacApps.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* === TEAM BEHEREN === */}
        {view === "team" && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Team beheren</h1>
              <p className="text-sm text-gray-500 mt-1">
                Voeg collega&apos;s toe met hetzelfde e-maildomein (max. 3 naast jezelf).
                Teamleden kunnen alle vacatures en sollicitanten zien en beheren.
              </p>
            </div>

            {teamErr && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{teamErr}</div>
            )}

            {newMemberResult && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-semibold text-green-800 mb-1">Teamlid toegevoegd!</div>
                <div className="text-sm text-green-700">
                  {newMemberResult.full_name} ({newMemberResult.email}) is aangemaakt.
                </div>
                <div className="mt-2 text-sm text-green-800">
                  Tijdelijk wachtwoord:{" "}
                  <span className="font-mono font-bold bg-green-100 px-2 py-0.5 rounded">{newMemberResult.temp_password}</span>
                </div>
                <div className="text-xs text-green-600 mt-1">Geef dit wachtwoord door aan je collega. Een welkomstmail is ook verstuurd.</div>
              </div>
            )}

            {/* Huidige teamleden */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto mb-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Teamleden ({teamMembers.length})</h2>
              </div>
              {teamLoading ? (
                <div className="p-5 text-sm text-gray-400">Laden...</div>
              ) : (
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Naam</th>
                      <th className="px-5 py-3 font-medium">E-mail</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m) => (
                      <tr key={m.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {m.full_name}
                          {m.is_self && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Jij</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{m.email}</td>
                        <td className="px-5 py-3 text-right">
                          {!m.is_self && (
                            <button
                              onClick={() => handleRemoveTeamMember(m.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Verwijder
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Nieuw teamlid toevoegen */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Collega toevoegen</h2>
              <form onSubmit={handleAddTeamMember} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Volledige naam"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mailadres</label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder={`collega@${userEmail.split("@")[1] || "bedrijf.nl"}`}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Alleen e-mailadressen met @{userEmail.split("@")[1] || "jouwdomein.nl"} zijn toegestaan.
                </div>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {addingMember ? "Toevoegen..." : "Toevoegen"}
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* ── Upgrade modal (gratis plan, 2e vacature) ── */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #6D28D9, #A78BFA)", padding: "28px 28px 20px" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-xs font-semibold uppercase tracking-widest opacity-70">VorzaIQ</span>
                <button onClick={() => setShowUpgradeModal(false)} className="text-white opacity-60 hover:opacity-100 text-lg leading-none">✕</button>
              </div>
              <h2 className="text-white text-xl font-bold">Je gratis vacature is gebruikt</h2>
              <p className="text-purple-100 text-sm mt-1">Upgrade je plan om meer vacatures te plaatsen en meer kandidaten te bereiken.</p>
            </div>

            {/* Plans */}
            <div className="p-6 space-y-3">
              {[
                {
                  name: "Starter",
                  price: "€49",
                  period: "/mnd",
                  color: "#2563eb",
                  bg: "#eff6ff",
                  border: "#bfdbfe",
                  items: ["1 actieve vacature", "AI-matching", "Kandidaatoverzicht"],
                },
                {
                  name: "Growth",
                  price: "€149",
                  period: "/mnd",
                  color: "#7C3AED",
                  bg: "#faf5ff",
                  border: "#c4b5fd",
                  badge: "Meest populair",
                  items: ["5 vacatures", "Prioriteit in zoekresultaten", "AI-screening", "CRM integratie"],
                },
                {
                  name: "Scale",
                  price: "€349",
                  period: "/mnd",
                  color: "#111827",
                  bg: "#f9fafb",
                  border: "#e5e7eb",
                  items: ["Onbeperkte vacatures", "Dedicated support", "Geavanceerde analytics"],
                },
              ].map((plan) => (
                <div key={plan.name} style={{ border: `2px solid ${plan.border}`, background: plan.bg, borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontWeight: 800, fontSize: 15, color: plan.color }}>{plan.name}</span>
                      {(plan as { badge?: string }).badge && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: plan.color, color: "#fff", borderRadius: 100, padding: "2px 8px" }}>{(plan as { badge?: string }).badge}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {plan.items.map(item => (
                        <span key={item} style={{ fontSize: 12, color: "#374151" }}>✓ {item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ fontWeight: 900, fontSize: 20, color: "#111827" }}>{plan.price}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{plan.period}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <Link
                href="/abonnementen"
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white text-center no-underline"
                style={{ background: "linear-gradient(135deg, #6D28D9, #7C3AED)" }}
                onClick={() => setShowUpgradeModal(false)}
              >
                Bekijk alle abonnementen →
              </Link>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Later
              </button>
            </div>

            <div className="px-6 pb-5 text-center">
              <span className="text-xs text-gray-400">Vragen? Mail ons op <a href="mailto:info@itspeanuts.ai" className="text-purple-600 no-underline">info@itspeanuts.ai</a></span>
            </div>
          </div>
        </div>
      )}

      {/* === VACATURE BEWERKEN MODAL === */}
      {editVacancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditVacancy(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-7 pt-7 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-gray-900">Vacature bewerken</div>
                <div className="text-sm text-gray-400 mt-0.5 truncate max-w-xs">{editVacancy.title}</div>
              </div>
              <button onClick={() => setEditVacancy(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="px-7 py-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Functietitel *</label>
                <input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Locatie</label>
                  <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="bijv. Amsterdam"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uren per week</label>
                  <input value={editHours} onChange={(e) => setEditHours(e.target.value)}
                    placeholder="bijv. 40"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Salarisrange</label>
                <input value={editSalary} onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="bijv. €3.500 - €5.000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dienstverband</label>
                  <select value={editEmploymentType} onChange={(e) => setEditEmploymentType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition bg-white">
                    <option value="">Selecteer...</option>
                    <option value="fulltime">Fulltime</option>
                    <option value="parttime">Parttime</option>
                    <option value="freelance">Freelance</option>
                    <option value="stage">Stage</option>
                    <option value="tijdelijk">Tijdelijk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Werklocatie</label>
                  <select value={editWorkLocation} onChange={(e) => setEditWorkLocation(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition bg-white">
                    <option value="">Selecteer...</option>
                    <option value="remote">Remote</option>
                    <option value="hybride">Hybride</option>
                    <option value="op-locatie">Op locatie</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Omschrijving</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gesprek met Lisa</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "chat",    label: "Chatbot",    desc: "Alle plannen" },
                    { value: "virtual", label: "Virtueel",   desc: "Alleen Premium" },
                    { value: "both",    label: "Beide",      desc: "Kandidaat kiest" },
                  ] as const).map((opt) => (
                    <label key={opt.value} onClick={() => setEditInterviewType(opt.value)}
                      className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-center transition-all ${editInterviewType === opt.value ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <div className="text-xs font-bold text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition"
                  style={{ background: "#7C3AED" }}>
                  {editSaving ? "Opslaan..." : "Opslaan"}
                </button>
                <button type="button" onClick={() => setEditVacancy(null)}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === PROMOTIE MODAL === */}
      {promoVacancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xl font-bold text-gray-900">Vacature promoten</div>
                <div className="text-sm text-gray-500 mt-1 leading-snug">&ldquo;{promoVacancy.title}&rdquo;</div>
              </div>
              <button onClick={() => setPromoVacancy(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">✕</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Je vacature wordt gepromoot op <strong>alle platforms</strong>:
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {["Facebook", "Instagram", "Google", "TikTok", "LinkedIn"].map((p) => (
                <span key={p} className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">{p}</span>
              ))}
            </div>

            <p className="text-sm font-semibold text-gray-700 mb-3">Kies duur:</p>
            <div className="space-y-2 mb-6">
              {([7, 14, 30] as const).map((d) => {
                const prices: Record<number, string> = { 7: "€299", 14: "€499", 30: "€899" };
                return (
                  <label
                    key={d}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${promoDays === d ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-200"}`}
                    onClick={() => setPromoDays(d)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${promoDays === d ? "border-orange-500" : "border-gray-300"}`}>
                        {promoDays === d && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{d} dagen</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{prices[d]}</span>
                  </label>
                );
              })}
            </div>

            <div className="text-xs text-gray-400 mb-5">Betaling via iDEAL, Visa of Mastercard · incl. BTW</div>

            <div className="flex gap-3">
              <button
                onClick={() => setPromoVacancy(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Annuleren
              </button>
              <button
                disabled={promoLoading}
                onClick={async () => {
                  setPromoLoading(true);
                  try {
                    const { checkout_url } = await createPromotionCheckout(token!, promoVacancy.id, promoDays);
                    window.location.href = checkout_url;
                  } catch (e: unknown) {
                    setErr(e instanceof Error ? e.message : "Promotie starten mislukt");
                    setPromoVacancy(null);
                  } finally {
                    setPromoLoading(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition"
                style={{ background: "#f97316" }}
              >
                {promoLoading ? "Bezig..." : "Betalen via Stripe →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vacature verwijderen bevestiging ── */}
      {deleteVacancyId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteVacancyId(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </div>
              <div>
                <div className="text-base font-bold text-gray-900">Vacature verwijderen</div>
                <div className="text-xs text-gray-500 mt-0.5">{deleteVacancyTitle}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Weet je zeker dat je deze vacature wilt verwijderen? Alle sollicitaties en data worden ook verwijderd. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteVacancyId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteVacancy}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleteLoading ? "Bezig..." : "Ja, verwijderen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Interview plannen modal ── */}
      {interviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setInterviewModal(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Gesprek inplannen</h2>
                <p className="text-xs text-gray-500 mt-0.5">{interviewModal.candidate_name}</p>
              </div>
              <button
                onClick={() => setInterviewModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            <form onSubmit={handleScheduleInterview} className="px-6 py-5 space-y-4">
              {/* Type gesprek */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Type gesprek
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "teams", label: "Teams", desc: "Online via Teams" },
                    { value: "phone", label: "Telefoon", desc: "Telefonisch" },
                    { value: "in_person", label: "Live", desc: "Op locatie" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInterviewType(opt.value)}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-center"
                      style={interviewType === opt.value
                        ? { borderColor: "#7C3AED", background: "#f0fdfa", color: "#7C3AED" }
                        : { borderColor: "#e5e7eb", background: "#fff", color: "#6b7280" }
                      }
                    >
                      <div>{opt.label}</div>
                      <div className="font-normal text-gray-400 mt-0.5" style={{ fontSize: 10 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Datum + tijd */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Datum *
                  </label>
                  <input
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Tijd *
                  </label>
                  <input
                    type="time"
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                </div>
              </div>

              {/* Duur */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Duur
                </label>
                <select
                  value={interviewDuration}
                  onChange={(e) => setInterviewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition"
                >
                  <option value={15}>15 minuten</option>
                  <option value={30}>30 minuten</option>
                  <option value={45}>45 minuten</option>
                  <option value={60}>60 minuten</option>
                  <option value={90}>90 minuten</option>
                </select>
              </div>

              {/* Notities */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Notities (optioneel)
                </label>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  rows={2}
                  placeholder="Bijv. voorbereiding, locatie, agendapunten..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none"
                />
              </div>

              {/* Teams info banner */}
              {interviewType === "teams" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                  <strong>Teams meeting</strong> — Er wordt automatisch een Microsoft Teams meeting aangemaakt
                  en een agenda-uitnodiging verstuurd naar kandidaat en werkgever.
                  Vereist MS_TENANT_ID, MS_CLIENT_ID en MS_CLIENT_SECRET in Render.
                </div>
              )}

              {/* Knoppen */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={interviewSaving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition"
                  style={{ background: "#7C3AED" }}
                >
                  {interviewSaving ? "Bezig..." : interviewType === "teams" ? "Plan Teams gesprek" : "Plan gesprek"}
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewModal(null)}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
