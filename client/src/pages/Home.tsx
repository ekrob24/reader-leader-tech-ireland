import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const isUuid = (value: string | undefined) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

type PreviewData = {
  evidence: {
    referenceWord: string;
    observedForm: string | null;
    wordEventId: string;
    pronunciationContext: string;
    audioConfidence: number;
    alignmentConfidence: number;
    lexicalConfidence: number;
    pronunciationConfidence: number;
  };
  decision: { id?: string; action: string; traceId: string; policyVersion: string };
  teacherBriefing: { headline: string; summary: string; evidenceRefs: string[] };
  childFeedback: { message: string; template: string };
  evaluation: { passed: boolean; report: { total: number; falseCorrectionRate: number; selfCorrectionCaptureRate: number } };
};

function LoadingDesk() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading evidence desk">
      <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
      <div className="space-y-3">
        <div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map(item => <div key={item} className="h-48 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    </div>
  );
}

export default function Home() {
  const preview = trpc.readerLeader.preview.useQuery();

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-2rem)] bg-[#f8f7f3] text-[#183237]">
        <div className="mx-auto max-w-7xl space-y-8 px-2 py-4 sm:px-4 lg:px-8 lg:py-8">
          {preview.isLoading ? <LoadingDesk /> : preview.isError ? (
            <section className="flex min-h-[60vh] items-center justify-center">
              <Card className="max-w-lg border-[#e8c9c0] bg-[#fffaf8] shadow-sm">
                <CardContent className="space-y-5 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8e6df] text-[#a44e3b]">
                    <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-xl font-semibold tracking-tight">Evidence desk unavailable</h1>
                    <p className="text-sm leading-6 text-[#5d7070]">The fixture-backed record could not be loaded. No child-facing action has been sent. Try again, or return when the evidence service is available.</p>
                  </div>
                  <Button onClick={() => preview.refetch()} className="gap-2 bg-[#183237] text-white hover:bg-[#24484d]">
                    <RefreshCw className="h-4 w-4" /> Retry evidence load
                  </Button>
                </CardContent>
              </Card>
            </section>
          ) : preview.data ? (
            <DeskContent data={preview.data} />
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}

function DeskContent({ data }: { data: PreviewData }) {
  const { evidence, decision, teacherBriefing, childFeedback, evaluation } = data;
  const { user } = useAuth();
  const reviewerId = user?.openId;
  const reviewerReady = isUuid(reviewerId);
  const [overrideReason, setOverrideReason] = useState("");
  const overrideMutation = trpc.readerLeader.createOverride.useMutation();
  const overrideMessage = overrideMutation.isSuccess
    ? "Override appended to the review trail."
    : overrideMutation.isError
      ? "Override could not be saved. The original decision remains unchanged."
      : !decision.id || !reviewerReady
        ? "Fixture preview only; submit overrides from a persisted Supabase session."
        : "The original proposal will remain visible after an override.";
  const submitOverride = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decision.id || !overrideReason.trim()) return;
    overrideMutation.mutate({
      agentDecisionId: decision.id,
      reviewerId: reviewerId!,
      overrideAction: "STAY_SILENT",
      reason: overrideReason,
      idempotencyKey: `${decision.traceId}-${overrideReason.trim().toLowerCase().replaceAll(" ", "-")}`,
    });
  };
  const minimumEvidence = Math.min(evidence.audioConfidence, evidence.alignmentConfidence, evidence.lexicalConfidence, evidence.pronunciationConfidence);

  return (
    <>
      <header className="flex flex-col justify-between gap-5 border-b border-[#dfe4de] pb-7 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#66847d]"><span className="h-2 w-2 rounded-full bg-[#9ccf9b]" /> Teacher evidence desk <span className="text-[#b4bfba]">/</span> live-safe preview</div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#183237] sm:text-5xl">Make the next decision <em className="font-serif font-normal text-[#688b83]">quietly.</em></h1>
          <p className="max-w-2xl text-sm leading-6 text-[#5d7070] sm:text-base">A bounded reading record for adults: every intervention is evidence-linked, every silence is intentional, and every override preserves the original trace.</p>
        </div>
        <Badge className="w-fit gap-2 rounded-full border border-[#b9d9c2] bg-[#edf8ee] px-3 py-1.5 text-[#316b49] hover:bg-[#edf8ee]"><ShieldCheck className="h-3.5 w-3.5" /> No child metrics shown</Badge>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.8fr_0.8fr]">
        <Card className="overflow-hidden rounded-2xl border-[#dfe4de] bg-[#183237] text-white shadow-[0_18px_60px_-32px_rgba(24,50,55,0.55)]">
          <CardContent className="relative flex h-full min-h-64 flex-col justify-between p-6 sm:p-8">
            <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-[#d5f06d]/10 blur-2xl" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b6c7bd]">Current evidence</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-[#d5e3da]">{evidence.wordEventId}</span></div>
              <div><p className="mb-2 text-sm text-[#b6c7bd]">Known passage word</p><h2 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{evidence.referenceWord}</h2><p className="mt-2 text-sm text-[#b6c7bd]">Observed: <span className="text-white">{evidence.observedForm ?? "not confidently heard"}</span></p></div>
            </div>
            <div className="relative mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs uppercase tracking-[0.16em] text-[#b6c7bd]">Policy action</p><p className="mt-1 text-2xl font-semibold text-[#d5f06d]">{decision.action.replace("_", " ")}</p></div><div className="text-right"><p className="text-xs text-[#b6c7bd]">Minimum evidence confidence</p><p className="mt-1 text-lg font-medium">{percent(minimumEvidence)}</p></div></div>
          </CardContent>
        </Card>

        <MetricCard label="Decision trace" value={decision.traceId} note="Pinned to evidence and policy version" icon={<ClipboardCheck className="h-4 w-4" />} />
        <MetricCard label="Pronunciation context" value={evidence.pronunciationContext.replaceAll("_", " ")} note="Regional context is never an error" icon={<BookOpenCheck className="h-4 w-4" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
        <Card className="rounded-2xl border-[#dfe4de] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0"><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#78918b]">Adult view</p><CardTitle className="mt-2 text-xl tracking-tight">Teacher briefing</CardTitle></div><span className="rounded-full bg-[#f2f6f1] p-2 text-[#47756a]"><Sparkles className="h-4 w-4" /></span></CardHeader>
          <CardContent className="space-y-5"><div className="rounded-xl bg-[#f7f8f4] p-4"><p className="font-medium text-[#183237]">{teacherBriefing.headline}</p><p className="mt-2 text-sm leading-6 text-[#627774]">{teacherBriefing.summary}</p></div><div className="flex items-center justify-between gap-4 text-sm"><span className="text-[#71847f]">Evidence refs</span><span className="font-mono text-xs text-[#3e625a]">{teacherBriefing.evidenceRefs.join(" · ")}</span></div><Button variant="outline" className="w-full justify-between border-[#cadbd1] bg-white text-[#183237] hover:bg-[#f4f8f3]">Review original trace <ArrowUpRight className="h-4 w-4" /></Button><form onSubmit={submitOverride} className="space-y-3 border-t border-[#e5ece4] pt-4"><label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#78918b]" htmlFor="override-reason">Append an override</label><Textarea id="override-reason" value={overrideReason} onChange={event => setOverrideReason(event.target.value)} placeholder="Reason for adult review" maxLength={1000} className="min-h-20 resize-none border-[#dfe4de] bg-[#fbfcf8] text-sm" disabled={!decision.id || !reviewerReady || overrideMutation.isPending} /><Button type="submit" disabled={!decision.id || !reviewerReady || overrideReason.trim().length < 3 || overrideMutation.isPending} className="w-full gap-2 bg-[#183237] text-white hover:bg-[#24484d]">{overrideMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} {overrideMutation.isPending ? "Saving override…" : "Append override"}</Button><p role="status" className="text-xs leading-5 text-[#71847f]">{overrideMessage}</p></form></CardContent>
        </Card>

        <Card className="rounded-2xl border-[#dfe4de] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0"><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#78918b]">Safe projection</p><CardTitle className="mt-2 text-xl tracking-tight">Child feedback preview</CardTitle></div><span className="rounded-full bg-[#fff8dc] p-2 text-[#927a2a]"><EyeOff className="h-4 w-4" /></span></CardHeader>
          <CardContent className="space-y-5"><div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[#e1dfcb] bg-[#fffdf3] px-5 text-center"><div><p className="text-lg font-medium text-[#183237]">{childFeedback.message || "No prompt will be spoken."}</p><p className="mt-2 text-xs uppercase tracking-[0.15em] text-[#8b9070]">Approved template · {childFeedback.template.replaceAll("_", " ")}</p></div></div><div className="flex items-center gap-2 text-sm text-[#5e736e]"><Check className="h-4 w-4 text-[#5d9b68]" /> No diagnostic labels or raw confidence exposed</div><Button variant="outline" className="w-full justify-between border-[#cadbd1] bg-white text-[#183237] hover:bg-[#f4f8f3]">Open safe template rules <ChevronRight className="h-4 w-4" /></Button></CardContent>
        </Card>

        <Card className="rounded-2xl border-[#dfe4de] bg-[#f0f6ee] shadow-sm"><CardHeader><p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#6f8a78]">S8 release gate</p><CardTitle className="mt-2 text-xl tracking-tight">Gold-pack health</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex items-end justify-between"><span className={`text-3xl font-semibold ${evaluation.passed ? "text-[#3e7a50]" : "text-[#a44e3b]"}`}>{evaluation.passed ? "PASS" : "HOLD"}</span><span className="text-xs text-[#6f8378]">{evaluation.report.total} cases</span></div><div className="space-y-3"><MetricBar label="False correction" value={evaluation.report.falseCorrectionRate} /><MetricBar label="Self-correction capture" value={evaluation.report.selfCorrectionCaptureRate} /></div><p className="text-xs leading-5 text-[#61766b]">Regression gates stay separate from accuracy so safe silence remains visible.</p></CardContent></Card>
      </section>

      <footer className="flex flex-col justify-between gap-3 border-t border-[#dfe4de] pt-5 text-xs text-[#82938e] sm:flex-row"><span>Fixture-backed evidence · policy {decision.policyVersion}</span><span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3" /> Audit trail preserved</span></footer>
    </>
  );
}

function MetricCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <Card className="rounded-2xl border-[#dfe4de] bg-white shadow-sm"><CardContent className="space-y-5 p-6"><div className="flex items-center justify-between text-[#6e8a82]"><span className="text-xs font-semibold uppercase tracking-[0.17em]">{label}</span>{icon}</div><p className="break-words text-lg font-semibold tracking-tight text-[#183237]">{value}</p><p className="text-xs leading-5 text-[#82938e]">{note}</p></CardContent></Card>;
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return <div className="space-y-1.5"><div className="flex justify-between text-xs text-[#61766b]"><span>{label}</span><span className="font-medium">{percent(value)}</span></div><Progress value={value * 100} className="h-1.5 bg-[#d9e6d5] [&>div]:bg-[#669b71]" /></div>;
}
