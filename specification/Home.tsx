/*
 * Quiet Editorial Evidence Lab: ink navy, warm paper, moss, acid chartreuse.
 * This page treats abstention, auditability, and source visibility as first-class
 * interface elements. Keep the asymmetric editorial layout and never dilute the
 * signal color into decoration.
 */
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, BookOpen, Check, ChevronRight, CircleAlert, Download, ExternalLink, Mic2, PauseCircle, ShieldCheck, Sparkles, Users, X } from "lucide-react";

const heroImage = "/manus-storage/reader-leader-hero_25b5837b.jpg";
const markImage = "/manus-storage/reader-leader-mark_37862ad0.png";

const sources = [
  { n: 1, label: "TechIreland Participants Playbook", href: "#challenge" },
  { n: 2, label: "Silicon Republic challenge announcement", href: "https://www.siliconrepublic.com/machines/techireland-launches-galway-bound-national-ai-challenge-2026" },
  { n: 3, label: "Reader Leader Master Brief", href: "#verdict" },
  { n: 4, label: "GradGenie / 2025 winner account", href: "https://echofold.ai/news/launchloop-wins-national-ai-challenge-2025" },
  { n: 5, label: "Children’s ASR benchmark", href: "https://arxiv.org/html/2406.10507v1" },
  { n: 7, label: "Alignment error in pronunciation scoring", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11977302/" },
  { n: 10, label: "Microsoft Reading Coach", href: "https://www.microsoft.com/en-us/education/blog/2024/12/support-independent-ai-powered-reading-practice-with-reading-coach/" },
  { n: 12, label: "Irish DPC child-data guidance", href: "https://www.dataprotection.ie/en/news-media/consultations/children-front-and-centre-fundamentals-child-oriented-approach-data-processing" },
];

const asrData = [
  { name: "Whisper-v3", value: 12.3, fill: "#173b40" },
  { name: "Canary", value: 9.3, fill: "#89a89e" },
  { name: "Whisper-small FT", value: 9.3, fill: "#d9f23f" },
  { name: "WavLM FT", value: 10.4, fill: "#c9bda8" },
];

const actionData = [
  { name: "Prompt", value: 28, color: "#d9f23f" },
  { name: "Model", value: 14, color: "#173b40" },
  { name: "Silent", value: 46, color: "#89a89e" },
  { name: "Escalate", value: 12, color: "#c9bda8" },
];

function Footnote({ n }: { n: number }) {
  const source = sources.find((s) => s.n === n);
  return <a className="footnote" href={source?.href} target={source?.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">[{n}]</a>;
}

function SectionLabel({ number, children }: { number: string; children: string }) {
  return <div className="section-label"><span>{number}</span><span>{children}</span></div>;
}

function AppMark() {
  return <div className="brand"><img src={markImage} alt="Reader Leader mark" /><span>Reader Leader<span className="brand-dot">.</span></span></div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"problem" | "signal">("problem");
  const [riskTolerance, setRiskTolerance] = useState(34);
  const [saved, setSaved] = useState(false);
  const estimatedIntervention = useMemo(() => Math.round(100 - riskTolerance * 0.72), [riskTolerance]);

  const saveReport = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
    window.print();
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <AppMark />
        <div className="topbar-meta"><span>AI & Agents / 2026</span><span className="live-dot" /> <span>Research brief</span></div>
        <button className="save-button" onClick={saveReport}>{saved ? <Check size={15} /> : <Download size={15} />}{saved ? "Saved" : "Save / share"}</button>
      </header>

      <aside className="chapter-rail">
        <p className="rail-kicker">Reader Leader<br />Idea Research</p>
        <nav>
          <a href="#challenge" className="rail-link active"><span>01</span> Challenge brief</a>
          <a href="#frontier" className="rail-link"><span>02</span> Frontier research</a>
          <a href="#verdict" className="rail-link"><span>03</span> Validation verdict</a>
        </nav>
        <div className="rail-bottom"><span className="rail-line" /><span>Prepared 01.09.26</span></div>
      </aside>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="signal-chip">FIELD NOTE 01</span><span>TechIreland National AI Challenge 2026</span></div>
            <h1>The product is not speech recognition.<br /><em>It is judgement under uncertainty.</em></h1>
            <p className="hero-deck">An evidence-led challenge brief for Reader Leader: an accent-aware, reference-conditioned reading-record agent that knows when to speak—and when to stay silent.</p>
            <div className="hero-cta-row"><a className="text-link" href="#verdict">Jump to verdict <ArrowUpRight size={16} /></a><span className="hero-caption">Two-week build window · Ireland first</span></div>
          </div>
          <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }}><div className="hero-image-note"><Mic2 size={15} /><span>Listening is the scarce resource.</span></div></div>
        </section>

        <section id="challenge" className="chapter-section challenge-section">
          <div className="section-aside"><SectionLabel number="01" children="Challenge brief" /><p>What the field rewards</p></div>
          <div className="section-content">
            <div className="section-intro"><h2>Win the workflow, not the demo trick.</h2><p>The Playbook makes the judging model unusually legible: solve a real problem for a named customer, show a working and differentiated prototype, explain how it becomes a business, and make the AI materially responsible for the value.[<Footnote n={1} />]</p></div>
            <div className="criteria-grid">
              {[
                ["01", "Problem + customer", "Make the bottleneck concrete: adult listening capacity, Irish literacy coordinators and SET teams, reviewable evidence."],
                ["02", "Solution", "Show one passage end to end. Four actions. One deliberate silence. Audio behind every judgement."],
                ["03", "Commercial focus", "Lead with school and MAT licensing; position the evidence workflow as the first paid wedge."],
                ["04", "Build with AI", "The AI is valuable because it reasons over uncertainty and knows when not to interrupt."],
              ].map(([n, title, copy]) => <div className="criterion" key={n}><span className="criterion-no">{n}</span><h3>{title}</h3><p>{copy}</p></div>)}
            </div>
            <div className="timeline-block"><div className="timeline-heading"><span>THE CLOCK</span><strong>28 Aug → 24 Sep</strong></div><div className="timeline"><div className="timeline-event"><b>13 Sep</b><span>Submission<br />14:00</span></div><div className="timeline-event signal-event"><b>14 Sep</b><span>Regional<br />showcase</span></div><div className="timeline-event"><b>16 Sep</b><span>Top 15<br />announced</span></div><div className="timeline-event"><b>24 Sep</b><span>Top 3 at<br />Galmont</span></div></div></div>
          </div>
        </section>

        <section className="quote-band"><div className="quote-mark">“</div><blockquote>Every child needs a listener. The winning agent listens to every word, but only speaks when the evidence and the pedagogy justify interrupting.</blockquote><span>— sharpened competition thesis</span></section>

        <section id="frontier" className="chapter-section frontier-section">
          <div className="section-aside"><SectionLabel number="02" children="Frontier research" /><p>Where the edge actually is</p></div>
          <div className="section-content">
            <div className="section-intro"><h2>Known text changes the game.</h2><p>Reader Leader does not need open-vocabulary dictation. The passage is known before the child reads, so the core task is forced alignment and pronunciation judgement against a reference—not rewriting a child’s speech into clean text.</p></div>
            <div className="toggle-row"><button className={activeTab === "problem" ? "toggle active" : "toggle"} onClick={() => setActiveTab("problem")}>The technical edge</button><button className={activeTab === "signal" ? "toggle active" : "toggle"} onClick={() => setActiveTab("signal")}>The product signal</button></div>
            {activeTab === "problem" ? <div className="evidence-panel"><div className="evidence-text"><span className="mini-label">EVIDENCE NOTE / 05</span><h3>Child speech is still a distribution-shift problem.</h3><p>A 2024 benchmark across MyST and OGI compared Whisper, Canary, Parakeet, wav2vec2, HuBERT and WavLM. It finds that fine-tuning and domain adaptation materially change the ranking; a larger general model is not automatically the right child-speech model.[<Footnote n={5} />]</p><p><strong>Sprint implication:</strong> benchmark an open baseline on held-out speakers, keep alignment confidence separate from pronunciation confidence, and abstain when boundaries are weak.</p></div><div className="chart-card"><div className="chart-title"><span>Reported WER / MyST</span><span className="chart-note">lower is better</span></div><ResponsiveContainer width="100%" height={225}><BarChart data={asrData} layout="vertical" margin={{ left: 8, right: 18, top: 10, bottom: 5 }}><CartesianGrid strokeDasharray="2 5" horizontal={false} stroke="#d9d0bf" /><XAxis type="number" domain={[0, 15]} tick={{ fontSize: 11, fill: "#667675" }} /><YAxis dataKey="name" type="category" width={104} tick={{ fontSize: 11, fill: "#173b40" }} /><Tooltip contentStyle={{ background: "#fffdf7", border: "1px solid #d9d0bf", borderRadius: 0 }} /><Bar dataKey="value" radius={[0, 2, 2, 0]}>{asrData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer><p className="chart-source">Source: Fan et al. benchmark table, 2024.[<Footnote n={5} />]</p></div></div> : <div className="evidence-panel signal-panel"><div className="signal-large">stay<br /><em>silent</em></div><div className="evidence-text"><span className="mini-label">PRODUCT SIGNAL / 01</span><h3>Restraint is the money shot.</h3><p>Microsoft Reading Coach already provides free read-aloud feedback, leveled passages, custom passages, AI stories, progress tracking, and rewards.[<Footnote n={10} />] Reader Leader cannot win by being “an AI reading tutor.”</p><p><strong>Defensible wedge:</strong> adult-facing evidence, explicit abstention, regional-pronunciation metadata, source audio, and a human override loop.</p></div></div>}
            <div className="frontier-grid"><div className="frontier-note"><span>ALIGNMENT</span><strong>Boundary confidence is a feature.</strong><p>Onset and offset alignment errors have the largest effects on phoneme-level pronunciation scores. Do not present a score without its uncertainty.[<Footnote n={7} />]</p></div><div className="frontier-note"><span>DATA</span><strong>Synthetic to build. Real to measure.</strong><p>PF-STAR offers citeable British children’s speech; an Irish demo needs a small consented collection labelled as methodology, not representativeness.</p></div><div className="frontier-note"><span>GOVERNANCE</span><strong>Publication is a gate.</strong><p>The DPC’s child-oriented guidance supports purpose limitation, transparency, and stronger protection for children’s data.[<Footnote n={12} />]</p></div></div>
          </div>
        </section>

        <section className="architecture-section"><div className="architecture-head"><SectionLabel number="02.5" children="Sprint architecture" /><h2>Four states. One audit trail.</h2><p>The agent should be a bounded policy layer over speech evidence—not an LLM improvising a pedagogy.</p></div><div className="architecture-flow"><div className="flow-step"><span>01</span><Mic2 /><b>Listen</b><small>16kHz audio<br />VAD + patience</small></div><ChevronRight className="flow-arrow" /><div className="flow-step"><span>02</span><BookOpen /><b>Align</b><small>Known text<br />phoneme evidence</small></div><ChevronRight className="flow-arrow" /><div className="flow-step signal-flow"><span>03</span><Sparkles /><b>Judge</b><small>Prompt · model<br />silent · escalate</small></div><ChevronRight className="flow-arrow" /><div className="flow-step"><span>04</span><ShieldCheck /><b>Review</b><small>Running record<br />human override</small></div></div></section>

        <section id="verdict" className="chapter-section verdict-section">
          <div className="section-aside"><SectionLabel number="03" children="Validation verdict" /><p>Direct, not polite</p></div>
          <div className="section-content">
            <div className="verdict-top"><div><div className="verdict-stamp"><Check size={14} /> PROCEED — WITH SCOPE CONTRACT</div><h2>Strong idea. Narrow demo.<br /><em>Publish the uncertainty.</em></h2></div><p className="verdict-summary">Reader Leader is competition-grade because it aligns with the rubric, names a buyer, uses AI where judgement matters, and has a demo moment judges can understand in one glance.</p></div>
            <div className="score-grid">{[["Problem strength", "9.0", "A concrete, expensive-to-scale adult workflow with a clear human cost when automation is wrong."], ["Feasibility", "8.0", "A known-text prototype is buildable; annotation, consent, and alignment are the critical path."], ["Differentiation", "8.5", "Judgement, abstention, auditability, and content governance—not another speech tutor."], ["Wow factor", "9.0", "A deliberate silence on a regional reading variant is technically and emotionally legible."]].map(([name, score, copy]) => <div className="score-card" key={name}><span>{name}</span><strong>{score}<small>/10</small></strong><p>{copy}</p></div>)}</div>
            <div className="risk-module"><div className="risk-copy"><span className="mini-label">INTERACTIVE MODEL</span><h3>How much should the agent speak?</h3><p>Drag the tolerance dial. Higher tolerance means fewer interventions and more abstention. The product should optimise for safe intervention, not maximum correction rate.</p><div className="range-wrap"><input aria-label="Risk tolerance" type="range" min="0" max="100" value={riskTolerance} onChange={(e) => setRiskTolerance(Number(e.target.value))} /><div className="range-labels"><span>More intervention</span><span>More abstention</span></div></div></div><div className="risk-result"><div className="risk-ring"><span>{estimatedIntervention}%</span><small>estimated<br />intervention</small></div><div className="risk-legend"><span><i className="dot lime" /> speak only with evidence</span><span><i className="dot moss" /> preserve self-correction</span><span><i className="dot paper" /> escalate uncertainty</span></div></div></div>
            <div className="verdict-columns"><div><span className="mini-label">THE SHARPEST VERSION</span><blockquote>“An accent-aware, reference-conditioned reading-record agent for Irish literacy teams.”</blockquote><p>It listens to one child read one known passage, decides when to prompt, model, stay silent, or escalate, and gives the adult an auditable record with the audio evidence behind every judgement.</p></div><div><span className="mini-label">DO NOT BUILD</span><ul className="do-not-list"><li><X size={15} /> Full Reception-to-GCSE platform</li><li><X size={15} /> Broad multi-accent claims</li><li><X size={15} /> Comprehension or learning-gain claims</li><li><X size={15} /> Open uploads before rights + safety gates</li></ul></div></div>
          </div>
        </section>

        <section className="closing-section"><div className="closing-mark"><img src={markImage} alt="" /></div><div><span className="mini-label">FINAL CALL</span><h2>The agent decides when to speak.<br />The adult decides what it means.</h2><p>Build the restraint. Measure the false correction. Let the evidence carry the pitch.</p></div></section>

        <footer className="report-footer"><div><AppMark /><p>Idea research · Reader Leader · Sep 2026</p></div><div className="footer-sources"><span className="mini-label">SELECTED SOURCES</span>{sources.map((s) => <a key={s.n} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">[{s.n}] {s.label} <ExternalLink size={12} /></a>)}</div></footer>
      </main>
    </div>
  );
}
