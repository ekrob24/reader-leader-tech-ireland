import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Eye, EyeOff, FileCheck2, Loader2, LockKeyhole, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";

function SafetyLoading() {
  return <div className="space-y-8" aria-busy="true" aria-label="Loading learner safety"><div className="h-6 w-44 animate-pulse rounded-full bg-muted" /><div className="h-14 w-2/3 animate-pulse rounded-2xl bg-muted" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-3xl bg-muted" /><div className="h-80 animate-pulse rounded-3xl bg-muted" /></div></div>;
}

export default function LearnerSafety() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const overview = trpc.learnerSafety.overview.useQuery(undefined, { retry: false });

  const isForbidden = overview.error?.data?.code === "FORBIDDEN" || overview.error?.message.toLowerCase().includes("restricted");

  return <DashboardLayout><main className="min-h-[calc(100vh-2rem)] bg-[#f8f7f3] text-[#183237]"><div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
    {overview.isLoading || !user ? <SafetyLoading /> : overview.isError ? isForbidden ? <ForbiddenState onRetry={() => overview.refetch()} /> : <ErrorState onRetry={() => overview.refetch()} /> : !overview.data ? <EmptyState onRetry={() => overview.refetch()} /> : <SafetyContent overview={overview.data} />}
  </div></main></DashboardLayout>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <section className="flex min-h-[60vh] items-center justify-center"><Card className="max-w-lg rounded-3xl border-[#e8c9c0] bg-[#fffaf8] shadow-sm"><CardContent className="space-y-5 p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8e6df] text-[#a44e3b]"><AlertTriangle className="h-5 w-5" /></div><div className="space-y-2"><h1 className="text-xl font-semibold">Safety workspace unavailable</h1><p className="text-sm leading-6 text-[#657773]">We could not load the safety workspace. No learner details were changed or exposed.</p></div><Button onClick={onRetry} className="gap-2 bg-[#183237] text-white hover:bg-[#24484d]"><RefreshCw className="h-4 w-4" /> Retry loading</Button></CardContent></Card></section>;
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return <section className="flex min-h-[60vh] items-center justify-center"><Card className="max-w-lg rounded-3xl border-[#d9e2dc] bg-white shadow-sm"><CardContent className="space-y-5 p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf8ee] text-[#47756a]"><ShieldCheck className="h-5 w-5" /></div><div className="space-y-2"><h1 className="text-xl font-semibold">No learner safety record yet</h1><p className="text-sm leading-6 text-[#657773]">There is no approved safety projection to show. Try again after a learner record has been prepared.</p></div><Button onClick={onRetry} variant="outline" className="gap-2 border-[#cadbd1] bg-white text-[#183237]"><RefreshCw className="h-4 w-4" /> Check again</Button></CardContent></Card></section>;
}

function ForbiddenState({ onRetry }: { onRetry: () => void }) {
  return <section className="flex min-h-[60vh] items-center justify-center"><Card className="max-w-lg rounded-3xl border-[#ead8b0] bg-[#fffdf6] shadow-sm"><CardContent className="space-y-5 p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1c7] text-[#98752d]"><LockKeyhole className="h-5 w-5" /></div><div className="space-y-2"><h1 className="text-xl font-semibold">Learner safety is restricted</h1><p className="text-sm leading-6 text-[#657773]">Your account cannot access this safety workspace yet. No learner details or child-facing content were exposed.</p></div><Button onClick={onRetry} variant="outline" className="gap-2 border-[#d8c99c] bg-white text-[#183237]"><RefreshCw className="h-4 w-4" /> Check access again</Button></CardContent></Card></section>;
}

function SafetyContent({ overview }: { overview: { role: "teacher" | "viewer"; canManageSafety: boolean; teacherControls: { canReviewEvidence: boolean; canAppendOverride: boolean; canViewDiagnosticDetail: boolean }; childSafeView: { title: string; message: string; template: "PROMPT" | "ENCOURAGE" | "STAY_SILENT"; safetyNote: string } } }) {
  return <>
    <header className="flex flex-col gap-5 border-b border-[#dfe4de] pb-8 md:flex-row md:items-end md:justify-between"><div className="space-y-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#66847d]"><span className="h-2 w-2 rounded-full bg-[#9ccf9b]" /> Learner safety <span className="text-[#b4bfba]">/</span> protected workspace</div><h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Safety has two views.</h1><p className="max-w-2xl text-sm leading-6 text-[#5d7070] sm:text-base">Adults can review and govern the support plan. Children only receive calm, approved language designed for the next small step.</p></div><Badge className="w-fit gap-2 rounded-full border border-[#b9d9c2] bg-[#edf8ee] px-3 py-1.5 text-[#316b49] hover:bg-[#edf8ee]"><ShieldCheck className="h-3.5 w-3.5" /> Protected by role</Badge></header>
    <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]" aria-label="Learner safety views">
      <Card className="rounded-3xl border-[#d9e2dc] bg-[#183237] text-white shadow-[0_18px_60px_-32px_rgba(24,50,55,0.6)]"><CardHeader className="space-y-4 p-7 sm:p-8"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6c7bd]"><SlidersHorizontal className="h-4 w-4" /> Teacher controls</span><Badge className="border-white/15 bg-white/10 text-[#dce9df] hover:bg-white/10">{overview.role === "teacher" ? "Admin / teacher" : "Read only"}</Badge></div><CardTitle className="text-2xl tracking-tight text-white">Govern the boundary, not the child.</CardTitle><p className="text-sm leading-6 text-[#c1d0c7]">Review evidence, preserve the original decision, and append an adult override only when your role permits it.</p></CardHeader><CardContent className="space-y-3 p-7 pt-0 sm:p-8 sm:pt-0"><ControlRow icon={<FileCheck2 />} label="Review evidence trail" enabled={overview.teacherControls.canReviewEvidence} /><ControlRow icon={<SlidersHorizontal />} label="Append a reasoned override" enabled={overview.teacherControls.canAppendOverride} /><ControlRow icon={<Eye />} label="View adult diagnostic detail" enabled={overview.teacherControls.canViewDiagnosticDetail} /><p className="pt-3 text-xs leading-5 text-[#9fb4aa]">Every change is append-only. The prior proposal remains available for audit.</p></CardContent></Card>
      <Card className="rounded-3xl border-[#e4dfc8] bg-[#fffdf4] shadow-sm"><CardHeader className="space-y-4 p-7 sm:p-8"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b9070]"><EyeOff className="h-4 w-4" /> Child-safe view</span><Badge className="border-[#e9deb3] bg-[#fff6cf] text-[#8a7429] hover:bg-[#fff6cf]">Approved projection</Badge></div><CardTitle className="text-2xl tracking-tight text-[#183237]">{overview.childSafeView.title}</CardTitle><p className="text-sm leading-6 text-[#657773]">This is the only language a learner-facing surface may receive from this workspace.</p></CardHeader><CardContent className="space-y-5 p-7 pt-0 sm:p-8 sm:pt-0"><div className="rounded-2xl border border-dashed border-[#e1dfcb] bg-white/80 p-6 text-center"><p className="text-xl font-medium text-[#183237]">{overview.childSafeView.message}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#97875d]">{overview.childSafeView.template} template</p></div><div className="flex items-start gap-3 text-sm leading-6 text-[#5e736e]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5d9b68]" />{overview.childSafeView.safetyNote}</div><div className="flex items-center gap-2 border-t border-[#ece7d5] pt-4 text-xs text-[#7d876f]"><EyeOff className="h-3.5 w-3.5" /> No confidence, diagnosis, or adult controls are shown.</div></CardContent></Card>
    </section>
  </>;
}

function ControlRow({ icon, label, enabled }: { icon: React.ReactNode; label: string; enabled: boolean }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"><span className="flex items-center gap-3 text-sm text-[#e5eee7]">{icon}<span>{label}</span></span><span className={`text-xs font-semibold uppercase tracking-[0.14em] ${enabled ? "text-[#d5f06d]" : "text-[#9fb4aa]"}`}>{enabled ? "Enabled" : "Read only"}</span></div>; }
