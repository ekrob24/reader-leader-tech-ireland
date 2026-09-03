import { expect, Page, test } from "@playwright/test";

type User = { id: number; openId: string; name: string; email: string; role: "admin" | "user" };
type Scenario = "success" | "forbidden" | "empty" | "error" | "timeline-integrity";

const teacher: User = { id: 1, openId: "teacher-user", name: "Teacher Example", email: "teacher@example.com", role: "admin" };
const viewer: User = { ...teacher, role: "user", name: "Viewer Example" };
const learner = { id: "00000000-0000-4000-8000-000000000001", displayName: "Ava Reader", safeLabel: "Ava", organisationId: "00000000-0000-4000-8000-000000000010" };
const workspaceFor = (canManage: boolean) => ({ learner, canManage, timeline: [{ id: "00000000-0000-4000-8000-000000000011", learnerId: learner.id, action: "PROMPT", status: "OVERRIDDEN", summary: "Prompt suggested after a substitution.", createdAt: "2026-09-02T10:00:00.000Z", overrideId: "00000000-0000-4000-8000-000000000012" }], audit: canManage ? [{ id: "00000000-0000-4000-8000-000000000013", actorId: "00000000-0000-4000-8000-000000000014", learnerId: learner.id, eventType: "OVERRIDE_CREATED", summary: "Teacher reviewed the prompt.", createdAt: "2026-09-02T10:01:00.000Z" }] : [] });

const overviewFor = (role: "teacher" | "viewer") => ({
  role,
  canManageSafety: role === "teacher",
  teacherControls: {
    canReviewEvidence: role === "teacher",
    canAppendOverride: role === "teacher",
    canViewDiagnosticDetail: role === "teacher",
  },
  childSafeView: {
    title: "A calm next step",
    message: "Let’s try that word together.",
    template: "PROMPT",
    safetyNote: "Only approved, encouraging language is shown here. Adult diagnostics stay private.",
  },
});

const contentOverview = {
  organisation: { id: learner.organisationId, name: "Demo Academy", role: "school_admin", canGovernContent: true },
  approvedPassages: [{ id: "00000000-0000-4000-8000-000000000021", title: "The gentle harbour", body: "A short approved passage for teacher selection.", version: 1, regionTags: ["IE"], approvalStatus: "APPROVED", rightsStatus: "CLEARED", safetyStatus: "PASSED", approvedAt: "2026-09-02T10:00:00.000Z", canApprove: false }],
  reviewQueue: [{ id: "00000000-0000-4000-8000-000000000022", title: "The draft lane", body: "A passage awaiting adult rights and safety review.", version: 1, regionTags: ["IE"], approvalStatus: "DRAFT", rightsStatus: "UNREVIEWED", safetyStatus: "UNREVIEWED", approvedAt: null, canApprove: false }],
  reviewHistory: [{ id: "00000000-0000-4000-8000-000000000023", passageId: "00000000-0000-4000-8000-000000000022", action: "DRAFT_CREATED", createdAt: "2026-09-02T10:00:00.000Z" }],
};

const hackathonDemoSummary = {
  organisationId: learner.organisationId,
  activeConsentCount: 1,
  blockedSessionCount: 0,
  queuedOrRunningJobCount: 1,
  sessions: [{
    id: "00000000-0000-4000-8000-000000000031", learnerId: learner.id, passageId: contentOverview.approvedPassages[0].id, organisationId: learner.organisationId,
    sessionStatus: "CREATED", uploadStatus: "NOT_STARTED", consentStatus: "ACTIVE", mayProcessData: true,
    job: null,
    traces: [{ id: "00000000-0000-4000-8000-000000000034", traceId: "00000000-0000-4000-8000-000000000033", sessionId: "00000000-0000-4000-8000-000000000031", stage: "SESSION_CONSENT_CHECKED", safeSummary: "Active guardian consent was verified before mock processing.", createdAt: "2026-09-02T10:00:00.000Z" }],
  }],
};
const childToken = "a".repeat(43);
const childReading = (state: "READY_TO_START" | "READING" | "COMPLETED", helpRequested = false) => ({
  state, passage: { title: "The gentle harbour", body: "The harbour is quiet. Boats wait by the shore." }, helpRequested, mockOnly: true,
  childMessage: state === "COMPLETED" ? "Thank you for reading. Your teacher will look at the next step with you." : state === "READING" ? "Read at your own pace. You can ask for help whenever you need it." : "When you are ready, start reading at your own pace.",
});
const teacherMockReview = { sessionId: hackathonDemoSummary.sessions[0].id, sessionStatus: "COMPLETED", passageTitle: "The gentle harbour", mockOnly: true, awaitingChild: false, wordEvents: [
  { id: "00000000-0000-4000-8000-000000000041", tokenIndex: 2, referenceWord: "through", eventType: "SUBSTITUTION", suggestedAction: "PROMPT", teacherNote: "Synthetic substitution for the teacher to review; invite a calm retry before modelling." },
  { id: "00000000-0000-4000-8000-000000000042", tokenIndex: 7, referenceWord: "harbour", eventType: "SELF_CORRECTION", suggestedAction: "STAY_SILENT", teacherNote: "Synthetic self-correction; no interruption is recommended." },
] };

async function authenticate(page: Page, user: User, scenario: Scenario = "success") {
  let timelineCalls = 0;
  let childState: "READY_TO_START" | "READING" | "COMPLETED" = "READY_TO_START";
  let helpRequested = false;
  await page.route("**/api/trpc/**", async route => {
    const requestUrl = new URL(route.request().url());
    const procedures = (requestUrl.pathname.split("/").pop() ?? "").split(",");
    const results = procedures.map(name => {
      if (name === "auth.me") return { result: { data: { json: user } } };
      if (name === "learnerSafety.learners") {
        if (scenario === "empty") return { result: { data: { json: [] } } };
        return { result: { data: { json: [learner] } } };
      }
      if (name === "learnerSafety.workspace") {
        return { result: { data: { json: workspaceFor(user.role === "admin") } } };
      }
      if (name === "learnerSafety.timeline") {
        if (scenario === "timeline-integrity") return { error: { json: { message: "Some timeline records need attention before this view can be shown.", code: -32022, data: { code: "UNPROCESSABLE_CONTENT", httpStatus: 422, path: name } } } };
        timelineCalls += 1;
        const pageNumber = timelineCalls;
        const pageItems = pageNumber === 1 ? workspaceFor(user.role === "admin").timeline : [];
        return { result: { data: { json: { items: pageItems, page: pageNumber, pageSize: 5, total: 6, nextPage: pageNumber === 1 ? 2 : null } } } };
      }
      if (name === "learnerSafety.overview") {
        if (scenario === "forbidden") return { error: { json: { message: "Learner safety is restricted", code: -32003, data: { code: "FORBIDDEN", httpStatus: 403, path: name } } } };
        if (scenario === "error") return { error: { json: { message: "Safety service unavailable", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path: name } } } };
        if (scenario === "empty") return { result: { data: { json: null } } };
        return { result: { data: { json: overviewFor(user.role === "admin" ? "teacher" : "viewer") } } };
      }
      if (name === "contentWorkflow.organisations") return { result: { data: { json: [{ id: learner.organisationId, name: "Demo Academy", role: "school_admin", canGovernContent: true }] } } };
      if (name === "contentWorkflow.overview") return { result: { data: { json: contentOverview } } };
      if (name === "consentLifecycle.retentionEligibility") return { result: { data: { json: { learnerId: learner.id, purpose: "READING_ASSESSMENT", status: "ACTIVE", mayProcessData: true, retentionUntil: "2030-12-31T23:59:59.000Z" } } } };
      if (name.startsWith("contentWorkflow.")) return { result: { data: { json: contentOverview.reviewQueue[0] } } };
      if (name === "hackathonDemo.summary") return { result: { data: { json: hackathonDemoSummary } } };
      if (name === "hackathonDemo.teacherHistory") return { result: { data: { json: { organisationId: learner.organisationId, items: [{ id: hackathonDemoSummary.sessions[0].id, learnerLabel: "Ava", passageTitle: "The gentle harbour", sessionStatus: "CREATED", completionStatus: "READY_TO_START", reviewStatus: "NOT_READY", createdAt: "2026-09-02T10:00:00.000Z", completedAt: null }] } } } };
      if (name === "hackathonDemo.resetSyntheticSessions") return { result: { data: { json: { deletedSessions: 1 } } } };
      if (name.startsWith("hackathonDemo.")) return { result: { data: { json: hackathonDemoSummary.sessions[0] } } };
      if (name === "childJourney.launch") return { result: { data: { json: { childPath: `/read/${childToken}`, expiresAt: "2026-09-03T12:30:00.000Z", mockOnly: true } } } };
      if (name === "childJourney.view") return { result: { data: { json: childReading(childState, helpRequested) } } };
      if (name === "childJourney.start") { childState = "READING"; return { result: { data: { json: childReading(childState, helpRequested) } } }; }
      if (name === "childJourney.requestHelp") { helpRequested = true; return { result: { data: { json: childReading(childState, helpRequested) } } }; }
      if (name === "childJourney.complete") { childState = "COMPLETED"; return { result: { data: { json: childReading(childState, helpRequested) } } }; }
      if (name === "childJourney.teacherReview") return { result: { data: { json: teacherMockReview } } };
      if (name === "readerLeader.preview") return { result: { data: { json: null } } };
      return { result: { data: { json: null } } };
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results) });
  });
}

async function openLearnerSafety(page: Page) {
  await page.goto("/");
  await page.getByText("Learner safety", { exact: true }).click();
  await expect(page).toHaveURL(/\/learner-safety$/);
}

test("unauthenticated learner safety access requires sign in", async ({ page }) => {
  let oauthUrl = "";
  page.on("request", request => { if (request.url().includes("/app-auth")) oauthUrl = request.url(); });
  await page.route("**/api/trpc/**", async route => {
    const requestUrl = new URL(route.request().url());
    const procedures = (requestUrl.pathname.split("/").pop() ?? "").split(",");
    if (procedures.includes("auth.me")) {
      const results = procedures.map(name => name === "auth.me" ? { result: { data: { json: null } } } : { result: { data: { json: null } } });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results) });
      return;
    }
    await route.continue();
  });
  await page.goto("/learner-safety");
  await expect.poll(() => oauthUrl).toContain("/app-auth");
});

test.describe("authenticated learner safety navigation", () => {
  test("teacher can navigate to learner safety and sees adult controls separated from child-safe view", async ({ page }) => {
    await authenticate(page, teacher);
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "Safety has two views." })).toBeVisible();
    await expect(page.getByText("Teacher controls", { exact: true })).toBeVisible();
    await expect(page.getByText("Child-safe view", { exact: true })).toBeVisible();
    await expect(page.getByText("Admin / teacher", { exact: true })).toBeVisible();
    await expect(page.getByText("Reverse an override", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Append reversal event" }).click();
    await expect(page.getByRole("dialog", { name: "Confirm override reversal" })).toBeVisible();
    await page.getByLabel("Reversal reason").fill("Teacher reviewed the original proposal and is restoring it for this learner.");
    await page.getByRole("button", { name: "Confirm reversal" }).click();
    await expect(page.getByRole("status")).toContainText("Reversal appended to the audit history.");
    await expect(page.getByLabel("Selected learner")).toHaveValue(learner.id);
    await expect(page.getByText("Decision timeline", { exact: true })).toBeVisible();
    await expect(page.getByText("Prompt suggested after a substitution.", { exact: true })).toBeVisible();
    await expect(page.getByText("Teacher audit history", { exact: true })).toBeVisible();
    await expect(page.getByText("Progress", { exact: true })).toBeVisible();
    await expect(page.getByText("1 of 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue gently" }).click();
    await expect(page.getByText("2 of 3", { exact: true })).toBeVisible();
    await expect(page.getByText("Enabled", { exact: true }).first()).toBeVisible();
  });

  test("configuration failure is actionable and does not expose the raw Supabase URL error", async ({ page }) => {
    await authenticate(page, teacher, "error");
    await openLearnerSafety(page);
    await expect(page.getByText("Safety workspace unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText(/Invalid supabaseUrl/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry loading" })).toBeVisible();
  });

  test("authenticated adults can reach the content workflow and see approval separated from teacher selection", async ({ page }) => {
    await authenticate(page, teacher);
    await page.goto("/");
    await page.getByText("Content workflow", { exact: true }).click();
    await expect(page).toHaveURL(/\/content-workflow$/);
    await expect(page.getByRole("heading", { name: /Approve the text/i })).toBeVisible();
    await expect(page.getByText("Approved passages", { exact: true })).toBeVisible();
    await expect(page.getByText("The gentle harbour", { exact: true })).toBeVisible();
    await expect(page.getByText("Review queue", { exact: true })).toBeVisible();
    await expect(page.getByText("The draft lane", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear rights" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pass safety" })).toBeVisible();
    await expect(page.getByText("0 of 3 gates", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Needs rights 1/i }).click();
    await expect(page.getByText("The draft lane", { exact: true })).toBeVisible();
    await expect(page.getByText(/Rights: UNREVIEWED/)).toBeVisible();
  });

  test("authenticated adults can review the consent-gated mock session and safe analysis trace", async ({ page }) => {
    await authenticate(page, teacher);
    await page.goto("/");
    await page.getByText("Session demo", { exact: true }).click();
    await expect(page).toHaveURL(/\/session-demo$/);
    await expect(page.getByRole("heading", { name: /Demonstrate the safety path/i })).toBeVisible();
    await expect(page.getByText("Synthetic only", { exact: true })).toBeVisible();
    await expect(page.getByText("Consent-gated session", { exact: true })).toBeVisible();
    await expect(page.getByText("Launch & mock upload", { exact: true })).toBeVisible();
    await expect(page.getByText("Interactive safe trace", { exact: true })).toBeVisible();
    await expect(page.getByText("Active guardian consent was verified before mock processing.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run deterministic mock analysis" })).toBeVisible();
    await expect(page.getByText("Synthetic session history", { exact: true })).toBeVisible();
    await expect(page.getByText("Awaiting finish", { exact: true })).toBeVisible();
    await expect(page.getByText(/does not capture or transmit a recording/i)).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Demo Mode is on.");
    await expect(page.getByText("Synthetic file preset", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Session consent checked/i }).click();
    await expect(page.getByText("Active guardian consent was verified before mock processing.", { exact: true })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download safe trace" }).click();
    expect((await download).suggestedFilename()).toBe("reader-leader-synthetic-safety-trace.json");
    await page.getByRole("button", { name: "Judge tour" }).click();
    await expect(page.getByRole("dialog", { name: "Judge guided tour" })).toBeVisible();
    await expect(page.getByText("1. Content is approved first", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("2. Consent gates the session", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close tour" }).click();
    await page.getByRole("button", { name: "Reset synthetic sessions" }).click();
    await expect(page.getByRole("alertdialog", { name: "Reset synthetic demo sessions?" })).toBeVisible();
    await expect(page.getByText(/removes only sessions tagged as synthetic demo records/i)).toBeVisible();
    await page.getByRole("button", { name: "Keep sessions" }).click();
  });

  test("teacher launch hands a synthetic child reading journey back to deterministic adult review", async ({ page }) => {
    await authenticate(page, teacher);
    await page.goto("/session-demo");
    await expect(page.getByRole("heading", { name: "Teacher session checklist" })).toBeVisible();
    await expect(page.getByText("Active synthetic consent is available", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Review ready" }).click();
    await expect(page.getByText("No completed synthetic sessions are ready for adult review.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "All sessions" }).click();
    await page.getByRole("button", { name: "Launch child reading canvas" }).click();
    await expect(page.getByRole("link", { name: /Open the synthetic child reader/i })).toHaveAttribute("href", `/read/${childToken}`);
    await page.goto(`/read/${childToken}`);
    await expect(page.getByRole("heading", { name: "The gentle harbour" })).toBeVisible();
    await expect(page.getByText(/does not record, upload, score, or analyse your voice/i)).toBeVisible();
    await expect(page.getByText(/teacher review/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Start reading" }).click();
    await expect(page.getByText("Reading progress", { exact: true })).toBeVisible();
    await expect(page.getByText("Part 1 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next part" }).click();
    await expect(page.getByText("Part 2 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Spacious" }).click();
    await page.getByRole("button", { name: "Focus mode" }).click();
    await expect(page.getByRole("button", { name: "Exit focus mode" })).toBeVisible();
    await page.getByRole("button", { name: "Exit focus mode" }).click();
    await page.getByRole("button", { name: "I would like some help" }).click();
    await expect(page.getByText(/Your teacher knows you would like help/i)).toBeVisible();
    await page.getByRole("button", { name: "I am finished" }).click();
    await expect(page.getByRole("heading", { name: "Thank you for reading." })).toBeVisible();
    await page.goto(`/session-review/${hackathonDemoSummary.sessions[0].id}`);
    await expect(page.getByRole("heading", { name: /Reading review/i })).toBeVisible();
    await expect(page.getByText("Deterministic mock word events", { exact: true })).toBeVisible();
    await expect(page.getByText("through", { exact: true })).toBeVisible();
    await expect(page.getByText("SELF CORRECTION", { exact: true })).toBeVisible();
    await expect(page.getByText(/does not diagnose a learner/i)).toHaveCount(2);
  });

  test("an invalid persisted timeline record has a safe and actionable recovery state", async ({ page }) => {
    await authenticate(page, teacher, "timeline-integrity");
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "Timeline record needs attention" })).toBeVisible();
    await expect(page.getByText(/A saved decision is incomplete or uses an unsupported format/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh timeline" })).toBeVisible();
    await expect(page.getByText("Prompt suggested after a substitution.", { exact: true })).toHaveCount(0);
  });

  test("teacher can paginate the persisted decision timeline", async ({ page }) => {
    await authenticate(page, teacher);
    await openLearnerSafety(page);
    await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await expect(page.getByText("No decisions have been persisted for this learner yet.", { exact: true })).toBeVisible();
  });

  test("viewer can navigate to learner safety but receives read-only controls", async ({ page }) => {
    await authenticate(page, viewer);
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "Safety has two views." })).toBeVisible();
    await expect(page.getByText("Read only", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Approved projection", { exact: true })).toBeVisible();
    await expect(page.getByText("A calm next step", { exact: true })).toBeVisible();
    await expect(page.getByText("Decision timeline", { exact: true })).toBeVisible();
    await expect(page.getByText("Teacher audit history", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Read only", { exact: true }).nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: "Append reversal event" })).toHaveCount(0);
  });

  test("denied access is explicit and does not render learner content", async ({ page }) => {
    await authenticate(page, teacher, "forbidden");
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "Learner safety is restricted" })).toBeVisible();
    await expect(page.getByText("A calm next step", { exact: true })).not.toBeVisible();
  });

  test("empty access has a distinct safe empty state", async ({ page }) => {
    await authenticate(page, teacher, "empty");
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "No learner safety record yet" })).toBeVisible();
    await expect(page.getByText("Check again", { exact: true })).toBeVisible();
  });
});
