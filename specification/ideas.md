# Reader Leader Research Webpage — Design Direction

## Three stylistic approaches

### Theme Name: Quiet Editorial Evidence Lab
Very brief intro: A warm, tactile research interface that treats evidence like a well-edited magazine spread: calm enough to read, structured enough to trust, and punctuated by a sharp signal color for the decisive metric.
Probability: 0.07

### Theme Name: Classroom Instrument Panel
Very brief intro: A practical, light-first dashboard inspired by teacher planning tools, with clear status bands, compact charts, and a human, utilitarian tone that makes the prototype feel deployable.
Probability: 0.04

### Theme Name: Listening Signal
Very brief intro: A restrained dark interface where audio traces, decision nodes, and abstention states become a visual language for the agent’s judgement layer.
Probability: 0.02

## Selected approach: Quiet Editorial Evidence Lab

### Design Movement
Contemporary editorial information design with traces of Swiss modernism and Irish print culture: strong hierarchy, generous margins, tactile paper, and one deliberate signal color.

### Core Principles
1. Evidence before decoration: every visual element should help a visitor understand the problem, the frontier, or the decision.
2. Restraint is visible: “stay silent” and uncertainty should be represented as deliberate states, not empty UI.
3. Asymmetric editorial rhythm: use a left rail, offset columns, pull quotes, and staggered sections rather than repeated centered cards.
4. Human-readable by default: high contrast, generous line length, visible source links, and keyboard-accessible controls.

### Color Philosophy
Warm paper and ink navy make the page feel like a serious field note rather than a SaaS landing page. Moss green signals trust and human oversight. Acid chartreuse is reserved for decision points, score deltas, and the false-correction metric so the eye learns what matters.

### Layout Paradigm
A persistent left-side chapter rail paired with a wide reading canvas. The hero uses a split composition with visual weight on the right. Research sections alternate between prose-led text and evidence panels, with a sticky “verdict” rail on desktop and stacked flow on mobile.

### Signature Elements
- A chartreuse “signal line” running through timelines and agent decisions.
- Editorial margin labels such as “01 / CHALLENGE” and “EVIDENCE NOTE”.
- Audio-wave and underline motifs used sparingly to connect listening, alignment, and abstention.

### Interaction Philosophy
Interactions should reveal reasoning, not entertain. Tabs switch between problem evidence and judge signals; sliders expose how false-correction assumptions change the verdict; accordions reveal methods and caveats. Every interactive control has a visible label and a static fallback state.

### Animation
Use short, directional transitions under 240ms for section reveals, chart highlights, and active-state changes. Animate the signal line and evidence markers only when they help establish sequence. Respect prefers-reduced-motion and never animate the core research text.

### Typography System
Use a high-contrast editorial serif for display headings and a neutral sans for body, data labels, and UI. Headings are compact and slightly italicised where useful; body copy remains plain and highly legible. Use tabular numerals for scores and dates.

### Brand Essence
Reader Leader research is the evidence pack for building an AI reading tutor that earns trust by knowing when not to correct. Personality: careful, candid, grounded.

### Brand Voice
Headlines are direct and specific; CTAs sound like invitations to inspect a claim, not marketing promises. Microcopy states uncertainty plainly.
Example lines: “The product is not speech recognition. It is judgement under uncertainty.” / “Show me the error—or show me why you stayed silent.”

### Wordmark & Logo
Use a compact symbol combining an open book with a listening ear and a notch of sound, paired with the typed name only in the interface. The mark should work independently as the page favicon and section stamp.

### Signature Brand Color
Acid chartreuse #D9F23F — used only for the headline metric, active chapter state, and agent decision signal.

## Style Decisions
- Prefer paper texture, ink navy, moss, and chartreuse over gradients or neon.
- Use generated hero and mark assets only in prominent locations; quantitative charts remain deterministic SVG/CSS or chart components.
- Keep source links visible and avoid invented testimonials, ratings, or claims of learning gain.
