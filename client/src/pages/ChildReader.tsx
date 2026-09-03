import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { getChildReadingProgress, splitApprovedPassageIntoReadingParts } from "@shared/child-reading-canvas";
import { AlertTriangle, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, CircleHelp, Focus, Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";

type Spacing = "RELAXED" | "OPEN" | "SPACIOUS";
const spacingValue: Record<Spacing, number> = { RELAXED: 1.75, OPEN: 2.05, SPACIOUS: 2.35 };

export default function ChildReader() {
  const [, params] = useRoute("/read/:token");
  const token = params?.token ?? "";
  const reader = trpc.childJourney.view.useQuery({ token }, { enabled: Boolean(token), retry: false });
  const [textScale, setTextScale] = useState(1);
  const [lineHeight, setLineHeight] = useState<Spacing>("OPEN");
  const [focusMode, setFocusMode] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [bookmarkIndex, setBookmarkIndex] = useState<number | null>(null);
  const start = trpc.childJourney.start.useMutation({ onSuccess: () => reader.refetch() });
  const askForHelp = trpc.childJourney.requestHelp.useMutation({ onSuccess: () => reader.refetch() });
  const complete = trpc.childJourney.complete.useMutation({ onSuccess: () => reader.refetch() });
  const busy = start.isPending || askForHelp.isPending || complete.isPending;
  const sections = useMemo(() => splitApprovedPassageIntoReadingParts(reader.data?.passage.body ?? ""), [reader.data?.passage.body]);
  useEffect(() => {
    if (!token) return;
    const stored = window.localStorage.getItem(`reader-leader-demo-bookmark:${token}`);
    const value = stored ? Number(stored) : Number.NaN;
    setBookmarkIndex(Number.isInteger(value) && value >= 0 ? value : null);
  }, [token]);

  if (reader.isLoading) return <ChildShell><LoadingState /></ChildShell>;
  if (reader.isError || !reader.data) return <ChildShell><UnavailableState /></ChildShell>;
  const view = reader.data;
  const isComplete = view.state === "COMPLETED";
  const readingProgress = getChildReadingProgress(sections.length, sectionIndex);
  const currentSection = sections[readingProgress.index] ?? "";

  return <ChildShell><div className={`mx-auto flex max-w-3xl flex-col gap-6 px-4 py-7 sm:px-6 sm:py-10 ${focusMode ? "max-w-4xl py-10 sm:py-16" : ""}`}>
    <header className={`${focusMode ? "sr-only" : "flex"} flex-col gap-3 border-b border-[#dce7dd] pb-6 sm:flex-row sm:items-center sm:justify-between`}>
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5e8175]">Reading time</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#183237] sm:text-4xl">{view.passage.title}</h1></div>
      <span className="w-fit rounded-full bg-[#eef8ee] px-3 py-1.5 text-xs font-semibold text-[#39714e]">Practice together</span>
    </header>

    {focusMode ? <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" className="gap-2 text-[#547068]" onClick={() => setFocusMode(false)}><Focus className="h-4 w-4" /> Exit focus mode</Button></div> : <>
      <div className="flex items-center justify-between rounded-2xl border border-[#d6e5d7] bg-[#f2f8f1] p-4"><div><p className="font-semibold text-[#244c45]">{view.state === "READY_TO_START" ? "Ready when you are" : isComplete ? "You finished reading" : "Read at your own pace"}</p><p className="mt-1 text-sm leading-6 text-[#547068]">{view.childMessage}</p></div><Sparkles className="h-6 w-6 shrink-0 text-[#659a76]" /></div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f8f8f3] p-2" aria-label="Reading settings"><span className="px-2 text-xs font-semibold text-[#5b746c]">Text size</span><Button type="button" size="icon" variant="outline" aria-label="Make text smaller" onClick={() => setTextScale(scale => Math.max(0.9, scale - 0.1))} disabled={textScale <= 0.9}><Minus className="h-4 w-4" /></Button><Button type="button" size="icon" variant="outline" aria-label="Make text larger" onClick={() => setTextScale(scale => Math.min(1.35, scale + 0.1))} disabled={textScale >= 1.35}><Plus className="h-4 w-4" /></Button><span className="ml-2 px-2 text-xs font-semibold text-[#5b746c]">Line space</span>{(["RELAXED", "OPEN", "SPACIOUS"] as const).map(option => <Button key={option} type="button" size="sm" variant={lineHeight === option ? "default" : "outline"} className={lineHeight === option ? "bg-[#244c45] text-white" : "bg-white"} onClick={() => setLineHeight(option)}>{option[0]}{option.slice(1).toLowerCase()}</Button>)}<Button type="button" size="sm" variant="outline" className="ml-auto gap-2 bg-white" onClick={() => setFocusMode(true)}><Focus className="h-4 w-4" /> Focus mode</Button></div>
    </>}

    {view.state === "READY_TO_START" ? <Card className="border-[#dfe7df] bg-white shadow-sm"><CardContent className="space-y-4 p-6"><BookOpen className="h-7 w-7 text-[#5e9170]" /><h2 className="text-xl font-semibold text-[#183237]">Take your time</h2><p className="text-sm leading-7 text-[#557169]">Read the passage in your own way. If you want help, you can let your teacher know.</p><Button className="w-full bg-[#183237] text-white hover:bg-[#24484d]" disabled={busy} onClick={() => start.mutate({ token, idempotencyKey: `child-start-${Date.now()}` })}>{start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Start reading</Button></CardContent></Card> : null}

    {view.state !== "READY_TO_START" ? <><section aria-label="Passage progress" className={`rounded-2xl border border-[#d6e5d7] bg-[#f2f8f1] p-4 ${focusMode ? "mx-auto w-full max-w-2xl" : ""}`}><div className="mb-2 flex items-center justify-between text-sm text-[#426359]"><span className="font-semibold">Reading progress</span><span>Part {readingProgress.currentPart} of {readingProgress.totalParts}</span></div><Progress value={readingProgress.percentage} className="h-2 bg-[#d7e5d6] [&>div]:bg-[#609873]" /><p className="mt-2 text-xs leading-5 text-[#607a70]">This is only a place marker to help you navigate the passage. It is not a score.</p></section><article className={`rounded-3xl border border-[#dfe7df] bg-white px-6 py-8 shadow-sm sm:px-10 ${focusMode ? "border-0 bg-transparent shadow-none" : ""}`} style={{ fontSize: `${textScale}rem`, lineHeight: spacingValue[lineHeight] }}><div className="mx-auto max-w-2xl font-serif text-[#254b43]"><p className="tracking-[0.01em]">{currentSection}</p></div></article><section aria-label="Reading bookmark" className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#cfe0d2] bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#49695d]">{bookmarkIndex === null ? "Save this part if you would like to come back to it." : `Your saved place is part ${getChildReadingProgress(sections.length, bookmarkIndex).currentPart}.`}</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="gap-2 bg-white" onClick={() => { setBookmarkIndex(readingProgress.index); window.localStorage.setItem(`reader-leader-demo-bookmark:${token}`, String(readingProgress.index)); }}><Bookmark className="h-4 w-4" /> Save my place</Button>{bookmarkIndex !== null && bookmarkIndex !== readingProgress.index ? <Button type="button" variant="outline" size="sm" className="gap-2 bg-white" onClick={() => setSectionIndex(getChildReadingProgress(sections.length, bookmarkIndex).index)}><BookmarkCheck className="h-4 w-4" /> Return to saved part</Button> : null}</div></section>{sections.length > 1 ? <nav className="flex gap-3" aria-label="Passage parts"><Button type="button" variant="outline" className="flex-1 gap-2 bg-white" disabled={readingProgress.index === 0} onClick={() => setSectionIndex(index => Math.max(0, index - 1))}><ArrowLeft className="h-4 w-4" /> Earlier part</Button><Button type="button" variant="outline" className="flex-1 gap-2 bg-white" disabled={readingProgress.index >= sections.length - 1} onClick={() => setSectionIndex(index => Math.min(sections.length - 1, index + 1))}>Next part <ArrowRight className="h-4 w-4" /></Button></nav> : null}</> : null}

    {view.state === "READING" ? <section className="space-y-3"><Button type="button" variant="outline" className="w-full gap-2 border-[#c9ddd0] bg-white text-[#264e45]" disabled={busy || view.helpRequested} onClick={() => askForHelp.mutate({ token, idempotencyKey: `child-help-${Date.now()}` })}><CircleHelp className="h-4 w-4" />{view.helpRequested ? "Your teacher knows you would like help" : "I would like some help"}</Button><Button type="button" className="w-full bg-[#183237] text-white hover:bg-[#24484d]" disabled={busy} onClick={() => complete.mutate({ token, idempotencyKey: `child-finish-${Date.now()}` })}>{complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}I am finished</Button></section> : null}
    {isComplete ? <Card className="border-[#bcdcbc] bg-[#eef8ee]"><CardContent className="space-y-3 p-6 text-center"><Sparkles className="mx-auto h-7 w-7 text-[#55926b]" /><h2 className="text-xl font-semibold text-[#244c45]">Thank you for reading.</h2><p className="text-sm leading-6 text-[#4b6b5f]">Your teacher will look at the next step with you.</p></CardContent></Card> : null}
    <p className="text-center text-xs leading-5 text-[#6d837b]">This is a synthetic hackathon demonstration. It does not record, upload, score, or analyse your voice.</p>
  </div></ChildShell>;
}
function ChildShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-[#f7f8f2] text-[#183237]">{children}</main>; }
function LoadingState() { return <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6"><div className="space-y-3 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#5e9170]" /><p className="text-sm text-[#5b746c]">Getting your reading activity ready…</p></div></div>; }
function UnavailableState() { return <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6"><Card className="max-w-md border-[#ead0c8] bg-[#fffaf8]"><CardContent className="space-y-4 p-7 text-center"><AlertTriangle className="mx-auto h-6 w-6 text-[#a9503b]" /><h1 className="text-xl font-semibold">This reading activity is not available</h1><p className="text-sm leading-6 text-[#6b726d]">Please ask your teacher for a new reading link.</p></CardContent></Card></div>; }
