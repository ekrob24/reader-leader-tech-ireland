# Reader Leader — Master Brief

*One product, two engines, one metric. Everything the team has written, pulled into a single idea.*

TechIreland National AI Challenge 2026 · Build sprint 28 August – 14 September · Showcase: Galmont Hotel, Galway, 24 September

---

## The idea in one paragraph

A child only becomes a fluent reader by reading aloud to someone who can hear the difference between a mispronunciation, a guess, a self-correction and an accent. That listening is the scarcest resource in education. Reader Leader is an AI reading tutor for primary and secondary children in Ireland and the UK that supplies the listening: it hears a child read aloud, decides word by word whether to prompt, model or stay silent, and writes the running record while it listens. Two things make that work and neither is the speech recognition. The first is a judgement layer, the agent, that reasons about what an error actually is before it acts. The second is an open, curriculum-tagged content library that decides what a child reads and whether it is safe to put in front of them. The agent decides when to speak. The library decides what is worth reading. Both are the same promise from two ends: never mistake an accent for an error. The number that proves it is the false-correction rate.

---

## 1. The problem, stated plainly

Teachers in a class of thirty give each child a few minutes of individual reading time a week. The children who need the most attention, struggling, dyslexic and EAL readers, usually get the least. Parents who want to help often lack the phonics knowledge to know whether "house" read for "horse" needs correcting now or is a self-correction already in flight. The assessment that should guide all of this, the running record, is handwritten, takes ten to fifteen minutes per child, and happens two or three times a year.

General-purpose speech recognition cannot fill the gap. It is trained on adult speech, it degrades measurably on children's higher-pitched and still-developing articulation, and it degrades again on regional accents and dialects it never saw in training. This matters more than it first appears, because correction you cannot trust is worse than no correction. A child who is told they are wrong when they are not stops reading aloud. That single failure mode governs the whole design.

---

## 2. The product: one product, two engines, one metric

### Engine one — the agent (the judgement layer)

The speech recognition is the input, not the product. Hearing "hoarse" where the text says "house" is trivial. Deciding what to do about it is the entire job. Is it a grapheme confusion worth reteaching, a whole-word guess from context, a self-correction already happening, a dialectal realisation that is not an error at all, or an ASR misrecognition the agent should distrust? Each answer produces a different action:

- **Prompt** — the child has stalled or made a genuine error; a light cue, not the answer, gives them the chance to self-correct first.
- **Model** — the child is stuck and the cue has not worked; the agent supplies the word cleanly and the reading moves on.
- **Stay silent** — the reading is correct, including when it does not match the reference pronunciation. Regional variants are not errors.
- **Escalate** — low confidence or a pattern that needs a person; the agent logs it and flags a human rather than guessing.

The agent also has to reason about *when* to intervene. Interrupting every error destroys fluency and confidence, so it holds errors, weighs them against the child's phonics stage, and chooses its moments. That restraint has a pedagogical reason: the pause before a prompt is exactly where self-correction lives, and an intervention that arrives too fast removes the chance to self-correct and destroys the signal. Latency is pedagogy.

The same listening pass writes the running record: accuracy, error types (substitution, omission, insertion, repetition, self-correction and hesitation), self-corrections counted separately as a positive signal, words-correct-per-minute tracked across sessions, a prosody rating, and the source audio attached to every logged event so an adult can check any judgement. Every judgement is reversible in two clicks, and the override feeds back into the model.

### Engine two — the open library (what is worth reading, and whether it is safe)

Every competitor in this space ships a closed, licensed corpus, so a child reads what the vendor bought. The class novel, the topic text, the homework passage and the local story are not in there. Reader Leader opens the corpus: publishers, schools and MATs, teachers and tutors, parents and students can all add material, and each contributor type carries a trust tier that decides how their upload is reviewed. Open contribution and unchecked content are not the same thing, and the metadata is what keeps them apart.

Every text is described on **twelve facets in four families**, most derived automatically at upload with four fields confirmed by the contributor:

- **What it is** — language and EAL suitability; region and expected pronunciation set; genre and form.
- **Who it is for** — reading standard (National Curriculum year, DfE Reading Framework strand, Lexile/reading age, CEFR); interest level held independently of reading level; the high-interest low-demand profile.
- **Where it came from** — author and resolved rights status; who added it and at what trust tier; whether it does something new with the form.
- **Whether it can be used** — accessibility as a four-rung ladder rather than a yes/no tick; audience and permissions; approval status.

Two rules make the library safe to have. **One gate, no exceptions:** nothing reaches a child before it has a resolved rights status, a completed screen and an approval, and nothing in "waiting approval" is ever visible to a child. **Both permission fields default to the narrowest setting:** a parent uploading a bedtime book is never one click from publishing it to four hundred schools.

The library also carries the layer nobody else indexes: a **decodability profile**. A reading level tells you a text is roughly right; a decodability profile tells you whether *this* child, at this point in the phonics progression, can actually get the words off the page. The library scores the percentage of words decodable at each phonics phase, so a match is a number rather than a judgement, and says out loud when a passage is a guided text rather than an independent one.

### Where the two engines meet — the false-correction rate

Region tagging is a metadata field doing safety work. A text tagged with the regional pronunciation sets it has been validated against tells the agent when staying silent is the correct decision. That is the library's direct contribution to the false-correction rate, and the false-correction rate is the headline metric of the whole product.

Two failure modes, very different costs. A **missed error** costs one teaching moment; the next session or the human tutor catches it, and the child reads on none the wiser. A **false correction** tells a child who read correctly that they were wrong; there is no automatic recovery, confidence and trust both drop, and a single observed false correction ends an adult's adoption. Most read-aloud tools report accuracy. Reader Leader reports the rate at which it was wrong to speak, measured separately for standard and regional pronunciations, and published rather than buried.

The demo the team is aiming at: a child reads a word in a strong regional accent, and the agent says nothing, because it recognises the variation as correct rather than as an error, and the running record shows the reasoning. Restraint as a feature. That is the moment we want on the day.

---

## 3. The pedagogy underneath it

Everything is tagged to the **Simple View of Reading** (Gough and Tunmer), which also underpins the DfE Reading Framework: reading comprehension is word reading multiplied by language comprehension. Reader Leader runs an engine on each axis, a phonics and fluency engine (word-level feedback, decodability, WCPM, prosody) and a vocabulary and comprehension engine (pre-teaching, retelling, targeted questions), so an adult can see which axis a child needs help on rather than a vague level.

The stance that positions the product against pure-AI-avatar competitors: **AI listens, humans decide.** The AI listens to every word every session, scores accuracy, fluency and prosody, pre-teaches vocabulary and generates the running record. The human tutor decides what the record means, chooses the next session, builds bespoke content, holds the relationship the family trusts, and moderates the shared library. That division never inverts.

Six principles the team holds to regardless of build pressure: standards-tagging is a first-class data model from day one; the decodability checker ships before open uploads do; every upload passes safety and copyright screening before any moderation queue; license proven children's-voice ASR first and build the accent dataset in parallel, not instead; fairness across accents is measured continuously and published; and AI produces the record while a human decides what it means.

---

## 4. What a child actually does — the student journey

Eight stages. Stages one to six sit inside a single ten to fifteen minute session; stage zero happens once; stage seven happens without anyone lifting a pen.

- **0 — Placement.** Phonics stage, reading level and a short voice-calibration read so the agent hears this child's accent, pace and volume before it judges anything. One session, never a test week. It is also the baseline every later session is read against.
- **1 — Word warm-up.** The target graphemes, common exception words and likely-unknown vocabulary pulled from the passage the child is about to read, so the child is not getting four failures on the same word.
- **2 — Model read.** The passage read aloud well, in an accent that could come from the child's own classroom, because a model voice a child does not recognise teaches them that reading well means sounding like someone else. Prosody is modelled before it is measured.
- **3 — Read it through.** Silent read at the child's own pace with light check-in prompts, plus a self-flag: the child taps anything they were unsure of, and that flag goes into the record. It is the quietest and one of the most useful signals in the product.
- **4 — Read aloud.** The recorded read, three decisions made word by word: prompt, model or stay silent. This is the hard problem and the one the Challenge prototype is built around.
- **5 — Listen back.** The child hears their own recording with the text highlighted in time, re-records one sentence, and sees that their self-corrections counted as a strength.
- **6 — Show you understood.** Two to four questions under three minutes: retell, retrieve, infer, vocabulary. Fluency without comprehension is just speed, so comprehension is reported next to accuracy and rate, never instead of them.
- **7 — The running record.** Errors typed, WCPM and prosody scored, audio attached, filed for the adult automatically.

One session, two experiences. The child never sees a metric; they see a book they chose, a voice that sounds like where they live, help only when they are actually stuck, and progress shown as books finished. The adult never sees a raw waveform; they see a completed running record, error types and self-correction ratio over time, WCPM and prosody trends, and which pupils need a human and for what. The child-facing product is a reading session. The adult-facing product is evidence.

Rhythm: ten to fifteen minutes, four to five times a week, from Reception to GCSE as one continuous record. Frequency beats duration for fluency gain. Session length and cadence are design assumptions to validate with pilot schools, not measured results.

---

## 5. The technical spine

### It is not one model choice, it is three

The challenge fixes the shape: the ASR layer is licensed, not built, and no licence lands inside the sprint, so the prototype runs the agent on an open children's-speech baseline while the vendor decision is presented as a costed production choice with the accuracy gap measured, not asserted. That splits into three decisions that should not be collapsed:

| Layer | What it does | Decided | Governs |
|---|---|---|---|
| Production ASR | The recogniser licensed for the real product | Post-challenge, costed | Real-world false-correction rate |
| Sprint baseline | The open recogniser the agent runs on for the build | Now | Whether the demo works at all |
| Alignment + scoring | Maps audio to the on-screen words to error type | Now | The whole judgement layer |

**The reframe that changes everything:** the target text is known before the child reads it. So the core job is forced alignment and pronunciation judgement against a known reference, not open-vocabulary dictation. Open dictation is the harder, noisier problem the team does not actually have. This is why phoneme-level acoustic models matter more here than a headline WER number, and why consumer dictation apps are the wrong category entirely, since they rewrite disfluent speech into clean text and erase exactly the miscues being graded.

### The choices on the table

- **Sprint baseline:** wav2vec2 / XLS-R as the primary, with Kid-Whisper as the fast fallback. wav2vec2 has lower children's WER than Whisper and its phoneme-level CTC output is exactly what forced alignment needs, so recognition and alignment collapse into one acoustic pass. Kid-Whisper stands up in an afternoon but is US-conversational and not tuned to British or Hiberno-English read-aloud.
- **Alignment and scoring:** wav2vec2 CTC alignment plus a Goodness-of-Pronunciation score, so the judgement layer sits on one acoustic pass, with the Montreal Forced Aligner held in reserve if boundary precision is off.
- **Production choice (the costed slide, name four and let the trade-offs show):** Speechace (reading-fluency API with a kids oral-reading-fluency surface and an EU West Ireland endpoint, strongest functional and data-residency fit, but a general model applied to children); Azure Pronunciation Assessment (richest scoring against a reference text, but en-US-only prosody and native-adult-normed); Speechmatics (best accent robustness, native word timings and a `sounds_like` custom dictionary that lets you declare a regional realisation valid, but the judgement layer is entirely yours to build); and SoapBox / AI Labs (the purpose-built Dublin-built child engine, now folded into Curriculum Associates and likely closed to external licensing, worth one confirming email and worth naming as the benchmark others are measured against).

### The architecture concept

A three-tier design under evaluation: a browser reading canvas capturing 16kHz audio with client-side voice-activity detection in WebAssembly (zero network latency, zero hosting cost, and client-side patience timers that respect the three-to-five seconds of processing time young readers need); an edge speech and alignment layer that scores acoustic confidence against targeted phonemes and emits lightweight JSON rather than storing continuous raw audio; and an asynchronous cloud diagnostic layer that aggregates error logs and, when phoneme gaps appear, retrieves and generates decodable practice text restricted to the child's active phonics level. The one confirmed procedural commitment is **ManusAI as the primary build and iteration partner**. Everything else in the stack is an option under evaluation, not a selection.

### The data question — "one accent, measured properly"

Synthetic and real data are not interchangeable: **synthetic to build, real to measure.** Synthetic child voices (ElevenLabs, Azure Neural TTS) are valid for demo narration, model-pronunciation clips and training augmentation, and for negative tests that confirm the agent stays silent when nothing is wrong. They cannot produce a real miscue, self-correction or authentic accent realisation, which is exactly what is being graded, so the headline metric is reported on real consented audio only. Three hard rules: never clone a real child's voice; label every synthetic asset as synthetic (an EU AI Act transparency obligation and a reputational one); and keep synthetic out of the accuracy numbers.

For real data, **PF-STAR** (British English children, consented and released for research) is the backbone and gives a citeable measured accuracy out of the box if the demonstrated accent is a British regional variety. There is no open Hiberno-English children's corpus, so an Irish demo needs a small consented micro-collection, framed as a methodology demonstration with a real number on a small n rather than a dataset. Either way, the Open Library's region-tagging is the production-side answer to the same gap: data you do not have, encoded as a rule the agent can apply.

### What it costs in the sprint

Almost nothing. The baseline recogniser and alignment tools are open-weight, so licence cost is zero and a fine-tune is tens of dollars of GPU time at most, with demo inference running on a laptop. Synthetic voice content is covered by an ElevenLabs Creator plan at about twenty-two dollars, or the Azure TTS free tier. A pronunciation-scoring API, if wired in, fits inside free tiers and trial credits. **Realistic sprint budget: under about fifty dollars, most of it optional.** The expensive decisions, per-hour ASR licensing, custom voice hosting and dataset agreements, all belong to production, which the brief explicitly defers.

---

## 6. Fairness by design (the thread through the whole thing)

Accuracy is tracked and published across regional accent groups on an ongoing basis, not as a one-off launch test. The named varieties in scope for the model include Scouse, Geordie, Brummie, Scottish, Welsh, Cockney/Estuary, Irish variations, Received Pronunciation, Caribbean-British and South Asian-British, alongside EAL learners. This is treated as a first-class metric rather than an afterthought for a concrete reason: independent research has found major ASR systems performing significantly worse for some demographic speech groups than others, and a product that quietly under-serves certain accents is both a pedagogical failure and a serious procurement risk with schools. Accent and dialect variation is modelled as legitimate variation, never as error. This is the central bias risk in the domain and it is treated as a launch blocker, not a backlog item.

---

## 7. The market and the business

**Who pays and why.** Primary schools, literacy coordinators and SEN/SET teams; multi-academy trusts and school groups; private tutors and tuition franchises; and parents of struggling, dyslexic or EAL readers. The budget already exists, in reading intervention programmes, teaching-assistant hours, standardised assessment licences, and private tuition at £35–£50 an hour in the UK and €40–€60 in Ireland. The buyer is the literacy coordinator or SET team; the child is the user. The student journey is the user experience, and the evidence workflow is the buyer case.

**Why an indexed open library beats a licensed corpus**, measured against the closed-content products (ClearFluency, Amira Learning, Reading Plus, Lexia, and the free-and-generic Microsoft Reading Coach as the practice baseline):

| | Closed-corpus products | Reader Leader open library |
|---|---|---|
| What a child reads | Whatever the vendor licensed | Whatever the school teaches, plus a licensed core |
| Local and cultural fit | Largely US-authored, US-normed | The class novel, the local story, the school's own writing |
| Time to add a text | A publishing cycle | Minutes, same pipeline for everyone |
| Accent handling | A property of the recogniser alone | Stored per text, used to decide when to stay silent |
| Rights position | Cleared centrally, closed to contribution | Resolved per text, enforced before publication |

The honest trade: the open model carries a moderation cost a closed corpus never pays. The team treats that cost as the price of relevance and builds the pipeline to absorb it rather than pretending it is not there.

**Build phases, twenty-four months.** Phase 1 (months 0–4): MVP with a curated library, licensed ASR, phonics decodability and a tutor dashboard, no open uploads. Phase 2 (months 4–9): verified tutor and school uploads, moderation queue live, accent-data collection begins. Phase 3 (months 9–18): parent and student uploads, community library, proprietary ASR fine-tuning, public launch. Phase 4 (months 18–24): CEFR groundwork, DfE pilot engagement, Series A readiness.

**Geography: Ireland first, UK as expansion.** This is an Irish challenge with Irish judges, so the framing is NCCA rather than National Curriculum, SET rather than SENCO, euro not sterling, and Hiberno-English leading the accent list. The existing decks read as UK-first, so someone needs a terminology pass across every slide before showcase day. Post-challenge routes: school and MAT licensing, tutor and franchise licensing, direct-to-parent subscription, MIS and assessment-platform integration, and alignment with the DfE's AI-tutoring pilot and Ireland's literacy strategy.

---

## 8. Responsible AI and safeguarding (the boundaries that do not move)

- Accent and dialect variation is modelled as legitimate variation, never error. Launch blocker.
- The agent never invents a reading behaviour the audio does not support. Low confidence produces silence and a teacher flag, never a correction.
- It does not diagnose. Patterns consistent with decoding difficulty are surfaced and routed to a qualified professional.
- No autonomous change to a child's reading level or intervention status without adult confirmation.
- Child voice data is minimised, consent-gated, retention-limited, and never used for training without explicit opt-in (a separate tick, off by default).
- Uploaded content passes safeguarding review before it reaches a child.

The consent pack doubles as proof to the judges that safeguarding is a launch blocker, not a backlog item: guardian consent plus a child-facing plain-language notice, purpose limitation, no-training-without-opt-in, a retention limit and withdrawal route, and secure minimised storage. The governing guidance is named in the pitch: in Ireland the DPC's "Children Front and Centre" fundamentals and the Data Protection Act 2018, with Children First and Garda vetting as the school-premises layer; in the UK the ICO Age Appropriate Design Code, with DBS and Keeping Children Safe in Education. For the sprint, favour family and guardian consent over school collection to avoid the vetting overhead, and name the school route as the production path.

---

## 9. The Challenge sprint (28 August – 14 September)

Not the whole product. The spine, the gate, and the one stage that carries the thesis.

### The five decisions the team took

1. **Problem** — adult listening capacity is the bottleneck (not "children cannot read", which is a deficit story Irish judges will resist, and not "general ASR fails", which is a technical gap nobody buys).
2. **User segment** — Irish primary literacy coordinators and SET teams (they buy; the child uses).
3. **Value proposition** — reviewable evidence with adult judgement preserved; it knows when *not* to correct (not "an AI reading tutor", which Microsoft Reading Coach already does for free, and not "the most accurate children's recogniser", a claim the team is licensing rather than building and cannot support).
4. **Geography** — Ireland first, UK as expansion.
5. **Prototype scope** — stage 4 end to end, one passage, one measured regional variety, four permitted actions, a visible decision trace, a draft running record and a two-click override.

### In scope for the build

Stage 4 read-aloud on one text; one regional accent variant measured; the prompt/model/stay-silent decision live with a visible decision trace on the teacher screen; known-text word alignment with confidence scoring; a draft running record with audio linked to every event; a two-click logged override; and a false-correction figure with a stated method and sample size. On the library side: the facet schema v1, the upload-to-status pipeline on one text type, region tagging wired into the stage-4 decision, three moderation states live, a four-facet filter demo with permission scoping, and a rights field that blocks publication when unresolved. Audio comes from five consented children plus an adult-performer backup set recorded in week one.

### Out of scope (roadmap, not gaps)

Comprehension and retell scoring, gamification, the full Reception-to-GCSE progression, multi-child classroom management, the parent subscription flow, languages beyond UK English, publisher rights integration, broad multi-accent coverage, production ASR licensing, a certified WCAG audit, and any claim of measured learning gain. Naming these explicitly is how the sprint stays finishable.

### Process, gates and owners

Four phases, each with a gate. **Decide** (29–31 Aug, owner: the whole team with John as business owner) → gate: scope contract signed. **Evidence** (31 Aug – 4 Sep, owner: Applied ML) → gate: replay passes on the gold pack. **Policy** (7–11 Sep, owner: full-stack) → gate: demo runs end to end. **Freeze** (12–13 Sep, owner: product lead) → gate: submitted on time. Three lanes run in parallel from day one: build and integrate; rubric and gold pack; deck and demo script.

### Risks live throughout

- **Silence reads as failure.** The money shot is the agent doing nothing, and a judge cannot tell a deliberate decision from a crash. Mitigation: the decision trace is a first-class deliverable, not a debug view.
- **The literacy seat is unfilled.** No owner for the gold pack or the variation sign-off, and it sits on the critical path from day one. This is mentor session one.
- **Consent can be withdrawn at any point.** Record the adult-performer backup set in week one; one hour, costs nothing, protects the demo.
- **The false-correction number may be unflattering.** Decide the rule now: publish it regardless, framed as a baseline with a stated method. The method is the contribution.

### Deadlines and governance

Submission by 14:00 on 13 September (slides in Google Slides or Microsoft format, not PDF, plus demo links to the organisers); final in-person day 14 September; finalists announced 16 September; National AI Meet and top-three at the Galmont Hotel, Galway, on 24 September. One governance flag worth surfacing: the team details form takes one organisation ID and email, and the playbook states that whoever holds that account retains all IP created. Confirm this is set to the right owner before it is treated as settled.

---

## In one line

The agent decides when to speak. The library decides what is worth reading, and whether it should be in front of a child at all. Every voice, every story, every reader.
