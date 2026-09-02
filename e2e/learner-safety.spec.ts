import { expect, Page, test } from "@playwright/test";

type User = { id: number; openId: string; name: string; email: string; role: "admin" | "user" };
type Scenario = "success" | "forbidden" | "empty" | "error";

const teacher: User = { id: 1, openId: "teacher-user", name: "Teacher Example", email: "teacher@example.com", role: "admin" };
const viewer: User = { ...teacher, role: "user", name: "Viewer Example" };

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

async function authenticate(page: Page, user: User, scenario: Scenario = "success") {
  await page.route("**/api/trpc/**", async route => {
    const requestUrl = new URL(route.request().url());
    const procedures = (requestUrl.pathname.split("/").pop() ?? "").split(",");
    const results = procedures.map(name => {
      if (name === "auth.me") return { result: { data: { json: user } } };
      if (name === "learnerSafety.overview") {
        if (scenario === "forbidden") return { error: { json: { message: "Learner safety is restricted", code: -32003, data: { code: "FORBIDDEN", httpStatus: 403, path: name } } } };
        if (scenario === "error") return { error: { json: { message: "Safety service unavailable", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path: name } } } };
        if (scenario === "empty") return { result: { data: { json: null } } };
        return { result: { data: { json: overviewFor(user.role === "admin" ? "teacher" : "viewer") } } };
      }
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
  await expect(page).toHaveURL(/manus\.im\/app-auth/);
});

test.describe("authenticated learner safety navigation", () => {
  test("teacher can navigate to learner safety and sees adult controls separated from child-safe view", async ({ page }) => {
    await authenticate(page, teacher);
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "Safety has two views." })).toBeVisible();
    await expect(page.getByText("Teacher controls", { exact: true })).toBeVisible();
    await expect(page.getByText("Child-safe view", { exact: true })).toBeVisible();
    await expect(page.getByText("Admin / teacher", { exact: true })).toBeVisible();
    await expect(page.getByText("Append a reasoned override", { exact: true })).toBeVisible();
    await expect(page.getByText("Enabled", { exact: true }).first()).toBeVisible();
  });

  test("viewer can navigate to learner safety but receives read-only controls", async ({ page }) => {
    await authenticate(page, viewer);
    await openLearnerSafety(page);
    await expect(page.getByRole("heading", { name: "Safety has two views." })).toBeVisible();
    await expect(page.getByText("Read only", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Approved projection", { exact: true })).toBeVisible();
    await expect(page.getByText("A calm next step", { exact: true })).toBeVisible();
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
